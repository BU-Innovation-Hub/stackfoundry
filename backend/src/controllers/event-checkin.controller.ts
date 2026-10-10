import { Request, Response, NextFunction } from "express";
import { RequestWithUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
import { getEnv } from "../config/env";
import * as CheckIn from "../services/event-checkin.service";

export const protectCheckIn = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    if (!req.is("application/json")) return next(new ApiError(415, "JSON content type required"));
    const origin = req.get("origin");
    if ((origin && origin !== new URL(getEnv().CLIENT_URL).origin) || req.get("sec-fetch-site") === "cross-site") {
      return next(new ApiError(403, "This request came from an untrusted website. Reload the app and try again.", { code: "CHECK_IN_ORIGIN_REJECTED" }));
    }
  }
  next();
};

export const session = async (req: Request, res: Response, next: NextFunction) => {
  const controller = new AbortController();
  const disconnect = () => controller.abort();
  res.once('close', disconnect);
  try {
    const after = req.query.after;
    if (after !== undefined && (typeof after !== 'string' || !/^\d{1,16}:\d{1,16}$/.test(after))) throw new ApiError(400, 'Invalid attendance revision');
    const actor = (req as RequestWithUser).user;
    const data = typeof after === 'string'
      ? await CheckIn.waitForCheckInSession(req.params.id, actor, after, controller.signal)
      : await CheckIn.getCheckInSession(req.params.id, actor);
    if (!controller.signal.aborted) res.json({ success: true, data });
  } catch (error) { if (!controller.signal.aborted) next(error); }
  finally { res.removeListener('close', disconnect); }
};
export const setSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body || Object.keys(req.body).length !== 1 || typeof req.body.enabled !== "boolean") throw new ApiError(400, "Provide enabled as a boolean");
    res.json({ success: true, data: await CheckIn.setCheckInSession(req.params.id, (req as RequestWithUser).user, req.body.enabled) });
  } catch (error) { next(error); }
};
export const submit = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await CheckIn.checkIn(req.params.id, (req as RequestWithUser).user, req.body) }); }
  catch (error) { next(error); }
};
