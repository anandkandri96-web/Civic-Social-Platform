import { Link } from 'react-router-dom';
import './Unauthorized.css';

const Unauthorized = () => (
  <section className="unauthorized-page page">
    <div className="container">
      <div className="unauthorized-card card">
        <h1>403 - Unauthorized</h1>
        <p>You do not have permission to access this page.</p>
        <Link to="/">Return to Home</Link>
      </div>
    </div>
  </section>
);

export default Unauthorized;
