const { OWN_FARM_NAMES } = require("../config/domain");

const validateProcurementSource = ({ sourceType, sourceName, tonnage }) => {
  if (sourceType === "IndividualDealer" && Number(tonnage) < 1000) {
    return {
      valid: false,
      message: "IndividualDealer procurements must be at least 1000kg"
    };
  }

  if (sourceType === "Farm" && !OWN_FARM_NAMES.includes(sourceName)) {
    return {
      valid: false,
      message: "Farm sourceName must be Maganjo or Matugga"
    };
  }

  return { valid: true };
};

module.exports = {
  validateProcurementSource
};
