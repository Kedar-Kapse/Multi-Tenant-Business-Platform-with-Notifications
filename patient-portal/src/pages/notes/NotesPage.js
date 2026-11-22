import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiFileText, FiClock, FiUser, FiChevronRight } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, SkeletonList } from '../../components/ui/States';
import { clinicalNoteApi } from '../../services/patientService';
import { errorMessage, formatDateTime, formatServerDate, parseServerDateTime } from '../../utils/format';

const codes = (s) => String(s || '').split(/[,;\s]+/).map((c) => c.trim()).filter(Boolean);

export default function NotesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewNote, setViewNote] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await clinicalNoteApi.mine();
      setNotes(Array.isArray(d) ? d : []);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your visit notes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...notes].sort((a, b) =>
    (parseServerDateTime(b.signedAt)?.getTime() || 0) - (parseServerDateTime(a.signedAt)?.getTime() || 0)), [notes]);

  // Opened from the dashboard with a specific note.
  useEffect(() => {
    const id = location.state?.noteId;
    if (!id || !notes.length) return;
    const n = notes.find((x) => x.id === id);
    if (n) setViewNote(n);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, notes, navigate]);

  return (
    <div className="space-y-4">
      <PageHeader title="Visit notes" subtitle="Notes your clinicians have signed after your visits." />

      {error ? (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      ) : loading ? (
        <SkeletonList rows={3} />
      ) : sorted.length === 0 ? (
        <Card><EmptyState icon={FiFileText} title="No visit notes yet" description="When a clinician signs a note from one of your visits, it will appear here." /></Card>
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => (
            <li key={n.id}>
              <Card>
                <button type="button" onClick={() => setViewNote(n)} className="w-full text-left p-3.5 sm:p-4 flex items-start gap-3 sm:gap-4 hover:bg-secondary-50/60 dark:hover:bg-secondary-800/40 rounded-2xl transition">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0"><FiFileText className="text-primary-600" size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{n.title || 'Visit note'}</p>
                    <p className="text-xs text-secondary-500 mt-0.5 truncate">{n.providerName} · {formatServerDate(n.signedAt)}</p>
                    {n.content && <p className="text-xs text-secondary-400 mt-1.5 line-clamp-2 break-words">{n.content}</p>}
                  </div>
                  <FiChevronRight className="text-secondary-300 flex-shrink-0 self-center" size={18} />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!viewNote} onClose={() => setViewNote(null)} title={viewNote?.title || 'Visit note'} size="lg">
        {viewNote && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-1.5 text-sm text-secondary-600 dark:text-secondary-300">
              <span className="flex items-center gap-2"><FiUser size={14} className="text-secondary-400" />{viewNote.providerName}</span>
              <span className="flex items-center gap-2"><FiClock size={14} className="text-secondary-400" />Signed {formatDateTime(viewNote.signedAt)}</span>
            </div>
            {viewNote.templateName && <p className="text-xs text-secondary-500">Note type: {viewNote.templateName}</p>}
            <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
              <p className="text-sm text-secondary-800 dark:text-secondary-200 whitespace-pre-wrap break-words leading-relaxed">{viewNote.content || 'This note has no text.'}</p>
            </div>
            {(codes(viewNote.icdCodes).length > 0 || codes(viewNote.cptCodes).length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {codes(viewNote.icdCodes).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-secondary-500 uppercase mb-1.5">Diagnosis codes (ICD)</p>
                    <div className="flex flex-wrap gap-1.5">{codes(viewNote.icdCodes).map((c) => <Badge key={c} variant="info">{c}</Badge>)}</div>
                  </div>
                )}
                {codes(viewNote.cptCodes).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-secondary-500 uppercase mb-1.5">Procedure codes (CPT)</p>
                    <div className="flex flex-wrap gap-1.5">{codes(viewNote.cptCodes).map((c) => <Badge key={c} variant="gray">{c}</Badge>)}</div>
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] text-secondary-400">Questions about this note? Send your clinician a message.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
