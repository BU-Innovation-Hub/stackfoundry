/**
 * Student (User) Model
 * Primary user model with secure password handling and refresh token storage
 *
 * Security features:
 * - Password hashed with bcrypt (12 rounds)
 * - Refresh tokens stored as hashes (not plain text)
 * - Email and studentId indexed for quick lookups
 * - Token rotation support with tokenId tracking
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { StoredRefreshToken, RoleName } from "../types";

// ============================================
// Constants
// ============================================

const BCRYPT_ROUNDS = 12; // Industry standard for password hashing
const MAX_REFRESH_TOKENS = 5; // Limit concurrent sessions

// ============================================
// Interface
// ============================================

export interface IStudent extends Document {
  _id: Types.ObjectId;
  studentId: string; // e.g., "2230001 or similar format"
  email: string;
  name: string;
  surname: string;
  passwordHash: string;
  roles: Types.ObjectId[]; // References to Role documents
  refreshTokens: StoredRefreshToken[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPrimaryRole(): Promise<RoleName>;
  addRefreshToken(tokenHash: string, tokenId: string, expiresAt: Date, meta?: { userAgent?: string; ipAddress?: string }): Promise<void>;
  removeRefreshToken(tokenId: string): Promise<void>;
  removeAllRefreshTokens(): Promise<void>;
  hasRefreshToken(tokenId: string): boolean;
  cleanExpiredTokens(): Promise<void>;
}

// ============================================
// Schema
// ============================================

const RefreshTokenSchema = new Schema<StoredRefreshToken>(
  {
    tokenHash: { type: String, required: true },
    tokenId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { _id: false }
);

const StudentSchema: Schema<IStudent> = new Schema(
  {
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
      unique: true,
      trim: true,
      index: true,
      // Format: STU-YYYY-NNN or similar
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[A-Za-z0-9._%+-]+@bothouniversity\.com$/,
        "Email must be from @bothouniversity.com domain",
      ],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    surname: {
      type: String,
      required: [true, "Surname is required"],
      trim: true,
      maxlength: [50, "Surname cannot exceed 50 characters"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Never include in queries by default
    },
    roles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
        required: true,
      },
    ],
    refreshTokens: {
      type: [RefreshTokenSchema],
      default: [],
      select: false, // Never include in queries by default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "students",
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform: (_doc: any, ret: any) => {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ============================================
// Indexes for performance
// ============================================

StudentSchema.index({ email: 1, isActive: 1 });
StudentSchema.index({ studentId: 1, isActive: 1 });
StudentSchema.index({ "refreshTokens.tokenId": 1 });

// ============================================
// Instance Methods
// ============================================

/**
 * Compare password with stored hash
 * Uses constant-time comparison via bcrypt
 */
StudentSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // Need to explicitly select passwordHash since it's excluded by default
  const user = await Student.findById(this._id).select("+passwordHash");
  if (!user) return false;
  return bcrypt.compare(candidatePassword, user.passwordHash);
};

/**
 * Get primary role name (first role in array)
 */
StudentSchema.methods.getPrimaryRole = async function (): Promise<RoleName> {
  await this.populate("roles");
  if (this.roles.length === 0) return "student";
  const role = this.roles[0] as unknown as { name: RoleName };
  return role.name || "student";
};

/**
 * Add a new refresh token (hashed)
 * Maintains max token limit by removing oldest if exceeded
 */
StudentSchema.methods.addRefreshToken = async function (
  tokenHash: string,
  tokenId: string,
  expiresAt: Date,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<void> {
  // Clean expired tokens first
  await this.cleanExpiredTokens();

  // Remove oldest token if at max limit
  if (this.refreshTokens.length >= MAX_REFRESH_TOKENS) {
    this.refreshTokens.sort(
      (a: StoredRefreshToken, b: StoredRefreshToken) =>
        a.createdAt.getTime() - b.createdAt.getTime()
    );
    this.refreshTokens.shift(); // Remove oldest
  }

  this.refreshTokens.push({
    tokenHash,
    tokenId,
    createdAt: new Date(),
    expiresAt,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  });

  await this.save();
};

/**
 * Remove a specific refresh token by tokenId
 * Used during token rotation and logout
 */
StudentSchema.methods.removeRefreshToken = async function (
  tokenId: string
): Promise<void> {
  this.refreshTokens = this.refreshTokens.filter(
    (t: StoredRefreshToken) => t.tokenId !== tokenId
  );
  await this.save();
};

/**
 * Remove all refresh tokens (logout from all devices)
 */
StudentSchema.methods.removeAllRefreshTokens = async function (): Promise<void> {
  this.refreshTokens = [];
  await this.save();
};

/**
 * Check if user has a specific refresh token
 */
StudentSchema.methods.hasRefreshToken = function (tokenId: string): boolean {
  return this.refreshTokens.some(
    (t: StoredRefreshToken) => t.tokenId === tokenId
  );
};

/**
 * Remove all expired refresh tokens
 */
StudentSchema.methods.cleanExpiredTokens = async function (): Promise<void> {
  const now = new Date();
  const before = this.refreshTokens.length;
  this.refreshTokens = this.refreshTokens.filter(
    (t: StoredRefreshToken) => t.expiresAt > now
  );
  if (this.refreshTokens.length !== before) {
    await this.save();
  }
};

// ============================================
// Static Methods
// ============================================

/**
 * Hash a password using bcrypt
 */
StudentSchema.statics.hashPassword = async function (
  password: string
): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Find user by email with password (for authentication)
 */
StudentSchema.statics.findByEmailWithPassword = function (email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true })
    .select("+passwordHash +refreshTokens")
    .populate("roles");
};

/**
 * Find user by ID with refresh tokens (for token validation)
 */
StudentSchema.statics.findByIdWithTokens = function (id: string) {
  return this.findById(id)
    .select("+refreshTokens")
    .populate("roles");
};

// ============================================
// Model
// ============================================

// Extend the model interface with static methods
interface StudentModel extends Model<IStudent> {
  hashPassword(password: string): Promise<string>;
  findByEmailWithPassword(email: string): ReturnType<Model<IStudent>["findOne"]>;
  findByIdWithTokens(id: string): ReturnType<Model<IStudent>["findById"]>;
}

const Student: StudentModel =
  (mongoose.models.Student as StudentModel) ||
  mongoose.model<IStudent, StudentModel>("Student", StudentSchema);

export default Student;

