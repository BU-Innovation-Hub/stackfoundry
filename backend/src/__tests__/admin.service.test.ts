/**
 * Unit tests for admin.service
 * Mongoose models are mocked — no database required.
 */

jest.mock("../models/user.model");
jest.mock("../models/role.model");
jest.mock("../utils/audit", () => ({ recordAuditEvent: jest.fn() }));

import Student from "../models/user.model";
import Role from "../models/role.model";
import {
  updateUserRole,
  toggleUserActive,
  deleteUser,
  updateUserProfile,
} from "../services/admin.service";
import { AuthUser, RoleName } from "../types";

const mockedStudent = Student as jest.Mocked<typeof Student>;
const mockedRole = Role as jest.Mocked<typeof Role>;

const makeActor = (role: RoleName): AuthUser => ({
  id: "actor-1",
  email: "actor@bothouniversity.ac.bw",
  name: "Actor",
  surname: "Admin",
  role,
  roles: [],
});

/** Build a hydrated-user mock matching what populate("roles") returns */
const makeUser = (overrides: Record<string, any> = {}) => {
  const roleName = overrides.roleName ?? "student";
  return {
    _id: { toString: () => overrides.id ?? "user-1" },
    email: overrides.email ?? "user@bothouniversity.ac.bw",
    name: overrides.name ?? "Test",
    surname: overrides.surname ?? "User",
    studentId: overrides.studentId,
    isActive: overrides.isActive ?? true,
    roles: [{ _id: "role-1", name: roleName }],
    refreshTokens: overrides.refreshTokens ?? [{ tokenId: "t1" }],
    getPrimaryRole: jest.fn().mockResolvedValue(roleName),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
};

/** Populate chaining helper: findById().populate("roles") */
const mockFindByIdPopulate = (user: any) => {
  const populate = jest.fn().mockResolvedValue(user);
  (mockedStudent.findById as jest.Mock).mockReturnValue({ populate });
};

const mockFindByIdSelectPopulate = (user: any) => {
  const populate = jest.fn().mockResolvedValue(user);
  const select = jest.fn().mockReturnValue({ populate });
  (mockedStudent.findById as jest.Mock).mockReturnValue({ select });
};

describe("updateUserRole", () => {
  it("rejects assigning the system_admin role", async () => {
    await expect(
      updateUserRole("user-1", "system_admin", makeActor("system_admin"))
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockedStudent.findById).not.toHaveBeenCalled();
  });

  it("rejects innovation hub admins assigning administrator roles", async () => {
    await expect(
      updateUserRole("user-1", "innovation_hub_admin", makeActor("innovation_hub_admin"))
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 404 when user does not exist", async () => {
    mockFindByIdPopulate(null);
    await expect(
      updateUserRole("missing", "mentor", makeActor("system_admin"))
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("protects the last active system admin from demotion", async () => {
    const user = makeUser({ roleName: "system_admin" });
    mockFindByIdPopulate(user);
    (mockedRole.findOne as jest.Mock).mockResolvedValue({ _id: "sys-role", name: "system_admin" });
    (mockedStudent.countDocuments as jest.Mock).mockResolvedValue(1);

    await expect(
      updateUserRole("user-1", "student", makeActor("system_admin"))
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("last active admin") });
    expect(user.save).not.toHaveBeenCalled();
  });

  it("rejects a second innovation hub admin", async () => {
    const user = makeUser({ roleName: "student" });
    mockFindByIdPopulate(user);
    (mockedRole.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: "hub-role", name: "innovation_hub_admin" });
    (mockedStudent.countDocuments as jest.Mock).mockResolvedValue(1);

    await expect(
      updateUserRole("user-1", "innovation_hub_admin", makeActor("system_admin"))
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(user.save).not.toHaveBeenCalled();
  });

  it("assigns the new role and saves", async () => {
    const user = makeUser({ roleName: "student" });
    mockFindByIdPopulate(user);
    (mockedRole.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: "mentor-role", name: "mentor" });

    const result = await updateUserRole("user-1", "mentor", makeActor("system_admin"));

    expect(mockedRole.findOneAndUpdate).toHaveBeenCalledWith(
      { name: "mentor" },
      expect.anything(),
      expect.objectContaining({ upsert: true, new: true })
    );
    expect(user.roles).toEqual(["mentor-role"]);
    expect(user.save).toHaveBeenCalledWith();
    expect(result).toEqual({ id: "user-1", role: "mentor", isActive: true });
  });
});

describe("toggleUserActive", () => {
  it("deactivates a user and revokes all sessions", async () => {
    const user = makeUser({ isActive: true, refreshTokens: [{ tokenId: "t1" }, { tokenId: "t2" }] });
    mockFindByIdSelectPopulate(user);

    const result = await toggleUserActive("user-1", makeActor("system_admin"));

    expect(user.isActive).toBe(false);
    expect(user.refreshTokens).toEqual([]);
    expect(user.save).toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });

  it("reactivates an inactive user", async () => {
    const user = makeUser({ isActive: false, refreshTokens: [] });
    mockFindByIdSelectPopulate(user);

    const result = await toggleUserActive("user-1", makeActor("system_admin"));

    expect(user.isActive).toBe(true);
    expect(result.isActive).toBe(true);
  });

  it("protects the last active system admin from deactivation", async () => {
    const user = makeUser({ isActive: true, roleName: "system_admin" });
    mockFindByIdSelectPopulate(user);
    (mockedRole.findOne as jest.Mock).mockResolvedValue({ _id: "sys-role", name: "system_admin" });
    (mockedStudent.countDocuments as jest.Mock).mockResolvedValue(1);

    await expect(toggleUserActive("user-1", makeActor("system_admin")))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(user.save).not.toHaveBeenCalled();
  });

  it("blocks innovation hub admins from managing system administrators", async () => {
    const user = makeUser({ roleName: "system_admin" });
    mockFindByIdSelectPopulate(user);

    await expect(toggleUserActive("user-1", makeActor("innovation_hub_admin")))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("deleteUser", () => {
  it("throws 404 when user does not exist", async () => {
    mockFindByIdPopulate(null);
    await expect(deleteUser("missing", makeActor("system_admin")))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("protects the last active system admin from deletion", async () => {
    const user = makeUser({ roleName: "system_admin" });
    mockFindByIdPopulate(user);
    (mockedRole.findOne as jest.Mock).mockResolvedValue({ _id: "sys-role", name: "system_admin" });
    (mockedStudent.countDocuments as jest.Mock).mockResolvedValue(1);

    await expect(deleteUser("user-1", makeActor("system_admin")))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("last active admin") });
    expect(mockedStudent.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("deletes a regular user", async () => {
    const user = makeUser({ roleName: "student" });
    mockFindByIdPopulate(user);
    (mockedStudent.findByIdAndDelete as jest.Mock).mockResolvedValue(user);

    await deleteUser("user-1", makeActor("system_admin"));

    expect(mockedStudent.findByIdAndDelete).toHaveBeenCalledWith("user-1");
  });
});

describe("updateUserProfile", () => {
  it("throws 404 when user does not exist", async () => {
    mockFindByIdPopulate(null);
    await expect(updateUserProfile("missing", { name: "New" }, makeActor("system_admin")))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects duplicate email", async () => {
    const user = makeUser();
    mockFindByIdPopulate(user);
    (mockedStudent.findOne as jest.Mock).mockResolvedValue({ _id: { toString: () => "other" } });

    await expect(
      updateUserProfile("user-1", { email: "taken@bothouniversity.ac.bw" }, makeActor("system_admin"))
    ).rejects.toMatchObject({ statusCode: 409, message: "Email already registered" });
    expect(user.save).not.toHaveBeenCalled();
  });

  it("rejects studentId edits for non-student users", async () => {
    const user = makeUser({ roleName: "mentor" });
    mockFindByIdPopulate(user);

    await expect(
      updateUserProfile("user-1", { studentId: "2026-0001" }, makeActor("system_admin"))
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("student users") });
  });

  it("updates name, surname, email and studentId for a student", async () => {
    const user = makeUser({ roleName: "student", studentId: "OLD-1" });
    mockFindByIdPopulate(user);
    (mockedStudent.findOne as jest.Mock).mockResolvedValue(null);

    const result = await updateUserProfile(
      "user-1",
      { name: "Alice", surname: "Smith", email: "alice@bothouniversity.ac.bw", studentId: "NEW-42" },
      makeActor("innovation_hub_admin")
    );

    expect(user.name).toBe("Alice");
    expect(user.surname).toBe("Smith");
    expect(user.email).toBe("alice@bothouniversity.ac.bw");
    expect(user.studentId).toBe("NEW-42");
    expect(user.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "user-1",
      name: "Alice",
      surname: "Smith",
      email: "alice@bothouniversity.ac.bw",
      studentId: "NEW-42",
      role: "student",
    });
  });

  it("blocks innovation hub admins from editing system administrators", async () => {
    const user = makeUser({ roleName: "system_admin" });
    mockFindByIdPopulate(user);

    await expect(
      updateUserProfile("user-1", { name: "Hacker" }, makeActor("innovation_hub_admin"))
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
