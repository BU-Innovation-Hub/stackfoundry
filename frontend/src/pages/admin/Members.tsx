import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, MoreVertical, UserCheck, UserX, Trash2, Shield, UserPlus, Pencil } from 'lucide-react';
import { Member } from '../../types/admin';
import { getMembers, updateMemberRole, toggleMemberStatus, deleteMember } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import Pagination, { PaginationMeta } from '../../components/common/Pagination';
import CreateMemberModal from './CreateMember';
import EditMemberModal from './EditMember';
import styles from './Members.module.css';

const emptyMeta: PaginationMeta = { page: 1, limit: 25, total: 0, pages: 0, hasNext: false, hasPrevious: false };

const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [actionError, setActionError] = useState<string>('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    setActionError('');
    try {
      const result = await getMembers({
        page: targetPage,
        limit,
        search,
        role: roleFilter,
        status: statusFilter,
      });
      setMembers(result.data);
      setMeta(result.pagination);
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const resetPage = () => setPage(1);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(resetPage, 350);
  };

  const handleRoleChange = async (id: string, role: Member['role']) => {
    setActionError('');
    try {
      const updated = await updateMemberRole(id, role);
      setMembers(prev =>
        prev.map(m =>
          m.id === id
            ? { ...m, role: updated.role, isActive: updated.isActive }
            : m
        )
      );
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
      load();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to delete member');
    }
    setOpenMenu(null);
  };

  const handleMemberCreated = () => { load(); };
  const handleMemberUpdated = () => { load(); };

  // system_admin is intentionally excluded — it cannot be assigned via role management
  const roles: Member['role'][] = ['student', 'innovation_hub_admin', 'mentor', 'member'];

  if (loading && members.length === 0) return <Loader text="Loading members..." />;

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

      {editTarget && (
        <EditMemberModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={handleMemberUpdated}
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
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); resetPage(); }}>
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="member">Member</option>
            <option value="system_admin">System Administrator</option>
            <option value="innovation_hub_admin">Innovation Hub Administrator</option>
            <option value="mentor">Mentor</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <p className={styles.count}>{meta.total} member{meta.total !== 1 ? 's' : ''} found</p>

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
            {members.map(m => (
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
                <td className={styles.mono}>{m.studentId || '—'}</td>
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
                      <button className={styles.dropdownItem} onClick={() => { setEditTarget(m); setOpenMenu(null); }}>
                        <Pencil size={14} />
                        Edit Profile
                      </button>
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
            {members.length === 0 && (
              <tr><td colSpan={7} className={styles.empty}>No members match your criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        meta={meta}
        onPageChange={setPage}
        onPageSizeChange={(l) => { setLimit(l); setPage(1); }}
      />
    </div>
  );
};

export default Members;
