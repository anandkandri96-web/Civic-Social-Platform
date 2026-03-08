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
  activeId = '',
  onSelect,
  className = 'issue-leaflet-map',
  zoom = 11,
}) => {
  const active = issues.find((item) => item.id === activeId) || issues[0] || null;
  const center = active ? [active.lat, active.lng] : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapFocus active={active} />

      {issues.map((point) => {
        const color = PRIORITY_COLORS[Number(point.priority)] || '#00c8f8';
        return (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: active?.id === point.id ? 0.9 : 0.65,
              weight: active?.id === point.id ? 2 : 1,
            }}
            radius={active?.id === point.id ? 9 : 7}
            eventHandlers={{ click: () => onSelect?.(point.id) }}
          >
            <Popup>
              <strong>{point.title}</strong>
              <br />
              {point.locationText}
              <br />
              {point.category} | {point.status}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default IssueLeafletMap;