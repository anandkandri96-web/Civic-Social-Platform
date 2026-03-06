import './Analytics.css';

const Analytics = () => {
  return (
    <section className="admin-page page">
      <div className="container">
        <h1 className="admin-title">Admin Overview</h1>

        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-header">
              <span>Total Issues</span>
              <span className="icon">i</span>
            </div>
            <h2>3</h2>
          </div>

          <div className="stat-card card">
            <div className="stat-header">
              <span>Pending</span>
              <span className="icon orange">i</span>
            </div>
            <h2 className="orange">3</h2>
          </div>

          <div className="stat-card card">
            <div className="stat-header">
              <span>In Progress</span>
              <span className="icon blue">i</span>
            </div>
            <h2 className="blue">0</h2>
          </div>

          <div className="stat-card card">
            <div className="stat-header">
              <span>Resolved</span>
              <span className="icon green">i</span>
            </div>
            <h2 className="green">0</h2>
          </div>
        </div>

        <div className="admin-panels">
          <div className="panel card">
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

          <div className="panel card">
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
    </section>
  );
};

export default Analytics;
