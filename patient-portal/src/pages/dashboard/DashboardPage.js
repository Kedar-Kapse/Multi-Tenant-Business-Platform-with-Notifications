import { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiFileText, FiDollarSign, FiMessageSquare, FiArrowRight, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import { appointmentApi, invoiceApi, messageApi, documentApi } from '../../services/patientService';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const PATIENT_ID = user?.sub || 'PAT-001';
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const [upcoming, setUpcoming] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [appts, invs, msgs, docs] = await Promise.allSettled([
      appointmentApi.getUpcoming(PATIENT_ID), invoiceApi.getAll(PATIENT_ID),
      messageApi.unreadCount(PATIENT_ID), documentApi.getAll(PATIENT_ID)
    ]);
    setUpcoming(appts.status === 'fulfilled' ? appts.value : []);
    setInvoices(invs.status === 'fulfilled' ? invs.value : []);
    setUnreadMsgs(msgs.status === 'fulfilled' ? msgs.value?.count || 0 : 0);
    setDocCount(docs.status === 'fulfilled' ? (Array.isArray(docs.value) ? docs.value.length : 0) : 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
  const totalDue = pendingInvoices.reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div><h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{greeting}, {user?.firstName || 'Patient'}</h1><p className="text-sm text-secondary-500 mt-0.5">Here's your health overview.</p></div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-400 transition"><FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Upcoming Appts" value={upcoming.length} icon={FiCalendar} color="blue" />
        <StatCard title="Medical Records" value={docCount} icon={FiFileText} color="purple" />
        <StatCard title="Pending Bills" value={`₹${totalDue.toLocaleString('en-IN')}`} icon={FiDollarSign} color="amber" subtitle={`${pendingInvoices.length} invoices`} />
        <StatCard title="Unread Messages" value={unreadMsgs} icon={FiMessageSquare} color="teal" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader title="Upcoming Appointments" subtitle={`${upcoming.length} scheduled`} action={<button onClick={() => navigate('/appointments')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">View all <FiArrowRight size={12} /></button>} />
          <div className="divide-y divide-secondary-50 dark:divide-secondary-800">
            {upcoming.length === 0 ? <div className="px-5 py-8 text-center text-secondary-400 text-sm">No upcoming appointments</div>
            : upcoming.slice(0, 4).map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-secondary-50/50 transition">
                <div className="text-center w-14 flex-shrink-0 bg-primary-50 dark:bg-primary-900/20 rounded-lg py-2">
                  <p className="text-[10px] font-bold text-primary-600 uppercase">{new Date(a.appointmentDate).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-lg font-bold text-primary-700">{new Date(a.appointmentDate).getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">{a.providerName}</p>
                  <p className="text-xs text-secondary-500">{a.providerSpecialty} — {a.startTime?.substring(0, 5)}</p>
                  <p className="text-xs text-secondary-400 mt-0.5">{a.reason}</p>
                </div>
                <Badge variant={a.mode === 'TELEHEALTH' ? 'info' : 'teal'}>{a.mode === 'TELEHEALTH' ? 'Video' : 'In-Person'}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader title="Recent Bills" subtitle={`${pendingInvoices.length} pending`} action={<button onClick={() => navigate('/billing')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">View all <FiArrowRight size={12} /></button>} />
          <div className="divide-y divide-secondary-50 dark:divide-secondary-800">
            {invoices.length === 0 ? <div className="px-5 py-8 text-center text-secondary-400 text-sm">No invoices</div>
            : invoices.slice(0, 4).map(inv => (
              <div key={inv.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary-50/50 transition">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">{inv.description}</p>
                  <p className="text-xs text-secondary-500">{inv.providerName} — {inv.issueDate}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-secondary-900 dark:text-white">₹{Number(inv.amount).toLocaleString('en-IN')}</p>
                  <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'} dot>{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
          {[{ l: 'Book Appointment', i: FiCalendar, p: '/appointments', c: 'bg-blue-50 text-blue-600' },
            { l: 'Medical Records', i: FiFileText, p: '/records', c: 'bg-purple-50 text-purple-600' },
            { l: 'Pay Bills', i: FiDollarSign, p: '/billing', c: 'bg-amber-50 text-amber-600' },
            { l: 'Message Doctor', i: FiMessageSquare, p: '/messages', c: 'bg-teal-50 text-teal-600' }
          ].map(a => (
            <button key={a.p} onClick={() => navigate(a.p)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md transition">
              <div className={`w-10 h-10 rounded-xl ${a.c} flex items-center justify-center`}><a.i size={18} /></div>
              <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{a.l}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
