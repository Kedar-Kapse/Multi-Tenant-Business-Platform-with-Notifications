import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiCalendar, FiFileText, FiArrowRight, FiRefreshCw, FiMessageSquare, FiClock, FiVideo, FiMapPin, FiPlus } from 'react-icons/fi';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { ErrorState, LoadingState } from '../../components/ui/States';
import useAuthStore from '../../store/authStore';
import useBadgeStore from '../../store/badgeStore';
import { appointmentApi, notesApi, patientApi } from '../../services/providerService';
import { addDays, formatDate, formatTime, toYmd, todayYmd } from '../../utils/format';
import { typeLabel } from '../../constants/appointments';
import cn from '../../utils/cn';

const value = (r, pick) => (r.status === 'fulfilled' ? pick(r.value) : null);

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const unreadMessages = useBadgeStore((s) => s.messages);
  const refreshBadges = useBadgeStore((s) => s.refresh);
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const [state, setState] = useState({ loading: true, failed: false, appts: null, patients: null, notes: null });
  const reqId = useRef(0);
  const sub = user?.sub;

  const load = useCallback(async () => {
    if (!sub) return;
    const my = ++reqId.current;
    setState((s) => ({ ...s, loading: true, failed: false }));
    const today = new Date();
    const results = await Promise.allSettled([
      appointmentApi.list({ providerId: sub, from: toYmd(today), to: toYmd(addDays(today, 7)) }),
      patientApi.list({ mine: true, size: 1 }),
      notesApi.summary(),
      refreshBadges(),
    ]);
    if (my !== reqId.current) return;
    const [a, p, n] = results;
    setState({
      loading: false,
      failed: [a, p, n].every((r) => r.status === 'rejected'),
      appts: value(a, (v) => (Array.isArray(v) ? v : [])),
      patients: value(p, (v) => v?.totalElements ?? 0),
      notes: value(n, (v) => v || { drafts: 0, signed: 0 }),
    });
  }, [sub, refreshBadges]);

  useEffect(() => { load(); }, [load]);

  const today = todayYmd();
  const active = (state.appts || []).filter((x) => x.status !== 'CANCELLED');
  const todays = active.filter((x) => x.appointmentDate === today);
  const upcoming = active.filter((x) => x.appointmentDate > today && x.status === 'SCHEDULED');
  const nowHm = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const next = todays.find((x) => x.status === 'SCHEDULED' && String(x.endTime).slice(0, 5) > nowHm);
  const show = (v) => (v == null ? '—' : v);

  const apptRow = (a, showDate) => (
    <button key={a.id} type="button" onClick={() => navigate('/schedule')}
      className="w-full text-left px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-secondary-50 dark:hover:bg-secondary-800/40 transition">
      <div className="w-16 flex-shrink-0">
        <p className="text-sm font-bold text-secondary-900 dark:text-white">{formatTime(a.startTime)}</p>
        {showDate && <p className="text-[11px] text-secondary-400">{formatDate(a.appointmentDate, { weekday: 'short', day: 'numeric', month: 'short' })}</p>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{a.patientName}</p>
        <p className="text-xs text-secondary-500 flex items-center gap-1.5 truncate">
          {a.mode === 'TELEHEALTH' ? <FiVideo size={11} /> : <FiMapPin size={11} />}
          {typeLabel(a.type)}{a.reason ? ` · ${a.reason}` : ''}
        </p>
      </div>
      {a.status === 'COMPLETED' ? <Badge variant="success">Done</Badge> : next?.id === a.id ? <Badge variant="teal" dot>Next</Badge> : null}
    </button>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white truncate">{greeting}, {user?.firstName || user?.username || 'Doctor'}</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button type="button" onClick={load} aria-label="Refresh" disabled={state.loading} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">
          <FiRefreshCw size={14} className={state.loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {state.failed && !state.loading ? (
        <Card><ErrorState title="Could not load your dashboard" message="Check your connection and try again." onRetry={load} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard title="Today" value={show(state.appts && todays.length)} subtitle={next ? `Next at ${formatTime(next.startTime)}` : 'appointments'} icon={FiCalendar} color="teal" loading={state.loading && !state.appts} onClick={() => navigate('/schedule')} />
            <StatCard title="My patients" value={show(state.patients)} subtitle="linked to you" icon={FiUsers} color="green" loading={state.loading && state.patients == null} onClick={() => navigate('/patients')} />
            <StatCard title="Draft notes" value={show(state.notes?.drafts)} subtitle={state.notes ? `${state.notes.signed} signed` : 'to sign'} icon={FiFileText} color="amber" loading={state.loading && !state.notes} onClick={() => navigate('/notes')} />
            <StatCard title="Messages" value={unreadMessages} subtitle="unread" icon={FiMessageSquare} color="blue" onClick={() => navigate('/messages')} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Today's schedule" subtitle={state.appts ? `${todays.length} appointment${todays.length === 1 ? '' : 's'}` : ''}
                action={<button type="button" onClick={() => navigate('/schedule')} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium flex items-center gap-1">Schedule <FiArrowRight size={12} /></button>} />
              {state.loading && !state.appts ? <LoadingState className="py-10" />
                : state.appts == null ? <ErrorState className="py-8" title="Appointments unavailable" onRetry={load} />
                  : todays.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <FiClock className="mx-auto text-secondary-300 mb-2" size={22} />
                      <p className="text-sm text-secondary-400">No appointments today</p>
                    </div>
                  ) : <div className="divide-y divide-secondary-100 dark:divide-secondary-800">{todays.map((a) => apptRow(a, false))}</div>}
            </Card>

            <Card>
              <CardHeader title="Coming up" subtitle="Next 7 days" />
              {state.loading && !state.appts ? <LoadingState className="py-10" />
                : state.appts == null ? <ErrorState className="py-8" title="Appointments unavailable" onRetry={load} />
                  : upcoming.length === 0 ? <p className="px-5 py-10 text-center text-sm text-secondary-400">Nothing booked for the coming week</p>
                    : <div className="divide-y divide-secondary-100 dark:divide-secondary-800">{upcoming.slice(0, 6).map((a) => apptRow(a, true))}</div>}
              {upcoming.length > 6 && (
                <button type="button" onClick={() => navigate('/schedule')} className="w-full px-5 py-2.5 text-xs font-medium text-primary-600 dark:text-primary-400 border-t border-secondary-100 dark:border-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-800/40">
                  View all {upcoming.length}
                </button>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Quick actions" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5">
              {[
                { label: 'New appointment', icon: FiPlus, path: '/schedule' },
                { label: 'My patients', icon: FiUsers, path: '/patients' },
                { label: 'Write a note', icon: FiFileText, path: '/notes' },
                { label: 'Messages', icon: FiMessageSquare, path: '/messages' },
              ].map((a) => (
                <button key={a.label} type="button" onClick={() => navigate(a.path)}
                  className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition')}>
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 flex items-center justify-center"><a.icon size={18} /></div>
                  <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300 text-center">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
