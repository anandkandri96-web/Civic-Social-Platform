import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import IssueLeafletMap from '../../components/map/IssueLeafletMap';
import { getPublicHeatmap } from '@api/analytics.api.js';
import { getErrorMessage } from '@api/utils';
import { getIssues } from '@api/issues.api';
import { ISSUE_CATEGORY_FILTER_OPTIONS, ISSUE_STATUS_FILTER_OPTIONS } from '../../constants/issueOptions';
import { ISSUE_STATUS_LABELS } from '../../constants/issueStatus';
import './IssueMap.css';

const IssueMap = () => {
  // ✅ Use permissions instead of role checks
  const { can } = usePermission();
  const [heatmapData, setHeatmapData] = useState([]);
  const [mode, setMode] = useState('heatmap'); // 'heatmap' | 'issues'
  const [issues, setIssues] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issuesLoading, setIssuesLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getPublicHeatmap();
        if (!mounted) return;

        const normalized = (Array.isArray(data) ? data : []).map((point) => ({
          lat: point.lat,
          lng: point.lng,
          count: Number(point.count || 1),
          avgSeverity: Number(point.avgSeverity || 0),
          maxSeverity: Number(point.maxSeverity || 0),
          weight: Number(point.avgSeverity || point.maxSeverity || point.count || 1),
        }));
        setHeatmapData(normalized);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'issues' && mode !== 'heatmap') return undefined;
    let mounted = true;

    const loadIssues = async () => {
      setIssuesLoading(true);
      setError('');
      try {
        const params = { sort: 'priority' };
        if (mode === 'issues') {
          if (category) params.category = category;
          if (status) params.status = status;
        } else {
          params.limit = 300;
        }
        const data = await getIssues(params);
        const list = Array.isArray(data) ? data : [];
        if (!mounted) return;
        setIssues(list);
        if (mode === 'issues' && !activeId && list[0]?._id) setActiveId(list[0]._id);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
        setIssues([]);
      } finally {
        if (mounted) setIssuesLoading(false);
      }
    };

    loadIssues();
    return () => {
      mounted = false;
    };
  }, [mode, category, status, activeId]);

  const mapIssuePoints = useMemo(() => {
    const points = (Array.isArray(issues) ? issues : [])
      .map((it) => {
        const coords = it?.location?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return {
          id: it._id,
          title: it.title,
          category: it.category,
          status: it.status,
          priority: Number(it.severity || 3),
          severity: Number(it.severity || 3),
          votes: Number(it.voteCount || 0),
          locationText: it.locationText || '',
          lat,
          lng,
        };
      })
      .filter(Boolean);

    return points.slice(0, 500);
  }, [issues]);

  const activeIssue = useMemo(() => {
    if (!activeId) return null;
    return mapIssuePoints.find((p) => String(p.id) === String(activeId)) || null;
  }, [activeId, mapIssuePoints]);

  return (
    <section className="issue-map-page">
      <div className="issue-map-layout card">
        <aside className="issue-map-sidebar">
          <div className="issue-map-head">
            <span>Bengaluru - Civic Map</span>
            {can('issue:create') && <Link to="/issues/create">+ Report</Link>}
          </div>

          {error && <div className="issue-map-error">{error}</div>}

          <div className="issue-map-mode">
            <button
              type="button"
              className={`issue-map-mode-btn${mode === 'heatmap' ? ' is-active' : ''}`}
              onClick={() => setMode('heatmap')}
            >
              Heatmap
            </button>
            <button
              type="button"
              className={`issue-map-mode-btn${mode === 'issues' ? ' is-active' : ''}`}
              onClick={() => setMode('issues')}
            >
              Issues
            </button>
          </div>

          {mode === 'issues' ? (
            <>
              <div className="issue-map-filter-group">
                <label htmlFor="map-category">Category</label>
                <select id="map-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {ISSUE_CATEGORY_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="issue-map-filter-group">
                <label htmlFor="map-status">Status</label>
                <select id="map-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {ISSUE_STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="issue-map-list">
                {issuesLoading ? (
                  <p className="issue-map-note">Loading issues...</p>
                ) : mapIssuePoints.length === 0 ? (
                  <p className="issue-map-note">No issues with map coordinates.</p>
                ) : (
                  mapIssuePoints.slice(0, 50).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`issue-map-item${String(activeId) === String(p.id) ? ' is-active' : ''}`}
                      onClick={() => setActiveId(p.id)}
                    >
                      <strong>{p.title}</strong>
                      <small>{ISSUE_STATUS_LABELS[p.status] || p.status} | votes {p.votes}</small>
                      <small>{p.locationText || '-'}</small>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="issue-map-list">
              {loading ? (
                <p className="issue-map-note">Loading heatmap...</p>
              ) : (
                <p className="issue-map-note">Color = severity (1-5), size = density</p>
              )}
            </div>
          )}
        </aside>

        <div className="issue-map-canvas-wrap">
          <div className="issue-map-canvas">
            {mode === 'heatmap' ? (
              <IssueLeafletMap
                issues={mapIssuePoints}
                heatmapData={heatmapData}
                className="issue-map-leaflet"
                zoom={11}
                maxZoom={20}
                showMarkers={false}
                dotMode
              />
            ) : (
              <IssueLeafletMap
                issues={mapIssuePoints}
                activeId={activeId}
                activeIssue={activeIssue}
                onSelect={(id) => setActiveId(id)}
                className="issue-map-leaflet"
                zoom={12}
                maxZoom={20}
              />
            )}

            {mode === 'issues' && activeIssue ? (
                <div className="issue-map-preview-card" role="dialog" aria-label="Selected issue preview">
                  <div className="issue-map-preview-head">
                    <strong>{activeIssue.title}</strong>
                    <span className="issue-map-preview-badge">{ISSUE_STATUS_LABELS[activeIssue.status] || activeIssue.status}</span>
                  </div>
                <div className="issue-map-preview-meta">
                  <span>Votes: {activeIssue.votes}</span>
                  <span>Priority: {activeIssue.priority}</span>
                </div>
                <div className="issue-map-preview-actions">
                  <Link to={`/issues/${activeIssue.id}`}>Open details</Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IssueMap;
