// This file defines the Blog types for the frontend.
// Definitions are mirrored from the backend to comply with 'src/' directory restrictions.

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
    _id: string; // Frontend always treats IDs as strings
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    author: string;
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

// Compatibility type to minimize refactoring effort in components
// We add 'date' because components like Blog.tsx generate a formatted date string for display
export type BlogPost = IBlog & { date?: string; id?: string };
