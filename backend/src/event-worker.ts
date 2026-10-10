import "dotenv/config";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { getEnv } from "./config/env";
import { connectDatabase, assertReplicaSet } from "./config/database";
import { claimEventJob, runEventJob, eventWorkerMetrics } from "./services/event-worker.service";

const main = async () => {
  const env = getEnv();
  await connectDatabase(env.MONGO_URI);
  await assertReplicaSet();
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; });
  process.on("SIGTERM", () => { stopping = true; });
  const workerId = randomUUID();
  const heartbeat = setInterval(() => {
    mongoose.connection.collection("event_worker_state").updateOne({ workerId }, { $set: { heartbeatAt: new Date() } }, { upsert: true }).catch(console.error);
    eventWorkerMetrics().then(metrics => console.log("[event-worker] metrics", JSON.stringify(metrics))).catch(console.error);
  }, 15000);
  try {
    await Promise.all(Array.from({ length: env.EVENT_WORKER_CONCURRENCY }, async () => {
      while (!stopping) {
        try {
          const job = await claimEventJob();
          if (job) await runEventJob(job);
          else await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error("[event-worker] poll failed", error);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }));
  } finally {
    clearInterval(heartbeat);
    await mongoose.connection.collection("event_worker_state").deleteOne({ workerId });
    await mongoose.disconnect();
  }
};
main().catch(async error => { console.error("[event-worker] startup failed", error); await mongoose.disconnect(); process.exitCode = 1; });
