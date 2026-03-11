import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getIssueById } from '@api/issues.api';
import { resolveVolunteerIssue } from '@api/volunteer.api';
import { getErrorMessage } from '@api/utils';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { useRole } from '../../hooks/useRole';
import Loader from '../../components/common/Loader/Loader';
import SafeImage from '../../components/common/SafeImage/SafeImage';
import './SubmitResolution.css';

const SubmitResolution = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isVolunteer, loading: roleLoading } = useRole();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportText, setReportText] = useState('');
  const [afterFiles, setAfterFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const MAX_AFTER_IMAGES = 5;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getIssueById(id);
        if (!mounted) return;
        setIssue(data);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const beforeImages = useMemo(() => (Array.isArray(issue?.images) ? issue.images : []).filter(Boolean), [issue]);
  const canSubmit = issue?.status === 'community_fix_in_progress';

  const handleSubmit = async () => {
    const text = reportText.trim();
    if (!text) {
      setError('Community resolution report is required.');
      return;
    }
    if (text.length < 10) {
      setError('Report must be at least 10 characters.');
      return;
    }
    if (afterFiles.length === 0) {
      setError('Please upload at least one after-fix photo.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await resolveVolunteerIssue(id, { reportText: text, proofFiles: afterFiles });
      navigate(`/issues/${id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (roleLoading || loading) return <Loader fullScreen />;
  if (!isVolunteer) return <Navigate to="/dashboard" replace />;
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
              This issue must be in <strong>community_fix_in_progress</strong> before you can submit a resolution.
            </div>
          )}

          {error && <div className="submit-resolution__error">{error}</div>}

          <div className="submit-resolution__section">
            <h2>Before Photos (Citizen Report)</h2>
            {beforeImages.length === 0 ? (
              <p className="text-muted">No before photos uploaded.</p>
            ) : (
              <div className="submit-resolution__grid">
                {beforeImages.map((img, idx) => (
                  <a key={`${img}-${idx}`} href={resolveMediaUrl(img)} target="_blank" rel="noreferrer">
                    <SafeImage src={img} alt={`Before ${idx + 1}`} showSkeleton style={{ width: '100%', height: 110 }} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="submit-resolution__section">
            <h2>After Photos</h2>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={!canSubmit || submitting}
              onChange={(e) => {
                setError('');
                const files = Array.from(e.target.files || []);
                const imagesOnly = files.filter((f) => String(f?.type || '').startsWith('image/'));
                if (imagesOnly.length !== files.length) {
                  setError('Only image files are allowed.');
                }
                if (imagesOnly.length > MAX_AFTER_IMAGES) {
                  setError(`You can upload up to ${MAX_AFTER_IMAGES} photos.`);
                  setAfterFiles(imagesOnly.slice(0, MAX_AFTER_IMAGES));
                  return;
                }
                setAfterFiles(imagesOnly);
              }}
            />
            <small className="text-muted">
              Upload clear photos showing the completed fix.
            </small>
          </div>

          <div className="submit-resolution__section">
            <h2>Community Resolution Report</h2>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe what work was done, who participated, materials used, and time taken."
              disabled={!canSubmit || submitting}
              rows={6}
            />
            <small className="text-muted">Minimum 10 characters.</small>
          </div>

          <div className="submit-resolution__actions">
            <button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? 'Submitting...' : 'Submit Resolution'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubmitResolution;
