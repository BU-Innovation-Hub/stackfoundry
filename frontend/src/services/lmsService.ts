/**
 * LMS Service
 * Frontend API client for Learning Management System endpoints
 * All YouTube/Cloudinary secrets remain server-side — this only calls the backend
 */

import { api } from "./apiClient";
import {
  LmsCourse,
  LmsLevel,
  LmsTopic,
  LmsMaterial,
  LmsEnrollment,
  LmsProgress,
  ProgressUpdateResponse,
  CourseWithLevels,
  LevelWithTopics,
} from "../types/lms";

// ============================================
// Courses
// ============================================

export const lmsGetCourses = async (): Promise<LmsCourse[]> => {
  const res = await api.get("/courses");
  return res.data.data;
};

export const lmsGetCourse = async (id: string): Promise<CourseWithLevels> => {
  const res = await api.get(`/courses/${id}`);
  return res.data.data;
};

export const lmsCreateCourse = async (data: {
  title: string;
  description?: string;
}): Promise<LmsCourse> => {
  const res = await api.post("/courses", data);
  return res.data.data;
};

export const lmsUpdateCourse = async (
  id: string,
  data: { title?: string; description?: string }
): Promise<LmsCourse> => {
  const res = await api.put(`/courses/${id}`, data);
  return res.data.data;
};

export const lmsDeleteCourse = async (id: string): Promise<void> => {
  await api.delete(`/courses/${id}`);
};

// ============================================
// Levels
// ============================================

export const lmsGetLevels = async (courseId: string): Promise<LmsLevel[]> => {
  const res = await api.get(`/courses/${courseId}/levels`);
  return res.data.data;
};

export const lmsGetLevel = async (id: string): Promise<LevelWithTopics> => {
  const res = await api.get(`/levels/${id}`);
  return res.data.data;
};

export const lmsCreateLevel = async (
  courseId: string,
  data: { levelNumber: number; name: string; lockedByDefault?: boolean }
): Promise<LmsLevel> => {
  const res = await api.post(`/courses/${courseId}/levels`, data);
  return res.data.data;
};

export const lmsUpdateLevel = async (
  id: string,
  data: { name?: string; levelNumber?: number; lockedByDefault?: boolean }
): Promise<LmsLevel> => {
  const res = await api.put(`/levels/${id}`, data);
  return res.data.data;
};

export const lmsDeleteLevel = async (id: string): Promise<void> => {
  await api.delete(`/levels/${id}`);
};

// ============================================
// Topics
// ============================================

export const lmsGetTopics = async (levelId: string): Promise<LmsTopic[]> => {
  const res = await api.get(`/levels/${levelId}/topics`);
  return res.data.data;
};

export const lmsCreateTopic = async (
  levelId: string,
  data: { name: string; description?: string }
): Promise<LmsTopic> => {
  const res = await api.post(`/levels/${levelId}/topics`, data);
  return res.data.data;
};

export const lmsUpdateTopic = async (
  id: string,
  data: { name?: string; description?: string }
): Promise<LmsTopic> => {
  const res = await api.put(`/topics/${id}`, data);
  return res.data.data;
};

export const lmsDeleteTopic = async (id: string): Promise<void> => {
  await api.delete(`/topics/${id}`);
};

// ============================================
// Materials
// ============================================

export const lmsGetMaterials = async (
  levelId: string
): Promise<LmsMaterial[]> => {
  const res = await api.get(`/materials?levelId=${levelId}`);
  return res.data.data;
};

export const lmsGetMaterial = async (id: string): Promise<LmsMaterial> => {
  const res = await api.get(`/materials/${id}`);
  return res.data.data;
};

export const lmsCreateVideoMaterial = async (data: {
  youtubeUrl: string;
  levelId: string;
  topicId?: string;
  title?: string;
}): Promise<LmsMaterial> => {
  const res = await api.post("/materials/video", data);
  return res.data.data;
};

export const lmsUploadPdfMaterial = async (
  file: File,
  levelId: string,
  topicId?: string,
  title?: string
): Promise<LmsMaterial> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("levelId", levelId);
  if (topicId) formData.append("topicId", topicId);
  if (title) formData.append("title", title);

  const res = await api.post("/materials/pdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const lmsDownloadPdf = async (
  materialId: string
): Promise<{ url: string; originalName: string }> => {
  const res = await api.get(`/materials/${materialId}/download`);
  return res.data.data;
};

export const lmsDeleteMaterial = async (id: string): Promise<void> => {
  await api.delete(`/materials/${id}`);
};

// ============================================
// Enrollments
// ============================================

export const lmsEnroll = async (courseId: string): Promise<LmsEnrollment> => {
  const res = await api.post("/enroll", { courseId });
  return res.data.data;
};

export const lmsGetMyEnrollments = async (): Promise<LmsEnrollment[]> => {
  const res = await api.get("/enrollments/me");
  return res.data.data;
};

export const lmsGetUserEnrollments = async (
  userId: string
): Promise<LmsEnrollment[]> => {
  const res = await api.get(`/enrollments/${userId}/courses`);
  return res.data.data;
};

// ============================================
// Progress
// ============================================

export const lmsUpdateProgress = async (
  materialId: string,
  watchedSeconds: number,
  maxWatchedSeconds?: number
): Promise<ProgressUpdateResponse> => {
  const res = await api.post("/progress", { materialId, watchedSeconds, maxWatchedSeconds });
  return res.data.data;
};

export const lmsGetProgress = async (
  courseId: string,
  userId?: string
): Promise<LmsProgress[]> => {
  let url = `/progress?courseId=${courseId}`;
  if (userId) url += `&user=${userId}`;
  const res = await api.get(url);
  return res.data.data;
};
