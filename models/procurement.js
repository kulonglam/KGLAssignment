const mongoose = require("mongoose");
const {
  PRODUCE_CATALOG,
  BRANCHES,
  PROCUREMENT_SOURCE_TYPES
} = require("../config/domain");
const {
  alphaNumericWithSpaces,
  lettersAndSpaces,
  phoneRegex
} = require("../config/validationPatterns");
const { validateProcurementSource } = require("../utils/procurementSourceRule");

const procurementSchema = new mongoose.Schema({
  produceName: { type: String, enum: PRODUCE_CATALOG, required: true },
  produceType: {
    type: String,
    required: true,
    minlength: 2,
    match: lettersAndSpaces
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  tonnage: { type: Number, required: true, min: 100 },
  cost: { type: Number, required: true, min: 10000 },
  sourceType: { type: String, enum: PROCUREMENT_SOURCE_TYPES, required: true },
  sourceName: {
    type: String,
    required: true,
    minlength: 2,
    match: alphaNumericWithSpaces,
    validate: {
      validator: function validateSourceRules(value) {
        const sourceValidation = validateProcurementSource({
          sourceType: this.sourceType,
          sourceName: value,
          tonnage: this.tonnage
        });
        return sourceValidation.valid;
      },
      message: "Invalid procurement source details"
    }
  },
  branch: { type: String, enum: BRANCHES, required: true },
  contact: { type: String, required: true, match: phoneRegex },
  sellingPrice: { type: Number, required: true, min: 1 }
});

module.exports = mongoose.model("Procurement", procurementSchema);
