import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiHome, FiX, FiCheckCircle, FiAlertTriangle, FiPackage, FiGrid } from 'react-icons/fi';
import Card, { CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { facilityApi, bedApi, pharmacyApi } from '../../../services/organizationService';

const BED_TYPES = ['ICU','GENERAL','PRIVATE','SEMI_PRIVATE','EMERGENCY','NICU','PICU','MATERNITY','ISOLATION','BURN_UNIT'];
const BED_STATUSES = ['AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE','CLEANING','OUT_OF_SERVICE'];
const DOSAGE_FORMS = ['TABLET','CAPSULE','INJECTION','SYRUP','CREAM','IV_FLUID','OINTMENT','DROPS','INHALER','PATCH'];
const STORAGE_CONDITIONS = ['ROOM_TEMP','REFRIGERATED','FROZEN','CONTROLLED'];
const SCHEDULE_CLASSES = ['OTC','SCHEDULE_II','SCHEDULE_III','SCHEDULE_IV','SCHEDULE_V'];

const STATUS_COLORS = { AVAILABLE:'success', OCCUPIED:'danger', RESERVED:'warning', MAINTENANCE:'gray', CLEANING:'info', OUT_OF_SERVICE:'gray',
  IN_STOCK:'success', LOW_STOCK:'warning', OUT_OF_STOCK:'danger', EXPIRED:'danger', ACTIVE:'success', INACTIVE:'gray' };

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

export default function InventoryPage() {
  const [tab, setTab] = useState('facilities');
  const [facilities, setFacilities] = useState([]);
  const [beds, setBeds] = useState([]);
  const [pharmacy, setPharmacy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const loadFacilities = useCallback(async () => {
    setLoading(true);
    try { setFacilities(await facilityApi.getAll()); } catch { setFacilities([]); }
    finally { setLoading(false); }
  }, []);

  const loadBeds = useCallback(async () => {
    setLoading(true);
    try { setBeds(await bedApi.getAll(selectedFacility?.id)); } catch { setBeds([]); }
    finally { setLoading(false); }
  }, [selectedFacility]);

  const loadPharmacy = useCallback(async () => {
    setLoading(true);
    try { setPharmacy(await pharmacyApi.getAll(selectedFacility?.id)); } catch { setPharmacy([]); }
    finally { setLoading(false); }
  }, [selectedFacility]);

  useEffect(() => { loadFacilities(); }, [loadFacilities]);
  useEffect(() => { if (tab === 'beds') loadBeds(); }, [tab, loadBeds]);
  useEffect(() => { if (tab === 'pharmacy') loadPharmacy(); }, [tab, loadPharmacy]);

  // ── Facility CRUD ──
  const openFacilityModal = (f = null) => {
    setEditing(f); setModalType('facility');
    setForm(f ? { name: f.name, facilityType: f.facilityType || '', address: f.address || '', city: f.city || '', state: f.state || '', zipCode: f.zipCode || '', phone: f.phone || '', email: f.email || '', totalBeds: f.totalBeds || 0 }
      : { name: '', facilityCode: '', facilityType: 'HOSPITAL', address: '', city: '', state: '', zipCode: '', phone: '', email: '', totalBeds: 10, tenantId: '' });
    setModalOpen(true);
  };
  const saveFacility = async () => {
    if (!form.name?.trim()) { showToast('Name is required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) { await facilityApi.update(editing.id, form); showToast('Facility updated'); }
      else {
        if (!form.facilityCode?.trim()) { showToast('Code is required', 'error'); setSaving(false); return; }
        await facilityApi.create({ ...form, tenantId: form.tenantId || (facilities[0]?.tenantId) });
        showToast('Facility created');
      }
      setModalOpen(false); loadFacilities();
    } catch (e) { showToast(e?.response?.data?.message || 'Save failed', 'error'); } finally { setSaving(false); }
  };

  // ── Bed CRUD ──
  const openBedModal = (b = null) => {
    setEditing(b); setModalType('bed');
    setForm(b ? { wardName: b.wardName, roomNumber: b.roomNumber, bedNumber: b.bedNumber, bedType: b.bedType, status: b.status, assignedPatientId: b.assignedPatientId || '', assignedPatientName: b.assignedPatientName || '', notes: b.notes || '' }
      : { wardName: '', roomNumber: '', bedNumber: '', bedType: 'GENERAL', status: 'AVAILABLE', notes: '' });
    setModalOpen(true);
  };
  const saveBed = async () => {
    if (!form.wardName?.trim() || !form.roomNumber?.trim() || !form.bedNumber?.trim()) { showToast('Ward, Room, Bed required', 'error'); return; }
    if (!selectedFacility && !editing) { showToast('Select a facility first', 'error'); return; }
    setSaving(true);
    try {
      if (editing) { await bedApi.update(editing.id, form); showToast('Bed updated'); }
      else { await bedApi.create(selectedFacility.id, form); showToast('Bed created'); }
      setModalOpen(false); loadBeds();
    } catch (e) { showToast(e?.response?.data?.message || 'Save failed', 'error'); } finally { setSaving(false); }
  };

  // ── Pharmacy CRUD ──
  const openPharmacyModal = (p = null) => {
    setEditing(p); setModalType('pharmacy');
    setForm(p ? { medicineName: p.medicineName, category: p.category, batchNumber: p.batchNumber, manufacturer: p.manufacturer || '', dosageForm: p.dosageForm || '', strength: p.strength || '', quantity: p.quantity, minimumStockLevel: p.minimumStockLevel || 50, expiryDate: p.expiryDate || '', unitPrice: p.unitPrice || '', storageCondition: p.storageCondition || '', scheduleClass: p.scheduleClass || '', notes: p.notes || '' }
      : { medicineName: '', category: '', batchNumber: '', manufacturer: '', dosageForm: 'TABLET', strength: '', quantity: 0, minimumStockLevel: 50, expiryDate: '', unitPrice: '', storageCondition: 'ROOM_TEMP', scheduleClass: 'OTC', notes: '', facilityId: selectedFacility?.id || '' });
    setModalOpen(true);
  };
  const savePharmacy = async () => {
    if (!form.medicineName?.trim() || !form.category?.trim() || !form.batchNumber?.trim()) { showToast('Medicine, category, batch required', 'error'); return; }
    setSaving(true);
    try {
      if (editing) { await pharmacyApi.update(editing.id, form); showToast('Stock updated'); }
      else {
        const fid = form.facilityId || selectedFacility?.id;
        if (!fid) { showToast('Select a facility first', 'error'); setSaving(false); return; }
        await pharmacyApi.create({ ...form, facilityId: fid }); showToast('Stock added');
      }
      setModalOpen(false); loadPharmacy();
    } catch (e) { showToast(e?.response?.data?.message || 'Save failed', 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      if (deleteConfirm.type === 'facility') { await facilityApi.delete(deleteConfirm.id); loadFacilities(); }
      else if (deleteConfirm.type === 'bed') { await bedApi.delete(deleteConfirm.id); loadBeds(); }
      else { await pharmacyApi.delete(deleteConfirm.id); loadPharmacy(); }
      setDeleteConfirm(null); showToast('Deleted');
    } catch (e) { showToast(e?.response?.data?.message || 'Delete failed', 'error'); }
  };

  const handleSave = () => { if (modalType === 'facility') saveFacility(); else if (modalType === 'bed') saveBed(); else savePharmacy(); };
  const filtered = (list) => { const q = search.toLowerCase(); if (!q) return list; return list.filter(i => JSON.stringify(i).toLowerCase().includes(q)); };

  return (
    <div className="space-y-4">
      {toast && (<div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.msg}<button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button></div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Inventory & Facility</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Manage facilities, beds, and pharmacy stock.</p>
        </div>
        <button onClick={() => { if (tab === 'facilities') openFacilityModal(); else if (tab === 'beds') openBedModal(); else openPharmacyModal(); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
          <FiPlus size={16} /> Add {tab === 'facilities' ? 'Facility' : tab === 'beds' ? 'Bed' : 'Medicine'}
        </button>
      </div>

      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl p-1 w-fit">
        {[{ key: 'facilities', label: 'Facilities', icon: FiHome }, { key: 'beds', label: 'Beds', icon: FiGrid }, { key: 'pharmacy', label: 'Pharmacy', icon: FiPackage }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${tab === t.key ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-500'}`}><t.icon size={14} /> {t.label}</button>
        ))}
      </div>

      {(tab === 'beds' || tab === 'pharmacy') && facilities.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <label className="text-xs font-medium text-secondary-500">Facility:</label>
          <select value={selectedFacility?.id || ''} onChange={e => setSelectedFacility(facilities.find(f => f.id === e.target.value) || null)} className="px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      )}

      <div className="relative max-w-sm"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" /></div>

      {/* FACILITIES */}
      {tab === 'facilities' && (<Card><div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider"><th className="px-4 py-3 text-left">Facility</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Beds</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
          {loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-secondary-400">Loading...</td></tr>
          : filtered(facilities).length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-secondary-400"><FiHome size={24} className="mx-auto mb-2 opacity-50" />No facilities.</td></tr>
          : filtered(facilities).map(f => (<tr key={f.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
            <td className="px-4 py-3 font-medium text-secondary-900 dark:text-white">{f.name}</td>
            <td className="px-4 py-3"><span className="font-mono text-xs px-2 py-1 rounded bg-secondary-100 dark:bg-secondary-800">{f.facilityCode}</span></td>
            <td className="px-4 py-3 text-secondary-500 text-xs">{f.facilityType?.replace('_',' ') || '—'}</td>
            <td className="px-4 py-3 text-secondary-500 text-xs">{[f.city, f.state].filter(Boolean).join(', ') || '—'}</td>
            <td className="px-4 py-3 font-semibold">{f.totalBeds || 0}</td>
            <td className="px-4 py-3"><Badge variant={STATUS_COLORS[f.status] || 'gray'} dot>{f.status}</Badge></td>
            <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
              <button onClick={() => openFacilityModal(f)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition"><FiEdit2 size={14} /></button>
              {f.status === 'ACTIVE' ? <button onClick={() => setDeleteConfirm({ type:'facility', id:f.id, name:f.name })} className="p-1.5 rounded-lg hover:bg-urgent-50 text-secondary-500 hover:text-urgent-600 transition"><FiTrash2 size={14} /></button>
              : <button onClick={async () => { await facilityApi.activate(f.id); showToast('Activated'); loadFacilities(); }} className="p-1.5 rounded-lg hover:bg-emerald-50 text-secondary-500 hover:text-emerald-600 transition"><FiCheckCircle size={14} /></button>}
            </div></td></tr>))}
        </tbody></table></div></Card>)}

      {/* BEDS */}
      {tab === 'beds' && (<Card>
        <CardHeader title="Bed Management" subtitle={`${beds.length} beds${selectedFacility ? ' in ' + selectedFacility.name : ''}`} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
          {loading ? <div className="col-span-full text-center py-12 text-secondary-400">Loading...</div>
          : filtered(beds).length === 0 ? <div className="col-span-full text-center py-12 text-secondary-400"><FiGrid size={24} className="mx-auto mb-2 opacity-50" />No beds.</div>
          : filtered(beds).map(b => (
            <div key={b.id} onClick={() => openBedModal(b)} className={`p-3 rounded-xl border cursor-pointer transition hover:shadow-md ${b.status === 'AVAILABLE' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10' : b.status === 'OCCUPIED' ? 'border-urgent-200 bg-urgent-50/50 dark:bg-urgent-900/10' : b.status === 'MAINTENANCE' ? 'border-secondary-300 bg-secondary-100/50' : 'border-warning-200 bg-warning-50/50 dark:bg-warning-900/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-secondary-700 dark:text-secondary-300">{b.bedNumber}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${b.status === 'AVAILABLE' ? 'bg-emerald-500' : b.status === 'OCCUPIED' ? 'bg-urgent-500' : b.status === 'MAINTENANCE' ? 'bg-secondary-400' : 'bg-warning-500'}`} />
              </div>
              <p className="text-[10px] text-secondary-500 truncate">{b.wardName} · {b.roomNumber}</p>
              <p className="text-[10px] text-secondary-400">{b.bedType?.replace('_',' ')}</p>
              {b.assignedPatientName && <p className="text-[10px] font-medium text-urgent-600 mt-1 truncate">{b.assignedPatientName}</p>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-secondary-100 dark:border-secondary-700 text-xs text-secondary-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Available</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-urgent-500" />Occupied</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning-500" />Reserved</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary-400" />Maintenance</span>
        </div>
      </Card>)}

      {/* PHARMACY */}
      {tab === 'pharmacy' && (<Card>
        <CardHeader title="Pharmacy Stock" subtitle={`${pharmacy.length} items${selectedFacility ? ' in ' + selectedFacility.name : ''}`} />
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[800px]"><thead><tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider"><th className="px-4 py-3 text-left">Medicine</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Batch</th><th className="px-4 py-3 text-left">Qty</th><th className="px-4 py-3 text-left">Expiry</th><th className="px-4 py-3 text-left">Price</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
            {loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-secondary-400">Loading...</td></tr>
            : filtered(pharmacy).length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-secondary-400"><FiPackage size={24} className="mx-auto mb-2 opacity-50" />No items.</td></tr>
            : filtered(pharmacy).map(p => (<tr key={p.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
              <td className="px-4 py-3"><p className="font-medium text-secondary-900 dark:text-white">{p.medicineName}</p><p className="text-xs text-secondary-400">{p.dosageForm} · {p.strength}</p></td>
              <td className="px-4 py-3 text-xs text-secondary-500">{p.category}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.batchNumber}</td>
              <td className="px-4 py-3"><span className={`font-semibold ${p.quantity <= (p.minimumStockLevel || 50) ? 'text-urgent-600' : ''}`}>{p.quantity}</span><span className="text-xs text-secondary-400">/{p.minimumStockLevel || 50}</span></td>
              <td className="px-4 py-3 text-xs text-secondary-500">{p.expiryDate || '—'}</td>
              <td className="px-4 py-3 text-xs">{p.unitPrice ? `₹${p.unitPrice}` : '—'}</td>
              <td className="px-4 py-3"><Badge variant={STATUS_COLORS[p.status] || 'gray'} dot>{p.status?.replace('_',' ')}</Badge></td>
              <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                <button onClick={() => openPharmacyModal(p)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition"><FiEdit2 size={14} /></button>
                <button onClick={() => setDeleteConfirm({ type:'pharmacy', id:p.id, name:p.medicineName })} className="p-1.5 rounded-lg hover:bg-urgent-50 text-secondary-500 hover:text-urgent-600 transition"><FiTrash2 size={14} /></button>
              </div></td></tr>))}
          </tbody></table></div>
      </Card>)}

      {/* MODAL */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${modalType}` : `Add ${modalType}`} size="lg">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {modalType === 'facility' && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Name *</label><input value={form.name || ''} onChange={e => set('name', e.target.value)} className={inputClass} /></div>
            {!editing && <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Code *</label><input value={form.facilityCode || ''} onChange={e => set('facilityCode', e.target.value.toUpperCase())} className={inputClass} /></div>}
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Type</label><select value={form.facilityType || ''} onChange={e => set('facilityType', e.target.value)} className={inputClass}>{['HOSPITAL','CLINIC','PHARMACY','LAB','REHAB_CENTER','NURSING_HOME','URGENT_CARE'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Total Beds</label><input type="number" value={form.totalBeds || ''} onChange={e => set('totalBeds', parseInt(e.target.value) || 0)} className={inputClass} /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Address</label><input value={form.address || ''} onChange={e => set('address', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">City</label><input value={form.city || ''} onChange={e => set('city', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">State</label><input value={form.state || ''} onChange={e => set('state', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Phone</label><input value={form.phone || ''} onChange={e => set('phone', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Email</label><input value={form.email || ''} onChange={e => set('email', e.target.value)} className={inputClass} /></div>
            {!editing && <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Tenant ID *</label><input value={form.tenantId || ''} onChange={e => set('tenantId', e.target.value)} className={inputClass} placeholder="UUID" /></div>}
          </div>)}
          {modalType === 'bed' && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Ward *</label><input value={form.wardName || ''} onChange={e => set('wardName', e.target.value)} className={inputClass} placeholder="ICU, General" /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Room *</label><input value={form.roomNumber || ''} onChange={e => set('roomNumber', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Bed # *</label><input value={form.bedNumber || ''} onChange={e => set('bedNumber', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Type</label><select value={form.bedType || 'GENERAL'} onChange={e => set('bedType', e.target.value)} className={inputClass}>{BED_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Status</label><select value={form.status || 'AVAILABLE'} onChange={e => set('status', e.target.value)} className={inputClass}>{BED_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Patient ID</label><input value={form.assignedPatientId || ''} onChange={e => set('assignedPatientId', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Patient Name</label><input value={form.assignedPatientName || ''} onChange={e => set('assignedPatientName', e.target.value)} className={inputClass} /></div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className={inputClass + ' h-16 resize-none'} /></div>
          </div>)}
          {modalType === 'pharmacy' && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Medicine *</label><input value={form.medicineName || ''} onChange={e => set('medicineName', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Category *</label><input value={form.category || ''} onChange={e => set('category', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Batch # *</label><input value={form.batchNumber || ''} onChange={e => set('batchNumber', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Manufacturer</label><input value={form.manufacturer || ''} onChange={e => set('manufacturer', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Dosage</label><select value={form.dosageForm || ''} onChange={e => set('dosageForm', e.target.value)} className={inputClass}><option value="">Select</option>{DOSAGE_FORMS.map(d => <option key={d} value={d}>{d.replace('_',' ')}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Strength</label><input value={form.strength || ''} onChange={e => set('strength', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Quantity *</label><input type="number" min="0" value={form.quantity ?? ''} onChange={e => set('quantity', parseInt(e.target.value) || 0)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Min Stock</label><input type="number" min="1" value={form.minimumStockLevel ?? 50} onChange={e => set('minimumStockLevel', parseInt(e.target.value) || 50)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Expiry *</label><input type="date" value={form.expiryDate || ''} onChange={e => set('expiryDate', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Price (₹)</label><input type="number" step="0.01" value={form.unitPrice || ''} onChange={e => set('unitPrice', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Storage</label><select value={form.storageCondition || ''} onChange={e => set('storageCondition', e.target.value)} className={inputClass}><option value="">Select</option>{STORAGE_CONDITIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Schedule</label><select value={form.scheduleClass || ''} onChange={e => set('scheduleClass', e.target.value)} className={inputClass}><option value="">Select</option>{SCHEDULE_CLASSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className={inputClass + ' h-16 resize-none'} /></div>
          </div>)}
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-secondary-100 dark:border-secondary-700">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" size="sm">
        <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-full bg-urgent-100 flex items-center justify-center flex-shrink-0"><FiAlertTriangle className="text-urgent-600" size={18} /></div><p className="text-sm text-secondary-700 dark:text-secondary-300">Delete <strong>{deleteConfirm?.name}</strong>?</p></div>
        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button><button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-urgent-600 hover:bg-urgent-700 text-white text-sm font-medium transition">Delete</button></div>
      </Modal>
    </div>
  );
}
