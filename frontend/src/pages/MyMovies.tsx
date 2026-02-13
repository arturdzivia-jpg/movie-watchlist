import React, { useState, useEffect } from 'react';
import { userMoviesAPI, UserMovie, Rating } from '../services/api';
import UserMovieCard from '../components/Movies/UserMovieCard';

const MyMovies: React.FC = () => {
  const [movies, setMovies] = useState<UserMovie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<UserMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const response = await userMoviesAPI.getAll();
      setMovies(response.data);
    } catch (error) {
      console.error('Failed to load movies:', error);
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
          SUPER_LIKE: 4,
          LIKE: 3,
          OK: 2,
          DISLIKE: 1
        };
        return ratingOrder[b.rating] - ratingOrder[a.rating];
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredMovies(filtered);
  };

  const handleUpdateRating = async (id: string, rating: Rating) => {
    try {
      await userMoviesAPI.update(id, rating);
      setMovies(movies.map(m => m.id === id ? { ...m, rating } : m));
    } catch (error) {
      console.error('Failed to update rating:', error);
      alert('Failed to update rating');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this movie?')) {
      return;
    }

    try {
      await userMoviesAPI.delete(id);
      setMovies(movies.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete movie:', error);
      alert('Failed to delete movie');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-xl">Loading your movies...</div>
      </div>
    );
  }

  return (
    <div>
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
          <a
            href="/recommendations"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Discover Movies
          </a>
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
