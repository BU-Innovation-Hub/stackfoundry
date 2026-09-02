import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Profile from '../pages/Profile';
import ProtectedRoute from '../components/common/ProtectedRoute';
import WorkspaceLayout from '../pages/innovation/WorkspaceLayout';
import Overview from '../pages/innovation/Overview';
import Ideas from '../pages/innovation/Ideas';
import IdeaEditor from '../pages/innovation/IdeaEditor';
import IdeaDetail from '../pages/innovation/IdeaDetail';
import Projects from '../pages/innovation/Projects';
import ProjectDetail from '../pages/innovation/ProjectDetail';
import Collaborators from '../pages/innovation/Collaborators';
import Mentors from '../pages/innovation/Mentors';
import MentorProfile from '../pages/innovation/MentorProfile';
import Mentorship from '../pages/innovation/Mentorship';
import Notifications from '../pages/innovation/Notifications';
import { Showcase, ShowcaseDetail } from '../pages/innovation/Showcase';
import { ClassificationAdmin } from '../pages/admin/InnovationAdmin';
import InnovationModeration from '../pages/admin/InnovationAdmin';
import InnovationGovernance from '../pages/admin/InnovationGovernance';
import MentorProfileEditor from '../pages/admin/MentorProfileEditor';

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
import AuditLogs from '../pages/admin/AuditLogs';

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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/showcase" element={<Showcase />} />
      <Route path="/showcase/:id" element={<ShowcaseDetail />} />
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
          <ProtectedRoute roles={['student', 'member']} unauthorizedTo="/admin">
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
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/innovation" element={<ProtectedRoute roles={['student', 'mentor', 'innovation_hub_admin', 'system_admin']}><WorkspaceLayout /></ProtectedRoute>}>
        <Route index element={<Overview />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="my-ideas" element={<Ideas />} />
        <Route path="ideas/new" element={<IdeaEditor />} />
        <Route path="ideas/:id" element={<IdeaDetail />} />
        <Route path="ideas/:id/edit" element={<IdeaEditor />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="collaborators" element={<Collaborators />} />
        <Route path="mentors" element={<Mentors />} />
        <Route path="mentors/:id" element={<MentorProfile />} />
        <Route path="mentorship" element={<Mentorship />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      {/* Admin routes — role-protected */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['system_admin', 'innovation_hub_admin', 'mentor']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<ProtectedRoute roles={['system_admin', 'innovation_hub_admin']} unauthorizedTo="/admin"><Members /></ProtectedRoute>} />
        <Route path="blogs" element={<ProtectedRoute roles={['innovation_hub_admin']} unauthorizedTo="/admin"><Blogs /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute roles={['innovation_hub_admin']} unauthorizedTo="/admin"><Events /></ProtectedRoute>} />
        <Route path="courses" element={<ProtectedRoute roles={['innovation_hub_admin', 'mentor']} unauthorizedTo="/admin"><Courses /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute roles={['system_admin']} unauthorizedTo="/admin"><AuditLogs /></ProtectedRoute>} />
        <Route path="innovation/categories-and-stages" element={<ProtectedRoute roles={['system_admin','innovation_hub_admin']} unauthorizedTo="/admin"><ClassificationAdmin /></ProtectedRoute>} />
        <Route path="innovation/moderation" element={<ProtectedRoute roles={['system_admin','innovation_hub_admin']} unauthorizedTo="/admin"><InnovationModeration /></ProtectedRoute>} />
        <Route path="innovation" element={<ProtectedRoute roles={['innovation_hub_admin', 'mentor']} unauthorizedTo="/admin"><WorkspaceLayout /></ProtectedRoute>}>
          <Route index element={<Overview />} />
          <Route path="ideas" element={<Ideas />} />
          <Route path="my-ideas" element={<Ideas />} />
          <Route path="ideas/new" element={<IdeaEditor />} />
          <Route path="ideas/:id" element={<IdeaDetail />} />
          <Route path="ideas/:id/edit" element={<IdeaEditor />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="collaborators" element={<Collaborators />} />
          <Route path="mentors" element={<Mentors />} />
          <Route path="mentorship" element={<Mentorship />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
        <Route path="innovation/governance" element={<ProtectedRoute roles={['system_admin']} unauthorizedTo="/admin"><InnovationGovernance /></ProtectedRoute>}>
          <Route index element={<Navigate to="categories-and-stages" replace />} />
          <Route path="categories-and-stages" element={<ClassificationAdmin />} />
          <Route path="moderation" element={<InnovationModeration />} />
        </Route>
        <Route path="mentor-profile" element={<ProtectedRoute roles={['mentor']} unauthorizedTo="/admin"><MentorProfileEditor /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
