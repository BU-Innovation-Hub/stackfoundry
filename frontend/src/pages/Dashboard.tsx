import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, KeyRound } from 'lucide-react';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.logo}>StackFoundry</h1>
        <div className={styles.userSection}>
          <span className={styles.greeting}>
            Hi, {user?.name} {user?.surname}
          </span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.welcome}>
          <h2>Welcome to your Dashboard</h2>
          <p>
            You're signed in as <strong>{user?.email}</strong> ({user?.role})
          </p>
          <p className={styles.studentId}>Student ID: {user?.studentId}</p>
          {user?.role === 'admin' && (
            <Link to="/admin" className={styles.adminBtn}>
              <Shield size={18} />
              Admin Panel
            </Link>
          )}
          <Link to="/change-password" className={styles.adminBtn} style={{ background: '#D64A2A' }}>
            <KeyRound size={18} />
            Change Password
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
