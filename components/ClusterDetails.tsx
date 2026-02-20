import React, { useState, useMemo } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';

interface ClusterDetailsProps {
  clusterId: string;
  clusters: any[];
  users: UserIdentity[];
  schools: any[];
  attendanceRecords: any[];
  onBack: () => void;
  onSelectSchool?: (schoolId: string) => void;
  onSelectStudent?: (studentId: string) => void;
  onSelectFaculty?: (facultyId: string) => void;
  onSelectCampus?: (campusId: string) => void;
}

type TabType = 'overview' | 'schools' | 'students' | 'staffs' | 'resourcePerson';

const ClusterDetails: React.FC<ClusterDetailsProps> = ({ clusterId, clusters, users, schools, attendanceRecords, onBack, onSelectSchool, onSelectStudent, onSelectFaculty, onSelectCampus }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Direct resolution from clusters registry
  const clusterInfo = useMemo(() => (clusters || []).find(c => c.id === clusterId), [clusterId, clusters]);
  const clusterName = clusterInfo?.name || 'Jurisdictional Node';

  const clusterSchools = useMemo(() => schools.filter(s => s.clusterId === clusterId), [clusterId, schools]);
  const clusterSchoolNames = useMemo(() => clusterSchools.map(s => s.name), [clusterSchools]);
  
  const clusterUsers = useMemo(() => users.filter(u => clusterSchoolNames.includes(u.assignment) || u.cluster === clusterName), [users, clusterSchoolNames, clusterName]);
  const clusterStudents = useMemo(() => clusterUsers.filter(u => u.role === UserRole.STUDENT), [clusterUsers]);
  const clusterStaff = useMemo(() => clusterUsers.filter(u => u.role !== UserRole.STUDENT && u.role !== UserRole.RESOURCE_PERSON), [clusterUsers]);

  // Resolve Resource Person Identity Artifacts (Support Multiple)
  const rpIdentities = useMemo(() => {
    return users.filter(u => u.role === UserRole.RESOURCE_PERSON && (u.cluster === clusterName || u.id === clusterInfo?.rpId));
  }, [clusterName, clusterInfo, users]);

  // JURISDICTIONAL ANALYTICS
  const clusterAnalytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    
    const staffIds = clusterStaff.map(u => u.id);
    const studentIds = clusterStudents.map(u => u.id);

    const presentedStaff = todayRecords.filter(r => staffIds.includes(r.userId) && (r.status === 'Present' || r.status === 'Late')).length;
    const leaveStaff = todayRecords.filter(r => staffIds.includes(r.userId) && (r.status === 'Absent' || r.status === 'On Leave')).length;

    const presentedStudents = todayRecords.filter(r => studentIds.includes(r.userId) && (r.status === 'Present' || r.status === 'Late')).length;
    const leaveStudents = todayRecords.filter(r => studentIds.includes(r.userId) && (r.status === 'Absent' || r.status === 'On Leave')).length;

    return {
      presentedStaff,
      leaveStaff,
      presentedStudents,
      leaveStudents
    };
  }, [clusterStaff, clusterStudents, attendanceRecords]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-5 duration-700 px-1 sm:px-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 px-2 md:px-0">
         <div className="flex items-center gap-4 md:gap-6">
            <button onClick={onBack} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm text-sm active:scale-90 shrink-0">←</button>
            <div className="min-w-0">
               <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <span className="text-[7px] md:text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded uppercase tracking-widest">{clusterId}</span>
                  <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Jurisdiction</span>
               </div>
               <h2 className="text-xl md:text-4xl font-black text-slate-900 tracking-tight leading-none truncate uppercase">{clusterName}</h2>
            </div>
         </div>
      </div>

      {/* ERGONOMIC TAB GRID */}
      <div className="px-2 md:px-0">
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] md:rounded-[2.5rem] grid grid-cols-2 sm:grid-cols-5 gap-2 shadow-inner max-w-4xl mx-auto">
          {[
            { id: 'overview', label: 'Summary', icon: '📍' }, 
            { id: 'schools', label: 'Entities', icon: '🏫' }, 
            { id: 'students', label: 'Scholars', icon: '🎓' }, 
            { id: 'staffs', label: 'Faculty', icon: '👨‍🏫' },
            { id: 'resourcePerson', label: 'Auditors', icon: '🕵️' }
          ].map((tab, idx) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as TabType)} 
              className={`flex items-center justify-center gap-2 md:gap-2.5 py-3 md:py-4 rounded-2xl md:rounded-[1.5rem] text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-700'
              } ${idx === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <span className="text-base md:text-xl">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mx-2 md:mx-0">
               <div className="space-y-4 md:space-y-6">
                  <h4 className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jurisdictional Context</h4>
                  <div className="space-y-3 md:space-y-4">
                     <div onClick={() => clusterInfo?.campusId && onSelectCampus?.(clusterInfo.campusId)} className="flex items-center justify-between p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                           <span className="text-xl md:text-2xl shrink-0">🏙️</span>
                           <div className="min-w-0">
                              <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Parent Campus</p>
                              <p className="text-xs md:text-sm font-black text-slate-900 group-hover:text-blue-600 uppercase truncate">{clusterInfo?.campusName || 'Unassigned Root'}</p>
                           </div>
                        </div>
                        <span className="text-slate-300 group-hover:text-blue-600 transition-colors ml-2 shrink-0">→</span>
                     </div>
                     <div onClick={() => setActiveTab('resourcePerson')} className="flex items-center justify-between p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                           <span className="text-xl md:text-2xl shrink-0">🕵️</span>
                           <div className="min-w-0">
                              <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Audit Team</p>
                              <p className="text-xs md:text-sm font-black text-slate-900 group-hover:text-blue-600 uppercase truncate">{rpIdentities.length} Registered Resource Persons</p>
                           </div>
                        </div>
                        <span className="text-slate-300 group-hover:text-blue-600 transition-colors ml-2 shrink-0">→</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-4 md:space-y-6">
                  <h4 className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Infrastructure Load</h4>
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                     <StrengthNode label="Schools" value={clusterSchools.length} icon="🏫" />
                     <StrengthNode label="Scholars" value={clusterStudents.length} icon="🎓" />
                     <StrengthNode label="Faculty" value={clusterStaff.length} icon="👨‍🏫" />
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm space-y-6 md:space-y-8 mx-2 md:mx-0">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Presence Artifacts (Today)</h4>
                  <span className="text-[7px] md:text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Handshake Active</span>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
                  <div className="space-y-3 md:space-y-4">
                     <p className="text-[9px] md:text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                        Faculty Presence
                     </p>
                     <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <AttendanceMetricMini label="Present" value={clusterAnalytics.presentedStaff} color="emerald" />
                        <AttendanceMetricMini label="Leave" value={clusterAnalytics.leaveStaff} color="rose" />
                     </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                     <p className="text-[9px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest px-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                        Scholar Presence
                     </p>
                     <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <AttendanceMetricMini label="Present" value={clusterAnalytics.presentedStudents} color="emerald" />
                        <AttendanceMetricMini label="Leave" value={clusterAnalytics.leaveStudents} color="rose" />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'schools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 px-2 md:px-0 pb-10">
             {clusterSchools.map(school => (
               <div key={school.id} onClick={() => onSelectSchool?.(school.id)} className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-xl transition-all group active:scale-[0.98]">
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-inner border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">🏫</div>
                    <div className="min-w-0">
                      <span className="text-[7px] md:text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{school.id}</span>
                      <h4 className="text-sm md:text-xl font-black text-slate-900 mt-1 md:mt-3 group-hover:text-blue-600 transition-colors uppercase truncate">{school.name}</h4>
                      <p className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest truncate">Head: {school.headmaster}</p>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-600 transition-colors text-lg md:text-xl font-black ml-2 shrink-0">→</span>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 px-2 md:px-0 pb-10">
             {clusterStudents.map(student => (
               <div key={student.id} onClick={() => onSelectStudent?.(student.id)} className="bg-white p-3 md:p-4 rounded-xl md:rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-4 cursor-pointer hover:border-blue-200 transition-all group active:scale-[0.98]">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl overflow-hidden border border-slate-100 shadow-inner shrink-0">
                     <img src={`https://picsum.photos/seed/${student.id}/64/64`} alt="std" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                     <p className="text-xs md:text-sm font-black text-slate-900 truncate leading-none mb-1 group-hover:text-blue-600 transition-colors uppercase">{student.name}</p>
                     <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{student.id} • {student.assignment}</p>
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'staffs' && (
          <div className="space-y-2 md:space-y-3 px-2 md:px-0 pb-10">
             {clusterStaff.map(person => (
               <div key={person.id} onClick={() => onSelectFaculty?.(person.id)} className="bg-white p-4 md:p-5 rounded-xl md:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 md:gap-6 cursor-pointer hover:border-blue-200 transition-all group active:scale-[0.98]">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-md shrink-0">
                     <img src={person.nfcUrl?.startsWith('data:') ? person.nfcUrl : `https://picsum.photos/seed/${person.id}/128/128`} alt="staff" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-[7px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5 md:mb-1">{person.role.replace('_', ' ')}</p>
                     <h5 className="text-sm md:text-lg font-black text-slate-900 leading-none mb-1 md:mb-1.5 truncate group-hover:text-blue-600 transition-colors uppercase">{person.name}</h5>
                     <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{person.assignment} • {person.id}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-2"></div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'resourcePerson' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 pb-10 px-2 md:px-0">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
               {rpIdentities.length > 0 ? rpIdentities.map(rp => (
                 <div key={rp.id} className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:border-blue-200 transition-all relative">
                    <div className="absolute top-0 right-0 p-6 md:p-8 opacity-[0.03] text-4xl md:text-6xl font-black -rotate-12 pointer-events-none uppercase tracking-tighter">AUDITOR</div>
                    <div className="p-6 md:p-10 flex flex-col sm:flex-row items-center gap-6 md:gap-8 relative z-10">
                       <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[2rem] bg-white border-4 border-slate-50 shadow-lg overflow-hidden shrink-0">
                          <img src={rp.nfcUrl?.startsWith('data:') ? rp.nfcUrl : `https://picsum.photos/seed/${rp.id}/256/256`} className="w-full h-full object-cover" alt="rp" />
                       </div>
                       <div className="text-center sm:text-left min-w-0 flex-1">
                          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 md:mb-4">
                             <span className="bg-blue-600 text-white px-3 py-1 rounded text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-sm">Cluster Auditor</span>
                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                          </div>
                          <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight leading-none mb-2 uppercase truncate">{rp.name}</h3>
                          <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 truncate">{rp.id}</p>
                          <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                             <button onClick={() => onSelectFaculty?.(rp.id)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-blue-600 transition-all active:scale-95">Access Artifact</button>
                          </div>
                       </div>
                    </div>
                 </div>
               )) : (
                 <div className="col-span-full bg-white p-12 md:p-20 text-center rounded-[3rem] border border-slate-100 shadow-inner">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl md:text-4xl mx-auto mb-6 shadow-inner">🕵️</div>
                    <h4 className="text-lg md:text-xl font-black text-slate-900 mb-2 uppercase">No Auditors Found</h4>
                    <p className="text-xs md:text-sm text-slate-400 font-medium max-w-sm mx-auto uppercase tracking-widest leading-relaxed">Jurisdictional Node is currently operating without designated Resource Persons in the registry.</p>
                 </div>
               )}
             </div>

             {rpIdentities.length > 0 && (
                <div className="mt-8 md:mt-12 bg-blue-50 p-6 md:p-10 rounded-[2.5rem] border border-blue-100 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-5 text-6xl md:text-8xl">⚖️</div>
                   <h4 className="text-[10px] md:text-[11px] font-black text-blue-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                      Audit Oversight Mandate
                   </h4>
                   <p className="text-[11px] md:text-xs text-blue-800 leading-relaxed font-medium max-w-3xl">
                      The cluster audit team is responsible for standardizing node integrity and verifying physical presence artifacts across all <span className="font-bold">{clusterSchools.length} registered schools</span>. Multiple auditors ensure cross-validation of high-fidelity data extraction within the <span className="font-bold text-blue-700">{clusterName}</span> region.
                   </p>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

const StrengthNode: React.FC<{ label: string, value: number, icon: string }> = ({ label, value, icon }) => (
   <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-3xl border border-slate-100 text-center transition-all hover:bg-white hover:shadow-lg group flex flex-col items-center">
      <div className="text-xl md:text-2xl mb-1 md:mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5 md:mt-2 truncate w-full">{label}</p>
   </div>
);

const AttendanceMetricMini: React.FC<{ label: string, value: number, color: 'emerald' | 'rose' }> = ({ label, value, color }) => (
  <div className={`p-4 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all ${
    color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
  }`}>
    <p className={`text-[7px] md:text-[9px] font-black uppercase mb-1 md:mb-3 leading-none ${
      color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'
    }`}>{label}</p>
    <p className={`text-xl md:text-3xl font-black leading-none ${
      color === 'emerald' ? 'text-emerald-700' : 'text-rose-700'
    }`}>{value}</p>
  </div>
);

export default ClusterDetails;