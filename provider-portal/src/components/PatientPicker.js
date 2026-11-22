import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { patientApi } from '../services/providerService';
import useDebounce from '../hooks/useDebounce';
import { Spinner } from './ui/States';
import cn from '../utils/cn';
import { fullName, initials } from '../utils/format';

/**
 * Searchable patient combobox (server-side search over /patients, debounced).
 *
 *   <PatientPicker value={patient} onChange={setPatient} requireAccount />
 *
 * requireAccount: the caller needs the patient's Keycloak id (appointments,
 * messages). Patients still PENDING_REGISTRATION have none, so they are shown
 * disabled with a hint instead of being selectable.
 */
export default function PatientPicker({
  value, onChange, requireAccount = false, disabled = false, error, placeholder = 'Search patients…', id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('mine');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const reqId = useRef(0);
  const listId = useId();
  const debounced = useDebounce(query.trim(), 300);

  const selectable = (p) => !requireAccount || !!p.keycloakUserId;

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16);
    const below = window.innerHeight - r.bottom;
    const up = below < 260 && r.top > below;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      width,
      top: up ? undefined : r.bottom + 4,
      bottom: up ? window.innerHeight - r.top + 4 : undefined,
      maxHeight: Math.max(200, Math.min(360, (up ? r.top : below) - 12)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Search (only while open). Older responses are ignored.
  useEffect(() => {
    if (!open) return;
    const my = ++reqId.current;
    setLoading(true);
    setLoadError(null);
    patientApi.list({ page: 0, size: 20, query: debounced || undefined, mine: scope === 'mine' })
      .then((page) => {
        if (my !== reqId.current) return;
        const list = Array.isArray(page) ? page : page?.content || [];
        setItems(list);
        setActive(Math.max(0, list.findIndex(selectable)));
      })
      .catch(() => { if (my === reqId.current) { setItems([]); setLoadError('Could not load patients'); } })
      .finally(() => { if (my === reqId.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debounced, scope]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (p) => {
    if (!selectable(p)) return;
    onChange?.(p);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  };

  const move = (delta) => {
    if (!items.length) return;
    let i = active;
    for (let n = 0; n < items.length; n += 1) {
      i = (i + delta + items.length) % items.length;
      if (selectable(items[i])) break;
    }
    setActive(i);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) choose(items[active]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    else if (e.key === 'Tab') setOpen(false);
  };

  const label = value ? fullName(value) || value.name : '';

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-lg border text-left outline-none transition px-3 py-2 text-sm',
            'bg-white dark:bg-secondary-800 focus:ring-2 focus:ring-primary-500',
            error ? 'border-urgent-300 dark:border-urgent-700'
              : open ? 'border-primary-400 dark:border-primary-600'
                : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600',
            disabled && 'opacity-50 cursor-not-allowed',
            value && !disabled && 'pr-9',
          )}
        >
          <span className={cn('truncate', label ? 'text-secondary-900 dark:text-white' : 'text-secondary-400')}>
            {label || placeholder}
            {value?.mrn && <span className="text-secondary-400 font-mono text-xs ml-2">{value.mrn}</span>}
          </span>
          {!value && <FiChevronDown size={14} className={cn('flex-shrink-0 text-secondary-400 transition-transform', open && 'rotate-180')} />}
        </button>
        {value && !disabled && (
          <button type="button" aria-label="Clear patient" onClick={() => onChange?.(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <FiX size={13} />
          </button>
        )}
      </div>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          onKeyDown={onKeyDown}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, zIndex: 1000, maxHeight: pos.maxHeight }}
          className="flex flex-col rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 shadow-xl shadow-secondary-900/10 dark:shadow-black/40 overflow-hidden animate-[fadeIn_.12s_ease-out]"
        >
          <div className="p-2 border-b border-secondary-100 dark:border-secondary-700 space-y-2">
            <div className="relative">
              <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, email or MRN…"
                className="w-full pl-8 pr-8 py-1.5 rounded-lg text-sm bg-secondary-50 dark:bg-secondary-900 text-secondary-900 dark:text-white border border-transparent focus:border-primary-400 outline-none"
              />
              {loading && <Spinner size="sm" className="absolute right-2.5 top-1/2 -translate-y-1/2" />}
            </div>
            <div className="flex gap-1 text-[11px]">
              {[['mine', 'My patients'], ['all', 'All patients']].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setScope(k)}
                  className={cn('px-2 py-1 rounded-md font-medium transition',
                    scope === k ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <ul id={listId} role="listbox" className="overflow-y-auto py-1 scrollbar-thin flex-1 min-h-0">
            {!loading && loadError && <li className="px-3 py-3 text-sm text-urgent-600">{loadError}</li>}
            {!loading && !loadError && items.length === 0 && (
              <li className="px-3 py-3 text-sm text-secondary-400">
                {scope === 'mine' ? 'No matching patients linked to you. Try "All patients".' : 'No patients found'}
              </li>
            )}
            {items.map((p, i) => {
              const ok = selectable(p);
              const isSel = value?.id === p.id;
              return (
                <li
                  key={p.id}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={!ok || undefined}
                  onMouseEnter={() => ok && setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p)}
                  className={cn('mx-1 px-2.5 py-2 rounded-lg flex items-center gap-3 select-none',
                    ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                    i === active && ok && 'bg-secondary-100 dark:bg-secondary-700/60')}
                >
                  <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {initials(p.firstName, p.lastName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-secondary-900 dark:text-white truncate">{fullName(p)}</span>
                    <span className="block text-[11px] text-secondary-400 truncate">
                      {ok ? <>{p.email}{p.mrn ? ` · ${p.mrn}` : ''}</> : 'Not registered yet: cannot be booked or messaged'}
                    </span>
                  </span>
                  {isSel && <FiCheck size={14} className="text-primary-600 flex-shrink-0" />}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}
