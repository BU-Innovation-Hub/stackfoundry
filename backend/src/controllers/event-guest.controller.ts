import { Request, Response, NextFunction, CookieOptions } from "express";
import { getEnv } from "../config/env";
import { ApiError } from "../middleware/errorHandler";
import * as GuestService from "../services/event-guest.service";

const cookieName = (eventId: string) => `event_guest_${eventId}`;
const cookieOptions = (eventId: string, expires?: Date): CookieOptions => ({
  httpOnly: true, secure: getEnv().COOKIE_SECURE, sameSite: "strict", path: `/api/v1/events/${eventId}/guest`,
  ...(getEnv().COOKIE_DOMAIN ? { domain: getEnv().COOKIE_DOMAIN } : {}),
  ...(expires ? { expires } : {}),
});
const tokenFor = (req: Request) => req.cookies?.[cookieName(req.params.id)] as string | undefined;

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await GuestService.createGuestSession(req.params.id, req.body?.name || "", req.body?.email || "", tokenFor(req));
    res.cookie(cookieName(req.params.id), result.token, cookieOptions(req.params.id, result.expiresAt));
    res.status(201).json({ success: true, data: { guestId: result.guest.guestId, name: result.guest.name, email: result.guest.email, expiresAt: result.expiresAt, registrationLink: result.registrationLink || null } });
  } catch (error) { next(error); }
};
export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await GuestService.getGuestSession(req.params.id, tokenFor(req)) }); } catch (error) { next(error); }
};
export const join = async (req: Request, res: Response, next: NextFunction) => {
  try { const token = tokenFor(req); if (!token) throw new ApiError(401, "Guest session required"); const data = await GuestService.joinAsGuest(req.params.id, token); res.status(201).json({ success: true, data }); } catch (error) { next(error); }
};
export const cancel = async (req: Request, res: Response, next: NextFunction) => {
  try { const token = tokenFor(req); if (!token) throw new ApiError(401, "Guest session required"); res.json({ success: true, data: await GuestService.cancelGuestAttendance(req.params.id, token) }); } catch (error) { next(error); }
};
