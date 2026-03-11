import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import IssueLeafletMap from '../../components/map/IssueLeafletMap';
import { getPublicHeatmap } from '@api/analytics.api.js';
import { getErrorMessage } from '@api/utils';
import { getIssues } from '@api/issues.api';
import './IssueMap.css';

const IssueMap = () => {
  const { isAdmin } = useRole();
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
          weight: Number(point.count || 1),
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
    if (mode !== 'issues') return undefined;
    let mounted = true;

    const loadIssues = async () => {
      setIssuesLoading(true);
      setError('');
      try {
        const params = {};
        if (category) params.category = category;
        if (status) params.status = status;
        params.sort = 'priority';
        const data = await getIssues(params);
        const list = Array.isArray(data) ? data : [];
        if (!mounted) return;
        setIssues(list);
        if (!activeId && list[0]?._id) setActiveId(list[0]._id);
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
            {!isAdmin && <Link to="/issues/create">+ Report</Link>}
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
                  <option value="">All</option>
                  <option value="roads">Roads</option>
                  <option value="electricity">Electricity</option>
                  <option value="garbage">Garbage</option>
                  <option value="drainage">Drainage</option>
                  <option value="water">Water</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="issue-map-filter-group">
                <label htmlFor="map-status">Status</label>
                <select id="map-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="reported">Reported</option>
                  <option value="under_review">Under Review</option>
                  <option value="assigned_to_department">Assigned</option>
                  <option value="work_in_progress">Work In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
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
                      <small>{p.status} | votes {p.votes}</small>
                      <small>{p.locationText || '-'}</small>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="issue-map-list">
              {loading ? <p className="issue-map-note">Loading heatmap...</p> : <p className="issue-map-note">Heatmap shows issue density</p>}
            </div>
          )}
        </aside>

        <div className="issue-map-canvas-wrap">
          <div className="issue-map-canvas">
            {mode === 'heatmap' ? (
              <IssueLeafletMap heatmapData={heatmapData} className="issue-map-leaflet" zoom={11} />
            ) : (
              <IssueLeafletMap
                issues={mapIssuePoints}
                activeId={activeId}
                onSelect={(id) => setActiveId(id)}
                className="issue-map-leaflet"
                zoom={12}
              />
            )}

            {mode === 'issues' && activeIssue ? (
              <div className="issue-map-preview-card" role="dialog" aria-label="Selected issue preview">
                <div className="issue-map-preview-head">
                  <strong>{activeIssue.title}</strong>
                  <span className="issue-map-preview-badge">{activeIssue.status}</span>
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
