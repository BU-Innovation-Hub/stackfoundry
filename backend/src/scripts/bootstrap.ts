import dotenv from "dotenv";
import mongoose from "mongoose";
import { BootstrapError, loadBootstrapConfig } from "../config/bootstrap";
import { assertReplicaSet } from "../config/database";
import { bootstrapDatabase } from "../services/bootstrap.service";

export const runBootstrap = async (): Promise<void> => {
  dotenv.config({ quiet: true });
  let phase = "configuration validation";
  try {
    const config = loadBootstrapConfig();
    phase = "database connection (check MONGO_URI, database credentials, and network access)";
    await mongoose.connect(config.mongoUri, { autoIndex: false, serverSelectionTimeoutMS: 15000 });
    phase = "replica set verification (a replica set or mongos is required)";
    await assertReplicaSet();
    phase = "index creation and bootstrap (check database permissions and existing unique-key conflicts)";
    const result = await bootstrapDatabase(config);
    console.log(`Bootstrap complete: ${result.rolesCreated} roles created; administrator ${result.adminCreated ? "created" : "already exists (unchanged)"}.`);
  } catch (error) {
    // Driver/validation errors can contain the URI, credentials, or document values.
    console.error(error instanceof BootstrapError ? error.message : `Bootstrap failed during ${phase}. Database error details were withheld to protect secrets.`);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); }
    catch { console.error("Bootstrap failed to close the database connection."); process.exitCode = 1; }
  }
};

if (require.main === module) void runBootstrap();
