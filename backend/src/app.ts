import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import apiRouter from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Core middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ message: "We are looking healthy" });
});

// API routes
app.use("/api", apiRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;