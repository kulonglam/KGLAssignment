const alphaNumeric = /^[a-zA-Z0-9]+$/;
const alphaNumericWithSpaces = /^[a-zA-Z0-9 ]+$/;
const lettersAndSpaces = /^[A-Za-z ]+$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;
const ninRegex = /^(CM|CF)[A-Z0-9]{12}$/i;
const time24h = /^([01]\d|2[0-3]):([0-5]\d)$/;

module.exports = {
  alphaNumeric,
  alphaNumericWithSpaces,
  lettersAndSpaces,
  phoneRegex,
  ninRegex,
  time24h
};
