import { Request, Response, NextFunction } from "express";
import * as AuditService from "../services/audit.service";

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = AuditService.parsePagination(req.query);

    const result = await AuditService.listAuditLogs({
      page,
      limit,
      action: typeof req.query.action === "string" ? req.query.action : undefined,
      eventType:
        req.query.eventType === "http" || req.query.eventType === "business"
          ? req.query.eventType
          : undefined,
      actorId: typeof req.query.actorId === "string" ? req.query.actorId : undefined,
      fromDate: typeof req.query.fromDate === "string" ? req.query.fromDate : undefined,
      toDate: typeof req.query.toDate === "string" ? req.query.toDate : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
