import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userMoviesAPI, watchlistAPI, recommendationsAPI, UserPreferences } from '../services/api';

// Helper to format runtime bucket
const formatRuntime = (bucket: string): string => {
  switch (bucket) {
    case 'short': return 'Short films (< 90 min)';
    case 'medium': return 'Medium length (90-120 min)';
    case 'long': return 'Long films (120-150 min)';
    case 'epic': return 'Epic length (> 150 min)';
    default: return bucket;
  }
};

// Helper to format rating style
const formatRatingStyle = (style: string): { label: string; color: string } => {
  switch (style) {
    case 'generous': return { label: 'Generous Rater', color: 'bg-green-600' };
    case 'critical': return { label: 'Critical Rater', color: 'bg-red-600' };
    default: return { label: 'Balanced Rater', color: 'bg-blue-600' };
  }
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalMovies: 0,
    superLikes: 0,
    likes: 0,
    ok: 0,
    dislikes: 0,
    watchlistCount: 0
  });
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setError(null);
      const [moviesRes, watchlistRes, prefsRes] = await Promise.all([
        userMoviesAPI.getAll(),
        watchlistAPI.getAll(),
        recommendationsAPI.getPreferences()
      ]);

      const movies = moviesRes.data;
      const watchlist = watchlistRes.data;

      setStats({
        totalMovies: movies.length,
        superLikes: movies.filter(m => m.rating === 'SUPER_LIKE').length,
        likes: movies.filter(m => m.rating === 'LIKE').length,
        ok: movies.filter(m => m.rating === 'OK').length,
        dislikes: movies.filter(m => m.rating === 'DISLIKE').length,
        watchlistCount: watchlist.length
      });

      setPreferences(prefsRes.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/movies"
          className="bg-slate-800 rounded-lg p-6 shadow-lg hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Movies</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.totalMovies}</p>
            </div>
            <div className="text-4xl">🎬</div>
          </div>
        </Link>

        <Link
          to="/watchlist"
          className="bg-slate-800 rounded-lg p-6 shadow-lg hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Watchlist</p>
              <p className="text-4xl font-bold text-white mt-2">{stats.watchlistCount}</p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </Link>

        <Link
          to="/recommendations"
          className="bg-slate-800 rounded-lg p-6 shadow-lg hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Get Recommendations</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">Discover ✨</p>
            </div>
            <div className="text-4xl">🔍</div>
          </div>
        </Link>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Rating Distribution</h2>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-3">
              <span className="text-2xl" aria-hidden="true">❤️</span>
              <span className="text-slate-300">Super Like</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex-1 sm:flex-none sm:w-48 md:w-64 bg-slate-700 rounded-full h-4">
                <div
                  className="bg-red-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.totalMovies ? (stats.superLikes / stats.totalMovies) * 100 : 0}%` }}
                />
              </div>
              <span className="text-white font-semibold w-10 sm:w-12 text-right">{stats.superLikes}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-3">
              <span className="text-2xl" aria-hidden="true">👍</span>
              <span className="text-slate-300">Like</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex-1 sm:flex-none sm:w-48 md:w-64 bg-slate-700 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.totalMovies ? (stats.likes / stats.totalMovies) * 100 : 0}%` }}
                />
              </div>
              <span className="text-white font-semibold w-10 sm:w-12 text-right">{stats.likes}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-3">
              <span className="text-2xl" aria-hidden="true">😐</span>
              <span className="text-slate-300">OK</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex-1 sm:flex-none sm:w-48 md:w-64 bg-slate-700 rounded-full h-4">
                <div
                  className="bg-yellow-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.totalMovies ? (stats.ok / stats.totalMovies) * 100 : 0}%` }}
                />
              </div>
              <span className="text-white font-semibold w-10 sm:w-12 text-right">{stats.ok}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-3">
              <span className="text-2xl" aria-hidden="true">👎</span>
              <span className="text-slate-300">Dislike</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex-1 sm:flex-none sm:w-48 md:w-64 bg-slate-700 rounded-full h-4">
                <div
                  className="bg-gray-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.totalMovies ? (stats.dislikes / stats.totalMovies) * 100 : 0}%` }}
                />
              </div>
              <span className="text-white font-semibold w-10 sm:w-12 text-right">{stats.dislikes}</span>
            </div>
          </div>
        </div>

        {stats.totalMovies === 0 && (
          <div className="mt-6 text-center">
            <p className="text-slate-400 mb-4">You haven't rated any movies yet!</p>
            <Link
              to="/recommendations"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Discover Movies
            </Link>
          </div>
        )}
      </div>

      {/* Your Preferences Section */}
      <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700 mt-6">
        <h2 className="text-xl font-bold text-white mb-4">Your Preferences</h2>

        {preferences && preferences.totalRatedMovies >= 5 ? (
          <div className="space-y-6">
            {/* Rating Style Badge */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">Your rating style:</span>
              <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${formatRatingStyle(preferences.ratingStyle).color}`}>
                {formatRatingStyle(preferences.ratingStyle).label}
              </span>
            </div>

            {/* Favorite Genres */}
            {preferences.preferredGenres.length > 0 && (
              <div>
                <h3 className="text-slate-400 text-sm font-medium mb-2">Favorite Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {preferences.preferredGenres.slice(0, 5).map((genre) => (
                    <span
                      key={genre.id}
                      className="bg-blue-900/50 border border-blue-700/40 text-blue-300 px-3 py-1 rounded-full text-sm"
                    >
                      {genre.name} ({genre.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Directors */}
            {preferences.likedDirectors.length > 0 && (
              <div>
                <h3 className="text-slate-400 text-sm font-medium mb-2">Favorite Directors</h3>
                <div className="flex flex-wrap gap-2">
                  {preferences.likedDirectors.slice(0, 3).map((director) => (
                    <span
                      key={director.name}
                      className="bg-purple-900/50 border border-purple-700/40 text-purple-300 px-3 py-1 rounded-full text-sm"
                    >
                      {director.name} ({director.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Actors */}
            {preferences.likedActors.length > 0 && (
              <div>
                <h3 className="text-slate-400 text-sm font-medium mb-2">Favorite Actors</h3>
                <div className="flex flex-wrap gap-2">
                  {preferences.likedActors.slice(0, 3).map((actor) => (
                    <span
                      key={actor.id}
                      className="bg-green-900/50 border border-green-700/40 text-green-300 px-3 py-1 rounded-full text-sm"
                    >
                      {actor.name} ({actor.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Era & Runtime */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {preferences.preferredEras.length > 0 && (
                <div>
                  <h3 className="text-slate-400 text-sm font-medium mb-2">Preferred Era</h3>
                  <span className="bg-amber-900/50 border border-amber-700/40 text-amber-300 px-3 py-1 rounded-full text-sm">
                    {preferences.preferredEras[0].decade} ({preferences.preferredEras[0].count} movies)
                  </span>
                </div>
              )}

              {preferences.preferredRuntime && (
                <div>
                  <h3 className="text-slate-400 text-sm font-medium mb-2">Preferred Length</h3>
                  <span className="bg-cyan-900/50 border border-cyan-700/40 text-cyan-300 px-3 py-1 rounded-full text-sm">
                    {formatRuntime(preferences.preferredRuntime.bucket)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 mb-4">
              Rate at least 5 movies to see your preferences
            </p>
            <Link
              to="/recommendations"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Discover Movies
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
