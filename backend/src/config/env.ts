/**
 * Environment Configuration
 * Loads and validates all required environment variables
 */

export interface Env {
  // Server
  NODE_ENV: string;
  PORT: number;
  SERVER_URL: string;
  CLIENT_URL: string;

  // Database
  MONGO_URI: string;

  // JWT
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_TOKEN_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;

  // Cookies
  COOKIE_DOMAIN: string;
  COOKIE_SECURE: boolean;

  // Redis (optional)
  REDIS_URL?: string;

  // Cloudinary (optional)
  CLOUDINARY_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;

  // YouTube
  YOUTUBE_API_KEY?: string;


  // Email (SMTP for OTP emails)
  EMAIL_SMTP_HOST?: string;
  EMAIL_SMTP_PORT: number;
  EMAIL_SMTP_USER?: string;
  EMAIL_SMTP_PASS?: string;
  EMAIL_FROM: string;
  EMAIL_BRAND: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_RATE_PER_SECOND: number;
  EVENT_WORKER_CONCURRENCY: number;

  // Password Reset OTP
  PASSWORD_RESET_OTP_TTL_MINUTES: number;
  PASSWORD_RESET_OTP_MAX_ATTEMPTS: number;
  PASSWORD_RESET_TOKEN_TTL_MINUTES: number;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Admin seed
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
}

/**
 * Load environment variables with validation and defaults
 * Throws error if required variables are missing in production
 */
export const loadEnv = (): Env => {
  const NODE_ENV = process.env.NODE_ENV || "development";
  const isProduction = NODE_ENV === "production";

  // Required in production - warn in development
  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_access_secret_change_me_in_production";
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me_in_production";

  if (isProduction) {
    const errors: string[] = [];
    const required = [
      "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "MONGO_URI",
      "EMAIL_SMTP_HOST", "EMAIL_SMTP_USER", "EMAIL_SMTP_PASS", "EMAIL_FROM",
      "CLIENT_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD",
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) errors.push(`Missing environment variables: ${missing.join(", ")}`);

    if (process.env.EMAIL_FROM) {
      const mailbox = process.env.EMAIL_FROM.trim().match(/^(?:[^<>]*<([^<>\s,@]+@[^<>\s,@]+)>|([^<>\s,@]+@[^<>\s,@]+))$/);
      const fromAddress = (mailbox?.[1] || mailbox?.[2])?.toLowerCase();
      const fromDomain = fromAddress?.split("@")[1];
      // Gmail can authenticate its own sender; do not allow an unrelated account
      // or SMTP host to bypass the existing production sender policy.
      const authenticatedGoogleSender = Boolean(
        fromAddress && ["gmail.com", "googlemail.com"].includes(fromDomain || "") &&
        process.env.EMAIL_SMTP_HOST?.trim().toLowerCase() === "smtp.gmail.com" &&
        fromAddress === process.env.EMAIL_SMTP_USER?.trim().toLowerCase()
      );
      if (!fromDomain || (!authenticatedGoogleSender && ["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "example.invalid", "example.com"].includes(fromDomain))) {
        errors.push("Production EMAIL_FROM must use your verified sending domain, or match EMAIL_SMTP_USER when using smtp.gmail.com");
      }
    }
    if (process.env.CLIENT_URL) {
      try {
        const client = new URL(process.env.CLIENT_URL);
        if (client.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(client.hostname)) {
          errors.push("Production CLIENT_URL must be a public HTTPS URL");
        }
      } catch {
        errors.push("Production CLIENT_URL must be a valid public HTTPS URL");
      }
    }
    if (errors.length) {
      // Report all configuration problems together, without printing secret values.
      throw new Error(`Invalid production configuration:\n- ${errors.join("\n- ")}`);
    }
  }

  return {
    // Server
    NODE_ENV,
    PORT: Number(process.env.PORT) || 5000,
    SERVER_URL: process.env.SERVER_URL || "http://localhost:5000",
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

    // Database
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/innovation_hub",

    // JWT
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "24h",
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",

    // Cookies
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "",
    COOKIE_SECURE: process.env.COOKIE_SECURE === "true" || isProduction,

    // Redis
    REDIS_URL: process.env.REDIS_URL,

    // Cloudinary
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    // YouTube
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,

    // Email (SMTP for OTP emails)
    EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
    EMAIL_SMTP_PORT: Number(process.env.EMAIL_SMTP_PORT) || 587,
    EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER,
    EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM || "Innovation Hub <no-reply@example.invalid>",
    EMAIL_BRAND: process.env.EMAIL_BRAND || "Innovation Hub",
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    EMAIL_RATE_PER_SECOND: Math.max(1, Math.min(100, Number(process.env.EMAIL_RATE_PER_SECOND) || 5)),
    EVENT_WORKER_CONCURRENCY: Math.max(1, Math.min(20, Math.floor(Number(process.env.EVENT_WORKER_CONCURRENCY) || 5))),

    // Password Reset OTP
    PASSWORD_RESET_OTP_TTL_MINUTES: Number(process.env.PASSWORD_RESET_OTP_TTL_MINUTES) || 10,
    PASSWORD_RESET_OTP_MAX_ATTEMPTS: Number(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS) || 5,
    PASSWORD_RESET_TOKEN_TTL_MINUTES: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || 15,

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,

    // Admin seed
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@bothouniversity.ac.bw",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Admin@123456",
  };
};

// Singleton instance
let envInstance: Env | null = null;

export const getEnv = (): Env => {
  if (!envInstance) {
    envInstance = loadEnv();
  }
  return envInstance;
};
