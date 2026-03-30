import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createIssue as createIssueApi } from '@api/issues.api';
import { getErrorMessage } from '@api/utils';
import { usePermission } from '../../hooks/usePermission';
import MapAutoSizer from '../../components/map/MapAutoSizer';
import { ISSUE_CATEGORIES, ISSUE_SEVERITY_OPTIONS } from '../../constants/issueOptions';
import './CreateIssue.css';

const TITLE_RE = /[a-zA-Z]/;
const TITLE_NUMERIC_ONLY_RE = /^[0-9\s]+$/;

const STEPS = ['Category', 'Location', 'Details', 'Review'];

const DEFAULT_CENTER = [12.9716, 77.5946];
const MAP_ICON = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const MapFocus = ({ lat, lng }) => {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.6,
    });
  }, [lat, lng, map]);

  return null;
};

const MapZoomIndicator = ({ maxZoom }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [map]);

  const safeMax = Number.isFinite(Number(maxZoom)) ? Number(maxZoom) : 19;
  const percent = Math.min(100, Math.max(0, Math.round((zoom / safeMax) * 100)));

  return (
    <div className="leaflet-zoom-indicator" aria-live="polite">
      {percent}% zoom
    </div>
  );
};

const LocationPickerMarker = ({ lat, lng, onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect?.(event.latlng);
    },
  });

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return <Marker position={[lat, lng]} icon={MAP_ICON} />;
};

