import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
   Shield, KeyRound, Loader2, AlertCircle, RefreshCw,
   BookOpen, Calendar, FileText, ArrowRight, Clock, Tag,
   Home, ChevronLeft, MapPin, User, Eye, ExternalLink, CheckCircle, Layers, Lightbulb,
} from 'lucide-react';
import { lmsGetCourses, lmsGetMyEnrollments, lmsEnroll, lmsGetLevels, lmsGetMaterials, lmsGetProgress } from '../services/lmsService';
import { LmsCourse, LmsEnrollment, LmsProgress } from '../types/lms';
import { api as apiClient } from '../services/apiClient';
import { IBlog } from '../types/blog';
import { getEvents, getEventBySlug } from '../services/eventService';
import { IEvent } from '../types/event';
import styles from './Dashboard.module.css';

type View = 'home' | 'courses' | 'blogs' | 'blog-detail' | 'events' | 'event-detail';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation — honour incoming state (e.g. back from CourseLearn)
  const initialView = (location.state as { view?: View } | null)?.view || 'home';
  const [activeView, setActiveView] = useState<View>(initialView);

  // Data
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [enrollments, setEnrollments] = useState<LmsEnrollment[]>([]);
  const [allBlogs, setAllBlogs] = useState<IBlog[]>([]);
  const [allEvents, setAllEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Detail views
  const [selectedBlog, setSelectedBlog] = useState<IBlog | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Blog filter
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategory, setBlogCategory] = useState('all');

  // Event filter
  const [eventSearch, setEventSearch] = useState('');
  const [eventType, setEventType] = useState('all');

  // Course stats: materialCount + progress %
  const [courseStats, setCourseStats] = useState<Record<string, { total: number; completed: number; percent: number }>>({});
  const [courseTab, setCourseTab] = useState<'learning' | 'catalog'>('learning');

  const isAdmin = user?.role === 'system_admin' || user?.role === 'innovation_hub_admin';

  /* -------- Fetch all data -------- */
  const fetchData = useCallback(async () => {
    if (isAdmin) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [coursesData, enrollmentsData, blogsRes, eventsRes] = await Promise.all([
        lmsGetCourses(),
        lmsGetMyEnrollments(),
        apiClient.get('/blogs').then(r => r.data.data as IBlog[]).catch(() => [] as IBlog[]),
        getEvents({ limit: 50 }).then(r => r.data).catch(() => [] as IEvent[]),
      ]);
      setCourses(coursesData);
      setEnrollments(enrollmentsData);
      setAllBlogs(blogsRes);
      setAllEvents(eventsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const enrolledCourseIds = new Set(
    enrollments.map(e => (typeof e.course === 'string' ? e.course : e.course._id))
  );
  const enrolledCourses = courses.filter(c => enrolledCourseIds.has(c._id));
  const availableCourses = courses.filter(c => !enrolledCourseIds.has(c._id));

  /* -------- Fetch course stats (material counts + progress) -------- */
  useEffect(() => {
    if (enrolledCourses.length === 0) return;
    let cancelled = false;

    const loadStats = async () => {
      const stats: Record<string, { total: number; completed: number; percent: number }> = {};

      // Process courses sequentially to avoid 429 rate-limit bursts
      for (const course of enrolledCourses) {
        if (cancelled) return;
        try {
          const levels = await lmsGetLevels(course._id);
          // Fetch materials for all levels of this course (limited blast radius)
          const materialArrays = await Promise.all(levels.map(l => lmsGetMaterials(l._id)));
          const allMats = materialArrays.flat();
          const progressArr: LmsProgress[] = await lmsGetProgress(course._id);
          const completedSet = new Set(
            progressArr.filter(p => p.completed).map(p => typeof p.material === 'string' ? p.material : p.material._id)
          );
          const total = allMats.length;
          const completed = allMats.filter(m => completedSet.has(m._id)).length;
          stats[course._id] = { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
        } catch {
          stats[course._id] = { total: 0, completed: 0, percent: 0 };
        }
      }

      if (!cancelled) setCourseStats(stats);
    };

    loadStats();
    return () => { cancelled = true; };
    // Only re-run when the list of enrolled course IDs actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrolledCourses.map(c => c._id).join(',')]);

  /* -------- Helpers -------- */
  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const enrollment = await lmsEnroll(courseId);
      setEnrollments(prev => [...prev, enrollment]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setEnrollingId(null);
    }
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { workshop: '#4f46e5', hackathon: '#D64A2A', meetup: '#8b5cf6', conference: '#0d9488' };
    return colors[type] || '#888';
  };

  /* -------- Blog detail -------- */
  const openBlog = async (slug: string) => {
    setDetailLoading(true);
    setActiveView('blog-detail');
    try {
      const response = await apiClient.get(`/blogs/slug/${slug}`);
      setSelectedBlog(response.data.data);
    } catch {
      setSelectedBlog(null);
    } finally {
      setDetailLoading(false);
    }
  };

  /* -------- Event detail -------- */
  const openEvent = async (slug: string) => {
    setDetailLoading(true);
    setActiveView('event-detail');
    try {
      const data = await getEventBySlug(slug);
      setSelectedEvent(data);
    } catch {
      setSelectedEvent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  /* -------- Filtered lists -------- */
  const filteredBlogs = useMemo(() => {
    let result = allBlogs;
    if (blogCategory !== 'all') result = result.filter(b => b.category === blogCategory);
    if (blogSearch.trim()) {
      const q = blogSearch.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || b.excerpt.toLowerCase().includes(q));
    }
    return result;
  }, [allBlogs, blogCategory, blogSearch]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents.filter(e => new Date(e.eventDate) >= now);
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    let result = allEvents;
    if (eventType !== 'all') result = result.filter(e => e.type === eventType);
    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    return result;
  }, [allEvents, eventType, eventSearch]);

  const blogCategories = ['all', 'technology', 'entrepreneurship', 'events', 'tutorials', 'news', 'community'];
  const eventTypes = ['all', 'workshop', 'hackathon', 'meetup', 'conference'];

  /* -------- Sidebar nav items -------- */
  const navItems: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <Home size={18} /> },
    { key: 'courses', label: 'My Courses', icon: <BookOpen size={18} /> },
    { key: 'blogs', label: 'Blogs', icon: <FileText size={18} /> },
    { key: 'events', label: 'Events', icon: <Calendar size={18} /> },
  ];

  /* ======================================================================== */
  /*  RENDER                                                                  */
  /* ======================================================================== */
  return (
    <div className={styles.page}>
      {/* Top header */}
      <header className={styles.header}>
        <h1 className={styles.logo}>StackFoundry</h1>
        <div className={styles.userSection}>
          <span className={styles.greeting}>Hi, {user?.name} {user?.surname}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>Sign Out</button>
        </div>
      </header>

      <div className={styles.shell}>
        {/* ===== SIDEBAR ===== */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarProfile}>
            <div className={styles.avatar}>{user?.name?.charAt(0)}{user?.surname?.charAt(0)}</div>
            <div>
              <p className={styles.profileName}>{user?.name} {user?.surname}</p>
              <p className={styles.profileRole}>{isAdmin ? 'Administrator' : `ID: ${user?.studentId || 'Not provided'}`}</p>
            </div>
          </div>

          <nav className={styles.nav}>
            {navItems.map(item => (
              <button
                key={item.key}
                className={`${styles.navItem} ${activeView === item.key || (activeView === 'blog-detail' && item.key === 'blogs') || (activeView === 'event-detail' && item.key === 'events') ? styles.navActive : ''}`}
                onClick={() => setActiveView(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            {user?.role === 'student' && <Link to="/innovation" className={styles.navItem}><Lightbulb size={18} /><span>Innovation Workspace</span></Link>}
          </nav>

          <div className={styles.sidebarFooter}>
            {isAdmin && (
              <Link to="/admin" className={styles.sidebarLink}><Shield size={16} /> Admin Panel</Link>
            )}
            <Link to="/profile" className={styles.sidebarLink}><User size={16} /> My Profile</Link>
            <Link to="/change-password" className={styles.sidebarLink}><KeyRound size={16} /> Change Password</Link>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className={styles.main}>
          {/* Loading / Error */}
          {!isAdmin && loading && (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spinner} size={32} />
              <span>Loading your dashboard...</span>
            </div>
          )}
          {!isAdmin && error && !loading && (
            <div className={styles.errorState}>
              <AlertCircle size={24} />
              <span>{error}</span>
              <button onClick={fetchData} className={styles.retryBtn}><RefreshCw size={16} /> Retry</button>
            </div>
          )}

          {!isAdmin && !loading && !error && (
            <>
              {/* ==================== HOME VIEW ==================== */}
              {activeView === 'home' && (
                <>
                  <div className={styles.pageTitle}>
                    <h2>Welcome back, {user?.name}!</h2>
                    <p className={styles.welcomeSub}>{user?.email}</p>
                  </div>

                  {/* Summary cards */}
                  <div className={styles.statRow}>
                    <div className={styles.statCard} onClick={() => setActiveView('courses')}>
                      <BookOpen size={22} className={styles.statIcon} />
                      <div>
                        <span className={styles.statNum}>{enrolledCourses.length}</span>
                        <span className={styles.statLabel}>Enrolled Courses</span>
                      </div>
                    </div>
                    <div className={styles.statCard} onClick={() => setActiveView('blogs')}>
                      <FileText size={22} className={styles.statIcon} />
                      <div>
                        <span className={styles.statNum}>{allBlogs.length}</span>
                        <span className={styles.statLabel}>Blog Posts</span>
                      </div>
                    </div>
                    <div className={styles.statCard} onClick={() => setActiveView('events')}>
                      <Calendar size={22} className={styles.statIcon} />
                      <div>
                        <span className={styles.statNum}>{upcomingEvents.length}</span>
                        <span className={styles.statLabel}>Upcoming Events</span>
                      </div>
                    </div>
                  </div>

                  {/* Continue Learning preview */}
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionTitle}><BookOpen size={18} /> Continue Learning</h3>
                      <button className={styles.seeAll} onClick={() => setActiveView('courses')}>View All <ArrowRight size={14} /></button>
                    </div>
                    {enrolledCourses.length === 0 ? (
                      <p className={styles.emptyText}>No courses yet. Explore available courses!</p>
                    ) : (
                      <div className={styles.clGrid}>
                        {enrolledCourses.slice(0, 2).map(course => {
                          const stat = courseStats[course._id];
                          return (
                            <div key={course._id} className={styles.clCard}>
                              <div className={styles.clThumb}>
                                {course.coverImage ? (
                                  <img src={course.coverImage} alt={course.title} className={styles.clThumbImg} />
                                ) : (
                                  <BookOpen size={32} />
                                )}
                                {stat && (
                                  <span className={styles.clBadge}>
                                    <Layers size={11} /> {stat.total} Materials {stat.completed > 0 && <CheckCircle size={11} />}
                                  </span>
                                )}
                              </div>
                              <div className={styles.clInfo}>
                                <span className={styles.clLabel}><BookOpen size={12} /> Course</span>
                                <h4 className={styles.clTitle}>{course.title}</h4>
                                <div className={styles.clProgress}>
                                  <span>Progress: <strong>{stat?.percent ?? 0}%</strong></span>
                                  <div className={styles.clBarTrack}>
                                    <div className={styles.clBarFill} style={{ width: `${stat?.percent ?? 0}%` }} />
                                  </div>
                                </div>
                                <Link to={`/learn/${course._id}`} className={styles.clContinueBtn}>Continue</Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Latest blogs preview */}
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionTitle}><FileText size={18} /> Latest Blogs</h3>
                      <button className={styles.seeAll} onClick={() => setActiveView('blogs')}>View All <ArrowRight size={14} /></button>
                    </div>
                    {allBlogs.length === 0 ? (
                      <p className={styles.emptyText}>No blogs published yet.</p>
                    ) : (
                      <div className={styles.blogGrid}>
                        {allBlogs.slice(0, 3).map(blog => (
                          <div key={blog._id} className={styles.blogCard} onClick={() => openBlog(blog.slug)}>
                            {blog.featuredImage && (
                              <div className={styles.blogImage}><img src={blog.featuredImage} alt={blog.title} /></div>
                            )}
                            <div className={styles.blogCardBody}>
                              <span className={styles.blogCategory}>{blog.category}</span>
                              <h4>{blog.title}</h4>
                              <p>{blog.excerpt}</p>
                              <div className={styles.blogMeta}>
                                <span><Clock size={12} /> {blog.readTime}</span>
                                <span>{formatDate(blog.publishedAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Upcoming events preview */}
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionTitle}><Calendar size={18} /> Upcoming Events</h3>
                      <button className={styles.seeAll} onClick={() => setActiveView('events')}>View All <ArrowRight size={14} /></button>
                    </div>
                    {upcomingEvents.length === 0 ? (
                      <p className={styles.emptyText}>No upcoming events.</p>
                    ) : (
                      <div className={styles.eventGrid}>
                        {upcomingEvents.slice(0, 3).map(event => (
                          <div key={event._id} className={styles.eventCard} onClick={() => openEvent(event.slug)}>
                            <div className={styles.eventDate}>
                              <span className={styles.eventDay}>{new Date(event.eventDate).getDate()}</span>
                              <span className={styles.eventMonth}>{new Date(event.eventDate).toLocaleString(undefined, { month: 'short' })}</span>
                            </div>
                            <div className={styles.eventCardBody}>
                              <div className={styles.eventType} style={{ color: getTypeColor(event.type) }}><Tag size={12} /> {event.type}</div>
                              <h4>{event.title}</h4>
                              <p className={styles.eventInfo}>{event.date} &middot; {event.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* ==================== COURSES VIEW ==================== */}
              {activeView === 'courses' && (
                <>
                  {/* Tabs: My Learning / Catalog */}
                  <div className={styles.courseTabs}>
                    <button className={`${styles.courseTabBtn} ${courseTab === 'learning' ? styles.courseTabActive : ''}`} onClick={() => setCourseTab('learning')}>
                      My Learning
                    </button>
                    <button className={`${styles.courseTabBtn} ${courseTab === 'catalog' ? styles.courseTabActive : ''}`} onClick={() => setCourseTab('catalog')}>
                      Catalog <span className={styles.courseTabCount}>{availableCourses.length}</span>
                    </button>
                  </div>

                  {/* My Learning tab */}
                  {courseTab === 'learning' && (
                    <>
                      <h3 className={styles.clSectionTitle}>Continue Learning</h3>

                      {enrolledCourses.length === 0 ? (
                        <div className={styles.emptyCard}>
                          <BookOpen size={40} strokeWidth={1.5} />
                          <p>You haven't enrolled in any courses yet.</p>
                          <button className={styles.enrollBtn} onClick={() => setCourseTab('catalog')}>Browse Catalog</button>
                        </div>
                      ) : (
                        <div className={styles.clGrid}>
                          {enrolledCourses.map(course => {
                            const stat = courseStats[course._id];
                            return (
                              <div key={course._id} className={styles.clCard}>
                                <div className={styles.clThumb}>
                                  {course.coverImage ? (
                                    <img src={course.coverImage} alt={course.title} className={styles.clThumbImg} />
                                  ) : (
                                    <BookOpen size={32} />
                                  )}
                                  {stat && (
                                    <span className={styles.clBadge}>
                                      <Layers size={11} /> {stat.total} Materials {stat.completed > 0 && <CheckCircle size={11} />}
                                    </span>
                                  )}
                                </div>
                                <div className={styles.clInfo}>
                                  <span className={styles.clLabel}><BookOpen size={12} /> Course</span>
                                  <h4 className={styles.clTitle}>{course.title}</h4>
                                  <div className={styles.clProgress}>
                                    <span>Progress: <strong>{stat?.percent ?? 0}%</strong></span>
                                    <div className={styles.clBarTrack}>
                                      <div className={styles.clBarFill} style={{ width: `${stat?.percent ?? 0}%` }} />
                                    </div>
                                  </div>
                                  <Link to={`/learn/${course._id}`} className={styles.clContinueBtn}>Continue</Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* All Materials count */}
                      {enrolledCourses.length > 0 && (
                        <div className={styles.allMaterialsRow}>
                          <span className={styles.allMaterialsLabel}>
                            All Materials <strong>{Object.values(courseStats).reduce((s, c) => s + c.total, 0)}</strong>
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Catalog tab */}
                  {courseTab === 'catalog' && (
                    <>
                      <h3 className={styles.clSectionTitle}>Available Courses</h3>
                      {availableCourses.length === 0 ? (
                        <p className={styles.emptyText}>No additional courses available right now.</p>
                      ) : (
                        <div className={styles.clGrid}>
                          {availableCourses.map(course => (
                            <div key={course._id} className={styles.clCard}>
                              <div className={styles.clThumb} style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
                                <BookOpen size={32} style={{ color: '#16a34a' }} />
                              </div>
                              <div className={styles.clInfo}>
                                <span className={styles.clLabel}><BookOpen size={12} /> Course</span>
                                <h4 className={styles.clTitle}>{course.title}</h4>
                                {course.description && <p className={styles.clDesc}>{course.description}</p>}
                                <button onClick={() => handleEnroll(course._id)} disabled={enrollingId === course._id} className={styles.clContinueBtn}>
                                  {enrollingId === course._id ? <><Loader2 className={styles.spinner} size={14} /> Enrolling...</> : 'Enroll Now'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ==================== BLOGS LIST VIEW ==================== */}
              {activeView === 'blogs' && (
                <>
                  <div className={styles.pageTitle}>
                    <h2>Blog Posts</h2>
                    <p className={styles.welcomeSub}>{allBlogs.length} articles available</p>
                  </div>

                  {/* Filters */}
                  <div className={styles.filterBar}>
                    <input
                      className={styles.searchInput}
                      placeholder="Search posts..."
                      value={blogSearch}
                      onChange={e => setBlogSearch(e.target.value)}
                    />
                    <div className={styles.filterTabs}>
                      {blogCategories.map(cat => (
                        <button
                          key={cat}
                          className={`${styles.filterTab} ${blogCategory === cat ? styles.filterActive : ''}`}
                          onClick={() => setBlogCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredBlogs.length === 0 ? (
                    <p className={styles.emptyText}>No posts match your search.</p>
                  ) : (
                    <div className={styles.blogGrid}>
                      {filteredBlogs.map(blog => (
                        <div key={blog._id} className={styles.blogCard} onClick={() => openBlog(blog.slug)}>
                          {blog.featuredImage && (
                            <div className={styles.blogImage}><img src={blog.featuredImage} alt={blog.title} /></div>
                          )}
                          <div className={styles.blogCardBody}>
                            <span className={styles.blogCategory}>{blog.category}</span>
                            <h4>{blog.title}</h4>
                            <p>{blog.excerpt}</p>
                            <div className={styles.blogMeta}>
                              <span><Clock size={12} /> {blog.readTime}</span>
                              <span>{formatDate(blog.publishedAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ==================== BLOG DETAIL VIEW ==================== */}
              {activeView === 'blog-detail' && (
                <>
                  <button className={styles.backBtn} onClick={() => setActiveView('blogs')}>
                    <ChevronLeft size={18} /> Back to Blogs
                  </button>

                  {detailLoading ? (
                    <div className={styles.loadingState}><Loader2 className={styles.spinner} size={28} /> Loading article...</div>
                  ) : selectedBlog ? (
                    <article className={styles.articleView}>
                      <span className={styles.blogCategory}>{selectedBlog.category}</span>
                      <h1 className={styles.articleTitle}>{selectedBlog.title}</h1>
                      <div className={styles.articleMeta}>
                        <span><User size={14} /> {selectedBlog.authorName}</span>
                        <span><Clock size={14} /> {selectedBlog.readTime}</span>
                        <span><Calendar size={14} /> {formatDate(selectedBlog.publishedAt || selectedBlog.createdAt)}</span>
                        <span><Eye size={14} /> {selectedBlog.views} views</span>
                      </div>
                      {selectedBlog.featuredImage && (
                        <div className={styles.articleImage}>
                          <img src={selectedBlog.featuredImage} alt={selectedBlog.title} />
                        </div>
                      )}
                      <div className={styles.articleContent} dangerouslySetInnerHTML={{ __html: selectedBlog.content }} />
                      {selectedBlog.tags.length > 0 && (
                        <div className={styles.articleTags}>
                          {selectedBlog.tags.map(tag => <span key={tag} className={styles.articleTag}>#{tag}</span>)}
                        </div>
                      )}
                    </article>
                  ) : (
                    <p className={styles.emptyText}>Blog post not found.</p>
                  )}
                </>
              )}

              {/* ==================== EVENTS LIST VIEW ==================== */}
              {activeView === 'events' && (
                <>
                  <div className={styles.pageTitle}>
                    <h2>Events</h2>
                    <p className={styles.welcomeSub}>{allEvents.length} events &middot; {upcomingEvents.length} upcoming</p>
                  </div>

                  {/* Filters */}
                  <div className={styles.filterBar}>
                    <input
                      className={styles.searchInput}
                      placeholder="Search events..."
                      value={eventSearch}
                      onChange={e => setEventSearch(e.target.value)}
                    />
                    <div className={styles.filterTabs}>
                      {eventTypes.map(t => (
                        <button
                          key={t}
                          className={`${styles.filterTab} ${eventType === t ? styles.filterActive : ''}`}
                          onClick={() => setEventType(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <p className={styles.emptyText}>No events match your search.</p>
                  ) : (
                    <div className={styles.eventGrid}>
                      {filteredEvents.map(event => {
                        const past = new Date(event.eventDate) < new Date();
                        return (
                          <div key={event._id} className={`${styles.eventCard} ${past ? styles.pastCard : ''}`} onClick={() => openEvent(event.slug)}>
                            <div className={styles.eventDate}>
                              <span className={styles.eventDay}>{new Date(event.eventDate).getDate()}</span>
                              <span className={styles.eventMonth}>{new Date(event.eventDate).toLocaleString(undefined, { month: 'short' })}</span>
                            </div>
                            <div className={styles.eventCardBody}>
                              <div className={styles.eventType} style={{ color: getTypeColor(event.type) }}><Tag size={12} /> {event.type}</div>
                              <h4>{event.title}</h4>
                              <p className={styles.eventInfo}>{event.date} &middot; {event.time}</p>
                              {event.location && <p className={styles.eventLocation}><MapPin size={11} /> {event.location}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ==================== EVENT DETAIL VIEW ==================== */}
              {activeView === 'event-detail' && (
                <>
                  <button className={styles.backBtn} onClick={() => setActiveView('events')}>
                    <ChevronLeft size={18} /> Back to Events
                  </button>

                  {detailLoading ? (
                    <div className={styles.loadingState}><Loader2 className={styles.spinner} size={28} /> Loading event...</div>
                  ) : selectedEvent ? (
                    <div className={styles.eventDetailView}>
                      <div className={styles.eventType} style={{ color: getTypeColor(selectedEvent.type), fontSize: '0.75rem' }}>
                        <Tag size={13} /> {selectedEvent.type}
                      </div>
                      <h1 className={styles.articleTitle}>{selectedEvent.title}</h1>

                      <div className={styles.articleMeta}>
                        <span><Calendar size={14} /> {selectedEvent.date}</span>
                        <span><Clock size={14} /> {selectedEvent.time}</span>
                        {selectedEvent.location && <span><MapPin size={14} /> {selectedEvent.location}</span>}
                        <span><Eye size={14} /> {selectedEvent.views} views</span>
                      </div>

                      {selectedEvent.image && (
                        <div className={styles.articleImage}>
                          <img src={selectedEvent.image} alt={selectedEvent.title} />
                        </div>
                      )}

                      <div className={styles.eventDetailBody}>
                        <div className={styles.detailSection}>
                          <h3>About This Event</h3>
                          <p>{selectedEvent.description}</p>
                        </div>

                        <div className={styles.detailCard}>
                          <h4>Event Details</h4>
                          <div className={styles.detailGrid}>
                            <div><span className={styles.detailLabel}>Date</span><span>{selectedEvent.date}</span></div>
                            <div><span className={styles.detailLabel}>Time</span><span>{selectedEvent.time}</span></div>
                            <div><span className={styles.detailLabel}>Type</span><span style={{ textTransform: 'capitalize' }}>{selectedEvent.type}</span></div>
                            {selectedEvent.location && <div><span className={styles.detailLabel}>Location</span><span>{selectedEvent.location}</span></div>}
                            <div><span className={styles.detailLabel}>Organized by</span><span>{selectedEvent.authorName}</span></div>
                          </div>
                        </div>

                        {selectedEvent.registrationLink && new Date(selectedEvent.eventDate) >= new Date() && (
                          <a href={selectedEvent.registrationLink} target="_blank" rel="noopener noreferrer" className={styles.registerEventBtn}>
                            Register Now <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.emptyText}>Event not found.</p>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
