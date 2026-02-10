/**
 * Blog Model
 * Stores blog posts with admin authorship tracking
 * 
 * Features:
 * - Slug generation for SEO-friendly URLs
 * - Status tracking (draft, published, archived)
 * - Read time auto-calculation
 * - Indexed for fast queries
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Constants
// ============================================

const CATEGORIES = [
  "Entrepreneurship",
  "Community",
  "Workshops",
  "Meetups",
  "Webinars",
  "Conferences",
] as const;

type BlogCategory = (typeof CATEGORIES)[number];
type BlogStatus = "draft" | "published" | "archived";

// ============================================
// Interface
// ============================================

export interface IBlog extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Full markdown/HTML content
  author: Types.ObjectId; // Reference to Student (admin)
  authorName: string; // Denormalized for display
  category: BlogCategory;
  status: BlogStatus;
  readTime: string;
  featuredImage?: string;
  tags: string[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate URL-friendly slug from title
 */
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .substring(0, 100); // Limit length
};

/**
 * Calculate read time based on content length
 * Average reading speed: ~200 words per minute
 */
const calculateReadTime = (content: string): string => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
};

// ============================================
// Schema
// ============================================

const BlogSchema: Schema<IBlog> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    excerpt: {
      type: String,
      required: [true, "Excerpt is required"],
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Author is required"],
      index: true,
    },
    authorName: {
      type: String,
      required: [true, "Author name is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: "Invalid category",
      },
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    readTime: {
      type: String,
      default: "1 min read",
    },
    featuredImage: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "blogs",
  }
);

// ============================================
// Indexes for Performance
// ============================================

// Compound index for listing published posts (most common query)
BlogSchema.index({ status: 1, publishedAt: -1 });

// Text index for search functionality
BlogSchema.index({ title: "text", excerpt: "text", content: "text" });

// ============================================
// Pre-save Middleware
// ============================================

BlogSchema.pre("save", async function () {
  // Generate slug from title
  if (this.isModified("title") || !this.slug) {
    this.slug = generateSlug(this.title);
    
    // Add timestamp for uniqueness on new documents
    if (this.isNew) {
      this.slug += `-${Date.now().toString(36)}`;
    }
  }

  // Calculate read time from content
  if (this.isModified("content")) {
    this.readTime = calculateReadTime(this.content);
  }
});

// ============================================
// Static Methods
// ============================================

interface BlogModel extends Model<IBlog> {
  findPublished(options?: { limit?: number; skip?: number; category?: string }): Promise<IBlog[]>;
  findBySlug(slug: string): Promise<IBlog | null>;
}

/**
 * Find all published posts with pagination
 */
BlogSchema.statics.findPublished = function (
  options: { limit?: number; skip?: number; category?: string } = {}
) {
  const { limit = 10, skip = 0, category } = options;
  
  const query: Record<string, unknown> = { status: "published" };
  if (category) query.category = category;

  return this.find(query)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-content") // Exclude full content for list views
    .lean();
};

/**
 * Find post by slug (for public viewing)
 */
BlogSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug, status: "published" })
    .populate("author", "name surname")
    .lean();
};

// ============================================
// Model
// ============================================

const Blog: BlogModel =
  (mongoose.models.Blog as BlogModel) ||
  mongoose.model<IBlog, BlogModel>("Blog", BlogSchema);

export default Blog;
export { CATEGORIES, BlogCategory, BlogStatus };