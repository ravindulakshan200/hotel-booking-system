/**
 * controllers/healthController.js
 * Liveness and database-readiness checks for the API.
 */

const pool = require("../config/db");

const livenessCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running.",
    data: { status: "live" },
  });
};

const readinessCheck = async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({
      success: true,
      message: "Server and database are ready.",
      data: { status: "ready", database: "connected" },
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: "Service is not ready. Database connection is unavailable.",
      data: { status: "degraded", database: "disconnected" },
    });
  }
};

module.exports = { livenessCheck, readinessCheck };
