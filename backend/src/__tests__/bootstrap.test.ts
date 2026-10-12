import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Role from "../models/role.model";
import Student from "../models/user.model";
import { bootstrapDatabase } from "../services/bootstrap.service";
import { INITIAL_ROLES } from "../config/roles";
import { startTestReplica } from "./replica-fixture";

jest.setTimeout(90000);
const config = { adminEmail: "admin@bothouniversity.com", adminPassword: "Test-Admin-Password-274!" };
let stopReplica: (() => Promise<void>) | undefined;
const previousAutoIndex = mongoose.get("autoIndex");

beforeAll(async () => {
  mongoose.set("autoIndex", false);
  stopReplica = await startTestReplica();
  await Promise.all([Role.init(), Student.init()]);
});
afterAll(async () => { await stopReplica?.(); mongoose.set("autoIndex", previousAutoIndex); });
beforeEach(async () => {
  await Student.deleteMany({});
  await Role.deleteMany({});
});

it("creates exactly five roles and a usable administrator with a hashed password", async () => {
  expect(await bootstrapDatabase(config)).toEqual({ rolesCreated: 5, adminCreated: true });
  expect((await Role.find().distinct("name")).sort()).toEqual(INITIAL_ROLES.map(role => role.name).sort());
  expect(await Student.countDocuments()).toBe(1);
  const admin = await Student.findOne({ email: config.adminEmail }).select("+passwordHash");
  expect(await admin!.getPrimaryRole()).toBe("system_admin");
  expect(admin!.isActive).toBe(true);
  expect(admin!.passwordHash).not.toBe(config.adminPassword);
  expect(bcrypt.getRounds(admin!.passwordHash)).toBe(12);
  expect(await admin!.comparePassword(config.adminPassword)).toBe(true);
  expect(admin!.studentId).toBeUndefined();
  expect(await Student.collection.indexes()).toEqual(expect.arrayContaining([expect.objectContaining({ key: { email: 1 }, unique: true })]));
  expect(await Role.collection.indexes()).toEqual(expect.arrayContaining([expect.objectContaining({ key: { name: 1 }, unique: true })]));
  const collections = await mongoose.connection.db!.listCollections().toArray();
  expect(collections.map(item => item.name).sort()).toEqual(["roles", "users"]);
});

it("preserves every account field, tokens, changed passwords, and role metadata on reruns", async () => {
  await bootstrapDatabase(config);
  const changedHash = await Student.hashPassword("Changed-Password-964!");
  await Student.updateOne({ email: config.adminEmail }, { $set: {
    passwordHash: changedHash, name: "Updated", bio: "Keep this profile",
    refreshTokens: [{ tokenId: "existing-session", tokenHash: "hash", createdAt: new Date(), expiresAt: new Date(Date.now() + 60000) }],
  } });
  await Role.updateOne({ name: "student" }, { $set: { description: "Custom description" } });
  const before = await Student.findOne({ email: config.adminEmail }).select("+passwordHash +refreshTokens").lean();
  const rolesBefore = await Role.find().sort({ name: 1 }).lean();
  expect(await bootstrapDatabase({ adminEmail: " ADMIN@BOTHOUNIVERSITY.COM " })).toEqual({ rolesCreated: 0, adminCreated: false });
  expect(await bootstrapDatabase({ ...config, adminPassword: "ignored" })).toEqual({ rolesCreated: 0, adminCreated: false });
  expect(await Student.findOne({ email: config.adminEmail }).select("+passwordHash +refreshTokens").lean()).toEqual(before);
  expect(await Role.find().sort({ name: 1 }).lean()).toEqual(rolesBefore);
});

it("repairs missing roles after partial initialization", async () => {
  await bootstrapDatabase(config);
  await Role.deleteOne({ name: "mentor" });
  expect(await bootstrapDatabase({ adminEmail: config.adminEmail })).toEqual({ rolesCreated: 1, adminCreated: false });
  expect(await Student.countDocuments()).toBe(1);
});

it("does not promote an existing student account", async () => {
  const role = await Role.create(INITIAL_ROLES[0]);
  await Student.create({ email: config.adminEmail, name: "Student", surname: "User", passwordHash: "unchanged", roles: [role._id] });
  const before = await Student.findOne().select("+passwordHash").lean();
  await expect(bootstrapDatabase(config)).rejects.toThrow("primary role is not system_admin");
  expect(await Student.findOne().select("+passwordHash").lean()).toEqual(before);
  expect(await Role.countDocuments()).toBe(1);
});

it("does not reactivate a disabled administrator", async () => {
  await bootstrapDatabase(config);
  await Student.updateOne({ email: config.adminEmail }, { $set: { isActive: false } });
  const before = await Student.findOne().select("+passwordHash").lean();
  await expect(bootstrapDatabase(config)).rejects.toThrow("inactive");
  expect(await Student.findOne().select("+passwordHash").lean()).toEqual(before);
});

it("rejects missing initial credentials without inserting seed records", async () => {
  await expect(bootstrapDatabase({ adminEmail: config.adminEmail })).rejects.toThrow("ADMIN_PASSWORD");
  expect(await Role.countDocuments()).toBe(0);
  expect(await Student.countDocuments()).toBe(0);
});

it("handles concurrent release jobs without duplicate roles or accounts", async () => {
  const results = await Promise.all(Array.from({ length: 4 }, () => bootstrapDatabase(config)));
  expect(results.filter(result => result.adminCreated)).toHaveLength(1);
  expect(await Role.countDocuments()).toBe(5);
  expect(await Student.countDocuments()).toBe(1);
});

it("fails on existing duplicate emails instead of silently accepting missing uniqueness", async () => {
  await Student.collection.dropIndex("email_1");
  await Student.collection.insertMany([{ email: config.adminEmail }, { email: config.adminEmail }] as never[]);
  await expect(bootstrapDatabase(config)).rejects.toMatchObject({ code: 11000 });
  expect(await Role.countDocuments()).toBe(0);
  expect(await Student.countDocuments()).toBe(2);
});
