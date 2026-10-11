import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { teamMembers } from '../components/sections/teamData';
import styles from '../components/sections/Founders.module.css';
import pageStyles from './Team.module.css';

const Team: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
    <Navbar />
    <main className={pageStyles.page}>
      <section className={styles.founders} aria-labelledby="team-title">
        <div className={styles.container}>
          <div className={styles.header}>
            <span className={styles.label}>Our Team</span>
            <h1 id="team-title" className={styles.title}>The people behind the Hub</h1>
            <p className={styles.subtitle}>Meet the academic advisors and technical leads driving innovation at Botho University.</p>
          </div>
          <div className={pageStyles.grid}>
            {teamMembers.map((member) => (
              <article key={member.id} className={styles.card}>
                <div className={styles.avatar}>
                  <div className={styles.avatarPlaceholder} aria-hidden="true">
                    {member.name.split(' ').filter((part) => !['Mr', 'Dr.'].includes(part)).slice(0, 2).map((part) => part[0]).join('')}
                  </div>
                </div>
                <div className={styles.info}>
                  <h2 className={styles.name}>{member.name}</h2>
                  <span className={styles.role}>{member.role}</span>
                  <p className={styles.bio}>{member.bio}</p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.teamAction}>
            <Link to="/#founders" className={styles.teamButton}>Back to the home page</Link>
          </div>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
};

export default Team;
