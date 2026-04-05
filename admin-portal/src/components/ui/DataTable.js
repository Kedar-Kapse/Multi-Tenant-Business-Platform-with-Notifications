import { useState } from 'react';
import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function DataTable({ columns, data, searchable = true, pageSize = 10, onRowClick }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  let filtered = data;
  if (search) {
    const q = search.toLowerCase();
    filtered = data.filter(row => columns.some(c => String(row[c.key] || '').toLowerCase().includes(q)));
  }
  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const av = a[sortKey] || '', bv = b[sortKey] || '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      {searchable && (
        <div className="px-5 py-3 border-b border-secondary-100 dark:border-secondary-700">
          <div className="relative w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-secondary-50 dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-lg text-xs text-secondary-700 dark:text-secondary-300 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-secondary-100 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-900/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-5 py-3 text-left text-[11px] font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-200 select-none' : ''}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && <span className="text-primary-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-50 dark:divide-secondary-700/50">
            {paged.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-5 py-3.5 text-sm text-secondary-700 dark:text-secondary-300 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-secondary-400">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-secondary-100 dark:border-secondary-700">
          <p className="text-xs text-secondary-400">{filtered.length} records &middot; Page {page + 1} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400 disabled:opacity-30"><FiChevronLeft size={16} /></button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400 disabled:opacity-30"><FiChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
