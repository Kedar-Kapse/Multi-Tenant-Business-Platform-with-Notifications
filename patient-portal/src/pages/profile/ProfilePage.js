import { useState, useEffect, useCallback } from 'react';
import { FiUser, FiMail, FiPhone, FiShield, FiMapPin, FiSave, FiX } from 'react-icons/fi';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import { profileApi } from '../../services/patientService';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-sm outline-none focus:ring-2 focus:ring-primary-500 text-secondary-900 dark:text-white';

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '',
  phone: '', dateOfBirth: '', gender: '', bloodGroup: '',
  addressLine1: '', city: '', state: '', country: '', zipCode: '',
  emergencyContact: '', allergies: '', chronicConditions: '',
  insuranceProvider: '', policyNumber: '',
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState(EMPTY_FORM);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileApi.get();
      const mapped = {
        firstName:        data.firstName        || user?.firstName || '',
        lastName:         data.lastName         || user?.lastName  || '',
        email:            data.email            || user?.email     || '',
        phone:            data.phone            || '',
        dateOfBirth:      data.dateOfBirth      || '',
        gender:           data.gender           || '',
        bloodGroup:       data.bloodGroup       || '',
        addressLine1:     data.addressLine1     || '',
        city:             data.city             || '',
        state:            data.state            || '',
        country:          data.country          || '',
        zipCode:          data.zipCode          || '',
        emergencyContact: data.emergencyContact || '',
        allergies:        data.allergies        || '',
        chronicConditions: data.chronicConditions || '',
        insuranceProvider: data.insuranceProvider || '',
        policyNumber:     data.policyNumber     || '',
      };
      setForm(mapped);
      setSavedForm(mapped);
    } catch {
      // Fallback to JWT claims if profile fetch fails (e.g. not yet provisioned)
      setForm(f => ({
        ...f,
        firstName: user?.firstName || '',
        lastName:  user?.lastName  || '',
        email:     user?.email     || '',
      }));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCancel = () => {
    setForm(savedForm);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        firstName:         form.firstName         || undefined,
        lastName:          form.lastName          || undefined,
        phone:             form.phone             || undefined,
        dateOfBirth:       form.dateOfBirth       || undefined,
        gender:            form.gender            || undefined,
        bloodGroup:        form.bloodGroup        || undefined,
        addressLine1:      form.addressLine1      || undefined,
        city:              form.city              || undefined,
        state:             form.state             || undefined,
        country:           form.country           || undefined,
        zipCode:           form.zipCode           || undefined,
        emergencyContact:  form.emergencyContact  || undefined,
        allergies:         form.allergies         || undefined,
        chronicConditions: form.chronicConditions || undefined,
        insuranceProvider: form.insuranceProvider || undefined,
        policyNumber:      form.policyNumber      || undefined,
      };
      const updated = await profileApi.update(payload);
      const mapped = {
        firstName:         updated.firstName         || '',
        lastName:          updated.lastName          || '',
        email:             updated.email             || '',
        phone:             updated.phone             || '',
        dateOfBirth:       updated.dateOfBirth       || '',
        gender:            updated.gender            || '',
        bloodGroup:        updated.bloodGroup        || '',
        addressLine1:      updated.addressLine1      || '',
        city:              updated.city             || '',
        state:             updated.state             || '',
        country:           updated.country           || '',
        zipCode:           updated.zipCode           || '',
        emergencyContact:  updated.emergencyContact  || '',
        allergies:         updated.allergies         || '',
        chronicConditions: updated.chronicConditions || '',
        insuranceProvider: updated.insuranceProvider || '',
        policyNumber:      updated.policyNumber      || '',
      };
      setForm(mapped);
      setSavedForm(mapped);
      setEditing(false);
      showToast('Profile updated successfully');
    } catch {
      showToast('Failed to update profile. Please try again.', true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.isError ? 'bg-red-600' : 'bg-emerald-600'} text-white`}>
          {toast.msg}
          <button onClick={() => setToast(null)}><FiX size={14} /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">My Profile</h1>
          <p className="text-xs sm:text-sm text-secondary-500">Manage your personal health information.</p>
        </div>
        {!editing
          ? <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition w-full sm:w-auto"><FiUser size={16} /> Edit Profile</button>
          : <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleCancel} className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-secondary-200 text-sm transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium transition disabled:opacity-50">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />}
                Save
              </button>
            </div>
        }
      </div>

      <Card>
        <div className="p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-600/25">
            {initials}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">{form.firstName} {form.lastName}</h2>
            <p className="text-sm text-secondary-500 mt-0.5">Patient ID: {user?.sub?.substring(0, 8) || 'N/A'}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <Badge variant="info">Patient</Badge>
              <Badge variant="success" dot>Active</Badge>
              {form.bloodGroup && <Badge variant="teal">{form.bloodGroup}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Personal Information" />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[['First Name','firstName'],['Last Name','lastName'],['Date of Birth','dateOfBirth'],['Gender','gender'],['Blood Group','bloodGroup']].map(([l, k]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-secondary-500 mb-1">{l}</label>
                  {editing
                    ? <input value={form[k]} onChange={e => set(k, e.target.value)} className={inputClass} />
                    : <p className="text-sm font-medium text-secondary-900 dark:text-white">{form[k] || <span className="text-secondary-400">—</span>}</p>
                  }
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Email</label>
              <p className="text-sm font-medium flex items-center gap-2"><FiMail size={12} className="text-secondary-400" />{form.email || <span className="text-secondary-400">—</span>}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Phone</label>
              {editing
                ? <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium flex items-center gap-2"><FiPhone size={12} className="text-secondary-400" />{form.phone || <span className="text-secondary-400">—</span>}</p>
              }
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Address</label>
              {editing
                ? <input value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium flex items-center gap-2"><FiMapPin size={12} className="text-secondary-400" />{[form.addressLine1, form.city, form.state].filter(Boolean).join(', ') || <span className="text-secondary-400">—</span>}</p>
              }
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Emergency Contact</label>
              {editing
                ? <input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium">{form.emergencyContact || <span className="text-secondary-400">—</span>}</p>
              }
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Medical Information" />
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Known Allergies</label>
              {editing
                ? <textarea value={form.allergies} onChange={e => set('allergies', e.target.value)} className={inputClass + ' h-16 resize-none'} placeholder="e.g. Penicillin, Sulfa drugs" />
                : <div className="flex flex-wrap gap-2">
                    {form.allergies
                      ? form.allergies.split(',').map(a => a.trim()).filter(Boolean).map(a => <Badge key={a} variant="danger">{a}</Badge>)
                      : <span className="text-sm text-secondary-400">None recorded</span>
                    }
                  </div>
              }
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Chronic Conditions</label>
              {editing
                ? <textarea value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)} className={inputClass + ' h-16 resize-none'} placeholder="e.g. Hypertension, Diabetes" />
                : <div className="flex flex-wrap gap-2">
                    {form.chronicConditions
                      ? form.chronicConditions.split(',').map(c => c.trim()).filter(Boolean).map(c => <Badge key={c} variant="warning">{c}</Badge>)
                      : <span className="text-sm text-secondary-400">None recorded</span>
                    }
                  </div>
              }
            </div>
            <div className="pt-4 border-t border-secondary-100 dark:border-secondary-700">
              <label className="block text-xs font-medium text-secondary-500 mb-1">Insurance Provider</label>
              {editing
                ? <input value={form.insuranceProvider} onChange={e => set('insuranceProvider', e.target.value)} className={inputClass} />
                : <p className="text-sm font-medium">{form.insuranceProvider || <span className="text-secondary-400">—</span>}</p>
              }
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-500 mb-1">Policy Number</label>
              {editing
                ? <input value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} className={inputClass} />
                : <p className="text-sm font-mono font-medium">{form.policyNumber || <span className="text-secondary-400">—</span>}</p>
              }
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Security & Privacy" />
        <div className="p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center"><FiShield className="text-emerald-600" size={20} /></div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-secondary-900 dark:text-white">Your data is protected</p>
            <p className="text-xs text-secondary-500 mt-0.5">All health records are encrypted and HIPAA compliant. Only you and your authorized providers can access your information.</p>
          </div>
          <Badge variant="success" dot>Protected</Badge>
        </div>
      </Card>
    </div>
  );
}
