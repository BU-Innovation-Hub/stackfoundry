import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
	const header = req.headers.authorization || "";
	const token = header.startsWith("Bearer ") ? header.slice(7) : null;

	if (!token) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const payload = verifyToken(token, JWT_SECRET);
		(req as any).user = payload;
		next();
	} catch {
		return res.status(401).json({ error: "Invalid token" });
	}
};
