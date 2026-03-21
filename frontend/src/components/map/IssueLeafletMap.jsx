import { useEffect } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const HEATMAP_COLORS = {
  low: '#6FCF97',
  mid: '#F2B933',
  high: '#F27C54',
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
  maxZoom = 20,
  showRecenter = true,
}) => {
  const safeIssues = (Array.isArray(issues) ? issues : [])
    .map((point) => {
      const lat = Number(point?.lat);
      const lng = Number(point?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const weight = Number(point?.weight ?? point?.priority ?? 1);
      return { ...point, lat, lng, weight: Number.isFinite(weight) ? weight : 1 };
    })
    .filter(Boolean);

  const safeHeatmap = (Array.isArray(heatmapData) ? heatmapData : [])
    .map((point) => {
      const lat = Number(point?.lat);
      const lng = Number(point?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const weight = Number(point?.weight ?? point?.count ?? 1);
      return { ...point, lat, lng, weight: Number.isFinite(weight) ? weight : 1 };
    })
    .filter(Boolean);

  const data = safeHeatmap.length > 0 ? safeHeatmap : safeIssues;
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

  const getHeatColor = (severity) => {
    const safe = Number(severity || 1);
    if (safe >= 4) return HEATMAP_COLORS.high;
    if (safe >= 3) return HEATMAP_COLORS.mid;
    return HEATMAP_COLORS.low;
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      className={className}
      preferCanvas
      zoomControl={showZoomControl}
      attributionControl={showAttribution}
      maxZoom={maxZoom}
    >
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={TILE_URL}
        maxZoom={maxZoom}
        detectRetina
      />

      <MapFocus active={active} />
      <MapAutoFit points={data} active={active} />
      {showRecenter && <MapRecenterControl focusPoints={data} active={active} />}

      {data.map((point, index) => {
        const severityValue = Number(point.severity ?? point.avgSeverity ?? point.maxSeverity ?? point.weight ?? 1);
        const severityRatio = Math.max(0.05, Math.min(1, severityValue / maxSeverity));
        const densityValue = Number(point.count ?? point.weight ?? 1);
        const densityRatio = maxDensity > 0
          ? Math.max(0.05, Math.min(1, densityValue / maxDensity))
          : 0.4;
        const opacity = Math.min(0.95, 0.2 + severityRatio);
        const color = getHeatColor(severityValue);
        return (
          <CircleMarker
            key={point.id || index}
            center={[point.lat, point.lng]}
            pathOptions={{
              color,
              fillColor: color,
              opacity,
              fillOpacity: Math.min(0.85, severityRatio),
              weight: 1,
            }}
            radius={Math.max(6, Math.min(24, 6 + densityRatio * 18))}
            interactive={false}
          >
          </CircleMarker>
        );
      })}
      <IssueMarkers points={data} onSelect={onSelect} />
    </MapContainer>
  );
};

export default IssueLeafletMap;
