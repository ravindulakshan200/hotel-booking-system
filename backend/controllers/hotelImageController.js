/**
 * controllers/hotelImageController.js
 * Admin-only image upload, ordering, and management for hotel galleries.
 */

'use strict';

const HotelImage = require('../models/HotelImage');
const Hotel      = require('../models/Hotel');
const AuditLog   = require('../models/AuditLog');
const { getAdapter } = require('../services/storage/StorageAdapter');
const { MAX_IMAGES_PER_HOTEL } = require('../middleware/uploadMiddleware');

// ─── GET: Images for a hotel (public) ────────────────────────────────────────

const getHotelImages = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    if (!Number.isInteger(hotelId) || hotelId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid hotel ID.' });
    }
    const images = await HotelImage.findByHotel(hotelId);
    return res.status(200).json({ success: true, message: 'Images fetched.', data: { images } });
  } catch (err) {
    next(err);
  }
};

// ─── POST: Upload images (admin only) ────────────────────────────────────────

const uploadImages = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    if (!Number.isInteger(hotelId) || hotelId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid hotel ID.' });
    }

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found.' });

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    // Count existing images
    const existing = await HotelImage.countByHotel(hotelId);
    if (existing + files.length > MAX_IMAGES_PER_HOTEL) {
      return res.status(400).json({
        success: false,
        message: `Adding ${files.length} image(s) would exceed the ${MAX_IMAGES_PER_HOTEL} image limit for this hotel (currently ${existing}).`,
      });
    }

    const adapter = getAdapter();
    const uploaded = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { url } = await adapter.upload(file.buffer, file.storageKey, file.mimetype);
      const altText   = (req.body.alt_texts ? JSON.parse(req.body.alt_texts) : [])[i] || '';
      const sortOrder = existing + i;
      const isCover   = (existing === 0 && i === 0); // first ever image becomes cover

      const imageId = await HotelImage.create({
        hotelId,
        storageKey: file.storageKey,
        url,
        altText,
        sortOrder,
        isCover,
      });
      uploaded.push({ id: imageId, url, alt_text: altText, is_cover: isCover });
    }

    await AuditLog.create({
      adminId: req.user.id, action: 'hotel_images_uploaded',
      entityType: 'hotel', entityId: hotelId,
      metadata: { count: files.length },
      ip: req.ip,
    });

    return res.status(201).json({ success: true, message: `${files.length} image(s) uploaded.`, data: { images: uploaded } });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE: Remove an image (admin only) ────────────────────────────────────

const deleteImage = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    const imageId = parseInt(req.params.imageId, 10);

    const image = await HotelImage.findByIdAndHotel(imageId, hotelId);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found.' });

    // Delete from storage
    try {
      await getAdapter().delete(image.storage_key);
    } catch (storageErr) {
      console.error('[HotelImages] Storage delete failed (continuing):', storageErr.message);
    }

    await HotelImage.delete(imageId, hotelId);

    await AuditLog.create({
      adminId: req.user.id, action: 'hotel_image_deleted',
      entityType: 'hotel', entityId: hotelId,
      metadata: { image_id: imageId },
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Image deleted.', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH: Set cover image (admin only) ─────────────────────────────────────

const setCoverImage = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    const imageId = parseInt(req.params.imageId, 10);

    const image = await HotelImage.findByIdAndHotel(imageId, hotelId);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found.' });

    await HotelImage.setCover(imageId, hotelId);

    return res.status(200).json({ success: true, message: 'Cover image updated.', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH: Update alt text (admin only) ─────────────────────────────────────

const updateAltText = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    const imageId = parseInt(req.params.imageId, 10);
    const { alt_text } = req.body;

    if (typeof alt_text !== 'string' || alt_text.length > 255) {
      return res.status(400).json({ success: false, message: 'alt_text must be a string max 255 characters.' });
    }

    const image = await HotelImage.findByIdAndHotel(imageId, hotelId);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found.' });

    await HotelImage.updateAlt(imageId, hotelId, alt_text);
    return res.status(200).json({ success: true, message: 'Alt text updated.', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH: Reorder images (admin only) ──────────────────────────────────────

const reorderImages = async (req, res, next) => {
  try {
    const hotelId = parseInt(req.params.hotelId, 10);
    const { order } = req.body; // [{ id, sort_order }, ...]

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, message: 'order must be a non-empty array of { id, sort_order }.' });
    }

    await HotelImage.reorder(hotelId, order);
    return res.status(200).json({ success: true, message: 'Images reordered.', data: null });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHotelImages, uploadImages, deleteImage, setCoverImage, updateAltText, reorderImages };
