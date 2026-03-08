import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import IssueLeafletMap from '../../components/map/IssueLeafletMap';
import { getAnalyticsHeatmap } from '../../api/analytics.api';
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
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAnalyticsHeatmap();
        if (!mounted) return;

        const normalized = (Array.isArray(data) ? data : []).map(point => ({
          lat: point.coordinates[1],
          lng: point.coordinates[0],
          weight: point.weight
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
return (
    <section className="issue-map-page">
      <div className="issue-map-layout card">
        <aside className="issue-map-sidebar">
          <div className="issue-map-head">
            <span>Bengaluru - Issue Heatmap</span>
            {!isAdmin && <Link to="/issues/create">+ Report</Link>}
          </div>

          {error && <div className="issue-map-error">{error}</div>}

          <div className="issue-map-list">
            {loading ? (
              <p className="issue-map-note">Loading heatmap...</p>
            ) : (
              <p className="issue-map-note">Heatmap shows issue density</p>
            )}
          </div>
        </aside>

        <div className="issue-map-canvas-wrap">
          <div className="issue-map-canvas">
            <IssueLeafletMap
              heatmapData={heatmapData}
              className="issue-map-leaflet"
              zoom={11}
            /><p>No issue selected.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IssueMap;