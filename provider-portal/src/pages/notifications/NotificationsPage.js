import { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiAlertTriangle, FiInfo, FiUser, FiCalendar, FiFileText } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const now = new Date();
    setNotifications([
      { id: 1, type: 'appointment', title: 'Upcoming Appointment', message: 'Consultation with Rahul Sharma at 10:00 AM today', time: new Date(now - 600000).toISOString(), read: false, severity: 'info' },
      { id: 2, type: 'alert', title: 'Lab Results Available', message: 'CBC and CMP results for Sneha Kulkarni are ready for review', time: new Date(now - 1800000).toISOString(), read: false, severity: 'warning' },
      { id: 3, type: 'system', title: 'Schedule Update', message: 'Your afternoon schedule has been updated — 2 new appointments added', time: new Date(now - 3600000).toISOString(), read: false, severity: 'info' },
      { id: 4, type: 'claim', title: 'Claim Approved', message: 'Claim CLM-2026-0007 for Ravi Menon has been approved — ₹22,000', time: new Date(now - 7200000).toISOString(), read: true, severity: 'success' },
      { id: 5, type: 'alert', title: 'Medication Alert', message: 'Potential drug interaction flagged for Vikram Singh — review prescription', time: new Date(now - 14400000).toISOString(), read: false, severity: 'danger' },
      { id: 6, type: 'system', title: 'MFA Reminder', message: 'Enable multi-factor authentication for enhanced security compliance', time: new Date(now - 28800000).toISOString(), read: true, severity: 'info' },
      { id: 7, type: 'note', title: 'Note Co-signed', message: 'Dr. Patel has co-signed your clinical note for patient Amit Patel', time: new Date(now - 43200000).toISOString(), read: true, severity: 'success' },
      { id: 8, type: 'appointment', title: 'Appointment Cancelled', message: 'Priya Chopra cancelled her 3:00 PM appointment for tomorrow', time: new Date(now - 86400000).toISOString(), read: true, severity: 'warning' },
      { id: 9, type: 'claim', title: 'Claim Denied', message: 'Claim CLM-2026-0006 denied — pre-authorization not obtained. Consider appeal.', time: new Date(now - 172800000).toISOString(), read: true, severity: 'danger' },
      { id: 10, type: 'system', title: 'Profile Updated', message: 'Your provider profile has been successfully updated', time: new Date(now - 259200000).toISOString(), read: true, severity: 'info' },
    ]);
  }, []);

  const formatTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => filter === 'all' || (filter === 'unread' && !n.read) || n.type === filter);

  const icons = { appointment: FiCalendar, alert: FiAlertTriangle, system: FiInfo, claim: FiFileText, note: FiFileText };
  const severityColors = { info: 'text-blue-500', warning: 'text-amber-500', danger: 'text-urgent-500', success: 'text-emerald-500' };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Notifications</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">{unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 dark:border-secondary-700 text-sm text-secondary-600 hover:bg-secondary-50 transition">
            <FiCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl p-1 w-fit overflow-x-auto">
        {[{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'appointment', label: 'Appointments' }, { key: 'alert', label: 'Alerts' }, { key: 'claim', label: 'Claims' }, { key: 'system', label: 'System' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${filter === f.key ? 'bg-white dark:bg-secondary-700 shadow-sm text-secondary-900 dark:text-white' : 'text-secondary-500'}`}>{f.label}</button>
        ))}
      </div>

      {/* Notification List */}
      <Card>
        <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-secondary-400"><FiBell size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No notifications</p></div>
          ) : filtered.map(n => {
            const Icon = icons[n.type] || FiBell;
            return (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`px-5 py-4 flex items-start gap-4 cursor-pointer transition hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30 ${!n.read ? 'bg-primary-50/30 dark:bg-primary-900/5' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-secondary-100 dark:bg-secondary-800' : 'bg-primary-100 dark:bg-primary-900/30'}`}>
                  <Icon className={severityColors[n.severity] || 'text-secondary-500'} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-secondary-900 dark:text-white' : 'font-medium text-secondary-700 dark:text-secondary-300'}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-secondary-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-secondary-400 mt-1">{formatTime(n.time)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
