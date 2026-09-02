import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { Project } from '../../types/innovation';
import styles from './Innovation.module.css';
import { useAuth } from '../../context/AuthContext';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';

  useEffect(() => {
    Promise.all([
      innovationService.projects(user?.role === 'innovation_hub_admin' || user?.role === 'system_admin'),
      innovationService.invitations()
    ]).then(([p, i]) => { setProjects(p); setInvitations(i); }).catch(() => setError('Could not load projects.'));
  }, [user?.role]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const project = await innovationService.createProject({ name, description, visibility });
      setProjects([project, ...projects]);
      setName('');
      setDescription('');
      setVisibility('private');
      setShowForm(false);
    } catch (caught: any) {
      setError(caught.response?.data?.message || 'Could not create project.');
    }
  };

  const respond = async (invitation: any, accepted: boolean) => {
    await innovationService.respondInvitation(invitation.project._id, accepted);
    setInvitations(invitations.filter(item => item.project._id !== invitation.project._id));
    if (accepted) setProjects([invitation.project, ...projects]);
  };

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>Projects</h2>
          <p>Build with a team, share files and keep the conversation moving.</p>
        </div>
        <button className={styles.button} onClick={() => setShowForm(!showForm)}>New project</button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {invitations.length > 0 && (
        <section className={styles.card} style={{ marginBottom: '1.5rem' }}>
          <h3>Pending invitations</h3>
          {invitations.map(item => (
            <div className={styles.row} key={item.project._id}>
              <span>
                <strong>{item.project.name}</strong>
                <br />
                <span className={styles.muted}>Role: {item.role}</span>
              </span>
              <span className={styles.actions}>
                <button className={styles.button} onClick={() => respond(item, true)}>Accept</button>
                <button className={styles.button} onClick={() => respond(item, false)}>Reject</button>
              </span>
            </div>
          ))}
        </section>
      )}

      {showForm && (
        <form className={styles.form} onSubmit={create} style={{ marginBottom: '1.5rem' }}>
          <label>Project name<input required value={name} onChange={e => setName(e.target.value)} /></label>
          <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} /></label>
          <label>Visibility
            <select value={visibility} onChange={e => setVisibility(e.target.value as 'public' | 'private')}>
              <option value="private">Private: team and invited mentors</option>
              <option value="public">Public: visible to the innovation community</option>
            </select>
          </label>
          <button className={styles.button}>Create project</button>
        </form>
      )}

      <div className={styles.ideaGrid}>
        {projects.length ? projects.map(project => (
          <div className={styles.ideaCard} key={project._id}>
            <div className={styles.ideaCardHeader}>
              <span className={styles.badge}>{project.visibility}</span>
            </div>
            <h3 className={styles.ideaCardTitle}>{project.name}</h3>
            <p className={styles.ideaCardDesc}>{project.description || 'No description.'}</p>
            <div className={styles.ideaCardFooter}>
              <span className={styles.ideaCardOwner}>{project.team?.filter(m => m.accepted).length || 0} team members</span>
              <Link className={styles.manageBtn} to={`${base}/projects/${project._id}`}>Manage</Link>
            </div>
          </div>
        )) : <p className={styles.empty}>No projects yet.</p>}
      </div>
    </>
  );
};

export default Projects;
