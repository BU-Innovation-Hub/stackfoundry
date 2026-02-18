import { Types } from "mongoose";

export const CATEGORIES = [
    "technology",
    "entrepreneurship",
    "events",
    "tutorials",
    "news",
    "community",
] as const;

export type BlogCategory = (typeof CATEGORIES)[number];
export type BlogStatus = "draft" | "published" | "archived";

export interface IBlog {
    _id: string | Types.ObjectId;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    author: string | Types.ObjectId;
    authorName: string;
    category: BlogCategory;
    status: BlogStatus;
    readTime: string;
    featuredImage?: string | null;
    tags: string[];
    views: number;
    publishedAt?: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}
