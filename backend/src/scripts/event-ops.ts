import "dotenv/config";
import mongoose from "mongoose";
import Event from "../models/event.model";
import Attendance from "../models/event-attendance.model";
import Job from "../models/event-job.model";
import { connectDatabase, assertReplicaSet } from "../config/database";
import { getEnv } from "../config/env";
import { eventTransaction } from "../services/event-transaction.service";
import { eventWorkerMetrics } from "../services/event-worker.service";

const main = async () => {
  await connectDatabase(getEnv().MONGO_URI);
  await assertReplicaSet();
  try {
    const command = process.argv[2] || "audit";
    if (command === "metrics") { console.log(JSON.stringify(await eventWorkerMetrics())); return; }
    if (command === "indexes") {
      await Promise.all([Event.createIndexes(), Attendance.createIndexes(), Job.createIndexes()]);
      console.log("Event indexes created (existing indexes preserved)"); return;
    }
    if (command === "replay" || command === "skip") {
      const key = process.argv[3];
      if (!key) throw new Error("Provide the exact failed job key");
      const job = await Job.findOne({ key, status: "failed" });
      if (!job) throw new Error("Failed job not found");
      if (command === "replay" && job.uncertain && !process.argv.includes("--acknowledge-possible-duplicate")) throw new Error("SMTP outcome is uncertain; verify provider logs or acknowledge possible duplicate delivery");
      const changed = await Job.updateOne({ _id: job._id, status: "failed" }, { $set: {
        status: command === "skip" ? "skipped" : "pending", availableAt: new Date(), attempts: 0,
      }, $unset: { lastError: 1, leaseToken: 1, leaseUntil: 1 } });
      console.log(JSON.stringify({ key, command, modified: changed.modifiedCount })); return;
    }
    if (!["audit", "reconcile"].includes(command)) throw new Error("Use audit, reconcile, indexes, metrics, replay KEY, or skip KEY");
    if (command === "reconcile" && (!process.argv.includes("--apply") || !process.argv.includes("--writes-paused"))) throw new Error("Reconciliation requires --apply --writes-paused after backup and pausing event writes");
    let mismatches = 0;
    for await (const event of Event.find({ deletedAt: null }).cursor()) {
      const actual = await Attendance.countDocuments({ event: event._id, status: { $in: ["pending", "approved"] } });
      if (event.attendeeCount === actual) continue;
      mismatches++;
      console.log(JSON.stringify({ event: event._id, stored: event.attendeeCount, actual, overCapacity: event.capacity != null && actual > event.capacity }));
      if (command === "reconcile") await eventTransaction(async session => {
        const count = await Attendance.countDocuments({ event: event._id, status: { $in: ["pending", "approved"] } }).session(session);
        await Event.updateOne({ _id: event._id, deletedAt: null }, { $set: { attendeeCount: count }, $inc: { revision: 1 } }, { session });
      });
    }
    let orphans = 0;
    const cursor = Attendance.aggregate([
      { $lookup: { from: "events", localField: "event", foreignField: "_id", as: "parent" } },
      { $match: { "parent.0": { $exists: false } } }, { $project: { _id: 1, event: 1 } },
    ]).cursor();
    for await (const row of cursor) { orphans++; console.log(JSON.stringify({ orphanAttendance: row._id, event: row.event })); }
    console.log(JSON.stringify({ mismatches, orphans, applied: command === "reconcile" }));
  } finally { await mongoose.disconnect(); }
};
main().catch(error => { console.error(error.message); process.exitCode = 1; });
