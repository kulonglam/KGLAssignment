const mongoose = require("mongoose");
const { PRODUCE_CATALOG, BRANCHES } = require("../config/domain");
const { lettersAndSpaces } = require("../config/validationPatterns");

const inventorySchema = new mongoose.Schema(
  {
    produceName: { type: String, enum: PRODUCE_CATALOG, required: true},
    produceType: { type: String, required: true, minlength: 2, match: lettersAndSpaces },
    branch: { type: String, enum: BRANCHES, required: true },
    stockKg: { type: Number, required: true, min: 0, default: 0},
    sellingPrice: { type: Number, required: true, min: 1}
  },
  { timestamps: true }
);

inventorySchema.index({ produceName: 1, produceType: 1, branch: 1 },
  { unique: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
