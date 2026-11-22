import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCalendar, FiPlus, FiChevronLeft, FiChevronRight, FiList, FiGrid, FiVideo, FiMapPin, FiCheck, FiRefreshCw } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import DatePicker from '../../components/ui/DatePicker';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ErrorState, Field, LoadingState, PageHeader, Spinner } from '../../components/ui/States';
import PatientPicker from '../../components/PatientPicker';
import { appointmentApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';
import { errorMessage } from '../../utils/errors';
import { addDays, formatDate, formatTime, fullName, hhmm, parseYmd, startOfWeek, toYmd, todayYmd } from '../../utils/format';
import { btnGhost, btnPrimary, btnDanger, inputClass } from '../../utils/styles';
import cn from '../../utils/cn';
import {
  APPOINTMENT_MODES, APPOINTMENT_STATUS_BADGE, APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPES, typeLabel,
} from '../../constants/appointments';

const MODES = APPOINTMENT_MODES;
const STATUS_LABEL = APPOINTMENT_STATUS_LABEL;
const STATUS_BADGE = APPOINTMENT_STATUS_BADGE;

const TYPE_STYLE = {
  CONSULTATION: 'bg-primary-50 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800',
  FOLLOW_UP: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-700/20 dark:text-success-300 dark:border-success-700/40',
  LAB_REVIEW: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-700/20 dark:text-warning-300 dark:border-warning-700/40',
  PROCEDURE: 'bg-secondary-100 text-secondary-800 border-secondary-300 dark:bg-secondary-800 dark:text-secondary-200 dark:border-secondary-600',
  TELEHEALTH: 'bg-white text-primary-700 border-primary-300 border-dashed dark:bg-secondary-900 dark:text-primary-300 dark:border-primary-700',
};
const styleFor = (a) => cn(
  'border',
  TYPE_STYLE[a.type] || TYPE_STYLE.PROCEDURE,
  a.status === 'CANCELLED' && 'opacity-60 line-through',
  a.status === 'NO_SHOW' && 'opacity-75',
);

const WEEKDAY = (d) => d.toLocaleDateString(undefined, { weekday: 'short' });

const emptyForm = (date) => ({
  patient: null, type: 'CONSULTATION', mode: 'IN_PERSON', appointmentDate: date || todayYmd(),
  startTime: '09:00', endTime: '09:30', reason: '', notes: '', status: 'SCHEDULED',
});

export default function SchedulePage() {
  const sub = useAuthStore((s) => s.user?.sub);
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState('week'); // week | agenda
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(todayYmd());
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const reqId = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [slots, setSlots] = useState([]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const from = toYmd(weekDates[0]);
  const to = toYmd(weekDates[6]);
  const today = todayYmd();

  const load = useCallback(async () => {
    if (!sub) return;
    const my = ++reqId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await appointmentApi.list({ providerId: sub, from, to });
      if (my === reqId.current) setAppts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (my === reqId.current) setLoadError(errorMessage(err, 'Could not load your appointments.'));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [sub, from, to]);

  useEffect(() => { load(); }, [load]);

  // Keep the selected day (phone view) inside the visible week.
  useEffect(() => {
    if (selectedDay < from || selectedDay > to) setSelectedDay(today >= from && today <= to ? today : from);
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDate = useMemo(() => {
    const map = {};
    appts.forEach((a) => { (map[a.appointmentDate] = map[a.appointmentDate] || []).push(a); });
    Object.values(map).forEach((list) => list.sort((x, y) => String(x.startTime).localeCompare(String(y.startTime))));
    return map;
  }, [appts]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const openCreate = useCallback((date, patient = null) => {
    setEditing(null);
    setForm({ ...emptyForm(date && date >= today ? date : today), patient });
    setErrors({});
    setModalOpen(true);
  }, [today]);

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      patient: null,
      type: a.type || 'CONSULTATION',
      mode: a.mode || 'IN_PERSON',
      appointmentDate: a.appointmentDate,
      startTime: hhmm(a.startTime),
      endTime: hhmm(a.endTime),
      reason: a.reason || '',
      notes: a.notes || '',
      status: a.status || 'SCHEDULED',
    });
    setErrors({});
    setModalOpen(true);
  };

  // "Book appointment" from the patient page.
  useEffect(() => {
    const p = location.state?.bookFor;
    if (p) {
      openCreate(today, p.keycloakUserId ? p : null);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Free slots for the chosen day (new appointments only).
  useEffect(() => {
    if (!modalOpen || editing || !sub || !form.appointmentDate) { setSlots([]); return undefined; }
    let alive = true;
    appointmentApi.slots(sub, form.appointmentDate)
      .then((s) => { if (alive) setSlots((Array.isArray(s) ? s : []).filter((x) => String(x.available) === 'true')); })
      .catch(() => { if (alive) setSlots([]); });
    return () => { alive = false; };
  }, [modalOpen, editing, sub, form.appointmentDate]);

  const validate = () => {
    const e = {};
    if (!editing && !form.patient) e.patient = 'Choose a patient';
    if (!form.appointmentDate) e.appointmentDate = 'Choose a date';
    else if (!editing && form.appointmentDate < today) e.appointmentDate = 'Date cannot be in the past';
    if (!form.startTime) e.startTime = 'Required';
    if (!form.endTime) e.endTime = 'Required';
    if (form.startTime && form.endTime && form.endTime <= form.startTime) e.endTime = 'End must be after start';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const common = {
        type: form.type, mode: form.mode, appointmentDate: form.appointmentDate,
        startTime: form.startTime, endTime: form.endTime, reason: form.reason.trim(), notes: form.notes.trim(),
      };
      if (editing) {
        await appointmentApi.update(editing.id, { ...common, status: form.status });
        toast.success('Appointment updated');
      } else {
        await appointmentApi.book({ ...common, patientId: form.patient.keycloakUserId, patientName: fullName(form.patient) });
        toast.success(`Appointment booked with ${fullName(form.patient)}`);
      }
      setModalOpen(false);
      const d = parseYmd(form.appointmentDate);
      if (d && (form.appointmentDate < from || form.appointmentDate > to)) setWeekStart(startOfWeek(d));
      else load();
      setSelectedDay(form.appointmentDate);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the appointment.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAppt = async () => {
    if (!editing || cancelling) return;
    setCancelling(true);
    try {
      await appointmentApi.cancel(editing.id);
      toast.success('Appointment cancelled. The patient has been notified.');
      setConfirmCancel(false);
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not cancel the appointment.'));
    } finally {
      setCancelling(false);
    }
  };

  const goWeek = (dir) => setWeekStart((w) => addDays(w, dir * 7));
  const goToday = () => { setWeekStart(startOfWeek(new Date())); setSelectedDay(today); };

  const weekCount = appts.filter((a) => a.status !== 'CANCELLED').length;
  const rangeLabel = `${formatDate(from, { month: 'short', day: 'numeric' })} – ${formatDate(to, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const statusOptions = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'NO_SHOW', label: 'No-show' },
    ...(editing?.status === 'CANCELLED' ? [{ value: 'CANCELLED', label: 'Cancelled' }] : []),
  ];

  const renderRow = (a) => (
    <button key={a.id} type="button" onClick={() => openEdit(a)}
      className="w-full text-left px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 hover:bg-secondary-50 dark:hover:bg-secondary-800/40 transition">
      <div className="w-16 flex-shrink-0">
        <p className={cn('text-sm font-bold text-secondary-900 dark:text-white', a.status === 'CANCELLED' && 'line-through opacity-60')}>{formatTime(a.startTime)}</p>
        <p className="text-[11px] text-secondary-400">{formatTime(a.endTime)}</p>
      </div>
      <div className={cn('w-1 self-stretch rounded-full', a.status === 'CANCELLED' ? 'bg-secondary-300 dark:bg-secondary-600' : a.status === 'COMPLETED' ? 'bg-success-500' : 'bg-primary-500')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-secondary-900 dark:text-white truncate', a.status === 'CANCELLED' && 'line-through opacity-60')}>{a.patientName || 'Patient'}</p>
        <p className="text-xs text-secondary-500 flex items-center gap-1.5 truncate">
          {a.mode === 'TELEHEALTH' ? <FiVideo size={11} /> : <FiMapPin size={11} />}
          {typeLabel(a.type)}{a.reason ? ` · ${a.reason}` : ''}
        </p>
      </div>
      <Badge variant={STATUS_BADGE[a.status] || 'gray'} dot>{STATUS_LABEL[a.status] || a.status}</Badge>
    </button>
  );

  const renderDay = (ymd, showEmptyAction = true) => {
    const list = byDate[ymd] || [];
    if (list.length === 0) {
      return (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-secondary-400">No appointments</p>
          {showEmptyAction && ymd >= today && (
            <button type="button" onClick={() => openCreate(ymd)} className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">+ Book an appointment</button>
          )}
        </div>
      );
    }
    return <div className="divide-y divide-secondary-100 dark:divide-secondary-800">{list.map(renderRow)}</div>;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedule"
        subtitle="Your appointments for the week."
        actions={(
          <>
            <div className="flex gap-0.5 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-0.5">
              {[['week', 'Week', FiGrid], ['agenda', 'Agenda', FiList]].map(([k, l, Icon]) => (
                <button key={k} type="button" onClick={() => setView(k)} aria-pressed={view === k}
                  className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1',
                    view === k ? 'bg-white dark:bg-secondary-700 shadow-sm text-secondary-900 dark:text-white' : 'text-secondary-500')}>
                  <Icon size={12} />{l}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => openCreate(selectedDay)} className={btnPrimary}>
              <FiPlus size={16} /> New appointment
            </button>
          </>
        )}
      />

      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goWeek(-1)} aria-label="Previous week" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-500 transition"><FiChevronLeft size={18} /></button>
          <button type="button" onClick={() => goWeek(1)} aria-label="Next week" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-500 transition"><FiChevronRight size={18} /></button>
          <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-500 transition"><FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
          <button type="button" onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition">Today</button>
        </div>
        <div className="text-right min-w-0">
          <h2 className="text-sm font-semibold text-secondary-700 dark:text-secondary-200 truncate">{rangeLabel}</h2>
          <p className="text-[11px] text-secondary-400 flex items-center justify-end gap-1.5">
            {loading ? <><Spinner size="sm" /> Loading…</> : `${weekCount} appointment${weekCount === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      {loadError ? (
        <Card><ErrorState title="Could not load your schedule" message={loadError} onRetry={load} /></Card>
      ) : view === 'week' ? (
        <>
          {/* Phones: pick a day, see its agenda */}
          <div className="md:hidden space-y-3">
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((d) => {
                const ymd = toYmd(d);
                const count = (byDate[ymd] || []).filter((a) => a.status !== 'CANCELLED').length;
                const sel = ymd === selectedDay;
                return (
                  <button key={ymd} type="button" onClick={() => setSelectedDay(ymd)} aria-pressed={sel}
                    className={cn('flex flex-col items-center py-2 rounded-xl border transition',
                      sel ? 'bg-primary-600 border-primary-600 text-white'
                        : ymd === today ? 'border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 bg-white dark:bg-secondary-900'
                          : 'border-secondary-200 dark:border-secondary-800 text-secondary-600 dark:text-secondary-300 bg-white dark:bg-secondary-900')}>
                    <span className="text-[10px] uppercase font-medium">{WEEKDAY(d).slice(0, 2)}</span>
                    <span className="text-base font-bold leading-tight">{d.getDate()}</span>
                    <span className={cn('w-1.5 h-1.5 rounded-full mt-0.5', count ? (sel ? 'bg-white' : 'bg-primary-500') : 'bg-transparent')} />
                  </button>
                );
              })}
            </div>
            <Card>
              <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-800">
                <p className="text-sm font-semibold text-secondary-900 dark:text-white">{formatDate(selectedDay, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
              {loading && !appts.length ? <LoadingState className="py-10" /> : renderDay(selectedDay)}
            </Card>
          </div>

          {/* Tablets and up: week grid */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 min-w-[700px]">
                {weekDates.map((d) => {
                  const ymd = toYmd(d);
                  const isToday = ymd === today;
                  const list = byDate[ymd] || [];
                  return (
                    <div key={ymd} className={cn('border-r last:border-r-0 border-secondary-100 dark:border-secondary-800 min-h-[320px] flex flex-col', isToday && 'bg-primary-50/40 dark:bg-primary-900/10')}>
                      <div className={cn('px-2 py-2.5 border-b border-secondary-100 dark:border-secondary-800 text-center', isToday ? 'bg-primary-600 text-white' : 'bg-secondary-50 dark:bg-secondary-800/50')}>
                        <p className="text-[10px] font-medium uppercase">{WEEKDAY(d)}</p>
                        <p className={cn('text-lg font-bold', !isToday && 'text-secondary-700 dark:text-secondary-200')}>{d.getDate()}</p>
                      </div>
                      <div className="p-1.5 space-y-1 flex-1">
                        {list.map((a) => (
                          <button key={a.id} type="button" onClick={() => openEdit(a)} title={`${a.patientName} · ${typeLabel(a.type)} · ${STATUS_LABEL[a.status] || a.status}`}
                            className={cn('w-full text-left p-2 rounded-lg text-[11px] transition hover:shadow-sm', styleFor(a))}>
                            <p className="font-semibold truncate flex items-center gap-1">
                              {a.status === 'COMPLETED' && <FiCheck size={10} className="flex-shrink-0" />}
                              {formatTime(a.startTime)}
                            </p>
                            <p className="truncate">{a.patientName}</p>
                            <p className="truncate opacity-75">{a.status === 'SCHEDULED' ? typeLabel(a.type) : STATUS_LABEL[a.status]}</p>
                          </button>
                        ))}
                        {ymd >= today && (
                          <button type="button" onClick={() => openCreate(ymd)} className="w-full p-1.5 rounded-lg text-[11px] text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-primary-600 transition text-center">+ Add</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          {loading && !appts.length ? <LoadingState /> : appts.length === 0 ? (
            <EmptyState icon={FiCalendar} title="No appointments this week" description="Book an appointment or move to another week."
              action={<button type="button" onClick={() => openCreate(selectedDay)} className={btnPrimary}><FiPlus size={14} /> New appointment</button>} />
          ) : (
            <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
              {weekDates.map((d) => toYmd(d)).filter((ymd) => byDate[ymd]?.length).map((ymd) => (
                <div key={ymd}>
                  <div className={cn('px-4 sm:px-5 py-2 text-xs font-semibold uppercase tracking-wide bg-secondary-50 dark:bg-secondary-800/50', ymd === today ? 'text-primary-700 dark:text-primary-300' : 'text-secondary-500')}>
                    {ymd === today ? 'Today · ' : ''}{formatDate(ymd, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  {renderDay(ymd, false)}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Create / edit */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Appointment' : 'New appointment'}
        size="md"
        footer={(
          <>
            {editing?.status === 'SCHEDULED' && (
              <button type="button" onClick={() => setConfirmCancel(true)} disabled={saving} className={cn(btnDanger, 'sm:mr-auto')}>Cancel appointment</button>
            )}
            <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className={btnGhost}>Close</button>
            <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving ? <><Spinner size="sm" className="border-white border-t-transparent" /> Saving…</> : editing ? 'Save changes' : 'Book appointment'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          {editing ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800/60">
              <div className="min-w-0">
                <p className="text-xs text-secondary-400">Patient</p>
                <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{editing.patientName}</p>
              </div>
              <Badge variant={STATUS_BADGE[editing.status] || 'gray'} dot>{STATUS_LABEL[editing.status] || editing.status}</Badge>
            </div>
          ) : (
            <Field label="Patient" required error={errors.patient} hint="Only registered patients (with a portal account) can be booked.">
              <PatientPicker value={form.patient} onChange={(p) => set('patient', p)} requireAccount error={errors.patient} />
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select name="type" value={form.type} onChange={(e) => set('type', e.target.value)} options={APPOINTMENT_TYPES} />
            </Field>
            <Field label="Visit mode">
              <Select name="mode" value={form.mode} onChange={(e) => set('mode', e.target.value)} options={MODES} />
            </Field>
            <Field label="Date" required error={errors.appointmentDate} className="sm:col-span-2">
              <DatePicker name="appointmentDate" value={form.appointmentDate} onChange={(e) => set('appointmentDate', e.target.value)}
                min={editing ? undefined : today} required clearable={false} error={errors.appointmentDate} touched />
            </Field>
            {!editing && slots.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-[11px] text-secondary-400 mb-1.5">Free slots</p>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((s) => (
                    <button key={s.time} type="button" onClick={() => { set('startTime', s.time); set('endTime', s.endTime); }}
                      className={cn('px-2.5 py-1 rounded-lg text-xs border transition',
                        form.startTime === s.time ? 'bg-primary-600 border-primary-600 text-white' : 'border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:border-primary-300')}>
                      {formatTime(s.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Field label="Start" required error={errors.startTime}>
              <DatePicker type="time" name="startTime" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required clearable={false} error={errors.startTime} touched />
            </Field>
            <Field label="End" required error={errors.endTime}>
              <DatePicker type="time" name="endTime" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} required clearable={false} error={errors.endTime} touched />
            </Field>
            {editing && (
              <Field label="Status" className="sm:col-span-2" hint="To cancel and notify the patient, use “Cancel appointment”.">
                <Select name="status" value={form.status} onChange={(e) => set('status', e.target.value)} options={statusOptions} />
              </Field>
            )}
            <Field label="Reason for visit" className="sm:col-span-2">
              <input value={form.reason} onChange={(e) => set('reason', e.target.value)} maxLength={255} className={inputClass} placeholder="e.g. Blood pressure review" />
            </Field>
            <Field label="Notes (staff only)" className="sm:col-span-2">
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className={`${inputClass} h-20 resize-none`} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancelAppt}
        loading={cancelling}
        title="Cancel appointment?"
        message={editing ? `${editing.patientName} on ${formatDate(editing.appointmentDate)} at ${formatTime(editing.startTime)} will be cancelled and the patient notified.` : ''}
        confirmLabel="Cancel appointment"
      />
    </div>
  );
}
