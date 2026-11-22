import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiFileText, FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiCheckCircle, FiLock } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ErrorState, Field, LoadingState, PageHeader, Pagination, Spinner } from '../../components/ui/States';
import PatientPicker from '../../components/PatientPicker';
import CodeSearch from '../../components/CodeSearch';
import { ehrApi, notesApi } from '../../services/providerService';
import useAuthStore from '../../store/authStore';
import useDebounce from '../../hooks/useDebounce';
import { errorMessage } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';
import { btnDanger, btnGhost, btnPrimary, btnSecondary, inputClass } from '../../utils/styles';

const PAGE_SIZE = 10;
const emptyForm = { patient: null, templateId: '', title: '', content: '', icdCodes: '', cptCodes: '' };
const STATUS_BADGE = { DRAFT: 'warning', SIGNED: 'success' };
const statusLabel = (s) => (s === 'SIGNED' ? 'Signed' : 'Draft');

export default function NotesPage() {
  const sub = useAuthStore((s) => s.user?.sub);
  const location = useLocation();
  const navigate = useNavigate();

  const [params, setParams] = useState({ status: '', query: '', page: 0 });
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim(), 350);
  const [result, setResult] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const reqId = useRef(0);

  const [templates, setTemplates] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null); // note being edited, or null for new
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [viewNote, setViewNote] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'sign'|'delete', note }
  const [acting, setActing] = useState(false);

  useEffect(() => {
    setParams((p) => (p.query === debounced ? p : { ...p, query: debounced, page: 0 }));
  }, [debounced]);

  const loadSummary = useCallback(() => {
    notesApi.summary().then(setSummary).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await notesApi.list({ page: params.page, size: PAGE_SIZE, status: params.status || undefined, query: params.query || undefined, mine: true });
      if (my !== reqId.current) return;
      setResult({ content: data?.content || [], totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 });
    } catch (err) {
      if (my === reqId.current) setLoadError(errorMessage(err, 'Could not load your notes.'));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    ehrApi.getTemplates().then((t) => setTemplates(Array.isArray(t) ? t.filter((x) => x.active !== false) : [])).catch(() => setTemplates([]));
  }, []);

  const refreshAll = () => { load(); loadSummary(); };

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const openCreate = useCallback((patient = null) => {
    setEditing(null);
    setForm({ ...emptyForm, patient });
    setErrors({});
    setEditorOpen(true);
  }, []);

  const openEdit = (note) => {
    setViewNote(null);
    setEditing(note);
    setForm({
      patient: null,
      templateId: note.templateId || '',
      title: note.title || '',
      content: note.content || '',
      icdCodes: note.icdCodes || '',
      cptCodes: note.cptCodes || '',
    });
    setErrors({});
    setEditorOpen(true);
  };

  // "Write note" from the patient page.
  useEffect(() => {
    const p = location.state?.newNoteFor;
    if (p) {
      openCreate(p);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickTemplate = (id) => {
    const t = templates.find((x) => String(x.id) === String(id));
    setForm((p) => ({ ...p, templateId: id, title: p.title.trim() ? p.title : (t?.name || '') }));
  };

  const validate = () => {
    const e = {};
    if (!editing && !form.patient) e.patient = 'Choose a patient';
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.trim().length > 200) e.title = 'Keep the title under 200 characters';
    if (!form.content.trim()) e.content = 'Write the note';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    const t = templates.find((x) => String(x.id) === String(form.templateId));
    const body = {
      title: form.title.trim(),
      content: form.content.trim(),
      icdCodes: form.icdCodes,
      cptCodes: form.cptCodes,
      ...(form.templateId ? { templateId: form.templateId, templateName: t?.name || editing?.templateName } : {}),
    };
    try {
      if (editing) {
        await notesApi.update(editing.id, body);
        toast.success('Draft saved');
      } else {
        await notesApi.create({ ...body, patientId: form.patient.id });
        toast.success('Note saved as a draft');
      }
      setEditorOpen(false);
      refreshAll();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the note.'));
    } finally {
      setSaving(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm || acting) return;
    setActing(true);
    try {
      if (confirm.kind === 'sign') {
        const signed = await notesApi.sign(confirm.note.id);
        toast.success('Note signed. It can no longer be edited.');
        setViewNote((v) => (v?.id === confirm.note.id ? signed : v));
      } else {
        await notesApi.remove(confirm.note.id);
        toast.success('Draft deleted');
        setViewNote(null);
      }
      setConfirm(null);
      refreshAll();
    } catch (err) {
      toast.error(errorMessage(err, confirm.kind === 'sign' ? 'Could not sign the note.' : 'Could not delete the note.'));
    } finally {
      setActing(false);
    }
  };

  const canEdit = (n) => n?.status === 'DRAFT' && n?.providerId === sub;
  const templateOptions = [{ value: '', label: 'No template' }, ...templates.map((t) => ({ value: t.id, label: t.category ? `${t.name} (${t.category})` : t.name }))];
  const hasFilters = !!(params.query || params.status);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clinical Notes"
        subtitle="Your encounter notes. Drafts can be edited until you sign them."
        actions={<button type="button" onClick={() => openCreate()} className={`${btnPrimary} w-full sm:w-auto`}><FiPlus size={16} /> New note</button>}
      />

      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        <Tabs
          tabs={[
            { key: '', label: 'All', count: summary ? summary.drafts + summary.signed : undefined },
            { key: 'DRAFT', label: 'Drafts', count: summary?.drafts },
            { key: 'SIGNED', label: 'Signed', count: summary?.signed },
          ]}
          activeKey={params.status}
          onChange={(k) => setParams((p) => ({ ...p, status: k, page: 0 }))}
        />
        <div className="relative flex-1 md:max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, text or patient…" aria-label="Search notes" className={`${inputClass} pl-9 pr-8`} />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-secondary-400 hover:text-secondary-600"><FiX size={13} /></button>}
        </div>
      </div>

      <Card>
        {loadError ? <ErrorState title="Could not load your notes" message={loadError} onRetry={load} />
          : loading && result.content.length === 0 ? <LoadingState />
            : result.content.length === 0 ? (
              <EmptyState
                icon={FiFileText}
                title={hasFilters ? 'No notes match' : 'No clinical notes yet'}
                description={hasFilters ? 'Try another search or tab.' : 'Document an encounter to create your first note.'}
                action={!hasFilters && <button type="button" onClick={() => openCreate()} className={btnPrimary}><FiPlus size={14} /> New note</button>}
              />
            ) : (
              <div className={`divide-y divide-secondary-100 dark:divide-secondary-800 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                {result.content.map((n) => (
                  <div key={n.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-secondary-50/60 dark:hover:bg-secondary-800/30 transition">
                    <button type="button" onClick={() => setViewNote(n)} className="flex-1 min-w-0 text-left">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white truncate max-w-full">{n.title}</h3>
                        <Badge variant={STATUS_BADGE[n.status] || 'gray'} dot>{statusLabel(n.status)}</Badge>
                        {n.templateName && <Badge variant="gray">{n.templateName}</Badge>}
                      </div>
                      <p className="text-xs text-secondary-600 dark:text-secondary-300 font-medium truncate">{n.patientName}</p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 line-clamp-2 break-words">{n.content}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-secondary-400">
                        <span>{n.status === 'SIGNED' ? `Signed ${formatDateTime(n.signedAt)}` : `Updated ${formatDateTime(n.updatedAt || n.createdAt)}`}</span>
                        {n.icdCodes && <span className="font-mono">ICD {n.icdCodes}</span>}
                        {n.cptCodes && <span className="font-mono">CPT {n.cptCodes}</span>}
                      </div>
                    </button>
                    {canEdit(n) && (
                      <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-center">
                        <button type="button" onClick={() => openEdit(n)} aria-label="Edit draft" className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-500 hover:text-primary-600 transition"><FiEdit2 size={14} /></button>
                        <button type="button" onClick={() => setConfirm({ kind: 'delete', note: n })} aria-label="Delete draft" className="p-2 rounded-lg hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-secondary-500 hover:text-urgent-600 transition"><FiTrash2 size={14} /></button>
                        <button type="button" onClick={() => setConfirm({ kind: 'sign', note: n })} className="px-3 py-1.5 rounded-lg text-xs bg-primary-600 hover:bg-primary-700 text-white font-medium transition">Sign</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        <Pagination page={params.page} totalPages={result.totalPages} totalElements={result.totalElements} disabled={loading}
          onChange={(page) => setParams((p) => ({ ...p, page }))} />
      </Card>

      {/* Create / edit draft */}
      <Modal
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        title={editing ? 'Edit draft' : 'New clinical note'}
        size="lg"
        footer={(
          <>
            <button type="button" onClick={() => setEditorOpen(false)} disabled={saving} className={btnGhost}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving ? <><Spinner size="sm" className="border-white border-t-transparent" /> Saving…</> : 'Save draft'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editing ? (
              <Field label="Patient"><p className="px-3 py-2 rounded-lg bg-secondary-50 dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white truncate">{editing.patientName}</p></Field>
            ) : (
              <Field label="Patient" required error={errors.patient}>
                <PatientPicker value={form.patient} onChange={(p) => set('patient', p)} error={errors.patient} />
              </Field>
            )}
            <Field label="Template">
              <Select name="templateId" value={form.templateId} onChange={(e) => pickTemplate(e.target.value)} options={templateOptions} searchable={templates.length > 8} />
            </Field>
          </div>
          <Field label="Title" required error={errors.title}>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} className={inputClass} placeholder="e.g. Follow-up visit" />
          </Field>
          <Field label="Note" required error={errors.content}>
            <textarea value={form.content} onChange={(e) => set('content', e.target.value)} className={`${inputClass} h-40 sm:h-48 resize-y`} placeholder="Subjective, objective, assessment, plan…" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="ICD-10 diagnoses">
              <CodeSearch kind="icd" multiple value={form.icdCodes} onChange={(v) => set('icdCodes', v)} />
            </Field>
            <Field label="CPT procedures">
              <CodeSearch kind="cpt" multiple value={form.cptCodes} onChange={(v) => set('cptCodes', v)} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Read a note */}
      <Modal
        open={!!viewNote}
        onClose={() => setViewNote(null)}
        title="Clinical note"
        size="lg"
        footer={viewNote && canEdit(viewNote) ? (
          <>
            <button type="button" onClick={() => setConfirm({ kind: 'delete', note: viewNote })} className={`${btnDanger} sm:mr-auto`}><FiTrash2 size={14} /> Delete</button>
            <button type="button" onClick={() => openEdit(viewNote)} className={btnSecondary}><FiEdit2 size={14} /> Edit</button>
            <button type="button" onClick={() => setConfirm({ kind: 'sign', note: viewNote })} className={btnPrimary}><FiCheckCircle size={14} /> Sign</button>
          </>
        ) : null}
      >
        {viewNote && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white break-words">{viewNote.title}</h3>
              <Badge variant={STATUS_BADGE[viewNote.status] || 'gray'} dot>{statusLabel(viewNote.status)}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="min-w-0"><span className="text-xs text-secondary-400">Patient</span><p className="font-medium text-secondary-900 dark:text-white truncate">{viewNote.patientName}</p></div>
              <div className="min-w-0"><span className="text-xs text-secondary-400">Author</span><p className="font-medium text-secondary-900 dark:text-white truncate">{viewNote.providerName}</p></div>
              <div><span className="text-xs text-secondary-400">Created</span><p className="font-medium text-secondary-900 dark:text-white">{formatDateTime(viewNote.createdAt)}</p></div>
              {viewNote.signedAt && <div><span className="text-xs text-secondary-400">Signed</span><p className="font-medium text-secondary-900 dark:text-white">{formatDateTime(viewNote.signedAt)}</p></div>}
              {viewNote.templateName && <div className="min-w-0"><span className="text-xs text-secondary-400">Template</span><p className="font-medium text-secondary-900 dark:text-white truncate">{viewNote.templateName}</p></div>}
              {viewNote.icdCodes && <div><span className="text-xs text-secondary-400">ICD-10</span><p className="font-mono font-medium text-secondary-900 dark:text-white break-words">{viewNote.icdCodes}</p></div>}
              {viewNote.cptCodes && <div><span className="text-xs text-secondary-400">CPT</span><p className="font-mono font-medium text-secondary-900 dark:text-white break-words">{viewNote.cptCodes}</p></div>}
            </div>
            <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl">
              <p className="text-sm text-secondary-700 dark:text-secondary-200 whitespace-pre-wrap break-words">{viewNote.content}</p>
            </div>
            {viewNote.status === 'SIGNED' && (
              <p className="text-xs text-secondary-400 flex items-center gap-1.5"><FiLock size={12} /> Signed notes are final and cannot be changed.</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => !acting && setConfirm(null)}
        onConfirm={runConfirm}
        loading={acting}
        variant={confirm?.kind === 'sign' ? 'primary' : 'danger'}
        title={confirm?.kind === 'sign' ? 'Sign this note?' : 'Delete this draft?'}
        message={confirm?.kind === 'sign'
          ? 'Signing makes the note final. It cannot be edited or deleted afterwards.'
          : `“${confirm?.note?.title || ''}” will be permanently deleted.`}
        confirmLabel={confirm?.kind === 'sign' ? 'Sign note' : 'Delete draft'}
      />
    </div>
  );
}
