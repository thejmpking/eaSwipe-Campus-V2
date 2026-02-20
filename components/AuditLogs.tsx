import React, { useState } from 'react';
import { UserRole } from '../types';

interface AuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  target: string;
  category: 'Attendance' | 'Security' | 'Policy' | 'Authority';
  metadata: string;
}

const AuditLogs: React.FC = () => {
  const [filter, setFilter] = useState<string>('All');
  
  const [logs] = useState<AuditEntry[]>([
    { id: 'LOG-8821', timestamp: '2024-05-24 08:12:04', actorName: 'Prof. David Miller', actorRole: UserRole.TEACHER, action: 'MARK_PRESENT', target: 'Alice Thompson (Student)', category: 'Attendance', metadata: 'Method: NFC_TAP | Loc: Room 102' },
    { id: 'LOG-8822', timestamp: '2024-05-24 08:15:30', actorName: 'Admin Sarah Johnson', actorRole: UserRole.ADMIN, action: 'POLICY_CHANGE', target: 'Global Grace Period', category: 'Policy', metadata: 'Value: 15m -> 10m' },
    { id: 'LOG-8823', timestamp: '2024-05-24 08:45:12', actorName: 'Inspector Michael West', actorRole: UserRole.RESOURCE_PERSON, action: 'INSPECTION_START', target: 'North Valley High', category: 'Security', metadata: 'Verification: GPS_MATCHED' },
    { id: 'LOG-8824', timestamp: '2024-05-24 09:00:00', actorName: 'System Engine', actorRole: UserRole.ADMIN, action: 'REGISTER_LOCK', target: 'North Valley Cluster', category: 'Attendance', metadata: 'Auto-Trigger: DAILY_WINDOW_END' },
    { id: 'LOG-8825', timestamp: '2024-05-24 09:15:45', actorName: 'Principal Helena Smith', actorRole: UserRole.SCHOOL_ADMIN, action: 'TOKEN_ISSUE', target: 'Bob Richards (Student)', category: 'Authority', metadata: 'Hardware_ID: NFC-X0921-B' },
    { id: 'LOG-8826', timestamp: '2024-05-24 09:30:00', actorName: 'Admin Sarah Johnson', actorRole: UserRole.ADMIN, action: 'ACCESS_REVOKE', target: 'USR-092 (Suspended)', category: 'Security', metadata: 'Reason: SECURITY_PROTOCOL_BREACH' },
  ]);

  const format12h = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const parts = timeStr.split(':');
      const h = parts[0];
      const m = parts[1] || '00';
      const hours = parseInt(h);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
    } catch (e) {
      return timeStr;
    }
  };

  const categories = ['All', 'Attendance', 'Security', 'Policy', 'Authority'];
  const filteredLogs = filter === 'All' ? logs : logs.filter(l => l.category === filter);

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Institutional Integrity Ledger</h2>
          <p className="text-slate-500 font-medium mt-3">Immutable activity monitoring and regulatory audit trail</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse ml-2"></div>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Live Ledger Sync Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* 2. Log Stream */}
        <div className="xl:col-span-3 space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === cat ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chronology</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority (Actor)</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Artifact</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">System Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-mono">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-[11px] font-bold text-slate-900">{log.timestamp.split(' ')[0]}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{format12h(log.timestamp.split(' ')[1])}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800">{log.actorName}</span>
                          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight mt-0.5">{log.actorRole.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black tracking-widest ${
                            log.category === 'Attendance' ? 'bg-emerald-50 text-emerald-600' :
                            log.category === 'Policy' ? 'bg-indigo-50 text-indigo-600' :
                            log.category === 'Security' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Target: {log.target}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xs overflow-hidden">
                           <p className="text-[9px] text-slate-400 truncate leading-tight uppercase font-black">{log.metadata}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-between items-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End of visible sequence</p>
               <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Load Historical Archive (PDF) →</button>
            </div>
          </div>
        </div>

        {/* 3. Logic & Compliance Sidebars */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">📜</div>
            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">Governance Integrity</h4>
            
            <div className="space-y-8 text-[11px] leading-relaxed font-medium">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   The Immutability Rule
                 </p>
                 <p className="text-slate-400 pl-3.5">
                   This ledger is <strong>Read-Only</strong>. Entries cannot be deleted or modified, even by the Super Admin. This "Non-Repudiation" protocol ensures that any misuse is visible to external auditors and regulatory bodies.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   Fraud Prevention
                 </p>
                 <p className="text-slate-400 pl-3.5">
                   By logging <strong>Who marked Whom</strong>, we eliminate "Proxy Presence". If a teacher marks a student present from home, the lack of an NFC-Proximity metadata tag immediately flags the entry for human review.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   Transparency Loop
                 </p>
                 <p className="text-slate-400 pl-3.5">
                   Compliance is maintained through <strong>Visible Accountability</strong>. When staff know that every action is logged, the motivation for "system gaming" (e.g. changing grace periods for personal advantage) is removed.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
             <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <span>🏗️</span> Audit Safeguards
             </h4>
             <div className="space-y-4">
                <PolicyIndicator label="Hashing Sync" status="Verified" />
                <PolicyIndicator label="Timestamp Authority" status="Atomic" />
                <PolicyIndicator label="Deletion Lock" status="Hard-coded" />
             </div>
             <p className="text-[9px] text-indigo-700 font-bold mt-8 italic px-1">
               "A management system without an audit trail is just a digital register. Accountability is the difference between data and truth."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PolicyIndicator: React.FC<{ label: string, status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-indigo-100">
     <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{label}</p>
     <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase">{status}</span>
  </div>
);

export default AuditLogs;