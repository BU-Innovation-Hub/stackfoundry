/**
 * Unit tests for the password reset (OTP) flow in auth.service
 * Mongoose models and the email service are mocked — no database or SMTP required.
 */

jest.mock("../models/user.model");
jest.mock("../models/role.model");
jest.mock("../models/password-reset.model");
jest.mock("../utils/audit", () => ({ recordAuditEvent: jest.fn() }));
jest.mock("../services/email.service", () => ({
  sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
}));

import bcrypt from "bcryptjs";
import crypto from "crypto";
import Student from "../models/user.model";
import PasswordReset from "../models/password-reset.model";
import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  confirmPasswordReset,
} from "../services/auth.service";
import { sendPasswordResetOtp } from "../services/email.service";

const mockedStudent = Student as jest.Mocked<typeof Student>;
const mockedReset = PasswordReset as jest.Mocked<typeof PasswordReset>;
const mockedEmail = sendPasswordResetOtp as jest.Mock;

const baseUser = {
  _id: { toString: () => "user-1" },
  email: "user@bothouniversity.ac.bw",
  name: "Test",
  isActive: true,
};

describe("requestPasswordReset", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is enumeration-safe: silently succeeds for unknown emails without sending", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(null);

    await expect(requestPasswordReset("ghost@bothouniversity.ac.bw")).resolves.toBeUndefined();
    expect(mockedReset.create).not.toHaveBeenCalled();
    expect(mockedEmail).not.toHaveBeenCalled();
  });

  it("creates a reset session and emails the OTP for a known user", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(baseUser);
    (mockedReset.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (mockedReset.create as jest.Mock).mockResolvedValue({});

    await requestPasswordReset("user@bothouniversity.ac.bw");

    // Old sessions cleared, new session created with a hashed OTP
    expect(mockedReset.deleteMany).toHaveBeenCalledWith({ user: baseUser._id });
    expect(mockedReset.create).toHaveBeenCalledTimes(1);
    const createdArg = (mockedReset.create as jest.Mock).mock.calls[0][0];
    expect(createdArg.user).toBe(baseUser._id);
    expect(createdArg.otpHash).toEqual(expect.any(String));
    expect(createdArg.otpHash.length).toBeGreaterThan(20);
    expect(createdArg.expiresAt).toBeInstanceOf(Date);
    expect(createdArg.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(createdArg.attempts).toBe(0);

    // Email contains a 5-digit OTP
    expect(mockedEmail).toHaveBeenCalledWith(
      "user@bothouniversity.ac.bw",
      "Test",
      expect.stringMatching(/^\d{5}$/),
      expect.any(Number)
    );
  });
});

describe("verifyPasswordResetOtp", () => {
  beforeEach(() => jest.clearAllMocks());

  const makeSession = (overrides: Record<string, any> = {}) => ({
    user: baseUser._id,
    otpHash: bcrypt.hashSync("12345", 8),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    verifiedAt: undefined,
    resetTokenHash: undefined,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it("rejects when no reset session exists", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(baseUser);
    (mockedReset.findOne as jest.Mock).mockResolvedValue(null);

    await expect(verifyPasswordResetOtp("user@bothouniversity.ac.bw", "12345"))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects unknown emails with a generic error", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(null);

    await expect(verifyPasswordResetOtp("ghost@bothouniversity.ac.bw", "12345"))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid email or OTP" });
  });

  it("rejects an expired OTP", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(baseUser);
    (mockedReset.findOne as jest.Mock).mockResolvedValue(
      makeSession({ expiresAt: new Date(Date.now() - 1000) })
    );

    await expect(verifyPasswordResetOtp("user@bothouniversity.ac.bw", "12345"))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("expired") });
  });

  it("rejects after max attempts and does not verify the OTP", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(baseUser);
    const session = makeSession({ attempts: 5 });
    (mockedReset.findOne as jest.Mock).mockResolvedValue(session);

    await expect(verifyPasswordResetOtp("user@bothouniversity.ac.bw", "12345"))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("Maximum") });
    expect(session.verifiedAt).toBeUndefined();
  });

  it("increments the attempt counter on a wrong OTP", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(baseUser);
    const session = makeSession({ attempts: 2 });
    (mockedReset.findOne as jest.Mock).mockResolvedValue(session);

    await expect(verifyPasswordResetOtp("user@bothouniversity.ac.bw", "00000"))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("2 attempts remaining") });
    expect(session.attempts).toBe(3);
    expect(session.save).toHaveBeenCalled();
    expect(session.resetTokenHash).toBeUndefined();
  });

  it("issues a single-use reset token on the correct OTP", async () => {
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(baseUser);
    const session = makeSession();
    (mockedReset.findOne as jest.Mock).mockResolvedValue(session);

    const { resetToken } = await verifyPasswordResetOtp("user@bothouniversity.ac.bw", "12345");

    expect(resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(session.resetTokenHash).toBe(
      crypto.createHash("sha256").update(resetToken).digest("hex")
    );
    expect(session.verifiedAt).toBeInstanceOf(Date);
    expect(session.save).toHaveBeenCalled();
  });
});

describe("confirmPasswordReset", () => {
  beforeEach(() => jest.clearAllMocks());

  const makeVerifiedSession = (overrides: Record<string, any> = {}) => ({
    user: { toString: () => "user-1" },
    verifiedAt: new Date(),
    ...overrides,
  });

  const makeFullUser = (overrides: Record<string, any> = {}) => ({
    ...baseUser,
    passwordHash: bcrypt.hashSync("OldPass123", 8),
    refreshTokens: [{ tokenId: "t1" }],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it("rejects an unknown token", async () => {
    (mockedReset.findOne as jest.Mock).mockResolvedValue(null);

    await expect(confirmPasswordReset("bogus", "NewPass123"))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("Invalid or expired") });
  });

  it("rejects a token outside the reset window", async () => {
    (mockedReset.findOne as jest.Mock).mockResolvedValue(
      makeVerifiedSession({ verifiedAt: new Date(Date.now() - 20 * 60 * 1000) })
    );

    await expect(confirmPasswordReset("any", "NewPass123"))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("Invalid or expired") });
  });

  it("rejects reusing the current password", async () => {
    (mockedReset.findOne as jest.Mock).mockResolvedValue(makeVerifiedSession());
    const user = makeFullUser();
    const select = jest.fn().mockResolvedValue(user);
    (mockedStudent.findById as jest.Mock).mockReturnValue({ select });

    await expect(confirmPasswordReset("tok", "OldPass123"))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("different") });
    expect(user.save).not.toHaveBeenCalled();
  });

  it("resets the password, revokes all sessions and deletes the reset session", async () => {
    (mockedReset.findOne as jest.Mock).mockResolvedValue(makeVerifiedSession());
    const user = makeFullUser();
    const select = jest.fn().mockResolvedValue(user);
    (mockedStudent.findById as jest.Mock).mockReturnValue({ select });
    (mockedReset.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 });

    await confirmPasswordReset("tok", "NewPass123");

    expect(bcrypt.compareSync("NewPass123", user.passwordHash)).toBe(true);
    expect(user.refreshTokens).toEqual([]);
    expect(user.save).toHaveBeenCalled();
    expect(mockedReset.deleteMany).toHaveBeenCalledWith({
      resetTokenHash: crypto.createHash("sha256").update("tok").digest("hex"),
    });
  });
});
