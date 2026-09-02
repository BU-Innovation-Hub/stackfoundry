import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Calendar, BookOpen, LogOut, Menu, X, ScrollText, Lightbulb, UserRound } from 'lucide-react';
import { RoleName } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';

const navItems: Array<{ to: string; icon: typeof LayoutDashboard; label: string; end: boolean; roles: RoleName[] }> = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, roles: ['system_admin', 'innovation_hub_admin', 'mentor'] },
  { to: '/admin/members', icon: Users, label: 'Manage Users', end: false, roles: ['system_admin', 'innovation_hub_admin'] },
  { to: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs', end: false, roles: ['system_admin'] },
  { to: '/admin/courses', icon: BookOpen, label: 'Courses', end: false, roles: ['innovation_hub_admin', 'mentor'] },
  { to: '/admin/blogs', icon: FileText, label: 'Blogs', end: false, roles: ['innovation_hub_admin'] },
  { to: '/admin/events', icon: Calendar, label: 'Events', end: false, roles: ['innovation_hub_admin'] },
  { to: '/admin/innovation', icon: Lightbulb, label: 'Innovation Workspace', end: false, roles: ['innovation_hub_admin', 'mentor'] },
  { to: '/admin/mentor-profile', icon: UserRound, label: 'MentorProfile', end: true, roles: ['mentor'] },
  { to: '/admin/innovation/governance', icon: Lightbulb, label: 'Innovation governance', end: false, roles: ['system_admin'] },
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
          {navItems.filter(item => user?.role && item.roles.includes(user.role)).map(({ to, icon: Icon, label, end }) => (
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
        <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
        </button>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
