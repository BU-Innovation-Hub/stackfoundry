import app from "./app";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Start server
const server = app.listen(PORT, () => {
  console.log(` Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` API endpoint: http://localhost:${PORT}/api`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Closing server gracefully...`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error(" Forced shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled rejections
process.on("unhandledRejection", (reason: Error) => {
  console.error(" Unhandled Rejection:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

export default server;