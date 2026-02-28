/**
 * Progress Service
 * Business logic for tracking student progress on materials
 * Handles the 80% completion threshold and level-unlock cascade
 */

import mongoose from "mongoose";
import Progress, { IProgress } from "../models/progress.model";
import Material from "../models/material.model";
import { unlockNextLevel } from "./enrollment.service";
import { ApiError } from "../middleware/errorHandler";

export interface ProgressUpdateResult {
  progress: IProgress;
  newLevelUnlocked: boolean;
  unlockedLevel?: any;
}

/**
 * Update progress for a material.
 * - watchedSeconds only increases (max of old vs new)
 * - maxWatchedSeconds tracks the furthest point watched (for seek restriction)
 * - completed becomes true when watchedSeconds >= 80% of video duration
 * - When completed and all materials in level are done, unlock next level
 */
export const updateProgress = async (
  userId: string,
  materialId: string,
  watchedSeconds: number,
  maxWatchedSeconds?: number
): Promise<ProgressUpdateResult> => {
  // Validate material exists
  const material = await Material.findById(materialId);
  if (!material) throw new ApiError(404, "Material not found");

  // For PDFs, mark complete immediately (they don't have watch time)
  const isPdf = material.type === "pdf";

  // Use a session for atomic progress update + potential level unlock
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Upsert progress
    let progress = await Progress.findOne({
      user: userId,
      material: materialId,
    }).session(session);

    if (!progress) {
      progress = new Progress({
        user: userId,
        material: materialId,
        watchedSeconds: 0,
        maxWatchedSeconds: 0,
        completed: false,
      });
    }

    // watchedSeconds only increases
    progress.watchedSeconds = Math.max(progress.watchedSeconds, watchedSeconds);

    // maxWatchedSeconds only increases (tracks furthest point for seek restriction)
    if (maxWatchedSeconds !== undefined) {
      progress.maxWatchedSeconds = Math.max(
        progress.maxWatchedSeconds,
        maxWatchedSeconds
      );
    }

    // Completion check
    const wasCompleted = progress.completed;
    if (isPdf) {
      progress.completed = true;
    } else if (
      material.youtubeDurationSeconds &&
      material.youtubeDurationSeconds > 0
    ) {
      const threshold = Math.floor(material.youtubeDurationSeconds * 0.8);
      progress.completed =
        progress.completed || progress.watchedSeconds >= threshold;
    }

    await progress.save({ session });

    let newLevelUnlocked = false;
    let unlockedLevel: any = undefined;

    // If this material just became completed, check if all materials in level are done
    if (!wasCompleted && progress.completed) {
      const allMaterialsInLevel = await Material.find({
        level: material.level,
      })
        .select("_id")
        .session(session);

      const allMaterialIds = allMaterialsInLevel.map((m) => m._id.toString());

      // Check if user has completed all materials in this level
      const completedCount = await Progress.countDocuments({
        user: userId,
        material: { $in: allMaterialIds },
        completed: true,
      }).session(session);

      if (completedCount >= allMaterialIds.length) {
        // All materials completed — unlock next level
        // We need to commit current transaction first, then unlock
        // Actually, let's do it within the same session scope
        await session.commitTransaction();
        session.endSession();

        // Unlock next level (has its own transaction)
        const unlockResult = await unlockNextLevel(
          userId,
          material.level.toString()
        );
        newLevelUnlocked = unlockResult.unlocked;
        unlockedLevel = unlockResult.nextLevel;

        return { progress, newLevelUnlocked, unlockedLevel };
      }
    }

    await session.commitTransaction();
    return { progress, newLevelUnlocked, unlockedLevel };
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
  }
};

/**
 * Get all progress records for a user in a specific course
 */
export const getUserCourseProgress = async (
  userId: string,
  courseId: string
): Promise<IProgress[]> => {
  // Find all materials that belong to levels in this course
  const Level = mongoose.model("Level");
  const levels = await Level.find({ course: courseId }).select("_id");
  const levelIds = levels.map((l: any) => l._id);

  const materials = await Material.find({ level: { $in: levelIds } }).select(
    "_id"
  );
  const materialIds = materials.map((m) => m._id);

  return Progress.find({
    user: userId,
    material: { $in: materialIds },
  }).populate("material", "title type level order youtubeVideoId");
};

/**
 * Get progress for a single material
 */
export const getMaterialProgress = async (
  userId: string,
  materialId: string
): Promise<IProgress | null> => {
  return Progress.findOne({ user: userId, material: materialId });
};
