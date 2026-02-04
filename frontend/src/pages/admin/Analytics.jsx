// src/pages/admin/Analytics.jsx
import './Analytics.css';

const Analytics = () => {
  return (
    <div className="admin-page">

      {/* Page Title */}
      <h1 className="admin-title">Admin Overview</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Issues</span>
            <span className="icon">ⓘ</span>
          </div>
          <h2>3</h2>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Pending</span>
            <span className="icon orange">⏱</span>
          </div>
          <h2 className="orange">3</h2>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>In Progress</span>
            <span className="icon blue">⚠</span>
          </div>
          <h2 className="blue">0</h2>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Resolved</span>
            <span className="icon green">✔</span>
          </div>
          <h2 className="green">0</h2>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="admin-panels">

        {/* Chart Panel */}
        <div className="panel">
          <h3>Issue Status Distribution</h3>

          <div className="chart">
            <div className="bar-wrapper">
              <div className="bar pending" style={{ height: '80%' }} />
              <span>Pending</span>
            </div>

            <div className="bar-wrapper">
              <div className="bar progress" />
              <span>In Progress</span>
            </div>

            <div className="bar-wrapper">
              <div className="bar resolved" />
              <span>Resolved</span>
            </div>
          </div>
        </div>

        {/* Manage Issues Table */}
        <div className="panel">
          <h3>Manage Issues</h3>

          <table className="issues-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Votes</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Large path hole</td>
                <td>Water_supply</td>
                <td>0</td>
                <td>
                  <select>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                  </select>
                </td>
              </tr>

              <tr>
                <td>Street Light Broken</td>
                <td>Street_lights</td>
                <td>0</td>
                <td>
                  <select>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                  </select>
                </td>
              </tr>

              <tr>
                <td>Large Pothole on Main St</td>
                <td>Roads</td>
                <td>0</td>
                <td>
                  <select>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
