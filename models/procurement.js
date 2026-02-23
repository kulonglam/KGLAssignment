const mongoose = require("mongoose");

const procurementSchema = new mongoose.Schema({
  produceName: { type: String, required: true },
  produceType: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  tonnage: { type: Number, required: true, min: 100 },
  cost: { type: Number, required: true, min: 10000 },
  dealerName: { type: String, required: true },
  branch: { type: String, enum: ["Maganjo", "Matugga"], required: true },
  contact: { type: String, required: true },
  sellingPrice: { type: Number, required: true }
});

module.exports = mongoose.model("Procurement", procurementSchema);
