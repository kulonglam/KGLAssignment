const mongoose = require("mongoose");
const { BRANCHES } = require("../config/domain");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  branch: {
    type: String,
    enum: BRANCHES,
    required: function requiredBranch() {
      return this.role === "Manager" || this.role === "SalesAgent";
    }
  },
  staffSlot: {
    type: Number,
    enum: [1, 2],
    required: function requiredStaffSlot() {
      return this.role === "SalesAgent";
    }
  },
  role: { type: String, enum: ["Manager", "SalesAgent", "Director"],
    required: true
  }
});

userSchema.index(
  { branch: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: "Manager" } }
);

userSchema.index(
  { branch: 1, role: 1, staffSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "SalesAgent", staffSlot: { $in: [1, 2] } }
  }
);

module.exports = mongoose.model("User", userSchema);
