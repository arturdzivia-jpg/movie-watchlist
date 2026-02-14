import { Rating, Priority } from '@prisma/client';

/**
 * Valid rating values as a const array for type safety
 */
export const VALID_RATINGS = ['NOT_INTERESTED', 'DISLIKE', 'OK', 'LIKE', 'SUPER_LIKE'] as const;
export type ValidRating = typeof VALID_RATINGS[number];

/**
 * Valid priority values as a const array for type safety
 */
export const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type ValidPriority = typeof VALID_PRIORITIES[number];

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  error?: string;
}

/**
 * Validate and normalize a rating value
 *
 * @param rating - The rating value to validate (any type)
 * @returns Validation result with normalized Rating or error message
 */
export function validateRating(rating: unknown): ValidationResult<Rating> {
  if (rating === undefined || rating === null) {
    return {
      isValid: false,
      error: 'Rating is required'
    };
  }

  if (typeof rating !== 'string') {
    return {
      isValid: false,
      error: 'Rating must be a string'
    };
  }

  const normalizedRating = rating.toUpperCase();

  if (!VALID_RATINGS.includes(normalizedRating as ValidRating)) {
    return {
      isValid: false,
      error: `Invalid rating value. Must be one of: ${VALID_RATINGS.join(', ')}`
    };
  }

  return {
    isValid: true,
    value: normalizedRating as Rating
  };
}

/**
 * Validate and normalize a priority value
 *
 * @param priority - The priority value to validate (any type)
 * @param defaultValue - Default value if priority is not provided
 * @returns Validation result with normalized Priority or error message
 */
export function validatePriority(
  priority: unknown,
  defaultValue: Priority = 'MEDIUM'
): ValidationResult<Priority> {
  if (priority === undefined || priority === null) {
    return {
      isValid: true,
      value: defaultValue
    };
  }

  if (typeof priority !== 'string') {
    return {
      isValid: false,
      error: 'Priority must be a string'
    };
  }

  const normalizedPriority = priority.toUpperCase();

  if (!VALID_PRIORITIES.includes(normalizedPriority as ValidPriority)) {
    return {
      isValid: false,
      error: `Invalid priority value. Must be one of: ${VALID_PRIORITIES.join(', ')}`
    };
  }

  return {
    isValid: true,
    value: normalizedPriority as Priority
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 500; // TMDB max is 500 pages
const MAX_LIMIT = 100;

/**
 * Validate and normalize pagination parameters
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @param options - Override default max values
 * @returns Validated pagination parameters
 */
export function validatePagination(
  page: unknown,
  limit?: unknown,
  options?: { maxPage?: number; maxLimit?: number; defaultLimit?: number }
): PaginationParams {
  const maxPage = options?.maxPage ?? MAX_PAGE;
  const maxLimit = options?.maxLimit ?? MAX_LIMIT;
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT;

  let parsedPage = DEFAULT_PAGE;
  let parsedLimit = defaultLimit;

  if (page !== undefined && page !== null) {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : Number(page);
    if (!isNaN(pageNum)) {
      parsedPage = Math.max(1, Math.min(pageNum, maxPage));
    }
  }

  if (limit !== undefined && limit !== null) {
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : Number(limit);
    if (!isNaN(limitNum)) {
      parsedLimit = Math.max(1, Math.min(limitNum, maxLimit));
    }
  }

  return { page: parsedPage, limit: parsedLimit };
}

/**
 * Validate a TMDB ID
 *
 * @param tmdbId - The TMDB ID to validate
 * @returns Validation result with parsed number or error message
 */
export function validateTmdbId(tmdbId: unknown): ValidationResult<number> {
  if (tmdbId === undefined || tmdbId === null) {
    return {
      isValid: false,
      error: 'TMDB ID is required'
    };
  }

  const parsed = typeof tmdbId === 'string' ? parseInt(tmdbId, 10) : Number(tmdbId);

  if (isNaN(parsed)) {
    return {
      isValid: false,
      error: 'Invalid TMDB ID'
    };
  }

  if (parsed <= 0) {
    return {
      isValid: false,
      error: 'TMDB ID must be a positive number'
    };
  }

  return {
    isValid: true,
    value: parsed
  };
}

/**
 * Validate a UUID string
 *
 * @param id - The UUID to validate
 * @returns Validation result
 */
export function validateUuid(id: unknown): ValidationResult<string> {
  if (id === undefined || id === null) {
    return {
      isValid: false,
      error: 'ID is required'
    };
  }

  if (typeof id !== 'string') {
    return {
      isValid: false,
      error: 'ID must be a string'
    };
  }

  // Basic UUID format check (not strict, Prisma will validate further)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      isValid: false,
      error: 'Invalid ID format'
    };
  }

  return {
    isValid: true,
    value: id
  };
}

/**
 * Validate a positive integer
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result with parsed number or error message
 */
export function validatePositiveInt(
  value: unknown,
  fieldName: string = 'Value'
): ValidationResult<number> {
  if (value === undefined || value === null) {
    return { isValid: true }; // Optional field
  }

  const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);

  if (isNaN(parsed)) {
    return {
      isValid: false,
      error: `${fieldName} must be a number`
    };
  }

  if (parsed <= 0) {
    return {
      isValid: false,
      error: `${fieldName} must be a positive number`
    };
  }

  return {
    isValid: true,
    value: parsed
  };
}
