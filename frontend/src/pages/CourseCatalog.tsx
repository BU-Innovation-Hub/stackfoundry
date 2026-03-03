/**
 * Course Catalog Page
 * Lists all available courses for students to browse and enroll
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { lmsGetCourses, lmsGetMyEnrollments, lmsEnroll } from '../services/lmsService';
import { LmsCourse, LmsEnrollment } from '../types/lms';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import styles from './CourseCatalog.module.css';

const CourseCatalog: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [enrollments, setEnrollments] = useState<LmsEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesData, enrollData] = await Promise.all([
        lmsGetCourses(),
        isAuthenticated ? lmsGetMyEnrollments().catch(() => []) : Promise.resolve([]),
      ]);
      setCourses(coursesData);
      setEnrollments(enrollData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const isEnrolled = (courseId: string) =>
    enrollments.some(e => {
      const cId = typeof e.course === 'string' ? e.course : e.course._id;
      return cId === courseId;
    });

  const handleEnroll = async (courseId: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setEnrolling(courseId);
    try {
      const enrollment = await lmsEnroll(courseId);
      setEnrollments(prev => [...prev, enrollment]);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Enrollment failed');
    }
    setEnrolling(null);
  };

  const handleView = (courseId: string) => {
    navigate(`/learn/${courseId}`);
  };

  if (loading) return <Loader text="Loading courses..." />;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Course Catalog</h1>
        <p>Browse and enroll in courses to start learning</p>
      </div>

      <div className={styles.grid}>
        {courses.map(course => {
          const enrolled = isEnrolled(course._id);
          return (
            <div key={course._id} className={styles.card}>
              <div className={styles.cardIcon}>
                <BookOpen size={32} />
              </div>
              <h3 className={styles.cardTitle}>{course.title}</h3>
              {course.description && (
                <p className={styles.cardDesc}>{course.description}</p>
              )}
              <div className={styles.cardFooter}>
                {enrolled ? (
                  <button className={styles.viewBtn} onClick={() => handleView(course._id)}>
                    Continue Learning <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    className={styles.enrollBtn}
                    onClick={() => handleEnroll(course._id)}
                    disabled={enrolling === course._id}
                  >
                    {enrolling === course._id ? 'Enrolling…' : 'Enroll Now'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {courses.length === 0 && (
          <p className={styles.empty}>No courses available yet. Check back soon!</p>
        )}
      </div>
    </div>
  );
};

export default CourseCatalog;
