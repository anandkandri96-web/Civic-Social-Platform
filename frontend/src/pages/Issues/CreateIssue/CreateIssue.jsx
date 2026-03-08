import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createIssue as createIssueApi } from '../../../api/issues.api';
import { useRole } from '../../../hooks/useRole';
import './CreateIssue.css';

const CATEGORIES = [
  { value: 'roads', label: 'Roads', icon: '??' },
  { value: 'electricity', label: 'Electricity', icon: '?' },
  { value: 'garbage', label: 'Waste', icon: '?' },
  { value: 'drainage', label: 'Drainage', icon: '??' },
  { value: 'water', label: 'Water', icon: '??' },
  { value: 'other', label: 'Other', icon: '??' },
];

const SEVERITIES = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
  { value: 5, label: 'Urgent' },
];

const STEPS = ['Category', 'Location', 'Details', 'Review'];

const CreateIssue = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    category: 'roads',
    lat: '12.9716',
    lng: '77.5946',
    locationText: '',
    title: '',
    severity: 3,
    description: '',
  });
  const [pin, setPin] = useState({ x: 50, y: 48 });
  const [imageFile, setImageFile] = useState(null);

  const selectedCategory = useMemo(
    () => CATEGORIES.find((cat) => cat.value === form.category) || CATEGORIES[0],
    [form.category]
  );

  const canMoveNext = useMemo(() => {
    if (step === 1) return Boolean(form.category);
    if (step === 2) return Boolean(form.locationText.trim()) && !Number.isNaN(Number(form.lat)) && !Number.isNaN(Number(form.lng));
    if (step === 3) return form.title.trim().length >= 3 && form.description.trim().length >= 10;
    return true;
  }, [step, form]);

  if (loading) return null;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const setCoordsFromMap = (clientX, clientY, rect) => {
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const lat = (13.2 - relY * 0.7).toFixed(5);
    const lng = (77.2 + relX * 0.8).toFixed(5);
    setPin({ x: relX * 100, y: relY * 100 });
    setForm((prev) => ({ ...prev, lat, lng }));
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude).toFixed(5);
        const lng = Number(pos.coords.longitude).toFixed(5);
        setForm((prev) => ({ ...prev, lat, lng }));
        setError('');
      },
      () => setError('Could not access your location. Please set location manually.')
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('title', form.title.trim());
      payload.append('description', form.description.trim());
      payload.append('category', form.category);
      payload.append('severity', String(Number(form.severity)));
      payload.append('lat', String(Number(form.lat)));
      payload.append('lng', String(Number(form.lng)));
      payload.append('locationText', form.locationText.trim());
      if (imageFile) payload.append('image', imageFile);

      const issue = await createIssueApi(payload);
      navigate(`/issues/${issue._id}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="report-wizard-page">
      <div className="report-wizard-head">
        <Link to="/issues" className="report-back-link">? Back to Issues</Link>
        <span>Step {step} of 4</span>
      </div>

      <div className="report-stepper">
        {STEPS.map((label, idx) => {
          const index = idx + 1;
          const done = index < step;
          const active = index === step;
          return (
            <div key={label} className="report-step-item">
              <div className={`report-step-dot${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}>
                {done ? '?' : index}
              </div>
              <small>{label}</small>
            </div>
          );
        })}
      </div>

      <div className="report-card card">
        {error && <div className="create-issue-error">{error}</div>}

        {step === 1 && (
          <div className="report-panel">
            <h2>Select Category</h2>
            <p>Choose the category that best describes this issue.</p>
            <div className="report-category-grid">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.value}
                  className={`report-category${form.category === cat.value ? ' is-active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, category: cat.value }))}
                >
                  <span>{cat.icon}</span>
                  <strong>{cat.label}</strong>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="report-panel">
            <h2>Pin Location</h2>
            <p>Click the map area to set exact coordinates.</p>
            <div
              className="report-map-picker"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCoordsFromMap(e.clientX, e.clientY, rect);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setCoordsFromMap(rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
                }
              }}
            >
              <div className="report-map-grid" />
              <span className="report-map-pin" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>??</span>
            </div>

            <div className="report-location-row">
              <input
                type="text"
                value={form.lat}
                onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                placeholder="Latitude"
              />
              <input
                type="text"
                value={form.lng}
                onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                placeholder="Longitude"
              />
              <button type="button" onClick={handleUseMyLocation}>Use my location</button>
            </div>

            <input
              type="text"
              value={form.locationText}
              onChange={(e) => setForm((prev) => ({ ...prev, locationText: e.target.value }))}
              placeholder="Area or landmark"
            />
          </div>
        )}

        {step === 3 && (
          <div className="report-panel">
            <h2>Issue Details</h2>
            <p>Add information to help officials resolve this faster.</p>

            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Issue title"
            />

            <div className="report-severity-row">
              <label htmlFor="severity">Severity</label>
              <select
                id="severity"
                value={String(form.severity)}
                onChange={(e) => setForm((prev) => ({ ...prev, severity: Number(e.target.value) }))}
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev.value} value={sev.value}>{sev.label}</option>
                ))}
              </select>
            </div>

            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the issue and impact"
              rows={5}
            />

            <div className="report-upload-row">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <small>{imageFile ? imageFile.name : 'Optional evidence photo'}</small>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="report-panel">
            <h2>Review & Submit</h2>
            <p>Confirm details before submitting your report.</p>
            <div className="report-review-list">
              <div><span>Category</span><strong>{selectedCategory.label}</strong></div>
              <div><span>Location</span><strong>{form.locationText || '-'}</strong></div>
              <div><span>Coordinates</span><strong>{form.lat}, {form.lng}</strong></div>
              <div><span>Title</span><strong>{form.title || '-'}</strong></div>
              <div><span>Severity</span><strong>{SEVERITIES.find((sev) => sev.value === Number(form.severity))?.label}</strong></div>
              <div><span>Description</span><strong>{form.description || '-'}</strong></div>
              <div><span>Photo</span><strong>{imageFile?.name || 'Not attached'}</strong></div>
            </div>
          </div>
        )}

        <div className="report-actions">
          <button type="button" disabled={step === 1 || submitting} onClick={() => setStep((prev) => prev - 1)}>
            ? Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              className="primary"
              disabled={!canMoveNext || submitting}
              onClick={() => {
                if (!canMoveNext) return;
                setStep((prev) => prev + 1);
              }}
            >
              Continue ?
            </button>
          ) : (
            <button type="button" className="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Submitting...' : '? Submit Issue'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default CreateIssue;