/**
 * Role Model
 * Defines user roles for authorization (student, admin, member, instructor)
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { RoleName } from "../types";

// ============================================
// Interface
// ============================================

export interface IRole extends Document {
  name: RoleName;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema
// ============================================

const RoleSchema: Schema<IRole> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      enum: ["student", "admin", "member", "instructor"],
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Role description is required"],
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
  },
  {
    timestamps: true,
    collection: "roles",
  }
);

// ============================================
// Model
// ============================================

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);

export default Role;
