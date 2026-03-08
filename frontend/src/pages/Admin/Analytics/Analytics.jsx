import { useEffect, useMemo, useState } from 'react';
import { getAnalyticsHeatmap, getAnalyticsTrends } from '../../../api/analytics.api';
import { getErrorMessage } from '../../../api/utils';
import Loader from '../../../components/common/Loader/Loader';
import './Analytics.css';

const Analytics = () => {
  const [trends, setTrends] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const [trendsData, heatmapData] = await Promise.all([getAnalyticsTrends(), getAnalyticsHeatmap()]);
        if (!mounted) return;
        setTrends(trendsData || {});
        setHeatmap(Array.isArray(heatmapData) ? heatmapData : []);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  const statusMap = useMemo(() => {
    const list = trends?.statusBreakdown || [];
    return list.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }, [trends]);

  const categoryData = useMemo(() => trends?.issuesByCategory || [], [trends]);
  const totalIssues = useMemo(() => Object.values(statusMap).reduce((sum, n) => sum + Number(n || 0), 0), [statusMap]);
  const communityResolved = Number(statusMap.resolved_by_community || 0);
  const highPriority = useMemo(() => heatmap.filter((p) => Number(p.weight || 0) >= 8).length, [heatmap]);
  const avgSupport = useMemo(() => {
    if (heatmap.length === 0) return 0;
    const sum = heatmap.reduce((acc, p) => acc + Number(p.voteCount || 0), 0);
    return Math.round(sum / heatmap.length);
  }, [heatmap]);

  const govtPath = Number(statusMap.assigned_to_department || 0) + Number(statusMap.work_in_progress || 0) + Number(statusMap.resolved || 0);
  const communityPath = Number(statusMap.volunteer_claimed || 0) + Number(statusMap.community_fix_in_progress || 0) + Number(statusMap.resolved_by_community || 0);
  const verifyPath = Number(statusMap.citizen_verified || 0);
  const maxPath = Math.max(govtPath, communityPath, verifyPath, 1);
  const govtPathHeight = `${Math.max(16, Math.round((govtPath / maxPath) * 100))}%`;
  const communityPathHeight = `${Math.max(16, Math.round((communityPath / maxPath) * 100))}%`;
  const verifyHeight = `${Math.max(16, Math.round((verifyPath / maxPath) * 100))}%`;

  const avgResolutionTime = Number(trends?.avgResolutionTime || 0).toFixed(1);
  const resolvedCount = Number(statusMap.resolved || 0) + Number(statusMap.resolved_by_community || 0) + Number(statusMap.closed || 0);
  const resolutionRate = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 0;
  const escalatedProxy = totalIssues > 0 ? Math.round(((statusMap.under_review || 0) / totalIssues) * 100) : 0;
  const citizenVerifiedRate = resolvedCount > 0 ? Math.round(((statusMap.citizen_verified || 0) / resolvedCount) * 100) : 0;

  const topHeat = useMemo(
    () =>
      [...heatmap]
        .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
        .slice(0, 5),
    [heatmap]
  );

  const formatCoord = (point) => {
    const coords = point?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return 'Unknown';
    return `${Number(coords[1]).toFixed(4)}, ${Number(coords[0]).toFixed(4)}`;
  };

  if (loading) return <Loader fullScreen />;

  return (
    <section className="admin-page page">
      <div className="container">
        <h1 className="admin-title">Admin Analytics</h1>
        {error && <div className="issues-error">{error}</div>}

        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-header">
              <span>Total Active Issues</span>
              <span className="icon">i</span>
            </div>
            <h2>{totalIssues}</h2>
          </div>

          <div className="stat-card card">
            <div className="stat-header">
              <span>High Priority</span>
              <span className="icon orange">i</span>
            </div>
            <h2 className="orange">{highPriority}</h2>
          </div>

          <div className="stat-card card">
            <div className="stat-header">
              <span>Resolved by Community</span>
              <span className="icon green">i</span>
            </div>
            <h2 className="green">{communityResolved}</h2>
          </div>

          <div className="stat-card card">
            <div className="stat-header">
              <span>Avg Support Score</span>
              <span className="icon blue">i</span>
            </div>
            <h2 className="blue">{avgSupport}</h2>
          </div>
        </div>

        <div className="admin-panels">
          <div className="panel card">
            <h3>Resolution Path Distribution</h3>
            <div className="chart">
              <div className="bar-wrapper">
                <div className="bar progress" style={{ height: govtPathHeight }} />
                <span>Government Path</span>
              </div>
              <div className="bar-wrapper">
                <div className="bar resolved" style={{ height: communityPathHeight }} />
                <span>Community Path</span>
              </div>
              <div className="bar-wrapper">
                <div className="bar pending" style={{ height: verifyHeight }} />
                <span>Citizen Verification</span>
              </div>
            </div>
          </div>

          <div className="panel card">
            <h3>System Quality Metrics</h3>
            <ul className="metric-list">
              <li>
                <span>Average resolution time</span>
                <strong>{avgResolutionTime}h</strong>
              </li>
              <li>
                <span>Resolved / closed rate</span>
                <strong>{resolutionRate}%</strong>
              </li>
              <li>
                <span>Under-review workload</span>
                <strong>{escalatedProxy}%</strong>
              </li>
              <li>
                <span>Citizen verified closures</span>
                <strong>{citizenVerifiedRate}%</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="admin-panels admin-panels--secondary">
          <div className="panel card">
            <h3>Category Distribution</h3>
            <ul className="metric-list">
              {categoryData.map((item) => (
                <li key={item._id}>
                  <span>{item._id}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel card">
            <h3>Top Issue Heatmap Areas</h3>
            <ul className="metric-list">
              {topHeat.map((point) => (
                <li key={point._id}>
                  <span>{formatCoord(point)}</span>
                  <strong>Weight {point.weight}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Analytics;
