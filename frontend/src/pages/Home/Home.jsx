import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useRole } from "../../hooks/useRole";
import { getIssues } from "../../api/issues.api";
import VoteButton from "../../components/ui/VoteButton";
import "./Home.css";

const CATEGORY_LABELS = {
  ROADS: "Roads",
  ELECTRICITY: "Electricity",
  GARBAGE: "Garbage",
  DRAINAGE: "Drainage",
  OTHER: "Other",
};

const CATEGORY_COLORS = {
  Roads: "#f59e0b",
  Electricity: "#38b6ff",
  Garbage: "#10b981",
  Drainage: "#14c6df",
  Other: "#a78bfa",
};

const STATUS_LABELS = {
  open: "Open",
  pending: "Open",
  assigned: "In Progress",
  "in-progress": "In Progress",
  inprogress: "In Progress",
  resolved: "Resolved",
  closed: "Resolved",
  critical: "Critical",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Report",
    color: "#38b6ff",
    description:
      "Submit civic issues with location and context. Reports are routed to responsible departments.",
  },
  {
    step: "02",
    title: "Vote",
    color: "#a78bfa",
    description:
      "Community support raises urgency so officials can prioritize what matters most.",
  },
  {
    step: "03",
    title: "Resolve",
    color: "#10b981",
    description:
      "Track updates from acknowledgement to completion with transparent progress.",
  },
];

const HEATMAP_POINTS = [
  { x: 22, y: 30, intensity: 5, label: "MG Road" },
  { x: 45, y: 20, intensity: 3, label: "City Mall" },
  { x: 65, y: 45, intensity: 4, label: "Station Rd" },
  { x: 35, y: 60, intensity: 2, label: "Riverside" },
  { x: 75, y: 30, intensity: 5, label: "Central Sq" },
  { x: 55, y: 70, intensity: 3, label: "East Wing" },
  { x: 15, y: 55, intensity: 2, label: "Park Ave" },
  { x: 82, y: 60, intensity: 4, label: "Tech Hub" },
  { x: 30, y: 80, intensity: 3, label: "South Gate" },
  { x: 68, y: 15, intensity: 2, label: "North Link" },
];

const INTENSITY_COLORS = {
  5: "#ef4444",
  4: "#f59e0b",
  3: "#38b6ff",
  2: "#10b981",
  1: "#a78bfa",
};

