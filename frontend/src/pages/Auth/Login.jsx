import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { normalizeRole } from '../../utils/roleCheck';
import { getErrorMessage } from '@api/utils';
import Button from '../../components/common/Button/Button';
import { useToast } from '../../contexts/ToastContext';
import { validateEmail, normalizeEmail } from '../../utils/validation';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState({});

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailIsValid = validateEmail(credentials.email);
  const passwordIsValid = credentials.password.length > 0;
  const canSubmit = emailIsValid && passwordIsValid && !submitting;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);

    try {
      const email = normalizeEmail(credentials.email);
      const password = String(credentials.password || '');

      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        setSubmitting(false);
        return;
      }
      if (!password) {
        setError('Password is required');
        setSubmitting(false);
        return;
      }

      const data = await login({
        email,
        password,
      });
      showToast('Successfully signed in.', { tone: 'success' });

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
      <Link to="/" className="auth-back-home">Back to home</Link>

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
            onBlur={handleBlur}
            placeholder="Enter email"
            autoComplete="username"
            required
            className={touched.email ? (emailIsValid ? 'input-valid' : 'input-invalid') : ''}
          />
          {touched.email && !emailIsValid && (
            <div className="field-note error">Please enter a valid email address.</div>
          )}

          <label>Password</label>
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={credentials.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter password"
              autoComplete="current-password"
              required
              className={touched.password && !passwordIsValid ? 'input-invalid' : ''}
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
          {touched.password && !passwordIsValid && (
            <div className="field-note error">Password is required.</div>
          )}

          <Button type="submit" disabled={!canSubmit} className="full-width">
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
