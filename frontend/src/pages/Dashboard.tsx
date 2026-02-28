import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, BookOpen, Play, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  lmsGetCourses,
  lmsGetMyEnrollments,
  lmsEnroll,
} from '../services/lmsService';
import { LmsCourse, LmsEnrollment } from '../types/lms';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [enrollments, setEnrollments] = useState<LmsEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const fetchData = useCallback(async () => {
    if (isAdmin) {
      setLoading(false);
      return; // Admins don't need course data on this page
    }
    setLoading(true);
    setError(null);
    try {
      const [allCourses, myEnrollments] = await Promise.all([
        lmsGetCourses(),
        lmsGetMyEnrollments(),
      ]);
      setCourses(allCourses);
      setEnrollments(myEnrollments);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load courses';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const enrollment = await lmsEnroll(courseId);
      setEnrollments((prev) => [...prev, enrollment]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enroll';
      alert(msg);
    } finally {
      setEnrollingId(null);
    }
  };

  const enrolledCourseIds = new Set(
    enrollments.map((e) =>
      typeof e.course === 'string' ? e.course : e.course._id
    )
  );

  const enrolledCourses = courses.filter((c) => enrolledCourseIds.has(c._id));
  const availableCourses = courses.filter((c) => !enrolledCourseIds.has(c._id));

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
        {/* Welcome card */}
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
        </div>

        {/* Loading / Error (only show for students) */}
        {!isAdmin && loading && (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={32} />
            <span>Loading courses...</span>
          </div>
        )}

        {!isAdmin && error && !loading && (
          <div className={styles.errorState}>
            <AlertCircle size={24} />
            <span>{error}</span>
            <button onClick={fetchData} className={styles.retryBtn}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        )}

        {/* My Courses (Enrolled) - Students only */}
        {!isAdmin && !loading && !error && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <BookOpen size={20} /> My Courses
            </h3>
            {enrolledCourses.length === 0 ? (
              <p className={styles.emptyText}>
                You haven't enrolled in any courses yet. Explore below!
              </p>
            ) : (
              <div className={styles.courseGrid}>
                {enrolledCourses.map((course) => (
                  <div key={course._id} className={styles.courseCard}>
                    <h4 className={styles.courseTitle}>{course.title}</h4>
                    {course.description && (
                      <p className={styles.courseDesc}>{course.description}</p>
                    )}
                    <Link
                      to={`/learn/${course._id}`}
                      className={styles.continueBtn}
                    >
                      <Play size={16} /> Continue Learning
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Available Courses - Students only */}
        {!isAdmin && !loading && !error && availableCourses.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <BookOpen size={20} /> Available Courses
            </h3>
            <div className={styles.courseGrid}>
              {availableCourses.map((course) => (
                <div key={course._id} className={styles.courseCard}>
                  <h4 className={styles.courseTitle}>{course.title}</h4>
                  {course.description && (
                    <p className={styles.courseDesc}>{course.description}</p>
                  )}
                  <button
                    onClick={() => handleEnroll(course._id)}
                    disabled={enrollingId === course._id}
                    className={styles.enrollBtn}
                  >
                    {enrollingId === course._id ? (
                      <>
                        <Loader2 className={styles.spinner} size={16} />
                        Enrolling...
                      </>
                    ) : (
                      'Enroll Now'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Link to catalog - Students only */}
        {!isAdmin && !loading && !error && (
          <div className={styles.catalogLink}>
            <Link to="/courses">Browse Full Catalog</Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
