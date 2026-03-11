const FALLBACK_ORIGIN = 'http://localhost';

export const DEFAULT_PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#0f1a2f"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect x="48" y="48" width="1104" height="579" rx="28" fill="#0b1326" stroke="#223255" stroke-width="2"/>
  <g fill="none" stroke="#2a3c66" stroke-width="6" opacity="0.7">
    <path d="M150 520 L420 280 L560 420 L720 240 L1050 520" />
    <circle cx="420" cy="280" r="18"/>
    <circle cx="720" cy="240" r="18"/>
  </g>
  <g fill="#93a4c7" opacity="0.85" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">
    <text x="96" y="140" font-size="26">Image unavailable</text>
    <text x="96" y="178" font-size="16" opacity="0.8">Check upload or backend URL configuration.</text>
  </g>
</svg>
`)}`;

export function getBackendOrigin() {
  const explicit = import.meta.env.VITE_BACKEND_URL;
  if (explicit && typeof explicit === 'string') {
    return explicit.replace(/\/+$/, '');
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return '';

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : FALLBACK_ORIGIN;
    const url = new URL(String(apiUrl), base);
    return url.origin;
  } catch {
    return String(apiUrl).replace(/\/+$/, '').replace(/\/api\/?$/, '');
  }
}

export function isProbablyAbsoluteUrl(value) {
  const v = String(value || '').trim().toLowerCase();
  return (
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('data:') ||
    v.startsWith('blob:') ||
    v.startsWith('//')
  );
}

/**
 * Convert backend-provided image paths into a usable URL in the frontend.
 * Handles:
 * - absolute URLs (pass-through)
 * - relative URLs like `/uploads/x.jpg` or `/api/images/<id>`
 * - bare paths like `uploads/x.jpg`
 */
export function resolveMediaUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (isProbablyAbsoluteUrl(raw)) return raw;

  const backendOrigin = getBackendOrigin();
  if (!backendOrigin) return raw;

  const normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return `${backendOrigin}${normalized}`;
  return `${backendOrigin}/${normalized}`;
}

