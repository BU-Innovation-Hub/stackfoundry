/**
 * Authentication Routes
 *
 * POST /api/auth/register - Register new student
 * POST /api/auth/login - Login student
 * POST /api/auth/refresh - Refresh access token
 * POST /api/auth/logout - Logout (current device)
 * POST /api/auth/logout-all - Logout (all devices)
 * GET  /api/auth/me - Get current user
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as AuthController from "../../controllers/auth.controller";
import { requireAuth } from "../../middleware/auth";
import {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  verifyOtpValidation,
  resetPasswordValidation,
} from "../../utils/validation";

const router = Router();

// ============================================
// Rate Limiters (brute-force protection for sensitive endpoints)
// ============================================

/** Generous-but-bounded: 5 OTP requests / 15 min / IP */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset requests. Please try again later." },
});

/** 10 OTP verifications / 15 min / IP */
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many verification attempts. Please try again later." },
});

/** 5 password resets / 15 min / IP */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset attempts. Please try again later." },
});

// ============================================
// Public Routes (no authentication required)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student account
 * @access  Public
 */
router.post("/register", registerValidation, AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post("/login", loginValidation, AuthController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token cookie
 * @access  Public (but requires valid refresh token in cookie)
 */
router.post("/refresh", AuthController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout from current device (clears cookies)
 * @access  Public (works even if not authenticated)
 */
router.post("/logout", AuthController.logout);

// ============================================
// Protected Routes (authentication required)
// ============================================

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices (revokes all refresh tokens)
 * @access  Private
 */
router.post("/logout-all", requireAuth, AuthController.logoutAll);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get("/me", requireAuth, AuthController.me);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user (current + new + confirm)
 * @access  Private
 */
router.post(
  "/change-password",
  requireAuth,
  changePasswordValidation,
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request a 5-digit OTP for password reset (enumeration-safe)
 * @access  Public
 */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordValidation,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/forgot-password/verify
 * @desc    Verify the 5-digit OTP and receive a single-use reset token
 * @access  Public
 */
router.post(
  "/forgot-password/verify",
  verifyOtpLimiter,
  verifyOtpValidation,
  AuthController.verifyPasswordResetOtp
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Complete the password reset using the reset token
 * @access  Public
 */
router.post(
  "/reset-password",
  resetPasswordLimiter,
  resetPasswordValidation,
  AuthController.resetPassword
);

export default router;
