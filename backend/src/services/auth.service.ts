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
import Student, { IStudent } from "../models/user.model";
import Role from "../models/role.model";
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

  // Get or create student role
  let studentRole = await Role.findOne({ name: "student" });
  if (!studentRole) {
    studentRole = await Role.create({
      name: "student",
      description: "Regular student with basic access",
    });
  }

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
  if (studentWithTokens) {
    await studentWithTokens.addRefreshToken(
      refreshTokenHash,
      tokenId,
      expiresAt,
      meta
    );
  }

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
    // Revoke all tokens as a security measure
    await student.removeAllRefreshTokens();
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
  if (freshStudent) {
    await freshStudent.addRefreshToken(
      newRefreshTokenHash,
      newTokenId,
      expiresAt,
      meta
    );
  }

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
  };
};
