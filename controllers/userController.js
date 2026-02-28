const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/user");

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  branch: user.branch || null,
  staffSlot: user.staffSlot || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const MIN_BRANCH_STAFF = Object.freeze({
  Manager: 1,
  SalesAgent: 2
});

const mapDuplicateUserError = (error, res, context = {}) => {
  if (error.code !== 11000) {
    return false;
  }

  if (error.keyPattern && error.keyPattern.email) {
    res.status(400).json({ message: "email already exists" });
    return true;
  }

  if (
    error.keyPattern &&
    error.keyPattern.branch &&
    error.keyPattern.role &&
    !error.keyPattern.staffSlot
  ) {
    const branchLabel = context.branch || "this branch";
    res
      .status(400)
      .json({ message: `A manager already exists for ${branchLabel}` });
    return true;
  }

  if (error.keyPattern && error.keyPattern.staffSlot) {
    const slotLabel = context.staffSlot || "selected";
    const branchLabel = context.branch || "this branch";
    res.status(400).json({
      message: `Sales agent slot ${slotLabel} is already taken at ${branchLabel}`
    });
    return true;
  }

  res.status(400).json({ message: "Duplicate user constraint violation" });
  return true;
};

const ensureMinimumBranchStaff = async ({ branch, role, res, action }) => {
  const minimum = MIN_BRANCH_STAFF[role];
  if (!minimum) {
    return true;
  }

  const count = await User.countDocuments({ branch, role });
  if (count <= minimum) {
    if (role === "Manager") {
      res.status(409).json({
        message: `Cannot ${action} the only manager at ${branch}`
      });
      return false;
    }

    if (role === "SalesAgent") {
      res.status(409).json({
        message: `Cannot ${action} sales agents below 2 at ${branch}`
      });
      return false;
    }
  }

  return true;
};

const managerBranchGuard = (req, res, targetBranch) => {
  if (!req.user.branch) {
    res.status(403).json({ message: "Manager branch assignment is required" });
    return false;
  }

  if (targetBranch && req.user.branch !== targetBranch) {
    res.status(403).json({ message: "Manager can only manage users for assigned branch" });
    return false;
  }

  return true;
};

const canCreateUser = async (req, res) => {
  if (req.user.role === "Manager") {
    return managerBranchGuard(req, res, req.body.branch);
  }

  if (req.user.role === "Director") {
    if (req.body.role !== "Manager") {
      res.status(403).json({
        message: "Director can only bootstrap missing branch manager accounts"
      });
      return false;
    }

    const existingBranchManager = await User.exists({
      role: "Manager",
      branch: req.body.branch
    });
    if (existingBranchManager) {
      res.status(403).json({
        message: `Manager for ${req.body.branch} already exists`
      });
      return false;
    }

    return true;
  }

  res.status(403).json({ message: "Access denied" });
  return false;
};

const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }

  return true;
};

const login = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const { identifier, username, email, password } = req.body;
  const loginValue = identifier || username || email;
  const user = await User.findOne({
    $or: [{ email: loginValue }, { username: loginValue }]
  });

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid password" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  return res.status(200).json({
    token,
    role: user.role,
    username: user.username,
    branch: user.branch || null,
    staffSlot: user.staffSlot || null
  });
};

const listUsers = async (req, res) => {
  if (!managerBranchGuard(req, res)) {
    return;
  }

  if (req.query.branch && req.query.branch !== req.user.branch) {
    return res.status(403).json({ message: "Managers can only list users for assigned branch" });
  }

  const query = { branch: req.user.branch };
  if (req.query.role) {
    query.role = req.query.role;
  }

  const users = await User.find(query).sort({ role: 1, branch: 1, username: 1 });
  return res.status(200).json(users.map(sanitizeUser));
};

const getUserById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role === "Director") {
    return res.status(403).json({ message: "Director account is not manageable from this endpoint" });
  }

  if (!managerBranchGuard(req, res, user.branch)) {
    return;
  }

  return res.status(200).json(sanitizeUser(user));
};

const createUser = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!(await canCreateUser(req, res))) {
    return;
  }

  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hashed,
      role: req.body.role,
      branch: req.body.branch,
      staffSlot: req.body.role === "SalesAgent" ? Number(req.body.staffSlot) : undefined
    });

    return res.status(201).json(sanitizeUser(user));
  } catch (error) {
    if (
      mapDuplicateUserError(error, res, {
        branch: req.body.branch,
        staffSlot: req.body.staffSlot
      })
    ) {
      return;
    }

    return res.status(500).json({ message: "Failed to create user" });
  }
};

const updateUserById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const existingUser = await User.findById(req.params.id);
  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (existingUser.role === "Director") {
    return res.status(403).json({ message: "Director account cannot be modified here" });
  }

  if (!managerBranchGuard(req, res, existingUser.branch)) {
    return;
  }

  if (typeof req.body.branch !== "undefined" && !managerBranchGuard(req, res, req.body.branch)) {
    return;
  }

  const nextRole = typeof req.body.role === "undefined" ? existingUser.role : req.body.role;
  const nextBranch = typeof req.body.branch === "undefined" ? existingUser.branch : req.body.branch;
  const roleOrBranchChanging =
    nextRole !== existingUser.role || nextBranch !== existingUser.branch;

  if (roleOrBranchChanging) {
    const canChangeRoleOrBranch = await ensureMinimumBranchStaff({
      branch: existingUser.branch,
      role: existingUser.role,
      res,
      action: "move"
    });
    if (!canChangeRoleOrBranch) {
      return;
    }
  }

  try {
    if (typeof req.body.username !== "undefined") {
      existingUser.username = req.body.username;
    }
    if (typeof req.body.email !== "undefined") {
      existingUser.email = req.body.email;
    }
    if (typeof req.body.password !== "undefined") {
      existingUser.password = await bcrypt.hash(req.body.password, 10);
    }
    if (typeof req.body.role !== "undefined") {
      existingUser.role = req.body.role;
    }
    if (typeof req.body.branch !== "undefined") {
      existingUser.branch = req.body.branch;
    }

    if (existingUser.role === "SalesAgent") {
      if (typeof req.body.staffSlot !== "undefined") {
        existingUser.staffSlot = Number(req.body.staffSlot);
      } else if (!existingUser.staffSlot) {
        return res.status(400).json({ message: "staffSlot is required for SalesAgent" });
      }
    } else {
      existingUser.staffSlot = undefined;
    }

    await existingUser.save();
    return res.status(200).json(sanitizeUser(existingUser));
  } catch (error) {
    if (
      mapDuplicateUserError(error, res, {
        branch: existingUser.branch,
        staffSlot: existingUser.staffSlot
      })
    ) {
      return;
    }

    return res.status(500).json({ message: "Failed to update user" });
  }
};

const deleteUserById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role === "Director") {
    return res.status(403).json({ message: "Director account cannot be deleted" });
  }

  if (!managerBranchGuard(req, res, user.branch)) {
    return;
  }

  const canDeleteWithoutBreakingStaffing = await ensureMinimumBranchStaff({
    branch: user.branch,
    role: user.role,
    res,
    action: "delete"
  });
  if (!canDeleteWithoutBreakingStaffing) {
    return;
  }

  await User.deleteOne({ _id: user._id });
  return res.status(200).json({ message: "User deleted" });
};

module.exports = {
  login,
  listUsers,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById
};
