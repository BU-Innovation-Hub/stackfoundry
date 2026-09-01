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
import Student from "../models/user.model";
import Role from "../models/role.model";
import { AdminCreateUserBody, AdminUpdateUserBody, RoleName, AuthUser } from "../types";
import { ApiError } from "../middleware/errorHandler";
import { recordAuditEvent } from "../utils/audit";

// ============================================
// Constants
// ============================================

const BCRYPT_ROUNDS = 12;

// ============================================
// Types
// ============================================

interface AdminUserDTO {
  id: string;
  studentId?: string;
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
  data: AdminCreateUserBody,
  actor: AuthUser
): Promise<AdminUserDTO> => {
  if (actor.role === "innovation_hub_admin" && !["student", "member", "mentor"].includes(data.role)) {
    throw new ApiError(403, "Innovation hub admins can only create students, members, or mentors");
  }
  if (data.role === "innovation_hub_admin" && await Role.exists({ name: "innovation_hub_admin" }).then(async (role) =>
    Boolean(role && await Student.exists({ roles: role._id }))
  )) {
    throw new ApiError(409, "An innovation hub administrator already exists");
  }
  if (data.role === "student" && !data.studentId) {
    throw new ApiError(400, "Student ID is required for student users");
  }
  // Check if email already exists
  const existingEmail = await Student.findOne({
    email: data.email.toLowerCase(),
  });
  if (existingEmail) {
    throw new ApiError(409, "Email already registered");
  }

  // Check if studentId already exists
  const existingStudentId = data.studentId && await Student.findOne({
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

  const result = {
    id: student._id.toString(),
    studentId: student.studentId,
    email: student.email,
    name: student.name,
    surname: student.surname,
    role: data.role,
    isActive: true,
  };
  recordAuditEvent({ eventType: "business", action: "user.created", actorId: actor.id, targetType: "User", targetId: result.id, success: true, metadata: { role: data.role } });
  return result;
};

/**
 * Update a user's role
 * - Finds the target role document
 * - Replaces the user's roles array with the new single role
 * - Prevents removing the last admin if business rules require it
 */
export const updateUserRole = async (
  userId: string,
  roleName: RoleName,
  actor: AuthUser
): Promise<{ id: string; role: RoleName; isActive: boolean }> => {
  if (actor.role === "innovation_hub_admin" && ["system_admin", "innovation_hub_admin"].includes(roleName)) {
    throw new ApiError(403, "Innovation hub admins cannot assign administrator roles");
  }
  // Guard: system_admin is not assignable via the role-update endpoint (UI removed; API-bypass protection)
  if (roleName === "system_admin") {
    throw new ApiError(403, "System admin role cannot be assigned through role management");
  }
  const user = await Student.findById(userId).populate("roles");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if demoting an admin - if so, ensure it's not the last one
  if (user.roles.length > 0) {
    const currentRole = (user.roles[0] as unknown as { name: RoleName }).name;
    if (currentRole === "system_admin") {
      const adminRole = await Role.findOne({ name: "system_admin" });
      if (adminRole) {
        const adminCount = await Student.countDocuments({
          roles: adminRole._id,
          isActive: true,
        });
        if (adminCount <= 1) {
          throw new ApiError(
            400,
            "Cannot change role of the last active admin"
          );
        }
      }
    }
  }

  // Get or create the target role (atomic upsert)
  const targetRole = await Role.findOneAndUpdate(
    { name: roleName },
    {
      $setOnInsert: {
        name: roleName,
        description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role`,
      },
    },
    { upsert: true, new: true }
  );

  if (roleName === "innovation_hub_admin") {
    const hubAdmins = await Student.countDocuments({ roles: targetRole._id, _id: { $ne: user._id } });
    if (hubAdmins > 0) throw new ApiError(409, "An innovation hub administrator already exists");
  }

  user.roles = [targetRole._id];
  await user.save();

  const result = {
    id: user._id.toString(),
    role: roleName,
    isActive: user.isActive,
  };

  recordAuditEvent({ eventType: "business", action: "user.role_updated", actorId: actor.id, targetType: "User", targetId: userId, success: true, metadata: { role: roleName } });
  return result;
};

/**
 * Toggle a user's active status
 * - Flips isActive
 * - If deactivating, clears all refresh tokens (force logout)
 * - Prevents deactivating the last active admin
 */
export const toggleUserActive = async (
  userId: string,
  actor: AuthUser
): Promise<{ id: string; isActive: boolean }> => {
  const user = await Student.findById(userId)
    .select("+refreshTokens")
    .populate("roles");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const targetRole = await user.getPrimaryRole();
  if (actor.role === "innovation_hub_admin" && targetRole === "system_admin") {
    throw new ApiError(403, "Innovation hub admins cannot manage system administrators");
  }

  // If deactivating, check admin safeguard
  if (user.isActive) {
    const primaryRole = await user.getPrimaryRole();
    if (primaryRole === "system_admin") {
      const adminRole = await Role.findOne({ name: "system_admin" });
      if (adminRole) {
        const adminCount = await Student.countDocuments({
          roles: adminRole._id,
          isActive: true,
        });
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

  await user.save();

  recordAuditEvent({ eventType: "business", action: "user.status_changed", actorId: actor.id, targetType: "User", targetId: userId, success: true, metadata: { isActive: user.isActive } });
  return {
    id: user._id.toString(),
    isActive: user.isActive,
  };
};

/**
 * Delete a user account
 * - Prevents deleting the last active admin
 */
export const deleteUser = async (userId: string, actor: AuthUser): Promise<void> => {
  const user = await Student.findById(userId).populate("roles");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const targetRole = await user.getPrimaryRole();
  if (actor.role === "innovation_hub_admin" && targetRole === "system_admin") {
    throw new ApiError(403, "Innovation hub admins cannot manage system administrators");
  }

  // Prevent deleting the last admin
  const primaryRole = await user.getPrimaryRole();
  if (primaryRole === "system_admin") {
    const adminRole = await Role.findOne({ name: "system_admin" });
    if (adminRole) {
      const adminCount = await Student.countDocuments({
        roles: adminRole._id,
        isActive: true,
      });
      if (adminCount <= 1) {
        throw new ApiError(400, "Cannot delete the last active admin");
      }
    }
  }

  await Student.findByIdAndDelete(userId);
  recordAuditEvent({ eventType: "business", action: "user.deleted", actorId: actor.id, targetType: "User", targetId: userId, success: true });
};

/**
 * Update a user's profile (name, surname, email, studentId)
 * - Email and studentId must remain unique
 * - studentId is only editable when the user's primary role is "student"
 * - Innovation hub admins cannot edit system administrators
 */
export const updateUserProfile = async (
  userId: string,
  data: AdminUpdateUserBody,
  actor: AuthUser
): Promise<AdminUserDTO> => {
  const user = await Student.findById(userId).populate("roles");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const targetRole = await user.getPrimaryRole();
  if (actor.role === "innovation_hub_admin" && targetRole === "system_admin") {
    throw new ApiError(403, "Innovation hub admins cannot manage system administrators");
  }

  // Student ID is only editable for student users
  if (data.studentId !== undefined && targetRole !== "student") {
    throw new ApiError(400, "Student ID can only be updated for student users");
  }

  // Email uniqueness (excluding self)
  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    if (email !== user.email) {
      const existing = await Student.findOne({ email, _id: { $ne: user._id } });
      if (existing) {
        throw new ApiError(409, "Email already registered");
      }
      user.email = email;
    }
  }

  // Student ID uniqueness (excluding self)
  if (data.studentId !== undefined) {
    const studentId = data.studentId.trim();
    if (studentId !== (user.studentId || "")) {
      const existing = await Student.findOne({ studentId, _id: { $ne: user._id } });
      if (existing) {
        throw new ApiError(409, "Student ID already registered");
      }
    }
    user.studentId = studentId || undefined;
  }

  if (data.name !== undefined) user.name = data.name.trim();
  if (data.surname !== undefined) user.surname = data.surname.trim();

  await user.save();

  const result: AdminUserDTO = {
    id: user._id.toString(),
    studentId: user.studentId,
    email: user.email,
    name: user.name,
    surname: user.surname,
    role: targetRole,
    isActive: user.isActive,
  };
  recordAuditEvent({ eventType: "business", action: "user.profile_updated", actorId: actor.id, targetType: "User", targetId: result.id, success: true });
  return result;
};
