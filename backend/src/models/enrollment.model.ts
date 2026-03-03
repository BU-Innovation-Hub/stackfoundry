/**
 * Enrollment Model
 * Tracks which students are enrolled in which courses, and which levels are unlocked
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Interface
// ============================================

export interface IEnrollment extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  enrolledAt: Date;
  levelsUnlocked: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema
// ============================================

const EnrollmentSchema: Schema<IEnrollment> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "User reference is required"],
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    levelsUnlocked: [
      {
        type: Schema.Types.ObjectId,
        ref: "Level",
      },
    ],
  },
  {
    timestamps: true,
    collection: "enrollments",
  }
);

// Unique constraint: one enrollment per user per course
EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

// ============================================
// Model
// ============================================

const Enrollment: Model<IEnrollment> =
  mongoose.models.Enrollment ||
  mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);

export default Enrollment;
