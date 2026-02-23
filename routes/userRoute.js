const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");

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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, username, email, password } = req.body;
    const loginValue = identifier || username || email;
    const user = await User.findOne({
      $or: [{ email: loginValue }, { username: loginValue }]
    });

    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.status(200).json({ token, role: user.role, username: user.username });
  }
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user (Manager or Sales Agent)
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
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
router.post(
  "/",
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
      .withMessage("role must be Manager or SalesAgent")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hashed,
      role: req.body.role
    });

    res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  }
);

module.exports = router;
