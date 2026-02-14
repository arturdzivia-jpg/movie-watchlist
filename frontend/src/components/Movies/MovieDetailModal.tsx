import React, { useState, useEffect, useCallback, memo } from 'react';
import { TMDBMovie, Movie, Rating, moviesAPI, CastMember } from '../../services/api';
import { MetadataLink } from '../Common';
import { RATING_BUTTONS } from '../../constants/ratings';

interface MovieDetailModalProps {
  movie: TMDBMovie | Movie;
  tmdbId?: number;
  userRating?: Rating | null;
  isInWatchlist?: boolean;
  onClose: () => void;
  onRate?: (rating: Rating) => void;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
  onUpdateRating?: (rating: Rating) => void;
  onDelete?: () => void;
  isProcessing?: boolean;
}

// Helper functions to normalize TMDBMovie vs Movie data
const isTMDBMovie = (movie: TMDBMovie | Movie): movie is TMDBMovie => {
  return 'poster_path' in movie;
};

const getYear = (movie: TMDBMovie | Movie): string => {
  const date = isTMDBMovie(movie) ? movie.release_date : movie.releaseDate;
  return date ? new Date(date).getFullYear().toString() : 'N/A';
};

const getPosterUrl = (movie: TMDBMovie | Movie): string => {
  const path = isTMDBMovie(movie) ? movie.poster_path : movie.posterPath;
  return path ? `https://image.tmdb.org/t/p/w500${path}` : '';
};

const getBackdropUrl = (movie: TMDBMovie | Movie): string => {
  const path = isTMDBMovie(movie) ? movie.backdrop_path : (movie as Movie).backdropPath;
  return path ? `https://image.tmdb.org/t/p/w1280${path}` : '';
};

const getOverview = (movie: TMDBMovie | Movie): string => {
  return movie.overview || 'No overview available.';
};

const getVoteAverage = (movie: TMDBMovie | Movie): number => {
  return isTMDBMovie(movie) ? movie.vote_average : 0;
};

const getTmdbId = (movie: TMDBMovie | Movie): number => {
  return isTMDBMovie(movie) ? movie.id : movie.tmdbId;
};

// Use shared rating button configuration
const ratingButtons = RATING_BUTTONS;

// Person placeholder SVG for missing profile photos
const PersonPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

// Play button SVG for trailer
const PlayButton: React.FC = () => (
  <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  </div>
);

