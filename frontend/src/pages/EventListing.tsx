import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { getEvents } from '../services/eventService';
import { IEvent, EVENT_TYPES, EventType } from '../types/event';
import Loader from '../components/common/Loader';
import styles from './EventListing.module.css';

const EventListing: React.FC = () => {
    const [events, setEvents] = useState<IEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeType, setActiveType] = useState('all');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const result = await getEvents({ limit: 50 });
                setEvents(result.data);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

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

    const filtered = useMemo(() => {
        let result = events;
        if (activeType !== 'all') {
            result = result.filter(e => e.type === activeType);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                e =>
                    e.title.toLowerCase().includes(q) ||
                    e.description.toLowerCase().includes(q)
            );
        }
        return result;
    }, [events, activeType, search]);

    const upcomingEvents = filtered.filter(e => !isPastEvent(e.eventDate));
    const pastEvents = filtered.filter(e => isPastEvent(e.eventDate));

    const typeFilters = ['all', ...EVENT_TYPES];

    return (
        <div className={styles.page}>
            <Navbar />

            {/* Hero Banner */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <span className={styles.heroLabel}>Events</span>
                    <h1 className={styles.heroTitle}>
                        Community <span>Events</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Join our workshops, hackathons, meetups, and conferences. Level up your skills and connect with the community.
                    </p>
                </div>
            </section>

            {/* Controls */}
            <div className={styles.controls}>
                <div className={styles.searchBox}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="Search events..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    {typeFilters.map(type => (
                        <button
                            key={type}
                            className={`${styles.filterBtn} ${activeType === type ? styles.filterBtnActive : ''}`}
                            onClick={() => setActiveType(type)}
                        >
                            {type === 'all' ? 'All' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results summary */}
            {!loading && (
                <div className={styles.resultsSummary}>
                    {filtered.length} {filtered.length === 1 ? 'event' : 'events'} found
                    {activeType !== 'all' && ` in ${activeType}`}
                    {search.trim() && ` for "${search}"`}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <Loader text="Loading events..." size="large" />
            )}

            {/* Events Grid */}
            {!loading && (
                <>
                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <span className={styles.sectionDot} style={{ background: '#10b981' }} />
                                Upcoming Events
                            </h2>
                            <div className={styles.grid}>
                                {upcomingEvents.map(event => (
                                    <Link
                                        key={event._id}
                                        to={`/events/${event.slug}`}
                                        className={styles.card}
                                    >
                                        <div className={styles.cardImageWrap}>
                                            {event.image ? (
                                                <img src={event.image} alt={event.title} className={styles.cardImage} />
                                            ) : (
                                                <div className={styles.cardImagePlaceholder}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                </div>
                                            )}
                                            <span
                                                className={styles.cardBadge}
                                                style={{ backgroundColor: getTypeColor(event.type) }}
                                            >
                                                {event.type}
                                            </span>
                                        </div>
                                        <div className={styles.cardContent}>
                                            <div className={styles.cardMeta}>
                                                <span>{event.date}</span>
                                                <span>•</span>
                                                <span>{event.time}</span>
                                            </div>
                                            <h3 className={styles.cardTitle}>{event.title}</h3>
                                            <p className={styles.cardExcerpt}>{event.description}</p>
                                            {event.location && (
                                                <span className={styles.cardLocation}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    {event.location}
                                                </span>
                                            )}
                                            <span className={styles.cardRegister}>
                                                Register Now
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Events */}
                    {pastEvents.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <span className={styles.sectionDot} style={{ background: '#94a3b8' }} />
                                Past Events
                            </h2>
                            <div className={styles.grid}>
                                {pastEvents.map(event => (
                                    <Link
                                        key={event._id}
                                        to={`/events/${event.slug}`}
                                        className={`${styles.card} ${styles.cardPast}`}
                                    >
                                        <div className={styles.cardImageWrap}>
                                            {event.image ? (
                                                <img src={event.image} alt={event.title} className={styles.cardImage} />
                                            ) : (
                                                <div className={styles.cardImagePlaceholder}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                </div>
                                            )}
                                            <span
                                                className={styles.cardBadge}
                                                style={{ backgroundColor: getTypeColor(event.type) }}
                                            >
                                                {event.type}
                                            </span>
                                            <div className={styles.pastOverlay}>Ended</div>
                                        </div>
                                        <div className={styles.cardContent}>
                                            <div className={styles.cardMeta}>
                                                <span>{event.date}</span>
                                                <span>•</span>
                                                <span>{event.time}</span>
                                            </div>
                                            <h3 className={styles.cardTitle}>{event.title}</h3>
                                            <p className={styles.cardExcerpt}>{event.description}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <div className={styles.empty}>
                            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <h3>No events found</h3>
                            <p>Try adjusting your search or filter to find what you're looking for.</p>
                        </div>
                    )}
                </>
            )}

            <Footer />
        </div>
    );
};

export default EventListing;
