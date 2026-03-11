import { useMemo, useState } from 'react';
import { DEFAULT_PLACEHOLDER_IMAGE, resolveMediaUrl } from '@/utils/mediaUrl';
import './SafeImage.css';

const SafeImage = ({
  src,
  alt,
  className = '',
  style,
  fallbackSrc,
  showSkeleton = false,
  ...imgProps
}) => {
  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src]);
  const resolvedFallback = useMemo(
    () => resolveMediaUrl(fallbackSrc) || DEFAULT_PLACEHOLDER_IMAGE,
    [fallbackSrc]
  );
  const [failedFor, setFailedFor] = useState('');
  const [loadedFor, setLoadedFor] = useState('');

  const currentSrc = !resolvedSrc || failedFor === resolvedSrc ? resolvedFallback : resolvedSrc;
  const loaded = loadedFor === currentSrc;

  return (
    <span className={`safe-image ${showSkeleton ? 'safe-image--skeleton' : ''} ${className}`} style={style}>
      {showSkeleton && !loaded ? <span className="safe-image__skeleton" aria-hidden="true" /> : null}
      <img
        {...imgProps}
        className="safe-image__img"
        src={currentSrc}
        alt={alt || 'Image'}
        loading={imgProps.loading || 'lazy'}
        onLoad={(e) => {
          setLoadedFor(currentSrc);
          imgProps.onLoad?.(e);
        }}
        onError={(e) => {
          if (currentSrc !== resolvedFallback) setFailedFor(resolvedSrc || '__missing__');
          imgProps.onError?.(e);
        }}
      />
    </span>
  );
};

export default SafeImage;
