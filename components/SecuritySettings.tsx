
import React, { useState } from 'react';
import { UserRole } from '../types';

interface SecurityEvent {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  location: string;
  status: 'Authorized' | 'Challenged' | 'Blocked';
  risk: 'Low' | 'Medium' | 'High';
}

const SecuritySettings: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [events] = useState<SecurityEvent[]>([
    { id: 'SEC-0921', timestamp: '10:14:02', user: 'Prof. David Miller', role: UserRole.TEACHER, action: 'SESSION_START', location: 'North Valley High (IP: 192.168.1.4)', status: 'Authorized', risk: 'Low' },
    { id: 'SEC-0922', timestamp: '10:15:30', user: 'Alice Thompson', role: UserRole.STUDENT, action: 'NFC_TAP_FAILED', location: 'Main Gate B', status: 'Blocked', risk: 'Medium' },
    { id: 'SEC-0923', timestamp: '10:18:12', user: 'Principal Helena Smith', role: UserRole.SCHOOL_ADMIN, action: 'REPORT_MASS_EXPORT', location: 'Admin Office', status: 'Challenged', risk: 'High' },
    { id: 'SEC-0924', timestamp: '10:22:00', user: 'Unknown Device', role: UserRole.STUDENT, action: 'PIN_STUFFING', location: 'Remote (External IP)', status: 'Blocked', risk: 'High' },
  ]);

  const [toggles, setToggles] = useState({
    mfaRequired: true,
    ipLocking: false,
    sessionTimeout: 30,
    geoFencing: true
  });

  const handleGlobalSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("Institutional Defense Protocols Re-synchronized. All active sessions have been re-validated against current security entropy.");
    }, 1500);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Authority Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-950 p-10 rounded-[3rem] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl pointer-events-none">🛡️</div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
             <span className="px-3 py-1 bg-rose-600 text-[10px] font-black uppercase tracking-widest rounded-full">Defense Level 1</span>
             <span className="text-slate-500 text-xs font-bold tracking-widest">• ACTIVE MONITORING</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight leading-none">Security Matrix</h2>
          <p className="text-slate-400 font-medium mt-4 max-w-xl">Supervising the cryptographic integrity of the institutional perimeter and mitigating unauthorized access attempts in real-time.</p>
        </div>
        <button 
          onClick={handleGlobalSync}
          disabled={isSyncing}
          className="bg-white text-slate-950 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50 shrink-0 z-10"
        >
          {isSyncing ? 'Purging Stale Sessions...' : '⚡ Re-Synchronize Defense'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          
          {/* 2. Real-time Security Feed */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">Live Access Stream</h3>
                 <p className="text-xs text-slate-500 font-medium mt-2">Historical audit of recent institutional entry points</p>
               </div>
               <div className="flex gap-2">
                 <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-slate-200">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-slate-200">
                   <div className="w-2 h-2 bg-rose-600 rounded-full"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Violation</span>
                 </div>
               </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact ID</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity & Role</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity Detail</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-mono">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black text-slate-400">[{event.timestamp}]</span>
                        <p className="text-[11px] font-bold text-slate-900 mt-0.5">{event.id}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-800 leading-none mb-1">{event.user}</p>
                        <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">{event.role.replace('_', ' ')}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{event.action}</p>
                          <p className="text-[9px] text-slate-400 truncate w-40">{event.location}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            event.status === 'Authorized' ? 'bg-emerald-50 text-emerald-600' :
                            event.status === 'Blocked' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {event.status}
                          </span>
                          <span className={`text-[8px] font-black uppercase ${
                            event.risk === 'High' ? 'text-rose-500 animate-pulse' : 'text-slate-300'
                          }`}>Risk: {event.risk}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Global Security Controls */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
             <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Hardened Defense Configuration</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Session Purge</label>
                        <span className="text-[11px] font-black text-blue-600">{toggles.sessionTimeout}m</span>
                      </div>
                      <input 
                        type="range" min="5" max="120" step="5"
                        value={toggles.sessionTimeout}
                        onChange={(e) => setToggles({...toggles, sessionTimeout: parseInt(e.target.value)})}
                        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                      />
                      <p className="text-[9px] text-slate-400 italic mt-4 leading-relaxed">Active credentials are automatically invalidated after this duration of inactivity to prevent physical terminal hijacking.</p>
                   </div>
                   <SecurityToggle 
                    title="MFA Challenge" 
                    sub="Enforce secondary device verification for all Campus and Cluster level admins." 
                    checked={toggles.mfaRequired} 
                    onChange={() => setToggles({...toggles, mfaRequired: !toggles.mfaRequired})}
                  />
                </div>
                <div className="space-y-6">
                   <SecurityToggle 
                    title="Geofenced Authorization" 
                    sub="Lock NFC usage to within 500m of the user's assigned educational entity." 
                    checked={toggles.geoFencing} 
                    onChange={() => setToggles({...toggles, geoFencing: !toggles.geoFencing})}
                  />
                  <SecurityToggle 
                    title="IP Whitelisting" 
                    sub="Restrict admin workstation access to verified institutional networks only." 
                    checked={toggles.ipLocking} 
                    onChange={() => setToggles({...toggles, ipLocking: !toggles.ipLocking})}
                  />
                  <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 mt-4">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <span>⚠️</span> Panic Protocol
                    </p>
                    <button className="w-full py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">Global Session Kill</button>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* 4. Logic & Risk Sidebars */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">⚖️</div>
            <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">Risk Management Logic</h4>
            
            <div className="space-y-8">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                   Institutional Liability
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   We treat user identity as a <strong>Financial Artifact</strong>. If an account is compromised, the institution is liable for the exposure of minor data. Security oversight is mandatory to maintain our regulatory legal standing.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   The Handling of Suspicion
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   We use <strong>Progressive Friction</strong>. Suspicious logins aren't always blocked immediately—they are challenged. This prevents total system lockout for legitimate users while slowing down malicious actors.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   The Confirmation Mandate
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Security actions like "Global Session Kill" require <strong>Intentional Friction</strong>. This prevents accidental system-wide disruptions caused by misclicks during standard management tasks.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
             <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <span>🏗️</span> Integrity Scoreboard
             </h4>
             <div className="space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Attack Surface</span>
                  <span className="text-emerald-600">Minimized</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Encryption State</span>
                  <span className="text-blue-600">AES-256 Active</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Threat Latency</span>
                  <span className="text-emerald-600">Real-time</span>
               </div>
             </div>
             <p className="text-[9px] text-indigo-700 font-bold mt-8 italic px-1">
               "Security is not a feature; it is the environment in which policy is safely executed. Zero-Trust is our institutional standard."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SecurityToggle: React.FC<{ title: string, sub: string, checked: boolean, onChange: () => void }> = ({ title, sub, checked, onChange }) => (
  <div className="flex items-start justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
    <div className="max-w-[75%]">
      <p className="text-xs font-black text-slate-800 leading-none">{title}</p>
      <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 leading-relaxed tracking-wider">{sub}</p>
    </div>
    <button 
      onClick={onChange}
      className={`w-10 h-6 rounded-full transition-all relative ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'right-1' : 'left-1'}`}></div>
    </button>
  </div>
);

export default SecuritySettings;
