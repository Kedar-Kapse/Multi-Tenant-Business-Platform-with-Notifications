import { useState } from 'react';
import { FiUser, FiMail, FiPhone, FiShield, FiMapPin, FiSave, FiX } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '+91-9876543210',
    specialization: 'General Medicine',
    licenseNumber: 'MCI-12345',
    experienceYears: 8,
    addressLine1: '123 Medical Avenue',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    zipCode: '411001',
    bio: 'Experienced healthcare provider focused on patient-centered care and clinical excellence.',
    availability: 'Mon-Fri, 9:00 AM - 6:00 PM',
    languages: 'English, Hindi, Marathi',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    setEditing(false);
    showToast('Profile updated successfully');
  };

  return (
    <div className="space-y-4">
      {toast && (<div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-emerald-600 text-white">{toast}<button onClick={() => setToast(null)} className="hover:opacity-75"><FiX size={14} /></button></div>)}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">My Profile</h1>
          <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">Manage your provider information and preferences.</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto">
            <FiUser size={16} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setEditing(false)} className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-secondary-200 text-sm text-secondary-600 hover:bg-secondary-50 transition">Cancel</button>
            <button onClick={handleSave} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition"><FiSave size={14} /> Save</button>
          </div>
        )}
      </div>

      {/* Profile Header */}
      <Card>
        <div className="p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-600/25 flex-shrink-0">
            {`${(user?.firstName || 'P')[0]}${(user?.lastName || '')[0] || ''}`.toUpperCase()}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">{user?.fullName || user?.username || 'Provider'}</h2>
            <p className="text-sm text-secondary-500 mt-0.5">{form.specialization} — {form.experienceYears} years experience</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              {user?.roles?.map(r => <Badge key={r} variant="info">{r}</Badge>)}
              <Badge variant="success" dot>Active</Badge>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-secondary-400">License #</p>
            <p className="text-sm font-mono font-semibold text-secondary-700 dark:text-secondary-300">{form.licenseNumber}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Info */}
        <Card>
          <CardHeader title="Personal Information" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">First Name</label>
                {editing ? <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form.firstName || '—'}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">Last Name</label>
                {editing ? <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form.lastName || '—'}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">Email</label>
                <p className="text-sm font-medium text-secondary-900 dark:text-white flex items-center gap-2"><FiMail size={12} className="text-secondary-400" />{form.email || user?.email || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">Phone</label>
                {editing ? <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white flex items-center gap-2"><FiPhone size={12} className="text-secondary-400" />{form.phone}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Bio</label>
              {editing ? <textarea value={form.bio} onChange={e => set('bio', e.target.value)} className={inputClass + ' h-20 resize-none'} />
              : <p className="text-sm text-secondary-600 dark:text-secondary-400">{form.bio}</p>}
            </div>
          </div>
        </Card>

        {/* Professional Info */}
        <Card>
          <CardHeader title="Professional Details" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">Specialization</label>
                {editing ? <input value={form.specialization} onChange={e => set('specialization', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form.specialization}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">License Number</label>
                {editing ? <input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} className={inputClass} />
                : <p className="text-sm font-mono font-medium text-secondary-900 dark:text-white">{form.licenseNumber}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">Experience</label>
                {editing ? <input type="number" value={form.experienceYears} onChange={e => set('experienceYears', parseInt(e.target.value) || 0)} className={inputClass} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form.experienceYears} years</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">Languages</label>
                {editing ? <input value={form.languages} onChange={e => set('languages', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form.languages}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Availability</label>
              {editing ? <input value={form.availability} onChange={e => set('availability', e.target.value)} className={inputClass} />
              : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form.availability}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Location</label>
              {editing ? (
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="City" />
                  <input value={form.state} onChange={e => set('state', e.target.value)} className={inputClass} placeholder="State" />
                </div>
              ) : (
                <p className="text-sm font-medium text-secondary-900 dark:text-white flex items-center gap-2"><FiMapPin size={12} className="text-secondary-400" />{[form.city, form.state, form.country].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Security */}
      <Card>
        <CardHeader title="Security & Compliance" />
        <div className="p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center"><FiShield className="text-emerald-600" size={20} /></div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-secondary-900 dark:text-white">HIPAA Compliance</p>
            <p className="text-xs text-secondary-500 mt-0.5">Your account meets all HIPAA security requirements. Session is encrypted end-to-end.</p>
          </div>
          <Badge variant="success" dot>Compliant</Badge>
        </div>
      </Card>
    </div>
  );
}
