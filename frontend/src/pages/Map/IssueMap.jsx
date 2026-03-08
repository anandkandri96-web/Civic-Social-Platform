import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import IssueLeafletMap from '../../components/map/IssueLeafletMap';
import { getIssues } from '../../api/issues.api';
import { getErrorMessage } from '../../api/utils';
import './IssueMap.css';

function normalizeIssue(issue) {
  const coords = Array.isArray(issue?.location?.coordinates) ? issue.location.coordinates : [];
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    id: String(issue._id || issue.id || ''),
    title: issue.title || 'Untitled issue',
    category: issue.category || 'other',
    status: issue.status || 'reported',
    priority: Number(issue.severity || 3),
    locationText: issue.locationText || 'Location not specified',
    lat,
    lng,
  };
}

const IssueMap = () => {
  const { isAdmin } = useRole();
  const [issues, setIssues] = useState([]);
  const [category, setCategory] = useState('all');
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getIssues();
        if (!mounted) return;

        const normalized = (Array.isArray(data) ? data : []).map(normalizeIssue).filter(Boolean);
        setIssues(normalized);
        setActiveId(normalized[0]?.id || '');
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

  const categories = useMemo(() => {
    const set = new Set(issues.map((i) => i.category).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [issues]);

  const filtered = useMemo(() => {
    if (category === 'all') return issues;
    return issues.filter((issue) => issue.category === category);
  }, [issues, category]);

  const active = filtered.find((i) => i.id === activeId) || filtered[0] || null;

  return (
    <section className="issue-map-page">
      <div className="issue-map-layout card">
        <aside className="issue-map-sidebar">
          <div className="issue-map-head">
            <span>Bengaluru - Anekal Issue Map</span>
            {!isAdmin && <Link to="/issues/create">+ Report</Link>}
          </div>

          <div className="issue-map-filter-group">
            <label htmlFor="map-category">Category</label>
            <select id="map-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All' : cat}</option>
              ))}
            </select>
          </div>

          {error && <div className="issue-map-error">{error}</div>}

          <div className="issue-map-list">
            {loading ? (
              <p className="issue-map-note">Loading issues...</p>
            ) : filtered.length === 0 ? (
              <p className="issue-map-note">No issues for selected category.</p>
            ) : (
              filtered.map((point) => (
                <button
                  type="button"
                  key={point.id}
                  className={`issue-map-item${active?.id === point.id ? ' is-active' : ''}`}
                  onClick={() => setActiveId(point.id)}
                >
                  <strong>{point.title}</strong>
                  <small>{point.locationText}</small>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="issue-map-canvas-wrap">
          <div className="issue-map-canvas">
            <IssueLeafletMap
              issues={filtered}
              activeId={active?.id || ''}
              onSelect={setActiveId}
              className="issue-map-leaflet"
              zoom={11}
            />
          </div>

          <div className="issue-map-detail">
            {active ? (
              <>
                <h3>{active.title}</h3>
                <p>{active.locationText}</p>
                <div className="issue-map-tags">
                  <span>{active.status}</span>
                  <span style={{ color: active.priority >= 4 ? '#ff7a35' : active.priority >= 3 ? '#ffd166' : '#00c8f8' }}>
                    Severity {active.priority}
                  </span>
                </div>
              </>
            ) : (
              <p>No issue selected.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IssueMap;