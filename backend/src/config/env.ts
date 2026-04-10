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
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets must be set in production!");
    }
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI must be set in production!");
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
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
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

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,

    // Admin seed
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@bothouniversity.com",
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
