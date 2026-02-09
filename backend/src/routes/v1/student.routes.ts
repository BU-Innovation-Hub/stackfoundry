/**
 * Student Routes
 * Endpoints for authenticated students
 *
 * GET /api/students/me - Get current student profile
 * (Additional student endpoints can be added here)
 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { RequestWithUser } from "../../types";
import { Request, Response } from "express";

const router = Router();

// ============================================
// All routes require authentication
// ============================================

router.use(requireAuth);

/**
 * @route   GET /api/students/me
 * @desc    Get current student's profile
 * @access  Private (any authenticated user)
 */
router.get("/me", (req: Request, res: Response) => {
  const user = (req as RequestWithUser).user;

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
});

/**
 * @route   GET /api/students/dashboard
 * @desc    Get student dashboard data
 * @access  Private (any authenticated user)
 */
router.get("/dashboard", (req: Request, res: Response) => {
  const user = (req as RequestWithUser).user;

  res.status(200).json({
    success: true,
    data: {
      welcome: `Welcome back, ${user.name}!`,
      studentId: user.studentId,
      role: user.role,
      // Add more dashboard data here
    },
  });
});

export default router;
