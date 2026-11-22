import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiCalendar, FiFileText, FiMessageSquare, FiXCircle, FiDollarSign, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ErrorState, LoadingState, PageHeader, Spinner } from '../../components/ui/States';
import { notificationApi } from '../../services/providerService';
import useBadgeStore from '../../store/badgeStore';
import { errorMessage } from '../../utils/errors';
import { formatDateTime, timeAgo } from '../../utils/format';
import { btnSecondary } from '../../utils/styles';
import cn from '../../utils/cn';

const PAGE_SIZE = 20;
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'APPOINTMENT_BOOKED', label: 'Booked' },
  { key: 'APPOINTMENT_CANCELLED', label: 'Cancelled' },
  { key: 'MESSAGE_RECEIVED', label: 'Messages' },
  { key: 'NOTE_SIGNED', label: 'Notes' },
  { key: 'INVOICE_CREATED', label: 'Billing' },
];
const ICONS = {
  APPOINTMENT_BOOKED: { icon: FiCalendar, cls: 'text-primary-600 dark:text-primary-400' },
  APPOINTMENT_CANCELLED: { icon: FiXCircle, cls: 'text-urgent-600 dark:text-urgent-400' },
  MESSAGE_RECEIVED: { icon: FiMessageSquare, cls: 'text-primary-600 dark:text-primary-400' },
  NOTE_SIGNED: { icon: FiFileText, cls: 'text-success-600 dark:text-success-400' },
  INVOICE_CREATED: { icon: FiDollarSign, cls: 'text-warning-600 dark:text-warning-400' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const unreadCount = useBadgeStore((s) => s.notifications);
  const refreshBadge = useBadgeStore((s) => s.refreshNotifications);

  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null); // id being changed, or 'all'
  const reqId = useRef(0);

  const query = useCallback((p) => notificationApi.list({
    unreadOnly: filter === 'unread',
    type: filter !== 'all' && filter !== 'unread' ? filter : undefined,
    page: p,
    size: PAGE_SIZE,
  }), [filter]);

  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await query(0);
      if (my !== reqId.current) return;
      setItems(data?.content || []);
      setPage(0);
      setTotalPages(data?.totalPages || 0);
    } catch (err) {
      if (my === reqId.current) setLoadError(errorMessage(err, 'Could not load notifications.'));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
    refreshBadge();
  }, [query, refreshBadge]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (loadingMore) return;
    const my = reqId.current;
    setLoadingMore(true);
    try {
      const data = await query(page + 1);
      if (my !== reqId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...(data?.content || []).filter((n) => !seen.has(n.id))];
      });
      setPage(page + 1);
      setTotalPages(data?.totalPages || 0);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load more notifications.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (n) => {
    if (n.read) return true;
    try {
      await notificationApi.markRead(n.id);
      setItems((prev) => (filter === 'unread' ? prev.filter((x) => x.id !== n.id) : prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))));
      refreshBadge();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not mark as read.'));
      return false;
    }
  };

  const open = async (n) => {
    if (busy) return;
    setBusy(n.id);
    await markRead(n);
    setBusy(null);
    if (n.link && n.link.startsWith('/')) navigate(n.link);
  };

  const markAllRead = async () => {
    if (busy) return;
    setBusy('all');
    try {
      await notificationApi.markAllRead();
      toast.success('All notifications marked as read');
      if (filter === 'unread') setItems([]);
      else setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      refreshBadge();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not mark all as read.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (e, n) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(n.id);
    try {
      await notificationApi.remove(n.id);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      if (!n.read) refreshBadge();
      toast.success('Notification removed');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove the notification.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
        actions={(
          <>
            <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400"><FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} disabled={!!busy} className={btnSecondary}>
                {busy === 'all' ? <Spinner size="sm" /> : <FiCheck size={14} />} Mark all read
              </button>
            )}
          </>
        )}
      />

      <Tabs
        tabs={FILTERS.map((f) => (f.key === 'unread' ? { ...f, count: unreadCount || undefined } : f))}
        activeKey={filter}
        onChange={setFilter}
      />

      <Card>
        {loadError ? <ErrorState title="Could not load notifications" message={loadError} onRetry={load} />
          : loading && items.length === 0 ? <LoadingState />
            : items.length === 0 ? (
              <EmptyState icon={FiBell} title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                description="Bookings, cancellations and new messages will show up here." />
            ) : (
              <ul className={cn('divide-y divide-secondary-100 dark:divide-secondary-800 transition-opacity', loading && 'opacity-60')}>
                {items.map((n) => {
                  const meta = ICONS[n.type] || { icon: FiBell, cls: 'text-secondary-500' };
                  const Icon = meta.icon;
                  return (
                    <li key={n.id} className={cn('group flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 transition hover:bg-secondary-50/60 dark:hover:bg-secondary-800/30', !n.read && 'bg-primary-50/40 dark:bg-primary-900/10')}>
                      <button type="button" onClick={() => open(n)} disabled={busy === n.id} className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 text-left">
                        <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', n.read ? 'bg-secondary-100 dark:bg-secondary-800' : 'bg-primary-100 dark:bg-primary-900/30')}>
                          <Icon className={meta.cls} size={16} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className={cn('text-sm truncate', !n.read ? 'font-semibold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-300')}>{n.title}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" aria-label="Unread" />}
                          </span>
                          {n.body && <span className="block text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 break-words">{n.body}</span>}
                          <span className="block text-[11px] text-secondary-400 mt-1" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                        </span>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.read && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); markRead(n); }} disabled={!!busy} aria-label="Mark as read" title="Mark as read"
                            className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"><FiCheck size={14} /></button>
                        )}
                        <button type="button" onClick={(e) => remove(e, n)} disabled={!!busy} aria-label="Delete notification" title="Delete"
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition">
                          {busy === n.id ? <Spinner size="sm" /> : <FiTrash2 size={14} />}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        {page + 1 < totalPages && !loadError && (
          <div className="px-4 py-3 border-t border-secondary-100 dark:border-secondary-800 text-center">
            <button type="button" onClick={loadMore} disabled={loadingMore} className={btnSecondary}>
              {loadingMore ? <><Spinner size="sm" /> Loading…</> : 'Load more'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
