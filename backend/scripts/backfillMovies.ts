/**
 * Backfill script to update existing movies with enhanced TMDB data
 *
 * This script fetches director, cast, keywords, collection, and production company
 * data for all movies in the database that are missing this information.
 *
 * Run with: npm run backfill
 */

import prisma from '../src/config/database';
import tmdbService from '../src/services/tmdb';
import weightLearningService from '../src/services/weightLearning';

const BATCH_SIZE = 10;
const DELAY_MS = 200; // Delay between batches to respect TMDB rate limits

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillMovies(): Promise<void> {
  console.log('Starting movie backfill...\n');

  // Get all movies - we'll update all to ensure keywords, collection, productionCompanies are populated
  // (Many movies have director/cast from before but are missing the newer fields)
  const movies = await prisma.movie.findMany({
    select: {
      id: true,
      tmdbId: true,
      title: true
    }
  });

  console.log(`Found ${movies.length} movies to update\n`);

  if (movies.length === 0) {
    console.log('All movies already have enhanced data. Nothing to do.');
    return;
  }

  let updated = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE);

    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(movies.length / BATCH_SIZE)}...`);

    const promises = batch.map(async (movie) => {
      try {
        const tmdbMovie = await tmdbService.getEnhancedMovieDetails(movie.tmdbId);

        const director = tmdbMovie.credits?.crew.find(
          person => person.job === 'Director'
        )?.name || null;

        const cast = tmdbMovie.credits?.cast.slice(0, 10).map(actor => ({
          id: actor.id,
          name: actor.name,
          character: actor.character
        })) || [];

        const collectionId = tmdbMovie.belongs_to_collection?.id || null;
        const collectionName = tmdbMovie.belongs_to_collection?.name || null;

        const productionCompanies = tmdbMovie.production_companies?.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name
        })) || [];

        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            director,
            cast,
            runtime: tmdbMovie.runtime,
            keywords: (tmdbMovie.keywords || []) as any,
            collectionId,
            collectionName,
            productionCompanies,
            // Also update genres to ensure they have names
            genres: tmdbMovie.genres,
            lastUpdated: new Date()
          }
        });

        console.log(`  ✓ ${movie.title}`);
        return true;
      } catch (error) {
        console.error(`  ✗ ${movie.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
      }
    });

    const results = await Promise.all(promises);
    updated += results.filter(r => r).length;
    failed += results.filter(r => !r).length;

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < movies.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nBackfill complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);

  // Recalculate weights for all users
  console.log('\nRecalculating user preference weights...');

  const users = await prisma.user.findMany({
    select: { id: true }
  });

  for (const user of users) {
    try {
      await weightLearningService.calculateUserWeights(user.id);
      console.log(`  ✓ Weights recalculated for user ${user.id}`);
    } catch (error) {
      console.error(`  ✗ Failed to recalculate weights for user ${user.id}`);
    }
  }

  console.log('\nDone!');
}

// Run the backfill
backfillMovies()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
