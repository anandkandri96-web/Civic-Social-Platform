import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { createIssue as createIssueApi } from '../../api/issues.api';
import { useRole } from '../../hooks/useRole';
import './CreateIssue.css';

// Backend enum: ROADS, ELECTRICITY, GARBAGE, DRAINAGE, OTHER
const CATEGORIES = [
  { value: 'ROADS', label: 'Roads' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'GARBAGE', label: 'Garbage' },
  { value: 'DRAINAGE', label: 'Drainage' },
  { value: 'OTHER', label: 'Other' },
];

// Backend expects severity 1–5
const SEVERITIES = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
  { value: 5, label: 'Urgent' },
];

const CreateIssue = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [form, setForm] = useState({
    title: '',
    category: 'OTHER',
    severity: 3,
    lat: '',
    lng: '',
    locationText: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [openCategory, setOpenCategory] = useState(false);
  const [openSeverity, setOpenSeverity] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const setCoords = (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      lat: lat != null ? String(lat) : prev.lat,
      lng: lng != null ? String(lng) : prev.lng,
    }));
    setError('');
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords(pos.coords.latitude, pos.coords.longitude),
      () => setError('Could not get your location. Enter coordinates manually.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const title = form.title.trim();
    const description = form.description.trim();
    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    const severityNum = Number(form.severity);

    if (title.length < 3 || title.length > 120) {
      setError('Title must be 3-120 characters.');
      return;
    }
    if (description.length < 10 || description.length > 2000) {
      setError('Description must be 10-2000 characters.');
      return;
    }
    if (!form.locationText.trim()) {
      setError('Please enter a manual location (e.g., area or landmark).');
      return;
    }
    if (!CATEGORIES.some((c) => c.value === form.category)) {
      setError('Please select a valid category.');
      return;
    }
    if (!SEVERITIES.some((s) => s.value === severityNum)) {
      setError('Please select a valid severity.');
      return;
    }
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError('Please enter valid latitude and longitude, or use "Use my location".');
      return;
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setError('Coordinates out of range. Latitude must be -90 to 90 and longitude -180 to 180.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('title', title);
      payload.append('description', description);
      payload.append('category', form.category);
      payload.append('severity', String(severityNum));
      payload.append('lat', String(latNum));
      payload.append('lng', String(lngNum));
      payload.append('locationText', form.locationText.trim());
      if (imageFile) payload.append('image', imageFile);

      const issue = await createIssueApi(payload);
      navigate(`/issues/${issue._id}`, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create issue';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const categoryLabel = CATEGORIES.find((c) => c.value === form.category)?.label ?? form.category;
  const severityLabel = SEVERITIES.find((s) => s.value === Number(form.severity))?.label ?? form.severity;

  if (loading) return null;
  if (isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="create-issue-page">
      <Link to="/issues" className="back-link">← Back to Issues</Link>

      <div className="create-issue-card">
        <h1>Report a Problem</h1>
        <p className="subtitle">
          Provide details about the issue to help authorities resolve it faster.
        </p>

        {error && <div className="create-issue-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Large pothole on Main St."
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <div
                className="dropdown"
                onClick={() => setOpenCategory(!openCategory)}
                onBlur={() => setTimeout(() => setOpenCategory(false), 150)}
                role="button"
                tabIndex={0}
              >
                <span>{categoryLabel}</span>
                <span className="arrow">⌄</span>
                {openCategory && (
                  <ul className="dropdown-menu">
                    {CATEGORIES.map((cat) => (
                      <li
                        key={cat.value}
                        className={form.category === cat.value ? 'active' : ''}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, category: cat.value }));
                          setOpenCategory(false);
                        }}
                      >
                        {form.category === cat.value && '✓ '}
                        {cat.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Severity</label>
              <div
                className="dropdown"
                onClick={() => setOpenSeverity(!openSeverity)}
                onBlur={() => setTimeout(() => setOpenSeverity(false), 150)}
                role="button"
                tabIndex={0}
              >
                <span>{severityLabel}</span>
                <span className="arrow">⌄</span>
                {openSeverity && (
                  <ul className="dropdown-menu">
                    {SEVERITIES.map((sev) => (
                      <li
                        key={sev.value}
                        className={Number(form.severity) === sev.value ? 'active' : ''}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, severity: sev.value }));
                          setOpenSeverity(false);
                        }}
                      >
                        {Number(form.severity) === sev.value && '✓ '}
                        {sev.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Location (latitude, longitude) *</label>
            <div className="location-row">
              <input
                type="text"
                name="lat"
                placeholder="e.g. 12.9716"
                value={form.lat}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="lng"
                placeholder="e.g. 77.5946"
                value={form.lng}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="location-btn"
                onClick={handleUseMyLocation}
              >
                Use my location
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Location (manual)</label>
            <input
              type="text"
              name="locationText"
              placeholder="e.g. Main Market Road, Sector 12"
              value={form.locationText}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Upload image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
              }}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateIssue;
