import { Types } from "mongoose";
import AuditLog, { AuditEventType } from "../models/audit-log.model";

export interface AuditEvent {
  eventType: AuditEventType;
  action: string;
  actorId?: string;
  actorRoles?: string[];
  targetType?: string;
  targetId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export const recordAuditEvent = (event: AuditEvent): void => {
  const actorId = event.actorId && Types.ObjectId.isValid(event.actorId)
    ? new Types.ObjectId(event.actorId)
    : undefined;
  void AuditLog.create({ ...event, actorId, requestId: event.requestId || "system" })
    .catch((error) => console.error("Audit log persistence failed", error));
};
