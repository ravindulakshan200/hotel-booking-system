/**
 * models/PromoCode.js
 * Data-access layer for the `promo_codes` table.
 */

const pool = require("../config/db");
const HttpError = require("../utils/httpError");

const PromoCode = {
  findAll: async () => {
    const [rows] = await pool.query(
      "SELECT * FROM promo_codes ORDER BY created_at DESC"
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      "SELECT * FROM promo_codes WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  findByCode: async (code) => {
    const [rows] = await pool.query(
      "SELECT * FROM promo_codes WHERE LOWER(code) = LOWER(?) LIMIT 1",
      [code.trim()]
    );
    return rows[0] || null;
  },

  create: async ({ code, discount_type, discount_value, start_date, end_date, usage_limit, min_booking_value, is_active, description }) => {
    const [result] = await pool.query(
      `INSERT INTO promo_codes
         (code, discount_type, discount_value, start_date, end_date, usage_limit, min_booking_value, is_active, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        discount_type,
        discount_value,
        start_date,
        end_date,
        usage_limit !== undefined ? usage_limit : 0,
        min_booking_value !== undefined ? min_booking_value : 0.00,
        is_active !== undefined ? is_active : true,
        description || null
      ]
    );
    return result.insertId;
  },

  update: async (id, updates) => {
    const allowedFields = ["code", "discount_type", "discount_value", "start_date", "end_date", "usage_limit", "min_booking_value", "is_active", "description"];
    const setClauses = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(
          field === "code" ? updates[field].trim().toUpperCase() : updates[field]
        );
      }
    }

    if (setClauses.length === 0) return 0;

    params.push(id);
    const [result] = await pool.query(
      `UPDATE promo_codes SET ${setClauses.join(", ")} WHERE id = ?`,
      params
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await pool.query(
      "DELETE FROM promo_codes WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },

  incrementUsage: async (connection, id) => {
    const [result] = await connection.query(
      "UPDATE promo_codes SET times_used = times_used + 1 WHERE id = ? AND (usage_limit = 0 OR times_used + times_reserved < usage_limit)",
      [id]
    );
    if (result.affectedRows === 0) {
      throw new HttpError(400, "Promo code usage limit has been reached.");
    }
    return result.affectedRows;
  },

  reserveUsage: async (connection, id) => {
    const [result] = await connection.query(
      "UPDATE promo_codes SET times_reserved = times_reserved + 1 WHERE id = ? AND (usage_limit = 0 OR times_used + times_reserved < usage_limit)",
      [id]
    );
    if (result.affectedRows === 0) {
      throw new HttpError(400, "Promo code usage/reservation limit has been reached.");
    }
    return result.affectedRows;
  },

  confirmUsage: async (connection, id) => {
    const [result] = await connection.query(
      "UPDATE promo_codes SET times_reserved = GREATEST(0, times_reserved - 1), times_used = times_used + 1 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },

  releaseReservation: async (connection, id) => {
    const [result] = await connection.query(
      "UPDATE promo_codes SET times_reserved = GREATEST(0, times_reserved - 1) WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },

  releaseUsage: async (connection, id) => {
    const [result] = await connection.query(
      "UPDATE promo_codes SET times_used = GREATEST(0, times_used - 1) WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },

  validateCode: (promo, bookingValue) => {
    if (!promo) {
      throw new HttpError(404, "Promo code not found.");
    }
    if (!promo.is_active) {
      throw new HttpError(400, "Promo code is inactive.");
    }
    const now = new Date();
    // Reset hours to compare dates only or parse properly
    const todayStr = now.toISOString().split("T")[0];
    const startDateStr = new Date(promo.start_date).toISOString().split("T")[0];
    const endDateStr = new Date(promo.end_date).toISOString().split("T")[0];

    if (todayStr < startDateStr) {
      throw new HttpError(400, "Promo code is not active yet.");
    }
    if (todayStr > endDateStr) {
      throw new HttpError(400, "Promo code has expired.");
    }
    if (promo.usage_limit > 0 && (Number(promo.times_used) + Number(promo.times_reserved)) >= promo.usage_limit) {
      throw new HttpError(400, "Promo code usage limit has been reached.");
    }
    if (Number(bookingValue) < Number(promo.min_booking_value)) {
      throw new HttpError(
        400,
        `Booking value must be at least LKR ${promo.min_booking_value} to use this promo code.`
      );
    }
    return true;
  },

  calculateDiscount: (promo, bookingValue) => {
    const val = Number(bookingValue);
    const discVal = Number(promo.discount_value);
    let discount = 0;

    if (promo.discount_type === "fixed") {
      discount = discVal;
    } else if (promo.discount_type === "percentage") {
      discount = (val * discVal) / 100;
    }

    // Discount cannot exceed original amount
    if (discount > val) {
      discount = val;
    }

    const finalAmount = Math.max(0, val - discount);
    return {
      original_amount: val.toFixed(2),
      discount_amount: discount.toFixed(2),
      final_amount: finalAmount.toFixed(2)
    };
  }
};

module.exports = PromoCode;
