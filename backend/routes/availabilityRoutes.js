/**
 * routes/availabilityRoutes.js
 * Room availability calendar route.
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { getAvailability } = require('../controllers/availabilityController');

// GET /api/v1/rooms/:id/availability?year=YYYY&month=M
router.get('/:id/availability', getAvailability);

module.exports = router;
