/**
 * Blog Routes
 * 
 * Public Routes (no auth required):
 * GET  /api/v1/blogs              - List published blogs
 * GET  /api/v1/blogs/featured     - Get featured blogs
 * GET  /api/v1/blogs/slug/:slug   - Get blog by slug
 * 
 * Admin Routes (auth + admin role required):
 * POST   /api/v1/blogs            - Create blog
 * GET    /api/v1/blogs/admin      - List all blogs (admin view)
 * GET    /api/v1/blogs/stats      - Get blog statistics
 * GET    /api/v1/blogs/:id        - Get blog by ID
 * PUT    /api/v1/blogs/:id        - Update blog
 * DELETE /api/v1/blogs/:id        - Delete blog
 * 
 * IMPORTANT: Static routes must be defined before parameterized routes
 * to prevent route conflicts (e.g., /featured before /:id)
 */

import { Router } from "express";
import * as BlogController from "../../controllers/blog.controller";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createBlogValidation,
  updateBlogValidation,
  blogIdValidation,
  blogSlugValidation,
  listBlogsValidation,
} from "../../utils/blogValidation";

const router = Router();

// ============================================
// Static Routes First (to avoid /:id conflicts)
// ============================================

/**
 * @route   POST /api/v1/blogs
 * @desc    Create a new blog post
 * @access  Private (admin only)
 */
router.post(
  "/",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  createBlogValidation,
  BlogController.createBlog
);

/**
 * @route   GET /api/v1/blogs
 * @desc    List published blogs with pagination
 * @access  Public
 */
router.get("/", listBlogsValidation, BlogController.listBlogsPublic);

/**
 * @route   GET /api/v1/blogs/admin
 * @desc    List all blogs (admin view with all statuses)
 * @access  Private (admin only)
 */
router.get(
  "/admin",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  listBlogsValidation,
  BlogController.listBlogsAdmin
);

/**
 * @route   GET /api/v1/blogs/stats
 * @desc    Get blog statistics
 * @access  Private (admin only)
 */
router.get(
  "/stats",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  BlogController.getBlogStats
);

/**
 * @route   GET /api/v1/blogs/featured
 * @desc    Get featured blogs for homepage
 * @access  Public
 */
router.get("/featured", BlogController.getFeaturedBlogs);

/**
 * @route   GET /api/v1/blogs/slug/:slug
 * @desc    Get a single blog by slug
 * @access  Public
 */
router.get("/slug/:slug", blogSlugValidation, BlogController.getBlogBySlug);

// ============================================
// Parameterized Routes (after static routes)
// ============================================

/**
 * @route   GET /api/v1/blogs/:id
 * @desc    Get blog by ID
 * @access  Private (admin only)
 */
router.get(
  "/:id",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  blogIdValidation,
  BlogController.getBlogById
);

/**
 * @route   PUT /api/v1/blogs/:id
 * @desc    Update a blog post
 * @access  Private (admin only)
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  updateBlogValidation,
  BlogController.updateBlog
);

/**
 * @route   DELETE /api/v1/blogs/:id
 * @desc    Delete a blog post
 * @access  Private (admin only)
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(["innovation_hub_admin"]),
  blogIdValidation,
  BlogController.deleteBlog
);

export default router;
