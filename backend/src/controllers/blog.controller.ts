/**
 * Blog Controller
 * HTTP handlers for blog endpoints
 * 
 * Admin Routes:
 * - POST   /api/v1/blogs          - Create blog
 * - GET    /api/v1/blogs/admin    - List all blogs (admin view)
 * - GET    /api/v1/blogs/stats    - Get blog statistics
 * - GET    /api/v1/blogs/:id      - Get blog by ID
 * - PUT    /api/v1/blogs/:id      - Update blog
 * - DELETE /api/v1/blogs/:id      - Delete blog
 * 
 * Public Routes:
 * - GET    /api/v1/blogs          - List published blogs
 * - GET    /api/v1/blogs/featured - Get featured blogs
 * - GET    /api/v1/blogs/slug/:slug - Get blog by slug
 */

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import * as BlogService from "../services/blog.service";
import { ApiError } from "../middleware/errorHandler";
import { RequestWithUser } from "../types";
import { BlogCategory, BlogStatus } from "../models/blog.model";

// ============================================
// Helpers
// ============================================

const handleValidationErrors = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => {
      if ("msg" in err) return err.msg;
      return "Validation error";
    });
    throw new ApiError(400, "Validation failed", messages);
  }
};

// ============================================
// Admin Controllers
// ============================================

/**
 * Create a new blog post
 * POST /api/v1/blogs
 */
export const createBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const user = (req as RequestWithUser).user;
    const { title, excerpt, content, category, featuredImage, tags, status } = req.body;

    const blog = await BlogService.createBlog(
      { title, excerpt, content, category, featuredImage, tags, status },
      { id: user.id, name: user.name, surname: user.surname }
    );

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blog by ID (admin)
 * GET /api/v1/blogs/:id
 */
export const getBlogById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const blog = await BlogService.getBlogById(req.params.id);

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update blog
 * PUT /api/v1/blogs/:id
 */
export const updateBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const { title, excerpt, content, category, featuredImage, tags, status } = req.body;

    const blog = await BlogService.updateBlog(req.params.id, {
      title,
      excerpt,
      content,
      category,
      featuredImage,
      tags,
      status,
    });

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete blog
 * DELETE /api/v1/blogs/:id
 */
export const deleteBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    await BlogService.deleteBlog(req.params.id);

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all blogs (admin view)
 * GET /api/v1/blogs/admin
 */
export const listBlogsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const { page, limit, category, status, search } = req.query;

    const result = await BlogService.listBlogs(
      {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        category: category as BlogCategory,
        status: status as BlogStatus,
        search: search as string,
      },
      true // isAdmin
    );

    res.status(200).json({
      success: true,
      data: result.blogs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blog statistics
 * GET /api/v1/blogs/stats
 */
export const getBlogStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await BlogService.getBlogStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Public Controllers
// ============================================

/**
 * List published blogs (public)
 * GET /api/v1/blogs
 */
export const listBlogsPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const { page, limit, category, search } = req.query;

    const result = await BlogService.listBlogs(
      {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        category: category as BlogCategory,
        search: search as string,
      },
      false // not admin
    );

    res.status(200).json({
      success: true,
      data: result.blogs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured blogs for homepage
 * GET /api/v1/blogs/featured
 */
export const getFeaturedBlogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const DEFAULT_LIMIT = 3;
    const MAX_LIMIT = 10;
    
    let limit = DEFAULT_LIMIT;
    if (req.query.limit) {
      const parsed = parseInt(req.query.limit as string, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= MAX_LIMIT) {
        limit = parsed;
      }
    }
    
    const blogs = await BlogService.getFeaturedBlogs(limit);

    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blog by slug (public)
 * GET /api/v1/blogs/slug/:slug
 */
export const getBlogBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    handleValidationErrors(req);

    const blog = await BlogService.getBlogBySlug(req.params.slug);

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};