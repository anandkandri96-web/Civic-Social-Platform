import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { updateMe } from '@api/auth.api';
import { getErrorMessage } from '@api/utils';
import {
  normalizeEmail,
  validateEmail,
  passwordRules,
  isPasswordValid,
  getPasswordStrength,
} from '../../utils/validation';

import citizenIcon from '../../assets/citizen icon.png';
import officerIcon from '../../assets/officer icon.png';
import volunteerIcon from '../../assets/volunteer icon.png';
import workerIcon from '../../assets/worker icon.png';
import './Profile.css';

const ROLE_SUMMARY = {
  citizen: {
    title: 'Citizen Profile',
    badge: 'CT',
    icon: citizenIcon,
    accent: '#2F8398',
    stats: [
      ['Role', 'Citizen'],
      ['Primary Action', 'Report & track issues'],
      ['Access', 'Issue reporting, voting, map'],
    ],
  },
  volunteer: {
    title: 'Volunteer Profile',
    badge: 'VO',
    icon: volunteerIcon,
    accent: '#87A83F',
    stats: [
      ['Role', 'Volunteer'],
      ['Primary Action', 'Community resolution'],
      ['Access', 'Claim, progress, resolve'],
    ],
  },
  officer: {
    title: 'Officer Profile',
    badge: 'OF',
    icon: officerIcon,
    accent: '#C0C91E',
    stats: [
      ['Role', 'Department Officer'],
      ['Primary Action', 'Review & assign'],
      ['Access', 'Department queue, analytics'],
    ],
  },
  worker: {
    title: 'Field Worker Profile',
    badge: 'WK',
    icon: workerIcon,
    accent: '#F27C54',
    stats: [
      ['Role', 'Field Worker'],
      ['Primary Action', 'Execute tasks'],
      ['Access', 'Task acceptance, updates'],
    ],
  },
  admin: {
    title: 'Admin Profile',
    badge: 'AD',
    accent: '#2F8398',
    stats: [
      ['Role', 'Administrator'],
      ['Primary Action', 'Govern platform'],
      ['Access', 'Users, issues, system analytics'],
    ],
  },
};

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { can } = usePermission();
  // ✅ Get role from user object instead of useRole hook
  const role = user?.role || 'citizen';
  const isAdmin = String(role).toLowerCase() === 'admin';

  const profileMeta = useMemo(
    () => ROLE_SUMMARY[role] || ROLE_SUMMARY.citizen,
    [role]
  );

  const [accountForm, setAccountForm] = useState({ email: user?.email || '' });
  const [accountTouched, setAccountTouched] = useState({});
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  const [securityForm, setSecurityForm] = useState({ newPass: '', confirm: '' });
  const [securityTouched, setSecurityTouched] = useState({});
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const normalizedEmail = normalizeEmail(accountForm.email);
  const emailValid = validateEmail(accountForm.email);
  const emailChanged = normalizedEmail !== normalizeEmail(user?.email || '');
  const canUpdateEmail = emailValid && emailChanged && !accountSaving;

  const passwordValid = isPasswordValid(securityForm.newPass);
  const passwordConfirmMatches = securityForm.newPass && securityForm.newPass === securityForm.confirm;
  const canUpdatePassword =
    securityForm.newPass.length > 0 &&
    passwordValid &&
    passwordConfirmMatches &&
    !securitySaving;

  const passwordStrength = getPasswordStrength(securityForm.newPass);

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountBlur = (e) => {
    const { name } = e.target;
    setAccountTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSecurityBlur = (e) => {
    const { name } = e.target;
    setSecurityTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    if (!emailValid) {
      setAccountError('Please enter a valid email address.');
      return;
    }
    if (!emailChanged) {
      setAccountError('Update your email before saving.');
      return;
    }

    setAccountSaving(true);
    try {
      await updateMe({ email: normalizedEmail });
      setAccountSuccess('Email updated successfully.');
      refreshUser();
    } catch (err) {
      setAccountError(getErrorMessage(err));
    } finally {
      setAccountSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (!securityForm.newPass || !securityForm.confirm) {
      setSecurityError('Both password fields are required.');
      return;
    }
    if (!passwordValid) {
      setSecurityError('Password does not meet the required secure format.');
      return;
    }
    if (!passwordConfirmMatches) {
      setSecurityError('Passwords do not match.');
      return;
    }

    setSecuritySaving(true);
    try {
      await updateMe({ password: securityForm.newPass, confirmPassword: securityForm.confirm });
      setSecuritySuccess('Password updated successfully.');
      setSecurityForm({ newPass: '', confirm: '' });
    } catch (err) {
      setSecurityError(getErrorMessage(err));
    } finally {
      setSecuritySaving(false);
    }
  };

  return (
    <section className="profile-page" style={{ '--profile-accent': profileMeta.accent }}>
      <div className="profile-header">
        <div className="profile-avatar">
          {profileMeta.icon ? (
            <img className="profile-avatar__img" src={profileMeta.icon} alt="avatar" />
          ) : (
            profileMeta.badge
          )}
        </div>

        <div>
          <h1>{profileMeta.title}</h1>
          <p>{user?.name || 'User'}</p>
          <small>{user?.email || 'No email available'}</small>
        </div>
      </div>

      <div className="profile-grid">
        <article className="profile-panel">
          <h2>Role Overview</h2>
          <div className="profile-list">
            {profileMeta.stats.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="profile-panel">
          <h2>Account</h2>
          <div className="profile-list">
            <div>
              <span>Name</span>
              <strong>{user?.name || 'User'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email || '-'}</strong>
            </div>
            <div>
              <span>Role Key</span>
              <strong>{role || 'citizen'}</strong>
            </div>
          </div>

          <form className="profile-account-form" onSubmit={handleEmailUpdate}>
            <label>Update Email</label>
            <input
              type="email"
              name="email"
              value={accountForm.email}
              onChange={handleAccountChange}
              onBlur={handleAccountBlur}
              placeholder="you@example.com"
              className={accountTouched.email ? (emailValid ? 'input-valid' : 'input-invalid') : ''}
              required
            />
            {accountTouched.email && !emailValid && (
              <div className="field-note error">Enter a valid email address.</div>
            )}
            {accountError && <div className="profile-error">{accountError}</div>}
            {accountSuccess && <div className="profile-success">{accountSuccess}</div>}
            <button type="submit" disabled={!canUpdateEmail}>
              {accountSaving ? 'Saving...' : 'Update Email'}
            </button>
          </form>
        </article>

        {can('role:upgrade_request') && !isAdmin && (
          <article className="profile-panel profile-panel--upgrade">
            <h2>Role Upgrade</h2>
            <p className="profile-upgrade-copy">
              Apply for an elevated role and track your request status.
            </p>
            <Link to="/profile/role-upgrade" className="profile-upgrade-link">
              Request Role Upgrade
            </Link>
          </article>
        )}

        <article className="profile-panel">
          <h2>Security</h2>

          <form className="profile-password-form" onSubmit={handlePasswordUpdate}>
            <label>New Password</label>
            <div className="profile-password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPass"
                placeholder="Enter new password"
                value={securityForm.newPass}
                onChange={handleSecurityChange}
                onBlur={handleSecurityBlur}
                className={securityTouched.newPass ? (passwordValid ? 'input-valid' : 'input-invalid') : ''}
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

            <div className="password-strength-bar">
              <div className="password-strength-fill" style={{ width: `${passwordStrength.percent}%` }} />
            </div>
            <div className="field-note password-strength-label">Strength: {passwordStrength.label}</div>
            <ul className="validation-list">
              {passwordRules.map((rule) => (
                <li key={rule.key} className={rule.test(securityForm.newPass) ? 'valid' : 'invalid'}>
                  {rule.test(securityForm.newPass) ? '✓' : '•'} {rule.label}
                </li>
              ))}
            </ul>

            <label>Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirm"
              placeholder="Confirm new password"
              value={securityForm.confirm}
              onChange={handleSecurityChange}
              onBlur={handleSecurityBlur}
              className={securityTouched.confirm ? (passwordConfirmMatches ? 'input-valid' : 'input-invalid') : ''}
              required
            />
            {securityTouched.confirm && !passwordConfirmMatches && (
              <div className="field-note error">Passwords must match.</div>
            )}

            {securityError && <div className="profile-error">{securityError}</div>}
            {securitySuccess && <div className="profile-success">{securitySuccess}</div>}

            <button type="submit" disabled={!canUpdatePassword}>
              {securitySaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
};

export default Profile;
