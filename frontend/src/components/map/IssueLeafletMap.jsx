import { useEffect, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const HEATMAP_COLORS = {
  low: '#5F7F1C',
  medium: '#1F6A7A',
  high: '#C98A12',
  critical: '#C64C2B',
};
const DEFAULT_CENTER = [12.7096, 77.6958];
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ISSUE_MARKER_ICON = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});
const DOT_ICON_CACHE = new Map();

const getSeverityColor = (severity) => {
  const safe = Number(severity || 1);
  if (safe >= 4) return HEATMAP_COLORS.critical;
  if (safe >= 3) return HEATMAP_COLORS.high;
  if (safe >= 2) return HEATMAP_COLORS.medium;
  return HEATMAP_COLORS.low;
};

const getDotIcon = (severity) => {
  const safe = Math.min(5, Math.max(1, Number(severity || 1)));
  const size = 10 + safe * 2; // 12-20px
  const color = getSeverityColor(safe);
  const key = `${safe}-${size}-${color}`;
  if (DOT_ICON_CACHE.has(key)) return DOT_ICON_CACHE.get(key);

  const icon = L.divIcon({
    className: 'issue-dot-marker-wrap',
    html: `<span class="issue-dot-marker" style="--dot-size:${size}px;--dot-color:${color};"></span>`,
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2],
  });
  DOT_ICON_CACHE.set(key, icon);
  return icon;
};

const resolveLatLng = (point, fallback = DEFAULT_CENTER) => {
  const coords = Array.isArray(point?.coordinates) ? point.coordinates : null;
  const directLat = Number(point?.lat);
  const directLng = Number(point?.lng);

  const candidates = [];
  if (Number.isFinite(directLat) && Number.isFinite(directLng)) {
    candidates.push({ lat: directLat, lng: directLng });
  }

  if (coords && coords.length >= 2) {
    const aLat = Number(coords[1]);
    const aLng = Number(coords[0]);
    if (Number.isFinite(aLat) && Number.isFinite(aLng)) {
      candidates.push({ lat: aLat, lng: aLng });
    }
    const bLat = Number(coords[0]);
    const bLng = Number(coords[1]);
    if (Number.isFinite(bLat) && Number.isFinite(bLng)) {
      candidates.push({ lat: bLat, lng: bLng });
    }
  }

  if (candidates.length === 0) {
    return { lat: fallback[0], lng: fallback[1] };
  }

  const [refLat, refLng] = fallback;
  let best = candidates[0];
  let bestDist = (best.lat - refLat) ** 2 + (best.lng - refLng) ** 2;
  for (let i = 1; i < candidates.length; i += 1) {
    const cand = candidates[i];
    const dist = (cand.lat - refLat) ** 2 + (cand.lng - refLng) ** 2;
    if (dist < bestDist) {
      best = cand;
      bestDist = dist;
    }
  }
  return best;
};

function MapFocus({ active }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    map.flyTo([active.lat, active.lng], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.7,
    });
  }, [active, map]);

  return null;
}

function MapAutoFit({ points, active }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) return;
    if (active) return;
    if (points.length === 1) return;
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }, [map, points, active]);

  return null;
}

function MapRecenterControl({ focusPoints, active }) {
  const map = useMap();

  useEffect(() => {
    const control = L.control({ position: 'topleft' });
    control.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
      const button = L.DomUtil.create('button', 'leaflet-control-recenter', container);
      button.type = 'button';
      button.title = 'Recenter map';
      button.innerHTML = '📍';
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, 'click', () => {
        if (active) {
          map.flyTo([active.lat, active.lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.6 });
          return;
        }
        if (Array.isArray(focusPoints) && focusPoints.length > 0) {
          const bounds = L.latLngBounds(focusPoints.map((point) => [point.lat, point.lng]));
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
        }
      });
      return container;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, active, focusPoints]);

  return null;
}

function MapZoomIndicator({ maxZoom }) {
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
}

function IssueMarkers({ points, onSelect }) {
  const map = useMap();

  return points.map((point, index) => (
    <Marker
      key={`pin-${point.id || index}`}
      position={[point.lat, point.lng]}
      icon={ISSUE_MARKER_ICON}
      eventHandlers={{
        click: () => {
          map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.6 });
          onSelect?.(point.id);
        },
      }}
    >
      {point.title && (
        <Popup>
          <strong>{point.title}</strong>
          <br />
          {point.locationText}
          <br />
          {point.category} | {point.status}
        </Popup>
      )}
    </Marker>
  ));
}

const MAX_NATIVE_ZOOM = 19;
const MAX_LEAFLET_ZOOM = MAX_NATIVE_ZOOM;
const ZOOM_SNAP = 0.25;
const ZOOM_DELTA = 0.5;

