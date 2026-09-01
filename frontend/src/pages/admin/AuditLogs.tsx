import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, Search, Calendar } from 'lucide-react';
import { api as apiClient } from '../../services/apiClient';
import Loader from '../../components/common/Loader';
import Pagination, { PaginationMeta } from '../../components/common/Pagination';
import styles from './AuditLogs.module.css';

interface AuditLog {
  _id: string;
  action: string;
  eventType: string;
  method?: string;
  route?: string;
  statusCode?: number;
  success: boolean;
  createdAt: string;
  actorId?: string;
  ipAddress?: string;
}

const emptyMeta: PaginationMeta = { page: 1, limit: 25, total: 0, pages: 0, hasNext: false, hasPrevious: false };

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [eventType, setEventType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const load = useCallback(async (resetPage = false) => {
    const targetPage = resetPage ? 1 : page;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: targetPage, limit };
      if (search.trim()) params.search = search.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (eventType !== 'all') params.eventType = eventType;

      const response = await apiClient.get('/audit-logs', { params });
      setLogs(response.data?.data?.logs || []);
      setMeta((response.data?.data?.pagination as PaginationMeta) || emptyMeta);
      if (resetPage) setPage(1);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, fromDate, toDate, eventType]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { load(true); };
  const handleFilterChange = () => { load(true); };

  const handlePageChange = (p: number) => { setPage(p); };
  const handlePageSizeChange = (l: number) => { setLimit(l); setPage(1); load(true); };

  const resetFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setEventType('all');
    setPage(1);
    setLimit(25);
  };

  if (loading && logs.length === 0) return <Loader text="Loading audit logs..." />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Audit Logs</h1>
          <p>Review system activity and security events</p>
        </div>
        <button className={styles.refreshBtn} onClick={() => load(false)} aria-label="Refresh audit logs">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search action, route, IP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className={styles.dateFilters}>
          <div className={styles.dateField}>
            <Calendar size={15} />
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); handleFilterChange(); }}
              aria-label="From date"
            />
          </div>
          <span className={styles.dateSep}>–</span>
          <div className={styles.dateField}>
            <Calendar size={15} />
            <input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); handleFilterChange(); }}
              aria-label="To date"
            />
          </div>
        </div>
        <select
          className={styles.typeSelect}
          value={eventType}
          onChange={e => { setEventType(e.target.value); handleFilterChange(); }}
          aria-label="Event type"
        >
          <option value="all">All Types</option>
          <option value="http">HTTP</option>
          <option value="business">Business</option>
        </select>
        <button className={styles.clearBtn} onClick={resetFilters}>Clear</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        {logs.length === 0 ? <p className={styles.empty}>No audit activity recorded.</p> : (
          <>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr><th>Action</th><th>Type</th><th>Request</th><th>Status</th><th>Result</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id}>
                      <td><span className={styles.action}><Activity size={15} />{log.action}</span></td>
                      <td>{log.eventType}</td>
                      <td>{log.method ? `${log.method} ${log.route || ''}` : log.actorId || 'System'}</td>
                      <td>{log.statusCode || '-'}</td>
                      <td><span className={log.success ? styles.success : styles.failed}>{log.success ? 'Success' : 'Failed'}</span></td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              meta={meta}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
