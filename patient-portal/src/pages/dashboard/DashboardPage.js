import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCalendar, FiFileText, FiDollarSign, FiMessageSquare, FiArrowRight, FiRefreshCw, FiVideo, FiMapPin } from 'react-icons/fi';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { ErrorState } from '../../components/ui/States';
import useAuthStore from '../../store/authStore';
import useBadgeStore from '../../store/badgeStore';
import { appointmentApi, invoiceApi, clinicalNoteApi } from '../../services/patientService';
import { dateChip, formatTime, formatServerDate, humanize, errorMessage } from '../../utils/format';

const settled = (r) => (r.status === 'fulfilled' ? { data: r.value, error: null } : { data: null, error: errorMessage(r.reason) });

export default function DashboardPage() {
  const firstName = useAuthStore((s) => s.user?.firstName);
  const unreadMsgs = useBadgeStore((s) => s.messages);
  const refreshMessages = useBadgeStore((s) => s.refreshMessages);
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [state, setState] = useState({ loading: true, upcoming: null, invoices: null, notes: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const [appts, invs, notes] = await Promise.allSettled([
      appointmentApi.upcoming(), invoiceApi.summary(), clinicalNoteApi.mine(), refreshMessages(),
    ]);
    setState({ loading: false, upcoming: settled(appts), invoices: settled(invs), notes: settled(notes) });
  }, [refreshMessages]);

  useEffect(() => { load(); }, [load]);

  const { loading, upcoming, invoices, notes } = state;
  const upcomingList = Array.isArray(upcoming?.data) ? upcoming.data : [];
  const notesList = Array.isArray(notes?.data) ? notes.data : [];
  const inv = invoices?.data || {};
  const openBills = (Number(inv.pending) || 0) + (Number(inv.partiallyPaid) || 0) + (Number(inv.overdue) || 0);
  const next = upcomingList[0];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white truncate">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Here's your health overview.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} aria-label="Refresh" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition disabled:opacity-50"><FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Upcoming" value={upcoming?.error ? '—' : upcomingList.length} subtitle="appointments" icon={FiCalendar} color="primary" loading={loading && !upcoming} onClick={() => navigate('/appointments')} />
        <StatCard title="Open bills" value={invoices?.error ? '—' : openBills} subtitle={Number(inv.overdue) > 0 ? `${inv.overdue} overdue` : 'invoices'} icon={FiDollarSign} color={Number(inv.overdue) > 0 ? 'urgent' : 'warning'} loading={loading && !invoices} onClick={() => navigate('/billing')} />
        <StatCard title="Unread" value={unreadMsgs} subtitle="messages" icon={FiMessageSquare} color="primary" onClick={() => navigate('/messages')} />
        <StatCard title="Visit notes" value={notes?.error ? '—' : notesList.length} subtitle="signed" icon={FiFileText} color="neutral" loading={loading && !notes} onClick={() => navigate('/notes')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="min-w-0">
          <CardHeader
            title="Upcoming appointments"
            subtitle={next ? `Next: ${humanize(next.type)} with ${next.providerName}` : undefined}
            action={<Link to="/appointments" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 whitespace-nowrap">View all <FiArrowRight size={12} /></Link>}
          />
          {upcoming?.error ? <ErrorState message={upcoming.error} onRetry={load} />
            : loading && !upcoming ? <ListSkeleton />
            : upcomingList.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-secondary-400">No upcoming appointments.</p>
                <Link to="/appointments" state={{ book: true }} className="inline-block mt-3 text-sm font-medium text-primary-600 hover:underline">Book an appointment</Link>
              </div>
            ) : (
              <ul className="divide-y divide-secondary-100 dark:divide-secondary-800">
                {upcomingList.slice(0, 4).map((a) => {
                  const c = dateChip(a.appointmentDate);
                  return (
                    <li key={a.id} className="px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4">
                      <div className="text-center w-12 sm:w-14 flex-shrink-0 bg-primary-50 dark:bg-primary-900/20 rounded-lg py-1.5">
                        <p className="text-[10px] font-bold text-primary-600 uppercase">{c.month}</p>
                        <p className="text-lg font-bold text-primary-700 dark:text-primary-300 leading-tight">{c.day}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{a.providerName}</p>
                        <p className="text-xs text-secondary-500 truncate">{c.weekday}, {formatTime(a.startTime)} · {humanize(a.type)}</p>
                      </div>
                      <Badge variant={a.mode === 'TELEHEALTH' ? 'info' : 'gray'}>
                        {a.mode === 'TELEHEALTH' ? <><FiVideo size={10} /> Video</> : <><FiMapPin size={10} /> In person</>}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Recent visit notes"
            action={<Link to="/notes" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 whitespace-nowrap">View all <FiArrowRight size={12} /></Link>}
          />
          {notes?.error ? <ErrorState message={notes.error} onRetry={load} />
            : loading && !notes ? <ListSkeleton />
            : notesList.length === 0 ? <div className="px-5 py-8 text-center text-secondary-400 text-sm">No visit notes yet.</div>
            : (
              <ul className="divide-y divide-secondary-100 dark:divide-secondary-800">
                {notesList.slice(0, 4).map((n) => (
                  <li key={n.id}>
                    <Link to="/notes" state={{ noteId: n.id }} className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition">
                      <div className="w-9 h-9 rounded-lg bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center flex-shrink-0"><FiFileText className="text-secondary-500" size={16} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{n.title || 'Visit note'}</p>
                        <p className="text-xs text-secondary-500 truncate">{n.providerName} · {formatServerDate(n.signedAt)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Quick actions" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-5">
          {[
            { l: 'Book appointment', i: FiCalendar, p: '/appointments', s: { book: true } },
            { l: 'Find a provider', i: FiMapPin, p: '/providers' },
            { l: 'View bills', i: FiDollarSign, p: '/billing' },
            { l: 'Message care team', i: FiMessageSquare, p: '/messages', s: { compose: true } },
          ].map((a) => (
            <Link key={a.l} to={a.p} state={a.s} className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition text-center">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center"><a.i size={18} /></div>
              <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{a.l}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="p-4 space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-secondary-100 dark:bg-secondary-800 animate-pulse" />)}
    </div>
  );
}