const MovieDetailModal: React.FC<MovieDetailModalProps> = memo(({
  movie,
  tmdbId,
  userRating,
  isInWatchlist,
  onClose,
  onRate,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onUpdateRating,
  onDelete,
  isProcessing = false
}) => {
  const [fullDetails, setFullDetails] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [currentTmdbId, setCurrentTmdbId] = useState<number | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Always fetch fresh details from API to ensure we have complete cast info with photos
  useEffect(() => {
    const fetchDetails = async () => {
      // Use currentTmdbId if set (from similar movie click), otherwise use props
      const id = currentTmdbId || tmdbId || getTmdbId(movie);
      if (id) {
        setIsLoading(true);
        try {
          const response = await moviesAPI.getDetails(id);
          setFullDetails(response.data);
        } catch (error) {
          console.error('Failed to fetch movie details:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchDetails();
  }, [movie, tmdbId, currentTmdbId]);

  // Handle clicking a similar movie
  const handleSimilarMovieClick = (similarTmdbId: number) => {
    setCurrentTmdbId(similarTmdbId);
    setFullDetails(null); // Clear current details to show loading state
    setShowTrailer(false);
    // Scroll to top of modal content
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset trailer state when movie changes
  useEffect(() => {
    setShowTrailer(false);
  }, [movie]);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown]);

  // Check if we're viewing a similar movie (not the original)
  const isViewingSimilarMovie = currentTmdbId !== null;

  // Use full details if available, otherwise fall back to passed movie
  const displayMovie = fullDetails || movie;
  const title = displayMovie.title;
  const year = getYear(displayMovie);
  const posterUrl = getPosterUrl(displayMovie);
  const backdropUrl = fullDetails ? getBackdropUrl(fullDetails) : getBackdropUrl(displayMovie);
  const overview = getOverview(displayMovie);
  const voteAverage = fullDetails ? 0 : getVoteAverage(displayMovie);

  // Full details fields - when viewing similar movie, only use fullDetails (don't fall back to original movie)
  const runtime = fullDetails?.runtime || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? movie.runtime : null);
  const director = fullDetails?.director || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? movie.director : null);
  const directorId = fullDetails?.directorId || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? movie.directorId : null);
  const cast = fullDetails?.cast || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? movie.cast : null);
  const genres = fullDetails?.genres || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? movie.genres : null);
  const productionCompanies = fullDetails?.productionCompanies || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? movie.productionCompanies : null);
  const tagline = fullDetails?.tagline || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? (movie as Movie).tagline : null);
  const trailer = fullDetails?.trailer || (!isViewingSimilarMovie && !isTMDBMovie(movie) ? (movie as Movie).trailer : null);
  const watchProviders = fullDetails?.watchProviders;
  const similarMovies = fullDetails?.similarMovies;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal - Increased size to max-w-4xl */}
      <div
        className="relative bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-black/50 hover:bg-black/70 text-white w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div ref={contentRef} className="overflow-y-auto max-h-[90vh] scrollbar-hide">
          {/* Backdrop Header */}
          {backdropUrl && (
            <div className="relative h-32 sm:h-40 md:h-48">
              <img
                src={backdropUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-slate-800/60 to-transparent" />
            </div>
          )}

          {/* Poster and basic info */}
          <div className={`flex flex-col md:flex-row ${backdropUrl ? '-mt-16 relative z-10' : ''}`}>
            {/* Poster */}
            <div className="w-full md:w-1/3 flex-shrink-0 px-4 sm:px-6 md:px-6">
              <div className="bg-slate-700 rounded-lg overflow-hidden shadow-xl mx-auto md:mx-0" style={{ maxWidth: '200px' }}>
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={`${title} poster`}
                    className="w-full aspect-[2/3] object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23334155" width="300" height="450"/%3E%3Ctext fill="%23cbd5e1" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] flex items-center justify-center text-slate-400">
                    No Image
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 sm:p-6 flex-1 md:pt-16">
              <h2 id="modal-title" className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 pr-8 sm:pr-0">{title}</h2>

              {/* Tagline */}
              {tagline && (
                <p className="text-slate-400 italic text-sm mb-3">"{tagline}"</p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-slate-400 mb-4">
                <span>{year}</span>
                {runtime && <span>{runtime} min</span>}
                {voteAverage > 0 && (
                  <span className="text-yellow-400 flex items-center gap-1">
                    <span>*</span> {voteAverage.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Genres */}
              {genres && genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres.map(g => (
                    <MetadataLink
                      key={g.id}
                      type="genre"
                      id={g.id}
                      name={g.name}
                      onNavigate={onClose}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-1 rounded-full text-sm"
                    />
                  ))}
                </div>
              )}

              {/* Director */}
              {director && (
                <p className="text-slate-400 mb-2">
                  <span className="text-slate-300 font-medium">Director: </span>
                  {directorId ? (
                    <MetadataLink
                      type="director"
                      id={directorId}
                      name={director}
                      onNavigate={onClose}
                      className="text-slate-300 hover:text-blue-400"
                    />
                  ) : (
                    <span>{director}</span>
                  )}
                </p>
              )}

              {/* Studios */}
              {productionCompanies && productionCompanies.length > 0 && (
                <div className="mb-2">
                  <span className="text-slate-300 font-medium">Studios: </span>
                  <span className="text-sm">
                    {productionCompanies.slice(0, 3).map((c, index) => (
                      <span key={c.id}>
                        <MetadataLink
                          type="company"
                          id={c.id}
                          name={c.name}
                          onNavigate={onClose}
                          className="text-slate-300 hover:text-blue-400"
                        />
                        {index < Math.min(productionCompanies.length - 1, 2) && <span className="text-slate-500">, </span>}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {/* Loading indicator for details */}
              {isLoading && (
                <p className="text-slate-500 text-sm">Loading details...</p>
              )}
            </div>
          </div>

          {/* Cast Portraits Section */}
          {cast && cast.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-3">Cast</h3>
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {cast.slice(0, 10).map((actor: CastMember) => (
                  <div key={actor.id} className="flex-shrink-0 text-center w-16 sm:w-20">
                    {/* Portrait */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 rounded-full overflow-hidden bg-slate-700">
                      {actor.profilePath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`}
                          alt={actor.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <PersonPlaceholder className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                      )}
                    </div>
                    {/* Name (clickable) */}
                    <MetadataLink
                      type="actor"
                      id={actor.id}
                      name={actor.name}
                      onNavigate={onClose}
                      className="text-xs sm:text-sm text-slate-300 hover:text-blue-400 line-clamp-1 block"
                    />
                    {/* Character */}
                    <p className="text-xs text-slate-500 line-clamp-1">{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trailer Section */}
          {trailer && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-3">Trailer</h3>
              <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                {showTrailer ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                    title={trailer.name}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="absolute inset-0 w-full h-full flex items-center justify-center group cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <img
                      src={`https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`}
                      alt="Trailer thumbnail"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to hqdefault if maxresdefault not available
                        e.currentTarget.src = `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`;
                      }}
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                    <PlayButton />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Overview */}
          <div className="px-4 sm:px-6 py-4 border-t border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{overview}</p>
          </div>

          {/* Where to Watch Section */}
          {watchProviders && (watchProviders.flatrate.length > 0 || watchProviders.rent.length > 0 || watchProviders.buy.length > 0) && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-3">Where to Watch</h3>
              <div className="space-y-3">
                {/* Streaming */}
                {watchProviders.flatrate.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Stream</p>
                    <div className="flex flex-wrap gap-2">
                      {watchProviders.flatrate.map(provider => (
                        <div
                          key={provider.providerId}
                          className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-lg"
                          title={provider.providerName}
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w45${provider.logoPath}`}
                            alt={provider.providerName}
                            className="w-6 h-6 rounded"
                          />
                          <span className="text-sm text-slate-300">{provider.providerName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rent */}
                {watchProviders.rent.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Rent</p>
                    <div className="flex flex-wrap gap-2">
                      {watchProviders.rent.slice(0, 5).map(provider => (
                        <div
                          key={provider.providerId}
                          className="flex items-center gap-2 bg-slate-700/50 px-2 py-1 rounded"
                          title={provider.providerName}
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w45${provider.logoPath}`}
                            alt={provider.providerName}
                            className="w-5 h-5 rounded"
                          />
                          <span className="text-xs text-slate-400">{provider.providerName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buy */}
                {watchProviders.buy.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Buy</p>
                    <div className="flex flex-wrap gap-2">
                      {watchProviders.buy.slice(0, 5).map(provider => (
                        <div
                          key={provider.providerId}
                          className="flex items-center gap-2 bg-slate-700/50 px-2 py-1 rounded"
                          title={provider.providerName}
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w45${provider.logoPath}`}
                            alt={provider.providerName}
                            className="w-5 h-5 rounded"
                          />
                          <span className="text-xs text-slate-400">{provider.providerName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {watchProviders.link && (
                  <a
                    href={watchProviders.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-blue-400 hover:text-blue-300 mt-2"
                  >
                    View all options on JustWatch &rarr;
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Similar Movies Section */}
          {similarMovies && similarMovies.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-3">Similar Movies</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {similarMovies.map((similar) => (
                  <button
                    key={similar.id}
                    onClick={() => handleSimilarMovieClick(similar.id)}
                    className="flex-shrink-0 w-24 sm:w-28 text-left group"
                  >
                    <div className="bg-slate-700 rounded-lg overflow-hidden aspect-[2/3] group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                      {similar.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${similar.posterPath}`}
                          alt={similar.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="185" height="278"%3E%3Crect fill="%23334155" width="185" height="278"/%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 group-hover:text-blue-400 mt-1 line-clamp-2 transition-colors">{similar.title}</p>
                    {similar.voteAverage > 0 && (
                      <p className="text-xs text-yellow-400">
                        &#9733; {similar.voteAverage.toFixed(1)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 sm:px-6 pb-6 border-t border-slate-700 pt-4">
            {/* Back button when viewing similar movie */}
            {isViewingSimilarMovie && (
              <button
                onClick={() => {
                  setCurrentTmdbId(null);
                  setFullDetails(null);
                  setShowTrailer(false);
                }}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to {movie.title}
              </button>
            )}

            {/* Original movie actions - only show when not viewing similar movie */}
            {!isViewingSimilarMovie && (
              <>
                {/* User has already rated this movie */}
                {userRating && userRating !== 'NOT_INTERESTED' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Your rating:</span>
                      <div className="flex items-center gap-3">
                        <select
                          value={userRating}
                          onChange={(e) => onUpdateRating?.(e.target.value as Rating)}
                          disabled={isProcessing}
                          className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {ratingButtons.map(btn => (
                            <option key={btn.rating} value={btn.rating}>
                              {btn.emoji} {btn.label}
                            </option>
                          ))}
                        </select>
                        {onDelete && (
                          <button
                            onClick={onDelete}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isInWatchlist ? (
                  /* In watchlist - show rating buttons to mark as watched */
                  <div className="space-y-4">
                    <p className="text-slate-400 text-sm">In your watchlist - rate to mark as watched:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ratingButtons.map(btn => (
                        <button
                          key={btn.rating}
                          onClick={() => onRate?.(btn.rating)}
                          disabled={isProcessing}
                          className={`${btn.bgColor} text-white px-3 py-3 sm:py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex flex-col items-center gap-1 min-h-[56px] sm:min-h-[48px]`}
                        >
                          <span className="text-lg">{btn.emoji}</span>
                          <span>{btn.label}</span>
                        </button>
                      ))}
                    </div>
                    {onRemoveFromWatchlist && (
                      <button
                        onClick={onRemoveFromWatchlist}
                        disabled={isProcessing}
                        className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Remove from Watchlist
                      </button>
                    )}
                  </div>
                ) : (
                  /* Not rated, not in watchlist - show all options */
                  <div className="space-y-4">
                    <p className="text-slate-400 text-sm">Rate this movie:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ratingButtons.map(btn => (
                        <button
                          key={btn.rating}
                          onClick={() => onRate?.(btn.rating)}
                          disabled={isProcessing}
                          className={`${btn.bgColor} text-white px-3 py-3 sm:py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex flex-col items-center gap-1 min-h-[56px] sm:min-h-[48px]`}
                        >
                          <span className="text-lg">{btn.emoji}</span>
                          <span>{btn.label}</span>
                        </button>
                      ))}
                    </div>
                    {onAddToWatchlist && (
                      <button
                        onClick={onAddToWatchlist}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        + Add to Watchlist
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white">Processing...</div>
          </div>
        )}
      </div>
    </div>
  );
});

MovieDetailModal.displayName = 'MovieDetailModal';

export default MovieDetailModal;
