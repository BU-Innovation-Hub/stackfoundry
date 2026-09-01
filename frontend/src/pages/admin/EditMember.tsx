import React, { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { updateMemberProfile, UpdateMemberData } from '../../services/adminService';
import { Member } from '../../types/admin';
import styles from './CreateMember.module.css';

interface Props {
  member: Member;
  onClose: () => void;
  onUpdated: (member: Member) => void;
}

const EditMemberModal: React.FC<Props> = ({ member, onClose, onUpdated }) => {
  const isStudent = member.role === 'student';
  const [form, setForm] = useState({
    name: member.name,
    surname: member.surname,
    email: member.email,
    studentId: member.studentId || '',
  });
  const [error, setError] = useState<string>('');
  const [details, setDetails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setDetails([]);
    setSubmitting(true);

    const payload: UpdateMemberData = {
      name: form.name.trim(),
      surname: form.surname.trim(),
      email: form.email.trim(),
    };
    if (isStudent) {
      payload.studentId = form.studentId.trim();
    }

    try {
      const updated = await updateMemberProfile(member.id, payload);
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.error || 'Failed to update member');
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
          <h2>Edit Profile</h2>
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
                <label htmlFor="em-name">Name</label>
                <input
                  id="em-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="em-surname">Surname</label>
                <input
                  id="em-surname"
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {isStudent && (
              <div className={styles.field}>
                <label htmlFor="em-studentId">Student ID</label>
                <input
                  id="em-studentId"
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="em-email">Email</label>
              <input
                id="em-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
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
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;
