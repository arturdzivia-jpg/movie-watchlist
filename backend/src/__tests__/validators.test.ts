import {
  validateRating,
  validatePriority,
  validatePagination,
  validateTmdbId,
  validateUuid,
  validatePositiveInt,
  VALID_RATINGS,
  VALID_PRIORITIES
} from '../utils/validators';

describe('validateRating', () => {
  describe('valid ratings', () => {
    it.each(VALID_RATINGS)('should accept %s as valid rating', (rating) => {
      const result = validateRating(rating);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(rating);
    });

    it('should accept lowercase ratings and normalize to uppercase', () => {
      const result = validateRating('like');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('LIKE');
    });

    it('should accept mixed case ratings', () => {
      const result = validateRating('Super_Like');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('SUPER_LIKE');
    });
  });

  describe('invalid ratings', () => {
    it('should reject null', () => {
      const result = validateRating(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rating is required');
    });

    it('should reject undefined', () => {
      const result = validateRating(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rating is required');
    });

    it('should reject non-string values', () => {
      const result = validateRating(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rating must be a string');
    });

    it('should reject invalid rating strings', () => {
      const result = validateRating('INVALID');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid rating value');
    });
  });
});

describe('validatePriority', () => {
  describe('valid priorities', () => {
    it.each(VALID_PRIORITIES)('should accept %s as valid priority', (priority) => {
      const result = validatePriority(priority);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(priority);
    });

    it('should accept lowercase and normalize', () => {
      const result = validatePriority('high');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('HIGH');
    });
  });

  describe('default value', () => {
    it('should return MEDIUM as default when undefined', () => {
      const result = validatePriority(undefined);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('MEDIUM');
    });

    it('should return custom default when provided', () => {
      const result = validatePriority(undefined, 'LOW');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('LOW');
    });
  });

  describe('invalid priorities', () => {
    it('should reject non-string values', () => {
      const result = validatePriority(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Priority must be a string');
    });

    it('should reject invalid priority strings', () => {
      const result = validatePriority('URGENT');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid priority value');
    });
  });
});

describe('validatePagination', () => {
  it('should return defaults when no values provided', () => {
    const result = validatePagination(undefined, undefined);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should parse string page numbers', () => {
    const result = validatePagination('5', '10');
    expect(result.page).toBe(5);
    expect(result.limit).toBe(10);
  });

  it('should clamp page to minimum of 1', () => {
    const result = validatePagination(-1);
    expect(result.page).toBe(1);
  });

  it('should clamp page to maximum of 500 by default', () => {
    const result = validatePagination(1000);
    expect(result.page).toBe(500);
  });

  it('should respect custom maxPage option', () => {
    const result = validatePagination(100, undefined, { maxPage: 50 });
    expect(result.page).toBe(50);
  });

  it('should clamp limit to maximum', () => {
    const result = validatePagination(1, 500);
    expect(result.limit).toBe(100);
  });

  it('should handle NaN values gracefully', () => {
    const result = validatePagination('not-a-number', 'also-not');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe('validateTmdbId', () => {
  describe('valid IDs', () => {
    it('should accept positive integers', () => {
      const result = validateTmdbId(12345);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(12345);
    });

    it('should parse string integers', () => {
      const result = validateTmdbId('67890');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(67890);
    });
  });

  describe('invalid IDs', () => {
    it('should reject null', () => {
      const result = validateTmdbId(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('TMDB ID is required');
    });

    it('should reject negative numbers', () => {
      const result = validateTmdbId(-1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('TMDB ID must be a positive number');
    });

    it('should reject zero', () => {
      const result = validateTmdbId(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('TMDB ID must be a positive number');
    });

    it('should reject non-numeric strings', () => {
      const result = validateTmdbId('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid TMDB ID');
    });
  });
});

describe('validateUuid', () => {
  describe('valid UUIDs', () => {
    it('should accept valid UUID format', () => {
      const result = validateUuid('123e4567-e89b-12d3-a456-426614174000');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should accept uppercase UUIDs', () => {
      const result = validateUuid('123E4567-E89B-12D3-A456-426614174000');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid UUIDs', () => {
    it('should reject null', () => {
      const result = validateUuid(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ID is required');
    });

    it('should reject non-string values', () => {
      const result = validateUuid(12345);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ID must be a string');
    });

    it('should reject invalid UUID format', () => {
      const result = validateUuid('not-a-uuid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid ID format');
    });
  });
});

describe('validatePositiveInt', () => {
  it('should return valid for undefined (optional field)', () => {
    const result = validatePositiveInt(undefined, 'TestField');
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('should accept positive integers', () => {
    const result = validatePositiveInt(42, 'TestField');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(42);
  });

  it('should parse string integers', () => {
    const result = validatePositiveInt('100', 'TestField');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(100);
  });

  it('should reject negative numbers', () => {
    const result = validatePositiveInt(-5, 'TestField');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('TestField must be a positive number');
  });

  it('should reject non-numeric strings', () => {
    const result = validatePositiveInt('abc', 'TestField');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('TestField must be a number');
  });
});
