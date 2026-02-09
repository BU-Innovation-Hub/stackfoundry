import React from 'react';
import styles from './About.module.css';
import ScrollVelocity from '../common/ScrollVelocity';

const About: React.FC = () => {
  const stats = [
    { number: '30+', label: 'Innovators' },
    { number: '20+', label: 'Startup Ideas' },
    { number: '10+', label: 'Mentors' },
    { number: '2+', label: 'Global Partnerships' },];

  return (
    <section id="about" className={styles.about}>
      <div className={styles.container}>
        <div className={styles.content}>
          <span className={styles.label}>About Us</span>
          <h2 className={styles.title}>
            Empowering the Next Generation of <span className={styles.highlight}>Tech Innovators</span>
          </h2>
          <p className={styles.description}>
            The Botho University Innovation Hub is a dynamic ecosystem designed to nurture 
            creativity, foster collaboration, and accelerate the growth of tech-driven startups. 
            We provide resources, mentorship, and a supportive community for aspiring entrepreneurs 
            and innovators.
          </p>
          <p className={styles.description}>
            Our mission is to bridge the gap between academic knowledge and real-world application, 
            transforming bold ideas into impactful solutions that address local and global challenges.
          </p>
          
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>Resources & Tools</h3>
              <p>Access cutting-edge technology, workspaces, and development tools.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Expert Mentorship</h3>
              <p>Learn from industry leaders and experienced entrepreneurs.</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <h3>Global Network</h3>
              <p>Connect with innovators and investors worldwide.</p>
            </div>
          </div>
        </div>

        <div className={styles.stats}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.stat}>
              <span className={styles.statNumber}>{stat.number}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.scrollVelocityWrapper}>
        <ScrollVelocity
          texts={['Botho Innovation Hub', 'Creating Innovators']} 
          velocity={100}
          className={styles.scrollText}
        />
      </div>
    </section>
  );
};

export default About;
