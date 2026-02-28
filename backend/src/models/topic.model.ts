/**
 * Topic Model
 * Represents a topic within a level for organizational grouping of materials
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// Interface
// ============================================

export interface ITopic extends Document {
  _id: Types.ObjectId;
  level: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema
// ============================================

const TopicSchema: Schema<ITopic> = new Schema(
  {
    level: {
      type: Schema.Types.ObjectId,
      ref: "Level",
      required: [true, "Level reference is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Topic name is required"],
      trim: true,
      maxlength: [200, "Topic name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    collection: "topics",
  }
);

// ============================================
// Model
// ============================================

const Topic: Model<ITopic> =
  mongoose.models.Topic || mongoose.model<ITopic>("Topic", TopicSchema);

export default Topic;
