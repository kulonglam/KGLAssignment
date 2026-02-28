const REQUIRED_ENV_VARS = [
  "PORT",
  "DATABASE_URI",
  "JWT_SECRET",
  "DIRECTOR_USERNAME",
  "DIRECTOR_EMAIL",
  "DIRECTOR_PASSWORD"
];

const getMissingEnvVars = () =>
  REQUIRED_ENV_VARS.filter((name) => !process.env[name] || !String(process.env[name]).trim());

const assertRequiredEnvVars = () => {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

module.exports = {
  REQUIRED_ENV_VARS,
  assertRequiredEnvVars
};
