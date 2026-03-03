import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, KeyRound, Loader2, AlertCircle, RefreshCw,
  BookOpen, Play, Calendar, FileText, ArrowRight, Clock, Tag,
  Home, ChevronLeft, MapPin, User, Eye, ExternalLink,
} from 'lucide-react';
import { lmsGetCourses, lmsGetMyEnrollments, lmsEnroll } from '../services/lmsService';
import { LmsCourse, LmsEnrollment } from '../types/lms';
import { api as apiClient } from '../services/apiClient';
import { IBlog } from '../types/blog';
import { getEvents, getEventBySlug } from '../services/eventService';
import { IEvent } from '../types/event';
import styles from './Dashboard.module.css';

type View = 'home' | 'courses' | 'blogs' | 'blog-detail' | 'events' | 'event-detail';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation
  const [activeView, setActiveView] = useState<View>('home');

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

  const isAdmin = user?.role === 'admin';

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

  const enrolledCourseIds = new Set(
    enrollments.map(e => (typeof e.course === 'string' ? e.course : e.course._id))
  );
  const enrolledCourses = courses.filter(c => enrolledCourseIds.has(c._id));
  const availableCourses = courses.filter(c => !enrolledCourseIds.has(c._id));

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
              <p className={styles.profileRole}>{user?.role === 'admin' ? 'Administrator' : `ID: ${user?.studentId}`}</p>
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
          </nav>

          <div className={styles.sidebarFooter}>
            {isAdmin && (
              <Link to="/admin" className={styles.sidebarLink}><Shield size={16} /> Admin Panel</Link>
            )}
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

                  {/* My courses preview */}
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionTitle}><BookOpen size={18} /> My Courses</h3>
                      <button className={styles.seeAll} onClick={() => setActiveView('courses')}>View All <ArrowRight size={14} /></button>
                    </div>
                    {enrolledCourses.length === 0 ? (
                      <p className={styles.emptyText}>No courses yet. Explore available courses!</p>
                    ) : (
                      <div className={styles.courseGrid}>
                        {enrolledCourses.slice(0, 3).map(course => (
                          <div key={course._id} className={styles.courseCard}>
                            <div className={styles.courseCardIcon}><BookOpen size={20} /></div>
                            <div className={styles.courseCardBody}>
                              <h4>{course.title}</h4>
                              {course.description && <p>{course.description}</p>}
                            </div>
                            <Link to={`/learn/${course._id}`} className={styles.continueBtn}>
                              <Play size={14} /> Continue
                            </Link>
                          </div>
                        ))}
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
                  <div className={styles.pageTitle}>
                    <h2>My Courses</h2>
                    <p className={styles.welcomeSub}>Continue learning or enroll in something new</p>
                  </div>

                  {enrolledCourses.length === 0 ? (
                    <div className={styles.emptyCard}>
                      <BookOpen size={40} strokeWidth={1.5} />
                      <p>You haven't enrolled in any courses yet.</p>
                    </div>
                  ) : (
                    <div className={styles.courseGrid}>
                      {enrolledCourses.map(course => (
                        <div key={course._id} className={styles.courseCard}>
                          <div className={styles.courseCardIcon}><BookOpen size={20} /></div>
                          <div className={styles.courseCardBody}>
                            <h4>{course.title}</h4>
                            {course.description && <p>{course.description}</p>}
                          </div>
                          <Link to={`/learn/${course._id}`} className={styles.continueBtn}>
                            <Play size={14} /> Continue Learning
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  {availableCourses.length > 0 && (
                    <div className={styles.availableSection}>
                      <h3 className={styles.sectionTitle}>Available to Enroll</h3>
                      <div className={styles.courseGrid}>
                        {availableCourses.map(course => (
                          <div key={course._id} className={styles.courseCard}>
                            <div className={styles.courseCardIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}><BookOpen size={20} /></div>
                            <div className={styles.courseCardBody}>
                              <h4>{course.title}</h4>
                              {course.description && <p>{course.description}</p>}
                            </div>
                            <button onClick={() => handleEnroll(course._id)} disabled={enrollingId === course._id} className={styles.enrollBtn}>
                              {enrollingId === course._id ? <><Loader2 className={styles.spinner} size={14} /> Enrolling...</> : 'Enroll Now'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
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
