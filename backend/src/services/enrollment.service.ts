/**
 * Enrollment Service
 * Business logic for enrolling students in courses and managing level unlocks
 */

import mongoose from "mongoose";
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
 * Unlock the next level for a user in a course (called after all materials in current level completed)
 * Uses a transaction for atomicity
 */
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

  // Use session for atomicity
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: currentLevel.course,
    }).session(session);

    if (!enrollment) {
      await session.abortTransaction();
      return { unlocked: false };
    }

    // Check if already unlocked
    const alreadyUnlocked = enrollment.levelsUnlocked.some(
      (id) => id.toString() === nextLevel._id.toString()
    );

    if (alreadyUnlocked) {
      await session.abortTransaction();
      return { unlocked: false };
    }

    enrollment.levelsUnlocked.push(nextLevel._id);
    await enrollment.save({ session });

    await session.commitTransaction();
    return { unlocked: true, nextLevel };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
