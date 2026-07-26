/**
 * routes/promoRoutes.js
 * Endpoints for promo code management and validation.
 */

const express = require("express");
const router = express.Router();

const {
  getAllPromos,
  getPromoById,
  createPromo,
  updatePromo,
  deletePromo,
  validatePromoCode
} = require("../controllers/promoController");

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// Publicly validate a promo code (authenticated user)
router.post("/validate", protect, validatePromoCode);

// Admin-only CRUD routes
router.get("/", protect, adminOnly, getAllPromos);
router.get("/:id", protect, adminOnly, getPromoById);
router.post("/", protect, adminOnly, createPromo);
router.put("/:id", protect, adminOnly, updatePromo);
router.delete("/:id", protect, adminOnly, deletePromo);

module.exports = router;
