import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Calendar, BookOpen, TrendingUp, ArrowRight } from 'lucide-react';
import { DashboardStats } from '../../types/admin';
import { getDashboardStats } from '../../services/adminService';
import styles from './Dashboard.module.css';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(data => { setStats(data); setLoading(false); });
  }, []);

  if (loading || !stats) {
    return <div className={styles.loading}>Loading dashboard...</div>;
  }

  const statCards = [
    { icon: Users, label: 'Total Members', value: stats.totalMembers, sub: `${stats.activeMembers} active`, color: '#3b82f6', link: '/admin/members' },
    { icon: FileText, label: 'Blog Posts', value: stats.totalBlogs, sub: `${stats.publishedBlogs} published`, color: '#8b5cf6', link: '/admin/blogs' },
    { icon: Calendar, label: 'Events', value: stats.totalEvents, sub: `${stats.upcomingEvents} upcoming`, color: '#f59e0b', link: '/admin/events' },
    { icon: BookOpen, label: 'Courses', value: stats.totalCourses, sub: `${stats.publishedCourses} published`, color: '#D64A2A', link: '/admin/courses' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <p>Welcome back! Here's an overview of your hub.</p>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        {statCards.map(({ icon: Icon, label, value, sub, color, link }) => (
          <Link to={link} key={label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${color}15`, color }}>
              <Icon size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{value}</span>
              <span className={styles.statLabel}>{label}</span>
              <span className={styles.statSub}>{sub}</span>
            </div>
            <ArrowRight size={16} className={styles.statArrow} />
          </Link>
        ))}
      </div>

      {/* Bottom section */}
      <div className={styles.bottomGrid}>
        {/* Recent Registrations */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3><Users size={18} /> Recent Members</h3>
            <Link to="/admin/members" className={styles.viewAll}>View All</Link>
          </div>
          <div className={styles.memberList}>
            {stats.recentRegistrations.map(m => (
              <div key={m.id} className={styles.memberRow}>
                <div className={styles.memberAvatar}>{m.name.charAt(0)}</div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{m.name} {m.surname}</span>
                  <span className={styles.memberEmail}>{m.email}</span>
                </div>
                <span className={`${styles.badge} ${m.isActive ? styles.badgeGreen : styles.badgeGray}`}>
                  {m.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Courses */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3><TrendingUp size={18} /> Popular Courses</h3>
            <Link to="/admin/courses" className={styles.viewAll}>View All</Link>
          </div>
          <div className={styles.courseList}>
            {stats.popularCourses.map(c => (
              <div key={c.id} className={styles.courseRow}>
                <div className={styles.courseInfo}>
                  <span className={styles.courseName}>{c.title}</span>
                  <span className={styles.courseMeta}>
                    {c.language}{c.framework ? ` · ${c.framework}` : ''} · {c.level}
                  </span>
                </div>
                <div className={styles.courseStats}>
                  <span>{c.enrolledCount} enrolled</span>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${c.completionRate}%` }} />
                  </div>
                  <span className={styles.progressLabel}>{c.completionRate}% avg completion</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
