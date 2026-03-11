import { useEffect, useState } from 'react';
import { getMyTasks } from '@api/task.api.js';
import { getErrorMessage } from '@api/utils';
import TaskCard from '../../components/tasks/TaskCard/TaskCard';
import TaskProgressUpload from '../../components/tasks/TaskProgressUpload/TaskProgressUpload';
import { useAuth } from '../../hooks/useAuth';
import { getDepartmentName, getWorkerDisplayId } from '../../utils/userDisplay';
import './WorkerDashboard.css';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getMyTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = (updatedTask) => {
    setTasks(prev => prev.map(task => task._id === updatedTask._id ? updatedTask : task));
  };

  const workerId = getWorkerDisplayId(user);
  const departmentName = getDepartmentName(user);

  return (
    <section className="worker-dashboard page">
      <div className="container">
        <header className="dashboard-header">
          <div>
            <h1>Worker Dashboard</h1>
            <p>Manage your assigned tasks</p>
          </div>

          <div className="worker-dashboard__profile card">
            <div className="worker-dashboard__profile-kv">
              <span>Worker ID</span>
              <strong>{workerId || 'N/A'}</strong>
            </div>
            <div className="worker-dashboard__profile-kv">
              <span>Name</span>
              <strong>{user?.name || '-'}</strong>
            </div>
            <div className="worker-dashboard__profile-kv">
              <span>Department</span>
              <strong>{departmentName || '-'}</strong>
            </div>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <p>Loading tasks...</p>
        ) : (
          <div className="tasks-grid">
            {tasks.map(task => (
              <TaskCard key={task._id} task={task} onUpdate={handleTaskUpdate} workerId={workerId}>
                <TaskProgressUpload task={task} onUpdate={handleTaskUpdate} />
              </TaskCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkerDashboard;
