import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@api/auth.api';
import { getErrorMessage } from '@api/utils';
import Button from '../../components/common/Button/Button';
import { useToast } from '../../contexts/ToastContext';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();

  const EMAIL_RE = /^\S+@\S+\.\S+$/;
  const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;

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
      // ✅ Validation
      if (!NAME_RE.test(name)) {
        setError('Name must be 2-60 letters and spaces only');
        return;
      }

      if (!EMAIL_RE.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      if (password.length < 8 || password.length > 128) {
        setError('Password must be 8-128 characters');
        return;
      }

      if (!/^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,128}$/.test(password)) {
        setError('Password must include at least one number and one special character');
        return;
      }

      // ✅ API Call
      await register({
        name,
        email,
        password,
      });

      // ✅ Redirect to login after success
      showToast('Successfully registered. Please sign in.', { tone: 'success' });
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
          Create an account to start reporting issues. Role upgrades are requested after signup.
        </p>

        {error && <div className="register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">

          {/* NAME */}
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

          {/* EMAIL */}
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

          {/* PASSWORD */}
          <div className="register-field register-field--password">
            <label>Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              value={userData.password}
              onChange={handleChange}
              required
              minLength={8}
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

          {/* BUTTON */}
          <Button type="submit" disabled={submitting} className="full-width register-btn" variant="sky-blue">
            {submitting ? 'Creating Account...' : 'Create Account'}
          </Button>

        </form>

        {/* FOOTER */}
        <div className="register-footer">
          <span>Already have an account? </span>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
