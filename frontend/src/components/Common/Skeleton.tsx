import React from 'react';

interface SkeletonProps {
  className?: string;
}

// Base skeleton with pulse animation
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-700 rounded ${className}`} />
);

// Movie card skeleton for grid views
export const MovieCardSkeleton: React.FC = () => (
  <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
    <Skeleton className="aspect-[2/3] rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  </div>
);

// Watchlist item skeleton for list views
export const WatchlistItemSkeleton: React.FC = () => (
  <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex">
    <Skeleton className="w-24 sm:w-32 h-36 sm:h-48 flex-shrink-0 rounded-none" />
    <div className="p-4 flex-1 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-16 rounded" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-10 rounded" />
        <Skeleton className="h-9 w-10 rounded" />
        <Skeleton className="h-9 w-10 rounded" />
        <Skeleton className="h-9 w-10 rounded" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-20 rounded" />
      </div>
    </div>
  </div>
);

// User movie card skeleton (list view)
export const UserMovieCardSkeleton: React.FC = () => (
  <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex">
    <Skeleton className="w-24 sm:w-32 h-36 sm:h-48 flex-shrink-0 rounded-none" />
    <div className="p-4 flex-1 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-28 rounded" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  </div>
);

// User movie grid card skeleton
export const UserMovieGridCardSkeleton: React.FC = () => (
  <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
    <Skeleton className="aspect-[2/3] rounded-none" />
  </div>
);

// Dashboard stat card skeleton
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  </div>
);

// Rating distribution skeleton
export const RatingDistributionSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Skeleton className="flex-1 sm:flex-none sm:w-48 md:w-64 h-4 rounded-full" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    ))}
  </div>
);

// Preferences section skeleton
export const PreferencesSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-7 w-32 rounded-full" />
    </div>
    {[1, 2, 3].map((i) => (
      <div key={i}>
        <Skeleton className="h-4 w-32 mb-2" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
