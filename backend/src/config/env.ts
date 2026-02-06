export interface Env {
	NODE_ENV: string;
	PORT: number;
	MONGO_URI: string;
	JWT_SECRET: string;
	REDIS_URL?: string;
	CLOUDINARY_URL?: string;
}

export const loadEnv = (): Env => {
	const NODE_ENV = process.env.NODE_ENV || "development";
	const PORT = Number(process.env.PORT || 5000);
	const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/innovation_hub";
	const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
	const REDIS_URL = process.env.REDIS_URL;
	const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

	return { NODE_ENV, PORT, MONGO_URI, JWT_SECRET, REDIS_URL, CLOUDINARY_URL };
};
