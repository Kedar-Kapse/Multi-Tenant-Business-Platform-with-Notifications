import { useState } from 'react';
import { FiUser, FiMail, FiPhone, FiShield, FiMapPin, FiSave, FiX, FiHeart } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    firstName: user?.firstName || 'Rahul', lastName: user?.lastName || 'Sharma', email: user?.email || 'rahul@gmail.com',
    phone: '+91-9876543210', dateOfBirth: '1988-05-15', gender: 'MALE', bloodGroup: 'B+',
    addressLine1: '45 Green Park Society', city: 'Pune', state: 'Maharashtra', country: 'India', zipCode: '411038',
    emergencyContact: 'Sneha Sharma (Wife) — +91-9876543211',
    allergies: 'Penicillin, Sulfa drugs', chronicConditions: 'Hypertension, Pre-diabetes, Dyslipidemia',
    insuranceProvider: 'Star Health Insurance', policyNumber: 'SH2026-45892',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-emerald-600 text-white">{toast}<button onClick={() => setToast(null)} className="ml-3"><FiX size={14} /></button></div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">My Profile</h1><p className="text-xs sm:text-sm text-secondary-500">Manage your personal health information.</p></div>
        {!editing ? <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto"><FiUser size={16} /> Edit Profile</button>
        : <div className="flex gap-2 w-full sm:w-auto"><button onClick={() => setEditing(false)} className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-secondary-200 text-sm transition">Cancel</button><button onClick={() => { setEditing(false); setToast('Profile updated'); setTimeout(() => setToast(null), 3000); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium transition"><FiSave size={14} /> Save</button></div>}
      </div>

      <Card><div className="p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-600/25">{`${form.firstName[0]}${form.lastName[0]}`}</div>
        <div className="text-center sm:text-left flex-1"><h2 className="text-xl font-bold text-secondary-900 dark:text-white">{form.firstName} {form.lastName}</h2><p className="text-sm text-secondary-500 mt-0.5">Patient ID: {user?.sub?.substring(0, 8) || 'N/A'}</p><div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start"><Badge variant="info">Patient</Badge><Badge variant="success" dot>Active</Badge><Badge variant="teal">{form.bloodGroup}</Badge></div></div>
      </div></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader title="Personal Information" /><div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['First Name','firstName'],['Last Name','lastName'],['Date of Birth','dateOfBirth'],['Gender','gender'],['Blood Group','bloodGroup']].map(([l,k]) => (
              <div key={k}><label className="block text-xs font-medium text-secondary-500 mb-1">{l}</label>{editing ? <input value={form[k]} onChange={e => set(k, e.target.value)} className={inputClass} /> : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form[k]}</p>}</div>
            ))}
          </div>
          <div><label className="block text-xs font-medium text-secondary-500 mb-1">Email</label><p className="text-sm font-medium flex items-center gap-2"><FiMail size={12} className="text-secondary-400" />{form.email}</p></div>
          <div><label className="block text-xs font-medium text-secondary-500 mb-1">Phone</label>{editing ? <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} /> : <p className="text-sm font-medium flex items-center gap-2"><FiPhone size={12} className="text-secondary-400" />{form.phone}</p>}</div>
          <div><label className="block text-xs font-medium text-secondary-500 mb-1">Address</label>{editing ? <input value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} className={inputClass} /> : <p className="text-sm font-medium flex items-center gap-2"><FiMapPin size={12} className="text-secondary-400" />{[form.addressLine1,form.city,form.state].filter(Boolean).join(', ')}</p>}</div>
          <div><label className="block text-xs font-medium text-secondary-500 mb-1">Emergency Contact</label>{editing ? <input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} className={inputClass} /> : <p className="text-sm font-medium">{form.emergencyContact}</p>}</div>
        </div></Card>

        <Card><CardHeader title="Medical Information" /><div className="p-5 space-y-4">
          <div><label className="block text-xs font-medium text-secondary-500 mb-1">Known Allergies</label>{editing ? <textarea value={form.allergies} onChange={e => set('allergies', e.target.value)} className={inputClass + ' h-16 resize-none'} /> : <div className="flex flex-wrap gap-2">{form.allergies.split(', ').map(a => <Badge key={a} variant="danger">{a}</Badge>)}</div>}</div>
          <div><label className="block text-xs font-medium text-secondary-500 mb-1">Chronic Conditions</label>{editing ? <textarea value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)} className={inputClass + ' h-16 resize-none'} /> : <div className="flex flex-wrap gap-2">{form.chronicConditions.split(', ').map(c => <Badge key={c} variant="warning">{c}</Badge>)}</div>}</div>
          <div className="pt-4 border-t border-secondary-100 dark:border-secondary-700"><label className="block text-xs font-medium text-secondary-500 mb-1">Insurance Provider</label>{editing ? <input value={form.insuranceProvider} onChange={e => set('insuranceProvider', e.target.value)} className={inputClass} /> : <p className="text-sm font-medium">{form.insuranceProvider}</p>}</div>
          <div><label className="block text-xs font-medium text-secondary-500 mb-1">Policy Number</label>{editing ? <input value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} className={inputClass} /> : <p className="text-sm font-mono font-medium">{form.policyNumber}</p>}</div>
        </div></Card>
      </div>

      <Card><CardHeader title="Security & Privacy" /><div className="p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center"><FiShield className="text-emerald-600" size={20} /></div>
        <div className="flex-1 text-center sm:text-left"><p className="text-sm font-semibold text-secondary-900 dark:text-white">Your data is protected</p><p className="text-xs text-secondary-500 mt-0.5">All health records are encrypted and HIPAA compliant. Only you and your authorized providers can access your information.</p></div>
        <Badge variant="success" dot>Protected</Badge>
      </div></Card>
    </div>
  );
}
