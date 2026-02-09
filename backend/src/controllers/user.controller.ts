/**
 * User Controller
 * HTTP handlers for user operations
 */

import { Request, Response } from "express";
import { RequestWithUser } from "../types";

/**
 * Get current authenticated user
 * @deprecated Use AuthController.me or StudentController instead
 */
export const getMe = (req: Request, res: Response) => {
  const user = (req as RequestWithUser).user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      studentId: user.studentId,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
    },
  });
};
