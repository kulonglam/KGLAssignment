const Notification = require("../models/notification");
const validateRequest = require("../utils/validateRequest");
const { ensureBranchAccess } = require("../utils/branchAccess");

const ensureManagerBranch = (req, res) => {
  return ensureBranchAccess(req, res, {
    targetBranch: req.query.branch,
    missingMessage: "Manager branch assignment is required",
    mismatchMessage: "You can only access notifications for your assigned branch"
  });
};

const listNotifications = async (req, res) => {
  if (!ensureManagerBranch(req, res)) {
    return;
  }

  const query = { targetRole: "Manager", branch: req.user.branch };
  if (req.query.unreadOnly === "true") {
    query.read = false;
  }

  const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 200));
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);

  return res.status(200).json(notifications);
};

const getNotificationById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!ensureManagerBranch(req, res)) {
    return;
  }

  const notification = await Notification.findOne({
    _id: req.params.id,
    targetRole: "Manager",
    branch: req.user.branch
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.status(200).json(notification);
};

const createNotification = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!ensureManagerBranch(req, res)) {
    return;
  }

  if (typeof req.body.branch !== "undefined") {
    return res.status(400).json({
      message: "branch is derived from authenticated manager and must not be provided"
    });
  }

  const notification = await Notification.create({
    targetRole: "Manager",
    title: req.body.title,
    message: req.body.message,
    branch: req.user.branch,
    produceName: req.body.produceName,
    produceType: req.body.produceType,
    read: false
  });

  return res.status(201).json(notification);
};

const updateNotification = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!ensureManagerBranch(req, res)) {
    return;
  }

  const update = {};
  if (typeof req.body.title !== "undefined") {
    update.title = req.body.title;
  }
  if (typeof req.body.message !== "undefined") {
    update.message = req.body.message;
  }
  if (typeof req.body.read !== "undefined") {
    update.read = req.body.read;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, targetRole: "Manager", branch: req.user.branch },
    { $set: update },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.status(200).json(notification);
};

const markNotificationRead = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!ensureManagerBranch(req, res)) {
    return;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, targetRole: "Manager", branch: req.user.branch },
    { $set: { read: true } },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.status(200).json(notification);
};

const deleteNotification = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!ensureManagerBranch(req, res)) {
    return;
  }

  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    targetRole: "Manager",
    branch: req.user.branch
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.status(200).json({ message: "Notification deleted" });
};

module.exports = {
  listNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  markNotificationRead,
  deleteNotification
};
