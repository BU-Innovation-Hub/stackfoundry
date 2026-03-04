import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Calendar, BookOpen, TrendingUp, ArrowRight, Plus, Activity } from 'lucide-react';
import { DashboardStats } from '../../types/admin';
import { getDashboardStats } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import styles from './Dashboard.module.css';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(data => { setStats(data); setLoading(false); });
  }, []);

  if (loading || !stats) {
    return <Loader text="Loading dashboard..." />;
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCards = [
    { icon: Users, label: 'Total Members', value: stats.totalMembers, sub: `${stats.activeMembers} active`, color: '#3b82f6', bg: '#eff6ff', link: '/admin/members' },
    { icon: FileText, label: 'Blog Posts', value: stats.totalBlogs, sub: `${stats.publishedBlogs} published`, color: '#8b5cf6', bg: '#f5f3ff', link: '/admin/blogs' },
    { icon: Calendar, label: 'Events', value: stats.totalEvents, sub: `${stats.upcomingEvents} upcoming`, color: '#f59e0b', bg: '#fffbeb', link: '/admin/events' },
    { icon: BookOpen, label: 'Courses', value: stats.totalCourses, sub: `${stats.publishedCourses} published`, color: '#D64A2A', bg: '#fef2ee', link: '/admin/courses' },
  ];

  const quickActions = [
    { label: 'New Blog', icon: FileText, link: '/admin/blogs', color: '#8b5cf6' },
    { label: 'New Event', icon: Calendar, link: '/admin/events', color: '#f59e0b' },
    { label: 'New Course', icon: BookOpen, link: '/admin/courses', color: '#D64A2A' },
    { label: 'Members', icon: Users, link: '/admin/members', color: '#3b82f6' },
  ];

  return (
    <div className={styles.page}>
      {/* Hero Header */}
      <div className={styles.heroHeader}>
        <div className={styles.heroLeft}>
          <span className={styles.heroDate}>{dateStr}</span>
          <h1 className={styles.heroTitle}>{greeting}, {user?.name || 'Admin'}!</h1>
          <p className={styles.heroSub}>Here's what's happening with your hub today.</p>
        </div>
        <div className={styles.heroRight}>
          <Activity size={56} strokeWidth={1.2} className={styles.heroIcon} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        {quickActions.map(({ label, icon: Icon, link, color }) => (
          <Link to={link} key={label} className={styles.quickAction}>
            <div className={styles.quickActionIcon} style={{ background: `${color}12`, color }}>
              <Plus size={14} />
              <Icon size={16} />
            </div>
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        {statCards.map(({ icon: Icon, label, value, sub, color, bg, link }) => (
          <Link to={link} key={label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: bg, color }}>
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
            {stats.recentRegistrations.length === 0 ? (
              <p className={styles.emptyText}>No members yet.</p>
            ) : stats.recentRegistrations.map(m => (
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
            {stats.popularCourses.length === 0 ? (
              <p className={styles.emptyText}>No courses yet.</p>
            ) : stats.popularCourses.map(c => (
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
