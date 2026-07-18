/**
 * controllers/roomController.js
 *
 * Handles all Room HTTP requests.
 */

const Room = require("../models/Room");
const Hotel = require("../models/Hotel");
const { validateBookingInput } = require("../utils/validators");

const validateRoomInput = ({ hotel_id, room_number, room_type, price_per_night, capacity, availability_status }, requireAll = true) => {
  const errors = [];

  if (requireAll || hotel_id !== undefined) {
    if (!Number.isInteger(Number(hotel_id)) || Number(hotel_id) < 1) {
      errors.push("Valid hotel_id is required");
    }
  }

  if (requireAll || room_number !== undefined) {
    if (!room_number || typeof room_number !== "string" || room_number.trim().length === 0) {
      errors.push("room_number is required");
    } else if (room_number.trim().length > 20) {
      errors.push("room_number must not exceed 20 characters");
    }
  }

  if (requireAll || room_type !== undefined) {
    const validTypes = ['single', 'double', 'suite', 'deluxe'];
    if (!validTypes.includes(room_type)) {
      errors.push("room_type must be one of: single, double, suite, deluxe");
    }
  }

  if (requireAll || price_per_night !== undefined) {
    if (!Number.isFinite(Number(price_per_night)) || Number(price_per_night) <= 0) {
      errors.push("A valid positive price_per_night is required");
    }
  }

  if (requireAll || capacity !== undefined) {
    if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 20) {
      errors.push("capacity must be a positive integer");
    }
  }
  
  if (requireAll || availability_status !== undefined) {
    const validStatuses = ['available', 'booked', 'maintenance'];
    if (!validStatuses.includes(availability_status)) {
      errors.push("availability_status must be one of: available, booked, maintenance");
    }
  }

  return { valid: errors.length === 0, errors };
};

const getAllRooms = async (req, res, next) => {
  try {
    const { hotel_id, room_type, availability_status } = req.query;
    const validTypes = ["single", "double", "suite", "deluxe"];
    const validStatuses = ["available", "booked", "maintenance"];
    if (hotel_id && (!Number.isInteger(Number(hotel_id)) || Number(hotel_id) < 1)) {
      return res.status(400).json({ success: false, message: "Invalid hotel_id filter." });
    }
    if (room_type && !validTypes.includes(room_type)) {
      return res.status(400).json({ success: false, message: "Invalid room_type filter." });
    }
    if (availability_status && !validStatuses.includes(availability_status)) {
      return res.status(400).json({ success: false, message: "Invalid availability_status filter." });
    }
    const rooms = await Room.findAll({ hotel_id, room_type, availability_status });

    return res.status(200).json({
      success: true,
      message: rooms.length > 0 ? "Rooms fetched successfully." : "No rooms found.",
      data: {
        count: rooms.length,
        rooms,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getRoomById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid room ID." });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Room fetched successfully.",
      data: { room },
    });
  } catch (error) {
    next(error);
  }
};

const createRoom = async (req, res, next) => {
  try {
    const { hotel_id, room_number, room_type, price_per_night, capacity, availability_status, image_url } = req.body;

    const { valid, errors } = validateRoomInput({ hotel_id, room_number, room_type, price_per_night, capacity, availability_status }, true);
    if (image_url) {
      try {
        const parsedUrl = new URL(image_url);
        if (!["http:", "https:"].includes(parsedUrl.protocol) || image_url.length > 500) {
          errors.push("image_url must be a valid HTTP(S) URL of at most 500 characters");
        }
      } catch (error) {
        errors.push("image_url must be a valid HTTP(S) URL of at most 500 characters");
      }
    }
    if (!valid || errors.length > 0) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    // Validate hotel exists
    const hotel = await Hotel.findById(hotel_id);
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found. Cannot create room." });
    }

    const newRoomId = await Room.create({ hotel_id, room_number, room_type, price_per_night, capacity, availability_status, image_url });
    const newRoom = await Room.findById(newRoomId);

    return res.status(201).json({
      success: true,
      message: "Room created successfully.",
      data: { room: newRoom },
    });
  } catch (error) {
    // Handle composite unique key violation
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "Room number already exists for this hotel." });
    }
    next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid room ID." });
    }

    const existing = await Room.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    const { hotel_id, room_number, room_type, price_per_night, capacity, availability_status, image_url } = req.body;

    const providedFields = { hotel_id, room_number, room_type, price_per_night, capacity, availability_status, image_url };
    const hasAnyField = Object.values(providedFields).some(v => v !== undefined && v !== null);

    if (!hasAnyField) {
      return res.status(400).json({ success: false, message: "Provide at least one field to update." });
    }

    const { valid, errors } = validateRoomInput(providedFields, false);
    if (image_url) {
      try {
        const parsedUrl = new URL(image_url);
        if (!["http:", "https:"].includes(parsedUrl.protocol) || image_url.length > 500) {
          errors.push("image_url must be a valid HTTP(S) URL of at most 500 characters");
        }
      } catch (error) {
        errors.push("image_url must be a valid HTTP(S) URL of at most 500 characters");
      }
    }
    if (!valid || errors.length > 0) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    if (hotel_id !== undefined && Number(hotel_id) !== Number(existing.hotel_id)) {
      const hotel = await Hotel.findById(Number(hotel_id));
      if (!hotel) {
        return res.status(404).json({ success: false, message: "Hotel not found. Cannot update room to this hotel." });
      }
    }

    await Room.update(id, providedFields);
    const updatedRoom = await Room.findById(id);

    return res.status(200).json({
      success: true,
      message: "Room updated successfully.",
      data: { room: updatedRoom },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "Room number already exists for this hotel." });
    }
    next(error);
  }
};

const deleteRoom = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid room ID." });
    }

    const existing = await Room.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    await Room.delete(id);

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully.",
      data: null,
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete room. Remove all bookings linked to this room first.",
      });
    }
    next(error);
  }
};

const checkRoomAvailability = async (req, res, next) => {
  try {
    const roomId = parseInt(req.params.id, 10);
    const { check_in, check_out } = req.query;

    if (isNaN(roomId) || roomId < 1) {
      return res.status(400).json({ success: false, message: "Invalid room ID." });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    if (!check_in || !check_out) {
      return res.status(200).json({
        success: true,
        message: "Room status fetched.",
        data: {
          available: room.availability_status === "available",
          availability_status: room.availability_status,
        },
      });
    }

    const dateValidation = validateBookingInput({ room_id: roomId, check_in, check_out });
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: dateValidation.errors,
      });
    }

    const Booking = require("../models/Booking");
    const isAvailable = await Booking.isRoomAvailable(roomId, check_in, check_out);

    return res.status(200).json({
      success: true,
      message: isAvailable ? "Room is available for selected dates." : "Room is not available for selected dates.",
      data: { available: isAvailable && room.availability_status === "available" },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  checkRoomAvailability,
};
