import { useState, useEffect, useCallback } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiMail, FiMessageSquare, FiAlertCircle } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import notificationService from '../../services/notificationService';
import useNotificationStore from '../../store/notificationStore';
import { formatRelativeTime } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'system', label: 'System' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const { markAsRead, markAllRead, clearAll } = useNotificationStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getAll({ type: tab !== 'all' ? tab : undefined });
      setNotifications(Array.isArray(data) ? data : data?.content || []);
    } catch {
      // Fallback to store notifications
      setNotifications(useNotificationStore.getState().notifications);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'alerts') return n.type === 'alert' || n.severity === 'critical' || n.severity === 'warning';
    if (tab === 'system') return n.type === 'system';
    return true;
  });

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
    } catch { /* continue with local update */ }
    markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.delete(id);
    } catch { /* continue with local removal */ }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    clearAll();
    setNotifications([]);
    toast.info('All notifications cleared');
  };

  const getIcon = (type, severity) => {
    if (severity === 'critical' || severity === 'danger') return <FiAlertCircle className="text-urgent-500" size={16} />;
    if (severity === 'warning') return <FiAlertCircle className="text-warning-500" size={16} />;
    if (type === 'email') return <FiMail className="text-primary-500" size={16} />;
    if (type === 'sms') return <FiMessageSquare className="text-success-500" size={16} />;
    return <FiBell className="text-secondary-400" size={16} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-secondary-500 mt-0.5">System alerts, messages, and campaign updates.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm transition">
            <FiCheckCircle size={14} /> Mark all read
          </button>
          <button onClick={handleClearAll} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-urgent-200 dark:border-urgent-800 text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-sm transition">
            <FiTrash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      <Tabs tabs={TABS.map((t) => ({ ...t, count: t.key === 'unread' ? filtered.filter((n) => !n.read).length : undefined }))} activeKey={tab} onChange={setTab} />

      <Card>
        {loading ? (
          <div className="p-12 text-center text-secondary-400">Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FiBell} title="No notifications" description={tab === 'unread' ? "You're all caught up!" : 'No notifications to display.'} />
        ) : (
          <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
            {filtered.map((n) => (
              <div key={n.id} className={`px-5 py-4 flex items-start gap-3 transition-colors hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30 ${!n.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}>
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(n.type, n.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm leading-relaxed ${!n.read ? 'font-medium text-secondary-900 dark:text-white' : 'text-secondary-600 dark:text-secondary-400'}`}>
                        {n.title || n.msg || n.message}
                      </p>
                      {n.body && <p className="text-xs text-secondary-500 mt-0.5">{n.body}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.read && (
                        <button onClick={() => handleMarkRead(n.id)} className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400 hover:text-primary-600 transition" title="Mark as read">
                          <FiCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} className="p-1 rounded hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-secondary-400 hover:text-urgent-600 transition" title="Delete">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-secondary-400">{formatRelativeTime(n.timestamp || n.createdAt)}</span>
                    {n.severity && <Badge variant={n.severity === 'critical' ? 'danger' : n.severity === 'warning' ? 'warning' : 'info'}>{n.severity}</Badge>}
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
