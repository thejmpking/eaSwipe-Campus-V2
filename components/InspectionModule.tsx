
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

interface InspectionModuleProps {
  userRole: string;
  schools?: any[];
  users?: any[];
  userName?: string;
  userId?: string;
}

interface AuditItem {
  id: string;
  name: string;
  role: string;
  dailyStatus: string;
  auditStatus: 'Pending' | 'Verified' | 'Discrepancy';
  avatar: string;
}

const RATING_EMOJIS = [
  { emoji: '😞', label: 'Sad', score: 1 },
  { emoji: '😐', label: 'Average', score: 2 },
  { emoji: '🙂', label: 'Good', score: 3 },
  { emoji: '😃', label: 'Very Good', score: 4 },
  { emoji: '🤩', label: 'Extremely Good', score: 5 },
];

interface PastInspection {
  id: string;
  school: string;
  date: string;
  inspector: string; // This will now store the auditor's unique ID
  score: number;
  discrepancies: number;
  status: 'Compliant' | 'Warning' | 'Critical';
  ratingEmoji: string;
  ratingLabel: string;
  comments: string;
  isRead?: boolean;
}

const InspectionModule: React.FC<InspectionModuleProps> = ({ userRole, schools = [], users = [], userName = 'Regional Auditor', userId = 'ADMIN' }) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pastInspections, setPastInspections] = useState<PastInspection[]>([]);
  const [auditList, setAuditList] = useState<AuditItem[]>([]);
  const [viewedInspection, setViewedInspection] = useState<PastInspection | null>(null);
  const [isDispatching, setIsDispatching] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    school: '',
    date: new Date().toISOString().split('T')[0],
    ratingIndex: 2, // Default to Good (index 2)
    comments: ''
  });

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const records = await dataService.getRecords('inspections');
      if (Array.isArray(records)) {
        setPastInspections(records as PastInspection[]);
      }
    } catch (e) {
      console.error("Database Inspection Fetch Error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const startInspection = () => {
    if (!selectedSchool) return;
    setLoading(true);
    const schoolStaff = users.filter(u => u.assignment === selectedSchool || u.school === selectedSchool).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        dailyStatus: 'Active',
        auditStatus: 'Pending' as const,
        avatar: u.nfcUrl?.startsWith('data:') ? u.nfcUrl : `https://picsum.photos/seed/${u.id}/64/64`
    }));
    
    setTimeout(() => {
      setAuditList(schoolStaff);
      setFormData(prev => ({ ...prev, school: selectedSchool, ratingIndex: 2, comments: '' }));
      setSessionActive(true);
      setLoading(false);
      setIsInitializing(false);
    }, 1500);
  };

  const markAudit = (id: string, status: 'Verified' | 'Discrepancy') => {
    setAuditList(prev => prev.map(item => item.id === id ? { ...item, auditStatus: status } : item));
  };

  const handleFinalizeReport = async () => {
    if (isCommitting) return;
    setIsCommitting(true);
    
    const ratingObj = RATING_EMOJIS[formData.ratingIndex];
    const discrepancies = auditList.filter(a => a.auditStatus === 'Discrepancy').length;

    const newReport: any = {
      id: `INSP-${Math.floor(Math.random() * 9000 + 1000)}`,
      school: selectedSchool,
      date: new Date().toISOString().split('T')[0],
      inspector: userId, // CRITICAL: Now storing the unique Auditor ID
      score: ratingObj.score,
      discrepancies,
      status: discrepancies > 2 ? 'Critical' : discrepancies > 0 ? 'Warning' : 'Compliant',
      rating_emoji: ratingObj.emoji,
      rating_label: ratingObj.label,
      comments: formData.comments,
      is_read: false
    };

    try {
      const res = await dataService.syncRecord('inspections', newReport);
      if (res.status === 'success') {
        await fetchInspections();
        setSessionActive(false);
        setIsInitializing(false);
      } else {
        alert(`Registry Sync Failure: ${res.message}`);
      }
    } catch (e) {
      alert("Infrastructure Fault: Failed to commit audit artifact.");
    } finally {
      setIsCommitting(false);
    }
  };

  const [isCommitting, setIsCommitting] = useState(false);

  const handleDispatchMail = async (target: 'HeadOffice' | 'SchoolAdmin') => {
    if (!viewedInspection) return;
    setIsDispatching(target);

    try {
      let recipientEmail = '';
      if (target === 'HeadOffice') {
        const head = users.find(u => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN);
        recipientEmail = head?.email || 'admin@edusync.edu';
      } else {
        const schoolAdmin = users.find(u => u.role === UserRole.SCHOOL_ADMIN && (u.school === viewedInspection.school || u.assignment === viewedInspection.school));
        recipientEmail = schoolAdmin?.email || '';
      }

      if (!recipientEmail) {
        alert("Node Error: No email artifact bound to the selected recipient node.");
        setIsDispatching(null);
        return;
      }

      const bridgeUrl = localStorage.getItem('SUPABASE_URL') || '';
      const apiKey = localStorage.getItem('SUPABASE_KEY') || '';
      
      const response = await fetch(`${bridgeUrl}?action=send_report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          recipient: recipientEmail,
          subject: `Oversight Report: ${viewedInspection.school} (${viewedInspection.id})`,
          body: `Institutional Oversight Summary\n\nSchool: ${viewedInspection.school}\nArtifact ID: ${viewedInspection.id}\nScore: ${viewedInspection.score}/5\nRating: ${viewedInspection.ratingEmoji || (viewedInspection as any).rating_emoji} ${viewedInspection.ratingLabel || (viewedInspection as any).rating_label}\nStatus: ${viewedInspection.status}\n\nNote: ${viewedInspection.comments}\n\nThis is a verified institutional artifact dispatch.`
        })
      });

      await new Promise(r => setTimeout(r, 1200));
      alert(`ARTIFACT DISPATCHED: Report ${viewedInspection.id} successfully routed to ${recipientEmail}.`);
    } catch (e) {
      alert("Mail Relay Failure: Check SMTP Node settings in Governance.");
    } finally {
      setIsDispatching(null);
    }
  };

  const filteredHistory = useMemo(() => {
    return pastInspections.filter(i => 
      i.school.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pastInspections, searchQuery]);

  const auditStats = useMemo(() => {
    const total = pastInspections.length;
    const critical = pastInspections.filter(i => i.status === 'Critical').length;
    const avgScore = total > 0 ? (pastInspections.reduce((acc, curr) => acc + curr.score, 0) / total).toFixed(1) : '5.0';
    return { total, critical, avgScore };
  }, [pastInspections]);

  return (
    <div className="space-y-6 md:space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700 px-1 md:px-0">
      {!sessionActive ? (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
            <div className="space-y-2">
               <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Compliance Protocol v2.6 [CONNECTED]</p>
               </div>
               <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Oversight Ledger</h2>
               <p className="text-slate-500 font-medium md:text-lg">Monitoring institutional node integrity via live audit artifacts.</p>
            </div>
            <button 
              onClick={() => setIsInitializing(true)}
              className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl md:rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95"
            >
              ➕ New Oversight Visit
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 px-4 md:px-0">
             <SummaryTile label="Total Audits" value={auditStats.total} icon="📜" />
             <SummaryTile label="Oversight Avg" value={`${auditStats.avgScore}/5`} icon="✨" color="blue" />
             <SummaryTile label="Critical Exceptions" value={auditStats.critical} icon="🚨" color="rose" className="col-span-2 md:col-span-1" />
          </div>

          <div className="px-4 md:px-0">
             <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-1">
                   <input 
                    type="text" 
                    placeholder="Search by School Node or Artifact ID..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                   />
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 text-xl">🔍</span>
                </div>
             </div>
          </div>

          <div className="px-4 md:px-0">
             <div className="hidden md:block bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                {loading && pastInspections.length === 0 ? (
                  <div className="py-32 text-center text-slate-300 uppercase text-[10px] font-black tracking-[0.3em] animate-pulse">Syncing Oversight Records...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chronology</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution Entity</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Compliance</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredHistory.map(insp => (
                        <tr key={insp.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-10 py-6 text-xs font-black text-slate-700">{insp.date}</td>
                          <td className="px-10 py-6">
                            <h4 className="text-sm font-black text-slate-900 leading-tight uppercase">{insp.school}</h4>
                            <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">Rating: {insp.ratingEmoji || (insp as any).rating_emoji} {insp.ratingLabel || (insp as any).rating_label}</p>
                          </td>
                          <td className="px-10 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              insp.status === 'Compliant' ? 'bg-emerald-50 text-emerald-600' : 
                              insp.status === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                            }`}>{insp.status}</span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button onClick={() => setViewedInspection(insp)} className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Details →</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!loading && filteredHistory.length === 0 && (
                   <div className="py-32 text-center text-slate-300 uppercase text-[10px] font-black tracking-[0.3em]">No audit history found in ledger.</div>
                )}
             </div>

             <div className="md:hidden space-y-4">
                {filteredHistory.map(insp => (
                  <div key={insp.id} onClick={() => setViewedInspection(insp)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5 cursor-pointer active:scale-[0.98] transition-all">
                     <div className="flex justify-between items-start">
                        <div>
                           <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{insp.school}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{insp.id} • {insp.date}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                          insp.status === 'Compliant' ? 'bg-emerald-50 text-emerald-600' : 
                          insp.status === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>{insp.status}</span>
                     </div>
                     <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Rating</p>
                              <p className="text-sm font-black text-slate-800">{insp.ratingEmoji || (insp as any).rating_emoji}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Anomalies</p>
                              <p className={`text-sm font-black ${insp.discrepancies > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{insp.discrepancies}</p>
                           </div>
                        </div>
                        <button className="px-4 py-2 bg-slate-50 text-[8px] font-black text-slate-500 rounded-xl uppercase tracking-widest">Verify Artifact</button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </>
      ) : (
        <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-10 duration-700 pb-20 px-2 md:px-0">
          <div className="bg-slate-900 text-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 p-8 opacity-5 text-7xl md:text-9xl font-black -rotate-12 pointer-events-none">LIVE</div>
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                     <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">Real-time Oversight Active</p>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-none uppercase">{selectedSchool}</h3>
                  <p className="text-slate-400 font-medium mt-2 md:mt-4 text-sm md:text-lg">Audit population: {auditList.length} registered personnel artifacts.</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                   <div className="text-center px-4 border-r border-white/10">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Marked</p>
                      <p className="text-xl font-black text-white">{auditList.filter(a => a.auditStatus !== 'Pending').length}</p>
                   </div>
                   <div className="text-center px-4">
                      <p className="text-[8px] font-black text-rose-400 uppercase mb-1">Discrepancies</p>
                      <p className="text-xl font-black text-rose-500">{auditList.filter(a => a.auditStatus === 'Discrepancy').length}</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm">
             <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.25em] px-2 mb-8 flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Personnel Integrity Check
             </h4>
             <div className="space-y-3 md:space-y-4">
                {auditList.map(person => (
                  <div key={person.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all ${
                    person.auditStatus === 'Verified' ? 'bg-emerald-50 border-emerald-100' : 
                    person.auditStatus === 'Discrepancy' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-4 md:gap-6 min-w-0">
                       <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden bg-white border-2 border-white shadow-sm shrink-0">
                          <img src={person.avatar} className="w-full h-full object-cover" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-sm md:text-lg font-black text-slate-900 leading-none mb-1 md:mb-2 truncate uppercase">{person.name}</p>
                          <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${
                            person.auditStatus === 'Verified' ? 'text-emerald-600' : 
                            person.auditStatus === 'Discrepancy' ? 'text-rose-600' : 'text-slate-400'
                          }`}>
                            {person.role.replace('_', ' ')} • Artifact {person.id.split('-').pop()}
                          </p>
                       </div>
                    </div>
                    <div className="flex gap-2 md:gap-3 shrink-0">
                       <button 
                        onClick={() => markAudit(person.id, 'Verified')} 
                        className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl transition-all shadow-sm active:scale-90 ${
                          person.auditStatus === 'Verified' ? 'bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-white text-slate-300 border border-slate-100 hover:text-emerald-600'
                        }`}
                       >
                         ✓
                       </button>
                       <button 
                        onClick={() => markAudit(person.id, 'Discrepancy')} 
                        className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl transition-all shadow-sm active:scale-90 ${
                          person.auditStatus === 'Discrepancy' ? 'bg-rose-600 text-white shadow-rose-500/30' : 'bg-white text-slate-300 border border-slate-100 hover:text-rose-600'
                        }`}
                       >
                         ✕
                       </button>
                    </div>
                  </div>
                ))}
             </div>
             
             <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-slate-100">
                <div className="space-y-12 mb-12">
                   <div className="space-y-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 block">Institutional Node Rating</label>
                      <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-2xl">
                         {RATING_EMOJIS.map((item, idx) => (
                           <button 
                             key={idx}
                             type="button"
                             onClick={() => setFormData({...formData, ratingIndex: idx})}
                             className={`flex flex-col items-center gap-3 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border transition-all active:scale-95 ${
                               formData.ratingIndex === idx 
                               ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/20' 
                               : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-blue-200'
                             }`}
                           >
                             <span className="text-3xl md:text-5xl">{item.emoji}</span>
                             <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-tighter text-center ${formData.ratingIndex === idx ? 'text-white' : 'text-slate-400'}`}>{item.label}</span>
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Final Summary Comments</label>
                         <textarea 
                           value={formData.comments} 
                           onChange={e => setFormData({...formData, comments: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm font-medium outline-none h-40 md:h-56 resize-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner" 
                           placeholder="Node observations regarding structural integrity, pedagogical yield, and attendance compliance..."
                         />
                      </div>
                      <div className="bg-blue-50/50 p-6 md:p-8 rounded-[2.5rem] border border-blue-100 h-fit">
                         <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] mb-4">Institutional Protocol</p>
                         <p className="text-xs text-blue-800 leading-relaxed font-medium">Committing this report will permanently bind these audit artifacts to the {selectedSchool} node in the Master Ledger. This action is immutable and logged in the immutable audit trail.</p>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                   <button onClick={() => setSessionActive(false)} className="w-full sm:flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl md:rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest">Discard Oversight Session</button>
                   <button 
                    onClick={handleFinalizeReport} 
                    disabled={isCommitting}
                    className="w-full sm:flex-[2] py-5 bg-slate-900 text-white rounded-2xl md:rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     {isCommitting ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           SYNCING...
                        </>
                     ) : 'Commit Oversight to Ledger'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* VIEW REPORT DETAILS MODAL */}
      {viewedInspection && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-2xl w-full rounded-t-[2.5rem] md:rounded-[3.5rem] shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-start shrink-0">
                 <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Report Artifact</h3>
                    <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mt-1">{viewedInspection.id} • {viewedInspection.date}</p>
                 </div>
                 <button onClick={() => setViewedInspection(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <SummaryMetric label="Artifact Score" value={`${viewedInspection.score}/5`} />
                    <SummaryMetric label="Oversight Status" value={viewedInspection.status} color={viewedInspection.status === 'Compliant' ? 'emerald' : 'rose'} />
                    <SummaryMetric label="Node Rating" value={`${viewedInspection.ratingEmoji || (viewedInspection as any).rating_emoji} ${viewedInspection.ratingLabel || (viewedInspection as any).rating_label}`} />
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Summary Note</h4>
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                       <p className="text-base font-medium text-slate-800 leading-relaxed italic">"{viewedInspection.comments}"</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <button 
                      onClick={() => handleDispatchMail('HeadOffice')}
                      disabled={isDispatching !== null}
                      className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-[1.8rem] shadow-xl active:scale-95 transition-all group"
                    >
                       <div className="text-left">
                          <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-1">Internal Relay</p>
                          <p className="text-[11px] font-black uppercase">Send to Head Office</p>
                       </div>
                       <span className="text-xl group-hover:translate-x-1 transition-transform">{isDispatching === 'HeadOffice' ? '⏳' : '📤'}</span>
                    </button>
                    <button 
                      onClick={() => handleDispatchMail('SchoolAdmin')}
                      disabled={isDispatching !== null}
                      className="w-full flex items-center justify-between p-6 bg-blue-600 text-white rounded-[1.8rem] shadow-xl active:scale-95 transition-all group"
                    >
                       <div className="text-left">
                          <p className="text-[8px] font-black uppercase tracking-widest text-blue-200 mb-1">Regional Relay</p>
                          <p className="text-[11px] font-black uppercase">Send to School Admin</p>
                       </div>
                       <span className="text-xl group-hover:translate-x-1 transition-transform">{isDispatching === 'SchoolAdmin' ? '⏳' : '📤'}</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isInitializing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-md w-full rounded-t-[3rem] md:rounded-[4rem] p-8 md:p-14 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500">
              <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-8 md:hidden"></div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Institutional Oversight</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-10">Initializing live audit handshake</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Target Educational Entity</label>
                   <div className="relative">
                      <select 
                        value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-black appearance-none cursor-pointer outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner"
                      >
                        <option value="">Choose Node...</option>
                        {schools.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none opacity-30">▼</span>
                   </div>
                </div>
                
                <div className="flex gap-3 pt-6">
                   <button onClick={() => setIsInitializing(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Cancel</button>
                   <button 
                    onClick={startInspection} 
                    disabled={!selectedSchool || loading} 
                    className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {loading ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           SYNCING GPS...
                        </>
                     ) : 'BEGIN HANDSHAKE'}
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SummaryMetric: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color = 'slate' }) => (
  <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 text-center flex flex-col justify-center">
     <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
     <p className={`text-sm md:text-lg font-black uppercase ${color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
  </div>
);

const SummaryTile: React.FC<{ label: string, value: string | number, icon: string, color?: string, className?: string }> = ({ label, value, icon, color = 'slate', className = '' }) => {
  const colors: Record<string, string> = {
    slate: 'text-slate-400 bg-slate-50',
    blue: 'text-blue-600 bg-blue-50',
    rose: 'text-rose-600 bg-rose-50',
    emerald: 'text-emerald-600 bg-emerald-50',
  };
  return (
    <div className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all ${className}`}>
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 shadow-inner ${colors[color]}`}>{icon}</div>
       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
    </div>
  );
};

export default InspectionModule;
