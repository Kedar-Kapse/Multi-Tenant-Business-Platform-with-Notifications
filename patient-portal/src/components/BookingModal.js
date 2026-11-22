import { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import Modal from './ui/Modal';
import Select from './ui/Select';
import DatePicker from './ui/DatePicker';
import { toast } from './ui/Toast';
import { Spinner } from './ui/States';
import { Field, inputClass, primaryBtn, secondaryBtn } from './ui/form';
import { appointmentApi, providerApi, providerName } from '../services/patientService';
import { errorMessage, formatDateLong, formatTime, humanize, todayYmd } from '../utils/format';

export const APPOINTMENT_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'FOLLOW_UP', label: 'Follow-up visit' },
  { value: 'LAB_REVIEW', label: 'Lab results review' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'TELEHEALTH', label: 'Telehealth (video) visit' },
];
export const typeLabel = (t) => APPOINTMENT_TYPES.find((x) => x.value === t)?.label || humanize(t);

const MODES = [
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'TELEHEALTH', label: 'Video (telehealth)' },
];

const EMPTY = { providerId: '', date: '', time: '', type: 'CONSULTATION', mode: 'IN_PERSON', reason: '' };
const providerLabel = (p) => `${providerName(p)} — ${p.specialization || humanize(p.role)}`;

/**
 * Book an appointment for the signed-in patient. The patient's identity comes from
 * the token; we send only the provider, date, time and visit details.
 */
