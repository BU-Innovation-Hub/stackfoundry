/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handlers
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { getEnv } from "./config/env";

const app = express();

// Load environment config
const env = getEnv();

// Trust first proxy (needed for rate-limiter behind reverse proxy / CRA proxy)
app.set("trust proxy", 1);

// ============================================
// Security Middleware
// ============================================

// Helmet - Security headers
app.use(helmet());

// CORS - Allow credentials (cookies)
app.use(
  cors({
    origin: env.CLIENT_URL, // Frontend URL
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes default
  max: env.RATE_LIMIT_MAX_REQUESTS, // 100 requests per window default
  message: {
    success: false,
    error: "Too many requests, please try again later",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    error: "Too many login attempts, please try again in 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply stricter rate limit to auth routes
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);

// ============================================
// Body Parsing Middleware
// ============================================

// Cookie parser - Required for reading cookies
app.use(cookieParser());

// JSON body parser
app.use(express.json({ limit: "1mb" }));

// URL encoded body parser
app.use(express.urlencoded({ extended: true }));

// ============================================
// Logging
// ============================================

// Morgan HTTP request logger
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
}

// ============================================
// Routes
// ============================================

// Health check (no prefix)
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API routes
app.use("/api", apiRouter);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;