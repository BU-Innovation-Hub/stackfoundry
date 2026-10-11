import React from 'react';
import { Link } from 'react-router-dom';
import { teamMembers } from './teamData';
import styles from './Founders.module.css';

const Founders: React.FC = () => {
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
          {teamMembers.slice(0, 4).map((member) => (
            <article key={member.id} className={styles.card}>
              <div className={styles.avatar}>
                <div className={styles.avatarPlaceholder}>
                  {member.name.split(' ').filter((part) => !['Mr', 'Dr.'].includes(part)).slice(0, 2).map((part) => part[0]).join('')}
                </div>
              </div>
              <div className={styles.info}>
                <h3 className={styles.name}>{member.name}</h3>
                <span className={styles.role}>{member.role}</span>
                <p className={styles.bio}>{member.bio}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.teamAction}>
          <Link to="/team" className={styles.teamButton}>Meet the full team</Link>
        </div>
      </div>
    </section>
  );
};

export default Founders;
