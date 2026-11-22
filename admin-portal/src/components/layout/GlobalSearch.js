import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiUser, FiUsers } from 'react-icons/fi';
import useDebounce from '../../hooks/useDebounce';
import { patientApi } from '../../services/patientService';
import { staffApi } from '../../services/organizationService';

/**
 * Navbar search across patients and staff of the admin's hospital.
 * Picking a result opens that page already filtered by the search text.
 */
export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ patients: [], staff: [] });
  const debounced = useDebounce(query.trim(), 300);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const requestId = useRef(0);

  // Ctrl/Cmd+K focuses the search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults({ patients: [], staff: [] });
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    Promise.allSettled([
      patientApi.list(0, 5, debounced),
      staffApi.search(debounced, undefined, undefined, 0, 5),
    ]).then(([p, s]) => {
      if (id !== requestId.current) return; // a newer search is running
      setResults({
        patients: p.status === 'fulfilled' ? p.value.content || [] : [],
        staff: s.status === 'fulfilled' ? s.value.content || [] : [],
      });
      setLoading(false);
    });
  }, [debounced]);

  const go = (path) => {
    setOpen(false);
    setQuery('');
    navigate(`${path}?q=${encodeURIComponent(debounced)}`);
  };

  const empty = !loading && debounced.length >= 2 && results.patients.length === 0 && results.staff.length === 0;

  return (
    <div ref={boxRef} className="relative w-56 md:w-72 hidden sm:block">
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
      <input
        ref={inputRef}
        id="global-search"
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); } }}
        placeholder="Search patients, staff…"
        aria-label="Search patients and staff"
        className="w-full pl-9 pr-12 py-2 bg-secondary-50 dark:bg-secondary-800 border-0 rounded-xl text-xs text-secondary-700 dark:text-secondary-300 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-medium text-secondary-400 bg-secondary-100 dark:bg-secondary-700 rounded">⌘K</kbd>

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 md:right-auto md:w-96 top-full mt-2 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 z-50 overflow-hidden animate-[fadeIn_.12s_ease-out]">
          {loading && <p className="px-4 py-3 text-xs text-secondary-400">Searching…</p>}
          {empty && <p className="px-4 py-3 text-xs text-secondary-400">No patients or staff match “{debounced}”.</p>}
          {!loading && results.patients.length > 0 && (
            <Section title="Patients" icon={FiUser} onAll={() => go('/patients')}>
              {results.patients.map((p) => (
                <Row key={p.id} title={`${p.firstName} ${p.lastName}`} sub={p.mrn ? `MRN ${p.mrn}` : p.email} onClick={() => go('/patients')} />
              ))}
            </Section>
          )}
          {!loading && results.staff.length > 0 && (
            <Section title="Staff" icon={FiUsers} onAll={() => go('/staff')}>
              {results.staff.map((s) => (
                <Row key={s.id} title={`${s.firstName} ${s.lastName}`} sub={s.role} onClick={() => go('/staff')} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, onAll, children }) {
  return (
    <div className="py-1.5 border-b last:border-b-0 border-secondary-100 dark:border-secondary-700">
      <div className="px-4 py-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary-400"><Icon size={11} /> {title}</span>
        <button type="button" onClick={onAll} className="text-[11px] font-medium text-primary-600 hover:text-primary-700">See all</button>
      </div>
      {children}
    </div>
  );
}

function Row({ title, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-4 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition">
      <p className="text-sm text-secondary-900 dark:text-white truncate">{title}</p>
      {sub && <p className="text-[11px] text-secondary-400 truncate">{sub}</p>}
    </button>
  );
}
