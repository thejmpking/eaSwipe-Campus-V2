
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

  const schoolStudents = useMemo(() => users.filter(u => u.assignment === schoolInfo?.name && u.role === UserRole.STUDENT), [users, schoolInfo]);
  const schoolStaff = useMemo(() => users.filter(u => u.assignment === schoolInfo?.name && u.role !== UserRole.STUDENT), [users, schoolInfo]);
  const schoolPresence = useMemo(() => attendanceRecords.filter(r => r.location === schoolInfo?.name), [attendanceRecords, schoolInfo]);

  // DYNAMIC ADMIN RESOLUTION: Find the actual user assigned as School Admin
  const resolvedAdminName = useMemo(() => {
    if (!schoolInfo) return '...';
    const adminUser = users.find(u => 
      u.role === UserRole.SCHOOL_ADMIN && 
      (u.assignment === schoolInfo.name || u.school === schoolInfo.name)
    );
    return adminUser ? adminUser.name : (schoolInfo.headmaster || 'Not Assigned');
  }, [users, schoolInfo]);

  const schoolAnalytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = schoolPresence.filter(r => r.date === today);
    
    const staffIds = schoolStaff.map(u => u.id);
    const studentIds = schoolStudents.map(u => u.id);

    const presentedStaff = todayRecords.filter(r => staffIds.includes(r.userId) && (r.status === 'Present' || r.status === 'Late')).length;
    const leaveStaff = todayRecords.filter(r => staffIds.includes(r.userId) && (r.status === 'Absent' || r.status === 'On Leave')).length;

    const presentedStudents = todayRecords.filter(r => studentIds.includes(r.userId) && (r.status === 'Present' || r.status === 'Late')).length;
    const leaveStudents = todayRecords.filter(r => studentIds.includes(r.userId) && (r.status === 'Absent' || r.status === 'On Leave')).length;

    return { presentedStaff, leaveStaff, presentedStudents, leaveStudents };
  }, [schoolStaff, schoolStudents, schoolPresence]);

  const availableGrades = useMemo(() => {
    if (selectedClass === 'All') return [];
    const targetClass = schoolClasses.find(c => c.name === selectedClass);
    if (!targetClass) return [];
    return Array.isArray(targetClass.grades) ? targetClass.grades : JSON.parse(targetClass.grades || '[]');
  }, [selectedClass, schoolClasses]);

  const filteredStudents = useMemo(() => {
    return schoolStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.id.toLowerCase().includes(studentSearch.toLowerCase());
      const isPresentToday = schoolPresence.some(r => r.userId === s.id && r.date === new Date().toISOString().split('T')[0] && (r.status === 'Present' || r.status === 'Late'));
      const matchesStatus = studentStatusFilter === 'All' || (studentStatusFilter === 'Present' ? isPresentToday : !isPresentToday);
      const matchesClass = selectedClass === 'All' || s.designation?.includes(selectedClass);
      const matchesGrade = selectedGrade === 'All' || s.designation?.includes(selectedGrade);
      return matchesSearch && matchesStatus && matchesClass && matchesGrade;
    });
  }, [schoolStudents, studentSearch, studentStatusFilter, selectedClass, selectedGrade, schoolPresence]);

  if (isLoading || !schoolInfo) return <div className="flex items-center justify-center p-20 animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Institutional Artifact...</div>;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
            {/* Global Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 px-1">
              <SummaryNode label="Students" value={schoolStudents.length.toString()} icon="🎓" />
              <SummaryNode label="Faculty" value={schoolStaff.length.toString()} icon="👨‍🏫" />
              <div className="hidden md:flex"><SummaryNode label="Status" value="Healthy" icon="🛡️" /></div>
            </div>

            {/* Attendance Analytics Card */}
            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Presence Artifacts (Today)</h4>
                  <span className="text-[8px] md:text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Real-time</span>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
                  {/* Faculty Column */}
                  <div className="space-y-4 md:space-y-6">
                     <p className="text-[10px] md:text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                        Faculty Presence
                     </p>
                     <div className="grid grid-cols-2 gap-3">
                        <AttendanceMetricNode label="Present" value={schoolAnalytics.presentedStaff} color="emerald" />
                        <AttendanceMetricNode label="Leave" value={schoolAnalytics.leaveStaff} color="rose" />
                     </div>
                  </div>

                  {/* Student Column */}
                  <div className="space-y-4 md:space-y-6">
                     <p className="text-[10px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest px-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                        Scholar Presence
                     </p>
                     <div className="grid grid-cols-2 gap-3">
                        <AttendanceMetricNode label="Present" value={schoolAnalytics.presentedStudents} color="emerald" />
                        <AttendanceMetricNode label="Leave" value={schoolAnalytics.leaveStudents} color="rose" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Jurisdiction Details */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-2">Institutional Context</h4>
              <div className="space-y-2 md:space-y-3">
                <ProfileRow label="Campus" value={schoolInfo.campusName} icon="🏙️" onClick={() => onSelectCampus?.(schoolInfo.campusId)} />
                <ProfileRow label="Cluster" value={schoolInfo.clusterName} icon="📍" onClick={() => onSelectCluster?.(schoolInfo.clusterId)} />
                <ProfileRow label="School Admin" value={resolvedAdminName} icon="👤" />
                <ProfileRow label="Address" value={schoolInfo.address || 'No physical address in ledger'} icon="🏠" />
              </div>
            </div>
          </div>
        );
      case 'students':
        return (
          <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-500 pb-10">
            <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
               <div className="relative">
                  <input type="text" placeholder="Search ID or Name..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 shadow-inner" />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-20 text-base">🔍</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase appearance-none cursor-pointer">
                    {['All Status', 'Present', 'Absent'].map(s => <option key={s} value={s.includes('All') ? 'All' : s}>{s}</option>)}
                  </select>
                  <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedGrade('All'); }} className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase appearance-none cursor-pointer">
                    <option value="All">All Classes</option>
                    {schoolClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={selectedGrade} disabled={selectedClass === 'All'} onChange={e => setSelectedGrade(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase appearance-none cursor-pointer disabled:opacity-30">
                    <option value="All">All Grades</option>
                    {availableGrades.map((g: string) => <option key={g} value={g}>{g}</option>)}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStudents.map(student => {
                const isPresent = schoolPresence.some(r => r.userId === student.id && r.date === new Date().toISOString().split('T')[0] && (r.status === 'Present' || r.status === 'Late'));
                return (
                  <div key={student.id} onClick={() => onSelectStudent?.(student.id)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer">
                    <div className="flex items-center gap-3 min-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg shadow-inner border border-slate-100 shrink-0">🎓</div>
                        <div className="min-w-0">
                          <h5 className="text-[13px] font-black text-slate-900 leading-none truncate mb-1 uppercase">{student.name}</h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{student.id} • {student.designation || 'General'}</p>
                        </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isPresent ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-rose-500'} shrink-0 ml-2`}></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'staff':
        return (
          <div className="space-y-3 animate-in slide-in-from-bottom-6 duration-500 pb-10">
             {schoolStaff.map(person => {
                const isPresent = schoolPresence.some(r => r.userId === person.id && r.date === new Date().toISOString().split('T')[0] && (r.status === 'Present' || r.status === 'Late'));
                return (
                  <div key={person.id} onClick={() => onSelectFaculty?.(person.id)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">
                        <img src={person.nfcUrl?.startsWith('data:') ? person.nfcUrl : `https://picsum.photos/seed/${person.id}/128/128`} alt={person.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{person.role.replace('_', ' ')}</p>
                        <h5 className="text-sm font-black text-slate-900 truncate leading-none mb-1 uppercase">{person.name}</h5>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{person.designation || 'Staff'} • {person.id}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full shadow-lg ${isPresent ? 'bg-emerald-500 animate-pulse' : 'bg-rose-50'}`}></div>
                  </div>
                );
             })}
          </div>
        );
      case 'inspections':
        return (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-inner px-6">
             <div className="text-4xl mb-4 opacity-10">📜</div>
             <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] leading-relaxed">No audit artifacts registered in current ledger cycle.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen -m-4 md:-m-12 bg-slate-50 pb-20">
      {/* Optimized Compact Header */}
      <div className="sticky top-0 z-[50] bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 md:px-12 py-3 md:py-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <button onClick={onBack} className="w-9 h-9 md:w-12 md:h-12 bg-slate-50 rounded-lg md:rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-all shrink-0">←</button>
            <div className="min-w-0">
               <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[7px] md:text-[9px] font-black text-emerald-600 uppercase tracking-widest">Oversite Node</span>
               </div>
               <h2 className="text-[9px] md:text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-none truncate max-w-[180px] sm:max-w-[280px] md:max-w-md uppercase">{schoolInfo.name}</h2>
            </div>
          </div>
          <button className="w-9 h-9 md:w-12 md:h-12 bg-slate-900 text-white rounded-lg md:rounded-xl flex items-center justify-center text-xs shadow-xl active:scale-95 transition-transform shrink-0">📊</button>
        </div>
      </div>

      {/* Ergonomic Double Row Tab Grid */}
      <div className="sticky top-[58px] md:top-[81px] z-[40] bg-slate-50/90 backdrop-blur-md px-4 py-3 md:py-4 border-b border-slate-200/50">
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] md:rounded-[2.5rem] grid grid-cols-2 gap-2 shadow-inner max-w-2xl mx-auto">
          {[
            { id: 'overview', label: 'Summary', icon: '🏛️' },
            { id: 'students', label: 'Scholars', icon: '🎓' },
            { id: 'staff', label: 'Faculty', icon: '👨‍🏫' },
            { id: 'inspections', label: 'Audit', icon: '🔍' },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as TabType)} 
              className={`flex items-center justify-center gap-3 py-3 md:py-4 rounded-2xl md:rounded-[1.5rem] text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-[1.02]' : 'text-slate-500'
              }`}
            >
              <span className="text-base md:text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-12 py-6 md:py-10 max-w-6xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

const SummaryNode: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
  <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group">
     <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center text-xl md:text-3xl mb-3 md:mb-6 shadow-inner group-hover:scale-110 transition-transform">{icon}</div>
     <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className="text-lg md:text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
  </div>
);

const AttendanceMetricNode: React.FC<{ label: string, value: number, color: 'emerald' | 'rose' }> = ({ label, value, color }) => (
  <div className={`p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border transition-all ${
    color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
  }`}>
    <p className={`text-[8px] md:text-[9px] font-black uppercase mb-1 md:mb-3 ${
      color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'
    }`}>{label}</p>
    <p className={`text-xl md:text-4xl font-black leading-none ${
      color === 'emerald' ? 'text-emerald-700' : 'text-rose-700'
    }`}>{value}</p>
  </div>
);

const ProfileRow: React.FC<{ label: string, value: string, icon: string, onClick?: () => void }> = ({ label, value, icon, onClick }) => (
  <div onClick={onClick} className={`flex items-center justify-between p-3.5 md:p-4 bg-slate-50/50 rounded-xl md:rounded-2xl border border-slate-100 ${onClick ? 'cursor-pointer hover:bg-white hover:border-blue-200' : ''} transition-all`}>
     <div className="flex items-center gap-3 md:gap-5 min-w-0">
        <span className="text-lg md:text-xl opacity-60 shrink-0">{icon}</span>
        <div className="min-w-0">
           <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">{label}</p>
           <p className="text-[11px] md:text-sm font-black text-slate-800 leading-tight truncate uppercase tracking-tight">{value}</p>
        </div>
     </div>
     {onClick && <span className="text-slate-300 ml-2">→</span>}
  </div>
);

export default SchoolDetails;
