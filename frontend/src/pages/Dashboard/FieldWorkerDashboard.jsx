import { workerTasks } from '../../utils/civicMockData';
import './RoleDashboard.css';

const FieldWorkerDashboard = () => {
  return (
    <section className="role-dashboard page">
      <div className="container">
        <header className="role-dashboard__header">
          <div>
            <h1>Field Worker Dashboard</h1>
            <p>Track assigned tasks, update progress, and submit completion proof from site.</p>
          </div>
        </header>

        <div className="role-dashboard__grid">
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Assigned Tasks</div>
            <div className="role-dashboard__stat-value">{workerTasks.length}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Accepted</div>
            <div className="role-dashboard__stat-value">1</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">In Progress</div>
            <div className="role-dashboard__stat-value">1</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Completed Today</div>
            <div className="role-dashboard__stat-value">2</div>
          </article>
        </div>

        <div className="role-dashboard__panels">
          <section className="card role-dashboard__panel">
            <h2>My Tasks</h2>
            <table className="role-dashboard__table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Issue</th>
                  <th>Location</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workerTasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>{task.taskId}</td>
                    <td>{task.issueId}</td>
                    <td>{task.location}</td>
                    <td>{task.deadline}</td>
                    <td><span className="role-dashboard__badge">{task.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card role-dashboard__panel">
            <h2>Execution Checklist</h2>
            <ul className="role-dashboard__list">
              <li><strong>Accept:</strong> confirm assigned task and estimated arrival.</li>
              <li><strong>Repair:</strong> resolve issue on location with safety compliance.</li>
              <li><strong>Evidence:</strong> upload geotagged progress and completion photos.</li>
              <li><strong>Report:</strong> submit notes or escalation if blocked.</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
};

export default FieldWorkerDashboard;
