import React from 'react';
import { SwipeDirection } from '../../types/discover';

interface SwipeOverlayProps {
  direction: SwipeDirection | null;
  progress: number; // 0 to 1
}

const SwipeOverlay: React.FC<SwipeOverlayProps> = ({ direction, progress }) => {
  if (!direction || progress === 0) return null;

  const overlayConfig = {
    left: {
      bg: 'bg-red-500/30',
      border: 'border-red-500',
      icon: '&#128078;', // thumbs down
      text: 'NOPE',
      textColor: 'text-red-500',
      position: 'left-4 top-1/2 -translate-y-1/2',
    },
    right: {
      bg: 'bg-green-500/30',
      border: 'border-green-500',
      icon: '&#128077;', // thumbs up
      text: 'LIKE',
      textColor: 'text-green-500',
      position: 'right-4 top-1/2 -translate-y-1/2',
    },
    up: {
      bg: 'bg-blue-500/30',
      border: 'border-blue-500',
      icon: '&#128278;', // bookmark
      text: 'WATCHLIST',
      textColor: 'text-blue-500',
      position: 'top-4 left-1/2 -translate-x-1/2',
    },
  };

  const config = overlayConfig[direction];
  const opacity = Math.min(progress * 2, 1);

  return (
    <div
      className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity ${config.bg}`}
      style={{ opacity: opacity * 0.5 }}
    >
      <div
        className={`absolute ${config.position} ${config.textColor} ${config.border} border-4 rounded-lg px-4 py-2 font-bold text-2xl transform rotate-[-15deg]`}
        style={{ opacity }}
      >
        <span dangerouslySetInnerHTML={{ __html: config.icon }} />{' '}
        {config.text}
      </div>
    </div>
  );
};

export default SwipeOverlay;
