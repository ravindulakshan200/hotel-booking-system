/**
 * controllers/hotelController.js
 *
 * Handles all Hotel HTTP requests.
 *
 * Routes (mounted at /api/v1/hotels):
 *   GET    /              — List all hotels           (Public)
 *   GET    /:id           — Get a single hotel        (Public)
 *   POST   /              — Create a hotel            (Admin)
 *   PUT    /:id           — Update a hotel            (Admin)
 *   DELETE /:id           — Delete a hotel            (Admin)
 *
 * All responses follow the project-wide format:
 *   Success: { success: true,  message: "...", data: { ... } }
 *   Failure: { success: false, message: "..." }
 */

const Hotel = require("../models/Hotel");
const { validateAvailabilitySearch } = require("../utils/validators");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate hotel input fields.
 * Returns { valid: boolean, errors: string[] }
 */
const validateHotelInput = ({ name, address, city }, requireAll = true) => {
  const errors = [];

  if (requireAll || name !== undefined) {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("name is required");
    } else if (name.trim().length > 150) {
      errors.push("name must not exceed 150 characters");
    }
  }

  if (requireAll || address !== undefined) {
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      errors.push("address is required");
    } else if (address.trim().length > 255) {
      errors.push("address must not exceed 255 characters");
    }
  }

  if (requireAll || city !== undefined) {
    if (!city || typeof city !== "string" || city.trim().length === 0) {
      errors.push("city is required");
    } else if (city.trim().length > 100) {
      errors.push("city must not exceed 100 characters");
    }
  }

  return { valid: errors.length === 0, errors };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL HOTELS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all hotels (with optional city / search filter)
 * @route   GET /api/v1/hotels
 * @access  Public
 * @query   ?city=Miami | ?search=grand
 */
const getAllHotels = async (req, res, next) => {
  try {
    const { city, search } = req.query;
    if ((city && typeof city !== "string") || (search && typeof search !== "string")) {
      return res.status(400).json({ success: false, message: "city and search filters must be text." });
    }
    if ((city && city.length > 100) || (search && search.length > 150)) {
      return res.status(400).json({ success: false, message: "Search filter is too long." });
    }
    const hotels = await Hotel.findAll({ city, search });

    return res.status(200).json({
      success: true,
      message: hotels.length > 0 ? "Hotels fetched successfully." : "No hotels found.",
      data: {
        count: hotels.length,
        hotels,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH AVAILABLE HOTELS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Search available hotels
 * @route   GET /api/v1/hotels/availability
 * @access  Public
 */
const searchAvailability = async (req, res, next) => {
  try {
    const { city, check_in, check_out, guests, room_type, min_price, max_price, sort } = req.query;

    const { valid, errors } = validateAvailabilitySearch({ check_in, check_out, guests, min_price, max_price });
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    const validTypes = ["single", "double", "suite", "deluxe"];
    if (room_type && !validTypes.includes(room_type)) {
      return res.status(400).json({ success: false, message: "Invalid room_type filter." });
    }

    const validSorts = ["price_low", "price_high", "name"];
    if (sort && !validSorts.includes(sort)) {
      return res.status(400).json({ success: false, message: "Invalid sort option." });
    }

    const hotels = await Hotel.findAvailable({
      city,
      check_in,
      check_out,
      guests: Number(guests),
      room_type,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      sort
    });

    return res.status(200).json({
      success: true,
      message: hotels.length > 0 ? "Hotels found." : "No hotels available for selected criteria.",
      data: {
        count: hotels.length,
        hotels,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET HOTEL BY ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get a single hotel by ID
 * @route   GET /api/v1/hotels/:id
 * @access  Public
 */
const getHotelById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID.",
      });
    }

    const hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotel fetched successfully.",
      data: { hotel },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE HOTEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Create a new hotel
 * @route   POST /api/v1/hotels
 * @access  Admin
 */
const createHotel = async (req, res, next) => {
  try {
    const { name, address, city, description } = req.body;

    // Validate required fields
    const { valid, errors } = validateHotelInput({ name, address, city }, true);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    // Insert and retrieve the new record
    const newHotelId = await Hotel.create({ name, address, city, description });
    const newHotel   = await Hotel.findById(newHotelId);

    return res.status(201).json({
      success: true,
      message: "Hotel created successfully.",
      data: { hotel: newHotel },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE HOTEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Update an existing hotel
 * @route   PUT /api/v1/hotels/:id
 * @access  Admin
 */
const updateHotel = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID.",
      });
    }

    // Confirm the hotel exists before updating
    const existing = await Hotel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found.",
      });
    }

    const { name, address, city, description } = req.body;

    // At least one field must be provided
    const providedFields = { name, address, city, description };
    const hasAnyField = Object.values(providedFields).some(
      (v) => v !== undefined && v !== null
    );

    if (!hasAnyField) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update (name, address, city, description).",
      });
    }

    // Validate only the fields that were provided (partial update)
    const { valid, errors } = validateHotelInput(
      { name, address, city },
      false // requireAll = false → only validate fields present in body
    );
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    await Hotel.update(id, { name, address, city, description });

    // Return the fully updated record
    const updatedHotel = await Hotel.findById(id);

    return res.status(200).json({
      success: true,
      message: "Hotel updated successfully.",
      data: { hotel: updatedHotel },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE HOTEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Delete a hotel by ID
 * @route   DELETE /api/v1/hotels/:id
 * @access  Admin
 *
 * Note: Will return 409 Conflict if rooms are still linked to this hotel
 * (enforced by the FK constraint in MySQL).
 */
const deleteHotel = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID.",
      });
    }

    // Confirm the hotel exists before attempting delete
    const existing = await Hotel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found.",
      });
    }

    await Hotel.delete(id);

    return res.status(200).json({
      success: true,
      message: "Hotel deleted successfully.",
      data: null,
    });
  } catch (error) {
    // MySQL FK constraint violation (ER_ROW_IS_REFERENCED_2)
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete hotel. Remove all rooms linked to this hotel first.",
      });
    }
    next(error);
  }
};

module.exports = {
  getAllHotels,
  searchAvailability,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
};
