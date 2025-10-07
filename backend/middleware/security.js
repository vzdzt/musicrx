import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

// Rate limiting configurations
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Strict rate limiting for sensitive endpoints
export const strictRateLimit = createRateLimit(15 * 60 * 1000, 10); // 10 requests per 15 minutes
export const generalRateLimit = createRateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://musicrx.app", "https://api.spotify.com", "https://*.spotify.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for media
});

// Input sanitization middleware - disabled due to persistent issues
// TODO: Implement proper input sanitization in individual route handlers
export const sanitizeInput = (req, res, next) => {
  // Temporarily disabled - will implement sanitization at route level
  // where we have better control over the data structures
  next();
};

// Input validation helpers
export const validateObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

export const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength).replace(/[<>'"&]/g, '');
};

// Request size limiting
export const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length']);
  if (contentLength && contentLength > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({ error: 'Request too large' });
  }
  next();
};
