/**
 * Audit Service
 * Business logic and query building for the audit log endpoint
 */

import AuditLog from "../models/audit-log.model";
import { ApiError } from "../middleware/errorHandler";

export interface AuditQueryOptions {
  page: number;
  limit: number;
  action?: string;
  eventType?: "http" | "business";
  actorId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

/**
 * Parse and validate pagination params from the request query
 */
export const parsePagination = (query: any): { page: number; limit: number } => {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit, 10) || 25));
  return { page, limit };
};

/**
 * Build the MongoDB filter from validated query options
 */
export const buildFilter = (options: AuditQueryOptions): Record<string, any> => {
  const filter: Record<string, any> = {};

  if (options.action) filter.action = options.action;
  if (options.eventType) filter.eventType = options.eventType;
  if (options.actorId) filter.actorId = options.actorId;

  // Date range filtering (inclusive on both ends)
  if (options.fromDate || options.toDate) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};

    if (options.fromDate) {
      const from = new Date(options.fromDate);
      if (isNaN(from.getTime())) {
        throw new ApiError(400, "Invalid fromDate. Use a valid ISO/date string.");
      }
      createdAt.$gte = from;
    }

    if (options.toDate) {
      const to = new Date(options.toDate);
      if (isNaN(to.getTime())) {
        throw new ApiError(400, "Invalid toDate. Use a valid ISO/date string.");
      }
      // Include the entire end day when a date (no time) is provided
      createdAt.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000);
    }

    filter.createdAt = createdAt;
  }

  // Free-text search across action, route, method, and actor ip/requestId
  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    filter.$or = [
      { action: { $regex: q, $options: "i" } },
      { route: { $regex: q, $options: "i" } },
      { method: { $regex: q, $options: "i" } },
      { ipAddress: { $regex: q, $options: "i" } },
      { requestId: { $regex: q, $options: "i" } },
    ];
  }

  return filter;
};

/**
 * List audit logs with pagination, ordering, and filters
 */
export const listAuditLogs = async (options: AuditQueryOptions) => {
  if (options.eventType && options.eventType !== "http" && options.eventType !== "business") {
    throw new ApiError(400, "eventType must be 'http' or 'business'");
  }

  const filter = buildFilter(options);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      pages: Math.ceil(total / options.limit),
      hasNext: options.page * options.limit < total,
      hasPrevious: options.page > 1,
    },
  };
};
