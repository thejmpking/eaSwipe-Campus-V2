
import React, { useState, useMemo } from 'react';
import { UserRole } from '../types';

interface InspectionModuleProps {
  userRole: string;
  schools?: any[];
  users?: any[];
}

interface AuditItem {
  id: string;
  name: string;
  role: string;
  dailyStatus: string;
  auditStatus: 'Pending' | 'Verified' | 'Discrepancy';
  avatar: string;
}

interface PastInspection {
  id: string;
  school: string;
  date: string;
  inspector: string;
  score: number;
  discrepancies: number;
  status: 'Compliant' | 'Warning' | 'Critical';
  metrics: { hygiene: number; pedagogy: number; infrastructure: number; };
  comments: string;
}

const InspectionModule: React.FC<InspectionModuleProps> = ({ userRole, schools = [], users = [] }) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [pastInspections, setPastInspections] = useState<PastInspection[]>([]);
  const [auditList, setAuditList] = useState<AuditItem[]>([]);
  
  const [formData, setFormData] = useState({
    school: '',
    date: new Date().toISOString().split('T')[0],
    cleanliness: 4,
    teachingQuality: 5,
    facilities: 3,
    comments: ''
  });

  const startInspection = () => {
    if (!selectedSchool) return;
    setLoading(true);
    // Resolve audit list for selected school
    const schoolStaff = users.filter(u => u.assignment === selectedSchool).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        dailyStatus: 'Active',
        auditStatus: 'Pending' as const,
        avatar: u.nfcUrl?.startsWith('data:') ? u.nfcUrl : `https://picsum.photos/seed/${u.id}/64/64`
    }));
    
    setTimeout(() => {
      setAuditList(schoolStaff);
      setFormData(prev => ({ ...prev, school: selectedSchool }));
      setSessionActive(true);
      setLoading(false);
    }, 1500);
  };

  const markAudit = (id: string, status: 'Verified' | 'Discrepancy') => {
    setAuditList(prev => prev.map(item => item.id === id ? { ...item, auditStatus: status } : item));
  };

  const handleFinalizeReport = async () => {
    const avgScore = (formData.cleanliness + formData.teachingQuality + formData.facilities) / 3;
    const discrepancies = auditList.filter(a => a.auditStatus === 'Discrepancy').length;

    const newReport: PastInspection = {
      id: `INSP-${Math.floor(Math.random() * 9000 + 1000)}`,
      school: selectedSchool,
      date: new Date().toISOString().split('T')[0],
      inspector: 'Administrative Authority',
      score: Number(avgScore.toFixed(1)),
      discrepancies,
      status: discrepancies > 2 ? 'Critical' : discrepancies > 0 ? 'Warning' : 'Compliant',
      metrics: { hygiene: formData.cleanliness, pedagogy: formData.teachingQuality, infrastructure: formData.facilities },
      comments: formData.comments
    };

    setPastInspections(prev => [newReport, ...prev]);
    setSessionActive(false);
    setIsInitializing(false);
    alert("Audit Artifact Committed to Registry.");
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700">
      {!sessionActive ? (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Inspection Reports</h2>
              <p className="text-slate-500 font-medium">Monitoring regional compliance through live audit artifacts.</p>
            </div>
            <button 
              onClick={() => setIsInitializing(true)}
              className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              ➕ New Inspection
            </button>
          </div>

          <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
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
                {pastInspections.map(insp => (
                  <tr key={insp.id} className="hover:bg-slate-50/50">
                    <td className="px-10 py-6 text-xs font-black text-slate-700">{insp.date}</td>
                    <td className="px-10 py-6">
                       <h4 className="text-sm font-black text-slate-900 leading-tight">{insp.school}</h4>
                       <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">ID: {insp.id}</p>
                    </td>
                    <td className="px-10 py-6 text-center">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                         insp.status === 'Compliant' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                       }`}>{insp.status}</span>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <button className="text-[10px] font-black text-blue-600 uppercase">View Artifact →</button>
                    </td>
                  </tr>
                ))}
                {pastInspections.length === 0 && (
                  <tr><td colSpan={4} className="py-24 text-center text-slate-400 uppercase text-[10px] font-black">No audit history found in ledger.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Active Audit Session UI */
        <div className="space-y-10">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
             <h3 className="text-xl font-black mb-8">Auditing: {selectedSchool}</h3>
             <div className="space-y-6">
                {auditList.map(person => (
                  <div key={person.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200">
                          <img src={person.avatar} className="w-full h-full object-cover" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-800">{person.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">{person.role}</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => markAudit(person.id, 'Verified')} className={`w-10 h-10 rounded-xl flex items-center justify-center ${person.auditStatus === 'Verified' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>✓</button>
                       <button onClick={() => markAudit(person.id, 'Discrepancy')} className={`w-10 h-10 rounded-xl flex items-center justify-center ${person.auditStatus === 'Discrepancy' ? 'bg-rose-600 text-white' : 'bg-white'}`}>✕</button>
                    </div>
                  </div>
                ))}
             </div>
             <button onClick={handleFinalizeReport} className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Commit Report</button>
          </div>
        </div>
      )}

      {isInitializing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-md w-full rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-2xl font-black mb-6">Select Target Node</h3>
              <select 
                value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-sm font-bold appearance-none"
              >
                <option value="">Choose School...</option>
                {schools.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <div className="flex gap-3">
                 <button onClick={() => setIsInitializing(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black text-[10px] uppercase">Discard</button>
                 <button onClick={startInspection} disabled={!selectedSchool || loading} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-500/20">
                   {loading ? 'GPS Handshake...' : 'Begin Oversight'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default InspectionModule;
