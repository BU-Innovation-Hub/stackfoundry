import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import { RequestWithUser } from "../types";
import { recordAuditEvent } from "../utils/audit";

export const auditHttpRequest = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();
  const requestId = randomUUID();
  res.setHeader("X-Request-Id", requestId);
  res.once("finish", () => {
    const user = (req as RequestWithUser).user;
    recordAuditEvent({
      eventType: "http",
      action: "http.request",
      actorId: user?.id,
      actorRoles: user?.roleNames || (user?.role ? [user.role] : []),
      method: req.method,
      route: req.route?.path || req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      requestId,
      success: res.statusCode < 400,
    });
  });
  next();
};
