/**
 * controllers/favoriteController.js
 */

const Favorite = require("../models/Favorite");
const Hotel = require("../models/Hotel");

const getMyFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.findByUser(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Favorites fetched successfully.",
      data: { count: favorites.length, favorites },
    });
  } catch (error) {
    next(error);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    if (isNaN(hotelId) || hotelId < 1) {
      return res.status(400).json({ success: false, message: "Invalid hotel ID." });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    const exists = await Favorite.exists(req.user.id, hotelId);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Hotel is already in your favorites.",
      });
    }

    await Favorite.add(req.user.id, hotelId);

    return res.status(201).json({
      success: true,
      message: "Hotel added to favorites.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    if (isNaN(hotelId) || hotelId < 1) {
      return res.status(400).json({ success: false, message: "Invalid hotel ID." });
    }

    const removed = await Favorite.remove(req.user.id, hotelId);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Favorite not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel removed from favorites.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyFavorites, addFavorite, removeFavorite };
