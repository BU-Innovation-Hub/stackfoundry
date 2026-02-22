import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Events.module.css';
import { IEvent, EventType } from '../../types/event';
import { getFeaturedEvents } from '../../services/eventService';
import Loader from '../common/Loader';

const Events: React.FC = () => {
  const [events, setEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getFeaturedEvents(4);
        setEvents(data);
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

  return (
    <section id="events" className={styles.events}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Upcoming Events</span>
          <h2 className={styles.title}>
            Join Our <span className={styles.highlight}>Community Events</span>
          </h2>
          <p className={styles.subtitle}>
            Workshops, hackathons, meetups, and more. Be part of the innovation journey.
          </p>
        </div>

        {loading ? (
          <Loader text="Loading upcoming events..." size="medium" variant="inline" dark />
        ) : events.length > 0 ? (
          <div className={styles.grid}>
            {events.map((event) => (
              <article key={event._id} className={styles.card}>
                <div
                  className={styles.cardBadge}
                  style={{ backgroundColor: getTypeColor(event.type) }}
                >
                  {event.type}
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDate}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {event.date}
                    </span>
                    <span className={styles.cardTime}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {event.time}
                    </span>
                  </div>
                  <h3 className={styles.cardTitle}>{event.title}</h3>
                  <p className={styles.cardDescription}>{event.description}</p>
                  <Link to={`/events/${event.slug}`} className={styles.cardButton}>
                    Register Now
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No upcoming events at the moment. Check back soon!</div>
        )}

        <div className={styles.cta}>
          <Link to="/events" className={styles.viewAllBtn}>
            View All Events
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Events;
