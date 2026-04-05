import { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiCalendar, FiFileText, FiActivity, FiArrowRight, FiRefreshCw, FiTrendingUp, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import useAuthStore from '../../store/authStore';
import { staffApi, claimsApi, facilityApi, ehrApi } from '../../services/providerService';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const [stats, setStats] = useState({ staff: 0, templates: 0, claims: 0, beds: 0 });
  const [recentStaff, setRecentStaff] = useState([]);
  const [claimData, setClaimData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      staffApi.getAll(0, 5),
      claimsApi.getAll(),
      ehrApi.getTemplates(),
      facilityApi.getBeds(),
    ]);

    const staffData = results[0].status === 'fulfilled' ? results[0].value : {};
    const claims = results[1].status === 'fulfilled' ? results[1].value : [];
    const templates = results[2].status === 'fulfilled' ? results[2].value : [];
    const beds = results[3].status === 'fulfilled' ? results[3].value : [];

    setStats({
      staff: staffData?.totalElements || 0,
      templates: Array.isArray(templates) ? templates.length : 0,
      claims: Array.isArray(claims) ? claims.length : 0,
      beds: Array.isArray(beds) ? beds.length : 0,
    });
    setRecentStaff(staffData?.content || []);
    setClaimData(Array.isArray(claims) ? claims.slice(0, 10) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const claimsByStatus = ['PAID', 'SUBMITTED', 'IN_REVIEW', 'DENIED', 'APPROVED'].map(s => ({
    name: s.replace('_', ' '), value: claimData.filter(c => c.status === s).length,
    color: { PAID: '#16a34a', SUBMITTED: '#3b82f6', IN_REVIEW: '#f59e0b', DENIED: '#e11d48', APPROVED: '#0d9488' }[s],
  })).filter(c => c.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{greeting}, {user?.firstName || user?.username || 'Provider'}</h1>
          <p className="text-sm text-secondary-500 mt-0.5">Here's your clinical overview for today.</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-400 transition">
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Team Members" value={stats.staff} icon={FiUsers} color="blue" />
        <StatCard title="Total Claims" value={stats.claims} icon={FiTrendingUp} color="green" />
        <StatCard title="EHR Templates" value={stats.templates} icon={FiFileText} color="purple" />
        <StatCard title="Beds Managed" value={stats.beds} icon={FiActivity} color="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Claims Distribution */}
        <Card>
          <CardHeader title="Claims Overview" subtitle="Current period status breakdown" />
          <div className="p-5 flex flex-col items-center">
            {claimsByStatus.length > 0 ? (
              <>
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={claimsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {claimsByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: 12, fontSize: 12, color: '#fff' }} /></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                  {claimsByStatus.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-xs text-secondary-500">{s.name}</span>
                      <span className="text-xs font-semibold ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-secondary-400 py-8">No claims data</p>}
          </div>
        </Card>

        {/* Recent Staff */}
        <Card className="xl:col-span-2">
          <CardHeader title="Recent Team Members" subtitle="Latest staff added to your organization" action={
            <button onClick={() => navigate('/patients')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">View all <FiArrowRight size={12} /></button>
          } />
          <div className="divide-y divide-secondary-50 dark:divide-secondary-800">
            {recentStaff.length === 0 ? (
              <div className="px-5 py-8 text-center text-secondary-400 text-sm">No team members yet</div>
            ) : recentStaff.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30 transition">
                <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-semibold text-xs flex-shrink-0">
                  {`${(s.firstName || '')[0] || ''}${(s.lastName || '')[0] || ''}`.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-secondary-400">{s.email}</p>
                </div>
                <Badge variant={s.role === 'DOCTOR' ? 'teal' : s.role === 'NURSE' ? 'success' : 'info'}>{s.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" subtitle="Frequently used features" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
          {[
            { label: 'View Schedule', icon: FiCalendar, path: '/schedule', color: 'bg-blue-50 text-blue-600' },
            { label: 'My Patients', icon: FiUsers, path: '/patients', color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Clinical Notes', icon: FiFileText, path: '/notes', color: 'bg-purple-50 text-purple-600' },
            { label: 'Submit Claim', icon: FiTrendingUp, path: '/claims', color: 'bg-amber-50 text-amber-600' },
          ].map(a => (
            <button key={a.path} onClick={() => navigate(a.path)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md transition">
              <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center`}><a.icon size={18} /></div>
              <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{a.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
