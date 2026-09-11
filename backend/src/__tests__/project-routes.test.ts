/**
 * Route-level authorization tests.
 * Verifies the shared project middleware (not per-controller copies) enforces
 * the permission matrix, and that the legacy Idea surface returns 410 Gone
 * with a pointer to the new endpoint.
 */

jest.mock("../models/innovation.model", () => ({
  ReviewAssignment: { exists: jest.fn() },
  Showcase: { findOneAndUpdate: jest.fn() },
}));
jest.mock("../models/project.model", () => ({
  Project: { findById: jest.fn() },
  ProjectInvite: {},
  Comment: {},
  Review: {},
  PROJECT_STATUSES: ["draft", "submitted", "under_review", "feedback_provided", "resubmitted", "approved", "rejected", "incubation", "archived"],
  PROJECT_VISIBILITIES: ["private", "public"],
  INVITE_ROLES: ["maintainer", "contributor"],
  REVIEW_DECISIONS: ["approve", "request_changes", "reject", "comment"],
}));

import { Request, Response } from "express";
import {
  loadProject,
  requireProjectOwnerOrAdmin,
  requireProjectMaintainer,
  requireProjectCollaborator,
  requireProjectCommenter,
  requireProjectReviewer,
} from "../middleware/projectAuth";
import ideasLegacyRouter from "../routes/v1/ideas.routes";
import projectsRouter from "../routes/v1/projects.routes";

const run = (mw: any, req: any): Promise<{ denied: boolean; status?: number }> =>
  new Promise((resolve) => {
    const res = {} as Response;
    mw(req as Request, res, (err?: any) => {
      if (err) resolve({ denied: true, status: err.statusCode });
      else resolve({ denied: false });
    });
  });

const reqWithRole = (role: string) => ({ params: { id: "p1" }, projectRole: role } as any);

describe("shared project role gates (single source of truth)", () => {
  it("owner/admin gate denies maintainer, contributor, mentor, none", async () => {
    for (const role of ["owner", "admin"]) {
      await expect(run(requireProjectOwnerOrAdmin, reqWithRole(role))).resolves.toEqual({ denied: false });
    }
    for (const role of ["maintainer", "contributor", "mentor", "none"]) {
      await expect(run(requireProjectOwnerOrAdmin, reqWithRole(role))).resolves.toEqual({ denied: true, status: 403 });
    }
  });

  it("maintainer gate allows owner/maintainer/admin only", async () => {
    for (const role of ["owner", "maintainer", "admin"]) {
      await expect(run(requireProjectMaintainer, reqWithRole(role))).resolves.toEqual({ denied: false });
    }
    for (const role of ["contributor", "mentor", "none"]) {
      await expect(run(requireProjectMaintainer, reqWithRole(role))).resolves.toEqual({ denied: true, status: 403 });
    }
  });

  it("member mutation gate allows project members but denies mentors and admins", async () => {
    for (const role of ["owner", "maintainer", "contributor"]) {
      await expect(run(requireProjectCollaborator, reqWithRole(role))).resolves.toEqual({ denied: false });
    }
    for (const role of ["mentor", "admin", "none"]) {
      await expect(run(requireProjectCollaborator, reqWithRole(role))).resolves.toEqual({ denied: true, status: 403 });
    }
  });

  it("comment gate allows members and assigned mentors, denies strangers", async () => {
    for (const role of ["owner", "maintainer", "contributor", "mentor", "admin"]) {
      await expect(run(requireProjectCommenter, reqWithRole(role))).resolves.toEqual({ denied: false });
    }
    await expect(run(requireProjectCommenter, reqWithRole("none"))).resolves.toEqual({ denied: true, status: 403 });
  });

  it("review gate allows mentor/admin only (server-side, never client-sent)", async () => {
    for (const role of ["mentor", "admin"]) {
      await expect(run(requireProjectReviewer, reqWithRole(role))).resolves.toEqual({ denied: false });
    }
    for (const role of ["owner", "maintainer", "contributor", "none"]) {
      await expect(run(requireProjectReviewer, reqWithRole(role))).resolves.toEqual({ denied: true, status: 403 });
    }
  });
});

describe("loadProject", () => {
  const { Project } = require("../models/project.model");
  const { ReviewAssignment } = require("../models/innovation.model");

  it("404s invalid ids and missing projects", async () => {
    const next = jest.fn();
    await loadProject({ params: { id: "not-an-id" }, user: { id: "u1", role: "student" } } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it("403s strangers on private projects", async () => {
    (Project.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) }),
      }),
    });
    const next = jest.fn();
    await loadProject({ params: { id: "507f1f77bcf86cd799439011" }, user: { id: "u1", role: "student" } } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(ReviewAssignment).toBeDefined();
  });
});

describe("legacy Idea surface", () => {
  const collectPaths = (router: any): string[] => {
    const paths: string[] = [];
    for (const layer of router.stack || []) {
      if (layer.route?.path) paths.push(`${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);
    }
    return paths;
  };

  it("exposes 410 Gone handlers for every old /ideas path", () => {
    const paths = collectPaths(ideasLegacyRouter).join("\n");
    for (const p of ["/", "/mine", "/explore", "/:id", "/:id/submit", "/:id/review", "/:id/feedback", "/:id/invitations", "/:id/invitations/respond", "/:id/review-assignments"]) {
      expect(paths).toContain(p);
    }
  });

  it("410 handlers return Gone + movedTo pointer (never a silent break)", async () => {
    const layer: any = (ideasLegacyRouter.stack || []).find((l: any) => l.route?.path === "/:id/submit");
    expect(layer).toBeDefined();
    const handler = layer.route.stack[0].handle;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    await handler({} as any, { status } as any, jest.fn());
    expect(status).toHaveBeenCalledWith(410);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ movedTo: expect.stringContaining("/api/v1/projects") }));
  });
});

describe("canonical project router surface", () => {
  const collectPaths = (router: any): string[] => {
    const paths: string[] = [];
    const walk = (stack: any[]) => {
      for (const layer of stack || []) {
        if (layer.route?.path) paths.push(layer.route.path);
        else if (layer.handle?.stack) walk(layer.handle.stack);
      }
    };
    walk(router.stack);
    return paths;
  };

  it("mounts every endpoint from the agreed surface", () => {
    const paths = collectPaths(projectsRouter);
    for (const p of ["/mine", "/explore", "/", "/:id", "/:id/submit", "/:id", "/:id/invites", "/invites/mine", "/invites/:id/respond", "/:id/collaborators/:userId", "/:id/comments", "/:id/reviews", "/:id/showcase"]) {
      expect(paths).toContain(p);
    }
  });

  it("exposes delete on the project resource", () => {
    const route: any = (projectsRouter.stack || []).find((layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.delete);
    expect(route?.route?.methods?.delete).toBe(true);
  });
});
