import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { innovationService } from '../../services/innovationService';
import { InnovationClassification, Project } from '../../types/innovation';
import styles from './Innovation.module.css';

type FormState = {
  title: string;
  problem: string;
  solution: string;
  beneficiaries: string;
  category: string;
  stage: string;
  tags: string;
  visibility: 'public' | 'private';
};

const emptyForm: FormState = { title: '', problem: '', solution: '', beneficiaries: '', category: '', stage: '', tags: '', visibility: 'private' };
const split = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

interface Props {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const ProjectCreateModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [classifications, setClassifications] = useState<{ categories: InnovationClassification[]; stages: InnovationClassification[] }>({ categories: [], stages: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    innovationService.classifications()
      .then(value => { if (active) setClassifications(value); })
      .catch(() => { if (active) setError('Could not load project categories and stages.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const update = (field: keyof FormState, value: string) => setForm(current => ({ ...current, [field]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const project = await innovationService.createProject({
        ...form,
        beneficiaries: split(form.beneficiaries),
        tags: split(form.tags),
      });
      onCreated(project);
    } catch (caught: any) {
      setError(caught.response?.data?.error || caught.response?.data?.message || 'Could not create project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className={styles.projectModal} role="dialog" aria-modal="true" aria-labelledby="create-project-title">
        <header className={styles.modalHeader}>
          <div><h2 id="create-project-title">Create a project</h2><p>Start with the problem you want to make useful.</p></div>
          <button className={styles.modalClose} type="button" onClick={onClose} disabled={saving} aria-label="Close create project dialog"><X size={20} /></button>
        </header>
        {error && <p className={styles.error}>{error}</p>}
        {loading ? <p className={styles.modalLoading}>Loading project options...</p> : (
          <form className={styles.modalForm} onSubmit={save}>
            <label>Title<input required maxLength={200} value={form.title} onChange={event => update('title', event.target.value)} /></label>
            <label>Problem statement<textarea required value={form.problem} onChange={event => update('problem', event.target.value)} /></label>
            <label>Proposed solution<textarea required value={form.solution} onChange={event => update('solution', event.target.value)} /></label>
            <div className={styles.formColumns}>
              <label>Category<select required value={form.category} onChange={event => update('category', event.target.value)}><option value="">Select a category</option>{classifications.categories.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
              <label>Development stage<select required value={form.stage} onChange={event => update('stage', event.target.value)}><option value="">Select a stage</option>{classifications.stages.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label>
            </div>
            <label>Beneficiaries<input value={form.beneficiaries} onChange={event => update('beneficiaries', event.target.value)} placeholder="Students, researchers, local businesses" /></label>
            <label>Tags<input value={form.tags} onChange={event => update('tags', event.target.value)} placeholder="climate, health, prototype" /></label>
            <label>Visibility<select value={form.visibility} onChange={event => update('visibility', event.target.value as FormState['visibility'])}><option value="private">Private</option><option value="public">Public</option></select></label>
            <footer className={styles.modalFooter}>
              <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className={styles.button} disabled={saving}>{saving ? 'Creating...' : 'Create project'}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
};

export default ProjectCreateModal;
