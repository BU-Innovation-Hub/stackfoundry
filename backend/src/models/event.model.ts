/**
 * Event Model
 * Stores event information with admin authorship tracking
 * 
 * Features:
 * - Slug generation for SEO-friendly URLs
 * - Status tracking (draft, published, archived)
 * - Event type categorization
 * - Indexed for fast queries
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Constants
// ============================================

const EVENT_TYPES = [
    "workshop",
    "hackathon",
    "meetup",
    "conference",
] as const;

type EventType = (typeof EVENT_TYPES)[number];
type EventStatus = "draft" | "published" | "archived";

// ============================================
// Interface
// ============================================

export interface IEvent extends Document {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    description: string;
    date: string; // Display date e.g., "Feb 15, 2026"
    time: string; // Display time e.g., "10:00 AM - 4:00 PM"
    eventDate: Date; // Actual date for sorting/filtering
    type: EventType;
    image?: string;
    location?: string;
    registrationLink?: string;
    author: Types.ObjectId; // Reference to Student (admin)
    authorName: string; // Denormalized for display
    status: EventStatus;
    views: number; // View count for analytics
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate URL-friendly slug from title
 * Ensures non-empty result with fallback for edge cases
 */
const generateSlug = (title: string): string => {
    const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Remove consecutive hyphens
        .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
        .substring(0, 100); // Limit length

    // Fallback for empty slugs (e.g., titles with only special chars)
    if (!slug) {
        return `untitled-${Date.now().toString(36)}`.substring(0, 100);
    }

    return slug;
};

// ============================================
// Schema
// ============================================

const EventSchema: Schema<IEvent> = new Schema(
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
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        date: {
            type: String,
            required: [true, "Date is required"],
            trim: true,
        },
        time: {
            type: String,
            required: [true, "Time is required"],
            trim: true,
        },
        eventDate: {
            type: Date,
            required: [true, "Event date is required"],
            index: true,
        },
        type: {
            type: String,
            required: [true, "Event type is required"],
            enum: {
                values: EVENT_TYPES,
                message: "Invalid event type",
            },
            index: true,
        },
        image: {
            type: String,
            default: null,
        },
        location: {
            type: String,
            trim: true,
            maxlength: [500, "Location cannot exceed 500 characters"],
            default: null,
        },
        registrationLink: {
            type: String,
            trim: true,
            default: null,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Author is required"],
            index: true,
        },
        authorName: {
            type: String,
            required: [true, "Author name is required"],
        },
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
            index: true,
        },
        publishedAt: {
            type: Date,
            default: null,
            index: true,
        },
        views: {
            type: Number,
            default: 0,
            required: true,
            min: [0, "Views cannot be negative"],
        },
    },
    {
        timestamps: true,
        collection: "events",
    }
);

// ============================================
// Indexes for Performance
// ============================================

// Compound index for listing published events (most common query)
EventSchema.index({ status: 1, eventDate: -1 });

// Text index for search functionality
EventSchema.index({ title: "text", description: "text" });

// ============================================
// Pre-save Middleware
// ============================================

EventSchema.pre("save", async function () {
    // Generate slug only for new documents without an existing slug
    if (!this.slug) {
        const baseSlug = generateSlug(this.title);
        // this.slug = `${baseSlug}-${Date.now().toString(36)}`.substring(0, 100);
        const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
        this.slug = `${baseSlug}-${uniqueSuffix}`.substring(0, 100);
    }

    // Set publishedAt when status becomes "published"
    if (this.status === "published" && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    // Clear publishedAt if status changes away from "published"
    if (this.isModified("status") && this.status !== "published") {
        this.publishedAt = undefined;
    }
});

// ============================================
// Static Methods
// ============================================

interface EventModel extends Model<IEvent> {
    findPublished(options?: { limit?: number; skip?: number; type?: string }): Promise<IEvent[]>;
    findBySlug(slug: string): Promise<IEvent | null>;
    incrementViews(id: string): Promise<IEvent | null>;
}

/**
 * Find all published events with pagination
 */
EventSchema.statics.findPublished = function (
    options: { limit?: number; skip?: number; type?: string } = {}
) {
    const { limit = 10, skip = 0, type } = options;

    const query: Record<string, unknown> = { status: "published" };
    if (type) query.type = type;

    return this.find(query)
        .sort({ eventDate: 1 }) // Upcoming events first
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Find event by slug (for public viewing)
 */
EventSchema.statics.findBySlug = function (slug: string) {
    return this.findOne({ slug, status: "published" })
        .populate("author", "name surname")
        .lean();
};

/**
 * Increment view count for an event
 */
EventSchema.statics.incrementViews = function (id: string) {
    return this.findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { new: true }
    );
};

// ============================================
// Model
// ============================================

const Event: EventModel =
    (mongoose.models.Event as EventModel) ||
    mongoose.model<IEvent, EventModel>("Event", EventSchema);

export default Event;
export { EVENT_TYPES, EventType, EventStatus };
