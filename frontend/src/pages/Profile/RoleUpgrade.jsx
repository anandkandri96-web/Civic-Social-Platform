import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoleUpgradeRequest, getMyRoleUpgradeRequests } from '@api/roleUpgrade.api';
import { getErrorMessage } from '@api/utils';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import { useToast } from '../../contexts/ToastContext';
import './RoleUpgrade.css';

const ROLE_OPTIONS = [
  {
    value: 'volunteer',
    label: 'Volunteer',
    hint: 'Lead community fixes and verify progress on local issues.',
  },
  {
    value: 'officer',
    label: 'Officer',
    hint: 'Review issues, assign workers, and manage departmental workflows.',
  },
  {
    value: 'worker',
    label: 'Worker',
    hint: 'Handle assigned tasks and submit on-ground updates.',
  },
];

const STATUS_LABELS = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const formatRole = (role) => {
  const value = String(role || '').trim();
  if (!value) return '-';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const RoleUpgrade = () => {
  const { user } = useAuth();
  const { can } = usePermission();
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    requestedRole: '',
    preferredDepartment: '',
    motivation: '',
    experience: '',
    availability: '',
    skills: '',
    supportingLinks: '',
  });

  const currentRole = String(user?.role || 'citizen').toLowerCase();
  const isAdmin = currentRole === 'admin';

  const availableRoles = useMemo(
    () => ROLE_OPTIONS.filter((option) => option.value !== currentRole),
    [currentRole]
  );

  const pendingRequest = useMemo(
    () => requests.find((req) => req.status === 'pending'),
    [requests]
  );

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyRoleUpgradeRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!can('role:upgrade_request') || isAdmin) return;
    fetchRequests();
  }, [can, fetchRequests, isAdmin]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.requestedRole) {
      setError('Please select a role to request.');
      return;
    }

    const trimmedMotivation = form.motivation.trim();
    if (trimmedMotivation.length < 10) {
      setError('Motivation should be at least 10 characters.');
      return;
    }

    const requiresDepartment = ['officer', 'worker'].includes(form.requestedRole);
    if (requiresDepartment && !form.preferredDepartment.trim()) {
      setError('Preferred department is required for officer or worker requests.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requestedRole: form.requestedRole,
        preferredDepartment: form.preferredDepartment.trim(),
        motivation: trimmedMotivation,
        experience: form.experience.trim(),
        availability: form.availability.trim(),
        skills: form.skills.trim(),
        supportingLinks: form.supportingLinks,
      };
      const created = await createRoleUpgradeRequest(payload);
      setRequests((prev) => [created, ...prev]);
      showToast('Role upgrade request submitted.', { tone: 'success' });
      setForm({
        requestedRole: '',
        preferredDepartment: '',
        motivation: '',
        experience: '',
        availability: '',
        skills: '',
        supportingLinks: '',
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isAdmin) {
    return (
      <section className="role-upgrade page">
        <div className="container">
          <PageHeader
            title="Role Upgrade Request"
            subtitle="Role upgrades are not available for admin accounts."
          />
          <div className="role-upgrade__grid">
            <article className="role-upgrade__card card">
              <h2>Admin accounts</h2>
              <div className="role-upgrade__notice">
                Admins already have full access. Role upgrade requests are disabled.
              </div>
            </article>
          </div>
        </div>
      </section>
    );
  }

  if (loading) return <Loader fullScreen />;

  return (
    <section className="role-upgrade page">
      <div className="container">
        <PageHeader
          title="Role Upgrade Request"
          subtitle="Request an elevated role. Admins review requests before access changes."
        />

        {error && <div className="issues-error">{error}</div>}

        <div className="role-upgrade__grid">
          <article className="role-upgrade__card card">
            <h2>Apply for a new role</h2>
            <p className="role-upgrade__hint">
              Current role: <strong>{formatRole(currentRole)}</strong>
            </p>

            {pendingRequest ? (
              <div className="role-upgrade__notice">
                You already have a pending request submitted on{' '}
                {new Date(pendingRequest.createdAt).toLocaleDateString()}.
              </div>
            ) : availableRoles.length === 0 ? (
              <div className="role-upgrade__notice">
                Your account already has access to all available role upgrades. Contact an admin for special changes.
              </div>
            ) : (
              <form className="role-upgrade__form" onSubmit={handleSubmit}>
                <label>
                  Requested role
                  <select name="requestedRole" value={form.requestedRole} onChange={handleChange}>
                    <option value="">Select a role</option>
                    {availableRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>

                {form.requestedRole ? (
                  <p className="role-upgrade__role-hint">
                    {ROLE_OPTIONS.find((opt) => opt.value === form.requestedRole)?.hint}
                  </p>
                ) : null}

                {['officer', 'worker'].includes(form.requestedRole) && (
                  <label>
                    Preferred department
                    <input
                      type="text"
                      name="preferredDepartment"
                      placeholder="Example: Roads & Transport"
                      value={form.preferredDepartment}
                      onChange={handleChange}
                    />
                  </label>
                )}

                {form.requestedRole === 'volunteer' && (
                  <label>
                    Skills
                    <input
                      type="text"
                      name="skills"
                      placeholder="Example: Plumbing, Electrical, Carpentry, First Aid"
                      value={form.skills}
                      onChange={handleChange}
                    />
                    <span className="role-upgrade__helper">
                      List skills relevant to community issue resolution, separated by commas.
                    </span>
                  </label>
                )}

                <label>
                  Motivation
                  <textarea
                    name="motivation"
                    rows="4"
                    placeholder="Share why you want this role and how you can contribute."
                    value={form.motivation}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Relevant experience (optional)
                  <textarea
                    name="experience"
                    rows="3"
                    placeholder="Highlight experience, certifications, or past projects."
                    value={form.experience}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Availability (optional)
                  <input
                    type="text"
                    name="availability"
                    placeholder="Example: Weekdays after 6pm"
                    value={form.availability}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Supporting links (URLs, optional)
                  <input
                    type="text"
                    name="supportingLinks"
                    placeholder="Paste URLs separated by commas or new lines"
                    value={form.supportingLinks}
                    onChange={handleChange}
                  />
                  <span className="role-upgrade__helper">
                    Add links to certificates, portfolios, or references that help validate your request.
                  </span>
                </label>

                <div className="role-upgrade__actions">
                  <Button type="submit" loading={submitting} disabled={submitting}>
                    Submit request
                  </Button>
                </div>
              </form>
            )}
          </article>

          <article className="role-upgrade__card card">
            <h2>Your requests</h2>
            {requests.length === 0 ? (
              <div className="role-upgrade__empty">No role upgrade requests yet.</div>
            ) : (
              <div className="role-upgrade__list">
                {requests.map((req) => (
                  <div key={req._id} className={`role-upgrade__item role-upgrade__item--${req.status}`}>
                    <div>
                      <h3>{formatRole(req.requestedRole)}</h3>
                      <p className="role-upgrade__meta">
                        Submitted {new Date(req.createdAt).toLocaleDateString()} •
                        {STATUS_LABELS[req.status] || req.status}
                      </p>
                      {req.preferredDepartment ? (
                        <p className="role-upgrade__meta">Preferred department: {req.preferredDepartment}</p>
                      ) : null}
                      {req.adminNotes ? (
                        <p className="role-upgrade__notes">Admin notes: {req.adminNotes}</p>
                      ) : null}
                    </div>
                    <span className="role-upgrade__status">{STATUS_LABELS[req.status] || req.status}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
};

export default RoleUpgrade;