const GLOBE_FRAME_URLS = Object.entries(
  import.meta.glob("../../../globe images/*.png", {
    eager: true,
    import: "default",
  })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

function normalizeStatus(status) {
  const key = String(status || "pending").trim().toLowerCase();
  if (key.includes("critical")) return "critical";
  if (key.includes("resolve") || key.includes("close")) return "resolved";
  if (key.includes("assign") || key.includes("progress")) return "in-progress";
  if (key.includes("open") || key.includes("pending")) return "open";
  return "open";
}

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
  const rawCategory = issue.category || "OTHER";
  const category = CATEGORY_LABELS[rawCategory] || rawCategory || "Other";
  const status = normalizeStatus(issue.status);
  const votes = issue.voteCount ?? issue.votes ?? 0;

  return {
    id: issue._id || issue.id,
    raw: issue,
    title: issue.title || "Untitled issue",
    category,
    status,
    statusLabel: STATUS_LABELS[status] || "Open",
    votes,
    comments: issue.commentCount ?? issue.commentsCount ?? 0,
    location: getLocation(issue),
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

function HomeHeader({
  isLoggedIn,
  isAdmin,
  dashboardPath,
  theme,
  onToggleTheme,
  onLogout,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`header${scrolled ? " header--scrolled" : ""}`}>
      <div className="header__inner container">
        <Link to="/" className="header__logo">
          <span className="header__logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#38b6ff" strokeWidth="1.5" />
              <path
                d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
                stroke="#38b6ff"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <span className="header__logo-text">Social Civic Platform</span>
        </Link>

        <nav className="header__nav">
          {!isLoggedIn && (
            <>
              <a href="#how-it-works" className="header__nav-link">
                How It Works
              </a>
              <a href="#issues" className="header__nav-link">
                Issues
              </a>
              <a href="#map" className="header__nav-link">
                Map
              </a>
              <Link to="/workflow" className="header__nav-link">
                Workflow
              </Link>
              <Link to="/login" className="btn btn-ghost">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          )}

          {isLoggedIn && !isAdmin && (
            <>
              <Link to="/issues" className="header__nav-link">
                Browse Issues
              </Link>
              <Link to="/workflow" className="header__nav-link">
                Workflow
              </Link>
              <Link to={dashboardPath} className="header__nav-link">
                Dashboard
              </Link>
              <Link to="/issues/create" className="btn btn-report">
                Report Issue
              </Link>
              <button className="btn btn-ghost header__user-btn" onClick={onLogout}>
                Sign Out
              </button>
            </>
          )}

          {isLoggedIn && isAdmin && (
            <>
              <Link to="/issues" className="header__nav-link">
                Browse Issues
              </Link>
              <Link to="/workflow" className="header__nav-link">
                Workflow
              </Link>
              <Link to={dashboardPath} className="header__nav-link">
                Dashboard
              </Link>
              <Link to="/admin" className="header__nav-link header__nav-link--admin">
                Admin Panel
              </Link>
              <button className="btn btn-ghost header__user-btn" onClick={onLogout}>
                Sign Out
              </button>
            </>
          )}
        </nav>

        <button
          type="button"
          className="header__theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}

function HeroSection({ isLoggedIn, isAdmin, enableGlobe }) {
  const heroRef = useRef(null);
  const overlayRef = useRef(null);
  const scrollRafRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        const hero = heroRef.current;
        const overlay = overlayRef.current;
        if (!hero || !overlay) return;

        const rect = hero.getBoundingClientRect();
        const travel = Math.max(rect.height - window.innerHeight, 1);
        const t = Math.min(Math.max(-rect.top / travel, 0), 1);
        const fade = Math.max(0, 1 - t * 1.35);

        overlay.style.opacity = `${fade}`;
        overlay.style.transform = `translateY(${t * -30}px)`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  return (
    <section className={`hero ${enableGlobe ? '' : 'hero--compact'}`.trim()} id="hero" ref={heroRef}>
      <div className="hero__grid" aria-hidden="true" />

      <div className="hero__overlay" ref={overlayRef}>
        <span className="hero__eyebrow">
          <span className="hero__eyebrow-dot" />
          City Community Problem Heatmap
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
              <Link to="/admin" className="btn btn-primary">
                Open Admin Panel
              </Link>
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
    const unique = [...new Set(issues.map((i) => i.category))].filter(Boolean);
    return ["all", ...unique];
  }, [issues]);

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
              {cat === "all" ? "All Categories" : cat}
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
              const catColor = CATEGORY_COLORS[issue.category] || "#38b6ff";
              return (
                <div className="issue-card" key={issue.id}>
                  <div className="issue-card__top">
                    <span className="issue-card__category" style={{ "--cat-color": catColor }}>
                      {issue.category}
                    </span>
                    <span className={`issue-card__status issue-card__status--${issue.status}`}>
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
                    <div className="issue-card__vote">
                      <VoteButton
                        issueId={issue.id}
                        voteCount={issue.votes}
                        userVoted={issue.userVoted}
                        onVote={(result) => onVote(issue.id, result)}
                      />
                    </div>
                    <span className="issue-card__comments">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      {issue.comments}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}

function MapPreviewSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll(".map-point").forEach((pt, i) => {
              setTimeout(() => pt.classList.add("map-point--visible"), i * 90);
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="map-section" id="map" ref={sectionRef}>
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
              {[
                { color: "#ef4444", label: "Critical Density" },
                { color: "#f59e0b", label: "High Concentration" },
                { color: "#38b6ff", label: "Medium Activity" },
                { color: "#10b981", label: "Low Activity" },
              ].map((item) => (
                <div className="map-legend__item" key={item.label}>
                  <span className="map-legend__dot" style={{ background: item.color }} />
                  <span className="map-legend__label">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="map-stats">
              <div className="map-stat">
                <span className="map-stat__value">18</span>
                <span className="map-stat__label">Active Zones</span>
              </div>
              <div className="map-stat">
                <span className="map-stat__value">3</span>
                <span className="map-stat__label">Critical Clusters</span>
              </div>
              <div className="map-stat">
                <span className="map-stat__value">Real-time</span>
                <span className="map-stat__label">Data Refresh</span>
              </div>
            </div>

            <Link to="/issues" className="btn btn-primary map-info__cta">
              Open Full Map
            </Link>
          </div>

          <div className="map-visual fade-in-up visible">
            <div className="map-canvas">
              <div className="map-grid" aria-hidden="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`h-${i}`} className="map-grid__h-line" style={{ top: `${(i + 1) * 11}%` }} />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={`v-${i}`} className="map-grid__v-line" style={{ left: `${(i + 1) * 9}%` }} />
                ))}
              </div>

              <div className="map-blocks" aria-hidden="true">
                <div className="map-block" style={{ left: "10%", top: "15%", width: "14%", height: "10%" }} />
                <div className="map-block" style={{ left: "30%", top: "10%", width: "18%", height: "12%" }} />
                <div className="map-block" style={{ left: "58%", top: "18%", width: "12%", height: "8%" }} />
                <div className="map-block" style={{ left: "78%", top: "12%", width: "10%", height: "14%" }} />
                <div className="map-block" style={{ left: "8%", top: "40%", width: "16%", height: "9%" }} />
                <div className="map-block" style={{ left: "28%", top: "45%", width: "20%", height: "11%" }} />
                <div className="map-block" style={{ left: "56%", top: "38%", width: "14%", height: "12%" }} />
                <div className="map-block" style={{ left: "76%", top: "42%", width: "12%", height: "10%" }} />
                <div className="map-block" style={{ left: "12%", top: "65%", width: "15%", height: "9%" }} />
                <div className="map-block" style={{ left: "34%", top: "68%", width: "18%", height: "10%" }} />
                <div className="map-block" style={{ left: "60%", top: "62%", width: "12%", height: "11%" }} />
                <div className="map-block" style={{ left: "80%", top: "65%", width: "10%", height: "12%" }} />
              </div>

              {HEATMAP_POINTS.map((pt, idx) => {
                const color = INTENSITY_COLORS[pt.intensity] || "#38b6ff";
                return (
                  <div
                    key={idx}
                    className="map-point"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%`, "--pt-color": color }}
                    title={`${pt.label} | Intensity: ${pt.intensity}`}
                  >
                    <div className="map-point__ring" />
                    <div className="map-point__dot" />
                    <div className="map-point__halo" />
                    <span className="map-point__label">{pt.label}</span>
                  </div>
                );
              })}

              <div className="map-compass" aria-label="North">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1" />
                  <path d="M12 2l2 8H10L12 2z" fill="#38b6ff" stroke="none" />
                  <path d="M12 22l-2-8h4L12 22z" fill="rgba(56,182,255,0.3)" stroke="none" />
                </svg>
                <span>N</span>
              </div>

              <div className="map-overlay-label">LIVE | CIVICPULSE MAP</div>
            </div>
          </div>
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
              <circle cx="12" cy="12" r="10" stroke="#38b6ff" strokeWidth="1.5" />
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#38b6ff" strokeWidth="1.5" />
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
          <span className="footer__copy">Copyright {year} Social Civic Platform. All rights reserved.</span>
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
  const { isAdmin, dashboardPath } = useRole();

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("civic-theme");
    return stored === "light" ? "light" : "dark";
  });
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("civic-theme", theme);
  }, [theme]);

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

  return (
    <div className="home-page">
      <HomeHeader
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        dashboardPath={dashboardPath}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        onLogout={logout}
      />

      <main>
        <HeroSection isLoggedIn={isLoggedIn} isAdmin={isAdmin} enableGlobe={!isLoggedIn} />
        <HowItWorksSection />
        <PriorityIssuesSection
          issues={issues}
          loading={issuesLoading}
          filter={filter}
          setFilter={setFilter}
          onVote={handleVoteUpdate}
          isAdmin={isAdmin}
        />
        <MapPreviewSection />
      </main>

      <Footer />
    </div>
  );
};

export default Home;
