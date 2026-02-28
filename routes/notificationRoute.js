const express = require("express");
const { body, param } = require("express-validator");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  listNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  markNotificationRead,
  deleteNotification
} = require("../controllers/notificationController");

const router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Manager-only notification feed
 *     description: Results are restricted to the authenticated manager's assigned branch.
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notifications returned
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Manager role required
 */
router.get("/", auth, role("Manager"), listNotifications);

/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get notification by id (Manager only)
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification returned
 *       404:
 *         description: Notification not found
 */
router.get(
  "/:id",
  auth,
  role("Manager"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  getNotificationById
);

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create notification (Manager only)
 *     description: Notification is always stored for the authenticated manager's assigned branch.
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               produceName:
 *                 type: string
 *               produceType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Manager role required
 */
router.post(
  "/",
  auth,
  role("Manager"),
  [
    body("branch")
      .not()
      .exists()
      .withMessage("branch is derived from authenticated manager and must not be provided"),
    body("title")
      .trim()
      .isLength({ min: 2 })
      .withMessage("title must have at least 2 characters"),
    body("message")
      .trim()
      .isLength({ min: 2 })
      .withMessage("message must have at least 2 characters")
  ],
  createNotification
);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Manager role required
 */
router.patch(
  "/:id/read",
  auth,
  role("Manager"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  markNotificationRead
);

/**
 * @swagger
 * /notifications/{id}:
 *   patch:
 *     summary: Update notification (Manager only)
 *     tags:
 *       - Notifications
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
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               read:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notification updated
 *       404:
 *         description: Notification not found
 */
router.patch(
  "/:id",
  auth,
  role("Manager"),
  [
    param("id").isMongoId().withMessage("id must be a valid Mongo id"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("title must have at least 2 characters"),
    body("message")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("message must have at least 2 characters"),
    body("read")
      .optional()
      .isBoolean()
      .withMessage("read must be true or false")
  ],
  updateNotification
);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification (Manager only)
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 */
router.delete(
  "/:id",
  auth,
  role("Manager"),
  [param("id").isMongoId().withMessage("id must be a valid Mongo id")],
  deleteNotification
);

module.exports = router;
