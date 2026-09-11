import React from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { Lightbulb, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Innovation.module.css';

const WorkspaceLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';
  const links = [
    [base, 'Overview'],
    [`${base}/my-projects`, base === '/admin/innovation' ? 'Project' : 'My Projects'],
    [`${base}/projects`, 'Explore'],
    [`${base}/collaborators`, 'Collaborators'],
  ];

  const dashboardLink = user?.role === 'student' || user?.role === 'member' ? '/dashboard' : '/admin';

  return (
    <div className={styles.layout}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <div>
            <h1><Lightbulb size={25} /> Innovation workspace</h1>
            <p>Turn promising projects into meaningful impact.</p>
          </div>
          <Link className={styles.dashboardLink} to={dashboardLink}>
            <ArrowLeft size={16} /> Back to dashboard
          </Link>
        </div>
        <nav className={styles.nav}>
          {links.map(([to, label]) => (
            <NavLink key={label} to={to} end className={({ isActive }) => isActive ? styles.active : ''}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default WorkspaceLayout;
