/**
 * Password Reset Model
 * Tracks one-time OTP sessions and verified reset tokens.
 * Documents self-delete after the OTP TTL expires (TTL index).
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IPasswordReset extends Document {
  user: mongoose.Types.ObjectId;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  resetTokenHash?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resetTokenHash: {
      type: String,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL: documents self-delete when expiresAt passes
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
PasswordResetSchema.index({ user: 1 });

const PasswordReset = mongoose.model<IPasswordReset>("PasswordReset", PasswordResetSchema);
export default PasswordReset;
