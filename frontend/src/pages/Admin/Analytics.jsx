import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getAdminHeatmap, getAnalyticsTrends } from '@api/analytics.api';
import { getErrorMessage } from '@api/utils';
import Loader from '../../components/common/Loader/Loader';
import { usePermission } from '../../hooks/usePermission';
import './Analytics.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const Analytics = () => {
  const { can } = usePermission();
  const canViewAdminAnalytics = can('admin:view_analytics');
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
        const [trendsData, heatmapData] = await Promise.all([
          getAnalyticsTrends(),
          canViewAdminAnalytics ? getAdminHeatmap() : Promise.resolve([]),
        ]);
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
  }, [canViewAdminAnalytics]);

  const statusMap = useMemo(() => {
    const list = trends?.statusBreakdown || [];
    return list.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }, [trends]);

  const categoryData = useMemo(() => trends?.issuesByCategory || [], [trends]);
  const resolvedByDepartment = useMemo(() => (Array.isArray(trends?.resolvedByDepartment) ? trends.resolvedByDepartment : []), [trends]);
  const totalIssues = useMemo(() => Object.values(statusMap).reduce((sum, n) => sum + Number(n || 0), 0), [statusMap]);
  const communityResolved = Number(statusMap.resolved_by_community || 0);
  const highPriority = useMemo(() => heatmap.filter((p) => Number(p.weight || 0) >= 8).length, [heatmap]);
  const avgSupport = useMemo(() => {
    if (heatmap.length === 0) return 0;
    const sum = heatmap.reduce((acc, p) => acc + Number(p.voteCount || 0), 0);
    return Math.round(sum / heatmap.length);
  }, [heatmap]);

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
    const coords = point?.coordinates || point?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return 'Unknown';
    return `${Number(coords[1]).toFixed(4)}, ${Number(coords[0]).toFixed(4)}`;
  };

  const chartTheme = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        successRgb: '135, 168, 63',
        textSecondary: '#35585e',
        gridColor: 'rgba(16, 24, 40, 0.08)',
      };
    }

    const css = getComputedStyle(document.documentElement);
    const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const successRgb = read('--color-success-rgb', '135, 168, 63');
    const textSecondary = read('--text-secondary', '#35585e');
    const gridColor = 'rgba(16, 24, 40, 0.08)';
    return { successRgb, textSecondary, gridColor };
  }, []);

  if (loading) return <Loader fullScreen />;

  const deptChart = (() => {
    const rows = resolvedByDepartment
      .map((r) => ({
        department: String(r?.department || 'Unknown'),
        count: Number(r?.count || 0),
      }))
      .filter((r) => r.department && Number.isFinite(r.count));

    const labels = rows.map((r) => r.department);
    const data = rows.map((r) => r.count);

    return {
      hasData: rows.length > 0,
      data: {
        labels,
        datasets: [
          {
            label: 'Resolved issues',
            data,
            backgroundColor: `rgba(${chartTheme.successRgb}, 0.35)`,
            borderColor: `rgba(${chartTheme.successRgb}, 0.7)`,
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            ticks: { color: chartTheme.textSecondary, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: chartTheme.textSecondary, font: { size: 11 }, precision: 0 },
            grid: { color: chartTheme.gridColor },
          },
        },
      },
    };
  })();

  return (
    <section className="admin-page page">
      <div className="container">
        <h1 className="admin-title">{canViewAdminAnalytics ? 'Admin Analytics' : 'Officer Analytics'}</h1>
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
            <h3>Resolved Issues by Department</h3>
            {deptChart.hasData ? (
              <div className="analytics-bar-chart">
                <Bar data={deptChart.data} options={deptChart.options} />
              </div>
            ) : (
              <p className="analytics-note">No resolved department data available.</p>
            )}
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
