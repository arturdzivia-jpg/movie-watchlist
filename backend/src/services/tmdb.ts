import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.warn('⚠️  TMDB_API_KEY not set in environment variables');
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
  popularity: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
    crew: { id: number; name: string; job: string; department: string }[];
  };
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

class TMDBService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = TMDB_API_KEY || '';
    this.baseUrl = TMDB_BASE_URL;
  }

  async searchMovies(query: string, page: number = 1): Promise<TMDBSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/movie`, {
        params: {
          api_key: this.apiKey,
          query,
          page,
          language: 'en-US'
        }
      });
      return response.data;
    } catch (error) {
      console.error('TMDB search error:', error);
      throw new Error('Failed to search movies');
    }
  }

  async getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/${tmdbId}`, {
        params: {
          api_key: this.apiKey,
          append_to_response: 'credits',
          language: 'en-US'
        }
      });
      return response.data;
    } catch (error) {
      console.error('TMDB get movie details error:', error);
      throw new Error('Failed to get movie details');
    }
  }

  async getPopularMovies(page: number = 1): Promise<TMDBSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/popular`, {
        params: {
          api_key: this.apiKey,
          page,
          language: 'en-US'
        }
      });
      return response.data;
    } catch (error) {
      console.error('TMDB get popular movies error:', error);
      throw new Error('Failed to get popular movies');
    }
  }

  async getRecommendations(tmdbId: number, page: number = 1): Promise<TMDBSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/${tmdbId}/recommendations`, {
        params: {
          api_key: this.apiKey,
          page,
          language: 'en-US'
        }
      });
      return response.data;
    } catch (error) {
      console.error('TMDB get recommendations error:', error);
      throw new Error('Failed to get movie recommendations');
    }
  }

  async getSimilarMovies(tmdbId: number, page: number = 1): Promise<TMDBSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/${tmdbId}/similar`, {
        params: {
          api_key: this.apiKey,
          page,
          language: 'en-US'
        }
      });
      return response.data;
    } catch (error) {
      console.error('TMDB get similar movies error:', error);
      throw new Error('Failed to get similar movies');
    }
  }

  async discoverMovies(params: {
    with_genres?: string;
    sort_by?: string;
    page?: number;
    'vote_count.gte'?: number;
  }): Promise<TMDBSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/discover/movie`, {
        params: {
          api_key: this.apiKey,
          language: 'en-US',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('TMDB discover movies error:', error);
      throw new Error('Failed to discover movies');
    }
  }
}

export default new TMDBService();