export default function BookingModal({ open, onClose, onBooked, initialProvider }) {
  const [form, setForm] = useState(EMPTY);
  const [providers, setProviders] = useState([]);
  const [providersState, setProvidersState] = useState({ loading: false, error: null });
  const [slots, setSlots] = useState([]);
  const [slotsState, setSlotsState] = useState({ loading: false, error: null });
  const [slotsReload, setSlotsReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const slotReq = useRef(0);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Reset and load the care-team directory each time the dialog opens.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setForm({ ...EMPTY, providerId: initialProvider?.id || '' });
    setSlots([]);
    setProvidersState({ loading: true, error: null });
    providerApi.directory({ size: 100 })
      .then((page) => {
        if (cancelled) return;
        const list = page?.content || [];
        if (initialProvider && !list.some((p) => p.id === initialProvider.id)) list.unshift(initialProvider);
        setProviders(list);
        setProvidersState({ loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setProviders(initialProvider ? [initialProvider] : []);
        setProvidersState({ loading: false, error: errorMessage(err, 'Could not load the care team.') });
      });
    return () => { cancelled = true; };
  }, [open, initialProvider]);

  // Free slots: reload whenever the provider OR the date changes (latest request wins).
  useEffect(() => {
    if (!open || !form.providerId || !form.date) { setSlots([]); setSlotsState({ loading: false, error: null }); return; }
    const req = ++slotReq.current;
    setSlotsState({ loading: true, error: null });
    appointmentApi.slots(form.providerId, form.date)
      .then((list) => {
        if (req !== slotReq.current) return;
        const free = (Array.isArray(list) ? list : []).filter((s) => String(s.available) !== 'false');
        setSlots(free);
        setSlotsState({ loading: false, error: null });
        setForm((p) => (free.some((s) => s.time === p.time) ? p : { ...p, time: '' }));
      })
      .catch((err) => {
        if (req !== slotReq.current) return;
        setSlots([]);
        setSlotsState({ loading: false, error: errorMessage(err, 'Could not load free times.') });
      });
  }, [open, form.providerId, form.date, slotsReload]);

  const provider = useMemo(() => providers.find((p) => p.id === form.providerId), [providers, form.providerId]);
  const providerOptions = useMemo(() => providers.map((p) => ({ value: p.id, label: providerLabel(p) })), [providers]);
  const canSubmit = !!(form.providerId && form.date && form.time) && !saving;

  const submit = async () => {
    if (!canSubmit || !provider) return;
    setSaving(true);
    try {
      const mode = form.type === 'TELEHEALTH' ? 'TELEHEALTH' : form.mode;
      const reason = form.reason.trim();
      const saved = await appointmentApi.book({
        providerId: provider.id,
        providerName: providerName(provider),
        ...(provider.specialization ? { providerSpecialty: provider.specialization } : {}),
        appointmentDate: form.date,
        startTime: form.time,
        type: form.type,
        mode,
        ...(reason ? { reason } : {}),
      });
      toast.success(`Booked with ${providerName(provider)} on ${formatDateLong(form.date)} at ${formatTime(form.time)}.`);
      onBooked?.(saved);
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      toast.error(errorMessage(err, 'Booking failed. Please try again.'));
      if (status === 422 || status === 409) {
        // Someone just took this slot: show what's still free.
        set('time', '');
        setSlotsReload((n) => n + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
      <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn}>Cancel</button>
      <button type="button" onClick={submit} disabled={!canSubmit} className={primaryBtn}>
        {saving && <Spinner size="sm" />} {saving ? 'Booking…' : 'Book appointment'}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={saving ? () => {} : onClose} title="Book an appointment" size="md" footer={footer}>
      <div className="space-y-4">
        <Field label="Provider" required htmlFor="providerId"
          error={providersState.error}
          hint={!providersState.loading && !providersState.error && providers.length === 0 ? 'No care-team members are available for booking yet.' : undefined}>
          <Select
            name="providerId"
            value={form.providerId}
            onChange={(e) => set('providerId', e.target.value)}
            options={providerOptions}
            placeholder={providersState.loading ? 'Loading care team…' : 'Choose a doctor, nurse or therapist'}
            searchable
            disabled={providersState.loading || saving}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date" required htmlFor="date">
            <DatePicker name="date" value={form.date} onChange={(e) => set('date', e.target.value)} min={todayYmd()} required placeholder="Pick a date" disabled={saving} />
          </Field>
          <Field label="Visit type" htmlFor="type">
            <Select name="type" value={form.type} onChange={(e) => set('type', e.target.value)} options={APPOINTMENT_TYPES} disabled={saving} />
          </Field>
        </div>

        <div>
          <p className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Time <span className="text-urgent-500">*</span></p>
          {!form.providerId || !form.date ? (
            <p className="text-xs text-secondary-400 flex items-center gap-2 py-2"><FiClock size={13} /> Choose a provider and a date to see free times.</p>
          ) : slotsState.loading ? (
            <p className="text-xs text-secondary-500 flex items-center gap-2 py-2"><Spinner size="sm" className="text-primary-500" /> Checking free times…</p>
          ) : slotsState.error ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-urgent-50 dark:bg-urgent-900/20 text-urgent-700 dark:text-urgent-300 text-xs">
              <span className="flex items-center gap-2 min-w-0"><FiAlertCircle size={14} className="flex-shrink-0" /> {slotsState.error}</span>
              <button type="button" onClick={() => setSlotsReload((n) => n + 1)} className="flex items-center gap-1 font-medium flex-shrink-0"><FiRefreshCw size={12} /> Retry</button>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-xs text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-700/20 rounded-lg p-3">No free times on this day. Please try another date.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Free times">
              {slots.map((s) => {
                const active = form.time === s.time;
                return (
                  <button key={s.time} type="button" role="radio" aria-checked={active} disabled={saving} onClick={() => set('time', s.time)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition ${active ? 'bg-primary-600 text-white border-primary-600' : 'border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:border-primary-300'}`}>
                    {formatTime(s.time)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {form.type !== 'TELEHEALTH' && (
          <Field label="How would you like to attend?" htmlFor="mode">
            <Select name="mode" value={form.mode} onChange={(e) => set('mode', e.target.value)} options={MODES} disabled={saving} />
          </Field>
        )}

        <Field label="Reason for visit" htmlFor="reason" hint={`${form.reason.length}/500`}>
          <textarea id="reason" value={form.reason} maxLength={500} disabled={saving} onChange={(e) => set('reason', e.target.value)} className={`${inputClass} h-20 resize-none`} placeholder="Describe your symptoms or the reason for your visit (optional)" />
        </Field>
      </div>
    </Modal>
  );
}
