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
import * as AuthController from "../../controllers/auth.controller";
import { requireAuth } from "../../middleware/auth";
import { registerValidation, loginValidation } from "../../utils/validation";

const router = Router();

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

export default router;
