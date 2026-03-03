/**
 * Admin Service
 * Business logic for admin-only user management operations
 *
 * Responsibilities:
 * - Admin-driven user creation with role assignment
 * - User role updates
 * - Account activation / deactivation
 */

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Student from "../models/user.model";
import Role from "../models/role.model";
import { AdminCreateUserBody, RoleName } from "../types";
import { ApiError } from "../middleware/errorHandler";

// ============================================
// Constants
// ============================================

const BCRYPT_ROUNDS = 12;

// ============================================
// Types
// ============================================

interface AdminUserDTO {
  id: string;
  studentId: string;
  email: string;
  name: string;
  surname: string;
  role: RoleName;
  isActive: boolean;
}

// ============================================
// Service Functions
// ============================================

/**
 * Create a new user (admin-only)
 * - Validates uniqueness of email and studentId
 * - Looks up the requested role
 * - Hashes password with bcrypt
 * - Creates user with specified role and isActive = true
 */
export const createUser = async (
  data: AdminCreateUserBody
): Promise<AdminUserDTO> => {
  // Check if email already exists
  const existingEmail = await Student.findOne({
    email: data.email.toLowerCase(),
  });
  if (existingEmail) {
    throw new ApiError(409, "Email already registered");
  }

  // Check if studentId already exists
  const existingStudentId = await Student.findOne({
    studentId: data.studentId,
  });
  if (existingStudentId) {
    throw new ApiError(409, "Student ID already registered");
  }

  // Get or create the requested role (atomic upsert)
  const role = await Role.findOneAndUpdate(
    { name: data.role },
    {
      $setOnInsert: {
        name: data.role,
        description: `${data.role.charAt(0).toUpperCase() + data.role.slice(1)} role`,
      },
    },
    { upsert: true, new: true }
  );

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Create user
  const student = await Student.create({
    studentId: data.studentId,
    email: data.email.toLowerCase(),
    name: data.name,
    surname: data.surname,
    passwordHash,
    roles: [role._id],
    refreshTokens: [],
    isActive: true,
  });

  return {
    id: student._id.toString(),
    studentId: student.studentId,
    email: student.email,
    name: student.name,
    surname: student.surname,
    role: data.role,
    isActive: true,
  };
};

/**
 * Update a user's role
 * - Finds the target role document
 * - Replaces the user's roles array with the new single role
 * - Prevents removing the last admin if business rules require it
 */
export const updateUserRole = async (
  userId: string,
  roleName: RoleName
): Promise<{ id: string; role: RoleName; isActive: boolean }> => {
  const session = await mongoose.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      const user = await Student.findById(userId).populate("roles").session(session);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Check if demoting an admin - if so, ensure it's not the last one
      if (user.roles.length > 0) {
        const currentRole = (user.roles[0] as unknown as { name: RoleName }).name;
        if (currentRole === "admin" && roleName !== "admin") {
          const adminRole = await Role.findOne({ name: "admin" }).session(session);
          if (adminRole) {
            const adminCount = await Student.countDocuments({
              roles: adminRole._id,
              isActive: true,
            }).session(session);
            if (adminCount <= 1) {
              throw new ApiError(
                400,
                "Cannot change role of the last active admin"
              );
            }
          }
        }
      }

      // Get or create the target role
      const targetRole = await Role.findOneAndUpdate(
        { name: roleName },
        {
          $setOnInsert: {
            name: roleName,
            description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role`,
          },
        },
        { upsert: true, new: true, session }
      );

      user.roles = [targetRole._id];
      await user.save({ session });

      return {
        id: user._id.toString(),
        role: roleName,
        isActive: user.isActive,
      };
    });
    
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Toggle a user's active status
 * - Flips isActive
 * - If deactivating, clears all refresh tokens (force logout)
 * - Prevents deactivating the last active admin
 */
export const toggleUserActive = async (
  userId: string
): Promise<{ id: string; isActive: boolean }> => {
  const session = await mongoose.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      const user = await Student.findById(userId)
        .select("+refreshTokens")
        .populate("roles")
        .session(session);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // If deactivating, check admin safeguard atomically
      if (user.isActive) {
        const primaryRole = await user.getPrimaryRole();
        if (primaryRole === "admin") {
          const adminRole = await Role.findOne({ name: "admin" }).session(session);
          if (adminRole) {
            const adminCount = await Student.countDocuments({
              roles: adminRole._id,
              isActive: true,
            }).session(session);
            if (adminCount <= 1) {
              throw new ApiError(
                400,
                "Cannot deactivate the last active admin"
              );
            }
          }
        }
      }

      user.isActive = !user.isActive;

      // If deactivating, revoke all sessions so the user is immediately logged out
      if (!user.isActive) {
        user.refreshTokens = [];
      }

      await user.save({ session });

      return {
        id: user._id.toString(),
        isActive: user.isActive,
      };
    });
    
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Delete a user account
 * - Prevents deleting the last active admin
 */
export const deleteUser = async (userId: string): Promise<void> => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const user = await Student.findById(userId).populate("roles").session(session);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Prevent deleting the last admin atomically
      const primaryRole = await user.getPrimaryRole();
      if (primaryRole === "admin") {
        const adminRole = await Role.findOne({ name: "admin" }).session(session);
        if (adminRole) {
          const adminCount = await Student.countDocuments({
            roles: adminRole._id,
            isActive: true,
          }).session(session);
          if (adminCount <= 1) {
            throw new ApiError(400, "Cannot delete the last active admin");
          }
        }
      }

      await Student.findByIdAndDelete(userId, { session });
    });
  } finally {
    await session.endSession();
  }
};
