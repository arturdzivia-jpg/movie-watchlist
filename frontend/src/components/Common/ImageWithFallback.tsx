import React, { useState, memo } from 'react';

export type ImageType = 'poster' | 'backdrop' | 'profile';

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  type: ImageType;
  className?: string;
  onClick?: () => void;
}

/**
 * TMDB image base URLs for different image types
 */
const TMDB_IMAGE_URLS: Record<ImageType, string> = {
  poster: 'https://image.tmdb.org/t/p/w500',
  backdrop: 'https://image.tmdb.org/t/p/w1280',
  profile: 'https://image.tmdb.org/t/p/w185'
};

/**
 * SVG fallback images for different types
 */
const FALLBACK_SVGS: Record<ImageType, string> = {
  poster: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23334155" width="300" height="450"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E',
  backdrop: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"%3E%3Crect fill="%23334155" width="1280" height="720"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="48" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E',
  profile: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="185" height="278"%3E%3Crect fill="%23334155" width="185" height="278"/%3E%3Cpath fill="%23cbd5e1" d="M92.5 92.5c13.8 0 25-11.2 25-25s-11.2-25-25-25-25 11.2-25 25 11.2 25 25 25zm0 12.5c-16.7 0-50 8.4-50 25v12.5h100V130c0-16.6-33.3-25-50-25z"/%3E%3C/svg%3E'
};

/**
 * Build the full TMDB image URL
 */
export function getTmdbImageUrl(path: string | null | undefined, type: ImageType): string {
  if (!path) return FALLBACK_SVGS[type];
  return `${TMDB_IMAGE_URLS[type]}${path}`;
}

/**
 * Get fallback SVG for an image type
 */
export function getFallbackImage(type: ImageType): string {
  return FALLBACK_SVGS[type];
}

/**
 * Image component with automatic TMDB URL building and fallback handling
 */
const ImageWithFallback: React.FC<ImageWithFallbackProps> = memo(({
  src,
  alt,
  type,
  className = '',
  onClick
}) => {
  const [hasError, setHasError] = useState(false);

  const imageUrl = hasError || !src
    ? FALLBACK_SVGS[type]
    : `${TMDB_IMAGE_URLS[type]}${src}`;

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
    }
  };

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={handleError}
    />
  );
});

ImageWithFallback.displayName = 'ImageWithFallback';

export default ImageWithFallback;
