/**
 * Authentication Service
 * Business logic for authentication operations
 *
 * Responsibilities:
 * - User registration with password hashing
 * - User login with credential verification
 * - Token generation and rotation
 * - Refresh token management (hash, store, validate, revoke)
 * - Logout (single device or all devices)
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import Student, { IStudent } from "../models/user.model";
import Role from "../models/role.model";
import PasswordReset from "../models/password-reset.model";
import {
  generateTokenPair,
  signAccessToken,
  signRefreshToken,
  generateTokenId,
  verifyRefreshToken,
  getExpirationDate,
} from "../utils/jwt";
import { getEnv } from "../config/env";
import { RoleName, RegisterBody, AuthUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
import { recordAuditEvent } from "../utils/audit";
import { sendPasswordResetOtp } from "./email.service";

// ============================================
// Constants
// ============================================

const BCRYPT_ROUNDS = 12;

// ============================================
// Types
// ============================================

interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenId: string;
}

interface RefreshResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenId: string;
}

// ============================================
// Service Functions
// ============================================

/**
 * Register a new student
 * - Creates user with hashed password
 * - Assigns default 'student' role
 * - Generates initial token pair
 */
export const registerStudent = async (
  data: RegisterBody,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<AuthResult> => {
  // Check if email already exists
  const existingEmail = await Student.findOne({
    email: data.email.toLowerCase(),
  });
  if (existingEmail) {
    throw new ApiError(409, "Email already registered");
  }

  // Check if studentId already exists
  const existingStudentId = await Student.findOne({
    studentId: data.studentId,
  });
  if (existingStudentId) {
    throw new ApiError(409, "Student ID already registered");
  }

  // Get or create student role (atomic upsert to prevent duplicate key errors)
  const studentRole = await Role.findOneAndUpdate(
    { name: "student" },
     { $setOnInsert: { name: "student", description: "Regular student with basic access" } },
    { upsert: true, new: true }
  );

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Create user
  const student = await Student.create({
    studentId: data.studentId,
    email: data.email.toLowerCase(),
    name: data.name,
    surname: data.surname,
    passwordHash,
    roles: [studentRole._id],
    refreshTokens: [],
    isActive: true,
  });

  // Generate tokens
  const { accessToken, refreshToken, tokenId } = generateTokenPair({
    id: student._id.toString(),
    name: student.name,
    role: "student",
  });

  // Store hashed refresh token
  const env = getEnv();
  const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
  const expiresAt = getExpirationDate(env.REFRESH_TOKEN_EXPIRES_IN);

  // Need to fetch with tokens selected
  const studentWithTokens = await Student.findById(student._id).select(
    "+refreshTokens"
  );
  if (!studentWithTokens) {
    throw new ApiError(500, "Failed to persist refresh token: user not found after creation");
  }
  await studentWithTokens.addRefreshToken(
    refreshTokenHash,
    tokenId,
    expiresAt,
    meta
  );

  // Update last login
  await Student.findByIdAndUpdate(student._id, { lastLogin: new Date() });

  return {
    user: {
      id: student._id.toString(),
      studentId: student.studentId,
      email: student.email,
      name: student.name,
      surname: student.surname,
      role: "student",
      roles: student.roles,
    },
    accessToken,
    refreshToken,
    tokenId,
  };
};

/**
 * Login existing user
 * - Validates credentials
 * - Generates new token pair
 * - Stores hashed refresh token
 */
export const loginStudent = async (
  email: string,
  password: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<AuthResult> => {
  // Find user with password and tokens
  const student = (await Student.findOne({
    email: email.toLowerCase(),
    isActive: true,
  })
    .select("+passwordHash +refreshTokens")
    .populate("roles")) as IStudent | null;

  if (!student) {
    // Use generic message to prevent email enumeration
    throw new ApiError(401, "Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, student.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Get primary role
  const primaryRole = await student.getPrimaryRole();

  // Generate new tokens
  const { accessToken, refreshToken, tokenId } = generateTokenPair({
    id: student._id.toString(),
    name: student.name,
    role: primaryRole,
  });

  // Store hashed refresh token
  const env = getEnv();
  const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
  const expiresAt = getExpirationDate(env.REFRESH_TOKEN_EXPIRES_IN);

  await student.addRefreshToken(refreshTokenHash, tokenId, expiresAt, meta);

  // Update last login
  student.lastLogin = new Date();
  await student.save();

  recordAuditEvent({ eventType: "business", action: "auth.login_succeeded", actorId: student._id.toString(), targetType: "User", targetId: student._id.toString(), success: true, metadata: { email: student.email } });
  return {
    user: {
      id: student._id.toString(),
      studentId: student.studentId,
      email: student.email,
      name: student.name,
      surname: student.surname,
      role: primaryRole,
      roles: student.roles,
    },
    accessToken,
    refreshToken,
    tokenId,
  };
};

/**
 * Refresh tokens (token rotation)
 * - Verifies refresh token
 * - Invalidates old refresh token
 * - Issues new token pair
 *
 * Security: Token rotation prevents refresh token theft persistence
 */
export const refreshTokens = async (
  currentRefreshToken: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<RefreshResult> => {
  // Verify the refresh token JWT
  let payload;
  try {
    payload = verifyRefreshToken(currentRefreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Find user with their stored tokens
  const student = (await Student.findById(payload.sub)
    .select("+refreshTokens")
    .populate("roles")) as IStudent | null;

  if (!student || !student.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  // Find the stored token by tokenId
  const storedToken = student.refreshTokens.find(
    (t) => t.tokenId === payload.tokenId
  );

  if (!storedToken) {
    // Token not found - possible token reuse attack
    await student.removeAllRefreshTokens(); // REVOKES ALL TOKENS
    throw new ApiError(401, "Refresh token not found - all sessions revoked");
  }

  // Verify the token hash matches
  const isTokenValid = await bcrypt.compare(
    currentRefreshToken,
    storedToken.tokenHash
  );

  if (!isTokenValid) {
    // Hash mismatch - token was tampered with
    await student.removeAllRefreshTokens();
    throw new ApiError(401, "Invalid refresh token - all sessions revoked");
  }

  // Check if token is expired (belt and suspenders - JWT already checks this)
  if (storedToken.expiresAt < new Date()) {
    await student.removeRefreshToken(payload.tokenId);
    throw new ApiError(401, "Refresh token expired");
  }

  // Revoke the old refresh token (rotation)
  await student.removeRefreshToken(payload.tokenId);

  // Get primary role
  const primaryRole = await student.getPrimaryRole();

  // Generate new token pair
  const newTokenId = generateTokenId();
  const newAccessToken = signAccessToken({
    id: student._id.toString(),
    name: student.name,
    role: primaryRole,
  });
  const newRefreshToken = signRefreshToken(student._id.toString(), newTokenId);

  // Store new hashed refresh token
  const env = getEnv();
  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, BCRYPT_ROUNDS);
  const expiresAt = getExpirationDate(env.REFRESH_TOKEN_EXPIRES_IN);

  // Refetch to get fresh refreshTokens array
  const freshStudent = await Student.findById(student._id).select(
    "+refreshTokens"
  );
  if (!freshStudent) {
    throw new ApiError(500, "Failed to persist refresh token: user not found during token rotation");
  }
  await freshStudent.addRefreshToken(
    newRefreshTokenHash,
    newTokenId,
    expiresAt,
    meta
  );

  return {
    user: {
      id: student._id.toString(),
      studentId: student.studentId,
      email: student.email,
      name: student.name,
      surname: student.surname,
      role: primaryRole,
      roles: student.roles,
    },
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    tokenId: newTokenId,
  };
};

/**
 * Logout from current device
 * - Revokes the specific refresh token
 */
export const logoutStudent = async (
  userId: string,
  refreshToken: string
): Promise<void> => {
  // Verify the refresh token to get tokenId
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    // Token is invalid/expired, but we still want to clear cookies
    // So we don't throw here
    return;
  }

  // Find user and remove the specific token
  const student = await Student.findById(userId).select("+refreshTokens");
  if (student) {
    await student.removeRefreshToken(payload.tokenId);
  }
};

/**
 * Logout from all devices
 * - Revokes all refresh tokens
 */
export const logoutAllDevices = async (userId: string): Promise<void> => {
  const student = await Student.findById(userId).select("+refreshTokens");
  if (student) {
    await student.removeAllRefreshTokens();
  }
};

/**
 * Get user by ID (for middleware)
 */
export const getUserById = async (userId: string): Promise<AuthUser | null> => {
  const student = await Student.findById(userId).populate("roles");
  if (!student || !student.isActive) {
    return null;
  }

  const primaryRole = await student.getPrimaryRole();

  return {
    id: student._id.toString(),
    studentId: student.studentId,
    email: student.email,
    name: student.name,
    surname: student.surname,
    role: primaryRole,
    roles: student.roles,
    roleNames: student.roles.map((role) => (role as unknown as { name: RoleName }).name),
  };
};

/**
 * Change password for authenticated user
 * - Verifies the current password
 * - Hashes the new password
 * - Revokes all refresh tokens (forces re-login on all devices)
 *
 * Security: After password change, all existing sessions are invalidated
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  // Load user with password hash and refresh tokens
  const student = await Student.findById(userId).select(
    "+passwordHash +refreshTokens"
  );

  if (!student) {
    throw new ApiError(404, "User not found");
  }

  if (!student.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  // Verify current password
  const isCurrentValid = await bcrypt.compare(
    currentPassword,
    student.passwordHash
  );
  if (!isCurrentValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // Prevent reusing the same password
  const isSamePassword = await bcrypt.compare(newPassword, student.passwordHash);
  if (isSamePassword) {
    throw new ApiError(400, "New password must be different from the current password");
  }

  // Hash new password with same rounds as registration
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password and revoke all refresh tokens
  student.passwordHash = newHash;
  student.refreshTokens = [];
  await student.save();
  recordAuditEvent({ eventType: "business", action: "auth.password_changed", actorId: userId, targetType: "User", targetId: userId, success: true });
};

// ============================================
// Password Reset (OTP) Flow
// ============================================

/**
 * Generate a cryptographically-seeded n-digit OTP
 */
const generateOtp = (digits = 5): string => {
  const max = 10 ** digits;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(digits, "0");
};

/**
 * Request a password reset OTP. Enumeration-safe: always succeeds even if the
 * email is unknown, so an attacker cannot probe for valid accounts.
 *
 * - Generates 5-digit OTP (bcrypt-hashed at rest)
 * - Replaces any previous reset session for this email
 * - Sends OTP via email (dev console fallback when SMTP not configured)
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const env = getEnv();

  // Enumeration-safe: find the user but never leak existence
  const user = await Student.findOne({ email: normalizedEmail, isActive: true });

  if (!user) {
    // Still simulate work so timing is comparable
    await bcrypt.hash(generateOtp(), 8);
    return;
  }

  // Clean up any previous reset sessions for this user
  await PasswordReset.deleteMany({ user: user._id });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_OTP_TTL_MINUTES * 60 * 1000);

  await PasswordReset.create({
    user: user._id,
    otpHash,
    expiresAt,
    attempts: 0,
  });

  await sendPasswordResetOtp(normalizedEmail, user.name, otp, env.PASSWORD_RESET_OTP_TTL_MINUTES);

  recordAuditEvent({
    eventType: "business",
    action: "auth.password_reset_requested",
    actorId: user._id.toString(),
    targetType: "User",
    targetId: user._id.toString(),
    success: true,
    metadata: { email: normalizedEmail },
  });
};

/**
 * Verify a reset OTP and return a single-use reset token on success.
 * Enforces max attempts and expiry.
 */
export const verifyPasswordResetOtp = async (
  email: string,
  otp: string
): Promise<{ resetToken: string }> => {
  const normalizedEmail = email.toLowerCase();
  const env = getEnv();

  const user = await Student.findOne({ email: normalizedEmail });
  if (!user) {
    throw new ApiError(400, "Invalid email or OTP");
  }

  const session = await PasswordReset.findOne({ user: user._id });
  if (!session) {
    throw new ApiError(400, "No password reset in progress for this email. Please request a new code.");
  }
  if (session.verifiedAt) {
    throw new ApiError(400, "This OTP has already been used. Please request a new code.");
  }
  if (session.expiresAt < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new code.");
  }
  if (session.attempts >= env.PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
    throw new ApiError(400, "Maximum verification attempts exceeded. Please request a new code.");
  }

  const isMatch = await bcrypt.compare(otp, session.otpHash);
  if (!isMatch) {
    session.attempts += 1;
    await session.save();
    throw new ApiError(400, `Invalid OTP. ${env.PASSWORD_RESET_OTP_MAX_ATTEMPTS - session.attempts} attempts remaining.`);
  }

  // OTP verified — issue a single-use opaque reset token (hash at rest)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  session.resetTokenHash = resetTokenHash;
  session.verifiedAt = new Date();
  await session.save();

  return { resetToken };
};

/**
 * Complete the password reset using the token issued after OTP verification.
 * Token is single-use and expires after PASSWORD_RESET_TOKEN_TTL_MINUTES.
 * On success: updates password, revokes all sessions, deletes the reset session.
 */
export const confirmPasswordReset = async (token: string, newPassword: string): Promise<void> => {
  const env = getEnv();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find the session whose hash matches
  const session = await PasswordReset.findOne({ resetTokenHash: tokenHash });
  if (!session) {
    throw new ApiError(400, "Invalid or expired reset token. Please restart the password reset flow.");
  }
  // Token window check
  if (!session.verifiedAt || session.verifiedAt < new Date(Date.now() - env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000)) {
    throw new ApiError(400, "Invalid or expired reset token. Please restart the password reset flow.");
  }

  // Load user with refresh tokens so we can revoke sessions
  const user = await Student.findById(session.user).select("+passwordHash +refreshTokens");
  if (!user) {
    throw new ApiError(400, "Invalid reset token. Please restart the password reset flow.");
  }

  // Prevent reusing the current password
  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new ApiError(400, "New password must be different from your current password");
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordHash = newHash;
  user.refreshTokens = [];
  await user.save();

  // Delete the reset session so the token cannot be reused
  await PasswordReset.deleteMany({ resetTokenHash: tokenHash });

  recordAuditEvent({
    eventType: "business",
    action: "auth.password_reset_completed",
    actorId: user._id.toString(),
    targetType: "User",
    targetId: user._id.toString(),
    success: true,
  });
};
