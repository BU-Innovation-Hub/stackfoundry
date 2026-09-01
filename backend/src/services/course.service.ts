/**
 * Course Service
 * Business logic for course CRUD operations
 */

import mongoose from "mongoose";
import Course, { ICourse } from "../models/course.model";
import Level from "../models/level.model";
import Topic from "../models/topic.model";
import Material from "../models/material.model";
import Enrollment from "../models/enrollment.model";
import { ApiError } from "../middleware/errorHandler";
import { AuthUser } from "../types";

/**
 * Determine whether a user may administer the course content.
 * innovation_hub_admin may manage every course; mentors may only manage courses
 * they created. System admin is intentionally NOT granted course management.
 */
export const canManageCourse = (
  user: Pick<AuthUser, "id" | "role" | "roleNames">,
  courseCreatedBy?: string | { _id: string } | null
): boolean => {
  const roles = new Set<string>([user.role, ...(user.roleNames || [])]);
  if (roles.has("innovation_hub_admin")) return true;
  if (!roles.has("mentor")) return false;

  const ownerId =
    typeof courseCreatedBy === "string"
      ? courseCreatedBy
      : courseCreatedBy?._id?.toString();
  return !!ownerId && ownerId === user.id;
};

/**
 * Assert that the requesting user may manage the given course, throwing a
 * 403 otherwise. Used before any course or nested-content mutation.
 */
export const assertCanManageCourse = async (
  user: AuthUser,
  courseId: string
): Promise<void> => {
  const course = await Course.findById(courseId).select("createdBy").lean();
  if (!course) throw new ApiError(404, "Course not found");

  if (!canManageCourse(user, (course as any).createdBy)) {
    throw new ApiError(
      403,
      "You can only manage courses that you created. Innovation hub admins can manage all courses."
    );
  }
};

/**
 * Assert that the user may manage the course that owns the given level.
 * Resolves level -> course then checks ownership.
 */
export const assertCanManageLevel = async (
  user: AuthUser,
  levelId: string
): Promise<void> => {
  const level = await Level.findById(levelId).select("course").lean();
  if (!level) throw new ApiError(404, "Level not found");
  await assertCanManageCourse(user, (level as any).course.toString());
};

/**
 * Assert that the user may manage the course that owns the given topic.
 * Resolves topic -> level -> course then checks ownership.
 */
export const assertCanManageTopic = async (
  user: AuthUser,
  topicId: string
): Promise<void> => {
  const topic = await Topic.findById(topicId).select("level").lean();
  if (!topic) throw new ApiError(404, "Topic not found");
  await assertCanManageLevel(user, (topic as any).level.toString());
};

/**
 * Assert that the user may manage the course that owns the given material.
 * Resolves material -> level -> course then checks ownership.
 */
export const assertCanManageMaterial = async (
  user: AuthUser,
  materialId: string
): Promise<void> => {
  const material = await Material.findById(materialId).select("level").lean();
  if (!material) throw new ApiError(404, "Material not found");
  await assertCanManageLevel(user, (material as any).level.toString());
};


// ============================================
// Course CRUD
// ============================================

export const createCourse = async (data: {
  title: string;
  description?: string;
  coverImage?: string;
  createdBy: string;
}): Promise<ICourse> => {
  const course = await Course.create(data);
  return course;
};

/**
 * Compute real enrollment counts per course from the Enrollment collection.
 * This is the single source of truth for "users enrolled" across all nodes.
 */
const getEnrollmentCountMap = async (courseIds?: string[]): Promise<Record<string, number>> => {
  const pipeline: any[] = [];
  if (courseIds && courseIds.length > 0) {
    pipeline.push({ $match: { course: { $in: courseIds.map((id) => new mongoose.Types.ObjectId(id)) } } });
  }
  pipeline.push({ $group: { _id: "$course", count: { $sum: 1 } } });

  const enrollCounts = await Enrollment.aggregate(pipeline);
  const countMap: Record<string, number> = {};
  for (const ec of enrollCounts) {
    countMap[ec._id.toString()] = ec.count;
  }
  return countMap;
};

export const getCourses = async (): Promise<any[]> => {
  const courses = await Course.find().sort({ createdAt: -1 }).populate("createdBy", "name surname email").lean();

  // Real enrollment counts per course (from the Enrollment collection)
  const countMap = await getEnrollmentCountMap();

  return courses.map((c: any) => ({
    ...c,
    enrolledCount: countMap[c._id.toString()] || 0,
  }));
};

export const getCourseById = async (id: string): Promise<any> => {
  const course = await Course.findById(id).populate("createdBy", "name surname email").lean();
  if (!course) throw new ApiError(404, "Course not found");
  // Attach the precise enrollment count so single-course views stay accurate
  const countMap = await getEnrollmentCountMap([id]);
  return {
    ...(course as any),
    enrolledCount: countMap[id] || 0,
  };
};

export const updateCourse = async (
  id: string,
  data: Partial<{ title: string; description: string; coverImage: string }>
): Promise<ICourse> => {
  const course = await Course.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!course) throw new ApiError(404, "Course not found");
  return course;
};

export const deleteCourse = async (id: string): Promise<void> => {
  const course = await Course.findByIdAndDelete(id);
  if (!course) throw new ApiError(404, "Course not found");
  // Cascade delete associated levels
  await Level.deleteMany({ course: id });
};

/**
 * Get full course structure with levels
 */
export const getCourseWithLevels = async (courseId: string) => {
  const course = await getCourseById(courseId);
  const levels = await Level.find({ course: courseId }).sort({ levelNumber: 1 });
  return { course, levels };
};
