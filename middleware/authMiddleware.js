const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role username email branch");

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      username: user.username,
      email: user.email,
      branch: user.branch || null
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
