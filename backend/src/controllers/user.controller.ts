import { Request, Response } from "express";

export const getMe = (req: Request, res: Response) => {
  const user = (req as any).user || null;
  res.status(200).json({ user });
};
