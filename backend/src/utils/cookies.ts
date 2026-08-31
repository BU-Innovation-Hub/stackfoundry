/**
 * Cookie Utilities
 * Secure cookie configuration for authentication tokens
 *
 * Cookie settings explained:
 * - httpOnly: true - Prevents JavaScript access (XSS protection)
 * - secure: true (production) - Only sent over HTTPS
 * - sameSite: 'strict' - Prevents CSRF attacks
 * - path: '/' - Available on all routes
 * - maxAge: varies - Access token short, refresh token longer
 */

import { Response, CookieOptions } from "express";
import { getEnv } from "../config/env";

// ============================================
// Cookie Names (constants)
// ============================================

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
} as const;

// ============================================
// Cookie Options
// ============================================

/**
 * Get secure cookie options based on environment
 */
const getBaseCookieOptions = (): CookieOptions => {
  const env = getEnv();

  return {
    httpOnly: true, // Cannot be accessed by JavaScript - XSS protection
    secure: env.COOKIE_SECURE, // Only HTTPS in production
    sameSite: "strict", // Strict CSRF protection
    path: "/", // Available on all routes
    domain: env.COOKIE_DOMAIN || undefined, // Omit for localhost
  };
};

/**
 * Get access token cookie options
 * Short expiration (15 minutes default)
 */
export const getAccessTokenCookieOptions = (): CookieOptions => {
  const env = getEnv();

  return {
    ...getBaseCookieOptions(),
    maxAge: parseExpiryToMs(env.ACCESS_TOKEN_EXPIRES_IN),
  };
};

/**
 * Get refresh token cookie options
 * Longer expiration (7 days default)
 * More restrictive path - only sent to refresh endpoint
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const env = getEnv();

  return {
    ...getBaseCookieOptions(),
    maxAge: parseExpiryToMs(env.REFRESH_TOKEN_EXPIRES_IN),
    // Scoped to the actual auth route prefix (/api/v1/auth/refresh) so the
    // refresh request can receive the cookie. A narrower path than "/" limits exposure.
    path: "/api/v1/auth",
  };
};

/**
 * Get options for clearing cookies
 */
export const getClearCookieOptions = (): CookieOptions => {
  return {
    ...getBaseCookieOptions(),
    maxAge: 0,
  };
};

// ============================================
// Cookie Setters
// ============================================

/**
 * Set both access and refresh token cookies
 */
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  res.cookie(
    COOKIE_NAMES.ACCESS_TOKEN,
    accessToken,
    getAccessTokenCookieOptions()
  );

  res.cookie(
    COOKIE_NAMES.REFRESH_TOKEN,
    refreshToken,
    getRefreshTokenCookieOptions()
  );
};

/**
 * Set only access token cookie (used during token refresh)
 */
export const setAccessTokenCookie = (
  res: Response,
  accessToken: string
): void => {
  res.cookie(
    COOKIE_NAMES.ACCESS_TOKEN,
    accessToken,
    getAccessTokenCookieOptions()
  );
};

/**
 * Clear all auth cookies (used during logout)
 */
export const clearAuthCookies = (res: Response): void => {
  // Clear access token
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, "", {
    ...getClearCookieOptions(),
    path: "/",
  });

  // Clear refresh token (must use same path as when set)
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, "", {
    ...getClearCookieOptions(),
    path: "/api/v1/auth",
  });
};

// ============================================
// Utility Functions
// ============================================

/**
 * Parse expiry string (e.g., "15m", "7d") to milliseconds
 */
function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Default to 15 minutes if invalid
    return 15 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

/**
 * Extract token from cookie or Authorization header (fallback)
 * Prefers cookies over headers for security
 */
export const extractAccessToken = (req: {
  cookies?: Record<string, string>;
  headers?: { authorization?: string };
}): string | null => {
  // First, try to get from cookie (preferred)
  if (req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  }

  // Fallback to Authorization header (for API clients)
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

/**
 * Extract refresh token from cookie
 */
export const extractRefreshToken = (req: {
  cookies?: Record<string, string>;
}): string | null => {
  return req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || null;
};
