// ============================================
// Mock Data for Admin Dashboard
// Replace with real API calls when backend is ready
// ============================================

import { Member, BlogPost, Event, Course, DashboardStats } from '../types/admin';

// ---- Members ----
export const mockMembers: Member[] = [
  { id: '1', studentId: 'STU001', name: 'Thabo', surname: 'Mokoena', email: 'thabo@botho.ac.bw', role: 'member', isActive: true, joinedAt: '2025-09-15', lastLogin: '2026-02-08' },
  { id: '2', studentId: 'STU002', name: 'Naledi', surname: 'Kgathi', email: 'naledi@botho.ac.bw', role: 'member', isActive: true, joinedAt: '2025-10-01', lastLogin: '2026-02-07' },
  { id: '3', studentId: 'STU003', name: 'Kagiso', surname: 'Modise', email: 'kagiso@botho.ac.bw', role: 'student', isActive: true, joinedAt: '2025-10-20', lastLogin: '2026-02-06' },
  { id: '4', studentId: 'STU004', name: 'Mpho', surname: 'Tau', email: 'mpho@botho.ac.bw', role: 'instructor', isActive: true, joinedAt: '2025-08-01', lastLogin: '2026-02-08' },
  { id: '5', studentId: 'STU005', name: 'Amantle', surname: 'Leburu', email: 'amantle@botho.ac.bw', role: 'member', isActive: false, joinedAt: '2025-11-10', lastLogin: '2026-01-15' },
  { id: '6', studentId: 'STU006', name: 'Tshegofatso', surname: 'Ramotswa', email: 'tshego@botho.ac.bw', role: 'student', isActive: true, joinedAt: '2025-12-01', lastLogin: '2026-02-05' },
  { id: '7', studentId: 'STU007', name: 'Bokang', surname: 'Mahlaka', email: 'bokang@botho.ac.bw', role: 'admin', isActive: true, joinedAt: '2025-07-01', lastLogin: '2026-02-09' },
  { id: '8', studentId: 'STU008', name: 'Keitumetse', surname: 'Phiri', email: 'keitu@botho.ac.bw', role: 'member', isActive: true, joinedAt: '2026-01-05', lastLogin: '2026-02-04' },
];

// ---- Blog Posts ----
export const mockBlogs: BlogPost[] = [
  { id: '1', title: 'Getting Started with React in 2026', slug: 'getting-started-react-2026', excerpt: 'A comprehensive guide to starting your React journey...', content: '<p>React remains one of the most popular frontend frameworks...</p>', coverImage: '', author: 'Bokang Mahlaka', tags: ['React', 'JavaScript', 'Frontend'], status: 'published', publishedAt: '2026-01-15', createdAt: '2026-01-10', updatedAt: '2026-01-15' },
  { id: '2', title: 'Building REST APIs with Node.js', slug: 'building-rest-apis-nodejs', excerpt: 'Learn to build scalable APIs with Express and MongoDB...', content: '<p>REST APIs are the backbone of modern web applications...</p>', coverImage: '', author: 'Mpho Tau', tags: ['Node.js', 'Express', 'Backend'], status: 'published', publishedAt: '2026-01-20', createdAt: '2026-01-18', updatedAt: '2026-01-20' },
  { id: '3', title: 'Introduction to Machine Learning with Python', slug: 'intro-ml-python', excerpt: 'Discover the basics of ML using Python and scikit-learn...', content: '<p>Machine learning is transforming industries...</p>', coverImage: '', author: 'Naledi Kgathi', tags: ['Python', 'ML', 'Data Science'], status: 'draft', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
  { id: '4', title: 'UI/UX Design Principles for Developers', slug: 'uiux-design-principles', excerpt: 'Essential design principles every developer should know...', content: '<p>Good design is not just about aesthetics...</p>', coverImage: '', author: 'Amantle Leburu', tags: ['Design', 'UI/UX', 'Frontend'], status: 'published', publishedAt: '2026-02-05', createdAt: '2026-02-03', updatedAt: '2026-02-05' },
];

// ---- Events ----
export const mockEvents: Event[] = [
  { id: '1', title: 'Hackathon 2026: Build for Botswana', description: 'A 48-hour hackathon focused on solving local challenges with technology.', coverImage: '', date: '2026-03-15', time: '08:00', location: 'Botho University, Block C', type: 'hackathon', capacity: 100, registered: 67, status: 'upcoming', createdAt: '2026-01-10' },
  { id: '2', title: 'React Workshop: Hooks Deep Dive', description: 'Master React Hooks with hands-on coding exercises.', coverImage: '', date: '2026-02-20', time: '14:00', location: 'Lab 3, Botho University', type: 'workshop', capacity: 30, registered: 28, status: 'upcoming', createdAt: '2026-01-25' },
  { id: '3', title: 'Tech+ Monthly Meetup - February', description: 'Monthly community meetup. Networking and project showcases.', coverImage: '', date: '2026-02-10', time: '17:00', location: 'Innovation Hub Lounge', type: 'meetup', capacity: 50, registered: 42, status: 'upcoming', createdAt: '2026-01-30' },
  { id: '4', title: 'Cloud Computing Webinar', description: 'Introduction to AWS and cloud architecture patterns.', coverImage: '', date: '2026-01-25', time: '10:00', location: 'Online (Zoom)', type: 'webinar', capacity: 200, registered: 156, status: 'completed', createdAt: '2026-01-05' },
];

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

// ---- Dashboard Stats ----
export const mockDashboardStats: DashboardStats = {
  totalMembers: mockMembers.length,
  activeMembers: mockMembers.filter(m => m.isActive).length,
  totalBlogs: mockBlogs.length,
  publishedBlogs: mockBlogs.filter(b => b.status === 'published').length,
  totalEvents: mockEvents.length,
  upcomingEvents: mockEvents.filter(e => e.status === 'upcoming').length,
  totalCourses: mockCourses.length,
  publishedCourses: mockCourses.filter(c => c.status === 'published').length,
  recentRegistrations: mockMembers.slice(-4).reverse(),
  popularCourses: mockCourses.filter(c => c.status === 'published').sort((a, b) => b.enrolledCount - a.enrolledCount).slice(0, 3),
};
