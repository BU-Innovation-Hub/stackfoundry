/**
 * Topic Service
 * Business logic for topic CRUD within a level
 */
import mongoose from "mongoose";
import Topic, { ITopic } from "../models/topic.model";
import { ApiError } from "../middleware/errorHandler";

export const createTopic = async (data: {
  level: string;
  name: string;
  description?: string;
}): Promise<ITopic> => {
  const topic = await Topic.create(data);
  return topic;
};

export const getTopicsByLevel = async (levelId: string): Promise<ITopic[]> => {
  return Topic.find({ level: levelId }).sort({ createdAt: 1 });
};

export const getTopicById = async (id: string): Promise<ITopic> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Topic not found");
  const topic = await Topic.findById(id);
  if (!topic) throw new ApiError(404, "Topic not found");
  return topic;
};

export const updateTopic = async (
  id: string,
  data: Partial<{ name: string; description: string }>
): Promise<ITopic> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Topic not found")
  const topic = await Topic.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!topic) throw new ApiError(404, "Topic not found");
  return topic;
};

export const deleteTopic = async (id: string): Promise<void> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Topic not found")
  const topic = await Topic.findByIdAndDelete(id);
  if (!topic) throw new ApiError(404, "Topic not found");
};
