import { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiClock, FiPlus, FiX, FiMapPin, FiVideo } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import { appointmentApi, providerApi } from '../../services/patientService';
import useAuthStore from '../../store/authStore';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';
const STATUS_BADGE = { SCHEDULED: 'info', COMPLETED: 'success', CANCELLED: 'gray', NO_SHOW: 'danger' };
const TYPES = ['CONSULTATION', 'FOLLOW_UP', 'LAB_REVIEW', 'PROCEDURE', 'TELEHEALTH'];

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const PID = user?.sub || 'PAT-001';
  const PNAME = user?.fullName || user?.username || 'Patient';
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ providerId: '', providerName: '', date: '', time: '', type: 'CONSULTATION', reason: '', mode: 'IN_PERSON' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (m, t = 'success') => { setToast({ m, t }); setTimeout(() => setToast(null), 4000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { setAppts(await appointmentApi.getAll(PID)); } catch { setAppts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = appts.filter(a => {
    if (tab === 'upcoming') return a.status === 'SCHEDULED';
    if (tab === 'past') return a.status === 'COMPLETED';
    if (tab === 'cancelled') return a.status === 'CANCELLED';
    return true;
  });

  const stats = { scheduled: appts.filter(a => a.status === 'SCHEDULED').length, completed: appts.filter(a => a.status === 'COMPLETED').length, cancelled: appts.filter(a => a.status === 'CANCELLED').length };

  const openBook = async () => {
    try { const d = await providerApi.getAll(0, 50); setProviders(d?.content || []); } catch { setProviders([]); }
    setForm({ providerId: '', providerName: '', date: '', time: '', type: 'CONSULTATION', reason: '', mode: 'IN_PERSON' });
    setSlots([]); setModalOpen(true);
  };

  const loadSlots = async (providerId, date) => {
    if (!providerId || !date) return;
    try { setSlots(await appointmentApi.getSlots(providerId, date)); } catch { setSlots([]); }
  };

  const handleBook = async () => {
    if (!form.providerId || !form.date || !form.time) { showToast('Select provider, date, and time', 'error'); return; }
    setSaving(true);
    try {
      await appointmentApi.book({ patientId: PID, patientName: PNAME, providerId: form.providerId, providerName: form.providerName,
        providerSpecialty: providers.find(p => p.keycloakUserId === form.providerId)?.specialization || '',
        appointmentDate: form.date, startTime: form.time + ':00', endTime: (parseInt(form.time) + 1).toString().padStart(2, '0') + ':00:00',
        type: form.type, reason: form.reason, mode: form.mode, facilityName: 'City General Hospital' });
      showToast('Appointment booked!'); setModalOpen(false); load();
    } catch (e) { showToast(e?.response?.data?.message || 'Booking failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id) => {
    try { await appointmentApi.cancel(id); showToast('Appointment cancelled'); load(); }
    catch { showToast('Cancel failed', 'error'); }
  };

  return (
    <div className="space-y-4">
      {toast && (<div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.t === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.m}<button onClick={() => setToast(null)}><FiX size={14} /></button></div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">My Appointments</h1><p className="text-xs sm:text-sm text-secondary-500">Manage your healthcare appointments.</p></div>
        <button onClick={openBook} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto"><FiPlus size={16} /> Book Appointment</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Scheduled" value={stats.scheduled} icon={FiClock} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={FiCalendar} color="green" />
        <StatCard title="Cancelled" value={stats.cancelled} icon={FiX} color="rose" />
      </div>

      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl p-1 w-fit">
        {[{ k: 'upcoming', l: 'Upcoming' }, { k: 'past', l: 'Past' }, { k: 'cancelled', l: 'Cancelled' }, { k: 'all', l: 'All' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t.k ? 'bg-white dark:bg-secondary-700 shadow-sm' : 'text-secondary-500'}`}>{t.l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? <Card><div className="p-12 text-center text-secondary-400">Loading...</div></Card>
        : filtered.length === 0 ? <Card><div className="p-12 text-center text-secondary-400"><FiCalendar size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No appointments found.</p></div></Card>
        : filtered.map(a => (
          <Card key={a.id}>
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="text-center w-16 flex-shrink-0 bg-primary-50 dark:bg-primary-900/20 rounded-xl py-2">
                <p className="text-[10px] font-bold text-primary-600 uppercase">{new Date(a.appointmentDate).toLocaleDateString('en-US', { month: 'short' })}</p>
                <p className="text-xl font-bold text-primary-700">{new Date(a.appointmentDate).getDate()}</p>
                <p className="text-[10px] text-primary-500">{a.startTime?.substring(0, 5)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white">{a.providerName}</p>
                  <Badge variant={STATUS_BADGE[a.status] || 'gray'} dot>{a.status}</Badge>
                </div>
                <p className="text-xs text-secondary-500">{a.providerSpecialty} — {a.type?.replace('_', ' ')}</p>
                {a.reason && <p className="text-xs text-secondary-400 mt-1">{a.reason}</p>}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-secondary-400">
                  {a.mode === 'TELEHEALTH' ? <span className="flex items-center gap-1"><FiVideo size={10} />Telehealth</span> : <span className="flex items-center gap-1"><FiMapPin size={10} />{a.facilityName}</span>}
                </div>
                {a.notes && <p className="text-xs text-secondary-600 mt-2 bg-secondary-50 dark:bg-secondary-800 rounded-lg p-2">{a.notes}</p>}
              </div>
              {a.status === 'SCHEDULED' && <button onClick={() => handleCancel(a.id)} className="px-3 py-1.5 rounded-lg text-xs border border-urgent-200 text-urgent-600 hover:bg-urgent-50 transition">Cancel</button>}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Book Appointment" size="md">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Provider *</label>
            <select value={form.providerId} onChange={e => { const p = providers.find(pr => pr.keycloakUserId === e.target.value); set('providerId', e.target.value); set('providerName', p ? `${p.firstName} ${p.lastName}` : ''); setSlots([]); }} className={inputClass}>
              <option value="">Select provider</option>
              {providers.filter(p => p.role === 'DOCTOR' || p.role === 'THERAPIST').map(p => <option key={p.id} value={p.keycloakUserId}>{p.firstName} {p.lastName} — {p.specialization || p.role}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Date *</label><input type="date" value={form.date} onChange={e => { set('date', e.target.value); loadSlots(form.providerId, e.target.value); }} min={new Date().toISOString().split('T')[0]} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Type</label><select value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>{TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></div>
          </div>
          {slots.length > 0 && (<div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-2">Available Slots *</label>
            <div className="grid grid-cols-4 gap-2">{slots.map(s => (<button key={s.time} onClick={() => set('time', s.time)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${form.time === s.time ? 'bg-primary-600 text-white border-primary-600' : 'border-secondary-200 hover:border-primary-300'}`}>{s.time}</button>))}</div></div>)}
          <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Reason</label><textarea value={form.reason} onChange={e => set('reason', e.target.value)} className={inputClass + ' h-16 resize-none'} placeholder="Describe your symptoms or reason for visit" /></div>
          <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={form.mode === 'IN_PERSON'} onChange={() => set('mode', 'IN_PERSON')} className="text-primary-600" />In-Person</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={form.mode === 'TELEHEALTH'} onChange={() => set('mode', 'TELEHEALTH')} className="text-primary-600" />Telehealth</label></div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleBook} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{saving ? 'Booking...' : 'Book Appointment'}</button>
        </div>
      </Modal>
    </div>
  );
}
