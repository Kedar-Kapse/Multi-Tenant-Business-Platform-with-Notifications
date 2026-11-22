import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell, FiCheck, FiCheckCircle, FiTrash2, FiMessageSquare, FiCalendar, FiFileText, FiDollarSign, FiRefreshCw,
} from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import notificationService from '../../services/notificationService';
import useNotificationStore from '../../store/notificationStore';
import { formatRelativeTime } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

const PAGE_SIZE = 20;
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'MESSAGE_RECEIVED', label: 'Messages' },
  { key: 'APPOINTMENT', label: 'Appointments' },
];

const TYPE_ICON = {
  MESSAGE_RECEIVED: { icon: FiMessageSquare, cls: 'text-primary-500' },
  APPOINTMENT_BOOKED: { icon: FiCalendar, cls: 'text-success-600' },
  APPOINTMENT_CANCELLED: { icon: FiCalendar, cls: 'text-urgent-500' },
  NOTE_SIGNED: { icon: FiFileText, cls: 'text-primary-600' },
  INVOICE_CREATED: { icon: FiDollarSign, cls: 'text-warning-600' },
};

/** Links the admin portal can open (notifications are shared across portals). */
const ADMIN_ROUTES = ['/messages', '/patients', '/claims', '/staff'];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const refreshBell = useNotificationStore((s) => s.refresh);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback(async (p) => {
    const params = { page: p, size: PAGE_SIZE };
    if (tab === 'unread') params.unreadOnly = true;
    else if (tab === 'MESSAGE_RECEIVED') params.type = 'MESSAGE_RECEIVED';
    const data = await notificationService.getAll(params);
    let rows = data.content || [];
    if (tab === 'APPOINTMENT') rows = rows.filter((n) => n.type?.startsWith('APPOINTMENT'));
    return { rows, last: data.number >= data.totalPages - 1 };
  }, [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows, last } = await fetchPage(0);
      setItems(rows);
      setPage(0);
      setHasMore(!last);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    setBusy(true);
    try {
      const { rows, last } = await fetchPage(page + 1);
      setItems((prev) => [...prev, ...rows]);
      setPage(page + 1);
      setHasMore(!last);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load more notifications');
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (n) => {
    try {
      await notificationService.markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      refreshBell();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not mark as read');
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      const { updated } = await notificationService.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      refreshBell();
      toast.success(updated ? `Marked ${updated} as read` : 'Nothing unread');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not mark all as read');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n) => {
    try {
      await notificationService.delete(n.id);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      refreshBell();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not delete notification');
    }
  };

  const open = (n) => {
    if (!n.read) markRead(n);
    if (n.link && ADMIN_ROUTES.includes(n.link)) navigate(n.link);
  };

  const unreadShown = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-secondary-500 mt-0.5">Messages and activity that concern you.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} title="Refresh"
            className="p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-500 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition disabled:opacity-50">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={markAll} disabled={busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm transition disabled:opacity-50">
            <FiCheckCircle size={14} /> Mark all read
          </button>
        </div>
      </div>

      <Tabs tabs={TABS.map((t) => ({ ...t, count: t.key === 'unread' && tab === 'unread' ? unreadShown : undefined }))} activeKey={tab} onChange={setTab} />

      <Card>
        {loading ? (
          <div className="p-12 text-center text-secondary-400 text-sm">Loading notifications…</div>
        ) : error ? (
          <EmptyState icon={FiBell} title="Couldn't load notifications" description={error}
            action={<button onClick={load} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm">Try again</button>} />
        ) : items.length === 0 ? (
          <EmptyState icon={FiBell} title="No notifications" description={tab === 'unread' ? "You're all caught up." : 'Nothing here yet.'} />
        ) : (
          <>
            <ul className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {items.map((n) => {
                const meta = TYPE_ICON[n.type] || { icon: FiBell, cls: 'text-secondary-400' };
                const Icon = meta.icon;
                return (
                  <li key={n.id} className={`px-4 sm:px-5 py-4 flex items-start gap-3 transition-colors hover:bg-secondary-50/60 dark:hover:bg-secondary-800/30 ${!n.read ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}>
                    <Icon size={16} className={`mt-0.5 flex-shrink-0 ${meta.cls}`} />
                    <button type="button" onClick={() => open(n)} className="flex-1 min-w-0 text-left">
                      <p className={`text-sm truncate ${!n.read ? 'font-semibold text-secondary-900 dark:text-white' : 'text-secondary-700 dark:text-secondary-300'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 line-clamp-2 break-words">{n.body}</p>}
                      <p className="text-[11px] text-secondary-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.read && (
                        <button onClick={() => markRead(n)} title="Mark as read"
                          className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400 hover:text-primary-600 transition">
                          <FiCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => remove(n)} title="Delete"
                        className="p-1.5 rounded-lg hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-secondary-400 hover:text-urgent-600 transition">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="p-3 border-t border-secondary-100 dark:border-secondary-700/50 text-center">
                <button onClick={loadMore} disabled={busy}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50">
                  {busy ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
