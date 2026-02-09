import React from 'react';
import styles from './Vision.module.css';
import ScrollStack, { ScrollStackItem } from '../common/ScrollStack';
import { Star, Target, Heart, Lightbulb, Rocket, TrendingUp, Users } from 'lucide-react';

const Vision: React.FC = () => {
  return (
    <section id="explore" className={styles.vision}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.label}>Our Vision</span>
          <h2 className={styles.title}>
            Building Tomorrow's <span className={styles.highlight}>Tech Leaders</span>
          </h2>
        </div>
      </div>

      <div className={styles.stackWrapper}>
        <ScrollStack
          itemDistance={100}
          itemScale={0.04}
          itemStackDistance={40}
          stackPosition="25%"
          scaleEndPosition="15%"
          baseScale={0.88}
          useWindowScroll={true}
        >
          <ScrollStackItem itemClassName={styles.stackCard}>
            <div className={styles.stackCardInner}>
              <div className={styles.stackCardLeft}>
                <div className={styles.cardIcon}>
                  <Star size={26} strokeWidth={2} />
                </div>
                <span className={styles.cardNumber}>01</span>
              </div>
              <div className={styles.stackCardContent}>
                <h3>Mission</h3>
                <p>
                  To cultivate a thriving innovation ecosystem that empowers students and 
                  aspiring entrepreneurs to transform creative ideas into sustainable 
                  technology ventures.
                </p>
              </div>
            </div>
          </ScrollStackItem>

          <ScrollStackItem itemClassName={styles.stackCard}>
            <div className={`${styles.stackCardInner} ${styles.stackCardAccent}`}>
              <div className={styles.stackCardLeft}>
                <div className={`${styles.cardIcon} ${styles.cardIconAccent}`}>
                  <Target size={26} strokeWidth={2} />
                </div>
                <span className={`${styles.cardNumber} ${styles.cardNumberAccent}`}>02</span>
              </div>
              <div className={styles.stackCardContents}>
                <h3>Vision</h3>
                <p>
                  To be Africa's leading university-based innovation hub, producing 
                  world-class tech startups that solve real problems and create 
                  lasting impact across the continent and beyond.
                </p>
              </div>
            </div>
          </ScrollStackItem>

          <ScrollStackItem itemClassName={styles.stackCard}>
            <div className={styles.stackCardInner}>
              <div className={styles.stackCardLeft}>
                <div className={styles.cardIcon}>
                  <Heart size={26} strokeWidth={2} />
                </div>
                <span className={styles.cardNumber}>03</span>
              </div>
              <div className={styles.stackCardContent}>
                <h3>Values</h3>
                <p>
                  Innovation, Integrity, Collaboration, Excellence, and Social Impact 
                  guide everything we do as we build the future of tech in Africa.
                </p>
              </div>
            </div>
          </ScrollStackItem>
        </ScrollStack>
      </div>

      <div className={styles.container}>
        <div className={styles.pillars}>
          <h3 className={styles.pillarsTitle}>Our Pillars</h3>
          <div className={styles.pillarsList}>
            {[
              { Icon: Lightbulb, title: 'Ideation', desc: 'Transform ideas into viable concepts' },
              { Icon: Rocket, title: 'Incubation', desc: 'Nurture startups to market readiness' },
              { Icon: TrendingUp, title: 'Acceleration', desc: 'Scale successful ventures rapidly' },
              { Icon: Users, title: 'Connection', desc: 'Link innovators with opportunities' },
            ].map(({ Icon, title, desc }, index) => (
              <div key={index} className={styles.pillar}>
                <span className={styles.pillarIcon}><Icon size={36} strokeWidth={2.25} /></span>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Vision;
