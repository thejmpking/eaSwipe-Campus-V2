
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';
import { UserIdentity } from '../App';

interface SchoolDetailsProps {
  schoolId: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  onBack: () => void;
  onSelectStudent?: (studentId: string) => void;
  onSelectFaculty?: (facultyId: string) => void;
  onSelectCluster?: (clusterId: string) => void;
  onSelectCampus?: (campusId: string) => void;
}

type TabType = 'overview' | 'students' | 'staff' | 'inspections';

const SchoolDetails: React.FC<SchoolDetailsProps> = ({ 
  schoolId, users, attendanceRecords, onBack, onSelectStudent, onSelectFaculty, onSelectCluster, onSelectCampus 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [allSchools, allClasses] = await Promise.all([
          dataService.getSchools(),
          dataService.getRecords('classes')
        ]);
        
        const match = allSchools.find((s: any) => s.id === schoolId);
        if (match) {
          setSchoolInfo(match);
          // Filter classes that belong to this school
          const filteredClasses = (allClasses || []).filter((c: any) => c.school === match.name);
          setSchoolClasses(filteredClasses);
        }
      } catch (err) {
        console.error("Institutional Data Fetch Error", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  // Derived real data from master registries
  const schoolStudents = useMemo(() => users.filter(u => u.assignment === schoolInfo?.name && u.role === UserRole.STUDENT), [users, schoolInfo]);
  const schoolStaff = useMemo(() => users.filter(u => u.assignment === schoolInfo?.name && u.role !== UserRole.STUDENT), [users, schoolInfo]);
  const schoolPresence = useMemo(() => attendanceRecords.filter(r => r.location === schoolInfo?.name), [attendanceRecords, schoolInfo]);

  // LIVE ATTENDANCE ANALYTICS
  const schoolAnalytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = schoolPresence.filter(r => r.date === today);
    
    const staffIds = schoolStaff.map(u => u.id);
    const studentIds = schoolStudents.map(u => u.id);

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
  }, [schoolStaff, schoolStudents, schoolPresence]);

  const availableGrades = useMemo(() => {
    if (selectedClass === 'All') return [];
    const targetClass = schoolClasses.find(c => c.name === selectedClass);
    if (!targetClass) return [];
    // Ensure grades is an array (handle stringified JSON if necessary)
    return Array.isArray(targetClass.grades) ? targetClass.grades : JSON.parse(targetClass.grades || '[]');
  }, [selectedClass, schoolClasses]);

  const filteredStudents = useMemo(() => {
    return schoolStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.toLowerCase().includes(studentSearch.toLowerCase());
      
      const isPresentToday = schoolPresence.some(r => 
        r.userId === s.id && 
        r.date === new Date().toISOString().split('T')[0] && 
        (r.status === 'Present' || r.status === 'Late')
      );
      
      const matchesStatus = studentStatusFilter === 'All' || (studentStatusFilter === 'Present' ? isPresentToday : !isPresentToday);
      
      // Match against designation which typically stores class info (e.g., "Grade 10" or "10-A")
      const matchesClass = selectedClass === 'All' || s.designation?.includes(selectedClass);
      const matchesGrade = selectedGrade === 'All' || s.designation?.includes(selectedGrade);
      
      return matchesSearch && matchesStatus && matchesClass && matchesGrade;
    });
  }, [schoolStudents, studentSearch, studentStatusFilter, selectedClass, selectedGrade, schoolPresence]);

  if (isLoading || !schoolInfo) return <div className="p-20 text-center animate-pulse">Syncing Institutional Artifact...</div>;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* 1. Primary Summary Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              <SummaryNode label="Student Count" value={schoolStudents.length.toString()} icon="🎓" />
              <SummaryNode label="Faculty Unit" value={schoolStaff.length.toString()} icon="👨‍🏫" />
              <SummaryNode label="Oversite Status" value="Healthy" icon="🛡️" />
            </div>

            {/* 2. LIVE ATTENDANCE DASHBOARD */}
            <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
               <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Presence Artifacts (Today)</h4>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Real-time Feed</span>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                  <div className="space-y-6">
                     <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-2 flex items-center gap-3">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-sm"></span>
                        Faculty Node Presence
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <AttendanceMetricNode label="Presented Staffs" value={schoolAnalytics.presentedStaff} color="emerald" />
                        <AttendanceMetricNode label="Leave Staffs" value={schoolAnalytics.leaveStaff} color="rose" />
                     </div>
                  </div>

                  <div className="space-y-6">
                     <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-2 flex items-center gap-3">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm"></span>
                        Scholar Node Presence
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <AttendanceMetricNode label="Presented Students" value={schoolAnalytics.presentedStudents} color="emerald" />
                        <AttendanceMetricNode label="Leave Students" value={schoolAnalytics.leaveStudents} color="rose" />
                     </div>
                  </div>
               </div>
            </div>

            {/* 3. Institutional Context */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Institutional Context</h4>
              <div className="space-y-4">
                <ProfileRow label="Campus" value={schoolInfo.campusName} icon="🏙️" onClick={() => onSelectCampus?.(schoolInfo.campusId)} />
                <ProfileRow label="Cluster" value={schoolInfo.clusterName} icon="📍" onClick={() => onSelectCluster?.(schoolInfo.clusterId)} />
                <ProfileRow label="Principal" value={schoolInfo.headmaster} icon="👤" />
                <ProfileRow label="Address" value={schoolInfo.address || 'No physical address registered in ledger'} icon="🏠" />
              </div>
            </div>
          </div>
        );
      case 'students':
        return (
          <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-500">
            {/* ENHANCED FILTER BAR */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
               <div className="relative">
                  <input type="text" placeholder="Search by ID or Name..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 shadow-inner" />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-lg">🔍</span>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Status</p>
                     <select value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase appearance-none cursor-pointer">
                        {['All', 'Present', 'Absent'].map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Class</p>
                     <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedGrade('All'); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase appearance-none cursor-pointer">
                        <option value="All">All Classes</option>
                        {schoolClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Grade / Section</p>
                     <select value={selectedGrade} disabled={selectedClass === 'All'} onChange={e => setSelectedGrade(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase appearance-none cursor-pointer disabled:opacity-40">
                        <option value="All">All Grades</option>
                        {availableGrades.map((g: string) => <option key={g} value={g}>{g}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStudents.map(student => {
                const isPresent = schoolPresence.some(r => 
                  r.userId === student.id && 
                  r.date === new Date().toISOString().split('T')[0] && 
                  (r.status === 'Present' || r.status === 'Late')
                );
                return (
                  <div key={student.id} onClick={() => onSelectStudent?.(student.id)} className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner border border-slate-100 shrink-0">🎓</div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-black text-slate-900 leading-none truncate mb-1">{student.name}</h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{student.id} • {student.designation || 'General'}</p>
                        </div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${isPresent ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-rose-500'} shrink-0 ml-3`}></div>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No Matching Scholars Found</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'staff':
        return (
          <div className="space-y-3 animate-in slide-in-from-bottom-6 duration-500">
             {schoolStaff.map(person => {
                const isPresent = schoolPresence.some(r => 
                  r.userId === person.id && 
                  r.date === new Date().toISOString().split('T')[0] && 
                  (r.status === 'Present' || r.status === 'Late')
                );
                return (
                  <div key={person.id} onClick={() => onSelectFaculty?.(person.id)} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 group active:scale-[0.98] transition-all cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">
                        <img src={person.nfcUrl?.startsWith('data:') ? person.nfcUrl : `https://picsum.photos/seed/${person.id}/128/128`} alt={person.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{person.role.replace('_', ' ')}</p>
                        <h5 className="text-base font-black text-slate-900 truncate leading-none mb-1.5">{person.name}</h5>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{person.designation || 'Staff'} • {person.id}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full shadow-lg ${isPresent ? 'bg-emerald-500 animate-pulse' : 'bg-rose-50'}`}></div>
                  </div>
                );
             })}
          </div>
        );
      case 'inspections':
        return (
          <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner">
             <div className="text-4xl mb-4 opacity-20">📜</div>
             <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No audit artifacts registered in current ledger cycle.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen -m-4 md:-m-12 bg-slate-50 pb-24">
      <div className="sticky top-0 z-[40] bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 md:px-12 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <button onClick={onBack} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-all">←</button>
            <div className="min-w-0">
               <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-[8px] md:text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live Oversite Node</span>
               </div>
               <h2 className="text-base md:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">{schoolInfo.name}</h2>
            </div>
          </div>
          <button className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-sm shadow-xl active:scale-95 transition-transform shrink-0">📊</button>
        </div>
      </div>

      <div className="sticky top-[81px] z-[40] bg-slate-50/80 backdrop-blur-md px-4 py-3 border-b border-slate-200/50">
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] flex gap-1 shadow-inner overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: '🏛️' },
            { id: 'students', label: 'Scholars', icon: '🎓' },
            { id: 'staff', label: 'Faculty', icon: '👨', shortLabel: 'Staff' },
            { id: 'inspections', label: 'Audit', icon: '🔍' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 flex items-center justify-center gap-2 min-w-[95px] py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl ring-1 ring-slate-100' : 'text-slate-500'}`}>
              <span className="text-base">{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-12 py-10 max-w-6xl mx-auto">{renderContent()}</div>
    </div>
  );
};

const SummaryNode: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center transition-transform hover:scale-[1.02]">
     <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mb-6 shadow-inner border border-slate-50">{icon}</div>
     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
     <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
  </div>
);

const AttendanceMetricNode: React.FC<{ label: string, value: number, color: 'emerald' | 'rose' }> = ({ label, value, color }) => (
  <div className={`p-6 rounded-[2.5rem] border transition-all hover:scale-105 ${
    color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
  }`}>
    <p className={`text-[9px] font-black uppercase mb-3 ${
      color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'
    }`}>{label}</p>
    <p className={`text-4xl font-black leading-none ${
      color === 'emerald' ? 'text-emerald-700' : 'text-rose-700'
    }`}>{value}</p>
  </div>
);

const ProfileRow: React.FC<{ label: string, value: string, icon: string, onClick?: () => void }> = ({ label, value, icon, onClick }) => (
  <div onClick={onClick} className={`flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 ${onClick ? 'cursor-pointer hover:bg-white hover:border-blue-200' : ''} transition-all`}>
     <div className="flex items-center gap-5 min-w-0">
        <span className="text-2xl opacity-60 shrink-0">{icon}</span>
        <div className="min-w-0">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
           <p className="text-sm font-black text-slate-800 leading-tight break-words uppercase tracking-tight">{value}</p>
        </div>
     </div>
     {onClick && <span className="text-slate-300 ml-4">→</span>}
  </div>
);

export default SchoolDetails;
