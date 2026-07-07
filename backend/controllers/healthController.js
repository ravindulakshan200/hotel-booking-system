/**
 * controllers/healthController.js
 * Server health check — confirms the API is reachable.
 */

/**
 * @desc    Server health check
 * @route   GET /api/v1/health
 * @access  Public
 */
const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
};

module.exports = { healthCheck };
