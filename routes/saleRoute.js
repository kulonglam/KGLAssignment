const express = require("express");
const { body, validationResult } = require("express-validator");
const Sale = require("../models/sales");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const router = express.Router();
const alphaNumericWithSpaces = /^[a-zA-Z0-9 ]+$/;
const ninRegex = /^[A-Z]{2}[A-Z0-9]{12}$/i;
const phoneRegex = /^\+?[0-9]{10,15}$/;
const time24h = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * @swagger
 * /sales/cash:
 *   post:
 *     summary: Record cash sale
 *     tags:
 *       - Sales
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produceName
 *               - tonnage
 *               - amountPaid
 *               - buyerName
 *               - salesAgentName
 *               - date
 *               - time
 *             properties:
 *               produceName:
 *                 type: string
 *                 example: Tomatoes1
 *               tonnage:
 *                 type: number
 *                 minimum: 1
 *               amountPaid:
 *                 type: number
 *                 minimum: 10000
 *               buyerName:
 *                 type: string
 *                 example: Buyer23
 *               salesAgentName:
 *                 type: string
 *                 example: Agent11
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2026-02-23
 *               time:
 *                 type: string
 *                 example: "15:10"
 *     responses:
 *       201:
 *         description: Cash sale recorded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Sales agent role required
 */

router.post(
  "/cash",
  auth,
  role("SalesAgent"),
  [
    body("produceName")
      .trim()
      .matches(alphaNumericWithSpaces)
      .withMessage("produceName must be alphanumeric"),
    body("tonnage")
      .isNumeric()
      .withMessage("tonnage must be numeric")
      .isFloat({ min: 1 })
      .withMessage("tonnage must be greater than 0"),
    body("amountPaid")
      .isNumeric()
      .withMessage("amountPaid must be numeric")
      .isFloat({ min: 10000 })
      .withMessage("amountPaid must be at least 10000"),
    body("buyerName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("buyerName must have at least 2 characters")
      .matches(alphaNumericWithSpaces)
      .withMessage("buyerName must be alphanumeric"),
    body("salesAgentName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("salesAgentName must have at least 2 characters")
      .matches(alphaNumericWithSpaces)
      .withMessage("salesAgentName must be alphanumeric"),
    body("date")
      .notEmpty()
      .withMessage("date is required")
      .isISO8601()
      .withMessage("date must be valid"),
    body("time")
      .notEmpty()
      .withMessage("time is required")
      .matches(time24h)
      .withMessage("time must be in HH:mm format")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sale = await Sale.create({
      saleType: "Cash",
      produceName: req.body.produceName,
      tonnage: req.body.tonnage,
      amountPaid: req.body.amountPaid,
      buyerName: req.body.buyerName,
      salesAgentName: req.body.salesAgentName,
      date: req.body.date,
      time: req.body.time
    });

    res.status(201).json(sale);
  }
);

/**
 * @swagger
 * /sales/credit:
 *   post:
 *     summary: Record credit sale
 *     tags:
 *       - Sales
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buyerName
 *               - nationalId
 *               - location
 *               - contacts
 *               - amountDue
 *               - salesAgentName
 *               - dueDate
 *               - produceName
 *               - produceType
 *               - tonnage
 *               - dispatchDate
 *             properties:
 *               buyerName:
 *                 type: string
 *                 example: Buyer45
 *               nationalId:
 *                 type: string
 *                 example: CF1234567890AB
 *               location:
 *                 type: string
 *                 example: Kampala2
 *               contacts:
 *                 type: string
 *                 example: "+256701234567"
 *               amountDue:
 *                 type: number
 *                 minimum: 10000
 *               salesAgentName:
 *                 type: string
 *                 example: Agent11
 *               dueDate:
 *                 type: string
 *                 format: date
 *               produceName:
 *                 type: string
 *               produceType:
 *                 type: string
 *               tonnage:
 *                 type: number
 *                 minimum: 1
 *               dispatchDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Credit sale recorded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Sales agent role required
 */
router.post(
  "/credit",
  auth,
  role("SalesAgent"),
  [
    body().custom((value) => {
      if (!value.contacts && !value.contact) {
        throw new Error("contacts is required");
      }
      return true;
    }),
    body("buyerName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("buyerName must have at least 2 characters")
      .matches(alphaNumericWithSpaces)
      .withMessage("buyerName must be alphanumeric"),
    body("nationalId")
      .trim()
      .matches(ninRegex)
      .withMessage("nationalId must be a valid NIN format"),
    body("location")
      .trim()
      .isLength({ min: 2 })
      .withMessage("location must have at least 2 characters")
      .matches(alphaNumericWithSpaces)
      .withMessage("location must be alphanumeric"),
    body("contacts")
      .optional()
      .trim()
      .matches(phoneRegex)
      .withMessage("contacts must be a valid phone number"),
    body("contact")
      .optional()
      .trim()
      .matches(phoneRegex)
      .withMessage("contact must be a valid phone number"),
    body("amountDue")
      .isNumeric()
      .withMessage("amountDue must be numeric")
      .isFloat({ min: 10000 })
      .withMessage("amountDue must be at least 10000"),
    body("salesAgentName")
      .trim()
      .isLength({ min: 2 })
      .withMessage("salesAgentName must have at least 2 characters")
      .matches(alphaNumericWithSpaces)
      .withMessage("salesAgentName must be alphanumeric"),
    body("dueDate")
      .notEmpty()
      .withMessage("dueDate is required")
      .isISO8601()
      .withMessage("dueDate must be valid"),
    body("produceName")
      .trim()
      .matches(alphaNumericWithSpaces)
      .withMessage("produceName must be alphanumeric"),
    body("produceType")
      .trim()
      .isLength({ min: 2 })
      .withMessage("produceType must have at least 2 characters")
      .matches(/^[A-Za-z]+$/)
      .withMessage("produceType must be alphabetic"),
    body("tonnage")
      .isNumeric()
      .withMessage("tonnage must be numeric")
      .isFloat({ min: 1 })
      .withMessage("tonnage must be greater than 0"),
    body("dispatchDate")
      .notEmpty()
      .withMessage("dispatchDate is required")
      .isISO8601()
      .withMessage("dispatchDate must be valid")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sale = await Sale.create({
      saleType: "Credit",
      buyerName: req.body.buyerName,
      nationalId: req.body.nationalId,
      location: req.body.location,
      contact: req.body.contacts || req.body.contact,
      amountDue: req.body.amountDue,
      salesAgentName: req.body.salesAgentName,
      dueDate: req.body.dueDate,
      produceName: req.body.produceName,
      produceType: req.body.produceType,
      tonnage: req.body.tonnage,
      dispatchDate: req.body.dispatchDate
    });

    res.status(201).json(sale);
  }
);

module.exports = router;
