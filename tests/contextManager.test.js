const {
  estimateTokens,
  compressMiddleOut,
  truncateToTokens,
  splitIntoChunks,
  validateTokenLimit,
  getContextStats
} = require('../backend/utils/contextManager.js');

describe('Context Manager Utilities', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should estimate tokens for short text', () => {
      expect(estimateTokens('hello')).toBe(2); // 5 chars / 4 ≈ 2
    });

    it('should estimate tokens for longer text', () => {
      const text = 'This is a test string with multiple words';
      expect(estimateTokens(text)).toBe(11); // 41 chars / 4 ≈ 10.25, ceil to 11
    });
  });

  describe('compressMiddleOut', () => {
    it('should return original text if under limit', () => {
      const text = 'Short text';
      expect(compressMiddleOut(text, 100)).toBe(text);
    });

    it('should compress long text using middle-out strategy', () => {
      const text = 'This is a very long text that should be compressed in the middle to fit within token limits for AI processing';
      const result = compressMiddleOut(text, 20); // ~20 tokens max

      expect(result).toContain('This is');
      expect(result).toContain('AI processing');
      expect(result).toContain('words compressed');
      expect(estimateTokens(result)).toBeLessThanOrEqual(25); // Allow some tolerance
    });

    it('should handle very short text', () => {
      const text = 'Short';
      expect(compressMiddleOut(text, 1)).toBe(text);
    });
  });

  describe('truncateToTokens', () => {
    it('should return original text if under limit', () => {
      const text = 'Short text';
      expect(truncateToTokens(text, 100)).toBe(text);
    });

    it('should truncate long text', () => {
      const text = 'This is a very long text that should be truncated to fit within the token limit';
      const result = truncateToTokens(text, 10); // ~10 tokens

      expect(result.length).toBeLessThan(text.length);
      expect(result).toContain('[...]');
      expect(estimateTokens(result)).toBeLessThanOrEqual(15);
    });
  });

  describe('splitIntoChunks', () => {
    it('should split text into chunks', () => {
      const text = 'This is a long text that should be split into multiple chunks for processing';
      const chunks = splitIntoChunks(text, 10); // ~10 tokens per chunk

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(estimateTokens(chunk)).toBeLessThanOrEqual(15);
      });
    });

    it('should handle short text', () => {
      const text = 'Short';
      const chunks = splitIntoChunks(text, 10);

      expect(chunks).toEqual([text]);
    });
  });

  describe('validateTokenLimit', () => {
    it('should validate text within limit', () => {
      expect(validateTokenLimit('Short', 10)).toBe(true);
    });

    it('should invalidate text over limit', () => {
      expect(validateTokenLimit('This is a very long text that exceeds the token limit', 5)).toBe(false);
    });
  });

  describe('getContextStats', () => {
    it('should return statistics for text', () => {
      const text = 'Hello world\nThis is a test';
      const stats = getContextStats(text);

      expect(stats).toHaveProperty('tokenCount');
      expect(stats).toHaveProperty('characterCount');
      expect(stats).toHaveProperty('wordCount');
      expect(stats).toHaveProperty('lineCount');

      expect(stats.characterCount).toBe(text.length);
      expect(stats.wordCount).toBe(6);
      expect(stats.lineCount).toBe(2);
    });
  });
});
