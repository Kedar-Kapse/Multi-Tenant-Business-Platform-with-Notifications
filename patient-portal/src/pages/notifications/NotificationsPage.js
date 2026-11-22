import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiCalendar, FiFileText, FiDollarSign, FiMessageSquare, FiTrash2, FiXCircle } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, SkeletonList, Spinner } from '../../components/ui/States';
import { secondaryBtn } from '../../components/ui/form';
import { toast } from '../../components/ui/Toast';
import useBadgeStore from '../../store/badgeStore';
import { notificationApi } from '../../services/patientService';
import { errorMessage, formatDateTime, relativeTime } from '../../utils/format';

const PAGE_SIZE = 20;
const TYPES = [
  { value: '', label: 'All types' },
  { value: 'APPOINTMENT_BOOKED', label: 'Appointments booked' },
  { value: 'APPOINTMENT_CANCELLED', label: 'Appointments cancelled' },
  { value: 'MESSAGE_RECEIVED', label: 'Messages' },
  { value: 'NOTE_SIGNED', label: 'Visit notes' },
  { value: 'INVOICE_CREATED', label: 'Bills' },
];
const ICONS = {
  APPOINTMENT_BOOKED: { icon: FiCalendar, cls: 'text-primary-600' },
  APPOINTMENT_CANCELLED: { icon: FiXCircle, cls: 'text-warning-600' },
  MESSAGE_RECEIVED: { icon: FiMessageSquare, cls: 'text-primary-600' },
  NOTE_SIGNED: { icon: FiFileText, cls: 'text-success-600' },
  INVOICE_CREATED: { icon: FiDollarSign, cls: 'text-warning-600' },
};
// Only follow links to pages that exist in this portal.
const ROUTES = ['/appointments', '/messages', '/notes', '/billing', '/records', '/profile', '/providers'];
const safeLink = (link) => (typeof link === 'string' && ROUTES.some((r) => link === r || link.startsWith(`${r}/`) || link.startsWith(`${r}?`)) ? link : null);

export default function NotificationsPage() {
  const navigate = useNavigate();
  const unreadCount = useBadgeStore((s) => s.notifications);
  const refreshBadge = useBadgeStore((s) => s.refreshNotifications);
  const [filter, setFilter] = useState('all');
  const [type, setType] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const reqId = useRef(0);

  const fetchPage = useCallback(async (p) => {
    const id = ++reqId.current;
    if (p === 0) { setLoading(true); setError(null); } else setLoadingMore(true);
    try {
      const data = await notificationApi.list({ unreadOnly: filter === 'unread', type: type || undefined, page: p, size: PAGE_SIZE });
      if (id !== reqId.current) return;
      const content = data?.content || [];
      setItems((prev) => (p === 0 ? content : [...prev, ...content.filter((n) => !prev.some((x) => x.id === n.id))]));
      setPage(p);
      setHasMore(data ? !data.last : false);
    } catch (err) {
      if (id !== reqId.current) return;
      if (p === 0) setError(errorMessage(err, 'Could not load notifications.'));
      else toast.error(errorMessage(err, 'Could not load more notifications.'));
    } finally {
      if (id === reqId.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [filter, type]);

  useEffect(() => { fetchPage(0); refreshBadge(); }, [fetchPage, refreshBadge]);

  const markRead = async (n) => {
    if (n.read) return true;
    try {
      await notificationApi.markRead(n.id);
      setItems((prev) => (filter === 'unread' ? prev.filter((x) => x.id !== n.id) : prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))));
      refreshBadge();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not mark it as read.'));
      return false;
    }
  };

  const open = async (n) => {
    if (busyId) return;
    setBusyId(n.id);
    await markRead(n);
    setBusyId(null);
    const link = safeLink(n.link);
    if (link) navigate(link);
  };

  const remove = async (n) => {
    if (busyId) return;
    setBusyId(n.id);
    try {
      await notificationApi.remove(n.id);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      refreshBadge();
      toast.success('Notification removed.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove the notification.'));
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      setItems((prev) => (filter === 'unread' ? [] : prev.map((x) => ({ ...x, read: true }))));
      useBadgeStore.getState().setNotifications(0);
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not mark all as read.'));
    } finally {
      setMarkingAll(false);
      refreshBadge();
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
        actions={unreadCount > 0 && (
          <button type="button" onClick={markAll} disabled={markingAll} className={secondaryBtn}>
            {markingAll ? <Spinner size="sm" /> : <FiCheck size={14} />} Mark all read
          </button>
        )}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <Tabs tabs={[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread', count: unreadCount || undefined }]} activeKey={filter} onChange={setFilter} />
        <div className="sm:w-56"><Select name="type" value={type} onChange={(e) => setType(e.target.value)} options={TYPES} aria-label="Filter by type" /></div>
      </div>

      {error ? (
        <Card><ErrorState message={error} onRetry={() => fetchPage(0)} /></Card>
      ) : loading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <Card><EmptyState icon={FiBell} title={filter === 'unread' ? 'No unread notifications' : 'No notifications'} description="Updates about your appointments, messages, notes and bills appear here." /></Card>
      ) : (
        <Card>
          <ul className="divide-y divide-secondary-100 dark:divide-secondary-800">
            {items.map((n) => {
              const meta = ICONS[n.type] || { icon: FiBell, cls: 'text-secondary-500' };
              const Icon = meta.icon;
              return (
                <li key={n.id} className={`flex items-start gap-1 pr-2 ${!n.read ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}>
                  <button type="button" onClick={() => open(n)} disabled={busyId === n.id} className="flex-1 min-w-0 text-left px-3.5 sm:px-5 py-3.5 flex items-start gap-3 hover:bg-secondary-50/60 dark:hover:bg-secondary-800/40 transition disabled:opacity-60">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-secondary-100 dark:bg-secondary-800' : 'bg-white dark:bg-secondary-800 shadow-sm'}`}>
                      <Icon className={meta.cls} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!n.read ? 'font-semibold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-300'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" aria-label="Unread" />}
                      </div>
                      {n.body && <p className="text-xs text-secondary-500 mt-0.5 line-clamp-2 break-words">{n.body}</p>}
                      <p className="text-[10px] text-secondary-400 mt-1" title={formatDateTime(n.createdAt)}>{relativeTime(n.createdAt)}</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => remove(n)} disabled={busyId === n.id} aria-label="Remove notification" className="mt-3 p-2 rounded-lg text-secondary-300 hover:text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition flex-shrink-0 disabled:opacity-50">
                    <FiTrash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="p-3 border-t border-secondary-100 dark:border-secondary-800 text-center">
              <button type="button" onClick={() => fetchPage(page + 1)} disabled={loadingMore} className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline disabled:opacity-50">
                {loadingMore && <Spinner size="sm" />} Load more
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
