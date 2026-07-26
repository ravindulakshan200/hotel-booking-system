/**
 * routes/notificationRoutes.js
 * In-app notification endpoints — all require authentication.
 *
 * PATCH /read-all must be registered before PATCH /:id/read so that Express
 * does not treat "read-all" as an id parameter.
 */

const express = require('express');
const router  = express.Router();

const {
  getNotifications,
  getUnreadCount,
  markOneRead,
  markAllRead,
} = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

// All notification routes require a valid JWT session
router.use(protect);

router.get('/',              getNotifications);
router.get('/unread-count',  getUnreadCount);
router.patch('/read-all',    markAllRead);        // Must come BEFORE /:id/read
router.patch('/:id/read',    markOneRead);

module.exports = router;
