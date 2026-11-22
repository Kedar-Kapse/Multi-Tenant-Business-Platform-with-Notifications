import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiFile, FiFileText, FiImage, FiSearch, FiFolder, FiInfo } from 'react-icons/fi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorState, SkeletonList } from '../../components/ui/States';
import { inputClass } from '../../components/ui/form';
import { documentApi } from '../../services/patientService';
import { errorMessage, formatFileSize, formatServerDate, humanize } from '../../utils/format';

const fileIcon = (type = '', name = '') => {
  const t = `${type} ${name}`.toLowerCase();
  if (/image|png|jpe?g|gif|dicom|dcm/.test(t)) return FiImage;
  if (/pdf|doc|text|txt/.test(t)) return FiFileText;
  return FiFile;
};

export default function RecordsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await documentApi.mine();
      setDocs(Array.isArray(d) ? d : []);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Categories come from the documents themselves, not a hard-coded list.
  const categoryOptions = useMemo(() => {
    const counts = docs.reduce((m, d) => { const c = d.category || 'Other'; m[c] = (m[c] || 0) + 1; return m; }, {});
    return [
      { value: '', label: `All categories (${docs.length})` },
      ...Object.keys(counts).sort().map((c) => ({ value: c, label: `${humanize(c)} (${counts[c]})` })),
    ];
  }, [docs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => (!category || (d.category || 'Other') === category)
      && (!q || [d.fileName, d.description, d.category, d.uploadedBy].some((f) => f?.toLowerCase().includes(q))));
  }, [docs, category, search]);

  return (
    <div className="space-y-4">
      <PageHeader title="Medical records" subtitle="Documents your care team has added to your record." />

      {docs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" aria-label="Search documents" className={`${inputClass} pl-9`} />
          </div>
          <div className="sm:w-60">
            <Select name="category" value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} aria-label="Filter by category" />
          </div>
        </div>
      )}

      {error ? (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      ) : loading ? (
        <SkeletonList rows={3} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiFolder}
            title={docs.length ? 'No documents match' : 'No documents yet'}
            description={docs.length ? 'Try a different search or category.' : 'Lab reports, scans and other documents will appear here once your care team adds them.'}
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-secondary-100 dark:divide-secondary-800">
            {filtered.map((d) => {
              const Icon = fileIcon(d.fileType, d.fileName);
              return (
                <li key={d.id} className="p-3.5 sm:px-5 sm:py-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 flex-shrink-0"><Icon size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate min-w-0 sm:flex-1" title={d.fileName}>{d.fileName}</p>
                      {d.category && <Badge variant="info" className="self-start sm:self-auto">{humanize(d.category)}</Badge>}
                    </div>
                    {d.description && <p className="text-xs text-secondary-500 mt-1 line-clamp-2 break-words">{d.description}</p>}
                    <p className="text-[11px] text-secondary-400 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{formatServerDate(d.uploadedAt)}</span>
                      {d.uploadedBy && <span className="truncate max-w-full">Added by {d.uploadedBy}</span>}
                      {d.fileSize ? <span>{formatFileSize(d.fileSize)}</span> : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {docs.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-secondary-500">
          <FiInfo size={13} className="flex-shrink-0 mt-0.5" />
          Downloading documents from the portal isn't available yet. Ask the hospital front desk if you need a copy.
        </p>
      )}
    </div>
  );
}
