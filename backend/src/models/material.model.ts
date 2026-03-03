/**
 * Material Model
 * Represents a learning material (video or PDF) within a level/topic
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Interface
// ============================================

export interface IMaterial extends Document {
  _id: Types.ObjectId;
  level: Types.ObjectId;
  topic?: Types.ObjectId;
  title: string;
  type: "video" | "pdf";
  order: number;

  // Video (YouTube) fields
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeDurationSeconds?: number;
  youtubeThumbnail?: string;

  // PDF (Cloudinary) fields
  cloudinaryPublicId?: string;
  pdfOriginalName?: string;
  pdfSizeBytes?: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema
// ============================================

const MaterialSchema: Schema<IMaterial> = new Schema(
  {
    level: {
      type: Schema.Types.ObjectId,
      ref: "Level",
      required: [true, "Level reference is required"],
      index: true,
    },
    topic: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
    },
    title: {
      type: String,
      required: [true, "Material title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    type: {
      type: String,
      enum: ["video", "pdf"],
      required: [true, "Material type is required"],
    },
    order: {
      type: Number,
      default: 0,
    },

    // YouTube fields
    youtubeVideoId: { type: String },
    youtubeTitle: { type: String },
    youtubeDurationSeconds: { type: Number },
    youtubeThumbnail: { type: String },

    // Cloudinary PDF fields
    cloudinaryPublicId: { type: String },
    pdfOriginalName: { type: String },
    pdfSizeBytes: { type: Number },
  },
  {
    timestamps: true,
    collection: "materials",
  }
);

// Composite index for ordering within a level
MaterialSchema.index({ level: 1, order: 1 });

// ============================================
// Model
// ============================================

const Material: Model<IMaterial> =
  mongoose.models.Material ||
  mongoose.model<IMaterial>("Material", MaterialSchema);

export default Material;
