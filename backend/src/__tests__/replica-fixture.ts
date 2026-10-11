import { spawn, ChildProcess } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, basename } from "path";
import { createServer } from "net";
import mongoose from "mongoose";

export const startTestReplica = async () => {
  const probe = createServer();
  await new Promise<void>(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const directory = mkdtempSync(join(tmpdir(), "innovation-event-test-"));
  let processError: Error | undefined;
  const child: ChildProcess = spawn(process.env.MONGOD_BINARY || "mongod", [
    "--dbpath", directory, "--port", String(port), "--bind_ip", "127.0.0.1", "--replSet", "events_test", "--quiet",
  ], { windowsHide: true, stdio: "ignore" });
  child.on("error", error => { processError = error; });
  const client = new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
  try {
    for (let attempt = 0; ; attempt++) {
      if (processError) throw processError;
      try { await client.connect(); break; }
      catch (error) { if (attempt > 60) throw error; await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    await client.db("admin").command({ replSetInitiate: { _id: "events_test", members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
    for (let attempt = 0; ; attempt++) {
      if ((await client.db("admin").command({ hello: 1 })).isWritablePrimary) break;
      if (attempt > 100) throw new Error("Test replica election timed out");
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    await mongoose.connect(`mongodb://127.0.0.1:${port}/event_hardening_test?replicaSet=events_test`);
  } catch (error) { child.kill(); throw error; }
  finally { await client.close(); }
  return async () => {
    await mongoose.disconnect();
    await new Promise<void>(resolve => { child.once("exit", () => resolve()); child.kill(); });
    // Only remove the exact temporary database directory created by this fixture.
    if (basename(directory).startsWith("innovation-event-test-")) rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
};
