import prisma from '../config/database';
import { Rating } from '@prisma/client';

export interface UserPreferences {
  preferredGenres: { id: number; name: string; count: number }[];
  likedDirectors: { name: string; count: number }[];
  likedActors: { id: number; name: string; count: number }[];
  dislikedGenres: { id: number; name: string; count: number }[];
}

class UserPreferencesService {
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Get all liked and super liked movies
    const likedMovies = await prisma.userMovie.findMany({
      where: {
        userId,
        rating: {
          in: [Rating.LIKE, Rating.SUPER_LIKE]
        }
      },
      include: {
        movie: true
      }
    });

    // Get disliked movies
    const dislikedMovies = await prisma.userMovie.findMany({
      where: {
        userId,
        rating: Rating.DISLIKE
      },
      include: {
        movie: true
      }
    });

    // Extract genres from liked movies
    const genreMap = new Map<number, { id: number; name: string; count: number }>();
    likedMovies.forEach(userMovie => {
      const genres = userMovie.movie.genres as any[];
      if (Array.isArray(genres)) {
        genres.forEach(genre => {
          const existing = genreMap.get(genre.id);
          if (existing) {
            existing.count++;
          } else {
            genreMap.set(genre.id, { id: genre.id, name: genre.name, count: 1 });
          }
        });
      }
    });

    // Extract disliked genres
    const dislikedGenreMap = new Map<number, { id: number; name: string; count: number }>();
    dislikedMovies.forEach(userMovie => {
      const genres = userMovie.movie.genres as any[];
      if (Array.isArray(genres)) {
        genres.forEach(genre => {
          const existing = dislikedGenreMap.get(genre.id);
          if (existing) {
            existing.count++;
          } else {
            dislikedGenreMap.set(genre.id, { id: genre.id, name: genre.name, count: 1 });
          }
        });
      }
    });

    // Extract directors
    const directorMap = new Map<string, { name: string; count: number }>();
    likedMovies.forEach(userMovie => {
      const director = userMovie.movie.director;
      if (director) {
        const existing = directorMap.get(director);
        if (existing) {
          existing.count++;
        } else {
          directorMap.set(director, { name: director, count: 1 });
        }
      }
    });

    // Extract cast
    const actorMap = new Map<number, { id: number; name: string; count: number }>();
    likedMovies.forEach(userMovie => {
      const cast = userMovie.movie.cast as any[];
      if (Array.isArray(cast)) {
        cast.slice(0, 5).forEach(actor => {
          const existing = actorMap.get(actor.id);
          if (existing) {
            existing.count++;
          } else {
            actorMap.set(actor.id, { id: actor.id, name: actor.name, count: 1 });
          }
        });
      }
    });

    // Sort and return
    return {
      preferredGenres: Array.from(genreMap.values()).sort((a, b) => b.count - a.count),
      likedDirectors: Array.from(directorMap.values()).sort((a, b) => b.count - a.count),
      likedActors: Array.from(actorMap.values()).sort((a, b) => b.count - a.count),
      dislikedGenres: Array.from(dislikedGenreMap.values()).sort((a, b) => b.count - a.count)
    };
  }
}

export default new UserPreferencesService();
