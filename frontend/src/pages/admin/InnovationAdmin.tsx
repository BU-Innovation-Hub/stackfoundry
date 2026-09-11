import React, { useEffect, useState } from 'react';
import { innovationService } from '../../services/innovationService';
import { Project, InnovationClassification, Mentor, Showcase } from '../../types/innovation';
import styles from '../innovation/Innovation.module.css';

export const ClassificationAdmin: React.FC = () => {
  const [classifications, setClassifications] = useState<{ categories: InnovationClassification[]; stages: InnovationClassification[] }>({ categories: [], stages: [] });
  const [name, setName] = useState('');
  const load = () => { innovationService.classifications().then(setClassifications).catch(() => undefined); };
  useEffect(() => { load(); }, []);
  const add = async (type: 'categories' | 'stages') => { if (!name.trim()) return; await innovationService.createClassification(type, name.trim()); setName(''); load(); };
  return <div><div className={styles.card}><input value={name} onChange={event => setName(event.target.value)} placeholder="New category or stage" /><div className={styles.actions}><button className={styles.button} onClick={() => add('categories')}>Add category</button><button className={styles.button} onClick={() => add('stages')}>Add stage</button></div></div><div className={styles.grid}>{(['categories', 'stages'] as const).map(type => <section className={styles.card} key={type}><h3>{type === 'categories' ? 'Categories' : 'Development stages'}</h3>{classifications[type].map(item => <div className={styles.row} key={item._id}><span>{item.name}</span><button className={styles.button} onClick={() => innovationService.updateClassification(type, item._id, { active: !item.active }).then(load)}>{item.active === false ? 'Enable' : 'Disable'}</button></div>)}</section>)}</div></div>;
};

const InnovationModeration: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [pendingMentors, setPendingMentors] = useState<Mentor[]>([]);
  const [showcase, setShowcase] = useState<Showcase[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<Record<string, string>>({});
  const load = async () => { const [items, profiles, showcaseItems] = await Promise.all([innovationService.projects({ status: 'submitted' }), innovationService.mentors(undefined, true), innovationService.adminShowcase()]); setProjects(items); setMentors(profiles.filter(item => item.approved)); setPendingMentors(profiles.filter(item => !item.approved)); setShowcase(showcaseItems); };
  useEffect(() => { load().catch(() => undefined); }, []);

  return (
    <div>
      <div className={styles.grid}>
        <section className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <h3>Project reviews</h3>
          {projects.length === 0 && <p className={styles.muted}>No pending projects.</p>}
          <div className={styles.projectGrid}>
            {projects.map(item => (
              <div className={styles.projectCard} key={item._id}>
                <div className={styles.projectCardHeader}>
                  <span className={styles.badge}>{item.status.replace(/_/g, ' ')}</span>
                </div>
                <h3 className={styles.projectCardTitle}>{item.title}</h3>
                <p className={styles.projectCardDesc}>{item.problem || 'No problem statement.'}</p>
                <div className={styles.projectCardFooter} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                  <select
                    value={selectedMentor[item._id] || ''}
                    onChange={event => setSelectedMentor({ ...selectedMentor, [item._id]: event.target.value })}
                  >
                    <option value="">Assign mentor</option>
                    {mentors.map(mentor => <option key={mentor._id} value={mentor._id}>{mentor.user?.name} {mentor.user?.surname}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={styles.button}
                      disabled={!selectedMentor[item._id]}
                      onClick={() => innovationService.assignReviewer(item._id, selectedMentor[item._id]).then(load)}
                    >
                      Request review
                    </button>
                    <button
                      className={styles.button}
                      onClick={() => innovationService.reviewProject(item._id, { toStatus: 'approved', decision: 'approve' }).then(() => setProjects(projects.filter(p => p._id !== item._id)))}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <h3>Mentor approval</h3>
          {pendingMentors.length === 0 && <p className={styles.muted}>No pending mentor profiles.</p>}
          {pendingMentors.map(item => (
            <div className={styles.row} key={item._id}>
              <span>{item.user?.name} {item.user?.surname}</span>
              <button className={styles.button} onClick={() => innovationService.approveMentor(item._id, true).then(load)}>Approve</button>
            </div>
          ))}
        </section>

        <section className={styles.card}>
          <h3>Showcase publishing</h3>
          {showcase.filter(item => !item.published).length === 0 && <p className={styles.muted}>No showcase requests.</p>}
          {showcase.filter(item => !item.published).map(item => (
            <div className={styles.row} key={item._id}>
              <span>{item.title || (typeof item.project === 'object' ? item.project?.title : '')}</span>
              <button className={styles.button} onClick={() => innovationService.updateShowcase(item._id, { approved: true, published: true }).then(load)}>Publish</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default InnovationModeration;
