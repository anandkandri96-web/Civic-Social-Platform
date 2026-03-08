import { useEffect, useState } from 'react';
import { getWorkerTasks, acceptWorkerTask, updateWorkerTaskProgress } from '../../api/worker.api';
import { getErrorMessage } from '../../api/utils';
import TaskCard from '../../components/TaskCard';
import TaskProgressUpload from '../../components/TaskProgressUpload';
import './WorkerDashboard.css';

const WorkerDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getWorkerTasks();
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

  return (
    <section className="worker-dashboard page">
      <div className="container">
        <header className="dashboard-header">
          <h1>Worker Dashboard</h1>
          <p>Manage your assigned tasks</p>
        </header>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <p>Loading tasks...</p>
        ) : (
          <div className="tasks-grid">
            {tasks.map(task => (
              <TaskCard key={task._id} task={task}>
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