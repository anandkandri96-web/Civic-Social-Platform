import { lifecycle, sampleIssues } from '../../../utils/civicMockData';
import './Analytics.css';

const roleOps = [
  { role: 'Citizens', count: 1260 },
  { role: 'Volunteers / NGOs', count: 164 },
  { role: 'Department Officers', count: 24 },
  { role: 'Field Workers', count: 87 },
  { role: 'Admins', count: 4 },
];

const areaHeat = [
  ['MG Road', 34],
  ['Koramangala', 28],
  ['Indiranagar', 22],
  ['HSR Layout', 19],
  ['JP Nagar', 15],
];

const Analytics = () => {
  const totalIssues = sampleIssues.length;
  const communityResolved = sampleIssues.filter((issue) => issue.path === 'Community').length;
  const highPriority = sampleIssues.filter((issue) => issue.priority === 'High').length;
  const avgSupport = Math.round(
    sampleIssues.reduce((sum, issue) => sum + issue.support, 0) / Math.max(totalIssues, 1)
  );

  const govtPathHeight = `${Math.round((lifecycle.government.length / 7) * 100)}%`;
  const communityPathHeight = `${Math.round((lifecycle.community.length / 7) * 100)}%`;

  return (
    <section className="admin-page page">
      <div className="container">
        <h1 className="admin-title">Admin Analytics</h1>

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
                <div className="bar pending" style={{ height: '58%' }} />
                <span>Citizen Verification</span>
              </div>
            </div>
          </div>

          <div className="panel card">
            <h3>System Quality Metrics</h3>
            <ul className="metric-list">
              <li>
                <span>Average resolution time</span>
                <strong>26h</strong>
              </li>
              <li>
                <span>First response under 2h</span>
                <strong>74%</strong>
              </li>
              <li>
                <span>Escalated beyond SLA</span>
                <strong>9%</strong>
              </li>
              <li>
                <span>Citizen verified closures</span>
                <strong>88%</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="admin-panels admin-panels--secondary">
          <div className="panel card">
            <h3>Role Participation</h3>
            <ul className="metric-list">
              {roleOps.map((item) => (
                <li key={item.role}>
                  <span>{item.role}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel card">
            <h3>Top Issue Heatmap Areas</h3>
            <ul className="metric-list">
              {areaHeat.map(([area, count]) => (
                <li key={area}>
                  <span>{area}</span>
                  <strong>{count} reports</strong>
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
