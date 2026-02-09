/**
 * Shared TypeScript types and interfaces
 * Central location for all custom types used across the application
 */

import { Request } from "express";
import { Types } from "mongoose";

// ============================================
// User & Authentication Types
// ============================================

/**
 * Role names - used for authorization
 */
export type RoleName = "student" | "admin" | "member" | "instructor";

/**
 * JWT Payload for Access Token
 * Keep minimal - only essential info, no sensitive data
 */
export interface AccessTokenPayload {
  sub: string; // User ID (MongoDB ObjectId as string)
  role: RoleName; // Primary role for quick checks
  name: string; // Display name
  iat?: number; // Issued at (added by JWT)
  exp?: number; // Expiration (added by JWT)
}

/**
 * JWT Payload for Refresh Token
 * Even more minimal than access token
 */
export interface RefreshTokenPayload {
  sub: string; // User ID
  tokenId: string; // Unique token identifier for revocation
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user attached to request
 */
export interface AuthUser {
  id: string;
  studentId: string;
  email: string;
  name: string;
  surname: string;
  role: RoleName;
  roles: Types.ObjectId[];
}

/**
 * Extended Express Request with authenticated user
 */
export interface RequestWithUser extends Request {
  user: AuthUser;
}

// ============================================
// API Response Types
// ============================================

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

/**
 * Auth response with user data (no tokens - they're in cookies)
 */
export interface AuthResponse {
  success: true;
  message: string;
  user: {
    id: string;
    studentId: string;
    email: string;
    name: string;
    surname: string;
    role: RoleName;
  };
}

// ============================================
// Request Body Types (DTOs)
// ============================================

/**
 * Register request body
 */
export interface RegisterBody {
  studentId: string;
  email: string;
  password: string;
  name: string;
  surname: string;
}

/**
 * Login request body
 */
export interface LoginBody {
  email: string;
  password: string;
}

// ============================================
// Model Types (for lean queries)
// ============================================

/**
 * Refresh token stored in user document
 */
export interface StoredRefreshToken {
  tokenHash: string; // bcrypt hash of the token
  tokenId: string; // Unique ID for this specific token
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * User document shape (for lean queries)
 */
export interface UserDocument {
  _id: Types.ObjectId;
  studentId: string;
  email: string;
  name: string;
  surname: string;
  passwordHash: string;
  roles: Types.ObjectId[];
  refreshTokens: StoredRefreshToken[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role document shape
 */
export interface RoleDocument {
  _id: Types.ObjectId;
  name: RoleName;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
