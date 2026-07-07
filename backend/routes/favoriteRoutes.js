/**
 * routes/favoriteRoutes.js
 */

const express = require("express");
const router = express.Router();
const {
  getMyFavorites,
  addFavorite,
  removeFavorite,
} = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getMyFavorites);
router.post("/:hotelId", addFavorite);
router.delete("/:hotelId", removeFavorite);

module.exports = router;
