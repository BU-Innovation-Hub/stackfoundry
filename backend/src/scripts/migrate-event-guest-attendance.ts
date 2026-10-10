import mongoose from "mongoose";
import { getEnv } from "../config/env";

/** Run before deploying guest attendance: npx ts-node src/scripts/migrate-event-guest-attendance.ts */
const run = async () => {
  await mongoose.connect(getEnv().MONGO_URI);
  const collection = mongoose.connection.collection("event_attendance");
  const indexes = await collection.indexes();
  const legacy = indexes.find(index => index.name === "event_1_user_1");
  if (legacy) await collection.dropIndex("event_1_user_1");
  await collection.createIndex({ event: 1, user: 1 }, { name: "event_1_user_1", unique: true, partialFilterExpression: { user: { $type: "objectId" } } });
  await collection.createIndex({ event: 1, guest: 1 }, { name: "event_1_guest_1", unique: true, partialFilterExpression: { guest: { $type: "objectId" } } });
  await mongoose.disconnect();
};

run().catch(async error => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
