import React, { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { createMember, CreateMemberData } from '../../services/adminService';
import { Member } from '../../types/admin';
import styles from './CreateMember.module.css';

interface Props {
  onClose: () => void;
  onCreated: (member: Member) => void;
}

const INITIAL: CreateMemberData = {
  studentId: '',
  email: '',
  password: '',
  name: '',
  surname: '',
  role: 'student',
};

const CreateMemberModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<CreateMemberData>({ ...INITIAL });
  const [error, setError] = useState<string>('');
  const [details, setDetails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setDetails([]);
    setSubmitting(true);
    try {
      const created = await createMember(form);
      onCreated({
        id: created.id,
        studentId: created.studentId || form.studentId,
        name: created.name || form.name,
        surname: created.surname || form.surname,
        email: created.email || form.email,
        role: created.role || form.role,
        isActive: created.isActive ?? true,
        joinedAt: created.joinedAt || new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.error || 'Failed to create member');
      if (Array.isArray(data?.details)) {
        setDetails(data.details);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Add Member</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {error && (
              <div className={styles.error}>
                {error}
                {details.length > 0 && (
                  <ul className={styles.errorList}>
                    {details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="cm-name">Name</label>
                <input
                  id="cm-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="cm-surname">Surname</label>
                <input
                  id="cm-surname"
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="cm-studentId">Student ID</label>
              <input
                id="cm-studentId"
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="cm-email">Email</label>
              <input
                id="cm-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="cm-password">Password</label>
              <input
                id="cm-password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="cm-role">Role</label>
              <select
                id="cm-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="student">Student</option>
                <option value="member">Member</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMemberModal;
