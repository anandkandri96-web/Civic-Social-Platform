import { Link } from 'react-router-dom';
import { sampleIssues } from '../../utils/civicMockData';
import './RoleDashboard.css';

const volunteerIssues = sampleIssues.filter((issue) => issue.path === 'Community' || issue.status === 'Reported');

const VolunteerDashboard = () => {
  return (
    <section className="role-dashboard page">
      <div className="container">
        <header className="role-dashboard__header">
          <div>
            <h1>Volunteer / NGO Dashboard</h1>
            <p>Claim unresolved issues and close community-manageable problems with proof.</p>
          </div>
          <Link to="/issues" className="role-dashboard__action">
            Browse Public Issues
          </Link>
        </header>

        <div className="role-dashboard__grid">
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Open for Community</div>
            <div className="role-dashboard__stat-value">{volunteerIssues.length}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Claimed by Your Team</div>
            <div className="role-dashboard__stat-value">7</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Resolved by Community</div>
            <div className="role-dashboard__stat-value">16</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Awaiting Citizen Verification</div>
            <div className="role-dashboard__stat-value">3</div>
          </article>
        </div>

        <div className="role-dashboard__panels">
          <section className="card role-dashboard__panel">
            <h2>Suggested Issues to Claim</h2>
            <table className="role-dashboard__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Issue</th>
                  <th>Location</th>
                  <th>Support</th>
                </tr>
              </thead>
              <tbody>
                {volunteerIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td>{issue.id}</td>
                    <td>{issue.title}</td>
                    <td>{issue.location}</td>
                    <td>{issue.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card role-dashboard__panel">
            <h2>Volunteer Workflow</h2>
            <ul className="role-dashboard__list">
              <li><strong>Step 1:</strong> Claim issue and move status to Community Fix In Progress.</li>
              <li><strong>Step 2:</strong> Upload before and after photos with notes.</li>
              <li><strong>Step 3:</strong> Submit completion proof and mark Resolved by Community.</li>
              <li><strong>Step 4:</strong> Wait for reporter verification to close issue.</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
};

export default VolunteerDashboard;
