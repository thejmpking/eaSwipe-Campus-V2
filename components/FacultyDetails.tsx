
import React, { useState, useMemo } from 'react';
import { UserIdentity } from '../App';

interface FacultyDetailsProps {
  facultyId: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  onBack: () => void;
}

type FacultyTab = 'personal' | 'attendance' | 'growth' | 'inspections';

const FacultyDetails: React.FC<FacultyDetailsProps> = ({ facultyId, users, attendanceRecords, onBack }) => {
  const [activeTab, setActiveTab] = useState<FacultyTab>('personal');

  const systemUser = useMemo(() => users.find(u => u.id === facultyId), [facultyId, users]);

  const personalRecords = useMemo(() => {
    return attendanceRecords
      .filter(r => r.userId === facultyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [facultyId, attendanceRecords]);

  const metrics = useMemo(() => {
    const total = personalRecords.length;
    const present = personalRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const yieldPerc = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    return { total, present, yieldPerc };
  }, [personalRecords]);

  const avatarSrc = systemUser?.nfcUrl?.startsWith('data:image') 
    ? systemUser.nfcUrl 
    : `https://picsum.photos/seed/${facultyId}/100/100`;

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Artifact Context</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProfileField label="Identity" value={systemUser?.name || 'Staff Member'} icon="👤" />
                <ProfileField label="Official Email" value={systemUser?.email || 'Unlinked'} icon="📧" />
                <ProfileField label="Blood Group" value={systemUser?.bloodGroup || 'O+'} icon="🩸" />
                <ProfileField label="Tenure Artifact" value={systemUser?.experience || 'New Member'} icon="⏳" />
              </div>
              <div className="pt-6 border-t border-slate-50 space-y-8">
                 <ProfileField label="Primary Node Assignment" value={systemUser?.assignment || 'Global Root'} icon="📍" />
                 <ProfileField label="Verified Residence" value={systemUser?.address || 'Registered Residential Node'} icon="🏠" />
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500 pb-24">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl shadow-inner">📈</div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monthly Yield</p>
                    <p className="text-3xl font-black text-slate-900">{metrics.yieldPerc}%</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Verified Days</p>
                  <p className="text-2xl font-black text-slate-900 leading-none">{metrics.present}</p>
               </div>
            </div>
            <div className="space-y-3">
              {personalRecords.length > 0 ? personalRecords.map((record, i) => (
                <div key={i} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl text-emerald-600 shadow-inner">✓</div>
                    <div>
                      <p className="text-sm font-black text-slate-900 truncate leading-none mb-1.5">{new Date(record.date).toLocaleDateString()}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{record.clockIn || '--:--'} • {record.location || 'Sovereign Node'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-emerald-50 text-emerald-600">{record.status}</span>
                </div>
              )) : (
                <div className="py-20 text-center bg-slate-100/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">No Presence Artifacts Registered</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <div className="py-32 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">Synchronization Engine Active</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-4 md:-m-12">
      <div className="sticky top-0 z-[50] bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-transform">←</button>
          <div className="min-w-0 flex-1">
             <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">{facultyId}</span>
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verified Identity</span>
             </div>
             <h2 className="text-base md:text-xl font-black text-slate-900 leading-none truncate">{systemUser?.name || 'Staff Member'}</h2>
          </div>
          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-slate-100">
             <img src={avatarSrc} className="w-full h-full object-cover" alt="avatar" />
          </div>
        </div>
      </div>

      <div className="sticky top-[81px] z-[40] bg-slate-50/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/50">
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] flex gap-1 shadow-inner overflow-x-auto scrollbar-hide">
          {[
            { id: 'personal', label: 'Profile', icon: '👤' },
            { id: 'attendance', label: 'Presence', icon: '📋' },
            { id: 'growth', label: 'Growth', icon: '📈' },
            { id: 'inspections', label: 'Audit', icon: '🔍' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as FacultyTab)} className={`flex-1 flex flex-col items-center justify-center min-w-[75px] py-2.5 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}>
              <span className="text-base mb-0.5">{tab.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:p-8 max-w-4xl mx-auto">
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
      <p className="text-sm font-black text-slate-800 leading-tight break-words">{value}</p>
    </div>
  </div>
);

export default FacultyDetails;
