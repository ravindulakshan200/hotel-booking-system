/**
 * Health Check Routes
 * Mounted at /api/v1/health.
 */

const express = require("express");
const router = express.Router();
const { livenessCheck, readinessCheck } = require("../controllers/healthController");

// GET /api/v1/health
router.get("/", readinessCheck);
router.get("/live", livenessCheck);

module.exports = router;
