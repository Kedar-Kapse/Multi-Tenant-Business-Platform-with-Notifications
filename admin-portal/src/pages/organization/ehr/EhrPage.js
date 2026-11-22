import { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiFileText, FiCode, FiBook, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import Card, { CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { ehrApi } from '../../../services/organizationService';
import Select from '../../../components/ui/Select';
import { toast } from '../../../components/ui/Toast';

const CATEGORIES = ['Registration', 'Clinical Notes', 'Discharge', 'Surgery', 'Pharmacy', 'Behavioral Health', 'Pediatrics', 'Emergency', 'Radiology', 'Laboratory', 'Rehabilitation', 'Communication', 'Legal'];

const emptyTemplate = { name: '', description: '', category: 'Clinical Notes', fieldCount: 1, specialty: '', version: '1.0', active: true };
const emptyCode = { code: '', description: '', category: '', subcategory: '' };

export default function EhrPage() {
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [codes, setCodes] = useState([]);
  const [codeType, setCodeType] = useState('icd');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Autocomplete dropdown
  const [codesLoading, setCodesLoading] = useState(false);

  // Template modal
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [saving, setSaving] = useState(false);

  // Code modal
  const [codeModal, setCodeModal] = useState(false);
  const [codeForm, setCodeForm] = useState(emptyCode);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (message, type = 'success') => (type === 'error' ? toast.error(message) : toast.success(message));

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ehrApi.getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);


  // Clear results when switching code type
  const switchCodeType = (type) => {
    setCodeType(type);
    setCodes([]);
    setSearch('');
  };

  // Also load full table when search is used
  const codeRequest = useRef(0);
  const searchCodes = useCallback(async (q) => {
    const id = ++codeRequest.current;
    if (!q || q.trim().length < 2) { setCodes([]); setCodesLoading(false); return; }
    setCodesLoading(true);
    try {
      const fn = codeType === 'icd' ? ehrApi.getIcdCodes : ehrApi.getCptCodes;
      const data = await fn(q.trim());
      if (id === codeRequest.current) setCodes(Array.isArray(data) ? data.slice(0, 100) : []);
    } catch {
      if (id === codeRequest.current) { setCodes([]); toast.error('Code search failed'); }
    } finally {
      if (id === codeRequest.current) setCodesLoading(false);
    }
  }, [codeType]);

  // Typing searches the code library (debounced); results fill the table below.
  useEffect(() => {
    if (tab !== 'codes') return undefined;
    const timer = setTimeout(() => searchCodes(search), 300);
    return () => clearTimeout(timer);
  }, [search, tab, searchCodes]);

  // ── Template CRUD ──
  const openCreateTemplate = () => { setEditingTemplate(null); setTemplateForm(emptyTemplate); setTemplateModal(true); };
  const openEditTemplate = (t) => {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, description: t.description || '', category: t.category, fieldCount: t.fieldCount, specialty: t.specialty || '', version: t.version || '1.0', active: t.active });
    setTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.category) { showToast('Name and category are required', 'error'); return; }
    setSaving(true);
    try {
      if (editingTemplate) {
        await ehrApi.updateTemplate(editingTemplate.id, templateForm);
        showToast('Template updated');
      } else {
        await ehrApi.createTemplate(templateForm);
        showToast('Template created');
      }
      setTemplateModal(false);
      loadTemplates();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save template', 'error');
    } finally { setSaving(false); }
  };

  const toggleTemplate = async (t) => {
    try {
      await ehrApi.toggleTemplate(t.id);
      showToast(`${t.name} ${t.active ? 'disabled' : 'enabled'}`);
      loadTemplates();
    } catch { showToast('Failed to toggle template', 'error'); }
  };

  const deleteTemplate = async (id) => {
    try {
      await ehrApi.deleteTemplate(id);
      setDeleteConfirm(null);
      showToast('Template deleted');
      loadTemplates();
    } catch { showToast('Failed to delete template', 'error'); }
  };

  // ── Code CRUD ──
  const openCreateCode = () => { setCodeForm({ ...emptyCode, category: codeType === 'icd' ? 'General' : 'E&M' }); setCodeModal(true); };

  const saveCode = async () => {
    if (!codeForm.code.trim() || !codeForm.description.trim()) { showToast('Code and description are required', 'error'); return; }
    setSaving(true);
    try {
      const fn = codeType === 'icd' ? ehrApi.createIcdCode : ehrApi.createCptCode;
      await fn(codeForm);
      showToast(`${codeType.toUpperCase()} code added`);
      setCodeModal(false);
      searchCodes(search);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add code', 'error');
    } finally { setSaving(false); }
  };

  const deleteCode = async (id) => {
    try {
      const fn = codeType === 'icd' ? ehrApi.deleteIcdCode : ehrApi.deleteCptCode;
      await fn(id);
      setDeleteConfirm(null);
      showToast('Code deleted');
      searchCodes(search);
    } catch { showToast('Failed to delete code', 'error'); }
  };

  const setTF = (k, v) => setTemplateForm(p => ({ ...p, [k]: v }));
  const setCF = (k, v) => setCodeForm(p => ({ ...p, [k]: v }));
  const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

  return (
    <div className="space-y-4">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">EHR Configuration</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Manage templates, ICD-10, and CPT code library.</p>
        </div>
        {tab === 'templates' && (
          <button onClick={openCreateTemplate} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
            <FiPlus size={16} /> Add Template
          </button>
        )}
        {tab === 'codes' && (
          <button onClick={openCreateCode} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
            <FiPlus size={16} /> Add {codeType.toUpperCase()} Code
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl p-1 w-fit">
        {[{ key: 'templates', label: 'Templates', icon: FiFileText }, { key: 'codes', label: 'Code Library', icon: FiCode }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ TEMPLATES TAB ═══════ */}
      {tab === 'templates' && (
        <Card>
          <CardHeader title="EHR Templates" subtitle={`${templates.length} templates configured`} />
          {loading ? (
            <div className="p-12 text-center text-secondary-400"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Loading...</div>
          ) : templates.length === 0 ? (
            <div className="p-12 text-center text-secondary-400">
              <FiFileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No templates configured yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-5">
              {templates.map((t) => (
                <div key={t.id} className={`p-4 rounded-xl border transition ${t.active ? 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300' : 'border-dashed border-secondary-300 dark:border-secondary-600 opacity-60'}`}>
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                      <FiFileText size={16} />
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={t.active ? 'success' : 'gray'}>{t.active ? 'Active' : 'Draft'}</Badge>
                    </div>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-secondary-900 dark:text-white">{t.name}</h3>
                  <p className="text-xs text-secondary-500 mt-1 line-clamp-2">{t.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-secondary-400">
                    <span>{t.category}</span><span>·</span><span>{t.fieldCount} fields</span>
                    {t.specialty && <><span>·</span><span>{t.specialty}</span></>}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700">
                    <button onClick={() => toggleTemplate(t)} title={t.active ? 'Disable' : 'Enable'} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 hover:text-primary-600 transition">
                      {t.active ? <FiToggleRight size={16} className="text-success-500" /> : <FiToggleLeft size={16} />}
                    </button>
                    <button onClick={() => openEditTemplate(t)} title="Edit" className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 hover:text-primary-600 transition">
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'template', id: t.id, name: t.name })} title="Delete" className="p-1.5 rounded-lg hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-secondary-500 hover:text-urgent-600 transition">
                      <FiTrash2 size={14} />
                    </button>
                    <span className="ml-auto text-xs text-secondary-400">v{t.version || '1.0'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ═══════ CODE LIBRARY TAB ═══════ */}
      {tab === 'codes' && (
        <Card>
          <CardHeader title="Medical Code Library" subtitle="Search, add and remove ICD-10 and CPT codes" action={
            <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-0.5">
              <button onClick={() => switchCodeType('icd')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${codeType === 'icd' ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-500'}`}>ICD-10</button>
              <button onClick={() => switchCodeType('cpt')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${codeType === 'cpt' ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-500'}`}>CPT</button>
            </div>
          } />

          {/* Search with autocomplete dropdown */}
          <div className="p-4 border-b border-secondary-100 dark:border-secondary-700">
            <div className="relative max-w-lg">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 z-10" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${codeType.toUpperCase()} codes by code or description (2+ characters)`}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm text-secondary-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              />

            </div>
          </div>

          {/* Search results */}
          {codes.length === 0 ? (
            <div className="p-12 text-center text-secondary-400">
              <FiBook size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{codesLoading ? 'Searching…' : search.trim().length < 2 ? 'Type at least 2 characters to search the code library.' : 'No codes found.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-medium">Code</th>
                    <th className="px-5 py-3 text-left font-medium">Description</th>
                    <th className="px-5 py-3 text-left font-medium">Category</th>
                    <th className="px-5 py-3 text-left font-medium">Subcategory</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                  {codes.map((c) => {
                    return (
                      <tr key={c.id} className="transition-colors hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                        <td className="px-5 py-3 font-mono font-semibold text-primary-600">{c.code}</td>
                        <td className="px-5 py-3 text-secondary-700 dark:text-secondary-300">{c.description}</td>
                        <td className="px-5 py-3"><Badge variant="gray">{c.category}</Badge></td>
                        <td className="px-5 py-3 text-secondary-500 text-xs">{c.subcategory || '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setDeleteConfirm({ type: 'code', id: c.id, name: c.code })} title="Delete" className="p-1.5 rounded-lg hover:bg-urgent-50 dark:hover:bg-urgent-900/20 text-secondary-500 hover:text-urgent-600 transition">
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ═══════ TEMPLATE MODAL ═══════ */}
      <Modal open={templateModal} onClose={() => setTemplateModal(false)} title={editingTemplate ? 'Edit Template' : 'Add Template'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Template Name *</label>
              <input value={templateForm.name} onChange={(e) => setTF('name', e.target.value)} className={inputClass} placeholder="e.g., Patient Intake Form" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description</label>
              <textarea value={templateForm.description} onChange={(e) => setTF('description', e.target.value)} className={inputClass + ' h-20 resize-none'} placeholder="Describe the purpose of this template..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Category *</label>
              <Select value={templateForm.category} onChange={(e) => setTF('category', e.target.value)} className={inputClass}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Specialty</label>
              <input value={templateForm.specialty} onChange={(e) => setTF('specialty', e.target.value)} className={inputClass} placeholder="e.g., Cardiology" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Number of Fields</label>
              <input type="number" min="1" max="100" value={templateForm.fieldCount} onChange={(e) => setTF('fieldCount', parseInt(e.target.value) || 1)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Version</label>
              <input value={templateForm.version} onChange={(e) => setTF('version', e.target.value)} className={inputClass} placeholder="1.0" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setTemplateModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
          <button onClick={saveTemplate} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
            {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </Modal>

      {/* ═══════ CODE MODAL ═══════ */}
      <Modal open={codeModal} onClose={() => setCodeModal(false)} title={`Add ${codeType.toUpperCase()} Code`} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Code *</label>
            <input value={codeForm.code} onChange={(e) => setCF('code', e.target.value.toUpperCase())} className={inputClass} placeholder={codeType === 'icd' ? 'e.g., E11.9' : 'e.g., 99213'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Description *</label>
            <textarea value={codeForm.description} onChange={(e) => setCF('description', e.target.value)} className={inputClass + ' h-16 resize-none'} placeholder="Full description of the code..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Category</label>
              <input value={codeForm.category} onChange={(e) => setCF('category', e.target.value)} className={inputClass} placeholder="e.g., Endocrine" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Subcategory</label>
              <input value={codeForm.subcategory} onChange={(e) => setCF('subcategory', e.target.value)} className={inputClass} placeholder="e.g., Diabetes" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setCodeModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
          <button onClick={saveCode} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">
            {saving ? 'Saving...' : `Add ${codeType.toUpperCase()} Code`}
          </button>
        </div>
      </Modal>

      {/* ═══════ DELETE CONFIRM ═══════ */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={`Delete ${deleteConfirm?.type === 'template' ? 'Template' : 'Code'}`} size="sm">
        <p className="text-sm text-secondary-700 dark:text-secondary-300">
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition">Cancel</button>
          <button onClick={() => deleteConfirm?.type === 'template' ? deleteTemplate(deleteConfirm.id) : deleteCode(deleteConfirm.id)} className="px-4 py-2 rounded-lg bg-urgent-600 hover:bg-urgent-700 text-white text-sm font-medium transition">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
