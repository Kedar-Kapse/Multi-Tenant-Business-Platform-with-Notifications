import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiUsers, FiCalendar, FiMessageSquare, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, Spinner } from '../../components/ui/States';
import { inputClass } from '../../components/ui/form';
import BookingModal from '../../components/BookingModal';
import { providerApi, providerName } from '../../services/patientService';
import { errorMessage, humanize } from '../../utils/format';

const PAGE_SIZE = 12;
const ROLES = [
  { value: '', label: 'All care team' },
  { value: 'DOCTOR', label: 'Doctors' },
  { value: 'NURSE', label: 'Nurses' },
  { value: 'THERAPIST', label: 'Therapists' },
];
const ROLE_BADGE = { DOCTOR: 'info', NURSE: 'success', THERAPIST: 'warning' };

export default function ProvidersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced
  const [role, setRole] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookFor, setBookFor] = useState(null);
  const reqId = useRef(0);

  // Debounce typing; a new search starts at page 1.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await providerApi.directory({ query: query || undefined, role: role || undefined, page, size: PAGE_SIZE });
      if (id !== reqId.current) return; // a newer search already started
      setResult({ content: data?.content || [], totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 });
    } catch (err) {
      if (id !== reqId.current) return;
      setError(errorMessage(err, 'Could not load the care team.'));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [query, role, page]);

  useEffect(() => { load(); }, [load]);

  const { content, totalPages, totalElements } = result;
  const filtered = !!(query || role);

  return (
    <div className="space-y-4">
      <PageHeader title="Find a provider" subtitle="Search your hospital's care team, then book a visit or send a message." />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or specialty…" aria-label="Search providers" className={`${inputClass} pl-9 pr-9`} />
          {loading && search && <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500" />}
        </div>
        <div className="sm:w-48">
          <Select name="role" value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }} options={ROLES} aria-label="Filter by role" />
        </div>
      </div>

      {!error && !loading && totalElements > 0 && (
        <p className="text-xs text-secondary-500">{totalElements} {totalElements === 1 ? 'provider' : 'providers'}{filtered ? ' found' : ''}</p>
      )}

      {error ? (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      ) : loading && content.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 rounded-2xl bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 animate-pulse" />)}
        </div>
      ) : content.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiUsers}
            title={filtered ? 'No providers match your search' : 'No providers listed yet'}
            description={filtered ? 'Try a different name or specialty, or clear the filters.' : 'Your hospital has not added any care-team members to the directory yet.'}
            action={filtered && (
              <button type="button" onClick={() => { setSearch(''); setQuery(''); setRole(''); setPage(0); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"><FiX size={14} /> Clear filters</button>
            )}
          />
        </Card>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {content.map((p) => (
            <Card key={p.id} className="flex flex-col min-w-0">
              <div className="p-4 flex-1">
                <div className="flex items-center gap-3">
                  <Avatar firstName={p.firstName} lastName={p.lastName} photoUrl={p.profilePhotoUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{providerName(p)}</p>
                    <Badge variant={ROLE_BADGE[p.role] || 'gray'}>{humanize(p.role)}</Badge>
                  </div>
                </div>
                <div className="mt-3 space-y-0.5">
                  <p className="text-xs text-secondary-600 dark:text-secondary-300 truncate">{p.specialization || 'General care'}</p>
                  {Number(p.experienceYears) > 0 && (
                    <p className="text-xs text-secondary-400">{p.experienceYears} {Number(p.experienceYears) === 1 ? 'year' : 'years'} of experience</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-secondary-100 dark:border-secondary-800">
                <button type="button" onClick={() => setBookFor(p)} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-bl-2xl transition">
                  <FiCalendar size={14} /> Book
                </button>
                <button type="button" onClick={() => navigate('/messages', { state: { compose: true, provider: p } })} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 border-l border-secondary-100 dark:border-secondary-800 rounded-br-2xl transition">
                  <FiMessageSquare size={14} /> Message
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && !error && (
        <div className="flex items-center justify-between gap-2">
          <button type="button" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 disabled:opacity-40 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition">
            <FiChevronLeft size={14} /> Previous
          </button>
          <span className="text-xs text-secondary-500">Page {page + 1} of {totalPages}</span>
          <button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 disabled:opacity-40 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition">
            Next <FiChevronRight size={14} />
          </button>
        </div>
      )}

      <BookingModal
        open={!!bookFor}
        initialProvider={bookFor}
        onClose={() => setBookFor(null)}
        onBooked={() => navigate('/appointments')}
      />
    </div>
  );
}
