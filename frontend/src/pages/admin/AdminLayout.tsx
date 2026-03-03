import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Calendar, BookOpen, GraduationCap, LogOut, Menu, X, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/members', icon: Users, label: 'Members', end: false },
  { to: '/admin/blogs', icon: FileText, label: 'Blogs', end: false },
  { to: '/admin/events', icon: Calendar, label: 'Events', end: false },
  { to: '/admin/courses', icon: BookOpen, label: 'Courses', end: false },
  { to: '/admin/course-manager', icon: GraduationCap, label: 'LMS Manager', end: false },
];

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.brand}>TECH<span className={styles.brandAccent}>+</span></span>
          <span className={styles.brandSub}>Admin</span>
          <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.charAt(0) || 'A'}</div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.name} {user?.surname}</span>
              <span className={styles.userRole}>{user?.role || 'Admin'}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <ChevronLeft size={18} />
            Back to Site
          </button>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
