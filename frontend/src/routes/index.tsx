import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import BlogListing from '../pages/BlogListing';
import BlogPostPage from '../pages/BlogPost';
import EventListing from '../pages/EventListing';
import EventDetail from '../pages/EventDetail';
import Join from '../pages/Join';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import ChangePassword from '../pages/ChangePassword';
import ProtectedRoute from '../components/common/ProtectedRoute';

// LMS pages
import CourseCatalog from '../pages/CourseCatalog';
import CourseLearn from '../pages/CourseLearn';

// Admin pages
import AdminLayout from '../pages/admin/AdminLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import Members from '../pages/admin/Members';
import Blogs from '../pages/admin/Blogs';
import Events from '../pages/admin/Events';
import Courses from '../pages/admin/Courses';
import CourseManager from '../pages/admin/CourseManager';

const AppRoutes: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/blog" element={<BlogListing />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/events" element={<EventListing />} />
      <Route path="/events/:slug" element={<EventDetail />} />
      <Route path="/join" element={<Join />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/courses" element={<CourseCatalog />} />
      <Route
        path="/learn/:courseId"
        element={
          <ProtectedRoute>
            <CourseLearn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Admin routes — role-protected */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="blogs" element={<Blogs />} />
        <Route path="events" element={<Events />} />
        <Route path="courses" element={<Courses />} />
        <Route path="course-manager" element={<CourseManager />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
