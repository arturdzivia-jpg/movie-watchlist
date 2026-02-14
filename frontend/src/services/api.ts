import axios from 'axios';

// Use environment variable or empty string (same-origin) for production
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface TrailerInfo {
  key: string;      // YouTube video ID
  name: string;
  site: string;     // "YouTube"
}

export interface Movie {
  id: string;
  tmdbId: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  genres: { id: number; name: string }[] | null;
  director: string | null;
  directorId: number | null;
  cast: CastMember[] | null;
  runtime: number | null;
  tagline: string | null;
  productionCompanies: { id: number; name: string }[] | null;
  trailer: TrailerInfo | null;
}

export type Rating = 'NOT_INTERESTED' | 'DISLIKE' | 'OK' | 'LIKE' | 'SUPER_LIKE';

export interface UserMovie {
  id: string;
  userId: string;
  movieId: string;
  rating: Rating;
  watched: boolean;
  createdAt: string;
  updatedAt: string;
  movie: Movie;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  movieId: string;
  addedAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  movie: Movie;
}

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
}

export interface Recommendation extends TMDBMovie {
  score: number;
  reasons: string[];
}

// Discover types
export type DiscoverCategory = 'for_you' | 'popular' | 'new_releases' | 'top_rated';
export type MovieStyle = 'all' | 'movies' | 'anime' | 'cartoons';

export interface DiscoverMovie extends TMDBMovie {
  score?: number;
  reasons?: string[];
}

export interface DiscoverResponse {
  movies: DiscoverMovie[];
  page: number;
  total_pages: number;
  category: DiscoverCategory;
}

export interface DiscoverFilters {
  genre?: number | null;
  style?: MovieStyle;
  actor?: number | null;
  director?: number | null;
  company?: number | null;
}

// User Preferences Types
export interface GenrePreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;
  confidence: number;
}

export interface DirectorPreference {
  id: number | null;
  name: string;
  count: number;
  avgRating: number;
  consistency: number;
}

export interface ActorPreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

export interface EraPreference {
  decade: string;
  count: number;
  avgRating: number;
}

export interface RuntimePreference {
  bucket: 'short' | 'medium' | 'long' | 'epic';
  count: number;
  avgRating: number;
}

export interface CollectionPreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

export interface ProductionCompanyPreference {
  id: number;
  name: string;
  count: number;
  avgRating: number;
}

export interface KeywordPreference {
  id: number;
  name: string;
  count: number;
}

export interface RatingDistribution {
  superLike: number;
  like: number;
  ok: number;
  dislike: number;
  notInterested: number;
  total: number;
}

export interface UserPreferences {
  preferredGenres: GenrePreference[];
  likedDirectors: DirectorPreference[];
  likedActors: ActorPreference[];
  dislikedGenres: GenrePreference[];
  preferredEras: EraPreference[];
  preferredRuntime: RuntimePreference | null;
  likedCollections: CollectionPreference[];
  likedProductionCompanies: ProductionCompanyPreference[];
  preferredKeywords: KeywordPreference[];
  ratingDistribution: RatingDistribution;
  ratingStyle: 'generous' | 'balanced' | 'critical';
  totalRatedMovies: number;
}

// Auth API
export const authAPI = {
  register: (email: string, username: string, password: string) =>
    api.post<AuthResponse>('/api/auth/register', { email, username, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password })
};

// Movies API
export const moviesAPI = {
  search: (query: string, page = 1) =>
    api.get<{ page: number; results: TMDBMovie[]; total_pages: number }>('/api/movies/search', {
      params: { q: query, page }
    }),

  getDetails: (tmdbId: number) =>
    api.get<Movie>(`/api/movies/${tmdbId}`),

  getPopular: (page = 1) =>
    api.get<{ page: number; results: TMDBMovie[]; total_pages: number }>('/api/movies/popular', {
      params: { page }
    })
};

// User Movies API
export const userMoviesAPI = {
  getAll: (rating?: Rating, sort?: 'title' | 'rating' | 'date') =>
    api.get<UserMovie[]>('/api/user/movies', { params: { rating, sort } }),

  add: (tmdbId: number, rating: Rating, watched = true) =>
    api.post<UserMovie>('/api/user/movies', { tmdbId, rating, watched }),

  update: (id: string, rating?: Rating, watched?: boolean) =>
    api.put<UserMovie>(`/api/user/movies/${id}`, { rating, watched }),

  delete: (id: string) =>
    api.delete(`/api/user/movies/${id}`)
};

// Watchlist API
export const watchlistAPI = {
  getAll: () =>
    api.get<WatchlistItem[]>('/api/watchlist'),

  add: (tmdbId: number, priority = 'MEDIUM') =>
    api.post<WatchlistItem>('/api/watchlist', { tmdbId, priority }),

  remove: (id: string) =>
    api.delete(`/api/watchlist/${id}`),

  markWatched: (id: string, rating: Rating) =>
    api.post(`/api/watchlist/${id}/watched`, { rating })
};

// Recommendation action types for tracking user interactions
export type RecommendationAction = 'viewed' | 'skipped' | 'rated' | 'watchlisted' | 'not_interested';

// Recommendations API
export const recommendationsAPI = {
  get: (limit = 20) =>
    api.get<{ recommendations: Recommendation[]; total: number }>('/api/recommendations', {
      params: { limit }
    }),

  getPreferences: () =>
    api.get<UserPreferences>('/api/recommendations/preferences'),

  recordAction: (tmdbId: number, action: RecommendationAction) =>
    api.post<{ success: boolean }>('/api/recommendations/action', { tmdbId, action })
};

// Discover API
export const discoverAPI = {
  get: (category: DiscoverCategory, page = 1, filters?: DiscoverFilters) =>
    api.get<DiscoverResponse>('/api/discover', {
      params: {
        category,
        page,
        genre: filters?.genre ?? undefined,
        style: filters?.style && filters.style !== 'all' ? filters.style : undefined,
        actor: filters?.actor ?? undefined,
        director: filters?.director ?? undefined,
        company: filters?.company ?? undefined
      }
    })
};

export default api;
