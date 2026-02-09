/**
 * Express Request Type Extension
 * Extends the Express Request interface to include authenticated user
 */

import { AuthUser } from "./index";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