const IssueLeafletMap = ({
  issues = [],
  heatmapData = [],
  activeId = '',
  activeIssue = null,
  onSelect,
  className = 'issue-leaflet-map',
  zoom = 11,
  scrollWheelZoom = true,
  showZoomControl = true,
  showAttribution = true,
  maxZoom = MAX_LEAFLET_ZOOM,
  showRecenter = true,
  showMarkers = true,
  dotMode = false,
  showHeatmap = false,
}) => {
  const resolvedMaxZoom = Math.min(
    Number.isFinite(Number(maxZoom)) ? Number(maxZoom) : MAX_LEAFLET_ZOOM,
    MAX_LEAFLET_ZOOM
  );
  const resolvedZoom = Math.min(
    Number.isFinite(Number(zoom)) ? Number(zoom) : resolvedMaxZoom,
    resolvedMaxZoom
  );
  const safeIssues = (Array.isArray(issues) ? issues : [])
    .map((point) => {
      const resolved = resolveLatLng(point);
      const lat = Number(resolved?.lat);
      const lng = Number(resolved?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const weight = Number(point?.weight ?? point?.priority ?? 1);
      return { ...point, lat, lng, weight: Number.isFinite(weight) ? weight : 1 };
    })
    .filter(Boolean);

  const safeHeatmap = (Array.isArray(heatmapData) ? heatmapData : [])
    .map((point) => {
      const resolved = resolveLatLng(point);
      const lat = Number(resolved?.lat);
      const lng = Number(resolved?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const weight = Number(point?.weight ?? point?.count ?? 1);
      return { ...point, lat, lng, weight: Number.isFinite(weight) ? weight : 1 };
    })
    .filter(Boolean);

  const data = dotMode
    ? safeIssues.length > 0
      ? safeIssues
      : safeHeatmap
    : safeHeatmap.length > 0
      ? safeHeatmap
      : safeIssues;
  const maxDensity = data.reduce((max, point) => {
    const value = Number(point.count ?? point.weight ?? 1);
    return Math.max(max, Number.isFinite(value) ? value : 1);
  }, 1);
  const maxSeverity = 5;
  const resolvedActiveIssue = (() => {
    if (!activeIssue) return null;
    const lat = Number(activeIssue?.lat);
    const lng = Number(activeIssue?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { ...activeIssue, lat, lng };
  })();
  const active =
    resolvedActiveIssue ||
    (activeId
      ? data.find((item) => String(item?.id ?? '') === String(activeId)) || null
      : null);
  const fallback = !active ? data[0] || null : null;
  const center = active
    ? [active.lat, active.lng]
    : fallback
      ? [fallback.lat, fallback.lng]
      : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={resolvedZoom}
      scrollWheelZoom={scrollWheelZoom}
      className={className}
      preferCanvas={!dotMode}
      zoomControl={showZoomControl}
      attributionControl={showAttribution}
      maxZoom={resolvedMaxZoom}
      zoomSnap={ZOOM_SNAP}
      zoomDelta={ZOOM_DELTA}
    >
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={TILE_URL}
        maxZoom={resolvedMaxZoom}
        maxNativeZoom={MAX_NATIVE_ZOOM}
        detectRetina={false}
      />

      <MapFocus active={active} />
      <MapAutoFit points={data} active={active} />
      {showRecenter && <MapRecenterControl focusPoints={data} active={active} />}
      <MapZoomIndicator maxZoom={resolvedMaxZoom} />

      {dotMode
        ? data.map((point, index) => {
            const severityValue = Number(
              point.severity ?? point.priority ?? point.avgSeverity ?? point.maxSeverity ?? point.weight ?? 1
            );
            return (
              <Marker
                key={point.id || index}
                position={[point.lat, point.lng]}
                icon={getDotIcon(severityValue)}
                interactive={false}
              />
            );
          })
        : showHeatmap
        ? data.map((point, index) => {
            const severityValue = Number(
              point.severity ?? point.priority ?? point.avgSeverity ?? point.maxSeverity ?? point.weight ?? 1
            );
            const severityRatio = Math.max(0.05, Math.min(1, severityValue / maxSeverity));
            const densityValue = Number(point.count ?? point.weight ?? 1);
            const densityRatio = maxDensity > 0
              ? Math.max(0.05, Math.min(1, densityValue / maxDensity))
              : 0.4;
            const opacity = Math.min(0.95, 0.35 + severityRatio * 0.6);
            const color = getSeverityColor(severityValue);
            const fillOpacity = Math.min(0.9, 0.25 + severityRatio * 0.7);
            const radius = Math.max(8, Math.min(28, 8 + densityRatio * 20));
            return (
              <CircleMarker
                key={point.id || index}
                center={[point.lat, point.lng]}
                pathOptions={{
                  color,
                  fillColor: color,
                  opacity,
                  fillOpacity,
                  weight: 0.6,
                }}
                radius={radius}
              />
            );
          })
        : null}
      {showMarkers && <IssueMarkers points={data} onSelect={onSelect} />}
    </MapContainer>
  );
};

export default IssueLeafletMap;
