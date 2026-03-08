import { useEffect, useState } from 'react';
import { acceptWorkerTask, getWorkerTasks, updateWorkerTaskProgress } from '@api/worker.api.js';
import { getErrorMessage } from '@api/utils';
import './RoleDashboard.css';

const WORKER_STATUSES = ['in_progress', 'completed', 'complication_reported'];

const FieldWorkerDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchTasks = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getWorkerTasks();
        if (mounted) setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTasks();
    return () => {
      mounted = false;
    };
  }, []);

  const patchTask = (updatedTask) => {
    setTasks((prev) => prev.map((task) => (task._id === updatedTask._id ? updatedTask : task)));
  };

  const runAction = async (taskId, action) => {
    setWorkingId(taskId);
    try {
      const updated = await action();
      patchTask(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setWorkingId('');
    }
  };

  return (
    <section className="role-dashboard page">
      <div className="container">
        <header className="role-dashboard__header">
          <div>
            <h1>Worker Dashboard</h1>
            <p>Accept assigned tasks and submit work progress until completion.</p>
          </div>
        </header>

        {error && <div className="issues-error">{error}</div>}

        <div className="role-dashboard__grid">
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Assigned Tasks</div>
            <div className="role-dashboard__stat-value">{tasks.length}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Accepted</div>
            <div className="role-dashboard__stat-value">{tasks.filter((task) => task.status === 'accepted').length}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">In Progress</div>
            <div className="role-dashboard__stat-value">{tasks.filter((task) => task.status === 'in_progress').length}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Completed</div>
            <div className="role-dashboard__stat-value">{tasks.filter((task) => task.status === 'completed').length}</div>
          </article>
        </div>

        <section className="card role-dashboard__panel">
          <h2>My Tasks</h2>
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-muted">No tasks assigned.</p>
          ) : (
            <table className="role-dashboard__table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id}>
                    <td>{task.issue?.title || '-'}</td>
                    <td>{task.status}</td>
                    <td>{task.issue?.category || '-'}</td>
                    <td>{task.issue?.locationText || '-'}</td>
                    <td>
                      <div className="role-dashboard__actions">
                        <button
                          type="button"
                          disabled={workingId === task._id}
                          onClick={() => runAction(task._id, () => acceptWorkerTask(task._id))}
                        >
                          Accept
                        </button>
                        <select
                          defaultValue=""
                          disabled={workingId === task._id}
                          onChange={(e) =>
                            runAction(task._id, () =>
                              updateWorkerTaskProgress(task._id, { status: e.target.value })
                            )
                          }
                        >
                          <option value="" disabled>Update status</option>
                          {WORKER_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </section>
  );
};

export default FieldWorkerDashboard;
