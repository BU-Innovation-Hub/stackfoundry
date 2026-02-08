/**
 * User Service
 * Business logic for user operations
 */

import Student, { IStudent } from "../models/user.model";

/**
 * Find user by ID
 */
export const findById = async (id: string): Promise<IStudent | null> => {
  return Student.findById(id).populate("roles").exec();
};

/**
 * Find user by email
 */
export const findByEmail = async (email: string): Promise<IStudent | null> => {
  return Student.findOne({ email: email.toLowerCase() }).populate("roles").exec();
};

/**
 * Find user by student ID
 */
export const findByStudentId = async (studentId: string): Promise<IStudent | null> => {
  return Student.findOne({ studentId }).populate("roles").exec();
};

/**
 * Update user by ID
 */
export const updateById = async (
  id: string,
  updates: Partial<Pick<IStudent, "name" | "surname" | "email" | "isActive">>
): Promise<IStudent | null> => {
  return Student.findByIdAndUpdate(id, updates, { new: true }).populate("roles").exec();
};
