import { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiClock, FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import { invoiceApi } from '../../services/patientService';
import useAuthStore from '../../store/authStore';

const STATUS_BADGE = { PAID:'success', PENDING:'warning', OVERDUE:'danger', PARTIALLY_PAID:'info' };

export default function BillingPage() {
  const { user } = useAuthStore();
  const PID = user?.sub || 'PAT-001';
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [payMethod, setPayMethod] = useState('CARD');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (m, t='success') => { setToast({m,t}); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => { setLoading(true); try { setInvoices(await invoiceApi.getAll(PID)); } catch { setInvoices([]); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const totalDue = invoices.filter(i => i.status !== 'PAID').reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount || 0)), 0);
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.paidAmount || 0), 0);
  const overdue = invoices.filter(i => i.status === 'OVERDUE').length;

  const handlePay = async () => {
    setPaying(true);
    try { await invoiceApi.pay(payModal.id, payMethod); showToast('Payment successful!'); setPayModal(null); load(); }
    catch { showToast('Payment failed', 'error'); }
    finally { setPaying(false); }
  };

  return (
    <div className="space-y-4">
      {toast && (<div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.t === 'error' ? 'bg-urgent-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.m}<button onClick={() => setToast(null)}><FiX size={14} /></button></div>)}

      <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">Billing & Payments</h1><p className="text-xs sm:text-sm text-secondary-500">View invoices and make payments.</p></div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title="Total Due" value={`₹${totalDue.toLocaleString('en-IN')}`} icon={FiClock} color="amber" />
        <StatCard title="Total Paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} icon={FiCheckCircle} color="green" />
        <StatCard title="Overdue" value={overdue} icon={FiAlertTriangle} color="rose" />
        <StatCard title="Invoices" value={invoices.length} icon={FiDollarSign} color="blue" />
      </div>

      <Card>
        <CardHeader title="Invoices" subtitle={`${invoices.length} total`} />
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 text-xs uppercase tracking-wider"><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-left">Provider</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
            {loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-secondary-400">Loading...</td></tr>
            : invoices.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-secondary-400">No invoices.</td></tr>
            : invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                <td className="px-4 py-3 font-mono font-semibold text-primary-600 text-xs">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-secondary-900 dark:text-white text-xs">{inv.description}</td>
                <td className="px-4 py-3 text-xs text-secondary-500">{inv.providerName}</td>
                <td className="px-4 py-3 text-right font-semibold">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-xs text-secondary-500">{inv.issueDate}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_BADGE[inv.status]||'gray'} dot>{inv.status}</Badge></td>
                <td className="px-4 py-3 text-right">{inv.status !== 'PAID' && <button onClick={() => { setPayModal(inv); setPayMethod('CARD'); }} className="px-3 py-1.5 rounded-lg text-xs bg-primary-600 hover:bg-primary-700 text-white font-medium transition">Pay Now</button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Card>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Make Payment" size="sm">
        {payModal && (<div className="space-y-4">
          <div className="p-4 bg-secondary-50 dark:bg-secondary-800 rounded-xl"><p className="text-sm font-medium">{payModal.description}</p><p className="text-2xl font-bold text-primary-600 mt-1">₹{Number(payModal.amount).toLocaleString('en-IN')}</p></div>
          <div><label className="block text-xs font-medium text-secondary-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">{['CARD','UPI','NET_BANKING','INSURANCE'].map(m => (<button key={m} onClick={() => setPayMethod(m)} className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition ${payMethod === m ? 'bg-primary-600 text-white border-primary-600' : 'border-secondary-200 hover:border-primary-300'}`}>{m.replace('_',' ')}</button>))}</div></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100"><button onClick={() => setPayModal(null)} className="px-4 py-2 rounded-lg text-sm text-secondary-600 hover:bg-secondary-100 transition">Cancel</button><button onClick={handlePay} disabled={paying} className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition disabled:opacity-50">{paying ? 'Processing...' : 'Confirm Payment'}</button></div>
        </div>)}
      </Modal>
    </div>
  );
}
