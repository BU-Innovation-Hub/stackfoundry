import dotenv from "dotenv";
// Load environment variables immediately
dotenv.config();

import app from "./app";
import { loadEnv } from "./config/env";
import { connectDatabase } from "./config/database";

const env = loadEnv();

let server: ReturnType<typeof app.listen> | undefined;

// Try to connect DB, but start server regardless
connectDatabase(env.MONGO_URI)
  .then(() => {
    console.log(" Connected to MongoDB");
  })
  .catch((err) => {
    console.error(" Failed to connect to MongoDB:", err);
    console.warn(" Starting server without database connection...");
  })
  .finally(() => {
    server = app.listen(env.PORT, () => {
      console.log(` Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(` Health check: http://localhost:${env.PORT}/health`);
      console.log(` API endpoint: http://localhost:${env.PORT}/api/v1/health`);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Closing server gracefully...`);
      server?.close(() => {
        console.log("Server closed");
        process.exit(0);
      });

      setTimeout(() => {
        console.error(" Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (reason: Error) => {
      console.error(" Unhandled Rejection:", reason);
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  });

export { };