
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

type TabType = 'overview' | 'schools' | 'students' | 'staffs';

const ClusterDetails: React.FC<ClusterDetailsProps> = ({ clusterId, clusters, users, schools, attendanceRecords, onBack, onSelectSchool, onSelectStudent, onSelectFaculty, onSelectCampus }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Direct resolution from clusters registry
  const clusterInfo = useMemo(() => (clusters || []).find(c => c.id === clusterId), [clusterId, clusters]);
  const clusterName = clusterInfo?.name || 'Jurisdictional Node';

  const clusterSchools = useMemo(() => schools.filter(s => s.clusterId === clusterId), [clusterId, schools]);
  const clusterSchoolNames = useMemo(() => clusterSchools.map(s => s.name), [clusterSchools]);
  
  const clusterUsers = useMemo(() => users.filter(u => clusterSchoolNames.includes(u.assignment)), [users, clusterSchoolNames]);
  const clusterStudents = useMemo(() => clusterUsers.filter(u => u.role === UserRole.STUDENT), [clusterUsers]);
  const clusterStaff = useMemo(() => clusterUsers.filter(u => u.role !== UserRole.STUDENT), [clusterUsers]);

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
    <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
         <div className="flex items-center gap-6">
            <button onClick={onBack} className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm text-sm">←</button>
            <div>
               <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-lg uppercase tracking-widest">{clusterId}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Jurisdiction</span>
               </div>
               <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">{clusterName}</h2>
            </div>
         </div>
      </div>

      <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-[2rem] w-fit overflow-x-auto scrollbar-hide">
        {[
          { id: 'overview', label: 'Cluster Info', icon: '📍' }, 
          { id: 'schools', label: 'Institutions', icon: '🏫' }, 
          { id: 'students', label: 'Scholars', icon: '🎓' }, 
          { id: 'staffs', label: 'Faculty', icon: '👨‍🏫' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`whitespace-nowrap px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500'}`}>
            <span className="text-base">{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 1. Context Grid */}
            <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
               <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Jurisdictional Context</h4>
                  <div className="space-y-4">
                     <div onClick={() => clusterInfo?.campusId && onSelectCampus?.(clusterInfo.campusId)} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                           <span className="text-2xl">🏙️</span>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Parent Campus</p>
                              <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 uppercase">{clusterInfo?.campusName || 'Unassigned Root'}</p>
                           </div>
                        </div>
                        <span className="text-slate-300">→</span>
                     </div>
                     <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                           <span className="text-2xl">👤</span>
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Resource Person (Auditor)</p>
                              <p className="text-sm font-black text-slate-900 uppercase">{clusterInfo?.resourcePerson || 'N/A'}</p>
                           </div>
                        </div>
                        <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">{clusterInfo?.rpId}</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Strength Metrics</h4>
                  <div className="grid grid-cols-3 gap-4">
                     <StrengthNode label="Institutions" value={clusterSchools.length} icon="🏫" />
                     <StrengthNode label="Scholars" value={clusterStudents.length} icon="🎓" />
                     <StrengthNode label="Faculty" value={clusterStaff.length} icon="👨‍🏫" />
                  </div>
               </div>
            </div>

            {/* 2. Attendance Analytics Grid */}
            <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Live Presence Artifacts (Today)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  {/* Faculty Presence */}
                  <div className="space-y-4">
                     <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        Faculty Node Presence
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                           <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Presented Staffs</p>
                           <p className="text-3xl font-black text-emerald-700 leading-none">{clusterAnalytics.presentedStaff}</p>
                        </div>
                        <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                           <p className="text-[9px] font-black text-rose-600 uppercase mb-2">Leave Staffs</p>
                           <p className="text-3xl font-black text-rose-700 leading-none">{clusterAnalytics.leaveStaff}</p>
                        </div>
                     </div>
                  </div>

                  {/* Student Presence */}
                  <div className="space-y-4">
                     <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        Scholar Node Presence
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                           <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Presented Students</p>
                           <p className="text-3xl font-black text-emerald-700 leading-none">{clusterAnalytics.presentedStudents}</p>
                        </div>
                        <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                           <p className="text-[9px] font-black text-rose-600 uppercase mb-2">Leave Students</p>
                           <p className="text-3xl font-black text-rose-700 leading-none">{clusterAnalytics.leaveStudents}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* 3. Status Banner */}
            <div className="p-8 bg-blue-600 text-white rounded-[2.5rem] relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🛡️</div>
                <p className="text-[9px] font-black text-blue-100 uppercase mb-1">Status</p>
                <p className="text-2xl font-black">Live Operational Core</p>
                <p className="text-[10px] text-blue-100/60 mt-3 font-medium">Real-time synchronization established with Supabase Cloud Ledger. Visualizing jurisdictional state across {clusterSchools.length} entities.</p>
            </div>
          </div>
        )}
        {activeTab === 'schools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {clusterSchools.map(school => (
               <div key={school.id} onClick={() => onSelectSchool?.(school.id)} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-xl transition-all group active:scale-[0.98]">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">🏫</div>
                    <div>
                      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg uppercase">{school.id}</span>
                      <h4 className="text-xl font-black text-slate-900 mt-3 group-hover:text-blue-600 transition-colors">{school.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Head: {school.headmaster}</p>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-blue-600 transition-colors text-xl font-black">→</span>
               </div>
             ))}
             {clusterSchools.length === 0 && (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">No Institutions Registered to this Node</p>
                </div>
             )}
          </div>
        )}
        {activeTab === 'students' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {clusterStudents.map(student => (
               <div key={student.id} onClick={() => onSelectStudent?.(student.id)} className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-200 transition-all group">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 shadow-inner shrink-0">
                     <img src={`https://picsum.photos/seed/${student.id}/64/64`} alt="std" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                     <p className="text-sm font-black text-slate-900 truncate leading-none mb-1 group-hover:text-blue-600 transition-colors">{student.name}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{student.id} • {student.assignment}</p>
                  </div>
               </div>
             ))}
             {clusterStudents.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400 uppercase text-[9px] font-black">No Scholars found in jurisdiction records.</div>
             )}
          </div>
        )}
        {activeTab === 'staffs' && (
          <div className="space-y-3">
             {clusterStaff.map(person => (
               <div key={person.id} onClick={() => onSelectFaculty?.(person.id)} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6 cursor-pointer hover:border-blue-200 transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-md shrink-0">
                     <img src={person.nfcUrl?.startsWith('data:') ? person.nfcUrl : `https://picsum.photos/seed/${person.id}/128/128`} alt="staff" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{person.role.replace('_', ' ')}</p>
                     <h5 className="text-lg font-black text-slate-900 leading-none mb-1.5 truncate group-hover:text-blue-600 transition-colors">{person.name}</h5>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{person.assignment} • {person.id}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               </div>
             ))}
             {clusterStaff.length === 0 && (
                <div className="py-20 text-center text-slate-400 uppercase text-[9px] font-black">No Faculty found in jurisdiction records.</div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

const StrengthNode: React.FC<{ label: string, value: number, icon: string }> = ({ label, value, icon }) => (
   <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center transition-all hover:bg-white hover:shadow-lg group">
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
   </div>
);

export default ClusterDetails;
