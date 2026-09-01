import mongoose from "mongoose";
import { getEnv } from "../config/env";

const run = async (): Promise<void> => {
  const env = getEnv();
  await mongoose.connect(env.MONGO_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is unavailable");

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const hasUsers = collections.some((collection) => collection.name === "users");
  const hasStudents = collections.some((collection) => collection.name === "students");
  if (!hasUsers && hasStudents) {
    await db.collection("students").rename("users");
    console.log("Renamed students collection to users");
  } else if (hasUsers && hasStudents) {
    throw new Error("Both users and students collections exist; resolve this manually before migration");
  }

  const userCollection = db.collection("users");
  const indexes = await userCollection.indexes();
  const legacyStudentIndex = indexes.find((index) => index.name === "studentId_1");
  if (legacyStudentIndex && !legacyStudentIndex.sparse) {
    await userCollection.dropIndex("studentId_1");
    await userCollection.createIndex({ studentId: 1 }, { unique: true, sparse: true, name: "studentId_1" });
    console.log("Replaced non-sparse student ID index");
  }

  for (const [legacyName, currentName, description] of [
    ["admin", "system_admin", "Administrator with full system access"],
    ["instructor", "mentor", "Mentor who can support innovation hub users"],
  ] as const) {
    const legacy = await db.collection("roles").findOne({ name: legacyName });
    const current = await db.collection("roles").findOne({ name: currentName });
    if (legacy && current) {
      await db.collection("users").updateMany({ roles: legacy._id }, { $addToSet: { roles: current._id }, $pull: { roles: legacy._id } } as any);
      await db.collection("roles").deleteOne({ _id: legacy._id });
    } else if (legacy) {
      await db.collection("roles").updateOne({ _id: legacy._id }, { $set: { name: currentName, description } });
    }
  }
  await db.collection("roles").updateOne({ name: "innovation_hub_admin" }, { $setOnInsert: { name: "innovation_hub_admin", description: "Innovation Hub administrator" } }, { upsert: true });
  console.log("User collection and role migration complete");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
