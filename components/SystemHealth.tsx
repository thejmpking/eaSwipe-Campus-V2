
import React, { useState } from 'react';

const SystemHealth: React.FC = () => {
  const [pulseData] = useState({
    vitalityScore: 98,
    activeUsers: 1422,
    staffOnline: 248,
    studentsOnline: 1174,
    syncedToday: '124.2k',
    pendingSync: '142',
    uptime: '14d 22h'
  });

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Header & Pulse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Institutional Vitality Hub</h2>
          <p className="text-slate-500 font-medium mt-3">Observing the real-time operational pulse of the digital ecosystem</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">System State</p>
              <p className="text-sm font-black text-emerald-600 mt-1 uppercase tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Optimal Vitality
              </p>
           </div>
           <div className="h-10 w-[1px] bg-slate-100"></div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Uptime</p>
              <p className="text-sm font-black text-slate-900 mt-1 uppercase tracking-tight">{pulseData.uptime}</p>
           </div>
        </div>
      </div>

      {/* 2. Key Vital Signs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <VitalCard icon="👥" label="Active Presence" value={pulseData.activeUsers} sub={`${pulseData.staffOnline} Staff • ${pulseData.studentsOnline} Students`} />
        <VitalCard icon="🔄" label="Data Processing" value={pulseData.syncedToday} sub={`${pulseData.pendingSync} Records in queue`} color="blue" />
        <VitalCard icon="🛡️" label="Security Entropy" value="Stable" sub="All access nodes verified" color="indigo" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          
          {/* 3. Real-time Node Activity */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
             <div className="flex justify-between items-start mb-10">
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">Data Digestion Flow</h3>
                   <p className="text-xs text-slate-500 font-medium mt-1">Monitoring the heartbeat of attendance synchronisation</p>
                </div>
                <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                   Last Handshake: 2s ago
                </div>
             </div>

             <div className="space-y-8">
                <FlowNode label="Southern Metropolitan Campus" progress={92} speed="High" status="Stable" />
                <FlowNode label="Northern Heights Cluster" progress={45} speed="Moderate" status="Processing" />
                <FlowNode label="Eastern Waterfront (Rural Hub)" progress={12} speed="Low" status="Bandwidth Sync" />
                <FlowNode label="Central Management Core" progress={100} speed="Atomic" status="Synchronized" />
             </div>
          </div>

          {/* 4. Information Matrix */}
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Usage Snapshot</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Cross-sectional analysis of user load per entity</p>
             </div>
             <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution Entity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Leads</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Traffic Load</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-mono">
                   <UsageRow name="North Valley High" active="42" load="Heavy" health="99%" />
                   <UsageRow name="East Side Primary" active="18" load="Light" health="100%" />
                   <UsageRow name="Valley Middle School" active="26" load="Medium" health="98%" />
                   <UsageRow name="Central Secondary" active="31" load="Medium" health="100%" />
                </tbody>
             </table>
          </div>
        </div>

        {/* 5. Logical Context Sidebars */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">🔭</div>
            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">System Visibility Logic</h4>
            
            <div className="space-y-8">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Operational Awareness
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Administrators need to see the "Smoke before the Fire". By monitoring <strong>Sync Speeds</strong>, you can predict when a school's local internet is failing before they call support.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Informational-Only Mode
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   This page is <strong>Strictly Descriptive</strong>. It does not allow modification of data. This "Read-Only" guard ensures that you can observe system performance without accidentally stopping a critical background task.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Infrastructure Planning
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Traffic data helps in <strong>Resource Allocation</strong>. If one cluster consistently shows "Heavy Load" with high latency, it’s a signal to invest in better local hardware for that region.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex flex-col justify-between">
             <div>
                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span>📊</span> Infrastructure Snapshot
                </h4>
                <div className="space-y-4">
                   <HealthStat label="Sync Queue" value="142" status="Clear" />
                   <HealthStat label="API Latency" value="42ms" status="Fast" />
                   <HealthStat label="Node Count" value="52 Schools" status="Linked" />
                </div>
             </div>
             <p className="text-[9px] text-indigo-700 font-bold mt-8 italic px-1">
               "A healthy system is an invisible one. When the Vitality Hub is green, your policy can execute without friction."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const VitalCard: React.FC<{ icon: string, label: string, value: string | number, sub: string, color?: string }> = ({ icon, label, value, sub, color = "emerald" }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner border border-slate-50 transition-colors ${
      color === 'emerald' ? 'group-hover:bg-emerald-600 group-hover:text-white' :
      color === 'blue' ? 'group-hover:bg-blue-600 group-hover:text-white' :
      'group-hover:bg-indigo-600 group-hover:text-white'
    }`}>
      {icon}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-4xl font-black text-slate-900 leading-none tracking-tight">{value}</p>
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">{sub}</p>
  </div>
);

const FlowNode: React.FC<{ label: string, progress: number, speed: string, status: string }> = ({ label, progress, speed, status }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-end">
       <div>
          <p className="text-xs font-black text-slate-800 leading-none">{label}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{status} • {speed} Traffic</p>
       </div>
       <span className="text-[10px] font-mono font-black text-blue-600">{progress}% Sync</span>
    </div>
    <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
       <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
    </div>
  </div>
);

const UsageRow: React.FC<{ name: string, active: string, load: string, health: string }> = ({ name, active, load, health }) => (
  <tr className="hover:bg-slate-50/50 transition-colors">
    <td className="px-8 py-5 text-xs font-black text-slate-800 uppercase tracking-tight">{name}</td>
    <td className="px-8 py-5 text-sm font-bold text-slate-500">{active} Nodes</td>
    <td className="px-8 py-5">
       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
         load === 'Heavy' ? 'text-rose-600' : load === 'Medium' ? 'text-blue-600' : 'text-emerald-600'
       }`}>{load}</span>
    </td>
    <td className="px-8 py-5 text-right font-black text-blue-600">{health}</td>
  </tr>
);

const HealthStat: React.FC<{ label: string, value: string, status: string }> = ({ label, value, status }) => (
  <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-indigo-100">
     <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{label}</p>
     <div className="text-right">
        <p className="text-xs font-black text-indigo-700 leading-none">{value}</p>
        <p className="text-[8px] font-black text-emerald-600 uppercase mt-0.5">{status}</p>
     </div>
  </div>
);

export default SystemHealth;
