import React from 'react';
import { SwipeDirection } from '../../types/discover';

interface SwipeOverlayProps {
  direction: SwipeDirection | null;
  progress: number; // 0 to 1
}

const SwipeOverlay: React.FC<SwipeOverlayProps> = ({ direction, progress }) => {
  if (!direction || progress === 0) return null;

  const overlayConfig: Record<SwipeDirection, { bg: string; border: string; icon: string; text: string; textColor: string; position: string }> = {
    left: {
      bg: 'bg-slate-500/30',
      border: 'border-slate-400',
      icon: '&#10060;', // X mark
      text: 'NOT INTERESTED',
      textColor: 'text-slate-300',
      position: 'left-4 top-1/2 -translate-y-1/2',
    },
    right: {
      bg: 'bg-blue-500/30',
      border: 'border-blue-400',
      icon: '&#128278;', // bookmark
      text: 'WANT TO WATCH',
      textColor: 'text-blue-400',
      position: 'right-4 top-1/2 -translate-y-1/2',
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
