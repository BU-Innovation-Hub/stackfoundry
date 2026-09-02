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
    [`${base}/ideas/new`, 'Submit Idea'],
    [`${base}/my-ideas`, 'My Ideas'],
    [`${base}/ideas`, 'Explore Ideas'],
    [`${base}/projects`, 'Collaboration']
  ];

  const dashboardLink = user?.role === 'student' || user?.role === 'member' ? '/dashboard' : '/admin';

  return (
    <div className={styles.layout}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <div>
            <h1><Lightbulb size={25} /> Innovation workspace</h1>
            <p>Turn promising ideas into meaningful impact.</p>
          </div>
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
        <Link className={styles.homeLink} to={dashboardLink}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      </main>
    </div>
  );
};

export default WorkspaceLayout;
