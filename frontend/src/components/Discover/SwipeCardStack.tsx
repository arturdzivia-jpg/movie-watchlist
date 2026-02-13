import React, { useRef, useEffect, useCallback } from 'react';
import TinderCard from 'react-tinder-card';
import { Recommendation } from '../../services/api';
import { SwipeDirection } from '../../types/discover';
import SwipeCard from './SwipeCard';

interface SwipeCardStackProps {
  cards: Recommendation[];
  onSwipe: (direction: SwipeDirection, movie: Recommendation) => void;
  onCardLeftScreen: (movie: Recommendation) => void;
  isProcessing: boolean;
}

interface CardRef {
  swipe: (dir: 'left' | 'right' | 'up' | 'down') => Promise<void>;
  restoreCard: () => Promise<void>;
}

const SwipeCardStack: React.FC<SwipeCardStackProps> = ({
  cards,
  onSwipe,
  onCardLeftScreen,
  isProcessing,
}) => {
  const cardRefs = useRef<Map<number, CardRef>>(new Map());

  // Only show top 3 cards for performance
  const visibleCards = cards.slice(0, 3);

  const handleSwipe = useCallback(
    (direction: string, movie: Recommendation) => {
      if (direction === 'left' || direction === 'right' || direction === 'up') {
        onSwipe(direction as SwipeDirection, movie);
      }
    },
    [onSwipe]
  );

  const handleCardLeftScreen = useCallback(
    (movie: Recommendation) => {
      onCardLeftScreen(movie);
    },
    [onCardLeftScreen]
  );

  // Programmatic swipe function for button controls
  const triggerSwipe = useCallback(
    async (direction: SwipeDirection) => {
      if (cards.length === 0 || isProcessing) return;

      const topCard = cards[0];
      const cardRef = cardRefs.current.get(topCard.id);
      if (cardRef) {
        await cardRef.swipe(direction);
      }
    },
    [cards, isProcessing]
  );

  // Expose triggerSwipe to parent via callback
  useEffect(() => {
    (window as any).__triggerSwipe = triggerSwipe;
    return () => {
      delete (window as any).__triggerSwipe;
    };
  }, [triggerSwipe]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ height: '500px' }}>
      {visibleCards.map((movie, index) => {
        const isTopCard = index === 0;
        const stackOffset = index * 4;
        const stackScale = 1 - index * 0.03;

        return (
          <div
            key={movie.id}
            className="absolute w-full"
            style={{
              zIndex: visibleCards.length - index,
              transform: `translateY(${stackOffset}px) scale(${stackScale})`,
              transformOrigin: 'bottom center',
              height: '500px',
            }}
          >
            <TinderCard
              ref={(ref: CardRef | null) => {
                if (ref) {
                  cardRefs.current.set(movie.id, ref);
                } else {
                  cardRefs.current.delete(movie.id);
                }
              }}
              onSwipe={(dir) => handleSwipe(dir, movie)}
              onCardLeftScreen={() => handleCardLeftScreen(movie)}
              preventSwipe={isProcessing ? ['left', 'right', 'up', 'down'] : ['down']}
              swipeRequirementType="position"
              swipeThreshold={100}
              className="w-full h-full"
            >
              <div className="relative w-full h-full">
                <SwipeCard movie={movie} />
                {isTopCard && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Swipe overlay will be shown via CSS on swipe */}
                  </div>
                )}
              </div>
            </TinderCard>
          </div>
        );
      })}
    </div>
  );
};

export default SwipeCardStack;
