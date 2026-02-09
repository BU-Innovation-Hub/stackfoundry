import React from 'react';
import styles from './Events.module.css';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  type: 'workshop' | 'hackathon' | 'meetup' | 'conference';
  description: string;
  image?: string;
}

const Events: React.FC = () => {
  const events: Event[] = [
    {
      id: 1,
      title: 'AI & Machine Learning Workshop',
      date: 'Feb 15, 2026',
      time: '10:00 AM - 4:00 PM',
      type: 'workshop',
      description: 'Hands-on workshop exploring the latest in AI/ML technologies and their applications in African markets.',
    },
    {
      id: 2,
      title: 'Startup Pitch Competition',
      date: 'Feb 22, 2026',
      time: '2:00 PM - 6:00 PM',
      type: 'conference',
      description: 'Present your startup idea to a panel of investors and industry experts. Win funding and mentorship.',
    },
    {
      id: 3,
      title: '48-Hour Hackathon: FinTech Edition',
      date: 'Mar 1-2, 2026',
      time: 'All Day Event',
      type: 'hackathon',
      description: 'Build innovative financial solutions for the unbanked. Teams compete for prizes worth $10,000.',
    },
    {
      id: 4,
      title: 'Tech Founders Meetup',
      date: 'Mar 10, 2026',
      time: '6:00 PM - 9:00 PM',
      type: 'meetup',
      description: 'Network with successful tech founders and learn from their entrepreneurial journeys.',
    },
  ];

  const getTypeColor = (type: Event['type']) => {
    const colors = {
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

        <div className={styles.grid}>
          {events.map((event) => (
            <article key={event.id} className={styles.card}>
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
                <button className={styles.cardButton}>
                  Register Now
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.cta}>
          <a href="/events" className={styles.viewAllBtn}>
            View All Events
          </a>
        </div>
      </div>
    </section>
  );
};

export default Events;
