export function isConfiguredEnvValue(value) {
  if (typeof value !== "string") return false;

  const normalized = value.trim();

  if (!normalized) return false;
  if (normalized.startsWith("<") && normalized.endsWith(">")) return false;
  if (/your_|placeholder|example/i.test(normalized)) return false;

  return true;
}

export function hasGoogleClientId() {
  return isConfiguredEnvValue(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

export function hasFacebookAppId() {
  return isConfiguredEnvValue(import.meta.env.VITE_FACEBOOK_APP_ID);
}
