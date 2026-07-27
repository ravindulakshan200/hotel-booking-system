/**
 * controllers/notificationController.js
 * HTTP handlers for in-app notification endpoints.
 *
 * Security guarantees:
 *  - All handlers require the `protect` middleware — user_id always comes from
 *    req.user.id, never from the request body or URL parameters.
 *  - markOneRead enforces ownership in the SQL WHERE clause (user_id = ?).
 *  - markAllRead only touches the authenticated user's own notifications.
 */

const Notification = require('../models/Notification');

const parsePositiveInt = (val, defaultVal) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
};

// GET /api/v1/notifications
const getNotifications = async (req, res, next) => {
  try {
    const page     = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.page_size, 20);

    const result = await Notification.findByUserId(req.user.id, { page, pageSize });

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/:id/read
const markOneRead = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const updated = await Notification.markOneRead(id, req.user.id);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found, already read, or does not belong to you.',
      });
    }

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    const count = await Notification.markAllRead(req.user.id);
    return res.status(200).json({
      success: true,
      message: `Marked ${count} notification(s) as read.`,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, getUnreadCount, markOneRead, markAllRead };
