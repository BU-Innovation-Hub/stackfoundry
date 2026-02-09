/**
 * JWT Utilities
 * Secure token generation and verification for access and refresh tokens
 *
 * Security considerations:
 * - Access tokens: Short-lived (15m), contain minimal user info
 * - Refresh tokens: Longer-lived (7d), contain only user ID and token ID
 * - Separate secrets for access and refresh tokens
 * - No sensitive data in payloads
 */

import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { getEnv } from "../config/env";
import { AccessTokenPayload, RefreshTokenPayload, RoleName } from "../types";

// ============================================
// Types
// ============================================

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenId: string; // For tracking/revoking refresh tokens
}

interface UserForToken {
  id: string;
  name: string;
  role: RoleName;
}

// ============================================
// Token Generation
// ============================================

/**
 * Generate a unique token ID for refresh token tracking
 */
export const generateTokenId = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Sign an access token (short-lived)
 * Contains: user ID, role, name
 */
export const signAccessToken = (user: UserForToken): string => {
  const env = getEnv();

  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    name: user.name,
  };

  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: "innovation-hub",
    audience: "innovation-hub-client",
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

/**
 * Sign a refresh token (longer-lived)
 * Contains: user ID, unique token ID
 */
export const signRefreshToken = (userId: string, tokenId: string): string => {
  const env = getEnv();

  const payload: RefreshTokenPayload = {
    sub: userId,
    tokenId,
  };

  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: "innovation-hub",
    audience: "innovation-hub-client",
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (user: UserForToken): TokenPair => {
  const tokenId = generateTokenId();

  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id, tokenId),
    tokenId,
  };
};

// ============================================
// Token Verification
// ============================================

/**
 * Verify and decode an access token
 * Throws if invalid or expired
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const env = getEnv();

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "innovation-hub",
      audience: "innovation-hub-client",
    }) as JwtPayload & AccessTokenPayload;

    // Validate required claims are present and non-empty
    if (!decoded.sub || typeof decoded.sub !== "string" || decoded.sub.trim() === "") {
      throw new Error("Invalid access token: missing subject claim");
    }
    if (!decoded.role || typeof decoded.role !== "string" || decoded.role.trim() === "") {
      throw new Error("Invalid access token: missing role claim");
    }

    return {
      sub: decoded.sub,
      role: decoded.role,
      name: decoded.name,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Access token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid access token");
    }
    throw error;
  }
};

/**
 * Verify and decode a refresh token
 * Throws if invalid or expired
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const env = getEnv();

  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: "innovation-hub",
      audience: "innovation-hub-client",
    }) as JwtPayload & RefreshTokenPayload;

    // Validate required claims are present and non-empty
    if (!decoded.sub || typeof decoded.sub !== "string" || decoded.sub.trim() === "") {
      throw new Error("Invalid refresh token: missing subject claim");
    }
    if (!decoded.tokenId || typeof decoded.tokenId !== "string" || decoded.tokenId.trim() === "") {
      throw new Error("Invalid refresh token: missing tokenId claim");
    }

    return {
      sub: decoded.sub,
      tokenId: decoded.tokenId,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate expiration date from duration string (e.g., "7d", "15m")
 */
export const getExpirationDate = (duration: string): Date => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const now = new Date();
  switch (unit) {
    case "s":
      return new Date(now.getTime() + value * 1000);
    case "m":
      return new Date(now.getTime() + value * 60 * 1000);
    case "h":
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case "d":
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
};

/**
 * Decode token without verification (for debugging only)
 * DO NOT use for authentication!
 */
export const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null;
};

// Legacy exports for backward compatibility
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;

export interface JwtUserPayload extends AccessTokenPayload {}

