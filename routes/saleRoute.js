const express = require("express");
const { body, param } = require("express-validator");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { PRODUCE_CATALOG, BRANCHES } = require("../config/domain");
const {
  alphaNumericWithSpaces,
  lettersAndSpaces,
  ninRegex,
  phoneRegex,
  time24h
} = require("../config/validationPatterns");
const {
  createCashSale,
  createCreditSale,
  listSales,
  getSaleById,
  updateSaleById,
  deleteSaleById,
  getSalesTotalsReport
} = require("../controllers/saleController");

const router = express.Router();

const saleUpdateValidators = [
  param("id").isMongoId().withMessage("id must be a valid Mongo id"),
  body("saleType")
    .optional()
    .isIn(["Cash", "Credit"])
    .withMessage("saleType must be Cash or Credit"),
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
    .withMessage("produceType must be alphabetic"),
  body("branch")
    .optional()
    .isIn(BRANCHES)
    .withMessage("branch must be Maganjo or Matugga"),
  body("tonnage")
    .optional()
    .isNumeric()
    .withMessage("tonnage must be numeric")
    .isFloat({ min: 1 })
    .withMessage("tonnage must be greater than 0"),
  body("amountPaid")
    .optional()
    .isNumeric()
    .withMessage("amountPaid must be numeric")
    .isFloat({ min: 10000 })
    .withMessage("amountPaid must be at least 10000"),
  body("amountDue")
    .optional()
    .isNumeric()
    .withMessage("amountDue must be numeric")
    .isFloat({ min: 10000 })
    .withMessage("amountDue must be at least 10000"),
  body("buyerName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("buyerName must have at least 2 characters")
    .matches(alphaNumericWithSpaces)
    .withMessage("buyerName must be alphanumeric"),
  body("salesAgentName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("salesAgentName must have at least 2 characters")
    .matches(alphaNumericWithSpaces)
    .withMessage("salesAgentName must be alphanumeric"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("date must be valid"),
  body("time")
    .optional()
    .matches(time24h)
    .withMessage("time must be in HH:mm format"),
  body("nationalId")
    .optional()
    .trim()
    .matches(ninRegex)
    .withMessage("nationalId must be a valid NIN format"),
  body("location")
    .optional()
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
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("dueDate must be valid"),
  body("dispatchDate")
    .optional()
    .isISO8601()
    .withMessage("dispatchDate must be valid")
];

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
 *               - branch
 *               - tonnage
 *               - amountPaid
 *               - buyerName
 *               - salesAgentName
 *               - date
 *               - time
 *             properties:
 *               produceName:
 *                 type: string
 *                 enum: [Beans, Grain Maize, Cow peas, G-nuts, Soybeans]
 *                 example: Beans
 *               produceType:
 *                 type: string
 *                 description: Required if more than one type exists for produce in the selected branch
 *                 example: Grain
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
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
 *         description: Manager or sales agent role required
 */

router.post(
  "/cash",
  auth,
  role("SalesAgent", "Manager"),
  [
    body("produceName")
      .trim()
      .isIn(PRODUCE_CATALOG)
      .withMessage("produceName must be from the approved produce catalog"),
    body("produceType")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("produceType must have at least 2 characters")
      .matches(lettersAndSpaces)
      .withMessage("produceType must be alphabetic"),
    body("branch")
      .isIn(BRANCHES)
      .withMessage("branch must be Maganjo or Matugga"),
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
  createCashSale
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
 *               - branch
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
 *                 enum: [Beans, Grain Maize, Cow peas, G-nuts, Soybeans]
 *               produceType:
 *                 type: string
 *                 description: Required if more than one type exists for produce in the selected branch
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
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
 *         description: Manager or sales agent role required
 */
router.post(
  "/credit",
  auth,
  role("SalesAgent", "Manager"),
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
      .isIn(PRODUCE_CATALOG)
      .withMessage("produceName must be from the approved produce catalog"),
    body("produceType")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("produceType must have at least 2 characters")
      .matches(lettersAndSpaces)
      .withMessage("produceType must be alphabetic"),
    body("branch")
      .isIn(BRANCHES)
      .withMessage("branch must be Maganjo or Matugga"),
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
  createCreditSale
);

/**
 * @swagger
 * /sales/reports/totals:
 *   get:
 *     summary: Director-only aggregated totals across branches
 *     tags:
 *       - Sales
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Aggregated totals only
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Director role required
 */
router.get("/reports/totals", auth, role("Director"), getSalesTotalsReport);

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: List sales records (Manager or Sales Agent)
 *     tags:
 *       - Sales
 *     parameters:
 *       - in: query
 *         name: saleType
 *         schema:
 *           type: string
 *           enum: [Cash, Credit]
 *     responses:
 *       200:
 *         description: Sales returned
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Access denied
 */
router.get("/", auth, role("Manager", "SalesAgent"), listSales);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Get sale by id (Manager or Sales Agent)
 *     tags:
 *       - Sales
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale returned
 *       404:
 *         description: Sale not found
 */
router.get(
  "/:id",
  auth,
  role("Manager", "SalesAgent"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  getSaleById
);

/**
 * @swagger
 * /sales/{id}:
 *   patch:
 *     summary: Update sale by id (Manager or Sales Agent)
 *     tags:
 *       - Sales
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
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
 *               tonnage:
 *                 type: number
 *               amountPaid:
 *                 type: number
 *               amountDue:
 *                 type: number
 *               buyerName:
 *                 type: string
 *               salesAgentName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               nationalId:
 *                 type: string
 *               location:
 *                 type: string
 *               contacts:
 *                 type: string
 *               contact:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               dispatchDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Sale updated
 *       404:
 *         description: Sale not found
 */
router.patch(
  "/:id",
  auth,
  role("Manager", "SalesAgent"),
  saleUpdateValidators,
  updateSaleById
);

/**
 * @swagger
 * /sales/{id}:
 *   delete:
 *     summary: Delete sale by id (Manager or Sales Agent)
 *     tags:
 *       - Sales
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale deleted
 *       404:
 *         description: Sale not found
 */
router.delete(
  "/:id",
  auth,
  role("Manager", "SalesAgent"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  deleteSaleById
);

module.exports = router;
