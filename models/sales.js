const mongoose = require("mongoose");
const { PRODUCE_CATALOG, BRANCHES } = require("../config/domain");
const {
  alphaNumericWithSpaces,
  lettersAndSpaces,
  ninRegex,
  phoneRegex
} = require("../config/validationPatterns");

const saleSchema = new mongoose.Schema(
  {
    saleType: {
      type: String,
      enum: ["Cash", "Credit"],
      required: true
    },

    produceName: {
      type: String,
      enum: PRODUCE_CATALOG,
      required: true
    },
    produceType: {
      type: String,
      required: function requiredProduceType() {
        return this.saleType === "Credit";
      },
      match: lettersAndSpaces
    },
    branch: {
      type: String,
      enum: BRANCHES,
      required: true
    },
    tonnage: { type: Number, required: true, min: 1 },

    unitPriceUsed: { type: Number, required: true, min: 1 },
    totalExpected: { type: Number, required: true, min: 1 },
    amountPaid: {
      type: Number,
      required: function requiredAmountPaid() {
        return this.saleType === "Cash";
      },
      min: 10000
    },
    amountDue: {
      type: Number,
      required: function requiredAmountDue() {
        return this.saleType === "Credit";
      },
      min: 10000
    },

    buyerName: {
      type: String,
      required: true,
      minlength: 2,
      match: alphaNumericWithSpaces
    },
    nationalId: {
      type: String,
      required: function requiredNationalId() {
        return this.saleType === "Credit";
      },
      match: ninRegex
    },
    location: {
      type: String,
      required: function requiredLocation() {
        return this.saleType === "Credit";
      },
      minlength: 2,
      match: alphaNumericWithSpaces
    },
    contact: {
      type: String,
      required: function requiredContact() {
        return this.saleType === "Credit";
      },
      match: phoneRegex
    },

    salesAgentName: {
      type: String,
      required: true,
      minlength: 2,
      match: alphaNumericWithSpaces
    },
    dueDate: {
      type: Date,
      required: function requiredDueDate() {
        return this.saleType === "Credit";
      }
    },
    dispatchDate: {
      type: Date,
      required: function requiredDispatchDate() {
        return this.saleType === "Credit";
      }
    },

    date: {
      type: Date,
      required: function requiredDate() {
        return this.saleType === "Cash";
      }
    },
    time: {
      type: String,
      required: function requiredTime() {
        return this.saleType === "Cash";
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
