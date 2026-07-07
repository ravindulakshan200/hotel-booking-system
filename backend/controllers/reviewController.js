/**
 * controllers/reviewController.js
 */

const Review = require("../models/Review");
const Hotel = require("../models/Hotel");

const getHotelReviews = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    if (isNaN(hotelId) || hotelId < 1) {
      return res.status(400).json({ success: false, message: "Invalid hotel ID." });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    const [reviews, stats] = await Promise.all([
      Review.findByHotel(hotelId),
      Review.getAverageRating(hotelId),
    ]);

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully.",
      data: { reviews, stats },
    });
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const { hotel_id, rating, comment } = req.body;

    if (!hotel_id || !rating) {
      return res.status(400).json({
        success: false,
        message: "hotel_id and rating are required.",
      });
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: "rating must be between 1 and 5.",
      });
    }

    const hotel = await Hotel.findById(hotel_id);
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    const reviewId = await Review.create({
      user_id: req.user.id,
      hotel_id,
      rating: ratingNum,
      comment,
    });

    const review = await Review.findById(reviewId);

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      data: { review },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this hotel.",
      });
    }
    next(error);
  }
};

const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findAll();
    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully.",
      data: { count: reviews.length, reviews },
    });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid review ID." });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    if (req.user.role !== "admin" && review.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await Review.delete(id);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHotelReviews, createReview, getAllReviews, deleteReview };
