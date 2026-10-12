jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("../config/database", () => ({ assertReplicaSet: jest.fn() }));
jest.mock("../services/bootstrap.service", () => ({ bootstrapDatabase: jest.fn() }));

import mongoose from "mongoose";
import { runBootstrap } from "../scripts/bootstrap";
import { assertReplicaSet } from "../config/database";
import { bootstrapDatabase } from "../services/bootstrap.service";

const previousEnv = process.env;
const previousExitCode = process.exitCode;
let connect: jest.SpyInstance;
let disconnect: jest.SpyInstance;
let log: jest.SpyInstance;
let errorLog: jest.SpyInstance;

beforeEach(() => {
  process.env = { MONGO_URI: "mongodb://user:do-not-log@localhost/test_bootstrap", ADMIN_EMAIL: "admin@bothouniversity.com", ADMIN_PASSWORD: "Do-Not-Log-Password-123" };
  process.exitCode = undefined;
  connect = jest.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
  disconnect = jest.spyOn(mongoose, "disconnect").mockResolvedValue(undefined);
  log = jest.spyOn(console, "log").mockImplementation(() => {});
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  (assertReplicaSet as jest.Mock).mockReset().mockResolvedValue(undefined);
  (bootstrapDatabase as jest.Mock).mockReset().mockResolvedValue({ rolesCreated: 5, adminCreated: true });
});
afterEach(() => {
  jest.restoreAllMocks();
  process.env = previousEnv;
  process.exitCode = previousExitCode;
});

it("prints a safe summary and disconnects after success", async () => {
  await runBootstrap();
  expect(log).toHaveBeenCalledWith("Bootstrap complete: 5 roles created; administrator created.");
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(process.exitCode).toBeUndefined();
});

it("fails before connecting when the target is missing", async () => {
  delete process.env.MONGO_URI;
  await runBootstrap();
  expect(connect).not.toHaveBeenCalled();
  expect(bootstrapDatabase).not.toHaveBeenCalled();
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(process.exitCode).toBe(1);
});

it.each(["connection", "replica", "bootstrap"])("fails closed and never prints database secrets on %s failure", async phase => {
  const failure = new Error(`${process.env.MONGO_URI} ${process.env.ADMIN_PASSWORD}`);
  if (phase === "connection") connect.mockRejectedValue(failure);
  if (phase === "replica") (assertReplicaSet as jest.Mock).mockRejectedValue(failure);
  if (phase === "bootstrap") (bootstrapDatabase as jest.Mock).mockRejectedValue(failure);
  await runBootstrap();
  const output = JSON.stringify([...log.mock.calls, ...errorLog.mock.calls]);
  expect(output).not.toContain("do-not-log");
  expect(output).not.toContain(process.env.ADMIN_PASSWORD);
  expect(output).toContain("Bootstrap failed during");
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(process.exitCode).toBe(1);
  if (phase !== "bootstrap") expect(bootstrapDatabase).not.toHaveBeenCalled();
});
