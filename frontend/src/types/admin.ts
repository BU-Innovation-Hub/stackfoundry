// ============================================
// Admin Dashboard Types
// Easy to share with backend later
// ============================================

export interface Member {
  id: string;
  studentId: string;
  name: string;
  surname: string;
  email: string;
  role: 'student' | 'admin' | 'member' | 'instructor';
  isActive: boolean;
  joinedAt: string;
  lastLogin?: string;
}

// BlogPost interface removed - now using IBlog from backend models


export interface Event {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  date: string;
  time: string;
  location: string;
  type: 'workshop' | 'hackathon' | 'meetup' | 'webinar' | 'conference';
  capacity: number;
  registered: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
}

export interface CourseLesson {
  id: string;
  title: string;
  videoUrl: string;
  duration: number; // minutes
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  language: string;       // e.g. "JavaScript", "Python"
  framework?: string;     // e.g. "React", "Django"
  level: CourseLevel;
  duration: number;       // total minutes
  lessons: CourseLesson[];
  quiz: QuizQuestion[];
  enrolledCount: number;
  completionRate: number; // percentage
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalBlogs: number;
  publishedBlogs: number;
  totalEvents: number;
  upcomingEvents: number;
  totalCourses: number;
  publishedCourses: number;
  recentRegistrations: Member[];
  popularCourses: Course[];
}
