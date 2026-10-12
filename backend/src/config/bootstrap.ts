import { isBothoEmail } from "../utils/validation";

// Only these deliberately authored messages may be printed by the CLI.
export class BootstrapError extends Error {}

export interface BootstrapConfig {
  mongoUri: string;
  adminEmail: string;
  adminPassword?: string;
}

export const normalizeAdminEmail = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 100 || !isBothoEmail(normalized)) {
    throw new BootstrapError("ADMIN_EMAIL must use @bothouniversity.com or @bothouniversity.ac.bw (maximum 100 characters).");
  }
  return normalized;
};

export const loadBootstrapConfig = (env: NodeJS.ProcessEnv = process.env): BootstrapConfig => {
  const mongoUri = env.MONGO_URI?.trim();
  // An explicit database prevents accidentally seeding the driver's default database.
  const match = mongoUri?.match(/^mongodb(?:\+srv)?:\/\/[^/?#]+\/([^/?#]+)(?:\?[^#]*)?$/);
  let database = "";
  try { database = match ? decodeURIComponent(match[1]) : ""; } catch { /* rejected below */ }
  if (!mongoUri || !database || /[\s/\\."$*<>:|?\0]/.test(database) || ["admin", "local", "config"].includes(database.toLowerCase())) {
    throw new BootstrapError("MONGO_URI must be an explicit MongoDB connection string containing an application database name; admin, local, and config are not allowed.");
  }
  return {
    mongoUri,
    adminEmail: normalizeAdminEmail(env.ADMIN_EMAIL || ""),
    adminPassword: env.ADMIN_PASSWORD,
  };
};

export const requireInitialPassword = (password?: string): string => {
  if (!password || password.trim().length < 16 || Buffer.byteLength(password, "utf8") > 72 ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new BootstrapError("Creating the administrator requires ADMIN_PASSWORD with at least 16 characters, uppercase, lowercase, and a number, and at most 72 UTF-8 bytes.");
  }
  return password;
};
