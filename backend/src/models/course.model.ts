/**
 * Course Model
 * Represents a top-level course in the LMS
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Interface
// ============================================

export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema
// ============================================

const CourseSchema: Schema<ICourse> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      index: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "courses",
  }
);

// ============================================
// Model
// ============================================

const Course: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>("Course", CourseSchema);

export default Course;
