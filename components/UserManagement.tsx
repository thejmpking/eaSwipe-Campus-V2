
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface UserManagementProps {
  users: UserIdentity[];
  onSelectUser?: (userId: string) => void;
  onDeleteUser: (id: string) => void;
  onAddUser: (user: UserIdentity) => void;
  onUpdateUser: (user: UserIdentity) => void;
  initialRoleFilter?: string;
  currentUserRole: UserRole;
  currentUserId: string;
  currentUserAssignment?: string;
  schools?: any[];
  clusters?: any[];
  campuses?: any[];
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
          className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-semibold text-left flex justify-between items-center transition-all hover:bg-white hover:border-blue-200 ${disabled ? 'cursor-not-allowed' : ''}`}
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
                All Entities
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

const UserManagement: React.FC<UserManagementProps> = ({ 
  users, onSelectUser, onDeleteUser, onAddUser, onUpdateUser, 
  initialRoleFilter = 'All', currentUserRole, currentUserId, currentUserAssignment, 
  schools = [], clusters = [], campuses = []
}) => {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserIdentity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter === 'All' ? 'ADMINS' : initialRoleFilter);
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const viewMode = windowWidth < 768 ? 'grid' : 'table';
  
  const [campusFilter, setCampusFilter] = useState('All');
  const [clusterFilter, setClusterFilter] = useState('All');
  const [schoolFilter, setSchoolFilter] = useState('All');
  const [adminSubRole, setAdminSubRole] = useState('All');

  // New localized filters for Students tab (Faculty view)
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [allClasses, setAllClasses] = useState<any[]>([]);

  const [localUsers, setLocalUsers] = useState<UserIdentity[]>(users);
  
  const [userForm, setUserForm] = useState({
    id: '', name: '', role: UserRole.STUDENT, assignment: '', school: '', cluster: '', email: '', designation: '', password: '1234', nfcUrl: '', whatsapp: ''
  });

  useEffect(() => { setLocalUsers(users); }, [users]);

  useEffect(() => {
    dataService.getRecords('classes').then(res => {
      if (Array.isArray(res)) setAllClasses(res);
    });
  }, []);

  // DERIVED: Robust school node identification for the current logged-in user
  const mySchoolNode = useMemo(() => {
    const me = users.find(u => u.id === currentUserId);
    return (me?.school || me?.assignment || currentUserAssignment || '').trim().toLowerCase();
  }, [users, currentUserId, currentUserAssignment]);

  const availableGrades = useMemo(() => {
    if (selectedClass === 'All') return [];
    const targetClass = allClasses.find(c => c.name === selectedClass);
    if (!targetClass) return [];
    return Array.isArray(targetClass.grades) ? targetClass.grades : JSON.parse(targetClass.grades || '[]');
  }, [selectedClass, allClasses]);

  const canEditTarget = (targetRole: UserRole, targetId: string) => {
    if (currentUserRole === UserRole.SUPER_ADMIN) return true;
    if (currentUserRole === UserRole.SCHOOL_ADMIN) {
      if (targetId === currentUserId) return true;
      const protectedFromSchoolAdmin = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.CAMPUS_HEAD,
        UserRole.RESOURCE_PERSON,
        UserRole.SCHOOL_ADMIN
      ];
      if (protectedFromSchoolAdmin.includes(targetRole)) return false;
      return true;
    }
    const restrictedViewers = [UserRole.RESOURCE_PERSON, UserRole.TEACHER, UserRole.STUDENT];
    const protectedTargets = [
      UserRole.SUPER_ADMIN, 
      UserRole.ADMIN, 
      UserRole.CAMPUS_HEAD, 
      UserRole.SCHOOL_ADMIN, 
      UserRole.RESOURCE_PERSON
    ];
    if (restrictedViewers.includes(currentUserRole)) {
      if (protectedTargets.includes(targetRole)) {
        return false;
      }
    }
    return true;
  };

  const canDelete = currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.ADMIN;

  const activeJurisdictionCluster = useMemo(() => {
    if (currentUserRole !== UserRole.RESOURCE_PERSON) return null;
    const isDirectCluster = (clusters || []).some(c => c.name === currentUserAssignment || c.id === currentUserAssignment);
    if (isDirectCluster) return currentUserAssignment;
    const assignedSchool = (schools || []).find(s => s.name === currentUserAssignment || s.id === currentUserAssignment);
    if (assignedSchool) return assignedSchool.clusterName;
    return currentUserAssignment;
  }, [currentUserRole, currentUserAssignment, clusters, schools]);

  const filteredUsers = useMemo(() => {
    return localUsers.filter(u => {
      if (currentUserRole !== UserRole.SUPER_ADMIN && u.role === UserRole.SUPER_ADMIN) return false;

      if (currentUserRole === UserRole.RESOURCE_PERSON && u.role === UserRole.TEACHER) {
        const userSchoolObj = (schools || []).find(s => s.name === u.school || s.name === u.assignment);
        const matchesCluster = u.cluster === activeJurisdictionCluster || userSchoolObj?.clusterName === activeJurisdictionCluster;
        if (!matchesCluster) return false;
      }

      let matchesTab = false;
      if (roleFilter === 'ADMINS') {
        const visibleAdmins = [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN];
        if (currentUserRole === UserRole.SUPER_ADMIN) visibleAdmins.push(UserRole.SUPER_ADMIN);
        matchesTab = visibleAdmins.includes(u.role);
      } else {
        matchesTab = u.role === roleFilter;
      }
      if (!matchesTab) return false;

      // Tab Specific Jurisdictional Enforcement
      if (roleFilter === UserRole.TEACHER && currentUserRole === UserRole.TEACHER) {
        const uNode = (u.school || u.assignment || '').toLowerCase();
        if (uNode !== mySchoolNode) return false;
      }

      if (roleFilter === UserRole.STUDENT) {
        // FACULTY STUDENT LOCK: Faculty only see students in their school
        if (currentUserRole === UserRole.TEACHER) {
          const uNode = (u.school || u.assignment || '').toLowerCase();
          if (uNode !== mySchoolNode) return false;

          // Apply Class/Grade Filters for Teacher view
          if (selectedClass !== 'All' && !u.designation?.includes(selectedClass)) return false;
          if (selectedGrade !== 'All' && !u.designation?.includes(selectedGrade)) return false;
        }
      }

      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (roleFilter === 'ADMINS' && adminSubRole !== 'All' && u.role !== adminSubRole) {
        return false;
      }

      // Hierarchy filters are skipped for faculty viewing students as they are locked to their school
      if (!(roleFilter === UserRole.STUDENT && currentUserRole === UserRole.TEACHER)) {
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
  }, [localUsers, searchQuery, roleFilter, campusFilter, clusterFilter, schoolFilter, adminSubRole, schools, clusters, currentUserRole, activeJurisdictionCluster, currentUserAssignment, mySchoolNode, selectedClass, selectedGrade]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCommitting(true);
    const normalizedId = (editingUser?.id || userForm.id || `USR-${Date.now().toString().slice(-6)}`).toUpperCase().trim();
    const userData: any = {
      ...userForm,
      id: normalizedId,
      status: editingUser?.status || 'Active',
      lastActive: editingUser?.lastActive || new Date().toISOString(),
      assignment: userForm.school || userForm.cluster || 'System Root'
    };
    const res = await dataService.syncRecord('users', userData);
    if (res.status === 'success') {
      if (editingUser) onUpdateUser(userData);
      else onAddUser(userData);
      setIsProvisioning(false);
      setEditingUser(null);
    } else { alert(`Registry Error: ${res.message}`); }
    setIsCommitting(false);
  };

  const executePurge = async () => {
    if (!editingUser || isCommitting) return;
    setIsCommitting(true);
    try {
      const res = await dataService.deleteRecord('users', editingUser.id);
      if (res.status === 'success') {
        onDeleteUser(editingUser.id);
        setShowDeleteConfirm(false);
        setIsProvisioning(false);
        setEditingUser(null);
      } else { alert(`Handshake Failure: ${res.message}`); }
    } catch (err) { alert("Infrastructure Fault during decommissioning."); }
    finally { setIsCommitting(false); }
  };

  const handleEdit = (user: UserIdentity) => {
    setEditingUser(user);
    setUserForm({
      id: user.id.toUpperCase(), name: user.name, role: user.role, 
      assignment: user.assignment, school: user.school || '', cluster: user.cluster || '',
      email: user.email, designation: user.designation || '', password: user.password || '1234',
      nfcUrl: user.nfcUrl || '', whatsapp: user.whatsapp || ''
    });
    setIsProvisioning(true);
  };

  const renderFilters = () => {
    return (
      <div className={`bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm space-y-6 ${!showFiltersOnMobile ? 'hidden md:block' : 'block animate-in slide-in-from-top-4'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Global Search</label>
            <div className="relative">
              <input 
                type="text" placeholder="Name or ID..." 
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-30">🔍</span>
            </div>
          </div>
          
          {roleFilter === 'ADMINS' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Admin Tier</label>
                <select value={adminSubRole} onChange={e => setAdminSubRole(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-semibold appearance-none cursor-pointer">
                  <option value="All">All Admins</option>
                  {currentUserRole === UserRole.SUPER_ADMIN && <option value={UserRole.SUPER_ADMIN}>Super Admin</option>}
                  <option value={UserRole.ADMIN}>Campus Admin</option>
                  <option value={UserRole.CAMPUS_HEAD}>Campus Head</option>
                  <option value={UserRole.SCHOOL_ADMIN}>School Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campus</label>
                <select value={campusFilter} onChange={e => setCampusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-semibold appearance-none cursor-pointer">
                  <option value="All">All Campuses</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <SearchableSelect label="Jurisdictional Cluster" value={clusterFilter} options={clusters.filter(c => campusFilter === 'All' || c.campusId === campusFilter).map(c => ({v: c.name, l: c.name}))} onChange={setClusterFilter} placeholder="All Clusters" />
              <SearchableSelect label="Entity (School)" value={schoolFilter} options={schools.filter(s => clusterFilter === 'All' || s.clusterName === clusterFilter).map(s => ({v: s.name, l: s.name}))} onChange={setSchoolFilter} placeholder="All Schools" />
            </>
          )}

          {roleFilter === UserRole.RESOURCE_PERSON && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campus Hub</label>
                <select value={campusFilter} onChange={e => setCampusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-semibold appearance-none cursor-pointer">
                  <option value="All">All Campuses</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <SearchableSelect label="Cluster Node" value={clusterFilter} options={clusters.filter(c => campusFilter === 'All' || c.campusId === campusFilter).map(c => ({v: c.name, l: c.name}))} onChange={setClusterFilter} placeholder="All Clusters" />
            </>
          )}

          {roleFilter === UserRole.STUDENT && (
            <>
              {currentUserRole === UserRole.TEACHER ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Class</label>
                    <select 
                      value={selectedClass} 
                      onChange={e => { setSelectedClass(e.target.value); setSelectedGrade('All'); }} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-semibold appearance-none cursor-pointer"
                    >
                      <option value="All">All Classes</option>
                      {allClasses.filter(c => {
                        const classNode = (c.school || '').toLowerCase();
                        return classNode === mySchoolNode;
                      }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grade Binding</label>
                    <select 
                      value={selectedGrade} 
                      disabled={selectedClass === 'All'}
                      onChange={e => setSelectedGrade(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-semibold appearance-none cursor-pointer disabled:opacity-40"
                    >
                      <option value="All">All Grades</option>
                      {availableGrades.map((g: string) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <SearchableSelect label="Cluster Jurisdiction" value={clusterFilter} options={clusters.map(c => ({v: c.name, l: c.name}))} onChange={setClusterFilter} placeholder="All Clusters" />
                  <SearchableSelect label="Educational Entity (School)" value={schoolFilter} options={schools.filter(s => clusterFilter === 'All' || s.clusterName === clusterFilter).map(s => ({v: s.name, l: s.name}))} onChange={setSchoolFilter} placeholder="All Schools" />
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-24 max-w-7xl mx-auto px-1 sm:px-0 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-3 sm:px-0">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Institutional Registry v5.2</p>
          </div>
          <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Personnel Hub</h2>
          <p className="text-slate-400 font-medium mt-3 text-[9px] md:text-sm uppercase tracking-widest leading-relaxed">
            {currentUserRole === UserRole.RESOURCE_PERSON ? `Authorized Region: ${activeJurisdictionCluster}` : currentUserRole === UserRole.TEACHER ? `Authorized School: ${mySchoolNode.toUpperCase()}` : 'Managing global institutional identity artifacts.'}
          </p>
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto">
          <button onClick={() => setShowFiltersOnMobile(!showFiltersOnMobile)} className={`md:hidden flex-1 px-4 py-4 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showFiltersOnMobile ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>
            {showFiltersOnMobile ? '✕ Close' : '🔍 Filters'}
          </button>
          
          {currentUserRole !== UserRole.TEACHER && (
            <button 
              onClick={() => { setEditingUser(null); setUserForm({id: '', name: '', role: UserRole.STUDENT, assignment: '', school: '', cluster: '', email: '', designation: '', password: '1234', nfcUrl: '', whatsapp: ''}); setIsProvisioning(true); }} 
              className="flex-[2] md:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>➕</span> Provision
            </button>
          )}
        </div>
      </div>

      <div className="px-2 sm:px-0">
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] md:rounded-[3rem] shadow-inner grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-w-3xl mx-auto md:mx-0">
          <TabItem label="Admins" active={roleFilter === 'ADMINS'} onClick={() => setRoleFilter('ADMINS')} count={users.filter(u => { const adminRoles = [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN]; if (currentUserRole === UserRole.SUPER_ADMIN) adminRoles.push(UserRole.SUPER_ADMIN); return adminRoles.includes(u.role); }).length} />
          <TabItem label="Faculty" active={roleFilter === UserRole.TEACHER} onClick={() => setRoleFilter(UserRole.TEACHER)} count={users.filter(u => { if (u.role !== UserRole.TEACHER) return false; if (currentUserRole === UserRole.RESOURCE_PERSON) { const userSchoolObj = (schools || []).find(s => s.name === u.school || s.name === u.assignment); return u.cluster === activeJurisdictionCluster || userSchoolObj?.clusterName === activeJurisdictionCluster; } if (currentUserRole === UserRole.TEACHER) { const uNode = (u.school || u.assignment || '').toLowerCase(); return uNode === mySchoolNode; } return true; }).length} />
          <TabItem label="RPs" active={roleFilter === UserRole.RESOURCE_PERSON} onClick={() => setRoleFilter(UserRole.RESOURCE_PERSON)} count={users.filter(u => u.role === UserRole.RESOURCE_PERSON).length} />
          <TabItem label="Students" active={roleFilter === UserRole.STUDENT} onClick={() => setRoleFilter(UserRole.STUDENT)} count={users.filter(u => { if (u.role !== UserRole.STUDENT) return false; if (currentUserRole === UserRole.TEACHER) { const uNode = (u.school || u.assignment || '').toLowerCase(); return uNode === mySchoolNode; } return true; }).length} />
        </div>
      </div>

      {renderFilters()}

      {viewMode === 'table' ? (
        <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden mx-1 md:mx-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 md:px-10 py-5 md:py-8 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Artifact</th>
                  <th className="px-6 md:px-10 py-5 md:py-8 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Jurisdictional Node</th>
                  <th className="px-6 md:px-10 py-5 md:py-8 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ledger Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 md:px-10 py-4 md:py-6">
                      <div className="flex items-center gap-3 md:gap-5">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-slate-100 overflow-hidden border border-white shadow-sm shrink-0">
                          <img src={`https://picsum.photos/seed/${u.id}/128/128`} className="w-full h-full object-cover" alt="p" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm md:text-lg font-black text-slate-900 uppercase truncate mb-1 leading-none cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onSelectUser?.(u.id)}>{u.name}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">#{u.id} • {u.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-4 md:py-6 hidden md:table-cell">
                      <p className="text-xs md:text-sm font-black text-slate-700 uppercase leading-none">{u.assignment || 'Root Node'}</p>
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase mt-2 tracking-tighter">{u.cluster || 'No cluster link'}</p>
                    </td>
                    <td className="px-6 md:px-10 py-4 md:py-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        {canEditTarget(u.role, u.id) && (
                          <button onClick={() => handleEdit(u)} className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm">✎</button>
                        )}
                        <button onClick={() => onSelectUser?.(u.id)} className="hidden sm:flex px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 active:scale-95 transition-all">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && <div className="py-24 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Zero artifact resolution in quadrant</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 px-3 sm:px-0">
           {filteredUsers.map(user => (
             <div key={user.id} className="bg-white p-4 md:p-8 rounded-[1.8rem] md:rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-slate-50 border-4 border-white shadow-lg overflow-hidden shrink-0 md:mb-8">
                   <img src={`https://picsum.photos/seed/${user.id}/256/256`} className="w-full h-full object-cover" alt="u" />
                </div>
                <div className="min-w-0 flex-1 md:w-full">
                   <h4 onClick={() => onSelectUser?.(user.id)} className="text-sm md:text-2xl font-black text-slate-900 uppercase leading-none cursor-pointer hover:text-blue-600 truncate mb-1 md:mb-2">{user.name}</h4>
                   <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest md:mb-6">#{user.id} • {user.role.replace('_', ' ')}</p>
                   <div className="md:pt-6 md:border-t border-slate-50 flex flex-col gap-1.5">
                      <span className="text-[8px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-xl uppercase truncate text-center md:text-left">@{user.assignment || 'Root Node'}</span>
                   </div>
                </div>
                <div className="flex md:hidden gap-1 shrink-0 ml-auto">
                   {canEditTarget(user.role, user.id) && <button onClick={() => handleEdit(user)} className="p-2 text-slate-300">✎</button>}
                   <button onClick={() => onSelectUser?.(user.id)} className="p-2 text-slate-300">👁️</button>
                </div>
             </div>
           ))}
           {filteredUsers.length === 0 && <div className="col-span-full py-24 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Zero artifact resolution in quadrant</div>}
        </div>
      )}

      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[4rem] shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-full max-h-[96vh] flex flex-col">
            <div className="bg-slate-900 p-6 md:p-10 text-white shrink-0">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-xl md:text-3xl font-black uppercase leading-none tracking-tight">{editingUser ? 'Modify Artifact' : 'Provision Identity'}</h3>
                    <p className="text-blue-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-3">Writing Secure Identity Node to Ledger</p>
                 </div>
                 <button onClick={() => setIsProvisioning(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all active:scale-90">✕</button>
              </div>
            </div>
            <form onSubmit={handleSave} className="p-6 md:p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1 pb-20">
              <div className="space-y-6">
                <div className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">01</span><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Artifact Identity</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Identity ID (Global)" value={userForm.id} onChange={(v:string) => setUserForm({...userForm, id: v.toUpperCase()})} disabled={!!editingUser} placeholder="e.g. USR-0921" />
                  <Input label="Full Identity Name" value={userForm.name} onChange={(v:string) => setUserForm({...userForm, name: v})} placeholder="Legal Name" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Authority Tier</label>
                      <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-black uppercase shadow-inner cursor-pointer appearance-none outline-none focus:border-blue-400">
                         {Object.values(UserRole).filter(r => r !== UserRole.SUPER_ADMIN || currentUserRole === UserRole.SUPER_ADMIN).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                   </div>
                   <Input label="Designation Node" value={userForm.designation} onChange={(v:string) => setUserForm({...userForm, designation: v})} placeholder="e.g. Science Faculty" />
                </div>
              </div>
              <div className="space-y-6 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">02</span><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cloud Connectivity</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Institutional Email" value={userForm.email} onChange={(v:string) => setUserForm({...userForm, email: v})} placeholder="name@edusync.io" />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp Hub (+91)</label>
                    <div className="flex">
                       <span className="flex items-center justify-center bg-slate-100 border-2 border-r-0 border-slate-100 rounded-l-2xl px-4 text-[11px] font-black text-slate-400 tracking-tighter shrink-0">+91</span>
                       <input type="text" value={userForm.whatsapp} onChange={e => setUserForm({...userForm, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10)})} placeholder="10-digit number" className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-r-2xl px-5 py-4 text-xs font-black outline-none focus:border-emerald-400 shadow-inner" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black">03</span><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Jurisdictional Binding</h4></div>
                <div className="p-5 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SearchableSelect label="Cluster Hub" value={userForm.cluster} options={clusters.map(c => ({v: c.name, l: c.name}))} onChange={(v: string) => setUserForm({...userForm, cluster: v})} placeholder="Bind to Cluster..." />
                      <SearchableSelect label="Entity Assignment" value={userForm.school} options={schools.filter(s => !userForm.cluster || s.clusterName === userForm.cluster).map(s => ({v: s.name, l: s.name}))} onChange={(v: string) => setUserForm({...userForm, school: v})} placeholder="Bind to School..." />
                   </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsProvisioning(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95">Discard</button>
                {editingUser && canDelete && <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 py-5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"><span>🗑️</span> Decommission</button>}
                <button type="submit" disabled={isCommitting} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2">
                  {isCommitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : editingUser ? 'Update Registry' : 'Commit to Core'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && editingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">⚠️</div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">Irreversible Purge</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">You are about to permanently decommission identity artifact <span className="font-black text-slate-900">#{editingUser.id}</span>. This action is recorded in the audit trail and cannot be undone.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={executePurge} disabled={isCommitting} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3">{isCommitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Permanently Purge'}</button>
                 <button onClick={() => setShowDeleteConfirm(false)} disabled={isCommitting} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Cancel Protocol</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TabItem = ({ label, active, onClick, count }: any) => (
  <button onClick={onClick} className={`w-full py-3 md:py-4 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${active ? 'bg-white text-blue-600 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}>
    <span>{label}</span>
    <span className={`px-1.5 py-0.5 rounded-lg text-[8px] ${active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
  </button>
);

const Input = ({ label, value, onChange, disabled, placeholder }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all disabled:opacity-50 shadow-inner uppercase placeholder:normal-case" />
  </div>
);

export default UserManagement;
