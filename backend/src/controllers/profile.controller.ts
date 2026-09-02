import { Request, Response, NextFunction } from "express";
import { RequestWithUser } from "../types";
import * as ProfileService from "../services/profile.service";

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const actor = (req as RequestWithUser).user;
    const allowed = ["name", "surname", "email", "bio", "skills", "interests", "faculty", "department", "programme", "collaborationOptIn"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const user = await ProfileService.updateProfile(actor.id, updates);
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await ProfileService.getProfile((req as RequestWithUser).user.id);
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};
