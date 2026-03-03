/**
 * Level Model
 * Represents a level within a course (e.g., Level 1, Level 2)
 * Students must complete all materials in a level to unlock the next one
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Interface
// ============================================

export interface ILevel extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  levelNumber: number;
  name: string;
  lockedByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema
// ============================================

const LevelSchema: Schema<ILevel> = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    levelNumber: {
      type: Number,
      required: [true, "Level number is required"],
      min: [1, "Level number must be at least 1"],
    },
    name: {
      type: String,
      required: [true, "Level name is required"],
      trim: true,
      maxlength: [200, "Level name cannot exceed 200 characters"],
    },
    lockedByDefault: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "levels",
  }
);

// Compound unique index: one level number per course
LevelSchema.index({ course: 1, levelNumber: 1 }, { unique: true });

// ============================================
// Model
// ============================================

const Level: Model<ILevel> =
  mongoose.models.Level || mongoose.model<ILevel>("Level", LevelSchema);

export default Level;
