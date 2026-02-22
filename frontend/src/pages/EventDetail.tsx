import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { getEventBySlug } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import { IEvent, EventType } from '../types/event';
import Loader from '../components/common/Loader';
import styles from './EventDetail.module.css';

const EventDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [event, setEvent] = useState<IEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const hasFetched = useRef(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchEvent = async () => {
            try {
                const data = await getEventBySlug(slug!);
                setEvent(data);
            } catch (error: any) {
                if (error.response?.status === 404) {
                    setNotFound(true);
                }
                console.error('Error fetching event:', error);
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchEvent();
    }, [slug]);

    const getTypeColor = (type: EventType) => {
        const colors: Record<EventType, string> = {
            workshop: '#00d4ff',
            hackathon: '#ff00ff',
            meetup: '#8b5cf6',
            conference: '#00ff88',
        };
        return colors[type];
    };

    const isPastEvent = (eventDate: string) => {
        return new Date(eventDate) < new Date();
    };

    const handleRegisterClick = () => {
        if (!isAuthenticated) {
            setShowLoginPrompt(true);
            return;
        }

        // If event has an external registration link, open it
        if (event?.registrationLink) {
            window.open(event.registrationLink, '_blank', 'noopener,noreferrer');
            return;
        }

        // Internal registration confirmation
        setRegistered(true);
    };

    const handleLoginRedirect = () => {
        // Store the current URL so we can redirect back after login
        sessionStorage.setItem('redirectAfterLogin', `/events/${slug}`);
        navigate('/login');
    };

    const handleRegisterRedirect = () => {
        sessionStorage.setItem('redirectAfterLogin', `/events/${slug}`);
        navigate('/register');
    };

    // Loading state
    if (loading) {
        return (
            <div className={styles.page}>
                <Navbar />
                <Loader text="Loading event details..." size="large" />
                <Footer />
            </div>
        );
    }

    // Not found
    if (notFound || !event) {
        return (
            <div className={styles.page}>
                <Navbar />
                <div className={styles.errorContainer}>
                    <h2>Event Not Found</h2>
                    <p>The event you're looking for doesn't exist or may have been removed.</p>
                    <Link to="/events" className={styles.errorLink}>
                        Browse All Events
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    const past = isPastEvent(event.eventDate);

    return (
        <div className={styles.page}>
            <Navbar />

            {/* Hero */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <Link to="/events" className={styles.backLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Events
                    </Link>

                    <span
                        className={styles.typeBadge}
                        style={{ backgroundColor: getTypeColor(event.type) }}
                    >
                        {event.type}
                    </span>
                    <h1 className={styles.title}>{event.title}</h1>

                    <div className={styles.meta}>
                        <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {event.date}
                        </span>
                        <span className={styles.metaDivider} />
                        <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {event.time}
                        </span>
                        {event.location && (
                            <>
                                <span className={styles.metaDivider} />
                                <span className={styles.metaItem}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {event.location}
                                </span>
                            </>
                        )}
                        <span className={styles.metaDivider} />
                        <span className={styles.metaItem}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            {event.views} views
                        </span>
                    </div>
                </div>
            </section>

            {/* Event Image */}
            {event.image && (
                <div className={styles.featuredImage}>
                    <img src={event.image} alt={event.title} />
                </div>
            )}

            {/* Content Area */}
            <div className={styles.contentWrapper}>
                <div className={styles.contentMain}>
                    {/* Description */}
                    <div className={styles.descriptionSection}>
                        <h2 className={styles.sectionTitle}>About This Event</h2>
                        <p className={styles.description}>{event.description}</p>
                    </div>

                    {/* Event Details Card */}
                    <div className={styles.detailsCard}>
                        <h3 className={styles.detailsTitle}>Event Details</h3>
                        <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Date</span>
                                <span className={styles.detailValue}>{event.date}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Time</span>
                                <span className={styles.detailValue}>{event.time}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Type</span>
                                <span className={styles.detailValue} style={{ textTransform: 'capitalize' }}>
                                    {event.type}
                                </span>
                            </div>
                            {event.location && (
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Location</span>
                                    <span className={styles.detailValue}>{event.location}</span>
                                </div>
                            )}
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Organized by</span>
                                <span className={styles.detailValue}>{event.authorName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar - Registration */}
                <aside className={styles.sidebar}>
                    <div className={styles.registerCard}>
                        {past ? (
                            /* Past event */
                            <div className={styles.pastEvent}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <h3>This Event Has Ended</h3>
                                <p>This event took place on {event.date}. Stay tuned for future events!</p>
                                <Link to="/events" className={styles.browseEventsBtn}>
                                    Browse Upcoming Events
                                </Link>
                            </div>
                        ) : registered ? (
                            /* Registration success */
                            <div className={styles.registrationSuccess}>
                                <div className={styles.successIcon}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                </div>
                                <h3>You're Registered!</h3>
                                <p>
                                    Hi {user?.name}, you've successfully registered for <strong>{event.title}</strong>.
                                </p>
                                <div className={styles.confirmDetails}>
                                    <div className={styles.confirmItem}>
                                        <span>Date:</span>
                                        <span>{event.date}</span>
                                    </div>
                                    <div className={styles.confirmItem}>
                                        <span>Time:</span>
                                        <span>{event.time}</span>
                                    </div>
                                    {event.location && (
                                        <div className={styles.confirmItem}>
                                            <span>Location:</span>
                                            <span>{event.location}</span>
                                        </div>
                                    )}
                                </div>
                                <p className={styles.confirmNote}>
                                    We'll send event updates to your registered email.
                                </p>
                            </div>
                        ) : showLoginPrompt ? (
                            /* Login prompt for unauthenticated users */
                            <div className={styles.loginPrompt}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <h3>Sign In to Register</h3>
                                <p>You need an account to register for events. It only takes a minute!</p>
                                <button
                                    className={styles.loginBtn}
                                    onClick={handleLoginRedirect}
                                >
                                    Sign In
                                </button>
                                <button
                                    className={styles.createAccountBtn}
                                    onClick={handleRegisterRedirect}
                                >
                                    Create Account
                                </button>
                                <button
                                    className={styles.dismissBtn}
                                    onClick={() => setShowLoginPrompt(false)}
                                >
                                    Maybe later
                                </button>
                            </div>
                        ) : (
                            /* Default registration CTA */
                            <div className={styles.registerCta}>
                                <h3>Ready to Join?</h3>
                                <p>Secure your spot for this {event.type}. Don't miss out!</p>
                                <button
                                    className={styles.registerBtn}
                                    onClick={handleRegisterClick}
                                >
                                    Register Now
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                                <span className={styles.freeLabel}>Free Event</span>
                            </div>
                        )}
                    </div>

                    {/* Share */}
                    <div className={styles.shareCard}>
                        <h4>Share This Event</h4>
                        <div className={styles.shareButtons}>
                            <button
                                className={styles.shareBtn}
                                title="Copy link"
                                onClick={() => navigator.clipboard.writeText(window.location.href)}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                                Copy Link
                            </button>
                            <a
                                className={styles.shareBtn}
                                title="Share on Twitter"
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                                </svg>
                                Twitter
                            </a>
                            <a
                                className={styles.shareBtn}
                                title="Share on LinkedIn"
                                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                    <rect x="2" y="9" width="4" height="12" />
                                    <circle cx="4" cy="4" r="2" />
                                </svg>
                                LinkedIn
                            </a>
                        </div>
                    </div>
                </aside>
            </div>

            <Footer />
        </div>
    );
};

export default EventDetail;
