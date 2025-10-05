/**
 * Health check routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */

/**
 * GET /api/health
 * Health check endpoint
 */
export const getHealth = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
};
