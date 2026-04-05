import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiUser, FiEye, FiPhone, FiMail, FiMapPin, FiX } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { staffApi } from '../../services/providerService';

const ROLE_COLORS = { DOCTOR: 'teal', THERAPIST: 'info', NURSE: 'success', PHARMACIST: 'warning', TECHNICIAN: 'gray', BILLING: 'gray', ADMIN: 'purple' };

export default function PatientsPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [viewProfile, setViewProfile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (search || roleFilter) {
        data = await staffApi.search(search || undefined, roleFilter || undefined, undefined, page, 20);
      } else {
        data = await staffApi.getAll(page, 20);
      }
      setStaff(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch { setStaff([]); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, roleFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Team & Patients</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">View your clinical team and assigned patients. {totalElements > 0 && <span className="text-secondary-400">({totalElements} total)</span>}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-3 sm:p-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Roles</option>
              {['DOCTOR','THERAPIST','NURSE','PHARMACIST','TECHNICIAN','BILLING','ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-secondary-400"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Loading...</div>
          ) : staff.length === 0 ? (
            <div className="col-span-full text-center py-12 text-secondary-400"><FiUser size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No team members found.</p></div>
          ) : staff.map(s => (
            <div key={s.id} className="p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md transition cursor-pointer" onClick={() => setViewProfile(s)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {`${(s.firstName || '')[0] || ''}${(s.lastName || '')[0] || ''}`.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{s.firstName} {s.lastName}</p>
                  <Badge variant={ROLE_COLORS[s.role] || 'gray'}>{s.role}</Badge>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-secondary-500">
                <div className="flex items-center gap-2"><FiMail size={12} /><span className="truncate">{s.email}</span></div>
                <div className="flex items-center gap-2"><FiPhone size={12} /><span>{s.phone}</span></div>
                {s.specialization && <div className="flex items-center gap-2"><FiUser size={12} /><span>{s.specialization}</span></div>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700">
                <Badge variant={s.status === 'ACTIVE' ? 'success' : 'danger'} dot>{s.status}</Badge>
                <button className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"><FiEye size={12} /> View</button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 dark:border-secondary-700">
            <p className="text-xs text-secondary-500">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg text-xs hover:bg-secondary-100 disabled:opacity-30 transition">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg text-xs hover:bg-secondary-100 disabled:opacity-30 transition">Next</button>
            </div>
          </div>
        )}
      </Card>

      {/* Profile Modal */}
      <Modal open={!!viewProfile} onClose={() => setViewProfile(null)} title="Staff Profile" size="md">
        {viewProfile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {`${(viewProfile.firstName || '')[0] || ''}${(viewProfile.lastName || '')[0] || ''}`.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">{viewProfile.firstName} {viewProfile.lastName}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant={ROLE_COLORS[viewProfile.role] || 'gray'}>{viewProfile.role}</Badge>
                  <Badge variant={viewProfile.status === 'ACTIVE' ? 'success' : 'danger'} dot>{viewProfile.status}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-secondary-400">Email</p><p className="text-sm font-medium text-secondary-900 dark:text-white">{viewProfile.email}</p></div>
              <div><p className="text-xs text-secondary-400">Phone</p><p className="text-sm font-medium text-secondary-900 dark:text-white">{viewProfile.phone}</p></div>
              <div><p className="text-xs text-secondary-400">Specialization</p><p className="text-sm font-medium text-secondary-900 dark:text-white">{viewProfile.specialization || '—'}</p></div>
              <div><p className="text-xs text-secondary-400">License #</p><p className="text-sm font-medium text-secondary-900 dark:text-white">{viewProfile.licenseNumber || '—'}</p></div>
              <div><p className="text-xs text-secondary-400">Experience</p><p className="text-sm font-medium text-secondary-900 dark:text-white">{viewProfile.experienceYears != null ? `${viewProfile.experienceYears} years` : '—'}</p></div>
              <div><p className="text-xs text-secondary-400">Gender</p><p className="text-sm font-medium text-secondary-900 dark:text-white">{viewProfile.gender || '—'}</p></div>
            </div>
            {(viewProfile.city || viewProfile.state) && (
              <div className="flex items-center gap-2 text-sm text-secondary-600"><FiMapPin size={14} />{[viewProfile.addressLine1, viewProfile.city, viewProfile.state, viewProfile.country].filter(Boolean).join(', ')}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
