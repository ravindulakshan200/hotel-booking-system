/**
 * controllers/promoController.js
 * Handles Promo Code operations (CRUD for admins, validation for customers).
 */

const PromoCode = require("../models/PromoCode");
const HttpError = require("../utils/httpError");

const validatePromoInput = (data, requireAll = true) => {
  const errors = [];
  const { code, discount_type, discount_value, start_date, end_date, usage_limit, min_booking_value, is_active } = data;

  if (requireAll || code !== undefined) {
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      errors.push("code is required and must be a non-empty string");
    }
  }

  if (requireAll || discount_type !== undefined) {
    if (!discount_type || !["fixed", "percentage"].includes(discount_type)) {
      errors.push("discount_type must be 'fixed' or 'percentage'");
    }
  }

  if (requireAll || discount_value !== undefined) {
    const val = Number(discount_value);
    if (isNaN(val) || val <= 0) {
      errors.push("discount_value must be a number greater than 0");
    } else if (discount_type === "percentage" && val > 100) {
      errors.push("percentage discount cannot exceed 100%");
    }
  }

  if (requireAll || start_date !== undefined) {
    if (!start_date || isNaN(Date.parse(start_date))) {
      errors.push("start_date is required and must be a valid date");
    }
  }

  if (requireAll || end_date !== undefined) {
    if (!end_date || isNaN(Date.parse(end_date))) {
      errors.push("end_date is required and must be a valid date");
    }
  }

  if (start_date && end_date && !isNaN(Date.parse(start_date)) && !isNaN(Date.parse(end_date))) {
    if (new Date(end_date) < new Date(start_date)) {
      errors.push("end_date must be on or after start_date");
    }
  }

  if (usage_limit !== undefined) {
    const limit = Number(usage_limit);
    if (!Number.isInteger(limit) || limit < 0) {
      errors.push("usage_limit must be a non-negative integer");
    }
  }

  if (min_booking_value !== undefined) {
    const minVal = Number(min_booking_value);
    if (isNaN(minVal) || minVal < 0) {
      errors.push("min_booking_value must be a non-negative number");
    }
  }

  if (is_active !== undefined) {
    if (typeof is_active !== "boolean") {
      errors.push("is_active must be a boolean");
    }
  }

  return { valid: errors.length === 0, errors };
};

const getAllPromos = async (req, res, next) => {
  try {
    const promos = await PromoCode.findAll();
    return res.status(200).json({
      success: true,
      message: "Promo codes fetched successfully.",
      data: { count: promos.length, promos }
    });
  } catch (error) {
    next(error);
  }
};

const getPromoById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid promo code ID." });
    }

    const promo = await PromoCode.findById(id);
    if (!promo) {
      return res.status(404).json({ success: false, message: "Promo code not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Promo code fetched successfully.",
      data: { promo }
    });
  } catch (error) {
    next(error);
  }
};

const createPromo = async (req, res, next) => {
  try {
    const { valid, errors } = validatePromoInput(req.body, true);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    const existing = await PromoCode.findByCode(req.body.code);
    if (existing) {
      return res.status(409).json({ success: false, message: "A promo code with this code already exists." });
    }

    const promoId = await PromoCode.create(req.body);
    const newPromo = await PromoCode.findById(promoId);

    const AuditLog = require("../models/AuditLog");
    await AuditLog.create({
      adminId: req.user.id,
      action: "promo_created",
      entityType: "promo",
      entityId: promoId,
      metadata: { code: req.body.code },
      ip: req.ip
    });

    return res.status(201).json({
      success: true,
      message: "Promo code created successfully.",
      data: { promo: newPromo }
    });
  } catch (error) {
    next(error);
  }
};

const updatePromo = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid promo code ID." });
    }

    const promo = await PromoCode.findById(id);
    if (!promo) {
      return res.status(404).json({ success: false, message: "Promo code not found." });
    }

    const { valid, errors } = validatePromoInput(req.body, false);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    if (req.body.code) {
      const existing = await PromoCode.findByCode(req.body.code);
      if (existing && existing.id !== id) {
        return res.status(409).json({ success: false, message: "A promo code with this code already exists." });
      }
    }

    await PromoCode.update(id, req.body);
    const updated = await PromoCode.findById(id);

    const AuditLog = require("../models/AuditLog");
    await AuditLog.create({
      adminId: req.user.id,
      action: "promo_updated",
      entityType: "promo",
      entityId: id,
      metadata: { code: updated.code, updated_fields: Object.keys(req.body) },
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: "Promo code updated successfully.",
      data: { promo: updated }
    });
  } catch (error) {
    next(error);
  }
};

const deletePromo = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid promo code ID." });
    }

    const promo = await PromoCode.findById(id);
    if (!promo) {
      return res.status(404).json({ success: false, message: "Promo code not found." });
    }

    await PromoCode.delete(id);

    const AuditLog = require("../models/AuditLog");
    await AuditLog.create({
      adminId: req.user.id,
      action: "promo_deleted",
      entityType: "promo",
      entityId: id,
      metadata: { code: promo.code },
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: "Promo code deleted successfully.",
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const validatePromoCode = async (req, res, next) => {
  try {
    const { code, booking_value } = req.body;
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return res.status(400).json({ success: false, message: "code is required." });
    }
    const val = Number(booking_value);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: "booking_value must be a positive number." });
    }

    const promo = await PromoCode.findByCode(code);
    if (!promo) {
      return res.status(404).json({ success: false, message: "Promo code not found." });
    }

    PromoCode.validateCode(promo, val);
    const calculation = PromoCode.calculateDiscount(promo, val);

    return res.status(200).json({
      success: true,
      message: "Promo code is valid.",
      data: {
        promo_id: promo.id,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        ...calculation
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPromos,
  getPromoById,
  createPromo,
  updatePromo,
  deletePromo,
  validatePromoCode
};
