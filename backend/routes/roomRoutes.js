/**
 * routes/roomRoutes.js
 */

const express = require("express");
const router = express.Router();

const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  checkRoomAvailability,
  archiveRoom,
  unarchiveRoom,
} = require("../controllers/roomController");

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

router.route("/")
  .get(getAllRooms)
  .post(protect, adminOnly, createRoom);

router.route("/:id")
  .get(getRoomById)
  .put(protect, adminOnly, updateRoom)
  .delete(protect, adminOnly, deleteRoom);

router.patch("/:id/archive", protect, adminOnly, archiveRoom);
router.patch("/:id/unarchive", protect, adminOnly, unarchiveRoom);

router.get("/:id/availability", checkRoomAvailability);

module.exports = router;
