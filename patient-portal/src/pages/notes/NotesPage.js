import { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiClock } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { appointmentApi } from '../../services/patientService';
import useAuthStore from '../../store/authStore';

export default function NotesPage() {
  const { user } = useAuthStore();
  const PID = user?.sub || 'PAT-001';
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewNote, setViewNote] = useState(null);

  useEffect(() => {
    (async () => {
      try { const d = await appointmentApi.getAll(PID); setAppts(d.filter(a => a.status === 'COMPLETED' && a.notes)); } catch { setAppts([]); }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Visit Notes</h1><p className="text-xs sm:text-sm text-secondary-500">Clinical notes from your past visits.</p></div>
      {loading ? <Card><div className="p-12 text-center text-secondary-400">Loading...</div></Card>
      : appts.length === 0 ? <Card><div className="p-12 text-center text-secondary-400"><FiFileText size={24} className="mx-auto mb-2 opacity-50" />No visit notes yet.</div></Card>
      : <div className="space-y-3">{appts.map(a => (
        <Card key={a.id}><div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:shadow-md transition" onClick={() => setViewNote(a)}>
          <div className="text-center w-14 flex-shrink-0 bg-primary-50 dark:bg-primary-900/20 rounded-xl py-2">
            <p className="text-[10px] font-bold text-primary-600 uppercase">{new Date(a.appointmentDate).toLocaleDateString('en-US',{month:'short'})}</p>
            <p className="text-lg font-bold text-primary-700">{new Date(a.appointmentDate).getDate()}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-secondary-900 dark:text-white">{a.providerName}</p>
            <p className="text-xs text-secondary-500">{a.providerSpecialty} — {a.type?.replace('_',' ')}</p>
            <p className="text-xs text-secondary-400 mt-1 line-clamp-2">{a.notes}</p>
          </div>
          <Badge variant="success" dot>Completed</Badge>
        </div></Card>
      ))}</div>}

      <Modal open={!!viewNote} onClose={() => setViewNote(null)} title="Visit Note" size="lg">
        {viewNote && (<div className="space-y-4">
          <div className="flex items-center gap-3"><FiClock size={14} className="text-secondary-400" /><span className="text-sm text-secondary-600">{new Date(viewNote.appointmentDate).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} at {viewNote.startTime?.substring(0,5)}</span></div>
          <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-secondary-400">Provider</p><p className="text-sm font-medium">{viewNote.providerName}</p></div><div><p className="text-xs text-secondary-400">Specialty</p><p className="text-sm font-medium">{viewNote.providerSpecialty}</p></div><div><p className="text-xs text-secondary-400">Visit Type</p><p className="text-sm font-medium">{viewNote.type?.replace('_',' ')}</p></div><div><p className="text-xs text-secondary-400">Reason</p><p className="text-sm font-medium">{viewNote.reason}</p></div></div>
          <div><p className="text-xs font-semibold text-secondary-500 uppercase mb-2">Clinical Notes</p><div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl"><p className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">{viewNote.notes}</p></div></div>
        </div>)}
      </Modal>
    </div>
  );
}
