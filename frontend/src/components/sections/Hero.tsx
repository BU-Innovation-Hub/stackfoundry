import React from 'react';
import styles from './Hero.module.css';
import gearLightbulb from '../../assets/bg-rem.png';

const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      {/* Background effects */}
      <div className={styles.bgGradient}></div>
      <div className={styles.bgGrid}></div>
      
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Main headline */}
          <div className={styles.headline}>
            <span className={styles.prefix}>THE</span>
            <h1 className={styles.title}>
              INNOVATION
              <span className={styles.titleRow}>
                <span className={styles.creativeBadge}>CREATIVE</span>
                HUB
              </span>
            </h1>
          </div>

          {/* CTA Button */}
          <a href="#about" className={styles.ctaButton}>
            <span>JOIN NOW</span>
            <svg 
              className={styles.ctaArrow} 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none"
            >
              <path 
                d="M5 12H19M19 12L12 5M19 12L12 19" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        {/* Hero image - lightbulb */}
        <div className={styles.heroImage}>
          <div className={styles.imageGlow}></div>
          <div className={styles.lightbulbContainer}>
            <img 
              src={gearLightbulb} 
              alt="Innovation Lightbulb" 
              className={styles.lightbulb}
            />
            {/* Floating particles */}
            <div className={styles.particles}>
              {[...Array(12)].map((_, i) => (
                <span key={i} className={styles.particle} style={{ '--i': i } as React.CSSProperties}></span>
              ))}
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className={styles.infoCard}>
          <p className={styles.infoText}>
            At the Tech Innovator's Hub, we Foster a Dynamic Ecosystem of Tech-driven 
            Creativity, Collaboration, and Innovation.
          </p>
          <div className={styles.handsImage}>
            <svg viewBox="0 0 100 80" fill="none" className={styles.handsSvg}>
              <path d="M20 60 Q35 40 50 50 Q65 60 80 40" stroke="url(#handsGradient)" strokeWidth="2" fill="none"/>
              <defs>
                <linearGradient id="handsGradient">
                  <stop offset="0%" stopColor="#6b6b7b"/>
                  <stop offset="100%" stopColor="#a0a0b0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
    
    </section>
  );
};

export default Hero;
