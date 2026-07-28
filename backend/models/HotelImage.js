/**
 * models/HotelImage.js
 * Data-access layer for the hotel_images table.
 */

'use strict';

const pool = require('../config/db');

const HotelImage = {
  /** Return all images for a hotel, ordered by sort_order */
  findByHotel: async (hotelId) => {
    const [rows] = await pool.query(
      `SELECT id, hotel_id, storage_key, url, alt_text, sort_order, is_cover, created_at
       FROM hotel_images
       WHERE hotel_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [hotelId]
    );
    return rows;
  },

  /** Count images for a hotel */
  countByHotel: async (hotelId) => {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM hotel_images WHERE hotel_id = ?',
      [hotelId]
    );
    return rows[0].cnt;
  },

  /** Find a single image by ID and hotel ID */
  findByIdAndHotel: async (id, hotelId) => {
    const [rows] = await pool.query(
      'SELECT * FROM hotel_images WHERE id = ? AND hotel_id = ? LIMIT 1',
      [id, hotelId]
    );
    return rows[0] || null;
  },

  /**
   * Insert a new image record.
   * @param {{ hotelId, storageKey, url, altText, sortOrder, isCover }} data
   */
  create: async ({ hotelId, storageKey, url, altText = '', sortOrder = 0, isCover = false }) => {
    const [result] = await pool.query(
      `INSERT INTO hotel_images (hotel_id, storage_key, url, alt_text, sort_order, is_cover)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hotelId, storageKey, url, altText || '', sortOrder, isCover ? 1 : 0]
    );
    return result.insertId;
  },

  /**
   * Set an image as the cover — clears is_cover on all other images for same hotel.
   * @param {number} imageId
   * @param {number} hotelId
   */
  setCover: async (imageId, hotelId) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE hotel_images SET is_cover = 0 WHERE hotel_id = ?',
        [hotelId]
      );
      await conn.query(
        'UPDATE hotel_images SET is_cover = 1 WHERE id = ? AND hotel_id = ?',
        [imageId, hotelId]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Reorder images. updates = [{ id, sort_order }, ...]
   * Only updates images belonging to hotelId.
   */
  reorder: async (hotelId, updates) => {
    if (!Array.isArray(updates) || updates.length === 0) return;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const { id, sort_order } of updates) {
        await conn.query(
          'UPDATE hotel_images SET sort_order = ? WHERE id = ? AND hotel_id = ?',
          [sort_order, id, hotelId]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /** Update alt text for a single image */
  updateAlt: async (imageId, hotelId, altText) => {
    const [result] = await pool.query(
      'UPDATE hotel_images SET alt_text = ? WHERE id = ? AND hotel_id = ?',
      [altText || '', imageId, hotelId]
    );
    return result.affectedRows;
  },

  /** Delete an image record (caller must also delete from storage) */
  delete: async (imageId, hotelId) => {
    const [result] = await pool.query(
      'DELETE FROM hotel_images WHERE id = ? AND hotel_id = ?',
      [imageId, hotelId]
    );
    return result.affectedRows;
  },

  /** Get the cover image URL, or null */
  getCoverUrl: async (hotelId) => {
    const [rows] = await pool.query(
      `SELECT url FROM hotel_images
       WHERE hotel_id = ? AND is_cover = 1
       LIMIT 1`,
      [hotelId]
    );
    if (rows[0]) return rows[0].url;

    // Fallback: first image regardless of cover flag
    const [any] = await pool.query(
      `SELECT url FROM hotel_images WHERE hotel_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1`,
      [hotelId]
    );
    return any[0] ? any[0].url : null;
  },
};

module.exports = HotelImage;
