import { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { ehrApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

export default function NotesPage() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewNote, setViewNote] = useState(null);
  const [form, setForm] = useState({ patient: '', template: '', content: '', icdCode: '', cptCode: '' });
  const [toast, setToast] = useState(null);
  const [icdSuggestions, setIcdSuggestions] = useState([]);
  const [cptSuggestions, setCptSuggestions] = useState([]);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tmpl = await ehrApi.getTemplates();
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Generate clinical notes from templates
  useEffect(() => {
    if (templates.length > 0 && notes.length === 0) {
      const patients = ['Rahul Sharma', 'Sneha Kulkarni', 'Vikram Singh', 'Priya Chopra', 'Amit Patel'];
      const generated = templates.filter(t => t.active).slice(0, 8).map((t, i) => ({
        id: `note-${i}`,
        patient: patients[i % patients.length],
        template: t.name,
        category: t.category,
        content: `Clinical note using ${t.name} template. ${t.description || ''}`,
        author: user?.fullName || user?.username || 'Provider',
        createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
        status: i < 3 ? 'Draft' : 'Signed',
      }));
      setNotes(generated);
    }
  }, [templates]); // eslint-disable-line

  const searchIcd = async (q) => {
    if (q.length < 2) { setIcdSuggestions([]); return; }
    try { setIcdSuggestions(await ehrApi.searchIcd(q)); } catch { setIcdSuggestions([]); }
  };

  const searchCpt = async (q) => {
    if (q.length < 2) { setCptSuggestions([]); return; }
    try { setCptSuggestions(await ehrApi.searchCpt(q)); } catch { setCptSuggestions([]); }
  };

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return !q || [n.patient, n.template, n.content, n.category].some(f => f?.toLowerCase().includes(q));
  });

  const openCreate = () => {
    setForm({ patient: '', template: templates[0]?.name || '', content: '', icdCode: '', cptCode: '' });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.patient.trim() || !form.content.trim()) { showToast('Patient and content are required', 'error'); return; }
    const tmpl = templates.find(t => t.name === form.template);
    setNotes(prev => [{
      id: `note-new-${Date.now()}`,
      patient: form.patient,
      template: form.template,
      category: tmpl?.category || 'General',
      content: form.content,
      icdCode: form.icdCode,
      cptCode: form.cptCode,
      author: user?.fullName || 'Provider',
      createdAt: new Date().toISOString(),
      status: 'Draft',
    }, ...prev]);
    setModalOpen(false);
    showToast('Note created');
  };

  const signNote = (id) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, status: 'Signed' } : n));
    showToast('Note signed');
  };

  return (
    <div className="space-y-4">
      {toast && (<div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.msg}<button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button></div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Clinical Notes</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Document patient encounters using EHR templates.</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
          <FiPlus size={16} /> New Note
        </button>
      </div>

      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {loading ? <div className="p-12 text-center text-secondary-400">Loading...</div>
        : filtered.length === 0 ? <Card><div className="p-12 text-center text-secondary-400"><FiFileText size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No notes found.</p></div></Card>
        : filtered.map(n => (
          <Card key={n.id}>
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{n.patient}</h3>
                  <Badge variant={n.status === 'Signed' ? 'success' : 'warning'} dot>{n.status}</Badge>
                  <Badge variant="gray">{n.category}</Badge>
                </div>
                <p className="text-xs text-secondary-500">Template: {n.template}</p>
                <p className="text-xs text-secondary-400 mt-1 line-clamp-2">{n.content}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-secondary-400">
                  <span>By {n.author}</span>
                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  {n.icdCode && <span>ICD: {n.icdCode}</span>}
                  {n.cptCode && <span>CPT: {n.cptCode}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setViewNote(n)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition"><FiEye size={14} /></button>
                {n.status === 'Draft' && <button onClick={() => signNote(n.id)} className="px-3 py-1.5 rounded-lg text-xs bg-primary-600 hover:bg-primary-700 text-white font-medium transition">Sign</button>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Note Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Clinical Note" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Patient *</label>
              <input value={form.patient} onChange={e => set('patient', e.target.value)} className={inputClass} placeholder="Patient name" /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Template</label>
              <select value={form.template} onChange={e => set('template', e.target.value)} className={inputClass}>
                {templates.filter(t => t.active).map(t => <option key={t.id} value={t.name}>{t.name} ({t.category})</option>)}
              </select></div>
            <div className="relative">
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">ICD-10 Code</label>
              <input value={form.icdCode} onChange={e => { set('icdCode', e.target.value); searchIcd(e.target.value); }} className={inputClass} placeholder="Search ICD codes..." />
              {icdSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-secondary-800 border rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                  {icdSuggestions.map(s => (
                    <button key={s.id} onClick={() => { set('icdCode', s.code); setIcdSuggestions([]); }} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-50 dark:hover:bg-secondary-700">
                      <span className="font-mono font-bold text-primary-600">{s.code}</span> — {s.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">CPT Code</label>
              <input value={form.cptCode} onChange={e => { set('cptCode', e.target.value); searchCpt(e.target.value); }} className={inputClass} placeholder="Search CPT codes..." />
              {cptSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-secondary-800 border rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                  {cptSuggestions.map(s => (
                    <button key={s.id} onClick={() => { set('cptCode', s.code); setCptSuggestions([]); }} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-50 dark:hover:bg-secondary-700">
                      <span className="font-mono font-bold text-primary-600">{s.code}</span> — {s.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Clinical Notes *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} className={inputClass + ' h-40 resize-none'} placeholder="Enter clinical documentation..." /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition">Save Note</button>
        </div>
      </Modal>

      {/* View Note Modal */}
      <Modal open={!!viewNote} onClose={() => setViewNote(null)} title="Clinical Note" size="lg">
        {viewNote && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">{viewNote.patient}</h3>
              <Badge variant={viewNote.status === 'Signed' ? 'success' : 'warning'} dot>{viewNote.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-secondary-400">Template</span><p className="font-medium">{viewNote.template}</p></div>
              <div><span className="text-xs text-secondary-400">Category</span><p className="font-medium">{viewNote.category}</p></div>
              <div><span className="text-xs text-secondary-400">Author</span><p className="font-medium">{viewNote.author}</p></div>
              <div><span className="text-xs text-secondary-400">Date</span><p className="font-medium">{new Date(viewNote.createdAt).toLocaleString()}</p></div>
              {viewNote.icdCode && <div><span className="text-xs text-secondary-400">ICD-10</span><p className="font-mono font-medium">{viewNote.icdCode}</p></div>}
              {viewNote.cptCode && <div><span className="text-xs text-secondary-400">CPT</span><p className="font-mono font-medium">{viewNote.cptCode}</p></div>}
            </div>
            <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl"><p className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">{viewNote.content}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
