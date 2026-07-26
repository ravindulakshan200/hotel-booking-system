const { randomUUID } = require("crypto");
const pool = require("../config/db");
const HttpError = require("../utils/httpError");
const { calculateNights } = require("../utils/dateUtils");

const lockBookableRoom = async (connection, roomId) => {
  const [rooms] = await connection.query(
    `SELECT id, price_per_night, availability_status
     FROM rooms
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [roomId]
  );

  const room = rooms[0];
  if (!room) throw new HttpError(404, "Room not found.");
  if (room.availability_status !== "available") {
    throw new HttpError(409, "Room is not currently bookable.");
  }
  return room;
};

const assertNoOverlap = async (connection, roomId, checkIn, checkOut) => {
  const [rows] = await connection.query(
    `SELECT id
     FROM bookings
     WHERE room_id = ?
       AND booking_status NOT IN ('cancelled', 'expired', 'refunded', 'checked_out', 'completed')
       AND (booking_status != 'pending' OR expires_at IS NULL OR expires_at > NOW())
       AND check_in < ?
       AND check_out > ?
     LIMIT 1`,
    [roomId, checkOut, checkIn]
  );

  if (rows.length > 0) {
    throw new HttpError(409, "Room is not available for the selected dates.");
  }
};

const insertBooking = async (
  connection,
  { userId, roomId, checkIn, checkOut, pricePerNight, status, expiresAt = null, promoCodeId = null, promoReserved = false, originalAmount = null, discountAmount = null, finalAmount = null }
) => {
  const nights = calculateNights(checkIn, checkOut);
  const basePrice = Number(pricePerNight) * nights;

  const orig = originalAmount !== null ? Number(originalAmount) : basePrice;
  const disc = discountAmount !== null ? Number(discountAmount) : 0.00;
  const fin = finalAmount !== null ? Number(finalAmount) : basePrice;

  const totalPrice = fin.toFixed(2);
  const [result] = await connection.query(
    `INSERT INTO bookings
       (user_id, room_id, check_in, check_out, total_price, booking_status, expires_at, promo_code_id, promo_reserved, original_amount, discount_amount, final_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, roomId, checkIn, checkOut, totalPrice, status, expiresAt, promoCodeId, promoReserved ? 1 : 0, orig.toFixed(2), disc.toFixed(2), totalPrice]
  );

  return { bookingId: result.insertId, totalPrice };
};

