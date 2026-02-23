const express = require("express");
const { body, validationResult } = require("express-validator");
const Procurement = require("../models/procurement");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();
const alphaNumericWithSpaces = /^[a-zA-Z0-9 ]+$/;
const time24h = /^([01]\d|2[0-3]):([0-5]\d)$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;

/**
 * @swagger
 * /procurement:
 *   post:
 *     summary: Record procurement (Manager only)
 *     tags:
 *       - Procurement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produceName
 *               - produceType
 *               - date
 *               - time
 *               - tonnage
 *               - cost
 *               - dealerName
 *               - branch
 *               - contact
 *               - sellingPrice
 *             properties:
 *               produceName:
 *                 type: string
 *                 example: Tomatoes1
 *               produceType:
 *                 type: string
 *                 example: Tomatoes
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2026-02-23
 *               time:
 *                 type: string
 *                 example: "14:30"
 *               tonnage:
 *                 type: number
 *                 minimum: 100
 *               cost:
 *                 type: number
 *                 minimum: 10000
 *               dealerName:
 *                 type: string
 *                 example: Dealer12
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
 *               contact:
 *                 type: string
 *                 example: "+256701234567"
 *               sellingPrice:
 *                 type: number
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Procurement recorded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Access denied
 */
router.post(
  "/",
  auth,
  role("Manager"),
  [
    body("produceName")
      .trim()
      .matches(alphaNumericWithSpaces)
      .withMessage("produceName must be alphanumeric"),
    body("produceType")
      .trim()
      .isLength({ min: 2 })
      .withMessage("produceType must have at least 2 characters")
      .matches(/^[A-Za-z]+$/)
      .withMessage("produceType must contain alphabetic characters only"),
    body("date")
      .notEmpty()
      .withMessage("date is required")
      .isISO8601()
      .withMessage("date must be a valid date"),
    body("time")
      .notEmpty()
      .withMessage("time is required")
      .matches(time24h)
      .withMessage("time must be in HH:mm format"),
    body("tonnage")
      .isNumeric()
      .withMessage("tonnage must be numeric")
      .isFloat({ min: 100 })
      .withMessage("tonnage must be at least 100kg"),
    body("cost")
      .isNumeric()
      .withMessage("cost must be numeric")
      .isFloat({ min: 10000 })
      .withMessage("cost must be at least 10000"),
    body("dealerName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("dealerName must have at least 2 characters")
      .matches(alphaNumericWithSpaces)
      .withMessage("dealerName must be alphanumeric"),
    body("branch")
      .isIn(["Maganjo", "Matugga"])
      .withMessage("branch must be Maganjo or Matugga"),
    body("contact")
      .trim()
      .matches(phoneRegex)
      .withMessage("contact must be a valid phone number"),
    body("sellingPrice")
      .isNumeric()
      .withMessage("sellingPrice must be numeric")
      .isFloat({ min: 1 })
      .withMessage("sellingPrice must be greater than 0")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const procurement = await Procurement.create({
      produceName: req.body.produceName,
      produceType: req.body.produceType,
      date: req.body.date,
      time: req.body.time,
      tonnage: req.body.tonnage,
      cost: req.body.cost,
      dealerName: req.body.dealerName,
      branch: req.body.branch,
      contact: req.body.contact,
      sellingPrice: req.body.sellingPrice
    });
    res.status(201).json(procurement);
  }
);

module.exports = router;
