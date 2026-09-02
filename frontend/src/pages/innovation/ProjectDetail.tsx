import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Discussion, Project } from '../../types/innovation';
import styles from './Innovation.module.css';

const roles = ['viewer', 'researcher', 'developer', 'designer', 'business', 'advisor', 'co_owner'];

const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [discussion, setDiscussion] = useState<Discussion[]>([]);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([innovationService.project(id), innovationService.discussions(id)])
      .then(([nextProject, nextDiscussion]) => { setProject(nextProject); setDiscussion(nextDiscussion); })
      .catch(() => setError('Unable to load this project.'));
  }, [id]);

  if (!project) return <p className={styles.empty}>{error || 'Loading project...'}</p>;

  const post = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !message.trim()) return;
    try {
      const item = await innovationService.addDiscussion(id, message.trim());
      setDiscussion([...discussion, item]);
      setMessage('');
    } catch {
      setError('Unable to post your message.');
    }
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !email.trim()) return;
    setError('');
    setSuccess('');
    try {
      const updated = await innovationService.invite(id, email.trim(), role);
      setProject(updated);
      setEmail('');
      setSuccess('Invitation sent successfully.');
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Invitation failed.');
    }
  };

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>{project.name}</h2>
          <p>{project.description || 'Project workspace'}</p>
        </div>
      </div>
      {success && <p className={styles.notice}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.grid}>
        <section className={styles.card}>
          <h3>Team and invitations</h3>
          {project.team?.map((member, index) => (
            <div className={styles.row} key={index}>
              <span>{member.user?.name || member.user || 'Member'} <span className={styles.badge}>{member.role}</span></span>
              <span className={styles.muted}>{member.accepted ? 'Joined' : 'Pending'}</span>
            </div>
          ))}
          <form className={styles.form} onSubmit={invite}>
            <label>
              Collaborator email
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@university.ac.bw" />
            </label>
            <label>
              Role
              <select value={role} onChange={e => setRole(e.target.value)}>
                {roles.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button className={styles.button}>Invite</button>
          </form>
        </section>
        <section className={styles.card}>
          <h3>Threaded discussion</h3>
          {discussion.map(item => (
            <div className={styles.row} key={item._id}>
              <span><strong>{item.author?.name || 'Member'}</strong><br />{item.message}</span>
            </div>
          ))}
          <form className={styles.actions} onSubmit={post}>
            <input required value={message} onChange={e => setMessage(e.target.value)} placeholder="Write an update..." />
            <button className={styles.button}>Post</button>
          </form>
        </section>
      </div>
    </>
  );
};

export default ProjectDetail;
