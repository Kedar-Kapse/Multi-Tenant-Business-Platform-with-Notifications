import { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiClock, FiPlus, FiChevronLeft, FiChevronRight, FiList, FiGrid } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { appointmentApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm
const TYPES = ['Consultation', 'Follow-up', 'Procedure', 'Emergency', 'Telehealth', 'Lab Review'];
const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

export default function SchedulePage() {
  const { user } = useAuthStore();
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'Consultation', date: '', startTime: '09:00', endTime: '10:00', patient: '', notes: '', billable: true });
  const [editing, setEditing] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Load real appointments from backend
  useEffect(() => {
    (async () => {
      try {
        const data = await appointmentApi.getAll();
        const mapped = (Array.isArray(data) ? data : []).map(a => ({
          id: a.id,
          title: a.type?.replace('_', ' ') || 'Appointment',
          type: a.type?.replace('_', ' ') || 'Consultation',
          date: a.appointmentDate,
          startTime: a.startTime?.substring(0, 5) || '09:00',
          endTime: a.endTime?.substring(0, 5) || '10:00',
          patient: a.patientName || 'Unknown',
          billable: a.type !== 'FOLLOW_UP',
          status: a.status,
          notes: a.notes,
          reason: a.reason,
          providerName: a.providerName,
          mode: a.mode,
        }));
        setEvents(mapped);
      } catch {
        setEvents([]);
      }
    })();
  }, []);

  const getWeekDates = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();
  const todayStr = new Date().toISOString().split('T')[0];

  const navigateWeek = (dir) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const getEventsForDate = (dateStr) => events.filter(e => e.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const openCreate = (date) => {
    setEditing(null);
    setForm({ title: 'Consultation', type: 'Consultation', date: date || todayStr, startTime: '09:00', endTime: '10:00', patient: '', notes: '', billable: true });
    setModalOpen(true);
  };

  const openEdit = (evt) => {
    setEditing(evt);
    setForm({ ...evt });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      setEvents(prev => prev.map(e => e.id === editing.id ? { ...e, ...form } : e));
    } else {
      setEvents(prev => [...prev, { ...form, id: `evt-new-${Date.now()}` }]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    setEvents(prev => prev.filter(e => e.id !== editing.id));
    setModalOpen(false);
  };

  const typeColor = (type) => {
    const map = { Consultation: 'bg-blue-100 text-blue-700 border-blue-200', 'Follow-up': 'bg-emerald-100 text-emerald-700 border-emerald-200', Procedure: 'bg-purple-100 text-purple-700 border-purple-200', Emergency: 'bg-red-100 text-red-700 border-red-200', Telehealth: 'bg-teal-100 text-teal-700 border-teal-200', 'Lab Review': 'bg-amber-100 text-amber-700 border-amber-200' };
    return map[type] || 'bg-secondary-100 text-secondary-700 border-secondary-200';
  };

  const todayEvents = getEventsForDate(todayStr);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Schedule</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Manage your appointments and clinical schedule.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-0.5 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-0.5">
            <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'week' ? 'bg-white dark:bg-secondary-700 shadow-sm' : 'text-secondary-500'}`}><FiGrid size={12} className="inline mr-1" />Week</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'list' ? 'bg-white dark:bg-secondary-700 shadow-sm' : 'text-secondary-500'}`}><FiList size={12} className="inline mr-1" />List</button>
          </div>
          <button onClick={() => openCreate()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">
            <FiPlus size={16} /> New Appointment
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateWeek(-1)} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition"><FiChevronLeft size={18} /></button>
        <h2 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">
          {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
        <button onClick={() => navigateWeek(1)} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition"><FiChevronRight size={18} /></button>
      </div>

      {/* Week View */}
      {view === 'week' && (
        <Card>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px]">
              {weekDates.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                const dayEvents = getEventsForDate(dateStr);
                return (
                  <div key={dateStr} className={`border-r last:border-r-0 border-secondary-100 dark:border-secondary-800 min-h-[300px] ${isToday ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}>
                    <div className={`px-3 py-2.5 border-b border-secondary-100 dark:border-secondary-800 text-center ${isToday ? 'bg-primary-600 text-white' : 'bg-secondary-50 dark:bg-secondary-800/50'}`}>
                      <p className="text-[10px] font-medium uppercase">{DAYS[d.getDay()]}</p>
                      <p className={`text-lg font-bold ${isToday ? '' : 'text-secondary-700 dark:text-secondary-300'}`}>{d.getDate()}</p>
                    </div>
                    <div className="p-1.5 space-y-1">
                      {dayEvents.map(evt => (
                        <button key={evt.id} onClick={() => openEdit(evt)} className={`w-full text-left p-2 rounded-lg text-[10px] border transition hover:shadow-sm ${typeColor(evt.type)}`}>
                          <p className="font-semibold truncate">{evt.startTime} {evt.type}</p>
                          <p className="truncate opacity-75">{evt.patient}</p>
                        </button>
                      ))}
                      <button onClick={() => openCreate(dateStr)} className="w-full p-1.5 rounded-lg text-[10px] text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition text-center">+ Add</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card>
          <CardHeader title="Today's Schedule" subtitle={`${todayEvents.length} appointments`} />
          <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
            {todayEvents.length === 0 ? (
              <div className="px-5 py-12 text-center text-secondary-400"><FiCalendar size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No appointments today.</p></div>
            ) : todayEvents.map(evt => (
              <div key={evt.id} onClick={() => openEdit(evt)} className="px-5 py-3 flex items-center gap-4 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30 cursor-pointer transition">
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-sm font-bold text-secondary-900 dark:text-white">{evt.startTime}</p>
                  <p className="text-[10px] text-secondary-400">{evt.endTime}</p>
                </div>
                <div className={`w-1 h-10 rounded-full ${evt.type === 'Emergency' ? 'bg-urgent-500' : 'bg-primary-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">{evt.type}</p>
                  <p className="text-xs text-secondary-500">{evt.patient}</p>
                </div>
                <div className="flex items-center gap-2">
                  {evt.billable && <Badge variant="success">Billable</Badge>}
                  <Badge variant={evt.type === 'Emergency' ? 'danger' : 'info'}>{evt.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Event Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Appointment' : 'New Appointment'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Patient</label>
              <input value={form.patient} onChange={e => set('patient', e.target.value)} className={inputClass} placeholder="Patient name" /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Start</label>
                <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={inputClass} /></div>
              <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">End</label>
                <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className={inputClass} /></div>
            </div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Notes</label>
              <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className={inputClass + ' h-16 resize-none'} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.billable} onChange={e => set('billable', e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
              <label className="text-sm text-secondary-700 dark:text-secondary-300">Billable appointment</label>
            </div>
          </div>
        </div>
        <div className="flex justify-between pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <div>{editing && <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm text-urgent-600 hover:bg-urgent-50 transition">Delete</button>}</div>
          <div className="flex gap-3">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
            <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">{editing ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
