import { useState, useEffect, useCallback } from 'react';
import { FiBell, FiCheck, FiCalendar, FiFileText, FiDollarSign, FiAlertTriangle, FiInfo, FiMessageSquare } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import useAuthStore from '../../store/authStore';
import { appointmentApi, invoiceApi, documentApi, messageApi } from '../../services/patientService';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const PID = user?.sub || 'PAT-001';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Build notifications from real data sources
  const load = useCallback(async () => {
    setLoading(true);
    const notifs = [];
    const now = Date.now();

    const [apptRes, invRes, docRes, msgRes] = await Promise.allSettled([
      appointmentApi.getAll(PID),
      invoiceApi.getAll(PID),
      documentApi.getAll(PID),
      messageApi.getUnread(PID),
    ]);

    // Appointment notifications
    if (apptRes.status === 'fulfilled' && Array.isArray(apptRes.value)) {
      apptRes.value.forEach((a, i) => {
        if (a.status === 'SCHEDULED') {
          notifs.push({ id: `appt-${i}`, type: 'appointment', title: 'Upcoming Appointment',
            message: `${a.type?.replace('_',' ')} with ${a.providerName} on ${new Date(a.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${a.startTime?.substring(0, 5)}`,
            time: a.createdAt || new Date(now - i * 86400000).toISOString(), read: i > 0, severity: 'info' });
        }
        if (a.status === 'COMPLETED' && a.notes) {
          notifs.push({ id: `note-${i}`, type: 'document', title: 'Visit Notes Available',
            message: `Clinical notes from your ${a.type?.replace('_',' ')} with ${a.providerName} are available.`,
            time: a.updatedAt || new Date(now - (i + 3) * 86400000).toISOString(), read: true, severity: 'success' });
        }
        if (a.status === 'CANCELLED') {
          notifs.push({ id: `cancel-${i}`, type: 'appointment', title: 'Appointment Cancelled',
            message: `Your ${a.type?.replace('_',' ')} with ${a.providerName} has been cancelled.`,
            time: a.updatedAt || new Date(now - (i + 5) * 86400000).toISOString(), read: true, severity: 'warning' });
        }
      });
    }

    // Invoice notifications
    if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
      invRes.value.forEach((inv, i) => {
        if (inv.status === 'PENDING') {
          notifs.push({ id: `inv-${i}`, type: 'billing', title: 'Invoice Generated',
            message: `${inv.invoiceNumber} — ${inv.description} — ₹${Number(inv.amount).toLocaleString('en-IN')}`,
            time: inv.createdAt || new Date(now - (i + 1) * 86400000).toISOString(), read: i > 0, severity: 'warning' });
        }
        if (inv.status === 'OVERDUE') {
          notifs.push({ id: `overdue-${i}`, type: 'billing', title: 'Payment Overdue',
            message: `${inv.invoiceNumber} for ₹${Number(inv.amount).toLocaleString('en-IN')} is overdue. Due date: ${inv.dueDate}`,
            time: inv.createdAt || new Date(now - (i + 7) * 86400000).toISOString(), read: false, severity: 'danger' });
        }
        if (inv.status === 'PAID') {
          notifs.push({ id: `paid-${i}`, type: 'billing', title: 'Payment Confirmed',
            message: `Payment of ₹${Number(inv.paidAmount).toLocaleString('en-IN')} received for ${inv.invoiceNumber}`,
            time: inv.updatedAt || new Date(now - (i + 10) * 86400000).toISOString(), read: true, severity: 'success' });
        }
      });
    }

    // Document notifications
    if (docRes.status === 'fulfilled' && Array.isArray(docRes.value)) {
      docRes.value.slice(0, 5).forEach((doc, i) => {
        notifs.push({ id: `doc-${i}`, type: 'document', title: `${doc.category} Uploaded`,
          message: `${doc.fileName} — ${doc.description || 'New document available'}`,
          time: doc.uploadedAt || new Date(now - (i + 2) * 86400000).toISOString(), read: i > 1, severity: 'success' });
      });
    }

    // Message notifications
    if (msgRes.status === 'fulfilled' && Array.isArray(msgRes.value)) {
      msgRes.value.forEach((msg, i) => {
        notifs.push({ id: `msg-${i}`, type: 'message', title: `Message from ${msg.senderName}`,
          message: msg.subject,
          time: msg.sentAt || new Date(now - i * 3600000).toISOString(), read: msg.read, severity: 'info' });
      });
    }

    // Sort by time descending
    notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
    setNotifications(notifs);
    setLoading(false);
  }, [PID]);

  useEffect(() => { load(); }, [load]);

  const formatTime = (iso) => {
    const d = Date.now() - new Date(iso).getTime();
    if (d < 60000) return 'Just now';
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return `${Math.floor(d / 86400000)}d ago`;
  };

  const markRead = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));
  const unread = notifications.filter(n => !n.read).length;
  const filtered = notifications.filter(n => filter === 'all' || (filter === 'unread' && !n.read) || n.type === filter);

  const icons = { appointment: FiCalendar, document: FiFileText, billing: FiDollarSign, message: FiMessageSquare, alert: FiAlertTriangle };
  const sevColors = { info: 'text-blue-500', warning: 'text-amber-500', danger: 'text-urgent-500', success: 'text-emerald-500' };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Notifications</h1>
          <p className="text-xs sm:text-sm text-secondary-500">{unread > 0 ? `${unread} unread` : 'All caught up!'}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 text-sm text-secondary-600 hover:bg-secondary-50 transition">
            <FiCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl p-1 w-fit overflow-x-auto">
        {[{ k: 'all', l: 'All' }, { k: 'unread', l: 'Unread' }, { k: 'appointment', l: 'Appointments' }, { k: 'billing', l: 'Billing' }, { k: 'document', l: 'Documents' }, { k: 'message', l: 'Messages' }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${filter === f.k ? 'bg-white dark:bg-secondary-700 shadow-sm' : 'text-secondary-500'}`}>{f.l}</button>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
          {loading ? (
            <div className="px-5 py-12 text-center text-secondary-400"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Loading notifications...</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-secondary-400"><FiBell size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No notifications</p></div>
          ) : filtered.map(n => {
            const Icon = icons[n.type] || FiBell;
            return (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`px-5 py-4 flex items-start gap-4 cursor-pointer transition hover:bg-secondary-50/50 ${!n.read ? 'bg-primary-50/30' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-secondary-100 dark:bg-secondary-800' : 'bg-primary-100 dark:bg-primary-900/30'}`}>
                  <Icon className={sevColors[n.severity] || 'text-secondary-500'} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-secondary-900' : 'font-medium text-secondary-700'} dark:text-white`}>{n.title}</p>
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
