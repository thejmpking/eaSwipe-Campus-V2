
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserRole } from '../types';

interface DashboardProps {
  userRole: UserRole;
  userName: string;
  lastSync?: string;
  onNavigate?: (tab: string) => void;
  stats?: any; // Made flexible for role-based counts
}

const Dashboard: React.FC<DashboardProps> = ({ userRole, userName, lastSync = 'Just now', onNavigate, stats }) => {
  const mockChartData = [
    { name: 'M', students: 85, staff: 92 },
    { name: 'T', students: 88, staff: 94 },
    { name: 'W', students: 92, staff: 91 },
    { name: 'T', students: 90, staff: 93 },
    { name: 'F', students: 84, staff: 89 },
  ];

  const statItems = useMemo(() => {
    if (userRole === UserRole.TEACHER) {
      return [
        { label: 'Present (Month)', value: stats?.monthlyAttendance || '0/0', icon: '📋' },
        { label: 'Leaves (Month)', value: stats?.monthlyLeaves || 0, icon: '🗓️' },
        { label: "Today's Shift", value: stats?.todayShift || 'Unassigned', icon: '🕒' }
      ];
    }
    if (userRole === UserRole.RESOURCE_PERSON) {
      return [
        { label: 'Cluster Schools', value: stats?.schools || 0, icon: '🏫' },
        { label: 'Cluster Faculty', value: stats?.faculty || 0, icon: '👨‍🏫' },
        { label: 'Cluster Students', value: stats?.students || 0, icon: '🎓' }
      ];
    }
    if (userRole === UserRole.SCHOOL_ADMIN) {
      return [
        { label: 'Total Scholars', value: stats?.totalStudents || 0, icon: '🎓' },
        { label: 'Scholars Present', value: stats?.studentPresent || 0, icon: '✅', color: 'emerald' },
        { label: 'Scholars Absent', value: stats?.studentLeaves || 0, icon: '🚫', color: 'rose' },
        { label: 'Total Faculty', value: stats?.totalStaff || 0, icon: '👥' },
        { label: 'Faculty Present', value: stats?.staffPresent || 0, icon: '🔓', color: 'emerald' },
        { label: 'Faculty Absent', value: stats?.staffLeaves || 0, icon: '🔒', color: 'rose' }
      ];
    }
    // Default for higher tiers
    return [
      { label: 'Campuses', value: stats?.campuses || 0, icon: '🏙️' },
      { label: 'Clusters', value: stats?.clusters || 0, icon: '📍' },
      { label: 'Schools', value: stats?.schools || 0, icon: '🏫' },
      { label: 'Users', value: stats?.users || 0, icon: '👥' }
    ];
  }, [userRole, stats]);

  // Specific grid logic for Faculty vs Admin
  const gridColsClass = useMemo(() => {
    if (userRole === UserRole.TEACHER) return 'grid-cols-2 sm:grid-cols-3';
    if (userRole === UserRole.SCHOOL_ADMIN) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-4';
  }, [userRole]);

  return (
    <div className="space-y-6 md:space-y-12 pb-10">
      {/* WELCOME SECTION */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-14 text-white relative overflow-hidden shadow-2xl mx-1 md:mx-0">
         <div className="absolute top-0 right-0 p-6 md:p-12 opacity-5 text-6xl md:text-[12rem] font-semibold pointer-events-none -rotate-12 uppercase">Hub</div>
         <div className="relative z-10 space-y-4 md:space-y-6">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
               <span className="text-[8px] md:text-[10px] font-medium text-blue-400 uppercase tracking-[0.25em]">Sovereignty Hub v6.1</span>
            </div>
            <h2 className="text-2xl md:text-6xl font-semibold tracking-tighter leading-tight">
               Welcome back,<br />
               <span className="text-blue-500">{userName.split(' ')[0]}</span>
            </h2>
            <p className="text-slate-400 text-xs md:text-lg font-medium max-w-lg leading-relaxed">
               {userRole === UserRole.TEACHER 
                 ? "Monitoring your professional yield and temporal assignments for this cycle."
                 : userRole === UserRole.RESOURCE_PERSON 
                 ? "Cluster-level yields and local school integrity are within optimal parameters."
                 : "Institutional yield and regional node integrity are within optimal parameters."}
            </p>
         </div>
      </div>

      {/* METRICS GRID: Faculty optimized for 2nd column row split on mobile */}
      <div className={`grid gap-3 md:gap-4 px-1 md:px-0 ${gridColsClass}`}>
        {statItems.map((item, i) => {
          const isFacultyShiftCard = userRole === UserRole.TEACHER && i === 2;
          return (
            <div 
              key={i} 
              className={`bg-white p-5 md:p-8 rounded-[1.8rem] md:rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center group active:scale-[0.98] transition-all hover:shadow-xl ring-1 ring-slate-50 ${isFacultyShiftCard ? 'col-span-2 sm:col-span-1' : ''}`}
            >
               <div className={`w-10 h-10 md:w-16 md:h-16 rounded-[1.25rem] md:rounded-2xl flex items-center justify-center text-xl md:text-4xl mb-3 md:mb-6 transition-colors shadow-inner ${
                 item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                 item.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                 'bg-slate-50 group-hover:bg-blue-600 group-hover:text-white'
               }`}>{item.icon}</div>
               <p className="text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">{item.label}</p>
               <p className={`font-black text-slate-900 tracking-tighter tabular-nums ${
                 typeof item.value === 'string' && item.value.includes('/') 
                   ? 'text-xl md:text-5xl' 
                   : typeof item.value === 'string' && item.value.length > 10 
                   ? 'text-sm md:text-xl' 
                   : 'text-2xl md:text-5xl'
               }`}>{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* CHARTS & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 px-1 md:px-0">
         <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-8 md:mb-12">
               <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                 {userRole === UserRole.TEACHER ? 'Self Analytics' : userRole === UserRole.RESOURCE_PERSON ? 'Jurisdictional Yield' : 'Yield Velocity'}
               </h3>
               <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                 {userRole === UserRole.TEACHER ? 'Temporal Trend' : userRole === UserRole.RESOURCE_PERSON ? 'Cluster Data' : 'Global Aggregate'}
               </span>
            </div>
            <div className="h-[220px] md:h-[400px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '15px'}} />
                    <Bar dataKey="students" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={window.innerWidth < 768 ? 16 : 24} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-3 px-2">
               <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Nodes</h4>
            </div>
            <div className="grid grid-cols-1 gap-2 md:gap-3">
              {[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD].includes(userRole) && <QuickLink icon="🏙️" label="Campus Hub" onClick={() => onNavigate?.('directory')} />}
              {[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.RESOURCE_PERSON].includes(userRole) && <QuickLink icon="📍" label="Cluster Hub" onClick={() => onNavigate?.('clusters')} />}
              {[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.RESOURCE_PERSON].includes(userRole) && <QuickLink icon="🏫" label="School Hub" onClick={() => onNavigate?.('schools')} />}
              <QuickLink icon="🗓️" label="Time Table" onClick={() => onNavigate?.('timetable')} />
              {userRole !== UserRole.TEACHER && <QuickLink icon="🕒" label="Shift Registry" onClick={() => onNavigate?.('shifts')} />}
              {userRole !== UserRole.TEACHER && <QuickLink icon="📈" label="Reports" onClick={() => onNavigate?.('reporting')} />}
              <QuickLink icon="📋" label="Presence Ledger" onClick={() => onNavigate?.('attendance')} />
              {[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.RESOURCE_PERSON].includes(userRole) && <QuickLink icon="🔍" label="Inspection Report" onClick={() => onNavigate?.('inspections')} />}
              {userRole !== UserRole.TEACHER && userRole !== UserRole.SCHOOL_ADMIN && <QuickLink icon="🛡️" label="Governance" onClick={() => onNavigate?.('governance')} />}
            </div>
            
            <div className="bg-indigo-50/50 p-6 md:p-8 rounded-[2rem] border border-indigo-100 flex flex-col justify-center mt-4 shadow-sm relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">🔄</div>
               <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest mb-3 text-center opacity-60">Handshake Status</p>
               <p className="text-xs md:text-sm font-bold text-indigo-800 leading-relaxed italic text-center px-2">"Node atomic sync verified as of {lastSync}."</p>
            </div>
         </div>
      </div>
    </div>
  );
};

const QuickLink = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 md:p-6 bg-white border border-slate-100 rounded-[1.5rem] md:rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md hover:border-blue-200">
     <div className="flex items-center gap-4 md:gap-6">
        <span className="text-xl md:text-2xl group-hover:scale-110 transition-transform">{icon}</span>
        <span className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-widest md:tracking-[0.15em]">{label}</span>
     </div>
     <span className="text-slate-300 group-hover:text-blue-600 transition-colors font-black">→</span>
  </button>
);

export default Dashboard;
