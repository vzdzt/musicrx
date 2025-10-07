/**
 * Utility functions for managing AI context lengths and compression
 */

/**
 * Estimates the number of tokens in a text string
 * Rough approximation: ~4 characters per token
 * @param {string} text - The text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Compresses text using a middle-out strategy
 * Keeps the beginning and end, compresses the middle portion
 * @param {string} text - The text to compress
 * @param {number} maxTokens - Maximum allowed tokens
 * @param {number} keepRatio - Ratio of text to keep at start/end (0.0-1.0)
 * @returns {string} Compressed text
 */
function compressMiddleOut(text, maxTokens, keepRatio = 0.2) {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Split text into words for processing
  const words = text.split(/\s+/);
  const totalWords = words.length;

  if (totalWords <= 10) {
    // Too short to compress meaningfully
    return text;
  }

  // Calculate how many words to keep at start and end
  const keepWords = Math.floor((totalWords * keepRatio) / 2);

  // Ensure we keep at least some words
  const actualKeepWords = Math.max(1, Math.min(keepWords, Math.floor(totalWords / 4)));

  const firstPart = words.slice(0, actualKeepWords).join(' ');
  const lastPart = words.slice(-actualKeepWords).join(' ');

  // Create compressed middle indicator
  const compressedMiddle = `[...${totalWords - (actualKeepWords * 2)} words compressed...]`;

  const compressedText = `${firstPart} ${compressedMiddle} ${lastPart}`;

  // Check if compression still exceeds limit (rare, but possible)
  if (estimateTokens(compressedText) > maxTokens) {
    // Fallback to simple truncation
    return truncateToTokens(text, maxTokens);
  }

  return compressedText;
}

/**
 * Truncates text to fit within a maximum token limit
 * @param {string} text - The text to truncate
 * @param {number} maxTokens - Maximum allowed tokens
 * @returns {string} Truncated text
 */
function truncateToTokens(text, maxTokens) {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Calculate approximate characters to keep
  const maxChars = maxTokens * 4;

  if (text.length <= maxChars) {
    return text;
  }

  // Truncate and add indicator
  const truncated = text.substring(0, maxChars - 50); // Leave room for indicator
  return truncated + ' [...]';
}

/**
 * Splits text into chunks that fit within token limits
 * @param {string} text - The text to split
 * @param {number} maxTokensPerChunk - Maximum tokens per chunk
 * @returns {string[]} Array of text chunks
 */
function splitIntoChunks(text, maxTokensPerChunk) {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    const testChunk = [...currentChunk, word];
    const testText = testChunk.join(' ');

    if (estimateTokens(testText) <= maxTokensPerChunk) {
      currentChunk = testChunk;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
      }
      currentChunk = [word];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

/**
 * Validates if text fits within token limits
 * @param {string} text - The text to validate
 * @param {number} maxTokens - Maximum allowed tokens
 * @returns {boolean} True if text fits within limits
 */
function validateTokenLimit(text, maxTokens) {
  return estimateTokens(text) <= maxTokens;
}

/**
 * Gets context statistics
 * @param {string} text - The text to analyze
 * @returns {object} Statistics object with token count and other metrics
 */
function getContextStats(text) {
  return {
    tokenCount: estimateTokens(text),
    characterCount: text.length,
    wordCount: text.split(/\s+/).length,
    lineCount: text.split('\n').length
  };
}

module.exports = {
  estimateTokens,
  compressMiddleOut,
  truncateToTokens,
  splitIntoChunks,
  validateTokenLimit,
  getContextStats
};
