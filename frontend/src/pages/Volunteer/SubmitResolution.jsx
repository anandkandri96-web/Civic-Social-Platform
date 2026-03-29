import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getIssueById } from '@api/issues.api';
import { resolveVolunteerIssue } from '@api/volunteer.api';
import { getErrorMessage } from '@api/utils';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { usePermission } from '../../hooks/usePermission';
import Loader from '../../components/common/Loader/Loader';
import SafeImage from '../../components/common/SafeImage/SafeImage';
import './SubmitResolution.css';

const MAX_AFTER_IMAGES = 5;
const MIN_REPORT_LENGTH = 10;

const SubmitResolution = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, loading: roleLoading } = usePermission();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportText, setReportText] = useState('');
  const [afterFiles, setAfterFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // =========================
  // FETCH ISSUE
  // =========================
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await getIssueById(id);
        if (mounted) setIssue(data);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) load();

    return () => (mounted = false);
  }, [id]);

  // =========================
  // MEMO DATA
  // =========================
  const beforeImages = useMemo(
    () => (Array.isArray(issue?.images) ? issue.images.filter(Boolean) : []),
    [issue]
  );

  const canSubmit = issue?.status === 'community_fix_in_progress';

  // =========================
  // IMAGE HANDLER
  // =========================
  const handleFileChange = useCallback((e) => {
    setError('');
    const files = Array.from(e.target.files || []);

    const imagesOnly = files.filter((f) =>
      String(f?.type || '').startsWith('image/')
    );

    if (imagesOnly.length !== files.length) {
      setError('Only image files are allowed.');
    }

    const limited = imagesOnly.slice(0, MAX_AFTER_IMAGES);

    if (imagesOnly.length > MAX_AFTER_IMAGES) {
      setError(`Max ${MAX_AFTER_IMAGES} images allowed.`);
    }

    setAfterFiles(limited);

    // Create preview URLs
    const urls = limited.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  }, []);

  // Cleanup previews
  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  // Remove image
  const removeImage = (index) => {
    const newFiles = afterFiles.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);

    setAfterFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async () => {
    const text = reportText.trim();

    if (!text) return setError('Report is required.');
    if (text.length < MIN_REPORT_LENGTH)
      return setError(`Minimum ${MIN_REPORT_LENGTH} characters required.`);
    if (afterFiles.length === 0)
      return setError('Upload at least one after image.');

    try {
      setSubmitting(true);
      setError('');

      await resolveVolunteerIssue(id, {
        reportText: text,
        proofFiles: afterFiles,
      });

      navigate(`/issues/${id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // STATES
  // =========================
  if (roleLoading || loading) return <Loader fullScreen />;

  if (!can('volunteer:submit_resolution'))
    return <Navigate to="/dashboard" replace />;

  if (!issue) {
    return (
      <section className="submit-resolution page">
        <div className="container">
          <Link to="/dashboard/volunteer" className="back-link">Back</Link>
          <div className="card submit-resolution__card">
            <h1>Submit Resolution</h1>
            <p className="text-muted">{error || 'Issue not found.'}</p>
          </div>
        </div>
      </section>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <section className="submit-resolution page">
      <div className="container">
        <Link to="/dashboard/volunteer" className="back-link">Back</Link>

        <div className="card submit-resolution__card">
          <header className="submit-resolution__head">
            <div>
              <h1>Community Resolution Report</h1>
              <p className="text-muted">{issue.title}</p>
            </div>
            <span className="submit-resolution__status">{issue.status}</span>
          </header>

          {!canSubmit && (
            <div className="submit-resolution__notice">
              Issue must be in <strong>community_fix_in_progress</strong>.
            </div>
          )}

          {error && <div className="submit-resolution__error">{error}</div>}

          {/* BEFORE IMAGES */}
          <div className="submit-resolution__section">
            <h2>Before Photos</h2>
            {beforeImages.length === 0 ? (
              <p className="text-muted">No images</p>
            ) : (
              <div className="submit-resolution__grid">
                {beforeImages.map((img, i) => (
                  <a key={i} href={resolveMediaUrl(img)} target="_blank" rel="noreferrer">
                    <SafeImage src={img} alt="" style={{ height: 110 }} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* AFTER IMAGES */}
          <div className="submit-resolution__section">
            <h2>After Photos</h2>

            <input
              type="file"
              accept="image/*"
              multiple
              disabled={!canSubmit || submitting}
              onChange={handleFileChange}
            />

            <div className="submit-resolution__preview">
              {previewUrls.map((url, i) => (
                <div key={i} className="preview-item">
                  <img src={url} alt="preview" />
                  <button onClick={() => removeImage(i)}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* REPORT */}
          <div className="submit-resolution__section">
            <h2>Report</h2>

            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              disabled={!canSubmit || submitting}
              rows={6}
            />

            <div className="char-count">
              {reportText.length}/{MIN_REPORT_LENGTH} min
            </div>
          </div>

          {/* ACTION */}
          <div className="submit-resolution__actions">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Resolution'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubmitResolution;