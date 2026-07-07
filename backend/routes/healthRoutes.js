/**
 * Health Check Routes
 * Mounts the health check endpoint at /api/health
 */

const express = require("express");
const router = express.Router();
const { healthCheck } = require("../controllers/healthController");

// GET /api/health
router.get("/", healthCheck);

module.exports = router;
