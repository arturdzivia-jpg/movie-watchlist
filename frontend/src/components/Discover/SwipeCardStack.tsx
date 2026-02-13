import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DiscoverMovie } from '../../services/api';
import { SwipeDirection } from '../../types/discover';
import SwipeCard from './SwipeCard';

interface SwipeCardStackProps {
  cards: DiscoverMovie[];
  onSwipe: (direction: SwipeDirection, movie: DiscoverMovie) => void;
  onCardLeftScreen: (movie: DiscoverMovie) => void;
  isProcessing: boolean;
}

const SWIPE_THRESHOLD = 100;
const SWIPE_OUT_DURATION = 300;

const SwipeCardStack: React.FC<SwipeCardStackProps> = ({
  cards,
  onSwipe,
  onCardLeftScreen,
  isProcessing,
}) => {
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [swipingOut, setSwipingOut] = useState<{ direction: SwipeDirection; movie: DiscoverMovie } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Only show top 3 cards for performance
  const visibleCards = cards.slice(0, 3);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (isProcessing || swipingOut) return;
    setDragState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: 0,
      currentY: 0,
    });
  }, [isProcessing, swipingOut]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;
    setDragState(prev => ({
      ...prev,
      currentX: clientX - prev.startX,
      currentY: clientY - prev.startY,
    }));
  }, [dragState.isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || cards.length === 0) return;

    const { currentX, currentY } = dragState;
    let direction: SwipeDirection | null = null;

    // Horizontal swipes (left/right) and down for skip
    if (currentX > SWIPE_THRESHOLD) {
      direction = 'right';
    } else if (currentX < -SWIPE_THRESHOLD) {
      direction = 'left';
    } else if (currentY > SWIPE_THRESHOLD) {
      direction = 'down';
    }

    if (direction) {
      const movie = cards[0];
      setSwipingOut({ direction, movie });
      onSwipe(direction, movie);

      setTimeout(() => {
        onCardLeftScreen(movie);
        setSwipingOut(null);
      }, SWIPE_OUT_DURATION);
    }

    setDragState({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [dragState, cards, onSwipe, onCardLeftScreen]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Global event listeners
  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Programmatic swipe function for button controls
  const triggerSwipe = useCallback((direction: SwipeDirection) => {
    if (cards.length === 0 || isProcessing || swipingOut) return;

    const movie = cards[0];
    setSwipingOut({ direction, movie });
    onSwipe(direction, movie);

    setTimeout(() => {
      onCardLeftScreen(movie);
      setSwipingOut(null);
    }, SWIPE_OUT_DURATION);
  }, [cards, isProcessing, swipingOut, onSwipe, onCardLeftScreen]);

  // Expose triggerSwipe to parent via window
  useEffect(() => {
    (window as any).__triggerSwipe = triggerSwipe;
    return () => {
      delete (window as any).__triggerSwipe;
    };
  }, [triggerSwipe]);

  if (cards.length === 0) {
    return null;
  }

  // Calculate swipe out transform
  const getSwipeOutTransform = (direction: SwipeDirection) => {
    switch (direction) {
      case 'left':
        return 'translateX(-150%) rotate(-30deg)';
      case 'right':
        return 'translateX(150%) rotate(30deg)';
      case 'down':
        return 'translateY(150%) rotate(0deg)';
      default:
        return '';
    }
  };

  // Determine overlay based on drag position
  const getOverlay = () => {
    const { currentX, currentY } = dragState;
    if (Math.abs(currentX) > 30 || currentY > 30) {
      if (currentX > 50) {
        return { text: 'WANT TO WATCH', color: 'bg-blue-500/40', textColor: 'text-blue-400', borderColor: 'border-blue-400' };
      } else if (currentX < -50) {
        return { text: 'NOT INTERESTED', color: 'bg-slate-500/40', textColor: 'text-slate-300', borderColor: 'border-slate-400' };
      } else if (currentY > 50) {
        return { text: 'SKIP', color: 'bg-slate-500/40', textColor: 'text-slate-300', borderColor: 'border-slate-400' };
      }
    }
    return null;
  };

  const overlay = getOverlay();

  return (
    <div className="relative w-full max-w-sm mx-auto h-[65vh] sm:h-[70vh] max-h-[500px] min-h-[380px]">
      {visibleCards.map((movie, index) => {
        const isTopCard = index === 0;
        const stackOffset = index * 4;
        const stackScale = 1 - index * 0.03;

        const isSwipingOut = swipingOut?.movie.id === movie.id;

        let transform = `translateY(${stackOffset}px) scale(${stackScale})`;
        let transition = 'transform 0.1s ease-out';

        if (isTopCard) {
          if (isSwipingOut && swipingOut) {
            // Animate card flying out
            transform = getSwipeOutTransform(swipingOut.direction);
            transition = `transform ${SWIPE_OUT_DURATION}ms ease-out`;
          } else if (dragState.isDragging) {
            // Follow drag position
            const rotation = dragState.currentX * 0.05;
            transform = `translate(${dragState.currentX}px, ${dragState.currentY}px) rotate(${rotation}deg)`;
            transition = 'none';
          } else {
            // Default position for top card
            transform = 'translate(0, 0) rotate(0deg)';
          }
        }

        return (
          <div
            key={movie.id}
            ref={isTopCard ? cardRef : undefined}
            className="absolute w-full touch-none select-none"
            style={{
              zIndex: visibleCards.length - index,
              transform,
              transition,
              transformOrigin: 'bottom center',
              height: '100%',
              cursor: isTopCard ? 'grab' : 'default',
            }}
            onMouseDown={isTopCard ? handleMouseDown : undefined}
            onTouchStart={isTopCard ? handleTouchStart : undefined}
          >
            <SwipeCard movie={movie} />

            {/* Swipe overlay */}
            {isTopCard && overlay && (
              <div className={`absolute inset-0 rounded-2xl ${overlay.color} pointer-events-none flex items-center justify-center`}>
                <div className={`${overlay.textColor} ${overlay.borderColor} border-4 rounded-lg px-6 py-3 font-bold text-3xl transform -rotate-12`}>
                  {overlay.text}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SwipeCardStack;
