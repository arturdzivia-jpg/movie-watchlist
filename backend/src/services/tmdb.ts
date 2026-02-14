import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.warn('Warning: TMDB_API_KEY not set in environment variables');
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
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
  original_language?: string;
  // Optional fields added when enriched with full details
  director?: string;
  cast?: { id: number; name: string }[];
  keywords?: TMDBKeyword[];
  belongs_to_collection?: TMDBCollection | null;
  production_companies?: TMDBProductionCompany[];
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  tagline: string;
  belongs_to_collection: TMDBCollection | null;
  production_companies: TMDBProductionCompany[];
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
    crew: { id: number; name: string; job: string; department: string }[];
  };
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBKeywordsResponse {
  id: number;
  keywords: TMDBKeyword[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBGenreListResponse {
  genres: TMDBGenre[];
}

export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;           // YouTube/Vimeo video key
  name: string;
  site: string;          // "YouTube" or "Vimeo"
  size: number;          // 360, 480, 720, 1080
  type: string;          // "Trailer", "Teaser", "Clip", "Featurette", etc.
  official: boolean;
  published_at: string;
}

export interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

export interface TMDBWatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface TMDBWatchProviderData {
  link?: string;
  flatrate?: TMDBWatchProvider[];  // Subscription streaming (Netflix, etc.)
  rent?: TMDBWatchProvider[];      // Rent options
  buy?: TMDBWatchProvider[];       // Buy options
}

export interface TMDBWatchProvidersResponse {
  id: number;
  results: {
    [countryCode: string]: TMDBWatchProviderData;
  };
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

  async getMovieVideos(tmdbId: number): Promise<TMDBVideo[]> {
    try {
      const response = await axios.get<TMDBVideosResponse>(
        `${this.baseUrl}/movie/${tmdbId}/videos`,
        {
          params: {
            api_key: this.apiKey,
            language: 'en-US'
          }
        }
      );
      return response.data.results || [];
    } catch (error) {
      console.error('TMDB get movie videos error:', error);
      return []; // Return empty array on error, don't break the flow
    }
  }

  // Fetch movie keywords for fine-grained matching
  async getMovieKeywords(tmdbId: number): Promise<TMDBKeyword[]> {
    try {
      const response = await axios.get<TMDBKeywordsResponse>(
        `${this.baseUrl}/movie/${tmdbId}/keywords`,
        {
          params: {
            api_key: this.apiKey
          }
        }
      );
      return response.data.keywords || [];
    } catch (error) {
      console.error('TMDB get movie keywords error:', error);
      return []; // Return empty array on error, don't break the flow
    }
  }

  // Get full movie details including keywords, collection, and production companies
  async getEnhancedMovieDetails(tmdbId: number): Promise<TMDBMovieDetails & { keywords: TMDBKeyword[] }> {
    try {
      // Fetch details and keywords in parallel
      const [details, keywords] = await Promise.all([
        this.getMovieDetails(tmdbId),
        this.getMovieKeywords(tmdbId)
      ]);

      return {
        ...details,
        keywords
      };
    } catch (error) {
      console.error('TMDB get enhanced movie details error:', error);
      throw new Error('Failed to get enhanced movie details');
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
    without_genres?: string;
    with_original_language?: string;
    without_original_language?: string;
    with_keywords?: string;
    with_cast?: string;      // Filter by actor ID (person)
    with_crew?: string;      // Filter by crew member ID (for directors)
    with_companies?: string; // Filter by production company ID
    sort_by?: string;
    page?: number;
    'vote_count.gte'?: number;
    'vote_count.lte'?: number;
    'vote_average.gte'?: number;
    'primary_release_date.lte'?: string;
    'primary_release_date.gte'?: string;
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

  // Get all TMDB genres (useful for exploration feature)
  async getGenreList(): Promise<TMDBGenre[]> {
    try {
      const response = await axios.get<TMDBGenreListResponse>(
        `${this.baseUrl}/genre/movie/list`,
        {
          params: {
            api_key: this.apiKey,
            language: 'en-US'
          }
        }
      );
      return response.data.genres || [];
    } catch (error) {
      console.error('TMDB get genre list error:', error);
      return [];
    }
  }

  // Get movies from a specific collection (franchise)
  async getCollectionMovies(collectionId: number): Promise<TMDBMovie[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/collection/${collectionId}`, {
        params: {
          api_key: this.apiKey,
          language: 'en-US'
        }
      });
      return response.data.parts || [];
    } catch (error) {
      console.error('TMDB get collection movies error:', error);
      return [];
    }
  }

  // Get new releases (movies from last 3 months)
  async getNewReleases(page: number = 1): Promise<TMDBSearchResponse> {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return this.discoverMovies({
      'primary_release_date.gte': threeMonthsAgo.toISOString().split('T')[0],
      'primary_release_date.lte': now.toISOString().split('T')[0],
      sort_by: 'popularity.desc',
      'vote_count.gte': 50,
      page
    });
  }

  // Get top rated movies
  async getTopRated(page: number = 1): Promise<TMDBSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/top_rated`, {
        params: {
          api_key: this.apiKey,
          page,
          language: 'en-US'
        }
      });
      return response.data;
    } catch (error) {
      console.error('TMDB get top rated error:', error);
      throw new Error('Failed to get top rated movies');
    }
  }

  // Get watch providers (streaming availability) for a movie
  async getWatchProviders(tmdbId: number, region: string = 'US'): Promise<TMDBWatchProviderData | null> {
    try {
      const response = await axios.get<TMDBWatchProvidersResponse>(
        `${this.baseUrl}/movie/${tmdbId}/watch/providers`,
        {
          params: {
            api_key: this.apiKey
          }
        }
      );
      // Return providers for the specified region, or null if not available
      return response.data.results?.[region] || null;
    } catch (error) {
      console.error('TMDB get watch providers error:', error);
      return null; // Return null on error, don't break the flow
    }
  }
}

export default new TMDBService();
