/**
 * LMS Types
 * TypeScript interfaces for the Learning Management System
 */

// ============================================
// Course / Level / Topic
// ============================================

export interface LmsCourse {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  enrolledCount?: number;
  createdBy?: {
    _id: string;
    name: string;
    surname: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LmsLevel {
  _id: string;
  course: string;
  levelNumber: number;
  name: string;
  lockedByDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LmsTopic {
  _id: string;
  level: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Material
// ============================================

export interface LmsMaterial {
  _id: string;
  level: string;
  topic?: { _id: string; name: string } | string;
  title: string;
  type: "video" | "pdf";
  order: number;

  // Video
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeDurationSeconds?: number;
  youtubeThumbnail?: string;

  // PDF (no cloudinaryPublicId exposed to frontend)
  pdfOriginalName?: string;
  pdfSizeBytes?: number;

  createdAt: string;
  updatedAt: string;
}

// ============================================
// Enrollment
// ============================================

export interface LmsEnrollment {
  _id: string;
  user: string;
  course: LmsCourse | string;
  enrolledAt: string;
  levelsUnlocked: (LmsLevel | string)[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Progress
// ============================================

export interface LmsProgress {
  _id: string;
  user: string;
  material: LmsMaterial | string;
  watchedSeconds: number;
  /** Furthest point watched — used for seek restriction */
  maxWatchedSeconds: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressUpdateResponse {
  progress: LmsProgress;
  newLevelUnlocked: boolean;
  unlockedLevel: LmsLevel | null;
}

// ============================================
// Course with levels (for detail view)
// ============================================

export interface CourseWithLevels {
  course: LmsCourse;
  levels: LmsLevel[];
}

export interface LevelWithTopics {
  level: LmsLevel;
  topics: LmsTopic[];
}
