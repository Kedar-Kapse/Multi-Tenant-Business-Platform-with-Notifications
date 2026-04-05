import { useState, useEffect, useCallback } from 'react';
import { FiFile, FiDownload, FiTrash2, FiSearch, FiFolder } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { documentApi } from '../../services/patientService';
import useAuthStore from '../../store/authStore';

const CATEGORIES = ['All', 'Lab Reports', 'Imaging', 'Prescriptions', 'Insurance', 'Immunization', 'Clinical Notes'];
const CAT_COLORS = { 'Lab Reports':'info', Imaging:'purple', Prescriptions:'teal', Insurance:'warning', Immunization:'success', 'Clinical Notes':'gray' };

export default function RecordsPage() {
  const { user } = useAuthStore();
  const PID = user?.sub || 'PAT-001';
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setDocs(await documentApi.getAll(PID, category === 'All' ? undefined : category)); } catch { setDocs([]); }
    finally { setLoading(false); }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const filtered = docs.filter(d => { const q = search.toLowerCase(); return !q || [d.fileName, d.description, d.category].some(f => f?.toLowerCase().includes(q)); });
  const formatSize = (b) => b > 1000000 ? `${(b/1000000).toFixed(1)} MB` : `${Math.round(b/1000)} KB`;

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Medical Records</h1><p className="text-xs sm:text-sm text-secondary-500">View and manage your health documents.</p></div>
      <div className="flex flex-wrap gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl p-1">
        {CATEGORIES.map(c => (<button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${category === c ? 'bg-white dark:bg-secondary-700 shadow-sm text-secondary-900 dark:text-white' : 'text-secondary-500'}`}>{c}</button>))}
      </div>
      <div className="relative max-w-sm"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500" /></div>
      <Card>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[600px]"><thead><tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider"><th className="px-4 py-3 text-left">Document</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Uploaded By</th><th className="px-4 py-3 text-left">Size</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
            {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-secondary-400">Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-secondary-400"><FiFolder size={24} className="mx-auto mb-2 opacity-50" />No documents found.</td></tr>
            : filtered.map(d => (
              <tr key={d.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600"><FiFile size={16} /></div><div><p className="text-sm font-medium text-secondary-900 dark:text-white">{d.fileName}</p><p className="text-xs text-secondary-400 line-clamp-1">{d.description}</p></div></div></td>
                <td className="px-4 py-3"><Badge variant={CAT_COLORS[d.category]||'gray'}>{d.category}</Badge></td>
                <td className="px-4 py-3 text-xs text-secondary-500">{d.uploadedBy}</td>
                <td className="px-4 py-3 text-xs text-secondary-500">{d.fileSize ? formatSize(d.fileSize) : '—'}</td>
                <td className="px-4 py-3 text-xs text-secondary-500">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Card>
    </div>
  );
}
