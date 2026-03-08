import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../../api/auth.api';
import { getErrorMessage } from '../../../api/utils';
import Button from '../../../components/common/Button/Button';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'citizen',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const EMAIL_RE = /^\S+@\S+\.\S+$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const name = userData.name.trim();
      const email = userData.email.trim().toLowerCase();
      const password = String(userData.password || '');
      if (name.length < 2 || name.length > 60) {
        setError('Name must be 2-60 characters');
        return;
      }
      if (!EMAIL_RE.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
      if (password.length < 6 || password.length > 128) {
        setError('Password must be 6-128 characters');
        return;
      }
      const role = String(userData.role || 'citizen').toLowerCase();
      if (!['citizen', 'volunteer'].includes(role)) {
        setError('Invalid role selected');
        return;
      }

      await register({
        ...userData,
        name,
        email,
        password,
        role,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page page">
      <Link to="/" className="auth-back-home">Back to home</Link>
      <div className="register-card card">
        <h1 className="register-title">Join Social Civic Platform</h1>
        <p className="register-subtitle">
          Create an account to start reporting issues
        </p>

        {error && <div className="register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-field">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={userData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="register-field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={userData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="register-field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="******"
              value={userData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="register-field">
            <label>Role</label>
            <select
              name="role"
              value={userData.role}
              onChange={handleChange}
              required
            >
              <option value="citizen">Citizen</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>

          <Button type="submit" disabled={submitting} className="full-width">
            {submitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="register-footer">
          <span>Already have an account? </span>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
