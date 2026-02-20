import React, { useState, useMemo } from 'react';
import { UserIdentity } from '../App';

interface StudentDetailsProps {
  studentId: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  onBack: () => void;
}

type StudentTab = 'personal' | 'attendance' | 'timetable' | 'fees';

const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId, users, attendanceRecords, onBack }) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('personal');

  // 1. RESOLVE CORE IDENTITY
  const systemUser = useMemo(() => users.find(u => u.id === studentId), [studentId, users]);

  // 2. RESOLVE REAL ATTENDANCE
  const personalRecords = useMemo(() => {
    return attendanceRecords
      .filter(r => r.userId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentId, attendanceRecords]);

  // 3. CALCULATE REAL YIELD
  const metrics = useMemo(() => {
    const total = personalRecords.length;
    const present = personalRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absent = personalRecords.filter(r => r.status === 'Absent').length;
    const yieldPerc = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    return { total, present, absent, yieldPerc };
  }, [personalRecords]);

  const avatarSrc = systemUser?.nfcUrl?.startsWith('data:image') 
    ? systemUser.nfcUrl 
    : `https://picsum.photos/seed/${studentId}/100/100`;

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <div className="flex justify-between items-center px-1">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Artifacts</h4>
                 {systemUser?.whatsapp && (
                    <a 
                      href={`https://wa.me/91${systemUser.whatsapp.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <span>💬</span> Send Message
                    </a>
                 )}
              </div>
              <div className="grid grid-cols-1 gap-8">
                <ProfileField label="Full Legal Name" value={systemUser?.name || 'Unlinked'} icon="👤" />
                <div className="grid grid-cols-2 gap-4">
                  <ProfileField label="Blood Group" value={systemUser?.bloodGroup || 'O+'} icon="🩸" />
                  <ProfileField label="Institutional Role" value={systemUser?.role?.replace('_', ' ') || 'Student'} icon="🎓" />
                </div>
                <ProfileField label="Node Assignment" value={systemUser?.assignment || 'Global Root'} icon="📍" />
                <ProfileField label="Residential Node" value={systemUser?.address || 'Registered Residential Address'} icon="🏠" />
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500 pb-24">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-3 gap-3">
               <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Yield</p>
                  <p className="text-xl font-black text-blue-600 leading-none">{metrics.yieldPerc}%</p>
               </div>
               <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Present</p>
                  <p className="text-xl font-black text-emerald-600 leading-none">{metrics.present}</p>
               </div>
               <div className="bg-rose-50 p-4 rounded-2xl text-center">
                  <p className="text-[8px] font-black text-rose-400 uppercase mb-1">Absent</p>
                  <p className="text-xl font-black text-rose-600 leading-none">{metrics.absent}</p>
               </div>
            </div>

            <div className="space-y-3">
              {personalRecords.length > 0 ? personalRecords.map((record, i) => (
                <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${record.status === 'Present' || record.status === 'Late' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {record.status === 'Present' ? '✓' : record.status === 'Late' ? '!' : '✕'}
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-900">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{record.clockIn || 'No-Entry'} • {record.location || 'Unknown Node'}</p>
                     </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${record.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{record.status}</span>
                </div>
              )) : (
                <div className="py-20 text-center bg-slate-100/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">No Presence Artifacts Logged</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'timetable':
        return <div className="py-32 text-center text-slate-400 text-[9px] font-black uppercase tracking-widest">Temporal Schedule Syncing...</div>;
      case 'fees':
        return <div className="py-32 text-center text-slate-400 text-[9px] font-black uppercase tracking-widest">Financial Ledger Encrypted</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-4 md:-m-12">
      <div className="sticky top-0 z-[50] bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-transform">←</button>
          <div className="min-w-0 flex-1">
             <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">{studentId}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{systemUser?.assignment} • Active</span>
             </div>
             <h2 className="text-base font-black text-slate-900 leading-none truncate">{systemUser?.name || 'Academic Scholar'}</h2>
          </div>
          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-slate-100">
             <img src={avatarSrc} className="w-full h-full object-cover" alt="profile" />
          </div>
        </div>
      </div>

      <div className="sticky top-[81px] z-[40] bg-slate-50/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/50">
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] flex gap-1 shadow-inner overflow-x-auto scrollbar-hide">
          {[
            { id: 'personal', label: 'Identity', icon: '👤' },
            { id: 'attendance', label: 'Presence', icon: '📋' },
            { id: 'timetable', label: 'Schedule', icon: '🗓️' },
            { id: 'fees', label: 'Fees', icon: '💳' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as StudentTab)} className={`flex-1 flex flex-col items-center justify-center min-w-[75px] py-2.5 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}>
              <span className="text-base mb-0.5">{tab.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

const ProfileField: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-5 min-w-0">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 shadow-inner">{icon}</div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
      <p className="text-sm md:text-base font-black text-slate-800 leading-tight break-words">{value}</p>
    </div>
  </div>
);

export default StudentDetails;