/**
 * routes/hotelRoutes.js
 *
 * Hotel routes — mounted at /api/v1/hotels in server.js
 *
 * Public  (no token required):
 *   GET    /api/v1/hotels          — List all hotels
 *   GET    /api/v1/hotels/:id      — Get a single hotel
 *
 * Admin-only (JWT + admin role required):
 *   POST   /api/v1/hotels          — Create a hotel
 *   PUT    /api/v1/hotels/:id      — Update a hotel
 *   DELETE /api/v1/hotels/:id      — Delete a hotel
 *
 * Middleware chain for protected routes:
 *   protect   — verifies JWT, attaches req.user
 *   adminOnly — checks req.user.role === 'admin'
 */

const express    = require("express");
const router     = express.Router();

const {
  getAllHotels,
  searchAvailability,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
} = require("../controllers/hotelController");

const { protect }   = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /api/v1/hotels          ?city=Miami | ?search=grand
router.get("/", getAllHotels);

// GET /api/v1/hotels/availability
router.get("/availability", searchAvailability);

// GET /api/v1/hotels/:id
router.get("/:id", getHotelById);

// ── Admin-only routes ─────────────────────────────────────────────────────────

// POST /api/v1/hotels
router.post("/", protect, adminOnly, createHotel);

// PUT /api/v1/hotels/:id
router.put("/:id", protect, adminOnly, updateHotel);

// DELETE /api/v1/hotels/:id
router.delete("/:id", protect, adminOnly, deleteHotel);

module.exports = router;
