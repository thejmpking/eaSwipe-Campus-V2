
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserRole, Shift, ShiftAssignment } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface AttendanceModuleProps {
  userRole: UserRole;
  currentUserAssignment?: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  onSyncRegistry: () => void;
  onSelectUser?: (id: string) => void;
}

const SearchableSelect = ({ label, value, options, onChange, placeholder, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o: any) => 
    o.l.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((o: any) => o.v === value);

  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-50' : ''}`} ref={wrapperRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold text-left flex justify-between items-center transition-all hover:bg-white hover:border-blue-200"
        >
          <span className={selectedOption && selectedOption.v !== 'All' ? 'text-slate-900' : 'text-slate-400'}>
            {selectedOption && selectedOption.v !== 'All' ? selectedOption.l : placeholder}
          </span>
          <span className="text-[8px] opacity-40">▼</span>
        </button>

        {isOpen && (
          <div className="absolute z-[150] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-slate-50">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs outline-none border border-slate-100 focus:border-blue-300 font-medium"
              />
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => { onChange('All'); setIsOpen(false); }}
                className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-slate-50 text-slate-400 italic"
              >
                Clear Selection
              </button>
              {filteredOptions.map((opt: any) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => { onChange(opt.v); setIsOpen(false); setSearch(''); }}
                  className={`w-full text-left px-4 py-3 text-xs font-medium transition-colors hover:bg-blue-50 ${value === opt.v ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                >
                  {opt.l}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-4 py-6 text-center text-[10px] font-medium text-slate-400 uppercase">No results</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AttendanceModule: React.FC<AttendanceModuleProps> = ({ 
  userRole, currentUserAssignment, users, attendanceRecords, onSyncRegistry, onSelectUser 
}) => {
  const isTeacher = userRole === UserRole.TEACHER;
  const isSchoolAdmin = userRole === UserRole.SCHOOL_ADMIN;
  const isRestrictedView = isTeacher || isSchoolAdmin;

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(isRestrictedView ? UserRole.TEACHER : 'ADMINS');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showOptions, setShowOptions] = useState(false);
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<{record: any, user: UserIdentity} | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Hierarchy Filters
  const [campusFilter, setCampusFilter] = useState('All');
  const [clusterFilter, setClusterFilter] = useState('All');
  const [schoolFilter, setSchoolFilter] = useState('All');
  const [adminSubRole, setAdminSubRole] = useState('All');
  
  // Student Specific Filters
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');

  // Structural Data State
  const [campuses, setCampuses] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);

  // Local state for optimistic UI updates
  const [ledgerRows, setLedgerRows] = useState<any[]>(attendanceRecords);

  useEffect(() => {
    setLedgerRows(attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    const fetchStructure = async () => {
      try {
        const [dbCampuses, dbClusters, dbSchools, dbShifts, dbShiftAssigns, dbClasses] = await Promise.all([
          dataService.getCampuses(),
          dataService.getClusters(),
          dataService.getSchools(),
          dataService.getRecords('shifts'),
          dataService.getRecords('shift_assignments'),
          dataService.getRecords('classes')
        ]);
        setCampuses(dbCampuses || []);
        setClusters(dbClusters || []);
        setSchools(dbSchools || []);
        setShifts(dbShifts || []);
        setShiftAssignments(dbShiftAssigns || []);
        
        if (isRestrictedView) {
          setSchoolClasses((dbClasses || []).filter((c: any) => c.school === currentUserAssignment));
        } else {
          setSchoolClasses(dbClasses || []);
        }
      } catch (err) { console.error("Structure Sync Error", err); }
    };
    fetchStructure();
  }, [userRole, currentUserAssignment, isRestrictedView]);

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

  const [editForm, setEditForm] = useState({
    clockIn: '', clockOut: '', status: '', location: ''
  });

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = [2024, 2025, 2026];
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // JURISDICTIONAL LOCK RESOLVER
  const activeJurisdictionCluster = useMemo(() => {
    if (userRole !== UserRole.RESOURCE_PERSON) return null;
    const isDirectCluster = (clusters || []).some(c => c.name === currentUserAssignment || c.id === currentUserAssignment);
    if (isDirectCluster) return currentUserAssignment;
    const assignedSchool = (schools || []).find(s => s.name === currentUserAssignment || s.id === currentUserAssignment);
    if (assignedSchool) return assignedSchool.clusterName;
    return currentUserAssignment;
  }, [userRole, currentUserAssignment, clusters, schools]);

  const jurisdictionalUsers = useMemo(() => {
    return users.filter(u => {
      if (isTeacher || isSchoolAdmin) {
        return u.assignment === currentUserAssignment || u.school === currentUserAssignment;
      }
      if (userRole === UserRole.RESOURCE_PERSON && (u.role === UserRole.TEACHER || u.role === UserRole.STUDENT)) {
        const userSchoolObj = (schools || []).find(s => s.name === u.school || s.name === u.assignment);
        const matchesCluster = u.cluster === activeJurisdictionCluster || userSchoolObj?.clusterName === activeJurisdictionCluster;
        if (!matchesCluster) return false;
      }
      return true;
    });
  }, [users, userRole, isTeacher, isSchoolAdmin, currentUserAssignment, activeJurisdictionCluster, schools]);

  const filteredUsers = useMemo(() => {
    return jurisdictionalUsers.filter(u => {
      let matchesTab = false;
      if (roleFilter === 'ADMINS') {
        matchesTab = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN].includes(u.role);
      } else if (roleFilter === UserRole.TEACHER && isSchoolAdmin) {
        matchesTab = u.role === UserRole.TEACHER || u.role === UserRole.SCHOOL_ADMIN;
      } else {
        matchesTab = u.role === roleFilter;
      }
      if (!matchesTab) return false;

      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (roleFilter === UserRole.STUDENT) {
        if (selectedClass !== 'All' && !u.designation?.includes(selectedClass)) return false;
        if (selectedGrade !== 'All' && !u.designation?.includes(selectedGrade)) return false;
      }

      if (roleFilter === 'ADMINS') {
        if (adminSubRole === 'SUPER_ADMIN' && u.role !== UserRole.SUPER_ADMIN) return false;
        if (adminSubRole === 'ADMIN' && u.role !== UserRole.ADMIN) return false;
        if (adminSubRole === 'SCHOOL_ADMIN' && u.role !== UserRole.SCHOOL_ADMIN) return false;
      }

      if (!isRestrictedView) {
        if (campusFilter !== 'All') {
          const userSchool = schools.find(s => s.name === u.school);
          const userCluster = clusters.find(c => c.name === u.cluster);
          const campusMatch = (userSchool?.campusId === campusFilter || userCluster?.campusId === campusFilter || u.assignment.includes(campusFilter));
          if (!campusMatch) return false;
        }
        if (clusterFilter !== 'All' && u.cluster !== clusterFilter) return false;
        if (schoolFilter !== 'All' && u.school !== schoolFilter) return false;
      }

      return true;
    });
  }, [jurisdictionalUsers, searchQuery, roleFilter, campusFilter, clusterFilter, schoolFilter, adminSubRole, isRestrictedView, isSchoolAdmin, schools, clusters, selectedClass, selectedGrade]);

  const availableGrades = useMemo(() => {
    if (selectedClass === 'All') return [];
    const targetClass = schoolClasses.find(c => c.name === selectedClass);
    if (!targetClass) return [];
    return Array.isArray(targetClass.grades) ? targetClass.grades : JSON.parse(targetClass.grades || '[]');
  }, [selectedClass, schoolClasses]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, any> = {};
    ledgerRows.forEach(r => {
      const dp = r.date?.split('-') || [];
      if (dp.length === 3 && parseInt(dp[1]) === selectedMonth + 1 && parseInt(dp[0]) === selectedYear) {
        map[`${r.userId}-${parseInt(dp[2])}`] = r;
      }
    });
    return map;
  }, [ledgerRows, selectedMonth, selectedYear]);

  const activeShift = useMemo(() => {
    if (!selectedArtifact) return null;
    const targetDate = selectedArtifact.record.date;
    const targetId = selectedArtifact.user.id;
    
    const assign = shiftAssignments.find(a => 
      a.targetId === targetId && 
      a.targetType === 'Individual' &&
      (targetDate === a.assignedDate || (targetDate >= a.startDate && targetDate <= a.endDate))
    );
    
    if (assign) return shifts.find(s => s.id === assign.shiftId);
    
    const userClass = selectedArtifact.user.designation; 
    if (userClass) {
      const classAssign = shiftAssignments.find(a => 
        a.targetType === 'Class' &&
        userClass.includes(a.targetName) &&
        (targetDate >= a.startDate && targetDate <= a.endDate)
      );
      if (classAssign) return shifts.find(s => s.id === classAssign.shiftId);
    }
    return null;
  }, [selectedArtifact, shifts, shiftAssignments]);

  const handleOpenArtifact = (record: any, user: UserIdentity) => {
    setSelectedArtifact({ record, user });
    setIsEditing(false);
    setEditForm({
      clockIn: record.clockIn || '',
      clockOut: record.clockOut || '',
      status: record.status || 'Present',
      location: record.location || user.assignment
    });
  };

  const handleOpenBlankArtifact = (user: UserIdentity, day: number) => {
    if (isTeacher) return;
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const skeletonRecord = {
      userId: user.id,
      userName: user.name,
      date: dateStr,
      status: 'Present',
      clockIn: '08:00',
      clockOut: '16:00',
      location: user.school || user.assignment || 'Manual Entry',
      method: 'Manual'
    };
    setSelectedArtifact({ record: skeletonRecord, user });
    setIsEditing(true); 
    setEditForm({
      clockIn: '08:00',
      clockOut: '16:00',
      status: 'Present',
      location: user.school || user.assignment || 'Manual Entry'
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedArtifact || isProcessing || isTeacher) return;
    setIsProcessing(true);
    const isNew = !selectedArtifact.record.id;
    const updated = {
      ...selectedArtifact.record,
      id: isNew ? Date.now() : selectedArtifact.record.id,
      clockIn: editForm.clockIn,
      clockOut: editForm.clockOut,
      status: editForm.status,
      location: editForm.location,
      method: isNew ? 'Manual' : selectedArtifact.record.method
    };
    const res = await dataService.syncRecord('attendance', updated);
    if (res.status === 'success') {
      onSyncRegistry();
      setSelectedArtifact(null);
    }
    setIsProcessing(false);
  };

  const executePurge = async () => {
    if (isProcessing || !selectedArtifact || isTeacher) return;
    const recordId = selectedArtifact.record.id;
    const originalRows = [...ledgerRows];
    setIsProcessing(true);
    try {
      setLedgerRows(prev => prev.filter(r => String(r.id) !== String(recordId)));
      const res = await dataService.deleteRecord('attendance', recordId);
      if (res && res.status === 'success') {
        setShowDeleteConfirm(false);
        setSelectedArtifact(null);
        onSyncRegistry();
      } else {
        setLedgerRows(originalRows);
      }
    } catch (err) {
      setLedgerRows(originalRows);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    setShowOptions(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const renderFilters = () => {
    return (
      <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 ${!showFiltersOnMobile ? 'hidden md:block' : 'block animate-in slide-in-from-top-4'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identity Search</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Name or ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-30">🔍</span>
            </div>
          </div>

          {!isRestrictedView && roleFilter === 'ADMINS' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Authority Type</label>
                <div className="relative">
                  <select value={adminSubRole} onChange={e => { setAdminSubRole(e.target.value); setSchoolFilter('All'); setCampusFilter('All'); }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer">
                    <option value="All">All Admins</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Campus Admin</option>
                    <option value="SCHOOL_ADMIN">School Admin</option>
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                </div>
              </div>
              {adminSubRole === 'SCHOOL_ADMIN' && (
                <SearchableSelect 
                  label="Filter by School" 
                  value={schoolFilter} 
                  placeholder="Select School..."
                  options={schools.map(s => ({v: s.name, l: s.name}))}
                  onChange={setSchoolFilter}
                />
              )}
              {adminSubRole === 'ADMIN' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter by Campus</label>
                  <div className="relative">
                    <select value={campusFilter} onChange={e => setCampusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer">
                      <option value="All">All Campuses</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                  </div>
                </div>
              )}
            </>
          )}

          {!isRestrictedView && roleFilter === UserRole.RESOURCE_PERSON && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campus</label>
                <div className="relative">
                  <select value={campusFilter} onChange={e => { setCampusFilter(e.target.value); setClusterFilter('All'); }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer">
                    <option value="All">All Campuses</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cluster</label>
                <div className="relative">
                  <select value={clusterFilter} onChange={e => setClusterFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer">
                    <option value="All">All Clusters</option>
                    {clusters.filter(c => campusFilter === 'All' || c.campusId === campusFilter).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                </div>
              </div>
            </>
          )}

          {(roleFilter === UserRole.TEACHER || roleFilter === UserRole.STUDENT) && (
            <>
              {!isRestrictedView && userRole !== UserRole.RESOURCE_PERSON && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campus</label>
                  <div className="relative">
                    <select value={campusFilter} onChange={e => { setCampusFilter(e.target.value); setClusterFilter('All'); setSchoolFilter('All'); }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer">
                      <option value="All">All Campuses</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                  </div>
                </div>
              )}
              {!isRestrictedView && userRole !== UserRole.RESOURCE_PERSON && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cluster</label>
                  <div className="relative">
                    <select value={clusterFilter} onChange={e => setClusterFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer">
                      <option value="All">All Clusters</option>
                      {clusters.filter(c => campusFilter === 'All' || c.campusId === campusFilter).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                  </div>
                </div>
              )}
              {!isRestrictedView && (
                <SearchableSelect 
                  label="School" 
                  value={schoolFilter} 
                  placeholder="Search Schools..."
                  options={schools
                    .filter(s => {
                      const matchesRP = userRole !== UserRole.RESOURCE_PERSON || s.clusterName === activeJurisdictionCluster;
                      const matchesGlobal = (clusterFilter === 'All' || s.clusterName === clusterFilter) && (campusFilter === 'All' || s.campusId === campusFilter);
                      return matchesRP && matchesGlobal;
                    })
                    .map(s => ({v: s.name, l: s.name}))}
                  onChange={setSchoolFilter}
                />
              )}

              {roleFilter === UserRole.STUDENT && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Class</label>
                    <div className="relative">
                      <select 
                        value={selectedClass} 
                        onChange={e => { setSelectedClass(e.target.value); setSelectedGrade('All'); }} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer"
                      >
                        <option value="All">All Classes</option>
                        {schoolClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grade Binding</label>
                    <div className="relative">
                      <select 
                        value={selectedGrade} 
                        disabled={selectedClass === 'All'}
                        onChange={e => setSelectedGrade(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold appearance-none cursor-pointer disabled:opacity-40"
                      >
                        <option value="All">All Grades</option>
                        {availableGrades.map((g: string) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-500 px-1 sm:px-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">Presence Ledger</h2>
          <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em]">Institutional Master Registry</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto no-print">
          <button 
             type="button"
             onClick={() => setShowFiltersOnMobile(!showFiltersOnMobile)} 
             className={`md:hidden flex-1 px-4 py-4 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showFiltersOnMobile ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}
           >
              <span>{showFiltersOnMobile ? '✕ Close' : '🔍 Filters'}</span>
          </button>
          
          <div className="relative flex-1 sm:flex-none">
            <button type="button" onClick={() => setShowOptions(!showOptions)} className="w-full h-14 bg-slate-900 text-white px-4 md:px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
              <span>Options</span>
              <span className={`transition-transform text-[8px] ${showOptions ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showOptions && (
              <div className="absolute right-0 top-full mt-3 w-48 md:w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in zoom-in-95">
                <button type="button" onClick={handlePrint} className="w-full text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase hover:bg-slate-50 border-b">📄 Export PDF</button>
                <button type="button" className="w-full text-left px-6 py-4 text-[10px] font-black text-slate-600 uppercase hover:bg-slate-50 border-b">📊 Export CSV</button>
                <button type="button" onClick={() => { setShowOptions(false); onSyncRegistry(); }} className="w-full text-left px-6 py-4 text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50">🔄 Force Sync</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-0 no-print">
        <div className={`grid ${isRestrictedView ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2 bg-slate-200/50 p-1.5 rounded-[1.8rem] md:rounded-[3rem] w-full max-w-2xl mx-auto shadow-inner`}>
           {!isRestrictedView && (
             <>
               <TabItem 
                 label="Admins" 
                 active={roleFilter === 'ADMINS'} 
                 onClick={() => { setRoleFilter('ADMINS'); setAdminSubRole('All'); }} 
                 count={jurisdictionalUsers.filter(u => [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN].includes(u.role)).length} 
               />
               <TabItem 
                 label="RP" 
                 active={roleFilter === UserRole.RESOURCE_PERSON} 
                 onClick={() => setRoleFilter(UserRole.RESOURCE_PERSON)} 
                 count={jurisdictionalUsers.filter(u => u.role === UserRole.RESOURCE_PERSON).length} 
               />
             </>
           )}
           <TabItem 
             label="Faculty" 
             active={roleFilter === UserRole.TEACHER} 
             onClick={() => setRoleFilter(UserRole.TEACHER)} 
             count={jurisdictionalUsers.filter(u => {
               if (isSchoolAdmin) return u.role === UserRole.TEACHER || u.role === UserRole.SCHOOL_ADMIN;
               return u.role === UserRole.TEACHER;
             }).length} 
           />
           <TabItem 
             label="Students" 
             active={roleFilter === UserRole.STUDENT} 
             onClick={() => setRoleFilter(UserRole.STUDENT)} 
             count={jurisdictionalUsers.filter(u => u.role === UserRole.STUDENT).length} 
           />
        </div>
      </div>

      <div className="no-print">
        {renderFilters()}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4 mx-4 md:mx-0 no-print">
        <div className="flex gap-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none flex-1 lg:max-w-[160px] cursor-pointer">
            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none w-24 cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        
        <div className="hidden lg:block lg:flex-1"></div>
        
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-50">
          <Legend color="bg-emerald-500" label="Present" />
          <Legend color="bg-blue-600" label="Early" />
          <Legend color="bg-amber-500" label="Late" />
          <Legend color="bg-rose-500" label="Absent" />
          <Legend color="bg-slate-100" label="Unmarked" />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden relative mx-4 md:mx-0 printable-content">
        <div className="overflow-x-auto custom-scrollbar scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left border-collapse table-auto">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 px-4 md:px-8 py-5 md:py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-r min-w-[180px] md:w-72 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                  Node Identity
                </th>
                {days.map(d => (
                  <th key={d} className="px-1 py-5 md:py-6 text-center border-r border-slate-100 min-w-[36px] md:w-12 text-[10px] font-black text-slate-900">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-blue-50/20 group">
                  <td className="sticky left-0 z-20 bg-white group-hover:bg-[#FDFDFD] px-4 md:px-8 py-4 border-r shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                    <button type="button" onClick={() => onSelectUser?.(u.id)} className="flex items-center gap-3 md:gap-4 text-left w-full max-w-[140px] md:max-w-none">
                       <div className="w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-slate-100 overflow-hidden border border-white shadow-sm shrink-0">
                          <img src={`https://picsum.photos/seed/${u.id}/64/64`} className="w-full h-full object-cover" alt="user" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-[11px] md:text-sm font-black text-slate-900 truncate uppercase leading-tight mb-1">{u.name}</p>
                          <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase truncate tracking-widest">#{u.id}</p>
                       </div>
                    </button>
                  </td>
                  {days.map(d => {
                    const rec = attendanceMap[`${u.id}-${d}`];
                    return (
                      <td key={d} className="px-1 py-4 text-center border-r border-slate-50/50">
                        {rec ? (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenArtifact(rec, u); }}
                            className={`w-6 h-6 md:w-7 md:h-7 rounded-full mx-auto flex items-center justify-center text-white text-[8px] md:text-[9px] font-black shadow-lg transition-all ${
                              isTeacher ? 'cursor-default' : 'active:scale-90'
                            } ${
                              rec.status === 'Late' ? 'bg-amber-500 shadow-amber-500/20' : 
                              rec.status === 'Early' ? 'bg-blue-600 shadow-blue-600/20' : 
                              'bg-emerald-500 shadow-emerald-500/20'
                            }`}
                          >
                            {rec.status === 'Late' ? '!' : rec.status === 'Early' ? 'E' : '✓'}
                          </button>
                        ) : (
                          <button 
                            type="button"
                            disabled={isTeacher}
                            onClick={() => handleOpenBlankArtifact(u, d)}
                            className={`w-4 h-4 rounded-full bg-slate-100 mx-auto transition-colors flex items-center justify-center group/cell ${isTeacher ? 'cursor-not-allowed opacity-40' : 'hover:bg-blue-100 no-print'}`}
                          >
                            <span className="text-[8px] font-black text-blue-600 opacity-0 group-hover/cell:opacity-100 no-print">+</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && <div className="py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No identities matched your filters</div>}
      </div>

      {selectedArtifact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95">
            <div className="bg-slate-900 p-6 md:p-8 text-white relative">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden"></div>
              
              <div className="flex justify-between items-start mb-6">
                 <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                   {!selectedArtifact.record.id ? 'PROVISIONING NEW ARTIFACT' : isEditing ? 'MODIFYING ARTIFACT' : 'PRESENCE ARTIFACT'}
                 </span>
                 <button onClick={() => setSelectedArtifact(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">✕</button>
              </div>
              <div className="flex items-center gap-4 md:gap-6">
                 <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.8rem] bg-white/10 overflow-hidden border border-white/20 shrink-0 shadow-xl">
                    <img src={`https://picsum.photos/seed/${selectedArtifact.user.id}/128/128`} className="w-full h-full object-cover" alt="user" />
                 </div>
                 <div className="min-w-0">
                    <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-none mb-2 truncate">{selectedArtifact.user.name}</h3>
                    <p className="text-[9px] text-[10px] font-black text-blue-400 uppercase tracking-widest truncate">{selectedArtifact.user.role.replace('_', ' ')} • {selectedArtifact.user.id}</p>
                 </div>
              </div>
            </div>

            <div className="p-8 md:p-10 space-y-6 md:space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
               {!isEditing ? (
                 <>
                   <div className="grid grid-cols-2 gap-6 md:gap-8">
                      <ArtifactField label="Entry Date" value={new Date(selectedArtifact.record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} />
                      <ArtifactField 
                        label="Institutional Status" 
                        value={selectedArtifact.record.status} 
                        color={
                          selectedArtifact.record.status === 'Late' ? 'text-amber-500' : 
                          selectedArtifact.record.status === 'Early' ? 'text-blue-600' : 
                          'text-emerald-500'
                        } 
                      />
                   </div>
                   
                   <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-4 shadow-inner">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl shadow-sm">🕒</div>
                      <div className="min-w-0">
                         <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5">Assigned Shift Window</p>
                         {activeShift ? (
                           <>
                             <p className="text-sm font-black text-slate-900 uppercase truncate leading-none">{activeShift.label}</p>
                             <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">{format12h(activeShift.startTime)} — {format12h(activeShift.endTime)}</p>
                           </>
                         ) : (
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-tight italic">No Shift Bound in Ledger</p>
                         )}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6 md:gap-8 pt-2">
                      <ArtifactField label="Actual Clock In" value={format12h(selectedArtifact.record.clockIn)} />
                      <ArtifactField 
                        label="Actual Clock Out" 
                        value={selectedArtifact.record.clockOut ? format12h(selectedArtifact.record.clockOut) : (selectedArtifact.record.date === new Date().toISOString().split('T')[0] ? "PENDING" : "AUTO")} 
                        color={!selectedArtifact.record.clockOut ? 'text-slate-400 italic' : ''}
                      />
                   </div>
                   <div className="pt-6 border-t border-slate-50">
                      <ArtifactField label="Location Node" value={selectedArtifact.record.location || selectedArtifact.user.assignment} />
                   </div>
                   
                   {!isTeacher && (
                     <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button type="button" onClick={() => setIsEditing(true)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Edit Artifact</button>
                        
                        {(userRole === UserRole.SUPER_ADMIN || 
                          userRole === UserRole.ADMIN || 
                          (userRole === UserRole.RESOURCE_PERSON && selectedArtifact.user.role === UserRole.TEACHER)) && (
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} 
                            disabled={isProcessing} 
                            className="py-4 px-6 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                          >
                            Purge Record
                          </button>
                        )}
                     </div>
                   )}
                 </>
               ) : (
                 <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Status Override</label>
                          <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-black appearance-none cursor-pointer">
                             <option value="Present">Present</option>
                             <option value="Early">Early</option>
                             <option value="Late">Late</option>
                             <option value="Absent">Absent</option>
                          </select>
                       </div>
                       
                       <SearchableSelect 
                         label="Location Node" 
                         value={editForm.location} 
                         placeholder="Search School Node..."
                         options={schools.map(s => ({v: s.name, l: s.name}))}
                         onChange={(v: string) => setEditForm({...editForm, location: v})}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Clock In</label>
                          <input type="time" value={editForm.clockIn} onChange={e => setEditForm({...editForm, clockIn: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-black shadow-inner" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Clock Out</label>
                          <input type="time" value={editForm.clockOut} onChange={e => setEditForm({...editForm, clockOut: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-black shadow-inner" />
                       </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-50">
                       <button type="button" onClick={() => { if (!selectedArtifact.record.id) setSelectedArtifact(null); else setIsEditing(false); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase">Cancel</button>
                       <button type="button" onClick={handleSaveEdit} disabled={isProcessing} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex-[2] active:scale-95">{isProcessing ? 'Syncing...' : !selectedArtifact.record.id ? 'Commit New Artifact' : 'Save Changes'}</button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedArtifact && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300 no-print">
           <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">⚠️</div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">Irreversible Purge</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                You are about to permanently decommission artifact <span className="font-black text-slate-900">#{selectedArtifact.record.id}</span>. This action is recorded in the audit trail and cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  type="button"
                  onClick={executePurge}
                  disabled={isProcessing}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                   {isProcessing ? (
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     'Permanently Purge'
                   )}
                 </button>
                 <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isProcessing}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                 >
                   Cancel Protocol
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TabItem = ({ label, active, onClick, count }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 ${
      active ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    <span>{label}</span>
    <span className={`px-2 py-0.5 rounded-full text-[8px] ${active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
      {count}
    </span>
  </button>
);

const Legend = ({ color, label }: any) => (
  <div className="flex items-center gap-2">
     <div className={`w-2 h-2 rounded-full ${color}`}></div>
     <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{label}</span>
  </div>
);

const ArtifactField = ({ label, value, color = "text-slate-900" }: any) => (
  <div className="space-y-2 min-w-0">
     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">{label}</p>
     <p className={`text-sm md:text-base font-black uppercase tracking-tight truncate ${color}`}>{value}</p>
  </div>
);

export default AttendanceModule;
