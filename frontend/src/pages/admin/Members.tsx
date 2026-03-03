import React, { useEffect, useState, useCallback } from 'react';
import { Search, MoreVertical, UserCheck, UserX, Trash2, Shield, UserPlus } from 'lucide-react';
import { Member } from '../../types/admin';
import { getMembers, updateMemberRole, toggleMemberStatus, deleteMember } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import styles from './Members.module.css';

const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setActionError('');
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = members;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.surname.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.studentId.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') result = result.filter(m => m.role === roleFilter);
    if (statusFilter !== 'all') result = result.filter(m => (statusFilter === 'active' ? m.isActive : !m.isActive));
    setFiltered(result);
  }, [members, search, roleFilter, statusFilter]);

  const handleRoleChange = async (id: string, role: Member['role']) => {
    setActionError('');
    try {
      await updateMemberRole(id, role);
      setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to update role');
    }
    setOpenMenu(null);
  };

  const handleToggleStatus = async (id: string) => {
    setActionError('');
    try {
      const result = await toggleMemberStatus(id);
      setMembers(prev =>
        prev.map(m => m.id === id ? { ...m, isActive: result.isActive } : m)
      );
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to toggle status');
    }
    setOpenMenu(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setActionError('');
    try {
      await deleteMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to delete member');
    }
    setOpenMenu(null);
  };

  const handleMemberCreated = (member: Member) => {
    setMembers(prev => [member, ...prev]);
  };

  const roles: Member['role'][] = ['student', 'member', 'instructor', 'admin'];

  if (loading) return <Loader text="Loading members..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Members</h1>
          <p>Manage registered members, roles, and access</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreate(true)}>
          <UserPlus size={18} />
          Add Member
        </button>
      </div>

      {actionError && (
        <div className={styles.actionError}>{actionError}</div>
      )}

      {showCreate && (
        <CreateMemberModal
          onClose={() => setShowCreate(false)}
          onCreated={handleMemberCreated}
        />
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or student ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="member">Member</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <p className={styles.count}>{filtered.length} member{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Student ID</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td>
                  <div className={styles.memberCell}>
                    <div className={styles.avatar}>{m.name.charAt(0)}{m.surname.charAt(0)}</div>
                    <div>
                      <div className={styles.name}>{m.name} {m.surname}</div>
                      <div className={styles.email}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className={styles.mono}>{m.studentId}</td>
                <td>
                  <span className={`${styles.roleBadge} ${styles[`role_${m.role}`]}`}>
                    {m.role}
                  </span>
                </td>
                <td>
                  <span className={`${styles.statusDot} ${m.isActive ? styles.dotActive : styles.dotInactive}`} />
                  {m.isActive ? 'Active' : 'Inactive'}
                </td>
                <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                <td>{m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : '—'}</td>
                <td className={styles.actions}>
                  <button className={styles.menuBtn} onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}>
                    <MoreVertical size={18} />
                  </button>
                  {openMenu === m.id && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownSection}>
                        <span className={styles.dropdownLabel}>Change Role</span>
                        {roles.map(r => (
                          <button key={r} className={`${styles.dropdownItem} ${m.role === r ? styles.dropdownItemActive : ''}`} onClick={() => handleRoleChange(m.id, r)}>
                            <Shield size={14} />
                            {r}
                          </button>
                        ))}
                      </div>
                      <div className={styles.dropdownDivider} />
                      <button className={styles.dropdownItem} onClick={() => handleToggleStatus(m.id)}>
                        {m.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        {m.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={() => handleDelete(m.id)}>
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className={styles.empty}>No members match your criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Members;
