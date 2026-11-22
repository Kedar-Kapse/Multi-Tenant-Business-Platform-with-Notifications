import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCalendar, FiClock, FiPlus, FiX, FiMapPin, FiVideo, FiCheckCircle } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, SkeletonList } from '../../components/ui/States';
import { primaryBtn } from '../../components/ui/form';
import { toast } from '../../components/ui/Toast';
import BookingModal, { typeLabel } from '../../components/BookingModal';
import { appointmentApi } from '../../services/patientService';
import { dateChip, errorMessage, formatDateLong, formatTime, humanize, todayYmd } from '../../utils/format';

const STATUS_BADGE = { SCHEDULED: 'info', COMPLETED: 'success', CANCELLED: 'gray', NO_SHOW: 'danger' };
const STATUS_LABEL = { SCHEDULED: 'Scheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'Missed' };

const isUpcoming = (a, today) => a.status === 'SCHEDULED' && a.appointmentDate >= today;
const byDateAsc = (a, b) => `${a.appointmentDate}${a.startTime}`.localeCompare(`${b.appointmentDate}${b.startTime}`);

export default function AppointmentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [appts, setAppts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [bookOpen, setBookOpen] = useState(false);
  const [bookProvider, setBookProvider] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [list, sum] = await Promise.allSettled([appointmentApi.mine(), appointmentApi.summary()]);
    if (list.status === 'fulfilled') setAppts(Array.isArray(list.value) ? list.value : []);
    else setError(errorMessage(list.reason, 'Could not load your appointments.'));
    setSummary(sum.status === 'fulfilled' ? sum.value : null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Opened from Dashboard / Find Providers with "book".
  useEffect(() => {
    if (location.state?.book) {
      setBookProvider(location.state.provider || null);
      setBookOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const today = todayYmd();
  const groups = useMemo(() => {
    const upcoming = appts.filter((a) => isUpcoming(a, today)).sort(byDateAsc);
    const past = appts.filter((a) => !isUpcoming(a, today)); // already newest first
    return { upcoming, past, all: appts };
  }, [appts, today]);
  const list = groups[tab] || [];

  const stats = summary || {
    scheduled: appts.filter((a) => a.status === 'SCHEDULED').length,
    completed: appts.filter((a) => a.status === 'COMPLETED').length,
    cancelled: appts.filter((a) => a.status === 'CANCELLED').length,
  };

  const confirmCancel = async () => {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    try {
      await appointmentApi.cancel(cancelTarget.id);
      toast.success('Your appointment was cancelled.');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not cancel the appointment.'));
      if (err?.response?.status === 422) { setCancelTarget(null); load(); }
    } finally {
      setCancelling(false);
    }
  };

  const openBooking = () => { setBookProvider(null); setBookOpen(true); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My appointments"
        subtitle="Book, view and cancel your visits."
        actions={<button type="button" onClick={openBooking} className={primaryBtn}><FiPlus size={16} /> Book appointment</button>}
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard title="Scheduled" value={stats.scheduled ?? 0} icon={FiClock} color="primary" loading={loading && !summary && !appts.length} />
        <StatCard title="Completed" value={stats.completed ?? 0} icon={FiCheckCircle} color="success" loading={loading && !summary && !appts.length} />
        <StatCard title="Cancelled" value={stats.cancelled ?? 0} icon={FiX} color="neutral" loading={loading && !summary && !appts.length} />
      </div>

      <Tabs
        tabs={[
          { key: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
          { key: 'past', label: 'Past', count: groups.past.length },
          { key: 'all', label: 'All', count: groups.all.length },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      {error ? (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      ) : loading && !appts.length ? (
        <SkeletonList rows={3} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiCalendar}
            title={tab === 'upcoming' ? 'No upcoming appointments' : tab === 'past' ? 'No past appointments' : 'No appointments yet'}
            description={tab === 'past' ? 'Completed, missed and cancelled visits will appear here.' : 'Book a visit with your care team.'}
            action={tab !== 'past' && <button type="button" onClick={openBooking} className={primaryBtn}><FiPlus size={14} /> Book appointment</button>}
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => <AppointmentCard key={a.id} a={a} upcoming={isUpcoming(a, today)} onCancel={() => setCancelTarget(a)} />)}
        </ul>
      )}

      <BookingModal open={bookOpen} initialProvider={bookProvider} onClose={() => setBookOpen(false)} onBooked={() => { setTab('upcoming'); load(); }} />

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        loading={cancelling}
        title="Cancel appointment?"
        confirmLabel="Cancel appointment"
        message={cancelTarget && (
          <>Your {typeLabel(cancelTarget.type).toLowerCase()} with <strong>{cancelTarget.providerName}</strong> on {formatDateLong(cancelTarget.appointmentDate)} at {formatTime(cancelTarget.startTime)} will be cancelled. This can't be undone.</>
        )}
      />
    </div>
  );
}

function AppointmentCard({ a, upcoming, onCancel }) {
  const c = dateChip(a.appointmentDate);
  const telehealth = a.mode === 'TELEHEALTH';
  return (
    <li>
      <Card>
        <div className="p-3.5 sm:p-4 flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="text-center w-14 sm:w-16 flex-shrink-0 bg-primary-50 dark:bg-primary-900/20 rounded-xl py-2">
            <p className="text-[10px] font-bold text-primary-600 uppercase">{c.month}</p>
            <p className="text-xl font-bold text-primary-700 dark:text-primary-300 leading-tight">{c.day}</p>
            <p className="text-[10px] text-primary-500">{c.weekday}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate max-w-full">{a.providerName}</p>
              <Badge variant={STATUS_BADGE[a.status] || 'gray'} dot>{STATUS_LABEL[a.status] || humanize(a.status)}</Badge>
            </div>
            <p className="text-xs text-secondary-500 mt-0.5 truncate">
              {formatTime(a.startTime)}{a.endTime ? ` – ${formatTime(a.endTime)}` : ''} · {typeLabel(a.type)}{a.providerSpecialty ? ` · ${a.providerSpecialty}` : ''}
            </p>
            <p className="flex items-center gap-1 mt-1 text-[11px] text-secondary-400 min-w-0">
              {telehealth ? <><FiVideo size={11} className="flex-shrink-0" /> Video visit</> : <><FiMapPin size={11} className="flex-shrink-0" /> <span className="truncate">{a.facilityName || 'In person'}</span></>}
            </p>
            {a.reason && <p className="text-xs text-secondary-500 mt-1.5 line-clamp-2 break-words">{a.reason}</p>}
            {upcoming && (
              <button type="button" onClick={onCancel} className="sm:hidden mt-3 w-full px-3 py-2 rounded-lg text-xs font-medium border border-urgent-200 dark:border-urgent-800 text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition">Cancel appointment</button>
            )}
          </div>
          {upcoming && (
            <button type="button" onClick={onCancel} className="hidden sm:block px-3 py-1.5 rounded-lg text-xs font-medium border border-urgent-200 dark:border-urgent-800 text-urgent-600 hover:bg-urgent-50 dark:hover:bg-urgent-900/20 transition flex-shrink-0">Cancel</button>
          )}
        </div>
      </Card>
    </li>
  );
}
