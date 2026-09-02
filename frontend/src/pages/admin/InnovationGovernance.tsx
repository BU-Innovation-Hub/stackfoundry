import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from '../innovation/Innovation.module.css';

const InnovationGovernance: React.FC = () => {
  const location = useLocation();
  const moderationActive = location.pathname.endsWith('/moderation');
  return <div>
    <div className={styles.title}><div><h2>{moderationActive ? 'Innovation moderation' : 'Innovation governance'}</h2><p>{moderationActive ? 'Review ideas, assign mentors, approve mentor profiles, and publish showcase projects.' : 'Manage the categories and development stages used across the hub.'}</p></div></div>
    <nav className={styles.subnav} aria-label="Innovation governance"><NavLink to="/admin/innovation/governance/categories-and-stages" className={({ isActive }) => isActive ? styles.active : ''}>Categories and stages</NavLink><NavLink to="/admin/innovation/governance/moderation" className={({ isActive }) => isActive ? styles.active : ''}>Innovation moderation</NavLink></nav>
    <Outlet />
  </div>;
};

export default InnovationGovernance;
