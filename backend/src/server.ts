import dotenv from "dotenv";
// Load environment variables immediately
dotenv.config();

import app from "./app";
import { loadEnv } from "./config/env";
import { connectDatabase, assertReplicaSet } from "./config/database";
import mongoose from "mongoose";
import { closeEmailTransport } from "./services/email.service";
import { archiveStaleEvents } from "./services/event.service";

const env = loadEnv();

let server: ReturnType<typeof app.listen> | undefined;

// Auto-archive events whose date passed more than a day ago.
// Runs on boot and every 6 hours; also triggered lazily on admin list views.
const ARCHIVE_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const runArchiveSweep = () => {
  archiveStaleEvents()
    .then((count) => {
      if (count > 0) console.log(`[archive] ${count} overdue event(s) archived`);
    })
    .catch((err) => console.error("[archive] sweep failed:", err));
};

// A transaction-capable database is a prerequisite for accepting mutations.
connectDatabase(env.MONGO_URI)
  .then(async () => {
    await assertReplicaSet();
    console.log(" Connected to MongoDB");
  })
  .then(() => {
    runArchiveSweep();
    const archiveTimer = setInterval(runArchiveSweep, ARCHIVE_SWEEP_INTERVAL_MS);
    archiveTimer.unref();

    server = app.listen(env.PORT, () => {
      console.log(` Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(` Health check: http://localhost:${env.PORT}/health`);
      console.log(` API endpoint: http://localhost:${env.PORT}/api/v1/health`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          ` Port ${env.PORT} is already in use — another backend instance is already running.\n` +
            ` Stop the other instance first (taskkill /F /PID <pid-of-port-${env.PORT}>), then run npm run dev again.`
        );
      } else {
        console.error(" Server failed to start:", err);
      }
      process.exit(1);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Closing server gracefully...`);
      clearInterval(archiveTimer);
      server?.close(async () => {
        closeEmailTransport();
        await mongoose.disconnect();
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
  }).catch(async err => {
    console.error("Server startup failed:", err);
    await mongoose.disconnect();
    process.exitCode = 1;
  });

export { };
