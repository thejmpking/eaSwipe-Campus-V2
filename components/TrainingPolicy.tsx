
import React, { useState } from 'react';
import { UserRole } from '../types';

interface TrainingPolicyConfig {
  creationAuthority: UserRole[];
  verificationAuthority: UserRole[];
  allowSelfMarking: boolean;
  proximityEnforcement: boolean;
  minDurationForCredit: number; // in minutes
  mandatoryFeedback: boolean;
}

const TrainingPolicy: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<TrainingPolicyConfig>({
    creationAuthority: [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.RESOURCE_PERSON],
    verificationAuthority: [UserRole.ADMIN, UserRole.RESOURCE_PERSON, UserRole.SCHOOL_ADMIN],
    allowSelfMarking: true,
    proximityEnforcement: true,
    minDurationForCredit: 45,
    mandatoryFeedback: true,
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Training & Event Protocols Updated. Changes are now active for all 14 clusters.");
    }, 1200);
  };

  const toggleAuthority = (role: UserRole, type: 'creation' | 'verification') => {
    if (role === UserRole.ADMIN) return; // Admin always has authority
    
    const targetKey = type === 'creation' ? 'creationAuthority' : 'verificationAuthority';
    setConfig(prev => {
      const current = prev[targetKey];
      const next = current.includes(role) 
        ? current.filter(r => r !== role) 
        : [...current, role];
      return { ...prev, [targetKey]: next };
    });
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Professional Development Policy</h2>
          <p className="text-slate-500 font-medium mt-3">Governing event creation and certification authority</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isSaving ? 'Processing Protocol...' : '💾 Deploy Training Rules'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          
          {/* 2. Authority Table */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Authority & Privilege Mapping</h3>
               <p className="text-xs text-slate-500 font-medium mt-1">Defining which roles can initiate and verify institutional events</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-50">
                  <tr>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institutional Role</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Create Events</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Verify Presence</th>
                    <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.values(UserRole).map(role => (
                    <tr key={role} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm">👤</div>
                          <span className="text-sm font-black text-slate-800">{role.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <button 
                          onClick={() => toggleAuthority(role, 'creation')}
                          className={`w-12 h-6 rounded-full mx-auto transition-colors relative ${config.creationAuthority.includes(role) ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.creationAuthority.includes(role) ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <button 
                          onClick={() => toggleAuthority(role, 'verification')}
                          className={`w-12 h-6 rounded-full mx-auto transition-colors relative ${config.verificationAuthority.includes(role) ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.verificationAuthority.includes(role) ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {role === UserRole.STUDENT ? 'Blocked' : 'Configurable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Verification & Compliance Rules */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Marking & Compliance Logic</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-black text-slate-800 leading-none">Min. Participation Time</p>
                      <span className="text-sm font-black text-indigo-600">{config.minDurationForCredit}m</span>
                    </div>
                    <input 
                      type="range" min="15" max="180" step="15"
                      value={config.minDurationForCredit}
                      onChange={(e) => setConfig({...config, minDurationForCredit: parseInt(e.target.value)})}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-6">Staff must be checked-in for at least this duration to receive official CPD (Continuous Professional Development) credits.</p>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div>
                      <p className="text-xs font-black text-indigo-900 leading-none">Self-Marking Authority</p>
                      <p className="text-[9px] text-indigo-600 font-bold uppercase mt-1">Allow staff to mark arrival</p>
                    </div>
                    <button 
                      onClick={() => setConfig({...config, allowSelfMarking: !config.allowSelfMarking})}
                      className={`w-10 h-6 rounded-full transition-colors relative ${config.allowSelfMarking ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.allowSelfMarking ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div>
                      <p className="text-xs font-black text-indigo-900 leading-none">NFC Proximity Enforcement</p>
                      <p className="text-[9px] text-indigo-600 font-bold uppercase mt-1">Required for Supervisor mark</p>
                    </div>
                    <button 
                      onClick={() => setConfig({...config, proximityEnforcement: !config.proximityEnforcement})}
                      className={`w-10 h-6 rounded-full transition-colors relative ${config.proximityEnforcement ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.proximityEnforcement ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* 4. Logic Sidebars */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">🎓</div>
            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">Institutional Compliance</h4>
            
            <div className="space-y-8">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   The Separation Rule
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Training is <strong>Event-Based</strong>, while daily attendance is <strong>Session-Based</strong>. Separating them ensures that certification records aren't mixed with daily punctuality data, protecting the accuracy of both.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Audit Integrity
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Unauthorized marking is blocked to prevent "Log Padding". Only roles with specific <strong>Inspection or Governance Permissions</strong> can verify presence, ensuring that certificates reflect real participation.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Evaluation Tracking
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Participation isn't just "present". By tracking arrival and departure timestamps, the system calculates <strong>Engagement Depth</strong>, allowing for better evaluation of staff growth.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex flex-col justify-between">
             <div>
                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span>🛠️</span> Structural Safeguards
                </h4>
                <div className="space-y-4">
                  <PolicyIndicator label="Self-Marking GPS" status="Mandatory" />
                  <PolicyIndicator label="Audit Trail Sync" status="Real-time" />
                  <PolicyIndicator label="Unauthorized Lock" status="Immediate" />
                </div>
             </div>
             <div className="mt-8 pt-6 border-t border-indigo-200">
               <p className="text-[9px] font-bold text-indigo-800 leading-tight italic">
                 "Training policy defines the institutional growth curve. Integrity here is the foundation of institutional certification."
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PolicyIndicator: React.FC<{ label: string, status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-indigo-100">
     <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{label}</p>
     <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{status}</span>
  </div>
);

export default TrainingPolicy;
