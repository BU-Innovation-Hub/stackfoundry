import React from 'react';
import styles from './Founders.module.css';

interface Founder {
  id: number;
  name: string;
  role: string;
  bio: string;
  image?: string;
  social: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

const Founders: React.FC = () => {
  const founders: Founder[] = [
    {
      id: 1,
      name: 'Dr. Sarah Moyo',
      role: 'Director & Lead Innovator',
      bio: 'Former Google engineer with 15+ years in tech. Passionate about nurturing African tech talent.',
      social: { linkedin: '#', twitter: '#', email: 'sarah@botho.edu' },
    },
    {
      id: 2,
      name: 'Prof. James Kgosi',
      role: 'Academic Advisor',
      bio: 'Computer Science professor specializing in AI and entrepreneurship education.',
      social: { linkedin: '#', email: 'james@botho.edu' },
    },
    {
      id: 3,
      name: 'Naledi Tau',
      role: 'Startup Program Manager',
      bio: 'Serial entrepreneur who has launched 3 successful startups across Africa.',
      social: { linkedin: '#', twitter: '#' },
    },
    {
      id: 4,
      name: 'Michael Chen',
      role: 'Technical Lead',
      bio: 'Full-stack developer and open source contributor. Mentors students in modern web technologies.',
      social: { linkedin: '#', twitter: '#', email: 'michael@botho.edu' },
    },
  ];

  return (
    <section id="founders" className={styles.founders}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Our Team</span>
          <h2 className={styles.title}>
            Meet the <span className={styles.highlight}>Visionaries</span>
          </h2>
          <p className={styles.subtitle}>
            The passionate leaders driving innovation at Botho University
          </p>
        </div>

        <div className={styles.grid}>
          {founders.map((founder) => (
            <div key={founder.id} className={styles.card}>
              <div className={styles.avatar}>
                <div className={styles.avatarPlaceholder}>
                  {founder.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              <div className={styles.info}>
                <h3 className={styles.name}>{founder.name}</h3>
                <span className={styles.role}>{founder.role}</span>
                <p className={styles.bio}>{founder.bio}</p>
                <div className={styles.social}>
                  {founder.social.linkedin && (
                    <a href={founder.social.linkedin} className={styles.socialLink} aria-label="LinkedIn">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  )}
                  {founder.social.twitter && (
                    <a href={founder.social.twitter} className={styles.socialLink} aria-label="Twitter">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  )}
                  {founder.social.email && (
                    <a href={`mailto:${founder.social.email}`} className={styles.socialLink} aria-label="Email">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Founders;
