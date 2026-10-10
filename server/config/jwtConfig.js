const INSECURE_DEFAULT_SECRETS = [
  "supersecretjwtkeychangeinproduction",
  "secret",
  "jwtsecret",
  "12345",
  "password",
  "changeme"
];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!secret || INSECURE_DEFAULT_SECRETS.includes(secret.toLowerCase().trim())) {
      throw new Error("FATAL SECURITY ERROR: A strong, non-default JWT_SECRET environment variable is required in production mode.");
    }
    return secret;
  }

  // Development mode fallback
  if (!secret || INSECURE_DEFAULT_SECRETS.includes(secret.toLowerCase().trim())) {
    return "dev-local-secret-change-in-prod-12345";
  }

  return secret;
}

module.exports = {
  getJwtSecret,
  INSECURE_DEFAULT_SECRETS
};
