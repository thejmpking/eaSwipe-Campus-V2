
import React, { useState } from 'react';
import { UserRole } from '../types';

interface PolicyConfig {
  startTime: string;
  endTime: string;
  gracePeriod: number;
  lateThreshold: number; // minutes after grace period before it becomes absent
  mandatoryCheckOut: boolean;
  halfDayThreshold: number; // hours of presence required
  roleAuthorities: Record<UserRole, { selfMarking: boolean; nfcRequired: boolean }>;
}

const PolicySettings: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<PolicyConfig>({
    startTime: '08:00',
    endTime: '16:00',
    gracePeriod: 15,
    lateThreshold: 45,
    mandatoryCheckOut: true,
    halfDayThreshold: 4,
    // Fix: Added missing SUPER_ADMIN role to satisfy Record<UserRole, T>
    roleAuthorities: {
      [UserRole.SUPER_ADMIN]: { selfMarking: true, nfcRequired: false },
      [UserRole.ADMIN]: { selfMarking: true, nfcRequired: false },
      [UserRole.CAMPUS_HEAD]: { selfMarking: true, nfcRequired: true },
      [UserRole.RESOURCE_PERSON]: { selfMarking: true, nfcRequired: true },
      [UserRole.SCHOOL_ADMIN]: { selfMarking: true, nfcRequired: true },
      [UserRole.TEACHER]: { selfMarking: true, nfcRequired: true },
      [UserRole.STUDENT]: { selfMarking: false, nfcRequired: true },
    }
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Institutional Policy Propagated. All 52 schools have been synchronized with the new attendance protocol.");
    }, 1500);
  };

  const toggleRoleAuthority = (role: UserRole, key: 'selfMarking' | 'nfcRequired') => {
    if (role === UserRole.ADMIN && key === 'selfMarking') return; // Cannot disable admin self-marking
    setConfig(prev => ({
      ...prev,
      roleAuthorities: {
        ...prev.roleAuthorities,
        [role]: {
          ...prev.roleAuthorities[role],
          [key]: !prev.roleAuthorities[role][key]
        }
      }
    }));
  };

  // Conflict Detection Logic
  const hasConflict = config.lateThreshold <= config.gracePeriod;

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Header & Global Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Attendance Constitution</h2>
          <p className="text-slate-500 font-medium mt-3">Defining global time protocols and marking authorities</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving || hasConflict}
          className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isSaving ? 'Synchronizing Schools...' : '💾 Deploy Global Policy'}
        </button>
      </div>

      {/* 2. Policy Warning (Conflict Guard) */}
      {hasConflict && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-6 animate-in shake duration-500">
          <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">⚠️</div>
          <div>
            <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest">Logic Conflict Detected</h4>
            <p className="text-xs text-rose-700 font-medium mt-1">The "Late Threshold" ({config.lateThreshold}m) must be greater than the "Grace Period" ({config.gracePeriod}m). Deployment is locked until resolved.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          
          {/* 3. Time Windows & Thresholds */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Time & Threshold Protocols</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Start Time</label>
                    <input 
                      type="time" 
                      value={config.startTime} 
                      onChange={(e) => setConfig({...config, startTime: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" 
                    />
                 </div>
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Grace Period</label>
                      <span className="text-sm font-black text-blue-600">{config.gracePeriod} Minutes</span>
                    </div>
                    <input 
                      type="range" min="0" max="60" step="5"
                      value={config.gracePeriod}
                      onChange={(e) => setConfig({...config, gracePeriod: parseInt(e.target.value)})}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-[9px] text-slate-400 italic mt-4">Arrivals within this window are marked "Present" but flagged for punctuality tracking.</p>
                 </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Late-to-Absent Threshold</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        value={config.lateThreshold} 
                        onChange={(e) => setConfig({...config, lateThreshold: parseInt(e.target.value)})}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" 
                      />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mins</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div>
                        <p className="text-xs font-black text-blue-900 leading-none">Mandatory Check-out</p>
                        <p className="text-[9px] text-blue-600 font-bold uppercase mt-1">Force exit tap</p>
                      </div>
                      <button 
                        onClick={() => setConfig({...config, mandatoryCheckOut: !config.mandatoryCheckOut})}
                        className={`w-10 h-6 rounded-full transition-colors relative ${config.mandatoryCheckOut ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.mandatoryCheckOut ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* 4. Role Authority Matrix */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Authority Matrix</h3>
               <p className="text-xs text-slate-500 font-medium mt-1">Controlling which roles are authorized for self-verification</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-50">
                  <tr>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institutional Role</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Self Check-in</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">NFC Hardware Req.</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Access Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* Correcting entries iteration with proper type casting to avoid unknown property access errors */}
                  {(Object.entries(config.roleAuthorities) as [UserRole, { selfMarking: boolean; nfcRequired: boolean }][]).map(([role, auth]) => (
                    <tr key={role} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">👤</div>
                          <span className="text-sm font-black text-slate-800">{role.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <button 
                          onClick={() => toggleRoleAuthority(role as UserRole, 'selfMarking')}
                          className={`w-12 h-6 rounded-full mx-auto transition-colors relative ${auth.selfMarking ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${auth.selfMarking ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <button 
                          onClick={() => toggleRoleAuthority(role as UserRole, 'nfcRequired')}
                          className={`w-12 h-6 rounded-full mx-auto transition-colors relative ${auth.nfcRequired ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${auth.nfcRequired ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {role === UserRole.STUDENT ? 'Restricted' : 'Operational'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 5. Logic Sidebars */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">⚖️</div>
            <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">Governance Logic</h4>
            
            <div className="space-y-8">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   Centralized Standardization
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Uniform rules across all campuses prevent "Punctuality Drift". If one school is more lenient than another, the institutional data yield becomes unreliable for regional planning.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   The Historical Lock
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Policy shifts only apply to future registers. Changing a grace period from 15m to 10m today will not retroactively mark staff as late for yesterday's session.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   Verification Integrity
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Students are restricted from self-marking to prevent "Remote Check-ins". Every student presence mark must be verified by an authorized hardware tap (NFC) in proximity to a teacher.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
             <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <span>📉</span> Institutional Impact Score
             </h4>
             <div className="space-y-5">
                <div className="flex justify-between items-center text-[11px] font-bold text-amber-800">
                   <span>Data Cleanliness</span>
                   <span>High</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-amber-800">
                   <span>Staff Accountability</span>
                   <span>Strict</span>
                </div>
                <div className="w-full h-1 bg-amber-200 rounded-full overflow-hidden mt-4">
                   <div className="h-full bg-amber-600 w-4/5"></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicySettings;