const Booking = {
  findAll: async (filters = {}) => {
    let sql = `
      SELECT
        b.*,
        u.first_name,
        u.last_name,
        u.email AS guest_email,
        r.room_number,
        r.room_type,
        r.price_per_night,
        h.id AS hotel_id,
        h.name AS hotel_name,
        h.city AS hotel_city
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
    `;
    const params = [];
    const conditions = [];

    if (filters.user_id) {
      conditions.push("b.user_id = ?");
      params.push(filters.user_id);
    }
    if (filters.room_id) {
      conditions.push("b.room_id = ?");
      params.push(filters.room_id);
    }
    if (filters.booking_status) {
      conditions.push("b.booking_status = ?");
      params.push(filters.booking_status);
    }
    if (typeof filters.search === "string" && filters.search.trim()) {
      conditions.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR h.name LIKE ?)");
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    if (conditions.length > 0) sql += ` WHERE ${conditions.join(" AND ")}`;
    sql += " ORDER BY b.created_at DESC";

    if (filters.limit) {
      const limit = Math.min(Math.max(Number.parseInt(filters.limit, 10) || 20, 1), 100);
      sql += " LIMIT ?";
      params.push(limit);
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  findByUserId: async (userId) => {
    const [rows] = await pool.query(
      `SELECT b.*, r.room_number, r.room_type, r.price_per_night,
              h.id AS hotel_id, h.name AS hotel_name, h.city AS hotel_city
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query(
      `SELECT b.*, u.first_name, u.last_name, u.email AS guest_email,
              r.room_number, r.room_type, r.price_per_night,
              h.id AS hotel_id, h.name AS hotel_name, h.city AS hotel_city
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hotels h ON r.hotel_id = h.id
       WHERE b.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  createWithAvailability: async ({ user_id, room_id, check_in, check_out, promo_code }) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const room = await lockBookableRoom(connection, room_id);
      await assertNoOverlap(connection, room_id, check_in, check_out);

      let promoCodeId = null;
      let originalAmount = null;
      let discountAmount = null;
      let finalAmount = null;

      if (promo_code) {
        const PromoCode = require("./PromoCode");
        const [promoRows] = await connection.query(
          "SELECT * FROM promo_codes WHERE code = ? FOR UPDATE",
          [promo_code]
        );
        const promo = promoRows[0];
        if (!promo) {
          throw new HttpError(404, "Promo code not found.");
        }
        const nights = calculateNights(check_in, check_out);
        const basePrice = Number(room.price_per_night) * nights;
        PromoCode.validateCode(promo, basePrice);
        const calculation = PromoCode.calculateDiscount(promo, basePrice);
        promoCodeId = promo.id;
        originalAmount = calculation.original_amount;
        discountAmount = calculation.discount_amount;
        finalAmount = calculation.final_amount;

        // Reserve slot atomically
        await PromoCode.reserveUsage(connection, promoCodeId);
      }

      const { bookingId } = await insertBooking(connection, {
        userId: user_id,
        roomId: room_id,
        checkIn: check_in,
        checkOut: check_out,
        pricePerNight: room.price_per_night,
        status: "pending",
        expiresAt: new Date(Date.now() + 15 * 60000), // 15 mins
        promoCodeId,
        promoReserved: promoCodeId ? true : false,
        originalAmount,
        discountAmount,
        finalAmount
      });

      try {
        const EmailOutbox = require("./EmailOutbox");
        await EmailOutbox.enqueueEmailEvent(connection, {
          eventKey: `booking_created_${bookingId}`,
          eventType: 'booking_created',
          recipientUserId: user_id,
          payload: { bookingId }
        });
      } catch (err) {
        console.error("Failed to enqueue email event (booking_created):", err.message);
      }

      await connection.commit();
      return bookingId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  checkoutDemo: async ({ user_id, room_id, check_in, check_out, payment_method, promo_code }) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const room = await lockBookableRoom(connection, room_id);
      await assertNoOverlap(connection, room_id, check_in, check_out);

      let promoCodeId = null;
      let originalAmount = null;
      let discountAmount = null;
      let finalAmount = null;

      if (promo_code) {
        const PromoCode = require("./PromoCode");
        const [promoRows] = await connection.query(
          "SELECT * FROM promo_codes WHERE code = ? FOR UPDATE",
          [promo_code]
        );
        const promo = promoRows[0];
        if (!promo) {
          throw new HttpError(404, "Promo code not found.");
        }
        const nights = calculateNights(check_in, check_out);
        const basePrice = Number(room.price_per_night) * nights;
        PromoCode.validateCode(promo, basePrice);
        const calculation = PromoCode.calculateDiscount(promo, basePrice);
        promoCodeId = promo.id;
        originalAmount = calculation.original_amount;
        discountAmount = calculation.discount_amount;
        finalAmount = calculation.final_amount;
      }

      const { bookingId, totalPrice } = await insertBooking(connection, {
        userId: user_id,
        roomId: room_id,
        checkIn: check_in,
        checkOut: check_out,
        pricePerNight: room.price_per_night,
        status: "confirmed",
        promoCodeId,
        originalAmount,
        discountAmount,
        finalAmount
      });

      if (promoCodeId) {
        const PromoCode = require("./PromoCode");
        await PromoCode.incrementUsage(connection, promoCodeId);
      }

      const transactionReference = `DEMO-${Date.now()}-${randomUUID()}`;
      const [paymentResult] = await connection.query(
        `INSERT INTO payments
           (booking_id, payment_method, amount, payment_status, transaction_reference, original_amount, discount_amount, final_amount)
         VALUES (?, ?, ?, 'completed', ?, ?, ?, ?)`,
        [bookingId, payment_method, totalPrice, transactionReference, originalAmount || totalPrice, discountAmount || 0.00, finalAmount || totalPrice]
      );

      try {
        const EmailOutbox = require("./EmailOutbox");
        await EmailOutbox.enqueueEmailEvent(connection, {
          eventKey: `booking_confirmed_${bookingId}`,
          eventType: 'booking_confirmed',
          recipientUserId: user_id,
          payload: { bookingId }
        });
      } catch (err) {
        console.error("Failed to enqueue email event (booking_confirmed):", err.message);
      }

      await connection.commit();
      return { bookingId, paymentId: paymentResult.insertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  cancelAtomic: async (id, { actorUserId, isAdmin = false } = {}) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
       const [rows] = await connection.query(
        "SELECT id, user_id, booking_status, refund_status, promo_code_id, promo_reserved FROM bookings WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      const booking = rows[0];

      if (!booking) throw new HttpError(404, "Booking not found.");
      if (!isAdmin && booking.user_id !== actorUserId) {
        throw new HttpError(403, "Access denied. You do not own this booking.");
      }
      if (booking.booking_status === "cancelled") {
        throw new HttpError(400, "Booking is already cancelled.");
      }
      if (booking.booking_status === "completed") {
        throw new HttpError(400, "Cannot cancel a completed booking.");
      }

      const [paymentRows] = await connection.query(
        `SELECT id FROM payments WHERE booking_id = ? AND payment_status = 'completed' LIMIT 1`,
        [id]
      );

      const refundRequired = paymentRows.length > 0;
      const newStatus = 'cancelled';

      let refundStatusUpdate = "";
      if (refundRequired && booking.refund_status === 'not_required') {
         refundStatusUpdate = ", refund_status = 'required', refund_requested_at = NOW()";
      }

      // Release promo code reservation or usage
      if (booking.promo_code_id) {
        const PromoCode = require("./PromoCode");
        if (booking.booking_status === "pending" && booking.promo_reserved) {
          await PromoCode.releaseReservation(connection, booking.promo_code_id);
        } else if (booking.booking_status === "confirmed") {
          await PromoCode.releaseUsage(connection, booking.promo_code_id);
        }
      }

      await connection.query(
        `UPDATE bookings SET
           booking_status = ?,
           cancelled_at = NOW(),
           cancelled_by_user_id = ?,
           cancellation_reason = ?,
           promo_reserved = FALSE${refundStatusUpdate}
         WHERE id = ?`,
        [newStatus, actorUserId, isAdmin ? 'Cancelled by admin' : 'Cancelled by user', id]
      );

      try {
        const EmailOutbox = require("./EmailOutbox");
        const eventType = refundRequired ? 'refund_required' : 'booking_cancelled';
        await EmailOutbox.enqueueEmailEvent(connection, {
          eventKey: `${eventType}_${id}`,
          eventType: eventType,
          recipientUserId: booking.user_id,
          payload: { bookingId: id }
        });
      } catch (err) {
        console.error(`Failed to enqueue email event for cancellation (refundRequired: ${refundRequired}):`, err.message);
      }

      await connection.commit();
      return { refundRequired, newStatus };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateStatusAtomic: async (id, status, metadata = {}) => {
    const allowedTransitions = {
      pending: ["confirmed", "cancelled", "expired"],
      confirmed: ["checked_in", "cancelled", "no_show", "refunded", "completed"],
      checked_in: ["checked_out", "completed"],
      checked_out: [],
      cancelled: ["refunded"],
      no_show: [],
      expired: [],
      refunded: [],
      completed: [],
    };
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT id, booking_status, refund_status FROM bookings WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      const booking = rows[0];

      if (!booking) throw new HttpError(404, "Booking not found.");
      if (!allowedTransitions[booking.booking_status]?.includes(status)) {
        throw new HttpError(
          409,
          `Cannot change booking from '${booking.booking_status}' to '${status}'.`
        );
      }

      let refundRequired = false;
      let refundStatusUpdate = "";
      if (status === "cancelled") {
        const [paymentRows] = await connection.query(
          `SELECT id FROM payments WHERE booking_id = ? AND payment_status = 'completed' LIMIT 1`,
          [id]
        );
        refundRequired = paymentRows.length > 0;
        if (refundRequired && booking.refund_status === 'not_required') {
          refundStatusUpdate = ", refund_status = 'required', refund_requested_at = NOW()";
        }
      }

      let updateQuery = "UPDATE bookings SET booking_status = ?";
      const updateParams = [status];

      if (status === "checked_in") {
        updateQuery += ", checked_in_at = NOW()";
      } else if (status === "checked_out" || status === "completed") {
        updateQuery += ", checked_out_at = NOW()";
      } else if (status === "no_show") {
        updateQuery += ", no_show_at = NOW()";
      } else if (status === "cancelled" || status === "refunded") {
        updateQuery += ", cancelled_at = NOW(), cancellation_reason = ?, cancelled_by_user_id = ?";
        if (status === "cancelled") updateQuery += refundStatusUpdate;
        updateParams.push(metadata.reason || null, metadata.actorUserId || null);
      }

      updateQuery += " WHERE id = ?";
      updateParams.push(id);

      await connection.query(updateQuery, updateParams);

      try {
        const EmailOutbox = require("./EmailOutbox");
        if (status === "cancelled") {
          const eventType = refundRequired ? 'refund_required' : 'booking_cancelled';
          await EmailOutbox.enqueueEmailEvent(connection, {
            eventKey: `${eventType}_${id}`,
            eventType: eventType,
            recipientUserId: booking.user_id,
            payload: { bookingId: id }
          });
        } else if (status === "confirmed") {
          await EmailOutbox.enqueueEmailEvent(connection, {
            eventKey: `booking_confirmed_${id}`,
            eventType: 'booking_confirmed',
            recipientUserId: booking.user_id,
            payload: { bookingId: id }
          });
        }
      } catch (err) {
        console.error(`Failed to enqueue email event for status transition to ${status}:`, err.message);
      }

      await connection.commit();
      return { refundRequired, newStatus: status };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  isRoomAvailable: async (roomId, checkIn, checkOut) => {
    const [rooms] = await pool.query(
      "SELECT availability_status, is_archived FROM rooms WHERE id = ? LIMIT 1",
      [roomId]
    );
    if (!rooms[0] || rooms[0].availability_status !== "available" || rooms[0].is_archived) return false;

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS overlapCount
       FROM bookings
       WHERE room_id = ?
         AND booking_status NOT IN ('cancelled', 'expired', 'refunded', 'checked_out', 'completed')
         AND (booking_status != 'pending' OR expires_at IS NULL OR expires_at > NOW())
         AND check_in < ?
         AND check_out > ?`,
      [roomId, checkOut, checkIn]
    );
    return Number(rows[0].overlapCount) === 0;
  },

  expirePendingBookings: async () => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [expiredBookings] = await connection.query(
        `SELECT id, promo_code_id, promo_reserved FROM bookings
         WHERE booking_status = 'pending' AND expires_at <= NOW()
         FOR UPDATE`
      );

      if (expiredBookings.length === 0) {
        await connection.commit();
        return 0;
      }

      const bookingIds = expiredBookings.map(b => b.id);

      const PromoCode = require("./PromoCode");
      for (const booking of expiredBookings) {
        if (booking.promo_code_id && booking.promo_reserved) {
          await PromoCode.releaseReservation(connection, booking.promo_code_id);
        }
      }

      await connection.query(
        `UPDATE bookings
         SET booking_status = 'expired', promo_reserved = FALSE
         WHERE id IN (?)`,
        [bookingIds]
      );

      await connection.commit();
      return expiredBookings.length;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  expireBookingById: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT id, promo_code_id, promo_reserved, booking_status FROM bookings
         WHERE id = ? LIMIT 1 FOR UPDATE`,
        [id]
      );
      const booking = rows[0];
      if (booking && booking.booking_status === 'pending') {
        const PromoCode = require("./PromoCode");
        if (booking.promo_code_id && booking.promo_reserved) {
          await PromoCode.releaseReservation(connection, booking.promo_code_id);
        }
        await connection.query(
          "UPDATE bookings SET booking_status = 'expired', promo_reserved = FALSE WHERE id = ?",
          [id]
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  hasCompletedStay: async (userId, hotelId) => {
    const [rows] = await pool.query(
      `SELECT b.id
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.user_id = ? AND r.hotel_id = ? AND b.booking_status = 'completed'
       LIMIT 1`,
      [userId, hotelId]
    );
    return rows.length > 0;
  },

  getMonthlyRevenue: async () => {
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(b.created_at, '%Y-%m') AS month,
             DATE_FORMAT(b.created_at, '%b %Y') AS label,
             COALESCE(SUM(p.amount), 0) AS revenue,
             COUNT(DISTINCT b.id) AS bookings
      FROM bookings b
      LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'completed'
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(b.created_at, '%Y-%m'), DATE_FORMAT(b.created_at, '%b %Y')
      ORDER BY month ASC
    `);
    return rows;
  },

  updateRefundAtomic: async (id, { refundStatus, providerRef, reason, adminNotes }) => {
    const allowedStatuses = ["not_required", "required", "processing", "completed", "rejected", "failed"];
    if (!allowedStatuses.includes(refundStatus)) {
      throw new HttpError(400, "Invalid refund status.");
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        "SELECT id, booking_status, refund_status, user_id FROM bookings WHERE id = ? LIMIT 1 FOR UPDATE",
        [id]
      );
      const booking = rows[0];
      if (!booking) throw new HttpError(404, "Booking not found.");

      const currentStatus = booking.refund_status;
      if (currentStatus !== refundStatus) {
        if (currentStatus === "completed") {
          throw new HttpError(400, "Cannot change status of a completed refund.");
        }
        if (currentStatus === "rejected") {
          throw new HttpError(400, "Cannot change status of a rejected refund.");
        }
        if (currentStatus === "not_required") {
          throw new HttpError(400, "Refund is not required for this booking.");
        }
        if (refundStatus === "completed" && !providerRef && !booking.refund_provider_reference) {
          throw new HttpError(400, "Provider reference is required to complete a refund.");
        }
      }

      let updateQuery = "UPDATE bookings SET refund_status = ?";
      const params = [refundStatus];

      if (refundStatus === "processing") {
        updateQuery += ", refund_processing_at = NOW()";
      } else if (refundStatus === "completed") {
        updateQuery += ", refund_completed_at = NOW()";
        // Also update linked payment to refunded if completed
        await connection.query(
          "UPDATE payments SET payment_status = 'refunded' WHERE booking_id = ?",
          [id]
        );
      } else if (refundStatus === "rejected") {
        updateQuery += ", refund_rejected_at = NOW()";
      } else if (refundStatus === "failed") {
        updateQuery += ", refund_failed_at = NOW()";
      }

      if (providerRef !== undefined) {
        updateQuery += ", refund_provider_reference = ?";
        params.push(providerRef);
      }
      if (reason !== undefined) {
        updateQuery += ", refund_reason = ?";
        params.push(reason);
      }
      if (adminNotes !== undefined) {
        updateQuery += ", refund_admin_notes = ?";
        params.push(adminNotes);
      }

      updateQuery += " WHERE id = ?";
      params.push(id);

      await connection.query(updateQuery, params);

      // Enqueue email outbox event
      try {
        const EmailOutbox = require("./EmailOutbox");
        let eventType = null;
        if (refundStatus === "processing") eventType = "refund_processing";
        else if (refundStatus === "completed") eventType = "refund_completed";
        else if (refundStatus === "rejected") eventType = "refund_rejected";
        else if (refundStatus === "failed") eventType = "refund_failed";

        if (eventType) {
          await EmailOutbox.enqueueEmailEvent(connection, {
            eventKey: `refund_${refundStatus}_${id}`,
            eventType: eventType,
            recipientUserId: booking.user_id,
            payload: { bookingId: id }
          });
        }
      } catch (err) {
        console.error("Failed to enqueue email event for refund update:", err.message);
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
};

module.exports = Booking;
