import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const PRIORITY_COLORS = {
  5: '#ff4560',
  4: '#ff7a35',
  3: '#ffd166',
  2: '#00c8f8',
  1: '#00e5a0',
};

const DEFAULT_CENTER = [12.7096, 77.6958];

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

const IssueLeafletMap = ({
  issues = [],
  heatmapData = [],
  activeId = '',
  onSelect,
  className = 'issue-leaflet-map',
  zoom = 11,
  scrollWheelZoom = true,
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

  const active = safeIssues.find((item) => item.id === activeId) || safeIssues[0] || null;
  const center = active ? [active.lat, active.lng] : DEFAULT_CENTER;

  // If heatmapData is provided, use it for heat intensity; otherwise render issue points.
  const data = safeHeatmap.length > 0 ? safeHeatmap : safeIssues;

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={scrollWheelZoom} className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapFocus active={active} />

      {data.map((point, index) => {
        const intensity = Math.max(0, Math.min(1, Number(point.weight || 1) / 10)); // Normalize to 0-1
        const color = `rgba(255, 0, 0, ${intensity})`; // Red with opacity
        return (
          <CircleMarker
            key={point.id || index}
            center={[point.lat, point.lng]}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: intensity,
              weight: 1,
            }}
            radius={Math.max(5, Number(point.weight || 1))}
            eventHandlers={onSelect ? { click: () => onSelect?.(point.id) } : {}}
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
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default IssueLeafletMap;
