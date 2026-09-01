/**
 * Progress Model
 * Tracks individual student progress on each material (video watch time, completion)
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Interface
// ============================================

export interface IProgress extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  material: Types.ObjectId;
  watchedSeconds: number;
  /**
   * The furthest point (in seconds) the user has legitimately watched.
   * Used to prevent fast-forwarding beyond watched content.
   * Only increases monotonically.
   */
  maxWatchedSeconds: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema
// ============================================

const ProgressSchema: Schema<IProgress> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    material: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      required: [true, "Material reference is required"],
      index: true,
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: [0, "Watched seconds cannot be negative"],
    },
    maxWatchedSeconds: {
      type: Number,
      default: 0,
      min: [0, "Max watched seconds cannot be negative"],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "progress",
  }
);

// Unique constraint: one progress record per user per material
ProgressSchema.index({ user: 1, material: 1 }, { unique: true });

// ============================================
// Model
// ============================================

const Progress: Model<IProgress> =
  mongoose.models.Progress ||
  mongoose.model<IProgress>("Progress", ProgressSchema);

export default Progress;
