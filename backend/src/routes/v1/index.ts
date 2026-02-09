/**
 * API v1 Routes Index
 * Central router that combines all v1 routes
 */

import { Router } from "express";
import healthRouter from "./health.routes";
import authRouter from "./auth.routes";
import studentRouter from "./student.routes";
import adminRouter from "./admin.routes";

const v1 = Router();

// Health check
v1.use("/health", healthRouter);

// Authentication routes
v1.use("/auth", authRouter);

// Student routes (protected)
v1.use("/students", studentRouter);

// Admin routes (protected + admin role)
v1.use("/admin", adminRouter);

export default v1;
