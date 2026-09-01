/**
 * Enrollment Service
 * Business logic for enrolling students in courses and managing level unlocks
 */

import Enrollment, { IEnrollment } from "../models/enrollment.model";
import Level from "../models/level.model";
import Course from "../models/course.model";
import { ApiError } from "../middleware/errorHandler";

/**
 * Enroll a user in a course and unlock level 1 automatically
 */
export const enrollInCourse = async (
  userId: string,
  courseId: string
): Promise<IEnrollment> => {
  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  // Find level 1 of the course to auto-unlock
  const firstLevel = await Level.findOne({ course: courseId, levelNumber: 1 });
  const levelsUnlocked = firstLevel ? [firstLevel._id] : [];

  try {
    const enrollment = await Enrollment.create({
      user: userId,
      course: courseId,
      levelsUnlocked,
    });
    return enrollment;
  } catch (err: any) {
    if (err && err.code === 11000) {
      throw new ApiError(409, "Already enrolled in this course");
    }
    throw err;
  }
};

/**
 * Get all enrollments for a user
 */
export const getUserEnrollments = async (
  userId: string
): Promise<IEnrollment[]> => {
  return Enrollment.find({ user: userId })
    .populate("course", "title description")
    .populate("levelsUnlocked", "name levelNumber")
    .sort({ enrolledAt: -1 });
};

/**
 * Get a specific enrollment
 */
export const getEnrollment = async (
  userId: string,
  courseId: string
): Promise<IEnrollment | null> => {
  return Enrollment.findOne({ user: userId, course: courseId })
    .populate("course", "title description")
    .populate("levelsUnlocked", "name levelNumber");
};

/**
 * Check if a user is enrolled in a course
 */
export const isEnrolled = async (
  userId: string,
  courseId: string
): Promise<boolean> => {
  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
  });
  return !!enrollment;
};

/**
 * Check if a level is unlocked for a user
 */
export const isLevelUnlocked = async (
  userId: string,
  levelId: string
): Promise<boolean> => {
  const level = await Level.findById(levelId);
  if (!level) return false;

  const enrollment = await Enrollment.findOne({
    user: userId,
    course: level.course,
  });
  if (!enrollment) return false;

  return enrollment.levelsUnlocked.some(
    (id) => id.toString() === levelId.toString()
  );
};

/**
 * Admin: Unlock a level for ALL enrolled students in its course
 * Adds the level to levelsUnlocked for every enrollment that doesn't already have it
 */
export const unlockLevelForAllStudents = async (
  levelId: string
): Promise<{ modifiedCount: number }> => {
  const level = await Level.findById(levelId);
  if (!level) throw new ApiError(404, "Level not found");

  const result = await Enrollment.updateMany(
    {
      course: level.course,
      levelsUnlocked: { $ne: level._id },
    },
    {
      $addToSet: { levelsUnlocked: level._id },
    }
  );

  return { modifiedCount: result.modifiedCount };
};

/**
 * Admin: Lock a level for ALL enrolled students in its course
 * Removes the level from levelsUnlocked for every enrollment
 */
export const lockLevelForAllStudents = async (
  levelId: string
): Promise<{ modifiedCount: number }> => {
  const level = await Level.findById(levelId);
  if (!level) throw new ApiError(404, "Level not found");

  const result = await Enrollment.updateMany(
    {
      course: level.course,
    },
    {
      $pull: { levelsUnlocked: level._id } as any,
    }
  );

  return { modifiedCount: result.modifiedCount };
};
export const unlockNextLevel = async (
  userId: string,
  currentLevelId: string
): Promise<{ unlocked: boolean; nextLevel?: any }> => {
  const currentLevel = await Level.findById(currentLevelId);
  if (!currentLevel) return { unlocked: false };

  // Find next level
  const nextLevel = await Level.findOne({
    course: currentLevel.course,
    levelNumber: currentLevel.levelNumber + 1,
  });

  if (!nextLevel) return { unlocked: false }; // No next level

  // Atomic, race-safe guarded addToSet: only modifies if the level isn't already unlocked
  // Works on standalone, replica set, and sharded MongoDB (no transactions needed)
  const result = await Enrollment.updateOne(
    {
      user: userId,
      course: currentLevel.course,
      levelsUnlocked: { $ne: nextLevel._id },
    },
    { $addToSet: { levelsUnlocked: nextLevel._id } }
  );

  if (result.modifiedCount === 0) {
    return { unlocked: false }; // Not enrolled or already unlocked
  }

  return { unlocked: true, nextLevel };
};
