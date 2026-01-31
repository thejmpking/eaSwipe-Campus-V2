
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserRole } from '../types';

interface DashboardProps {
  userRole: UserRole;
  userName: string;
  lastSync?: string;
  onNavigate?: (tab: string) => void;
  onSelectCluster?: (clusterId: string) => void;
  onSelectCampus?: (campusId: string) => void;
  stats?: {
    campuses: number;
    clusters: number;
    schools: number;
    users: number;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ userRole, userName, lastSync = 'Never', onNavigate, onSelectCluster, onSelectCampus, stats }) => {
  const isRP = userRole === UserRole.RESOURCE_PERSON;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

  const mockChartData = [
    { name: 'Mon', students: 85, staff: 92 },
    { name: 'Tue', students: 88, staff: 94 },
    { name: 'Wed', students: 92, staff: 91 },
    { name: 'Thu', students: 90, staff: 93 },
    { name: 'Fri', students: 84, staff: 89 },
  ];

  const adminStats = [
    { label: 'Thibyan Campuses', value: stats?.campuses?.toString() || '0', icon: '🏙️', sub: 'Regional Hubs' },
    { label: 'Total Clusters', value: stats?.clusters?.toString() || '0', icon: '📍', sub: 'Resource Zones' },
    { label: 'Active Schools', value: stats?.schools?.toString() || '0', icon: '🏫', sub: 'Institutional Entities' },
    { label: 'System Users', value: stats?.users ? (stats.users > 999 ? `${(stats.users/1000).toFixed(1)}k` : stats.users.toString()) : '0', icon: '👥', sub: 'Global Registry' }
  ];

  const rpStats = [
    { label: 'Cluster Hubs', value: stats?.clusters?.toString() || '0', icon: '📍', sub: 'Active Nodes' },
    { label: 'Assigned Schools', value: stats?.schools?.toString() || '0', icon: '🏫', sub: 'Entities' },
    { label: 'Avg Yield', value: '94.2%', icon: '📈', sub: 'Daily Analytics' },
    { label: 'Cluster Users', value: stats?.users?.toString() || '0', icon: '👤', sub: 'Managed Staff' }
  ];

  const activeStats = isAdmin ? adminStats : rpStats;

  return (
    <div className="space-y-6 md:space-y-12 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {isAdmin ? 'Institutional Command' : `Hello, ${userName.split(' ')[0]}`}
          </h2>
          <p className="text-slate-500 font-medium mt-1 md:mt-4 text-sm md:text-lg">
            {isAdmin ? 'Master oversight of global institutional nodes.' : 'Jurisdictional management hub.'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 px-5 md:px-8 py-3 md:py-5 rounded-2xl md:rounded-[2rem] shadow-sm flex items-center gap-4 md:gap-5 shrink-0">
           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
           <div>
             <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] leading-none">Cloud Active</p>
             <p className="text-[10px] md:text-xs font-bold text-slate-900 mt-1 md:mt-1.5">Last Sync: {lastSync}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {activeStats.map((stat, i) => (
          <div key={i} className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all group active:scale-95">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 mb-4 md:mb-8">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-3xl border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">{stat.icon}</div>
              <h3 className="text-slate-400 text-[8px] md:text-[11px] font-black uppercase tracking-widest leading-tight">{stat.label}</h3>
            </div>
            <p className="text-2xl md:text-5xl font-black text-slate-900 leading-none tracking-tight">{stat.value}</p>
            <p className="text-[7px] md:text-[10px] text-slate-400 mt-2 md:mt-4 font-bold uppercase tracking-widest leading-none truncate">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="lg:col-span-2 space-y-6 md:space-y-12">
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 md:mb-14 gap-4">
               <div>
                  <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">Institutional Yield</h3>
                  <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Cross-Node Punctuality Artifacts</p>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Target</span>
               </div>
            </div>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '16px'}}
                  />
                  <Bar dataKey="students" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={32} name="Real Yield" />
                  <Bar dataKey="staff" fill="#cbd5e1" radius={[8, 8, 0, 0]} barSize={32} name="Staff Metrics" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-12">
          <div className="bg-blue-600 p-8 rounded-[2.5rem] md:rounded-[3.5rem] text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 md:p-10 opacity-10 text-6xl md:text-8xl group-hover:scale-110 transition-transform">📍</div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 mb-6">Master Actions</p>
            <div className="space-y-4">
              <MobileCmd title="View Campuses" icon="🏙️" onClick={() => onNavigate?.('directory')} />
              <MobileCmd title="Cluster Map" icon="🗺️" onClick={() => onNavigate?.('clusters')} />
              <MobileCmd title="Identity Registry" icon="👥" onClick={() => onNavigate?.('users')} />
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/5">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-8">System Protocol</h4>
            <div className="space-y-6">
              <p className="text-xs font-bold text-slate-400 leading-relaxed italic">"The EduSync core provides real-time sovereignty over institutional data nodes. Data integrity is absolute."</p>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="w-full h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileCmd: React.FC<{ title: string, icon: string, onClick: () => void }> = ({ title, icon, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 md:p-5 bg-white/10 hover:bg-white/20 border border-white/5 rounded-2xl transition-all active:scale-95 group">
    <div className="flex items-center gap-4">
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-xs md:text-sm font-black">{title}</span>
    </div>
    <span className="opacity-40">→</span>
  </button>
);

export default Dashboard;
