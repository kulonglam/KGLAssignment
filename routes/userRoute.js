const express = require("express");
const { body, param } = require("express-validator");
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { BRANCHES } = require("../config/domain");
const {
  login,
  listUsers,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById
} = require("../controllers/userController");

const router = express.Router();
const alphaNumeric = /^[a-zA-Z0-9]+$/;

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login with username or email
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email
 *                 example: manager1
 *               username:
 *                 type: string
 *                 example: manager1
 *               email:
 *                 type: string
 *                 example: manager@example.com
 *               password:
 *                 type: string
 *                 example: pass1234
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  [
    body("password").notEmpty().withMessage("password is required"),
    body().custom((value) => {
      if (!value.identifier && !value.username && !value.email) {
        throw new Error("Provide identifier, username, or email");
      }
      return true;
    })
  ],
  login
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user (Manager; Director bootstrap for missing branch manager only)
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role
 *               - branch
 *             properties:
 *               username:
 *                 type: string
 *                 example: manager1
 *               email:
 *                 type: string
 *                 example: manager@example.com
 *               password:
 *                 type: string
 *                 example: pass1234
 *               role:
 *                 type: string
 *                 enum: [Manager, SalesAgent]
 *                 description: Director bootstrap can create Manager only
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
 *               staffSlot:
 *                 type: integer
 *                 enum: [1, 2]
 *                 description: Required for SalesAgent only
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Manager role required (Director allowed only to bootstrap missing branch manager)
 */
router.post(
  "/",
  auth,
  role("Manager", "Director"),
  [
    body("username")
      .trim()
      .isLength({ min: 2 })
      .withMessage("username must have at least 2 characters")
      .matches(alphaNumeric)
      .withMessage("username must be alphanumeric"),
    body("email").isEmail().withMessage("email must be valid"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("password must be at least 6 characters"),
    body("role")
      .isIn(["Manager", "SalesAgent"])
      .withMessage("role must be Manager or SalesAgent"),
    body("branch")
      .isIn(BRANCHES)
      .withMessage("branch must be Maganjo or Matugga"),
    body("staffSlot")
      .optional()
      .isInt({ min: 1, max: 2 })
      .withMessage("staffSlot must be 1 or 2"),
    body().custom(async (value) => {
      if (value.role === "Manager") {
        const managerCount = await User.countDocuments({
          role: "Manager",
          branch: value.branch
        });

        if (managerCount >= 1) {
          throw new Error(`Only one manager is allowed at ${value.branch}`);
        }
      }

      if (value.role === "SalesAgent") {
        if (![1, 2].includes(Number(value.staffSlot))) {
          throw new Error("staffSlot is required for SalesAgent and must be 1 or 2");
        }

        const attendantCount = await User.countDocuments({
          role: "SalesAgent",
          branch: value.branch
        });

        if (attendantCount >= 2) {
          throw new Error(`Only two sales agents are allowed at ${value.branch}`);
        }

        const existingSlot = await User.findOne({
          role: "SalesAgent",
          branch: value.branch,
          staffSlot: Number(value.staffSlot)
        });

        if (existingSlot) {
          throw new Error(`Sales agent slot ${value.staffSlot} is already taken at ${value.branch}`);
        }
      }

      return true;
    })
  ],
  createUser
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users (Manager only)
 *     tags:
 *       - Users
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Manager, SalesAgent]
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *           enum: [Maganjo, Matugga]
 *     responses:
 *       200:
 *         description: Users returned
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Manager role required
 */
router.get("/", auth, role("Manager"), listUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by id (Manager only)
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User returned
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  auth,
  role("Manager"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  getUserById
);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update user by id (Manager only)
 *     tags:
 *       - Users
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Manager, SalesAgent]
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
 *               staffSlot:
 *                 type: integer
 *                 enum: [1, 2]
 *     responses:
 *       200:
 *         description: User updated
 *       409:
 *         description: Update would violate mandatory branch staffing (1 manager, 2 sales agents)
 *       404:
 *         description: User not found
 */
router.patch(
  "/:id",
  auth,
  role("Manager"),
  [
    param("id").isMongoId().withMessage("id must be a valid Mongo id"),
    body("username")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("username must have at least 2 characters")
      .matches(alphaNumeric)
      .withMessage("username must be alphanumeric"),
    body("email").optional().isEmail().withMessage("email must be valid"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("password must be at least 6 characters"),
    body("role")
      .optional()
      .isIn(["Manager", "SalesAgent"])
      .withMessage("role must be Manager or SalesAgent"),
    body("branch")
      .optional()
      .isIn(BRANCHES)
      .withMessage("branch must be Maganjo or Matugga"),
    body("staffSlot")
      .optional()
      .isInt({ min: 1, max: 2 })
      .withMessage("staffSlot must be 1 or 2")
  ],
  updateUserById
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user by id (Manager only)
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       409:
 *         description: Delete would violate mandatory branch staffing (1 manager, 2 sales agents)
 *       404:
 *         description: User not found
 */
router.delete(
  "/:id",
  auth,
  role("Manager"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  deleteUserById
);

module.exports = router;
