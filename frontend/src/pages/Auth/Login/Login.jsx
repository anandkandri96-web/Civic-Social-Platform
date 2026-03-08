import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { normalizeRole } from '../../../utils/roleCheck';
import { getErrorMessage } from '../../../api/utils';
import Button from '../../../components/common/Button/Button';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const EMAIL_RE = /^\S+@\S+\.\S+$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const email = credentials.email.trim().toLowerCase();
      const password = String(credentials.password || '');
      if (!EMAIL_RE.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
      if (password.length < 6 || password.length > 128) {
        setError('Password must be 6-128 characters');
        return;
      }

      const data = await login({
        email,
        password,
      });

      const actualRole = normalizeRole(data?.user?.role || '');

      if (actualRole === 'admin') {
        navigate('/admin', { replace: true });
      } else if (actualRole === 'officer') {
        navigate('/dashboard/officer', { replace: true });
      } else if (actualRole === 'worker') {
        navigate('/dashboard/worker', { replace: true });
      } else if (actualRole === 'volunteer') {
        navigate('/dashboard/volunteer', { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page page">
      <Link to="/" className="auth-back-home">← Back to home</Link>

      <div className="login-card card">
        <h1 className="login-brand">Social Civic Platform</h1>
        <p className="login-subtitle">
          Enter your credentials to access your account
        </p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />

          <label>Password</label>
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <Button type="submit" disabled={submitting} className="full-width">
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="login-footer">
          Do not have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
