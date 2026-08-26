import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@api/auth.api';
import { getErrorMessage } from '@api/utils';
import Button from '../../components/common/Button/Button';
import { useToast } from '../../contexts/ToastContext';
import {
  normalizeEmail,
  validateEmail,
  passwordRules,
  isPasswordValid,
  getPasswordStrength,
} from '../../utils/validation';
import './Register.css';

const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;

const Register = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailValue = normalizeEmail(form.email);
  const isNameValid = NAME_RE.test(form.name.trim());
  const isEmailValid = validateEmail(form.email);
  const isPasswordOk = isPasswordValid(form.password);
  const isConfirmMatching = form.password && form.password === form.confirmPassword;
  const canSubmit = isNameValid && isEmailValid && isPasswordOk && isConfirmMatching && !submitting;
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setSubmitting(true);

    try {
      const name = form.name.trim();
      const email = emailValue;
      const password = String(form.password || '');

      if (!NAME_RE.test(name)) {
        setError('Name must be 2-60 letters and spaces only');
        setSubmitting(false);
        return;
      }

      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        setSubmitting(false);
        return;
      }

      if (!isPasswordOk) {
        setError('Password does not meet the required strength rules.');
        setSubmitting(false);
        return;
      }

      if (!isConfirmMatching) {
        setError('Confirm password must match password');
        setSubmitting(false);
        return;
      }

      await register({
        name,
        email,
        password,
        confirmPassword: form.confirmPassword,
      });

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
          <div className={`register-field ${touched.name ? (isNameValid ? 'valid' : 'invalid') : ''}`}>
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.name && !isNameValid && (
              <div className="field-note error">Name must be 2-60 letters and spaces only.</div>
            )}
          </div>

          <div className={`register-field ${touched.email ? (isEmailValid ? 'valid' : 'invalid') : ''}`}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.email && !isEmailValid && (
              <div className="field-note error">Please enter a valid email address.</div>
            )}
          </div>

          <div className={`register-field register-field--password ${touched.password ? (isPasswordOk ? 'valid' : 'invalid') : ''}`}>
            <label>Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
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
            <div className="password-strength-bar" aria-hidden="true">
              <div className="password-strength-fill" style={{ width: `${passwordStrength.percent}%` }} />
            </div>
            <div className="field-note password-strength-label">Strength: {passwordStrength.label}</div>
            <ul className="validation-list">
              {passwordRules.map((rule) => (
                <li key={rule.key} className={rule.test(form.password) ? 'valid' : 'invalid'}>
                  {rule.test(form.password) ? '✓' : '•'} {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <div className={`register-field ${touched.confirmPassword ? (isConfirmMatching ? 'valid' : 'invalid') : ''}`}>
            <label>Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.confirmPassword && !isConfirmMatching && (
              <div className="field-note error">Passwords must match.</div>
            )}
          </div>

          <Button type="submit" disabled={!canSubmit} className="full-width register-btn" variant="sky-blue">
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
