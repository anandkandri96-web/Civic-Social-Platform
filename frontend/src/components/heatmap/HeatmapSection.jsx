import { useEffect, useMemo, useRef, useState } from 'react';
import { getAdminHeatmap } from '@api/analytics.api';
import { getErrorMessage } from '@api/utils';
import './HeatmapSection.css';

const REFRESH_INTERVAL_MS = 5000;

const HeatmapSection = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const fetchHeatmap = async (mode = 'refresh') => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await getAdminHeatmap();
      setHeatmapData(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    fetchHeatmap('initial');
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchHeatmap('refresh');
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isLive]);

  const activeZones = heatmapData.length;
  const highPriorityClusters = useMemo(
    () => heatmapData.filter((point) => Number(point?.avgSeverity || point?.maxSeverity || point?.weight || 0) >= 4).length,
    [heatmapData]
  );

  return (
    <section className="heatmap-section card">
      <header className="heatmap-head">
        <div>
          <span className="heatmap-eyebrow">Spatial Intelligence</span>
          <h3 className="heatmap-title">City-Wide Issue Heatmap</h3>
          <p className="heatmap-subtitle">
            Visualize issue density and hotspot clusters in real time to guide faster civic action.
          </p>
        </div>

        <button
          type="button"
          className={`heatmap-refresh${isLive ? ' is-live' : ''}`}
          onClick={() => setIsLive((prev) => !prev)}
          aria-pressed={isLive}
        >
          {isLive && <span className="live-indicator" aria-hidden="true" />}
          <span>{isLive ? 'Live Refresh On' : 'Live Refresh Off'}</span>
        </button>
      </header>

      {error && <div className="heatmap-error">{error}</div>}

      {loading ? (
        <div className="heatmap-loader">
          <span className="heatmap-loader__dot" />
          <span>Loading heatmap…</span>
        </div>
      ) : (
        <div className="heatmap-stats">
          <div className="heatmap-stat">
            <span className="heatmap-stat__value">{activeZones}</span>
            <span className="heatmap-stat__label">Active Zones</span>
          </div>
          <div className="heatmap-stat">
            <span className="heatmap-stat__value">{highPriorityClusters}</span>
            <span className="heatmap-stat__label">High Priority Clusters</span>
          </div>
          <div className="heatmap-stat heatmap-stat--refresh">
            <span className={`heatmap-stat__value ${isLive ? 'is-live' : ''}`}>{isLive ? 'Live' : 'Paused'}</span>
            <span className="heatmap-stat__label">Data Refresh</span>
            {refreshing && <span className="heatmap-stat__meta">Updating…</span>}
          </div>
        </div>
      )}
    </section>
  );
};

export default HeatmapSection;
