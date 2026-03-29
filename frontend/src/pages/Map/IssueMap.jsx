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

const SEVERITY_LEVELS = [
  { level: 4, label: 'Urgent', color: '#C64C2B', desc: 'Immediate' },
  { level: 3, label: 'High', color: '#C98A12', desc: 'Urgent' },
  { level: 2, label: 'Medium', color: '#1F6A7A', desc: 'Monitor' },
  { level: 1, label: 'Low', color: '#5F7F1C', desc: 'Info' },
];

const DENSITY_LEVELS = [
  { range: '1–3', size: 8 },
  { range: '4–7', size: 12 },
  { range: '8–15', size: 17 },
  { range: '16+', size: 23 },
];

const TYPE_FILTERS = ['All', 'Roads', 'Water', 'Electricity', 'Garbage', 'Drainage', 'Other'];
const TYPE_TO_CATEGORY = {
  roads: 'roads',
  water: 'water',
  electricity: 'electricity',
  garbage: 'garbage',
  drainage: 'drainage',
  other: 'other',
};

const IssueMap = () => {
  const { can } = usePermission();
  const [heatmapData, setHeatmapData] = useState([]);
  const [mode, setMode] = useState('heatmap');
  const [issues, setIssues] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [activeType, setActiveType] = useState('All');
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
    return () => { mounted = false; };
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
    return () => { mounted = false; };
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
          priority: Math.min(4, Math.max(1, Number(it.severity || 3))),
          severity: Math.min(4, Math.max(1, Number(it.severity || 3))),
          votes: Number(it.voteCount || 0),
          locationText: it.locationText || '',
          lat,
          lng,
        };
      })
      .filter(Boolean);
    return points.slice(0, 500);
  }, [issues]);

  const typeFilteredPoints = useMemo(() => {
    if (mode !== 'heatmap') return mapIssuePoints;
    const key = String(activeType || '').trim().toLowerCase();
    if (!key || key === 'all') return mapIssuePoints;
    const category = TYPE_TO_CATEGORY[key];
    if (!category) return mapIssuePoints;
    return mapIssuePoints.filter((p) => String(p.category || '').toLowerCase() === category);
  }, [activeType, mapIssuePoints, mode]);

  const activeIssue = useMemo(() => {
    if (!activeId) return null;
    return mapIssuePoints.find((p) => String(p.id) === String(activeId)) || null;
  }, [activeId, mapIssuePoints]);

  const severityCounts = useMemo(() => {
    const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
    typeFilteredPoints.forEach((p) => { if (counts[p.severity] !== undefined) counts[p.severity]++; });
    return counts;
  }, [typeFilteredPoints]);

  const sevColor = (level) => SEVERITY_LEVELS.find((s) => s.level === level)?.color || '#ccc';

  return (
    <section className="im-page">
      <div className="im-layout card">

        {/* ── Sidebar ── */}
        <aside className="im-sidebar">

          {/* Header */}
          <div className="im-head">
            <span className="im-head-title">Bengaluru — Civic Map</span>
            {can('issue:create') && (
              <Link to="/issues/create" className="im-report-btn">+ Report</Link>
            )}
          </div>

          {error && <div className="im-error">{error}</div>}

          {/* Mode toggle */}
          <div className="im-mode">
            <button
              type="button"
              className={`im-mode-btn${mode === 'heatmap' ? ' is-active' : ''}`}
              onClick={() => setMode('heatmap')}
            >
              Heatmap
            </button>
            <button
              type="button"
              className={`im-mode-btn${mode === 'issues' ? ' is-active' : ''}`}
              onClick={() => setMode('issues')}
            >
              Issues
            </button>
          </div>

          <div className="im-divider" />

          {mode === 'heatmap' ? (
            <>
              {/* Severity legend */}
              <p className="im-section-label">Severity</p>
              <div className="im-sev-list">
                {SEVERITY_LEVELS.map(({ level, label, color, desc }) => (
                  <div key={level} className="im-sev-row">
                    <span className="im-sev-dot" style={{ background: color }} />
                    <span className="im-sev-name">{level} — {label}</span>
                    <span className="im-sev-desc">{desc}</span>
                  </div>
                ))}
              </div>

              <div className="im-divider" />

              {/* Density legend */}
              <p className="im-section-label">Density (bubble size)</p>
              <div className="im-density-row">
                {DENSITY_LEVELS.map(({ range, size }) => (
                  <div key={range} className="im-den-item">
                    <div className="im-den-dot" style={{ width: size, height: size }} />
                    <span className="im-den-label">{range}</span>
                  </div>
                ))}
              </div>

              <div className="im-divider" />

              {/* Type filters */}
              <p className="im-section-label">Filter by type</p>
              <div className="im-filter-row">
                {loading ? (
                  <p className="im-note">Loading heatmap...</p>
                ) : (
                  TYPE_FILTERS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`im-pill${activeType === type ? ' is-active' : ''}`}
                      onClick={() => setActiveType(type)}
                    >
                      {type}
                    </button>
                  ))
                )}
              </div>

              {/* Stats */}
              {!loading && (
                <>
                  <div className="im-divider" />
                  <div className="im-stats-grid">
                    <div className="im-stat-card">
                      <span className="im-stat-val" style={{ color: sevColor(4) }}>{severityCounts[4]}</span>
                      <span className="im-stat-lbl">Urgent</span>
                    </div>
                    <div className="im-stat-card">
                      <span className="im-stat-val" style={{ color: sevColor(3) }}>{severityCounts[3]}</span>
                      <span className="im-stat-lbl">High</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Issue filters */}
              <div className="im-filter-group">
                <label htmlFor="map-category" className="im-filter-label">Category</label>
                <select
                  id="map-category"
                  className="im-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {ISSUE_CATEGORY_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="im-filter-group">
                <label htmlFor="map-status" className="im-filter-label">Status</label>
                <select
                  id="map-status"
                  className="im-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {ISSUE_STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Issue list */}
              <div className="im-issue-list">
                {issuesLoading ? (
                  <p className="im-note">Loading issues...</p>
                ) : mapIssuePoints.length === 0 ? (
                  <p className="im-note">No issues with map coordinates.</p>
                ) : (
                  mapIssuePoints.slice(0, 50).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`im-issue-item${String(activeId) === String(p.id) ? ' is-active' : ''}`}
                      onClick={() => setActiveId(p.id)}
                    >
                      <span
                        className="im-issue-sev-bar"
                        style={{ background: sevColor(p.severity) }}
                      />
                      <div className="im-issue-body">
                        <strong className="im-issue-title">{p.title}</strong>
                        <small className="im-issue-meta">
                          {ISSUE_STATUS_LABELS[p.status] || p.status} · {p.votes} votes
                        </small>
                        <small className="im-issue-loc">{p.locationText || '—'}</small>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          <div className="im-sidebar-footer">
            <span className="im-timestamp">Last updated · just now</span>
          </div>
        </aside>

        {/* ── Map canvas ── */}
        <div className="im-canvas-wrap">
          <div className="im-canvas">
            {mode === 'heatmap' ? (
              <IssueLeafletMap
                issues={typeFilteredPoints}
                heatmapData={heatmapData}
                className="im-leaflet"
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
                className="im-leaflet"
                zoom={12}
                maxZoom={20}
              />
            )}

            {/* Active issue preview card */}
            {mode === 'issues' && activeIssue && (
              <div className="im-preview-card" role="dialog" aria-label="Selected issue preview">
                <div className="im-preview-head">
                  <strong className="im-preview-title">{activeIssue.title}</strong>
                  <span className="im-preview-badge">
                    {ISSUE_STATUS_LABELS[activeIssue.status] || activeIssue.status}
                  </span>
                </div>

                <div className="im-preview-meta">
                  <div className="im-preview-meta-item">
                    <span className="im-preview-meta-val">{activeIssue.votes}</span>
                    <span className="im-preview-meta-lbl">Votes</span>
                  </div>
                  <div className="im-preview-meta-item">
                    <span className="im-preview-meta-val" style={{ color: sevColor(activeIssue.severity) }}>
                      {activeIssue.severity}
                    </span>
                    <span className="im-preview-meta-lbl">Severity</span>
                  </div>
                  <div className="im-preview-meta-item">
                    <span className="im-preview-meta-val">{activeIssue.category || '—'}</span>
                    <span className="im-preview-meta-lbl">Category</span>
                  </div>
                </div>

                {/* Severity bar */}
                <div className="im-preview-sev-bar">
                  {SEVERITY_LEVELS.slice().reverse().map(({ level, color }) => (
                    <div
                      key={level}
                      className="im-preview-sev-seg"
                      style={{
                        background: color,
                        opacity: activeIssue.severity === level ? 1 : 0.2,
                      }}
                    />
                  ))}
                </div>

                <Link to={`/issues/${activeIssue.id}`} className="im-preview-action">
                  Open issue details
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};

export default IssueMap;
