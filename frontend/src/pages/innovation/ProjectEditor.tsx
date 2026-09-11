import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { innovationService } from '../../services/innovationService';
import { InnovationClassification } from '../../types/innovation';
import Loader from '../../components/common/Loader';
import styles from './Innovation.module.css';
import InnovationModal from './InnovationModal';

const ProjectEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = useLocation().pathname.startsWith('/admin/innovation') ? '/admin/innovation' : '/innovation';
  const [form, setForm] = useState<{ title: string; problem: string; solution: string; beneficiaries: string; category: string; stage: string; tags: string; visibility: 'public' | 'private' }>({ title: '', problem: '', solution: '', beneficiaries: '', category: '', stage: '', tags: '', visibility: 'private' });
  const [classifications, setClassifications] = useState<{ categories: InnovationClassification[]; stages: InnovationClassification[] }>({ categories: [], stages: [] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      innovationService.classifications(),
      id ? innovationService.project(id) : Promise.resolve(null),
    ]).then(([options, item]) => {
      if (!active) return;
      setClassifications(options);
      if (item) setForm({ title: item.title || '', problem: item.problem || '', solution: item.solution || '', beneficiaries: (item.beneficiaries || []).join(', '), category: typeof item.category === 'string' ? item.category : (item.category as any)?._id || '', stage: typeof item.stage === 'string' ? item.stage : (item.stage as any)?._id || '', tags: (item.tags || []).join(', '), visibility: item.visibility || 'private' });
    }).catch(() => { if (active) setError(id ? 'Project not found.' : 'Could not load categories and stages.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));
  const split = (v: string) => v.split(',').map(value => value.trim()).filter(Boolean);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { ...form, beneficiaries: split(form.beneficiaries), tags: split(form.tags) };
      if (id) await innovationService.updateProject(id, payload);
      else await innovationService.createProject(payload);
      setSuccess(id ? 'Project updated successfully.' : 'Project created successfully.');
      navigate(id ? `${base}/projects/${id}` : `${base}/my-projects`);
    } catch (caught: any) {
      setError(caught.response?.data?.error || caught.response?.data?.message || 'Could not save project.');
    } finally {
      setSaving(false);
    }
  };

  const formContent = loading ? <Loader text="Loading project..." /> : <form className={id ? styles.modalForm : styles.form} onSubmit={save}>
        <label>Title<input required maxLength={200} value={form.title} onChange={event => update('title', event.target.value)} /></label>
        <label>Problem statement<textarea required value={form.problem} onChange={event => update('problem', event.target.value)} /></label>
        <label>Proposed solution<textarea required value={form.solution} onChange={event => update('solution', event.target.value)} /></label>
        <label>Beneficiaries<input value={form.beneficiaries} onChange={event => update('beneficiaries', event.target.value)} placeholder="Students, researchers, local businesses" /></label>
        <label>Tags<input value={form.tags} onChange={event => update('tags', event.target.value)} placeholder="climate, health, prototype" /></label>
        <label>Category<select required value={form.category} onChange={event => update('category', event.target.value)}><option value="">Select a category</option>{classifications.categories.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
        <label>Development stage<select required value={form.stage} onChange={event => update('stage', event.target.value)}><option value="">Select a stage</option>{classifications.stages.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
        <label>Visibility<select value={form.visibility} onChange={event => update('visibility', event.target.value as 'public' | 'private')}><option value="private">Private: owner, collaborators, assigned mentors, and admins</option><option value="public">Public: visible to the innovation community</option></select></label>
         {id ? <footer className={styles.modalFooter}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => navigate(`${base}/projects/${id}`)} disabled={saving}>Cancel</button><button type="submit" className={styles.button} disabled={saving}>{saving ? 'Saving...' : 'Update project'}</button></footer> : <button className={styles.button} disabled={saving}>{saving ? 'Saving...' : 'Save project'}</button>}
      </form>;

  if (id) {
    return (
      <InnovationModal
        title="Edit project"
        description="Update the problem, solution, beneficiaries, and visibility of your project."
        onClose={() => navigate(`${base}/projects/${id}`)}
        busy={saving}
        labelledBy="edit-project-title"
      >
        {error && <p className={styles.error} role="alert">{error}</p>}
        {formContent}
      </InnovationModal>
    );
  }

  return (
    <>
      <div className={styles.title}>
        <div>
          <h2>Create a project</h2>
          <p>Capture the problem, solution, beneficiaries, and who should be able to see it.</p>
        </div>
      </div>
      {success && <p className={styles.notice}>{success}</p>}
      {error && <p className={styles.error}>{error}</p>}
      {formContent}
    </>
  );
};

export default ProjectEditor;
