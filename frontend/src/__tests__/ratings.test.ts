import { describe, it, expect } from 'vitest';
import {
  RATING_CONFIG,
  RATING_BUTTONS,
  getRatingConfig,
  getRatingEmoji,
  getRatingLabel,
  getRatingColor,
  getRatingBgColor
} from '../constants/ratings';
import { Rating } from '../services/api';

describe('Rating Constants', () => {
  describe('RATING_CONFIG', () => {
    const ratings: Rating[] = ['NOT_INTERESTED', 'DISLIKE', 'OK', 'LIKE', 'SUPER_LIKE'];

    it.each(ratings)('should have config for %s', (rating) => {
      expect(RATING_CONFIG[rating]).toBeDefined();
      expect(RATING_CONFIG[rating].emoji).toBeDefined();
      expect(RATING_CONFIG[rating].label).toBeDefined();
      expect(RATING_CONFIG[rating].color).toBeDefined();
      expect(RATING_CONFIG[rating].bgColor).toBeDefined();
    });

    it('should have correct emoji for each rating', () => {
      expect(RATING_CONFIG.DISLIKE.emoji).toBe('👎');
      expect(RATING_CONFIG.OK.emoji).toBe('😐');
      expect(RATING_CONFIG.LIKE.emoji).toBe('👍');
      expect(RATING_CONFIG.SUPER_LIKE.emoji).toBe('❤️');
      expect(RATING_CONFIG.NOT_INTERESTED.emoji).toBe('🚫');
    });

    it('should have correct labels', () => {
      expect(RATING_CONFIG.DISLIKE.label).toBe('Dislike');
      expect(RATING_CONFIG.OK.label).toBe('OK');
      expect(RATING_CONFIG.LIKE.label).toBe('Like');
      expect(RATING_CONFIG.SUPER_LIKE.label).toBe('Love');
      expect(RATING_CONFIG.NOT_INTERESTED.label).toBe('Not Interested');
    });
  });

  describe('RATING_BUTTONS', () => {
    it('should exclude NOT_INTERESTED', () => {
      const ratings = RATING_BUTTONS.map(b => b.rating);
      expect(ratings).not.toContain('NOT_INTERESTED');
    });

    it('should have 4 buttons', () => {
      expect(RATING_BUTTONS).toHaveLength(4);
    });

    it('should include all other ratings', () => {
      const ratings = RATING_BUTTONS.map(b => b.rating);
      expect(ratings).toContain('DISLIKE');
      expect(ratings).toContain('OK');
      expect(ratings).toContain('LIKE');
      expect(ratings).toContain('SUPER_LIKE');
    });
  });

  describe('Helper functions', () => {
    it('getRatingConfig returns correct config', () => {
      const config = getRatingConfig('LIKE');
      expect(config.emoji).toBe('👍');
      expect(config.label).toBe('Like');
    });

    it('getRatingEmoji returns correct emoji', () => {
      expect(getRatingEmoji('SUPER_LIKE')).toBe('❤️');
      expect(getRatingEmoji('DISLIKE')).toBe('👎');
    });

    it('getRatingLabel returns correct label', () => {
      expect(getRatingLabel('LIKE')).toBe('Like');
      expect(getRatingLabel('OK')).toBe('OK');
    });

    it('getRatingColor returns Tailwind color class', () => {
      const color = getRatingColor('LIKE');
      expect(color).toMatch(/^text-/);
    });

    it('getRatingBgColor returns Tailwind bg class', () => {
      const bgColor = getRatingBgColor('LIKE');
      expect(bgColor).toMatch(/^bg-/);
    });
  });
});
