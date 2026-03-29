import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermission } from "../../hooks/usePermission";
import { getIssues } from "@api/issues.api";
import { getPublicHeatmap } from "@api/analytics.api";
import { mapBackendStatus, statusConfig } from "@/utils/statusConfig";
import VoteButton from "../../components/issues/VoteButton/VoteButton";
import IssueLeafletMap from "../../components/map/IssueLeafletMap";
import SafeImage from "../../components/common/SafeImage/SafeImage";
import Loader from "../../components/common/Loader/Loader";
import HomeHeader from "../../components/layout/HomeHeader/HomeHeader";
import citizenIcon from "../../assets/citizen icon.png";
import officerIcon from "../../assets/officer icon.png";
import volunteerIcon from "../../assets/volunteer icon.png";
import workerIcon from "../../assets/worker icon.png";
import { ISSUE_CATEGORIES, ISSUE_CATEGORY_LABELS, ISSUE_SEVERITY_OPTIONS } from "../../constants/issueOptions";

const CATEGORY_COLORS = {
  roads: "#F2B933",
  electricity: "#2F8398",
  garbage: "#87A83F",
  drainage: "#C0C91E",
  water: "#2F8398",
  other: "#F27C54",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Report",
    color: "#2F8398",
    description:
      "Submit civic issues with location and context. Reports are routed to responsible departments.",
  },
  {
    step: "02",
    title: "Vote",
    color: "#C0C91E",
    description:
      "Community support raises urgency so officials can prioritize what matters most.",
  },
  {
    step: "03",
    title: "Resolve",
    color: "#F27C54",
    description:
      "Track updates from acknowledgement to completion with transparent progress.",
  },
];

