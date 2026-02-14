/**
 * Blog Service
 * Business logic for blog operations
 * 
 * Responsibilities:
 * - CRUD operations for blog posts
 * - Pagination and filtering
 * - Search functionality
 * - View tracking
 */

import Blog, { IBlog, BlogStatus, BlogCategory } from "../models/blog.model";
import { ApiError } from "../middleware/errorHandler";
import { Types } from "mongoose";

// ============================================
// Types
// ============================================

export interface CreateBlogData {
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  featuredImage?: string;
  tags?: string[];
  status?: BlogStatus;
}

export interface UpdateBlogData {
  title?: string;
  excerpt?: string;
  content?: string;
  category?: BlogCategory;
  featuredImage?: string;
  tags?: string[];
  status?: BlogStatus;
}

export interface BlogListOptions {
  page?: number;
  limit?: number;
  category?: BlogCategory;
  status?: BlogStatus;
  search?: string;
  authorId?: string;
}

export interface BlogListResult {
  blogs: IBlog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthorInfo {
  id: string;
  name: string;
  surname: string;
}

// ============================================
// Service Functions
// ============================================

/**
 * Create a new blog post
 */
export const createBlog = async (
  data: CreateBlogData,
  author: AuthorInfo
): Promise<IBlog> => {
  const blog = await Blog.create({
    ...data,
    author: new Types.ObjectId(author.id),
    authorName: `${author.name} ${author.surname}`,
    tags: data.tags?.map(tag => tag.toLowerCase().trim()) || [],
    // Set publishedAt if creating as published (also handled by pre-save middleware)
    publishedAt: data.status === "published" ? new Date() : undefined,
  });

  return blog;
};

/**
 * Get blog by ID (admin view - includes all statuses)
 */
export const getBlogById = async (id: string): Promise<IBlog> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid blog ID");
  }

  const blog = await Blog.findById(id).populate("author", "name surname email");

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  return blog;
};

/**
 * Get blog by slug (public view - only published)
 */
export const getBlogBySlug = async (slug: string): Promise<IBlog> => {
  // Note: findBySlug already populates author and returns lean document
  const blog = await Blog.findBySlug(slug);

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  // Increment views asynchronously (fire-and-forget)
  Blog.incrementViews(blog._id.toString()).catch(console.error);

  return blog;
};

/**
 * Update blog post
 */
export const updateBlog = async (
  id: string,
  data: UpdateBlogData
): Promise<IBlog> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid blog ID");
  }

  // Clean tags if provided
  // if (data.tags) {
  //   data.tags = data.tags.map(tag => tag.toLowerCase().trim());
  // }

  // Build update object without mutating input
  const updateData: UpdateBlogData = { ...data };

  // Clean tags if provided
  if (updateData.tags) {
    updateData.tags = updateData.tags.map(tag => tag.toLowerCase().trim());
  }

  // Handle publishedAt when status changes to published
  const existingBlog = await Blog.findById(id).select('status');
  if (updateData.status === 'published' && existingBlog?.status !== 'published') {
    (updateData as any).publishedAt = new Date();
  }

  const blog = await Blog.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate("author", "name surname email");

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  return blog;
};

/**
 * Delete blog post (hard delete)
 */
export const deleteBlog = async (id: string): Promise<void> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid blog ID");
  }

  const blog = await Blog.findByIdAndDelete(id);

  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }
};

/**
 * List blogs with pagination and filtering
 * Admin view includes all statuses, public view only published
 */
export const listBlogs = async (
  options: BlogListOptions,
  isAdmin: boolean = false
): Promise<BlogListResult> => {
  const {
    page = 1,
    limit = 10,
    category,
    status,
    search,
    authorId,
  } = options;

  const skip = (page - 1) * limit;

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};

  // Non-admins only see published posts
  if (!isAdmin) {
    query.status = "published";
  } else if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (authorId) {
    if (!Types.ObjectId.isValid(authorId)) {
      throw new ApiError(400, "Invalid author ID");
    }
    query.author = new Types.ObjectId(authorId);
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Execute query with pagination
  const [blogs, total] = await Promise.all([
    Blog.find(query)
      .select("-content") // Exclude full content for list
      .populate("author", "name surname")
      .sort(isAdmin ? { updatedAt: -1 } : { publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Blog.countDocuments(query),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    blogs: blogs as IBlog[],
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get published blogs for homepage (limited, no pagination)
 */
export const getFeaturedBlogs = async (limit: number = 3): Promise<IBlog[]> => {
  const blogs = await Blog.find({ status: "published" })
    .select("-content")
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  return blogs as IBlog[];
};

/**
 * Get blogs by category (public)
 */
export const getBlogsByCategory = async (
  category: BlogCategory,
  limit: number = 10
): Promise<IBlog[]> => {
  const blogs = await Blog.find({ status: "published", category })
    .select("-content")
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  return blogs as IBlog[];
};

/**
 * Get blog statistics (admin)
 */
export const getBlogStats = async (): Promise<{
  total: number;
  published: number;
  drafts: number;
  archived: number;
  totalViews: number;
  byCategory: Record<string, number>;
}> => {
  const [counts, viewsResult, categoryResult] = await Promise.all([
    Blog.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    Blog.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
        },
      },
    ]),
    Blog.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const statusCounts = counts.reduce(
    (acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    },
    { draft: 0, published: 0, archived: 0 } as Record<string, number>
  );

  const byCategory = categoryResult.reduce(
    (acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total: statusCounts.draft + statusCounts.published + statusCounts.archived,
    published: statusCounts.published,
    drafts: statusCounts.draft,
    archived: statusCounts.archived,
    totalViews: viewsResult[0]?.totalViews || 0,
    byCategory,
  };
};