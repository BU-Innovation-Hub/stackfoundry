/**
 * API v1 Routes Index
 * Central router that combines all v1 routes
 */

import { Router } from "express";
import healthRouter from "./health.routes";
import authRouter from "./auth.routes";
import studentRouter from "./student.routes";
import userRouter from "./user.routes";
import adminRouter from "./admin.routes";
import blogRouter from "./blog.routes";
import eventRouter from "./event.routes";
import uploadRouter from "./upload.routes";

// LMS routes
import courseRouter from "./course.routes";
import levelRouter from "./level.routes";
import topicRouter from "./topic.routes";
import materialRouter from "./material.routes";
import enrollmentRouter from "./enrollment.routes";
import progressRouter from "./progress.routes";
import auditRouter from "./audit.routes";

const v1 = Router();

// Health check
v1.use("/health", healthRouter);

// Authentication routes
v1.use("/auth", authRouter);

// Student routes (protected)
v1.use("/students", studentRouter);
// Compatibility alias: new clients should use /users.
v1.use("/users", userRouter);

// Admin routes (protected + admin role)
v1.use("/admin", adminRouter);

// Blog routes (some protected, some public)
v1.use("/blogs", blogRouter);

// Event routes (some protected, some public)
v1.use("/events", eventRouter);
// Upload routes (protected)
v1.use("/upload", uploadRouter);

// LMS routes
v1.use("/courses", courseRouter);
v1.use("/levels", levelRouter);
v1.use("/topics", topicRouter);
v1.use("/materials", materialRouter);
v1.use("/", enrollmentRouter); // mounts /enroll and /enrollments/*
v1.use("/progress", progressRouter);
v1.use("/audit-logs", auditRouter);

export default v1;
