import { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
	statusCode: number;
	details?: unknown;
	constructor(statusCode: number, message: string, details?: unknown) {
		super(message);
		this.statusCode = statusCode;
		this.details = details;
	}
}

export const notFoundHandler = (_req: Request, res: Response) => {
	res.status(404).json({ error: "Not found" });
};

export const errorHandler = (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	if (err instanceof ApiError) {
		return res.status(err.statusCode).json({ error: err.message, details: err.details });
	}

	// Handle Multer errors (like file too large)
	if (err && (err as any).code === 'LIMIT_FILE_SIZE') {
		return res.status(400).json({ error: 'File too large. Maximum size allowed is 10MB (Cloudinary Free Tier limit).' });
	}

	console.error("Unhandled error:", err);
	res.status(500).json({ error: "Internal server error" });
};
