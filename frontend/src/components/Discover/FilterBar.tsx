import React from 'react';
import { TMDB_GENRES, MOVIE_STYLES, MovieStyle } from '../../constants/genres';

interface FilterBarProps {
  selectedGenre: number | null;
  selectedStyle: MovieStyle;
  onGenreChange: (genre: number | null) => void;
  onStyleChange: (style: MovieStyle) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  selectedGenre,
  selectedStyle,
  onGenreChange,
  onStyleChange
}) => {
  const hasActiveFilters = selectedGenre !== null || selectedStyle !== 'all';

  const clearFilters = () => {
    onGenreChange(null);
    onStyleChange('all');
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
        {/* Genre dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <label htmlFor="genre-filter" className="text-slate-300 text-sm font-medium">
            Genre:
          </label>
          <select
            id="genre-filter"
            value={selectedGenre ?? ''}
            onChange={(e) => onGenreChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full sm:w-auto bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
          >
            <option value="">All Genres</option>
            {TMDB_GENRES.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        {/* Style toggle buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <span className="text-slate-300 text-sm font-medium whitespace-nowrap">Style:</span>
          <div className="flex bg-slate-700 rounded-lg p-1 border border-slate-600">
            {MOVIE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onStyleChange(style.id)}
                title={style.description}
                className={`px-3 py-2 sm:py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] sm:min-h-0 ${
                  selectedStyle === style.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 sm:py-1.5 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 w-full sm:w-auto bg-slate-700 sm:bg-transparent rounded-lg sm:rounded-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedGenre && (
            <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs border border-blue-600/30">
              {TMDB_GENRES.find(g => g.id === selectedGenre)?.name}
            </span>
          )}
          {selectedStyle !== 'all' && (
            <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs border border-purple-600/30">
              {MOVIE_STYLES.find(s => s.id === selectedStyle)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
