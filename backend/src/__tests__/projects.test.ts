/**
 * Project repository permission matrix tests.
 * Covers resolveProjectRole + canReadProject for every role (owner/maintainer/
 * contributor/mentor/admin/stranger) plus submitProject state transitions and
 * collaborator-removal guards. Models are mocked; no database required.
 */

jest.mock("../models/innovation.model", () => ({
  ReviewAssignment: { exists: jest.fn(), deleteMany: jest.fn() },
  Showcase: { findOneAndUpdate: jest.fn(), deleteMany: jest.fn() },
  ProjectFile: { deleteMany: jest.fn() },
}));
jest.mock("../models/project.model", () => ({
  Project: { updateOne: jest.fn(), findById: jest.fn(), findOneAndUpdate: jest.fn(), deleteOne: jest.fn() },
  ProjectInvite: { updateMany: jest.fn(), deleteMany: jest.fn() },
  Comment: { deleteMany: jest.fn() },
  Review: { deleteMany: jest.fn() },
  PROJECT_STATUSES: ["draft", "submitted", "under_review", "feedback_provided", "resubmitted", "approved", "rejected", "incubation", "archived"],
  PROJECT_VISIBILITIES: ["private", "public"],
  INVITE_ROLES: ["maintainer", "contributor"],
  REVIEW_DECISIONS: ["approve", "request_changes", "reject", "comment"],
}));
jest.mock("../models/user.model", () => ({ __esModule: true, default: {} }));
jest.mock("../services/innovation.service", () => ({ notify: jest.fn().mockResolvedValue(undefined) }));

import { ReviewAssignment } from "../models/innovation.model";
import { resolveProjectRole, canReadProject, isAdminUser } from "../middleware/projectAuth";
import { submitProject, removeCollaborator } from "../services/project.service";

const mockedExists = ReviewAssignment.exists as jest.Mock;

const user = (overrides: any = {}) => ({
  id: "u-owner",
  role: "student",
  roleNames: [],
  email: "owner@example.com",
  ...overrides,
});

const project = (overrides: any = {}) => ({
  _id: "p1",
  owner: "u-owner",
  visibility: "private",
  status: "draft",
  collaborators: [{ user: "u-owner", role: "owner" }],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("isAdminUser", () => {
  it("treats system_admin and innovation_hub_admin (incl. roleNames) as admin", () => {
    expect(isAdminUser(user({ role: "system_admin" }))).toBe(true);
    expect(isAdminUser(user({ role: "innovation_hub_admin" }))).toBe(true);
    expect(isAdminUser(user({ role: "mentor", roleNames: ["innovation_hub_admin"] }))).toBe(true);
    expect(isAdminUser(user({ role: "mentor" }))).toBe(false);
    expect(isAdminUser(user({ role: "student" }))).toBe(false);
  });
});

describe("resolveProjectRole permission matrix", () => {
  beforeEach(() => jest.clearAllMocks());

  it("owner resolves to owner", async () => {
    mockedExists.mockResolvedValue(null);
    await expect(resolveProjectRole(project(), user())).resolves.toBe("owner");
  });

  it("maintainer / contributor resolve from collaborators", async () => {
    mockedExists.mockResolvedValue(null);
    const p = project({ collaborators: [{ user: "u2", role: "maintainer" }, { user: "u3", role: "contributor" }] });
    await expect(resolveProjectRole(p, user({ id: "u2" }))).resolves.toBe("maintainer");
    await expect(resolveProjectRole(p, user({ id: "u3" }))).resolves.toBe("contributor");
  });

  it("assigned mentor resolves to mentor", async () => {
    mockedExists.mockResolvedValue({ _id: "a1" });
    const p = project({ collaborators: [] });
    await expect(resolveProjectRole(p, user({ id: "u-mentor", role: "mentor" }))).resolves.toBe("mentor");
  });

  it("admin resolves to admin even without membership", async () => {
    mockedExists.mockResolvedValue(null);
    const p = project({ collaborators: [] });
    await expect(resolveProjectRole(p, user({ id: "u-admin", role: "innovation_hub_admin" }))).resolves.toBe("admin");
  });

  it("stranger resolves to none", async () => {
    mockedExists.mockResolvedValue(null);
    const p = project({ collaborators: [] });
    await expect(resolveProjectRole(p, user({ id: "u-stranger" }))).resolves.toBe("none");
  });
});

describe("canReadProject", () => {
  beforeEach(() => jest.clearAllMocks());

  it("public projects are readable by strangers", async () => {
    await expect(canReadProject(project({ visibility: "public", collaborators: [] }), user({ id: "stranger" }))).resolves.toBe(true);
    expect(mockedExists).not.toHaveBeenCalled();
  });

  it("private projects deny strangers", async () => {
    mockedExists.mockResolvedValue(null);
    await expect(canReadProject(project({ collaborators: [] }), user({ id: "stranger" }))).resolves.toBe(false);
  });

  it("private projects allow collaborators and assigned mentors", async () => {
    const p = project({ collaborators: [{ user: "u-c", role: "contributor" }] });
    await expect(canReadProject(p, user({ id: "u-c" }))).resolves.toBe(true);

    mockedExists.mockResolvedValueOnce({ _id: "a1" });
    await expect(canReadProject(project({ collaborators: [] }), user({ id: "u-m", role: "mentor" }))).resolves.toBe(true);
  });

  it("admins can read everything", async () => {
    await expect(canReadProject(project({ collaborators: [] }), user({ id: "adm", role: "system_admin" }))).resolves.toBe(true);
  });
});

describe("submitProject transitions", () => {
  beforeEach(() => {
    const { Project } = require("../models/project.model");
    (Project.findOneAndUpdate as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({ status: "submitted" }),
    });
  });

  it("draft -> submitted", async () => {
    const p: any = project({ status: "draft", reviewHistory: [] });
    const out = await submitProject(p);
    expect(out.status).toBe("submitted");
  });

  it("feedback_provided -> resubmitted", async () => {
    const p: any = project({ status: "feedback_provided", reviewHistory: [] });
    const { Project } = require("../models/project.model");
    (Project.findOneAndUpdate as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({ status: "resubmitted" }),
    });
    const out = await submitProject(p);
    expect(out.status).toBe("resubmitted");
  });

  it("rejects submit from submitted/approved (permission-denied path)", async () => {
    await expect(submitProject(project({ status: "submitted" }) as any)).rejects.toMatchObject({ statusCode: 409 });
    await expect(submitProject(project({ status: "approved" }) as any)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("removeCollaborator guards", () => {
  beforeEach(() => jest.clearAllMocks());

  it("refuses to remove the owner", async () => {
    await expect(removeCollaborator(project() as any, "u-owner")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("404s unknown collaborators", async () => {
    await expect(removeCollaborator(project({ collaborators: [] }) as any, "u-ghost")).rejects.toMatchObject({ statusCode: 404 });
  });
});
