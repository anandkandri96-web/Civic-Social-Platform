import { Link } from 'react-router-dom';
import { sampleIssues } from '../../utils/civicMockData';
import './RoleDashboard.css';

const officerIssues = sampleIssues.filter((issue) => issue.path === 'Government');

const OfficerDashboard = () => {
  return (
    <section className="role-dashboard page">
      <div className="container">
        <header className="role-dashboard__header">
          <div>
            <h1>Department Officer Dashboard</h1>
            <p>Review routed reports, assign field workers, and verify completion evidence.</p>
          </div>
          <Link to="/admin/analytics" className="role-dashboard__action">
            Open Analytics
          </Link>
        </header>

        <div className="role-dashboard__grid">
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Under Review</div>
            <div className="role-dashboard__stat-value">12</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Assigned to Field Workers</div>
            <div className="role-dashboard__stat-value">21</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Escalated</div>
            <div className="role-dashboard__stat-value">4</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Closed this Week</div>
            <div className="role-dashboard__stat-value">18</div>
          </article>
        </div>

        <div className="role-dashboard__panels">
          <section className="card role-dashboard__panel">
            <h2>Department Queue</h2>
            <table className="role-dashboard__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Issue</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {officerIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td>{issue.id}</td>
                    <td>{issue.title}</td>
                    <td>{issue.priority}</td>
                    <td><span className="role-dashboard__badge">{issue.status}</span></td>
                    <td>{issue.assignedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card role-dashboard__panel">
            <h2>Officer Workflow</h2>
            <ul className="role-dashboard__list">
              <li><strong>Validate:</strong> reject duplicates/spam and verify report quality.</li>
              <li><strong>Prioritize:</strong> combine severity and support score.</li>
              <li><strong>Assign:</strong> allocate field worker by zone and workload.</li>
              <li><strong>Verify:</strong> review completion evidence before closure.</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
};

export default OfficerDashboard;
