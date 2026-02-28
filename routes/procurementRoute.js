const express = require("express");
const { body, param } = require("express-validator");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  listProcurements,
  getProcurementById,
  createProcurement,
  updateProcurementById,
  deleteProcurementById
} = require("../controllers/procurementController");
const {
  PRODUCE_CATALOG,
  BRANCHES,
  PROCUREMENT_SOURCE_TYPES
} = require("../config/domain");
const {
  alphaNumericWithSpaces,
  lettersAndSpaces,
  phoneRegex,
  time24h
} = require("../config/validationPatterns");
const { validateProcurementSource } = require("../utils/procurementSourceRule");

const router = express.Router();

const procurementCreateValidators = [
  body().custom((value) => {
    if (!value.sourceName && !value.dealerName) {
      throw new Error("sourceName is required");
    }

    return true;
  }),
  body("produceName")
    .trim()
    .isIn(PRODUCE_CATALOG)
    .withMessage("produceName must be from the approved produce catalog"),
  body("produceType")
    .trim()
    .isLength({ min: 2 })
    .withMessage("produceType must have at least 2 characters")
    .matches(lettersAndSpaces)
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
  body("sourceType")
    .isIn(PROCUREMENT_SOURCE_TYPES)
    .withMessage("sourceType must be IndividualDealer, Company, or Farm"),
  body("sourceName")
    .trim()
    .optional()
    .isLength({ min: 2 })
    .withMessage("sourceName must have at least 2 characters")
    .matches(alphaNumericWithSpaces)
    .withMessage("sourceName must be alphanumeric"),
  body("dealerName")
    .trim()
    .optional()
    .isLength({ min: 2 })
    .withMessage("dealerName must have at least 2 characters")
    .matches(alphaNumericWithSpaces)
    .withMessage("dealerName must be alphanumeric"),
  body("branch")
    .isIn(BRANCHES)
    .withMessage("branch must be Maganjo or Matugga"),
  body("contact")
    .trim()
    .matches(phoneRegex)
    .withMessage("contact must be a valid phone number"),
  body("sellingPrice")
    .isNumeric()
    .withMessage("sellingPrice must be numeric")
    .isFloat({ min: 1 })
    .withMessage("sellingPrice must be greater than 0"),
  body().custom((value) => {
    const sourceName = value.sourceName || value.dealerName;
    const sourceValidation = validateProcurementSource({
      sourceType: value.sourceType,
      sourceName,
      tonnage: value.tonnage
    });
    if (!sourceValidation.valid) {
      throw new Error(sourceValidation.message);
    }

    return true;
  })
];

const procurementUpdateValidators = [
  param("id").isMongoId().withMessage("id must be a valid Mongo id"),
  body("produceName")
    .optional()
    .trim()
    .isIn(PRODUCE_CATALOG)
    .withMessage("produceName must be from the approved produce catalog"),
  body("produceType")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("produceType must have at least 2 characters")
    .matches(lettersAndSpaces)
    .withMessage("produceType must contain alphabetic characters only"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("date must be a valid date"),
  body("time")
    .optional()
    .matches(time24h)
    .withMessage("time must be in HH:mm format"),
  body("tonnage")
    .optional()
    .isNumeric()
    .withMessage("tonnage must be numeric")
    .isFloat({ min: 100 })
    .withMessage("tonnage must be at least 100kg"),
  body("cost")
    .optional()
    .isNumeric()
    .withMessage("cost must be numeric")
    .isFloat({ min: 10000 })
    .withMessage("cost must be at least 10000"),
  body("sourceType")
    .optional()
    .isIn(PROCUREMENT_SOURCE_TYPES)
    .withMessage("sourceType must be IndividualDealer, Company, or Farm"),
  body("sourceName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("sourceName must have at least 2 characters")
    .matches(alphaNumericWithSpaces)
    .withMessage("sourceName must be alphanumeric"),
  body("dealerName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("dealerName must have at least 2 characters")
    .matches(alphaNumericWithSpaces)
    .withMessage("dealerName must be alphanumeric"),
  body("branch")
    .optional()
    .isIn(BRANCHES)
    .withMessage("branch must be Maganjo or Matugga"),
  body("contact")
    .optional()
    .trim()
    .matches(phoneRegex)
    .withMessage("contact must be a valid phone number"),
  body("sellingPrice")
    .optional()
    .isNumeric()
    .withMessage("sellingPrice must be numeric")
    .isFloat({ min: 1 })
    .withMessage("sellingPrice must be greater than 0")
];

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
 *               - sourceType
 *               - sourceName
 *               - branch
 *               - contact
 *               - sellingPrice
 *             properties:
 *               produceName:
 *                 type: string
 *                 enum: [Beans, Grain Maize, Cow peas, G-nuts, Soybeans]
 *                 example: Beans
 *               produceType:
 *                 type: string
 *                 example: Grain
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
 *               sourceType:
 *                 type: string
 *                 enum: [IndividualDealer, Company, Farm]
 *               sourceName:
 *                 type: string
 *                 example: Dealer12
 *               dealerName:
 *                 type: string
 *                 description: Backward-compatible alias for sourceName
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
  procurementCreateValidators,
  createProcurement
);

/**
 * @swagger
 * /procurement:
 *   get:
 *     summary: List procurement records (Manager only)
 *     tags:
 *       - Procurement
 *     parameters:
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *           enum: [Maganjo, Matugga]
 *     responses:
 *       200:
 *         description: Procurement records returned
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Access denied
 */
router.get("/", auth, role("Manager"), listProcurements);

/**
 * @swagger
 * /procurement/{id}:
 *   get:
 *     summary: Get procurement by id (Manager only)
 *     tags:
 *       - Procurement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Procurement record returned
 *       404:
 *         description: Procurement not found
 */
router.get(
  "/:id",
  auth,
  role("Manager"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  getProcurementById
);

/**
 * @swagger
 * /procurement/{id}:
 *   patch:
 *     summary: Update procurement by id (Manager only)
 *     tags:
 *       - Procurement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               produceName:
 *                 type: string
 *                 enum: [Beans, Grain Maize, Cow peas, G-nuts, Soybeans]
 *               produceType:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               cost:
 *                 type: number
 *               sourceType:
 *                 type: string
 *                 enum: [IndividualDealer, Company, Farm]
 *               sourceName:
 *                 type: string
 *               dealerName:
 *                 type: string
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
 *               contact:
 *                 type: string
 *               sellingPrice:
 *                 type: number
 *     responses:
 *       200:
 *         description: Procurement updated
 *       404:
 *         description: Procurement not found
 */
router.patch(
  "/:id",
  auth,
  role("Manager"),
  procurementUpdateValidators,
  updateProcurementById
);

/**
 * @swagger
 * /procurement/{id}:
 *   delete:
 *     summary: Delete procurement by id (Manager only)
 *     tags:
 *       - Procurement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Procurement deleted
 *       404:
 *         description: Procurement not found
 */
router.delete(
  "/:id",
  auth,
  role("Manager"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  deleteProcurementById
);

module.exports = router;
