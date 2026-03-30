import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const MapAutoSizer = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return undefined;
    const container = map.getContainer();
    let frame = null;

    const invalidate = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    invalidate();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(invalidate);
      observer.observe(container);
      return () => {
        observer.disconnect();
        if (frame) cancelAnimationFrame(frame);
      };
    }

    window.addEventListener('resize', invalidate);
    return () => {
      window.removeEventListener('resize', invalidate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
};

export default MapAutoSizer;
