import React from 'react';

interface SwipeControlsProps {
  onUndo: () => void;
  onAlreadyWatched: () => void;
  onSkip: () => void;
  canUndo: boolean;
  isProcessing: boolean;
}

const SwipeControls: React.FC<SwipeControlsProps> = ({
  onUndo,
  onAlreadyWatched,
  onSkip,
  canUndo,
  isProcessing,
}) => {
  const buttonBase = 'flex items-center justify-center rounded-full transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || isProcessing}
        className={`${buttonBase} w-12 h-12 bg-slate-700 hover:bg-slate-600 text-yellow-400 border border-slate-600`}
        aria-label="Undo last action"
        title="Undo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      </button>

      {/* Already Watched */}
      <button
        onClick={onAlreadyWatched}
        disabled={isProcessing}
        className={`${buttonBase} px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm border border-purple-500`}
        aria-label="Mark as already watched and rate"
        title="Already Watched"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        Already Watched
      </button>

      {/* Skip */}
      <button
        onClick={onSkip}
        disabled={isProcessing}
        className={`${buttonBase} w-12 h-12 bg-slate-700 hover:bg-slate-500 text-slate-400 hover:text-white border border-slate-600`}
        aria-label="Skip movie"
        title="Skip"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

export default SwipeControls;
