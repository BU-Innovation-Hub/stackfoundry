/**
 * Level Service
 * Business logic for level CRUD within a course
 */

import Level, { ILevel } from "../models/level.model";
import Topic from "../models/topic.model";
import { ApiError } from "../middleware/errorHandler";

export const createLevel = async (data: {
  course: string;
  levelNumber: number;
  name: string;
  lockedByDefault?: boolean;
}): Promise<ILevel> => {
  try {
    const level = await Level.create(data);
    return level;
  } catch (err: any) {
    if (err.code === 11000) {
      throw new ApiError(
        409,
        `Level number ${data.levelNumber} already exists in this course`
      );
    }
    throw err;
  }
};

export const getLevelsByCourse = async (courseId: string): Promise<ILevel[]> => {
  return Level.find({ course: courseId }).sort({ levelNumber: 1 });
};

export const getLevelById = async (id: string): Promise<ILevel> => {
  const level = await Level.findById(id);
  if (!level) throw new ApiError(404, "Level not found");
  return level;
};

export const updateLevel = async (
  id: string,
  data: Partial<{ name: string; levelNumber: number; lockedByDefault: boolean }>
): Promise<ILevel> => {
  try{
  const level = await Level.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!level) throw new ApiError(404, "Level not found");
  return level;
  } catch (err: any) {
   if (err.code === 11000) {
     throw new ApiError(
       409,
       `Level number ${data.levelNumber} already exists in this course`
     );
   }
   throw err;
 }
};

export const deleteLevel = async (id: string): Promise<void> => {
  const level = await Level.findByIdAndDelete(id);
  if (!level) throw new ApiError(404, "Level not found");
};

/**
 * Get level with its topics
 */
export const getLevelWithTopics = async (levelId: string) => {
  const level = await getLevelById(levelId);
  const topics = await Topic.find({ level: levelId }).sort({ createdAt: 1 });
  return { level, topics };
};
