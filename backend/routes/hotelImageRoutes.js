/**
 * routes/hotelImageRoutes.js
 * Hotel gallery image management.
 * Mounted at /api/v1/hotels in app.js
 */

'use strict';

const express = require('express');
const router  = express.Router();

const {
  getHotelImages, uploadImages, deleteImage,
  setCoverImage, updateAltText, reorderImages,
} = require('../controllers/hotelImageController');

const { protect }   = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const { upload, validateAndKeyFiles } = require('../middleware/uploadMiddleware');

// Public: get all images for a hotel
router.get('/:hotelId/images', getHotelImages);

// Admin: upload (max 10 files per request, security validated)
router.post(
  '/:hotelId/images',
  protect, adminOnly,
  upload.array('images', 10),
  validateAndKeyFiles,
  uploadImages
);

// Admin: set cover
router.patch('/:hotelId/images/:imageId/cover', protect, adminOnly, setCoverImage);

// Admin: update alt text
router.patch('/:hotelId/images/:imageId/alt',   protect, adminOnly, updateAltText);

// Admin: reorder
router.patch('/:hotelId/images/reorder',        protect, adminOnly, reorderImages);

// Admin: delete
router.delete('/:hotelId/images/:imageId',      protect, adminOnly, deleteImage);

module.exports = router;
