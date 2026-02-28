const mongoose = require("mongoose");
const { BRANCHES } = require("../config/domain");

const notificationSchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      enum: ["Manager"],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    branch: { type: String, enum: BRANCHES, required: true },
    produceName: { type: String },
    produceType: { type: String },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