const CreateIssue = () => {
  const navigate = useNavigate();
  // ✅ Use permission to check if user can create issues
  const { can, loading } = usePermission();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKeyRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `issue-${Date.now()}-${Math.random()}`
  );
  const [form, setForm] = useState({
    category: 'roads',
    lat: '12.9716',
    lng: '77.5946',
    locationText: '',
    title: '',
    severity: 3,
    description: '',
  });
  const [imageFiles, setImageFiles] = useState([]);

  const selectedCategory = useMemo(
    () => ISSUE_CATEGORIES.find((cat) => cat.value === form.category) || ISSUE_CATEGORIES[0],
    [form.category]
  );

  const canMoveNext = useMemo(() => {
    if (step === 1) return Boolean(form.category);
    if (step === 2) return Boolean(form.locationText.trim()) && !Number.isNaN(Number(form.lat)) && !Number.isNaN(Number(form.lng));
    if (step === 3) {
      const title = form.title.trim();
      const isNumericOnly = TITLE_NUMERIC_ONLY_RE.test(title);
      return title.length >= 3 && TITLE_RE.test(title) && !isNumericOnly && form.description.trim().length >= 10;
    }
    return true;
  }, [step, form]);

  if (loading) return null;
  // ✅ Redirect admins and users without issue:create permission
  if (!can('issue:create')) return <Navigate to="/issues" replace />;

  const latNum = Number(form.lat);
  const lngNum = Number(form.lng);
  const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
  const mapCenter = hasCoords ? [latNum, lngNum] : DEFAULT_CENTER;

  const handleMapSelect = (latlng) => {
    const lat = Number(latlng.lat).toFixed(5);
    const lng = Number(latlng.lng).toFixed(5);
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
    const title = form.title.trim();
    const description = form.description.trim();
    const locationText = form.locationText.trim();
    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    const severityNum = Number(form.severity);

    if (!form.category) {
      setError('Please select a category.');
      return;
    }
    if (!locationText) {
      setError('Please enter an area or landmark.');
      return;
    }
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError('Please enter valid latitude and longitude values.');
      return;
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setError('Latitude must be between -90 and 90. Longitude must be between -180 and 180.');
      return;
    }
    if (title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (TITLE_NUMERIC_ONLY_RE.test(title)) {
      setError('Title cannot be only numbers.');
      return;
    }
    if (!TITLE_RE.test(title)) {
      setError('Title must include at least one letter.');
      return;
    }
    if (description.length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    if (!Number.isFinite(severityNum) || severityNum < 1 || severityNum > 4) {
      setError('Please select a valid severity level.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('title', title);
      payload.append('description', description);
      payload.append('category', form.category);
      payload.append('severity', String(severityNum));
      payload.append('lat', String(latNum));
      payload.append('lng', String(lngNum));
      payload.append('locationText', locationText);
      if (imageFiles.length > 0) {
        imageFiles.forEach((file) => payload.append('images', file));
      }
      payload.append('idempotencyKey', idempotencyKeyRef.current);

      const issue = await createIssueApi(payload, { idempotencyKey: idempotencyKeyRef.current });
      navigate(`/issues/${issue._id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="report-wizard-page">
      <div className="report-wizard-head">
        <Link to="/issues" className="report-back-link">← Back to Issues</Link>
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
              {ISSUE_CATEGORIES.map((cat) => (
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
            <h2>🗺️ Pin Location</h2>
            <p>Click the map to set exact coordinates.</p>
            <MapContainer
              center={mapCenter}
              zoom={16}
              scrollWheelZoom
              maxZoom={19}
              zoomSnap={0.25}
              zoomDelta={0.5}
              className="report-map-picker"
            >
              <TileLayer
                attribution={TILE_ATTRIBUTION}
                url={TILE_URL}
                maxZoom={19}
                maxNativeZoom={19}
                detectRetina={false}
              />
              <MapAutoSizer />
              <MapFocus lat={latNum} lng={lngNum} />
              <MapZoomIndicator maxZoom={19} />
              <LocationPickerMarker lat={latNum} lng={lngNum} onSelect={handleMapSelect} />
            </MapContainer>

            <div className="report-location-row">
              <input
                type="text"
                value={form.lat}
                onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                placeholder="Latitude"
                inputMode="decimal"
                aria-label="Latitude"
              />
              <input
                type="text"
                value={form.lng}
                onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                placeholder="Longitude"
                inputMode="decimal"
                aria-label="Longitude"
              />
              <button type="button" onClick={handleUseMyLocation}>📍 Use my location</button>
            </div>

            <input
              type="text"
              value={form.locationText}
              onChange={(e) => setForm((prev) => ({ ...prev, locationText: e.target.value }))}
              placeholder="Area or landmark"
              aria-label="Area or landmark"
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
              minLength={3}
              aria-label="Issue title"
            />

            <div className="report-severity-row">
              <label htmlFor="severity">Severity</label>
              <select
                id="severity"
                value={String(form.severity)}
                onChange={(e) => setForm((prev) => ({ ...prev, severity: Number(e.target.value) }))}
              >
                {ISSUE_SEVERITY_OPTIONS.map((sev) => (
                  <option key={sev.value} value={sev.value}>{sev.label}</option>
                ))}
              </select>
            </div>

            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the issue and impact"
              rows={5}
              minLength={10}
              aria-label="Issue description"
            />

            <div className="report-upload-row">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
              />
              <small>
                {imageFiles.length > 0
                  ? `${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''} selected`
                  : 'Optional evidence photos (up to 5)'}
              </small>
              {imageFiles.length > 0 && (
                <ul className="report-upload-list">
                  {imageFiles.map((file) => (
                    <li key={file.name}>{file.name}</li>
                  ))}
                </ul>
              )}
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
              <div>
                <span>Map Preview</span>
                {hasCoords ? (
                  <MapContainer
                    center={mapCenter}
                    zoom={16}
                    scrollWheelZoom={false}
                    dragging={false}
                    doubleClickZoom={false}
                    zoomControl={false}
                    attributionControl={false}
                    keyboard={false}
                    maxZoom={19}
                    zoomSnap={0.25}
                    zoomDelta={0.5}
                    className="report-map-preview"
                  >
                    <TileLayer url={TILE_URL} maxZoom={19} maxNativeZoom={19} detectRetina={false} />
                    <MapAutoSizer />
                    <MapZoomIndicator maxZoom={19} />
                    <Marker position={[latNum, lngNum]} icon={MAP_ICON} />
                  </MapContainer>
                ) : (
                  <div className="report-map-preview report-map-preview--empty">Location not set</div>
                )}
              </div>
              <div><span>Title</span><strong>{form.title || '-'}</strong></div>
              <div><span>Severity</span><strong>{ISSUE_SEVERITY_OPTIONS.find((sev) => sev.value === Number(form.severity))?.label}</strong></div>
              <div><span>Description</span><strong>{form.description || '-'}</strong></div>
              <div>
                <span>Photos</span>
                <strong>
                  {imageFiles.length > 0 ? imageFiles.map((file) => file.name).join(', ') : 'Not attached'}
                </strong>
              </div>
            </div>
          </div>
        )}

        <div className="report-actions">
          <button type="button" disabled={step === 1 || submitting} onClick={() => setStep((prev) => prev - 1)}>
            ← Back
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
              Continue →
            </button>
          ) : (
            <button type="button" className="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Submitting…' : '📝 Submit Issue'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default CreateIssue;
