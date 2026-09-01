/**
 * Role Model
 * Defines the platform roles used by authorization.
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
       enum: ["student", "system_admin", "innovation_hub_admin", "mentor", "member"],
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
