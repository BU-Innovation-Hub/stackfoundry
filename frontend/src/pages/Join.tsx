import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, LogIn, ArrowRight, Sparkles } from 'lucide-react';
import styles from './Join.module.css';

const Join: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>

      <div className={styles.container}>
        <Link to="/" className={styles.backLink}>
          <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          Back to Home
        </Link>

        <div className={styles.header}>
          <span className={styles.badge}>
            <Sparkles size={14} />
            Welcome
          </span>
          <h1 className={styles.title}>
            Join the <span className={styles.accent}>The Hub Hub</span>
          </h1>
          <p className={styles.subtitle}>
            Be part of Africa's next generation of tech innovators. 
            Create an account or sign in to access your dashboard.
          </p>
        </div>

        <div className={styles.cards}>
          <Link to="/register" className={styles.card}>
            <div className={styles.cardIcon}>
              <UserPlus size={32} strokeWidth={1.75} />
            </div>
            <h2>Create Account</h2>
            <p>New to The Hub? Join our community of founders,  
               developers, and innovators building the future.</p>
            <span className={styles.cardAction}>
              Get Started <ArrowRight size={18} />
            </span>
          </Link>

          <Link to="/login" className={`${styles.card} ${styles.cardAlt}`}>
            <div className={`${styles.cardIcon} ${styles.cardIconAlt}`}>
              <LogIn size={32} strokeWidth={1.75} />
            </div>
            <h2>Log In</h2>
            <p>Already a member? Sign in to access your project 
               dashboard, events, and community resources.</p>
            <span className={styles.cardAction}>
              Sign In <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Join;
