import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userMoviesAPI, watchlistAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalMovies: 0,
    superLikes: 0,
    likes: 0,
    ok: 0,
    dislikes: 0,
    watchlistCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setError(null);
      const [moviesRes, watchlistRes] = await Promise.all([
        userMoviesAPI.getAll(),
        watchlistAPI.getAll()
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
    </div>
  );
};

export default Dashboard;
