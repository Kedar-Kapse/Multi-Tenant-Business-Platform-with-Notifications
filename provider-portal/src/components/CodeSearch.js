import { useEffect, useRef, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { ehrApi } from '../services/providerService';
import useDebounce from '../hooks/useDebounce';
import { Spinner } from './ui/States';

const splitCodes = (s) => (s || '').split(',').map((c) => c.trim()).filter(Boolean);

/**
 * ICD-10 / CPT lookup. value is a code string; with `multiple` it is a
 * comma-separated list ("E11.9, I10") shown as removable chips.
 */
export default function CodeSearch({ kind = 'icd', value, onChange, multiple = false, placeholder, disabled }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounced = useDebounce(q.trim(), 300);
  const reqId = useRef(0);
  const codes = multiple ? splitCodes(value) : (value ? [value] : []);

  useEffect(() => {
    if (debounced.length < 2) { reqId.current += 1; setResults([]); setLoading(false); return; }
    const my = ++reqId.current;
    setLoading(true);
    const call = kind === 'cpt' ? ehrApi.searchCpt : ehrApi.searchIcd;
    call(debounced)
      .then((r) => { if (my === reqId.current) setResults(Array.isArray(r) ? r.slice(0, 15) : []); })
      .catch(() => { if (my === reqId.current) setResults([]); })
      .finally(() => { if (my === reqId.current) setLoading(false); });
  }, [debounced, kind]);

  const add = (code) => {
    if (multiple) {
      if (!codes.includes(code)) onChange([...codes, code].join(', '));
    } else {
      onChange(code);
    }
    setQ('');
    setResults([]);
  };
  const remove = (code) => onChange(multiple ? codes.filter((c) => c !== code).join(', ') : '');

  const showList = focused && q.trim().length >= 2;

  return (
    <div>
      {codes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {codes.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-mono font-semibold">
              {c}
              {!disabled && (
                <button type="button" aria-label={`Remove ${c}`} onClick={() => remove(c)} className="p-0.5 rounded hover:bg-primary-100 dark:hover:bg-primary-800/50"><FiX size={11} /></button>
              )}
            </span>
          ))}
        </div>
      )}
      {(multiple || codes.length === 0) && !disabled && (
        <div className="relative">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (results[0]) add(results[0].code); } }}
            placeholder={placeholder || (kind === 'cpt' ? 'Search CPT code or procedure…' : 'Search ICD-10 code or diagnosis…')}
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white placeholder-secondary-400"
          />
          {loading && <Spinner size="sm" className="absolute right-2.5 top-1/2 -translate-y-1/2" />}
        </div>
      )}
      {showList && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 shadow-sm scrollbar-thin">
          {!loading && results.length === 0 && <li className="px-3 py-2 text-xs text-secondary-400">No codes found</li>}
          {results.map((r) => (
            <li key={r.id || r.code}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(r.code)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-50 dark:hover:bg-secondary-700 text-secondary-700 dark:text-secondary-200">
                <span className="font-mono font-bold text-primary-600 dark:text-primary-400">{r.code}</span>
                <span className="text-secondary-500 dark:text-secondary-400"> · {r.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
