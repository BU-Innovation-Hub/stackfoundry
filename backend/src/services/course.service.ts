/**
 * Course Service
 * Business logic for course CRUD operations
 */

import Course, { ICourse } from "../models/course.model";
import Level from "../models/level.model";
import Enrollment from "../models/enrollment.model";
import { ApiError } from "../middleware/errorHandler";

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

export const getCourses = async (): Promise<any[]> => {
  const courses = await Course.find().sort({ createdAt: -1 }).populate("createdBy", "name surname email").lean();

  // Get enrollment counts per course
  const enrollCounts = await Enrollment.aggregate([
    { $group: { _id: "$course", count: { $sum: 1 } } },
  ]);
  const countMap: Record<string, number> = {};
  for (const ec of enrollCounts) {
    countMap[ec._id.toString()] = ec.count;
  }

  return courses.map((c: any) => ({
    ...c,
    enrolledCount: countMap[c._id.toString()] || 0,
  }));
};

export const getCourseById = async (id: string): Promise<ICourse> => {
  const course = await Course.findById(id).populate("createdBy", "name surname email");
  if (!course) throw new ApiError(404, "Course not found");
  return course;
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
