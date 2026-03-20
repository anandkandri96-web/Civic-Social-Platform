import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => (
  <section className="notfound-page page">
    <div className="container">
      <div className="notfound-card card">
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for doesn't exist.</p>
        <Link to="/">Go back to home</Link>
      </div>
    </div>
  </section>
);

export default NotFound;
