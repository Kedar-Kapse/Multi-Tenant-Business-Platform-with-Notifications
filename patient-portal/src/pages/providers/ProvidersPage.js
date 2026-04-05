import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiUser, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { providerApi } from '../../services/patientService';

const ROLE_COLORS = { DOCTOR:'teal', THERAPIST:'info', NURSE:'success', PHARMACIST:'warning', TECHNICIAN:'gray', ADMIN:'purple' };

export default function ProvidersPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [viewProfile, setViewProfile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = search || roleFilter ? await providerApi.search(search || undefined, roleFilter || undefined) : await providerApi.getAll(0, 50); setStaff(d?.content || []); }
    catch { setStaff([]); } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const clinicalStaff = staff.filter(s => ['DOCTOR','THERAPIST','NURSE'].includes(s.role) && s.status === 'ACTIVE');

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Find a Provider</h1><p className="text-xs sm:text-sm text-secondary-500">Search and discover healthcare providers.</p></div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialization..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" /></div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500"><option value="">All Roles</option><option value="DOCTOR">Doctors</option><option value="THERAPIST">Therapists</option><option value="NURSE">Nurses</option></select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full text-center py-12 text-secondary-400">Loading...</div>
        : clinicalStaff.length === 0 ? <div className="col-span-full text-center py-12 text-secondary-400"><FiUser size={24} className="mx-auto mb-2 opacity-50" />No providers found.</div>
        : clinicalStaff.map(s => (
          <Card key={s.id}><div className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => setViewProfile(s)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">{`${(s.firstName||'')[0]||''}${(s.lastName||'')[0]||''}`.toUpperCase()}</div>
              <div className="flex-1"><p className="text-sm font-semibold text-secondary-900 dark:text-white">{s.firstName} {s.lastName}</p><Badge variant={ROLE_COLORS[s.role]||'gray'}>{s.role}</Badge></div>
            </div>
            {s.specialization && <p className="text-xs text-secondary-500 mb-1">{s.specialization}</p>}
            {s.experienceYears && <p className="text-xs text-secondary-400">{s.experienceYears} years experience</p>}
            <div className="mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700 space-y-1 text-xs text-secondary-500">
              <div className="flex items-center gap-2"><FiMail size={12} />{s.email}</div>
              <div className="flex items-center gap-2"><FiPhone size={12} />{s.phone}</div>
            </div>
          </div></Card>
        ))}
      </div>
      <Modal open={!!viewProfile} onClose={() => setViewProfile(null)} title="Provider Profile" size="md">
        {viewProfile && (<div className="space-y-4">
          <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl">{`${(viewProfile.firstName||'')[0]}${(viewProfile.lastName||'')[0]}`.toUpperCase()}</div><div><h3 className="text-lg font-semibold">{viewProfile.firstName} {viewProfile.lastName}</h3><div className="flex gap-2 mt-1"><Badge variant={ROLE_COLORS[viewProfile.role]||'gray'}>{viewProfile.role}</Badge><Badge variant="success" dot>Active</Badge></div></div></div>
          <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-secondary-400">Specialization</p><p className="text-sm font-medium">{viewProfile.specialization||'—'}</p></div><div><p className="text-xs text-secondary-400">Experience</p><p className="text-sm font-medium">{viewProfile.experienceYears ? `${viewProfile.experienceYears} years` : '—'}</p></div><div><p className="text-xs text-secondary-400">License</p><p className="text-sm font-medium">{viewProfile.licenseNumber||'—'}</p></div><div><p className="text-xs text-secondary-400">Phone</p><p className="text-sm font-medium">{viewProfile.phone}</p></div></div>
          {viewProfile.city && <div className="flex items-center gap-2 text-sm text-secondary-600"><FiMapPin size={14} />{[viewProfile.city, viewProfile.state].filter(Boolean).join(', ')}</div>}
        </div>)}
      </Modal>
    </div>
  );
}