const GLOBE_FRAME_URLS = Object.entries(
  import.meta.glob("../../../globe images/*.png", {
    eager: true,
    import: "default",
  })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

function formatRelativeDate(dateInput) {
  if (!dateInput) return "Recently";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "Recently";

  const now = Date.now();
  const diff = now - d.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    const minutes = Math.max(1, Math.floor(diff / minute));
    return `${minutes} min ago`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hr ago`;
  }

  const days = Math.floor(diff / day);
  if (days <= 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString();
}

function getLocation(issue) {
  if (typeof issue.location === "string") return issue.location;
  if (issue.location?.address) return issue.location.address;
  if (issue.location?.name) return issue.location.name;
  if (issue.address) return issue.address;
  if (issue.area) return issue.area;
  return "Location not specified";
}

function normalizeIssue(issue) {
  const rawCategory = String(issue.category || "other").toLowerCase();
  const categoryLabel = ISSUE_CATEGORY_LABELS[rawCategory] || rawCategory || "Other";
  const status = mapBackendStatus(issue.status);
  const config = statusConfig[status] || {};
  const votes = issue.voteCount ?? issue.votes ?? 0;

  return {
    id: issue._id || issue.id,
    raw: issue,
    title: issue.title || "Untitled issue",
    category: rawCategory,
    categoryLabel,
    status,
    statusLabel: config.label || "Reported",
    statusColor: config.color || "warning",
    votes,
    comments: issue.commentCount ?? issue.commentsCount ?? 0,
    location: getLocation(issue),
    coordinates: Array.isArray(issue?.location?.coordinates) ? issue.location.coordinates : null,
    reportedAt: formatRelativeDate(issue.createdAt || issue.reportedAt),
    userVoted: Boolean(issue.userVoted),
  };
}

function GlobeStage({ heroRef }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const contextRef = useRef(null);
  const heroElementRef = useRef(null);
  const frameCacheRef = useRef(new Array(GLOBE_FRAME_URLS.length).fill(null));
  const drawRafRef = useRef(0);
  const scrollRafRef = useRef(0);
  const currentFrameRef = useRef(-1);
  const latestProgressRef = useRef(0);

  const [progressPercent, setProgressPercent] = useState(0);
  const [isLoaded, setIsLoaded] = useState(() => GLOBE_FRAME_URLS.length === 0);

  const drawFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current;
    const image = frameCacheRef.current[frameIndex];
    if (!canvas || !image) return;

    const ctx = contextRef.current ?? canvas.getContext("2d");
    if (!ctx) return;
    contextRef.current = ctx;

    const progress = latestProgressRef.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imageAspect = image.width / image.height;
    const canvasAspect = canvasWidth / canvasHeight;
    const depthScale = 1.08 + progress * 0.06;
    const verticalDrift = (0.5 - progress) * 36;

    let drawWidth;
    let drawHeight;
    if (imageAspect > canvasAspect) {
      drawHeight = canvasHeight * depthScale;
      drawWidth = drawHeight * imageAspect;
    } else {
      drawWidth = canvasWidth * depthScale;
      drawHeight = drawWidth / imageAspect;
    }

    const overscan = 2;
    const x = (canvasWidth - drawWidth) / 2 - overscan;
    const y = (canvasHeight - drawHeight) / 2 + verticalDrift - overscan;
    const w = drawWidth + overscan * 2;
    const h = drawHeight + overscan * 2;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(image, x, y, w, h);
  }, []);

  const drawForProgress = useCallback(
    (progress) => {
      if (GLOBE_FRAME_URLS.length === 0) return;
      const clamped = Math.min(Math.max(progress, 0), 1);
      latestProgressRef.current = clamped;

      const frameIndex = Math.min(
        Math.floor(clamped * (GLOBE_FRAME_URLS.length - 1)),
        GLOBE_FRAME_URLS.length - 1
      );
      if (frameIndex === currentFrameRef.current) return;
      currentFrameRef.current = frameIndex;
      drawFrame(frameIndex);
    },
    [drawFrame]
  );

  const resizeCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.floor(wrapper.clientWidth * dpr);
    const nextHeight = Math.floor(wrapper.clientHeight * dpr);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    const frameIndex = currentFrameRef.current;
    if (frameIndex >= 0) drawFrame(frameIndex);
  }, [drawFrame]);

  useEffect(() => {
    document.body.classList.toggle("globe-loading", !isLoaded);
    return () => document.body.classList.remove("globe-loading");
  }, [isLoaded]);

  useEffect(() => {
    if (GLOBE_FRAME_URLS.length === 0) return undefined;

    let cancelled = false;
    let loadedCount = 0;

    const markLoaded = () => {
      loadedCount += 1;
      const percent = Math.round((loadedCount / GLOBE_FRAME_URLS.length) * 100);
      setProgressPercent((prev) => (prev === percent ? prev : percent));
      if (loadedCount === GLOBE_FRAME_URLS.length && !cancelled) setIsLoaded(true);
    };

    GLOBE_FRAME_URLS.forEach((url, idx) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        frameCacheRef.current[idx] = image;
        markLoaded();
      };
      image.onerror = markLoaded;
      image.src = url;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;

    heroElementRef.current =
      heroRef?.current || wrapperRef.current?.closest(".hero") || null;
    resizeCanvas();
    currentFrameRef.current = -1;
    drawForProgress(0);

    const onResize = () => {
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = requestAnimationFrame(resizeCanvas);
    };

    const onScroll = () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        const hero = heroElementRef.current;
        if (!hero) return;

        const rect = hero.getBoundingClientRect();
        const span = Math.max(window.innerHeight * 3.4, 1);
        const scrollProgress = Math.min(Math.max(-rect.top / span, 0), 1);
        drawForProgress(scrollProgress);
      });
    };

    onScroll();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [drawForProgress, heroRef, isLoaded, resizeCanvas]);

  return (
    <>
      <div className={`globe-loader ${isLoaded ? "globe-loader--hidden" : ""}`} aria-hidden={isLoaded}>
        <div className="globe-loader__inner">
          <div className="globe-loader__bar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="globe-loader__percent">{progressPercent}%</p>
        </div>
      </div>

      <div className="globe-wrapper" ref={wrapperRef} aria-hidden="true">
        <canvas
          ref={canvasRef}
          className={`globe-canvas ${isLoaded ? "globe-canvas--visible" : ""}`}
          width={720}
          height={720}
          aria-label="Scroll-controlled smart-city globe"
        />
        <div className="globe-glow" />
      </div>
    </>
  );
}

function HeroSection({ isLoggedIn, isAdmin, enableGlobe }) {
  const heroRef = useRef(null);

  return (
    <section className={`hero ${enableGlobe ? '' : 'hero--compact'}`.trim()} id="hero" ref={heroRef}>
      <div className="hero__grid" aria-hidden="true" />

      <div className="hero__overlay">
        <span className="hero__eyebrow">
          <span className="hero__eyebrow-dot" />
          Social Civic Platform
        </span>

        <h1 className="hero__headline">
          Better Cities,
          <br />
          <span className="hero__headline--accent">Together.</span>
        </h1>

        <p className="hero__description">
          Report civic issues. Rally community support.
          <br />
          Track real-time resolution across your city.
        </p>

        <div className="hero__ctas">
          {!isLoggedIn && (
            <>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
              <a href="#map" className="btn btn-secondary">
                View Live Map
              </a>
            </>
          )}

          {isLoggedIn && !isAdmin && (
            <>
              <Link to="/issues/create" className="btn btn-report">
                Report Issue
              </Link>
              <Link to="/issues" className="btn btn-secondary">
                Browse Issues
              </Link>
            </>
          )}

          {isLoggedIn && isAdmin && (
            <>
              <Link to="/issues" className="btn btn-secondary">
                Browse Issues
              </Link>
            </>
          )}
        </div>
      </div>

      {enableGlobe ? (
        <>
          <div className="hero__globe-stage">
            <GlobeStage heroRef={heroRef} />
          </div>
          <div className="hero__scroll-cue" aria-label="Scroll to explore">
            <div className="hero__scroll-cue-line" />
          </div>
        </>
      ) : null}
    </section>
  );
}

function HowItWorksSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll(".hiw-card").forEach((card, i) => {
              setTimeout(() => card.classList.add("hiw-card--visible"), i * 140);
            });
          }
        });
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="hiw-section" id="how-it-works" ref={sectionRef}>
      <div className="container">
        <div className="hiw-header">
          <span className="section-label">The Process</span>
          <h2 className="section-title">How Social Civic Platform Works</h2>
          <p className="section-subtitle">
            A clear three-step civic workflow that turns reports into measurable
            city improvements.
          </p>
        </div>

        <div className="hiw-grid">
          {HOW_IT_WORKS.map((step, idx) => (
            <div className="hiw-card" key={step.step}>
              <div className="hiw-card__connector" aria-hidden="true">
                {idx < HOW_IT_WORKS.length - 1 && <div className="hiw-card__line" />}
              </div>
              <div className="hiw-card__inner" style={{ "--card-color": step.color }}>
                <div className="hiw-card__step-num">{step.step}</div>
                <h3 className="hiw-card__title" style={{ color: step.color }}>
                  {step.title}
                </h3>
                <p className="hiw-card__desc">{step.description}</p>
                <div className="hiw-card__bar" style={{ "--card-color": step.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="issue-card issue-card--skeleton" aria-hidden="true">
      <div className="skel skel--inline" />
      <div className="skel skel--title" />
      <div className="skel skel--title skel--short" />
      <div className="skel skel--meta" />
      <div className="skel skel--footer" />
    </div>
  );
}

function PriorityIssuesSection({
  issues,
  loading,
  filter,
  setFilter,
  onVote,
  isAdmin,
}) {
  const categories = useMemo(() => {
    return ["all", ...ISSUE_CATEGORIES.map((cat) => cat.value)];
  }, []);

  const filteredIssues = useMemo(() => {
    if (filter === "all") return issues;
    return issues.filter((i) => i.category === filter);
  }, [issues, filter]);

  return (
    <section className="issues-section" id="issues">
      <div className="container">
        <div className="issues-header">
          <div>
            <span className="section-label">Community Voice</span>
            <h2 className="section-title">Priority Issues</h2>
            <p className="section-subtitle">
              Issues ranked by community support. Vote to amplify what matters
              most in your neighborhood.
            </p>
          </div>
          {!isAdmin && (
            <Link to="/issues" className="btn btn-secondary issues-header__cta">
              View All Issues
            </Link>
          )}
        </div>

        <div className="issues-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`issues-filter-btn${filter === cat ? " active" : ""}`}
              onClick={() => setFilter(cat)}
            >
              {cat === "all" ? "All Categories" : ISSUE_CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        <div className="issues-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredIssues.length === 0
            ? (
              <div className="issues-empty">
                <div className="issues-empty__icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
                <h3 className="issues-empty__title">No Issues Found</h3>
                <p className="issues-empty__desc">Try another category or report a new issue.</p>
                {!isAdmin && (
                  <Link to="/issues/create" className="btn btn-report">
                    Report an Issue
                  </Link>
                )}
              </div>
            )
            : filteredIssues.map((issue) => {
              const catColor = CATEGORY_COLORS[issue.category] || "#2F8398";
              const submittedImages = Array.isArray(issue?.raw?.images)
                ? issue.raw.images.map((img) => String(img || "").trim()).filter(Boolean)
                : [];
              const volunteerAfterImages = Array.isArray(issue?.raw?.communityProof)
                ? issue.raw.communityProof.map((img) => String(img || "").trim()).filter(Boolean)
                : [];
              const workerAfterImages = Array.isArray(issue?.raw?.workerProgressImages)
                ? issue.raw.workerProgressImages.map((img) => String(img || "").trim()).filter(Boolean)
                : [];
              const afterImages = Array.from(new Set([...volunteerAfterImages, ...workerAfterImages]));
              const rawStatus = String(issue?.raw?.status || "").toLowerCase();
              const isResolvedFlow = ["resolved", "resolved_by_community", "citizen_verified", "closed"].includes(rawStatus);
              const coverImage = isResolvedFlow && afterImages[0] ? afterImages[0] : submittedImages[0];
              
              return (
                <div className="issue-card" key={issue.id} style={{ "--cat-color": catColor }}>
                  <div className="issue-card__media" aria-label="Issue photo">
                    <SafeImage
                      src={coverImage}
                      alt={issue.title}
                      showSkeleton
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>

                  <div className="issue-card__content">
                    <div className="issue-card__top">
                      <span className="issue-card__category" style={{ "--cat-color": catColor }}>
                        {issue.categoryLabel || issue.category}
                      </span>
                      <span className={`issue-card__status status-${issue.statusColor || "warning"}`}>
                        {issue.statusLabel}
                      </span>
                    </div>

                    <Link to={`/issues/${issue.id}`} className="issue-card__title-link">
                      <h3 className="issue-card__title">{issue.title}</h3>
                    </Link>

                    <div className="issue-card__meta">
                      <span className="issue-card__location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {issue.location}
                      </span>
                      <span className="issue-card__time">{issue.reportedAt}</span>
                    </div>

                    <div className="issue-card__footer">
                      {!isAdmin && (
                        <div className="issue-card__vote">
                          <VoteButton
                            issueId={issue.id}
                            voteCount={issue.votes}
                            userVoted={issue.userVoted}
                            onVote={(result) => onVote(issue.id, result)}
                          />
                        </div>
                      )}
                      <span className="issue-card__comments">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        {issue.comments}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}

function MapPreviewSection({
  mapIssues = [],
  heatmapData = [],
  refreshLabel,
  isLive,
  refreshing,
  onToggleRefresh,
}) {
  const severityPalette = {
    1: '#87A83F',
    2: '#2F8398',
    3: '#F2B933',
    4: '#F27C54',
  };
  const legendItems = [...ISSUE_SEVERITY_OPTIONS]
    .sort((a, b) => b.value - a.value)
    .map((opt) => ({
      color: severityPalette[opt.value] || '#F27C54',
      label: opt.label,
    }));
  const heatmapPoints = Array.isArray(heatmapData) ? heatmapData : [];
  const activeZones = heatmapPoints.length > 0 ? heatmapPoints.length : mapIssues.length;
  const highPriorityClusters = heatmapPoints.length > 0
    ? heatmapPoints.filter((point) => Number(point?.avgSeverity || point?.maxSeverity || point?.weight || 0) >= 4).length
    : mapIssues.filter((issue) => Number(issue?.priority || issue?.severity || 0) >= 4).length;
  const displayRefreshLabel = refreshLabel || (activeZones > 0 ? 'Live' : 'Waiting');

  return (
    <section className="map-section" id="map">
      <div className="container">
        <div className="map-layout">
          <div className="map-info fade-in-up visible">
            <span className="section-label">Spatial Intelligence</span>
            <h2 className="section-title">City-Wide Issue Heatmap</h2>
            <p className="section-subtitle">
              Visualize issue density and hotspot clusters in real time to guide
              faster civic action.
            </p>

            <div className="map-legend">
              {legendItems.map((item) => (
                <div className="map-legend__item" key={item.label}>
                  <span className="map-legend__dot" style={{ background: item.color }} />
                  <span className="map-legend__label">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="map-stats">
              <div className="map-stat">
                <span className="map-stat__value">{activeZones}</span>
                <span className="map-stat__label">Active Zones</span>
              </div>
              <div className="map-stat">
                <span className="map-stat__value">{highPriorityClusters}</span>
                <span className="map-stat__label">High Priority Clusters</span>
              </div>
              <button
                type="button"
                className={`map-stat map-stat--refresh${isLive ? ' is-live' : ''}`}
                onClick={onToggleRefresh}
                aria-pressed={isLive}
              >
                <span className="map-stat__value">{displayRefreshLabel}</span>
                <span className="map-stat__label">Data Refresh</span>
                {refreshing ? <span className="map-stat__meta">Refreshing…</span> : null}
              </button>
            </div>

            <Link to="/map" className="btn btn-primary map-info__cta">
              Open Full Map
            </Link>
          </div>

          <div className="map-visual fade-in-up visible">
            <div className="map-canvas">
              <IssueLeafletMap
                issues={mapIssues}
                heatmapData={heatmapData}
                activeId={mapIssues[0]?.id || ""}
                className="map-preview-leaflet"
                zoom={11}
                scrollWheelZoom
                showZoomControl
                showAttribution
                maxZoom={20}
                showRecenter
                showMarkers={false}
                dotMode
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhoAreYouSection() {
  const roles = [
    { icon: citizenIcon, title: 'Citizen', text: 'Report local civic issues and track resolution progress in real time.', glow: '#2F8398' },
    { icon: volunteerIcon, title: 'Volunteer', text: 'Support neighborhood fixes with verification, community mobilization, and field work.', glow: '#87A83F' },
    { icon: officerIcon, title: 'Department Officer', text: 'Prioritize, assign, and monitor incoming issues with transparent public updates.', glow: '#C0C91E' },
    { icon: workerIcon, title: 'Field Worker', text: 'Execute assigned tasks on ground and upload progress with completion evidence.', glow: '#F27C54' },
  ];

  return (
    <section className="roles-section" id="about">
      <div className="container">
        <div className="roles-header">
          <span className="section-label">Platform Roles</span>
          <h2 className="section-title">Who are you?</h2>
          <p className="section-subtitle">
            Social Civic Platform adapts to every stakeholder in the city problem-solving loop.
          </p>
        </div>

        <div className="roles-grid">
          {roles.map((role) => (
            <Link
              key={role.title}
              to="/register"
              className="roles-card"
              style={{ "--role-glow": role.glow }}
              aria-label={`Register as ${role.title}`}
            >
              <img className="icon-avatar roles-card__icon" src={role.icon} alt={`${role.title} icon`} />
              <h3>{role.title}</h3>
              <p>{role.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__top-border" />
      <div className="container footer__inner">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#2F8398" strokeWidth="1.5" />
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#2F8398" strokeWidth="1.5" />
            </svg>
            <span>Social Civic Platform</span>
          </Link>
          <p className="footer__tagline">
            Connecting citizens and city governments to build smarter, more responsive urban infrastructure.
          </p>
        </div>

        <div className="footer__links">
          <div className="footer__col">
            <h4 className="footer__col-title">Platform</h4>
            <ul className="footer__col-list">
              <li><Link to="/issues" className="footer__col-link">Browse Issues</Link></li>
              <li><Link to="/issues/create" className="footer__col-link">Report an Issue</Link></li>
              <li><Link to="/dashboard" className="footer__col-link">Dashboard</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4 className="footer__col-title">For Cities</h4>
            <ul className="footer__col-list">
              <li><Link to="/admin" className="footer__col-link">Government Portal</Link></li>
              <li><Link to="/admin/analytics" className="footer__col-link">Analytics Suite</Link></li>
              <li><Link to="/admin/manage-issues" className="footer__col-link">Issue Operations</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4 className="footer__col-title">Company</h4>
            <ul className="footer__col-list">
              <li><Link to="/" className="footer__col-link">About</Link></li>
              <li><Link to="/" className="footer__col-link">Blog</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4 className="footer__col-title">Support</h4>
            <ul className="footer__col-list">
              <li><Link to="/login" className="footer__col-link">Login</Link></li>
              <li><Link to="/register" className="footer__col-link">Register</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <span className="footer__copy">© {year} Social Civic Platform</span>
          <div className="footer__status">
            <span className="footer__status-dot" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

const Home = () => {
  const { user, logout } = useAuth();
  // ✅ Use permissions instead of role checks
  const { can, dashboardPath } = usePermission();
  const isAdmin = can('admin:view_analytics');

  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState([]);
  const [mapDotIssues, setMapDotIssues] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLive, setIsLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const heatmapInFlightRef = useRef(false);
  const mapDotsInFlightRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const fetchIssues = async () => {
      try {
        const data = await getIssues();
        if (!mounted || !Array.isArray(data)) return;

        const normalized = data
          .map(normalizeIssue)
          .filter((issue) => Boolean(issue.id))
          .sort((a, b) => b.votes - a.votes);

        setIssues(normalized);
      } catch {
        if (mounted) setIssues([]);
      } finally {
        if (mounted) setIssuesLoading(false);
      }
    };

    fetchIssues();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchHeatmap = useCallback(async (mode = "auto") => {
    if (heatmapInFlightRef.current) return;
    heatmapInFlightRef.current = true;
    if (mode !== "auto") setRefreshing(true);
    try {
      const data = await getPublicHeatmap();
      setHeatmapData(Array.isArray(data) ? data : []);
    } catch {
      setHeatmapData([]);
    } finally {
      heatmapInFlightRef.current = false;
      if (mode !== "auto") setRefreshing(false);
    }
  }, []);

  const fetchMapDots = useCallback(async (mode = "auto") => {
    if (mapDotsInFlightRef.current) return;
    mapDotsInFlightRef.current = true;
    try {
      const data = await getIssues({ limit: 200, sort: "newest" });
      const normalized = (Array.isArray(data) ? data : [])
        .map(normalizeIssue)
        .filter((issue) => Boolean(issue.id));
      setMapDotIssues(normalized);
    } catch {
      if (mode !== "auto") setMapDotIssues([]);
    } finally {
      mapDotsInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchHeatmap("initial");
  }, [fetchHeatmap]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchHeatmap("auto");
      fetchMapDots("auto");
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchHeatmap, fetchMapDots, isLive]);

  useEffect(() => {
    fetchMapDots("initial");
  }, [fetchMapDots]);

  const isLoggedIn = Boolean(user);
  const handleVoteUpdate = (issueId, result) => {
    setIssues((prev) =>
      prev
        .map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                votes: result.voteCount,
                userVoted: result.voted,
              }
            : issue
        )
        .sort((a, b) => b.votes - a.votes)
    );
  };

  const mapPreviewIssues = useMemo(() => {
    const source = mapDotIssues.length > 0 ? mapDotIssues : issues;
    return source
      .filter((issue) => Array.isArray(issue.coordinates) && issue.coordinates.length >= 2)
      .slice(0, 20)
      .map((issue) => {
        const lng = Number(issue.coordinates[0]);
        const lat = Number(issue.coordinates[1]);
        if (Number.isNaN(lng) || Number.isNaN(lat)) return null;

        const severity = Math.min(4, Math.max(1, Number(issue.raw?.severity || 3)));
        return {
          id: issue.id,
          title: issue.title,
          category: issue.categoryLabel || issue.category,
          status: issue.statusLabel,
          priority: severity,
          severity,
          locationText: issue.location,
          lat,
          lng,
        };
      })
      .filter(Boolean);
  }, [issues, mapDotIssues]);

  const handleRefreshToggle = useCallback(() => {
    setIsLive((prev) => !prev);
    fetchHeatmap("manual");
    fetchMapDots("manual");
  }, [fetchHeatmap, fetchMapDots]);

  return (
    <div className="home-page">
      <HomeHeader
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        dashboardPath={dashboardPath}
        onLogout={logout}
      />

      <main>
        <HeroSection isLoggedIn={isLoggedIn} isAdmin={isAdmin} enableGlobe={!isLoggedIn} />
        <HowItWorksSection />
        <MapPreviewSection
          mapIssues={mapPreviewIssues}
          heatmapData={heatmapData}
          refreshLabel={isLive ? 'Live' : 'Paused'}
          isLive={isLive}
          refreshing={refreshing}
          onToggleRefresh={handleRefreshToggle}
        />
        <PriorityIssuesSection
          issues={issues}
          loading={issuesLoading}
          filter={filter}
          setFilter={setFilter}
          onVote={handleVoteUpdate}
          isAdmin={isAdmin}
        />
        <WhoAreYouSection />
      </main>

      <Footer />
    </div>
  );
};

export default Home;
