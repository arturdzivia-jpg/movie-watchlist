import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userMoviesAPI, UserMovie, Rating } from '../services/api';
import UserMovieCard from '../components/Movies/UserMovieCard';

const MyMovies: React.FC = () => {
  const [movies, setMovies] = useState<UserMovie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<UserMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<Rating | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'rating'>('date');

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [movies, filterRating, sortBy]);

  const loadMovies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await userMoviesAPI.getAll();
      setMovies(response.data);
    } catch (err) {
      console.error('Failed to load movies:', err);
      setError('Failed to load your movies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...movies];

    // Apply rating filter
    if (filterRating !== 'ALL') {
      filtered = filtered.filter(m => m.rating === filterRating);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'title') {
        return a.movie.title.localeCompare(b.movie.title);
      } else if (sortBy === 'rating') {
        const ratingOrder: Record<Rating, number> = {
          SUPER_LIKE: 5,
          LIKE: 4,
          OK: 3,
          DISLIKE: 2,
          NOT_INTERESTED: 1
        };
        return ratingOrder[b.rating] - ratingOrder[a.rating];
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredMovies(filtered);
  };

  const handleUpdateRating = async (id: string, rating: Rating) => {
    const previousMovies = movies;
    // Optimistic update
    setMovies(movies.map(m => m.id === id ? { ...m, rating } : m));
    try {
      await userMoviesAPI.update(id, rating);
    } catch (err) {
      console.error('Failed to update rating:', err);
      // Rollback on error
      setMovies(previousMovies);
      setError('Failed to update rating. Please try again.');
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this movie?')) {
      return;
    }

    const previousMovies = movies;
    // Optimistic update
    setMovies(movies.filter(m => m.id !== id));
    try {
      await userMoviesAPI.delete(id);
    } catch (err) {
      console.error('Failed to delete movie:', err);
      // Rollback on error
      setMovies(previousMovies);
      setError('Failed to delete movie. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-xl">Loading your movies...</div>
      </div>
    );
  }

  if (error && movies.length === 0) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadMovies}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-3 mb-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">My Movies</h1>
        <div className="text-slate-400">
          {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'}
        </div>
      </div>

      {movies.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-xl font-semibold text-white mb-2">No movies yet</h2>
          <p className="text-slate-400 mb-4">Start by discovering and rating movies!</p>
          <Link
            to="/recommendations"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Discover Movies
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 mb-6 bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="flex items-center space-x-2">
              <label className="text-slate-300 text-sm font-medium">Filter:</label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value as Rating | 'ALL')}
                className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Ratings</option>
                <option value="SUPER_LIKE">❤️ Love</option>
                <option value="LIKE">👍 Like</option>
                <option value="OK">😐 OK</option>
                <option value="DISLIKE">👎 Dislike</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-slate-300 text-sm font-medium">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'rating')}
                className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date Added</option>
                <option value="title">Title</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredMovies.map((userMovie) => (
              <UserMovieCard
                key={userMovie.id}
                userMovie={userMovie}
                onUpdateRating={handleUpdateRating}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {filteredMovies.length === 0 && movies.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
              <p className="text-slate-400">No movies match the current filter</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyMovies;
