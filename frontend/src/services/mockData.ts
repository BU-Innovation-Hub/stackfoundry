// ============================================
// Mock Data for Admin Dashboard
// Only courses remain as mock — all others use real API
// ============================================

import { Member, Course, DashboardStats } from '../types/admin';

// ---- Members (kept for courses dashboard stats fallback) ----
export const mockMembers: Member[] = [];

// ---- Courses ----
export const mockCourses: Course[] = [
  {
    id: '1', title: 'React Fundamentals', description: 'Learn the core concepts of React including components, state, props, and hooks.', coverImage: '', language: 'JavaScript', framework: 'React', level: 'beginner', duration: 480,
    lessons: [
      { id: 'l1', title: 'Introduction to React', videoUrl: '', duration: 25, order: 1 },
      { id: 'l2', title: 'Components & JSX', videoUrl: '', duration: 35, order: 2 },
      { id: 'l3', title: 'State & Props', videoUrl: '', duration: 40, order: 3 },
      { id: 'l4', title: 'Hooks: useState & useEffect', videoUrl: '', duration: 45, order: 4 },
    ],
    quiz: [
      { id: 'q1', question: 'What hook is used to manage state in a functional component?', options: ['useEffect', 'useState', 'useRef', 'useMemo'], correctAnswer: 1 },
      { id: 'q2', question: 'What does JSX stand for?', options: ['JavaScript XML', 'Java Standard Extension', 'JSON Exchange', 'JavaScript Extension'], correctAnswer: 0 },
      { id: 'q3', question: 'Which method is used to pass data from parent to child?', options: ['State', 'Props', 'Context', 'Refs'], correctAnswer: 1 },
    ],
    enrolledCount: 45, completionRate: 72, status: 'published', createdAt: '2025-11-01', updatedAt: '2026-01-15'
  },
  {
    id: '2', title: 'Python for Data Science', description: 'Master Python fundamentals and data analysis with pandas, NumPy, and matplotlib.', coverImage: '', language: 'Python', level: 'intermediate', duration: 600,
    lessons: [
      { id: 'l1', title: 'Python Basics Refresher', videoUrl: '', duration: 30, order: 1 },
      { id: 'l2', title: 'NumPy Arrays', videoUrl: '', duration: 45, order: 2 },
      { id: 'l3', title: 'Pandas DataFrames', videoUrl: '', duration: 50, order: 3 },
      { id: 'l4', title: 'Data Visualization', videoUrl: '', duration: 40, order: 4 },
    ],
    quiz: [
      { id: 'q1', question: 'Which library is used for data manipulation in Python?', options: ['NumPy', 'Pandas', 'Matplotlib', 'Scikit-learn'], correctAnswer: 1 },
      { id: 'q2', question: 'What does df.head() return?', options: ['Last 5 rows', 'First 5 rows', 'Column names', 'Data types'], correctAnswer: 1 },
    ],
    enrolledCount: 32, completionRate: 58, status: 'published', createdAt: '2025-12-01', updatedAt: '2026-01-20'
  },
  {
    id: '3', title: 'Node.js & Express API Development', description: 'Build production-ready REST APIs with Node.js, Express, and MongoDB.', coverImage: '', language: 'JavaScript', framework: 'Express', level: 'intermediate', duration: 540,
    lessons: [
      { id: 'l1', title: 'Setting Up Node.js', videoUrl: '', duration: 20, order: 1 },
      { id: 'l2', title: 'Express Routing', videoUrl: '', duration: 35, order: 2 },
      { id: 'l3', title: 'MongoDB & Mongoose', videoUrl: '', duration: 50, order: 3 },
      { id: 'l4', title: 'Authentication & JWT', videoUrl: '', duration: 55, order: 4 },
    ],
    quiz: [
      { id: 'q1', question: 'What is middleware in Express?', options: ['A database', 'A function that processes requests', 'A frontend library', 'A testing tool'], correctAnswer: 1 },
    ],
    enrolledCount: 28, completionRate: 45, status: 'published', createdAt: '2026-01-01', updatedAt: '2026-02-01'
  },
  {
    id: '4', title: 'Flutter Mobile Development', description: 'Create beautiful cross-platform mobile apps with Flutter and Dart.', coverImage: '', language: 'Dart', framework: 'Flutter', level: 'beginner', duration: 720,
    lessons: [
      { id: 'l1', title: 'Dart Language Basics', videoUrl: '', duration: 40, order: 1 },
      { id: 'l2', title: 'Flutter Widgets', videoUrl: '', duration: 50, order: 2 },
    ],
    quiz: [],
    enrolledCount: 0, completionRate: 0, status: 'draft', createdAt: '2026-02-05', updatedAt: '2026-02-05'
  },
];

// ---- Dashboard Stats (computed from real API in adminService) ----
export const mockDashboardStats: DashboardStats = {
  totalMembers: 0,
  activeMembers: 0,
  totalBlogs: 0,
  publishedBlogs: 0,
  totalEvents: 0,
  upcomingEvents: 0,
  totalCourses: mockCourses.length,
  publishedCourses: mockCourses.filter(c => c.status === 'published').length,
  recentRegistrations: [],
  popularCourses: mockCourses.filter(c => c.status === 'published').sort((a, b) => b.enrolledCount - a.enrolledCount).slice(0, 3),
};
