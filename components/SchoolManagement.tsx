
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';
import { UserIdentity } from '../App';

interface SchoolData {
  id: string;
  name: string;
  clusterId: string;
  clusterName: string;
  campusName: string;
  campusId?: string;
  headmaster: string;
  address?: string;
  strength: {
    students: number;
    teachers: number;
    staff: number;
  };
  status: 'Active' | 'Suspended' | 'Closed';
}

interface SchoolManagementProps {
  userRole: UserRole;
  userAssignment: string;
  onSelectSchool?: (schoolId: string) => void;
  onSelectCluster?: (clusterId: string) => void;
  onSelectCampus?: (campusId: string) => void;
  users?: UserIdentity[];
  currentUserId?: string;
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
    <div className={`space-y-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={wrapperRef}>
      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium text-left flex justify-between items-center transition-all hover:bg-white hover:border-blue-200"
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
                  className={`w-left px-4 py-3 text-xs font-medium transition-colors hover:bg-blue-50 ${value === opt.v ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
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

const SchoolManagement: React.FC<SchoolManagementProps> = ({ userRole, userAssignment, onSelectSchool, onSelectCluster, onSelectCampus, users = [], currentUserId }) => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [availableClusters, setAvailableClusters] = useState<any[]>([]);
  const [availableCampuses, setAvailableCampuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('All');
  const [clusterFilter, setClusterFilter] = useState('All');
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);

  // RP Jurisdiction Resolution
  const rpResolvedCluster = useMemo(() => {
    if (userRole !== UserRole.RESOURCE_PERSON) return null;
    const me = users.find(u => u.id === currentUserId || u.name === userAssignment);
    return (me?.cluster || me?.assignment || userAssignment).trim();
  }, [users, userRole, currentUserId, userAssignment]);

  const fetchRegistry = async () => {
    setIsLoading(true);
    try {
      const [dbSchools, dbClusters, dbCampuses] = await Promise.all([
        dataService.getSchools(),
        dataService.getClusters(),
        dataService.getCampuses()
      ]);

      if (Array.isArray(dbSchools)) {
        setSchools(dbSchools.map((s: any) => ({
          ...s,
          strength: typeof s.strength === 'string' ? JSON.parse(s.strength) : (s.strength || { students: 0, teachers: 0, staff: 0 })
        })));
      }
      setAvailableClusters(dbClusters || []);
      setAvailableCampuses(dbCampuses || []);
      
      // Auto-set filters for RP to lock them into their jurisdiction
      if (userRole === UserRole.RESOURCE_PERSON && rpResolvedCluster) {
        const rpCluster = dbClusters?.find((c: any) => 
          c.name.trim().toLowerCase() === rpResolvedCluster.toLowerCase() || 
          c.id.trim().toLowerCase() === rpResolvedCluster.toLowerCase()
        );
        if (rpCluster) {
          setCampusFilter(rpCluster.campusId);
          setClusterFilter(rpCluster.name);
        }
      }
    } catch (e) { console.error("Cloud Registry Error", e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchRegistry(); }, [rpResolvedCluster]);

  const [formData, setFormData] = useState({
    name: '',
    campusId: '',
    campusName: '',
    clusterId: '',
    clusterName: '',
    headmaster: '',
    address: ''
  });

  const schoolAdmins = useMemo(() => {
    return (users || [])
      .filter(u => u.role === UserRole.SCHOOL_ADMIN)
      .map(u => ({ v: u.name, l: `${u.name} (${u.id})` }));
  }, [users]);

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campusId || !formData.clusterId) {
      alert("Binding Error: Parent Nodes required.");
      return;
    }

    setIsCommitting(true);
    const newSchool = {
      id: editingSchool?.id || `SCH-${Math.floor(Math.random() * 900 + 100)}`,
      name: formData.name.trim(),
      campusId: formData.campusId,
      campusName: formData.campusName,
      clusterId: formData.clusterId,
      clusterName: formData.clusterName,
      headmaster: formData.headmaster,
      address: formData.address || null,
      strength: editingSchool?.strength || { students: 0, teachers: 0, staff: 0 },
      status: 'Active'
    };

    const res = await dataService.syncRecord('schools', newSchool);
    if (res.status === 'success') {
      await fetchRegistry();
      setIsProvisioning(false);
      setEditingSchool(null);
    }
    setIsCommitting(false);
  };

  const handleEdit = (school: SchoolData) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      campusId: school.campusId || '',
      campusName: school.campusName,
      clusterId: school.clusterId,
      clusterName: school.clusterName,
      headmaster: school.headmaster,
      address: school.address || ''
    });
    setIsProvisioning(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`PURGE CONFIRMATION: Decommission "${name}"?`)) {
      setIsCommitting(true);
      const res = await dataService.deleteRecord('schools', id);
      if (res.status === 'success') {
        await fetchRegistry();
      }
      setIsCommitting(false);
    }
  };

  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      // ROLE BASED JURISDICTION LOCK FOR RESOURCE PERSON
      if (userRole === UserRole.RESOURCE_PERSON && rpResolvedCluster) {
        const target = rpResolvedCluster.toLowerCase();
        const matchesName = s.clusterName.trim().toLowerCase() === target;
        const matchesId = s.clusterId.trim().toLowerCase() === target;
        if (!matchesName && !matchesId) return false;
      }

      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Global UI Filters
      if (campusFilter !== 'All' && s.campusId !== campusFilter && s.campusName !== campusFilter) return false;
      if (clusterFilter !== 'All' && s.clusterName !== clusterFilter && s.clusterId !== clusterFilter) return false;

      return true;
    });
  }, [schools, searchQuery, campusFilter, clusterFilter, userRole, rpResolvedCluster]);

  const renderFilters = () => {
    const isRP = userRole === UserRole.RESOURCE_PERSON;
    return (
      <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 ${!showFiltersOnMobile ? 'hidden md:block' : 'block animate-in slide-in-from-top-4'}`}>
        <div className={`grid grid-cols-1 ${isRP ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Institutional Search</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search by School Name or ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-30">🔍</span>
            </div>
          </div>

          {!isRP && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  Campus Hub
                </label>
                <div className="relative">
                  <select 
                    value={campusFilter} 
                    onChange={e => { setCampusFilter(e.target.value); setClusterFilter('All'); }} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium appearance-none cursor-pointer"
                  >
                    <option value="All">All Campuses</option>
                    {availableCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  Cluster Jurisdiction
                </label>
                <div className="relative">
                  <select 
                    value={clusterFilter} 
                    onChange={e => setClusterFilter(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium appearance-none cursor-pointer"
                  >
                    <option value="All">All Clusters</option>
                    {availableClusters
                      .filter(c => campusFilter === 'All' || c.campusId === campusFilter)
                      .map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (isLoading && schools.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Querying Node Ledger...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-500 px-1 sm:px-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-4 sm:px-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-none uppercase">Educational Entities</h2>
          <p className="text-slate-400 font-medium mt-2 text-[10px] uppercase tracking-[0.2em]">
            {userRole === UserRole.RESOURCE_PERSON ? `Authorized Nodes: ${rpResolvedCluster || userAssignment}` : 'Institutional Infrastructure Management'}
          </p>
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto">
          <button 
             onClick={() => setShowFiltersOnMobile(!showFiltersOnMobile)} 
             className={`md:hidden flex-1 px-4 py-4 border rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showFiltersOnMobile ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}
           >
              <span>{showFiltersOnMobile ? '✕ Close' : '🔍 Filters'}</span>
          </button>
          <button 
            onClick={() => { setEditingSchool(null); setFormData({name:'', campusId:campusFilter !== 'All' ? campusFilter : '', campusName:'', clusterId:clusterFilter !== 'All' ? clusterFilter : '', clusterName:clusterFilter !== 'All' ? clusterFilter : '', headmaster:'', address:''}); setIsProvisioning(true); }} 
            className="flex-[2] lg:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl font-semibold text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span>➕</span> Provision Node
          </button>
        </div>
      </div>

      {renderFilters()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 sm:px-0">
        {filteredSchools.map(school => (
          <div key={school.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-7 shadow-sm group hover:shadow-xl hover:border-blue-100 transition-all flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
               <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[8px] font-semibold uppercase tracking-widest shadow-sm">{school.id}</span>
               <div className="flex gap-1">
                  <button onClick={() => handleEdit(school)} className="w-8 h-8 bg-white border border-slate-100 text-slate-300 hover:text-blue-600 rounded-xl transition-all flex items-center justify-center">✏️</button>
                  <button onClick={() => handleDelete(school.id, school.name)} className="w-8 h-8 bg-rose-50 border border-rose-100 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all">🗑️</button>
               </div>
            </div>
            <button onClick={() => onSelectSchool?.(school.id)} className="text-left w-full group/title flex-1">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-1 group-hover/title:text-blue-600 transition-colors uppercase leading-tight tracking-tight line-clamp-2 min-h-[3rem]">{school.name}</h3>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-4 truncate">{school.campusName} • {school.clusterName}</p>
            </button>
            <div className="pt-4 border-t border-slate-50 space-y-3">
               <div>
                  <p className="text-[7px] font-semibold text-slate-300 uppercase tracking-widest mb-0.5">School Admin</p>
                  <p className="text-[11px] font-semibold text-slate-600 uppercase truncate">{school.headmaster}</p>
               </div>
               <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-semibold uppercase px-2 py-0.5 rounded-lg ${school.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{school.status}</span>
                  <button onClick={() => onSelectSchool?.(school.id)} className="text-[8px] font-bold text-blue-500 uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">View Hub →</button>
               </div>
            </div>
          </div>
        ))}
        {filteredSchools.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
             <p className="text-slate-400 font-semibold uppercase tracking-widest text-[10px]">
               {userRole === UserRole.RESOURCE_PERSON 
                 ? "No school nodes registered in your jurisdictional cluster." 
                 : "No infrastructure nodes matched your criteria"}
             </p>
          </div>
        )}
      </div>

      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-xl w-full rounded-t-[2.5rem] md:rounded-[3.5rem] p-6 md:p-14 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 overflow-y-auto max-h-[95vh] custom-scrollbar">
              <div className="flex justify-between items-start mb-8 md:mb-10 sticky top-0 bg-white z-10 py-1 md:py-0 border-b border-slate-50 md:border-none">
                <div>
                  <h3 className="text-xl md:text-3xl font-semibold text-slate-900 tracking-tight mb-1 uppercase">
                    {editingSchool ? 'Modify Entity' : 'Provision Entity'}
                  </h3>
                  <p className="text-slate-400 font-medium text-[8px] md:text-[10px] uppercase tracking-[0.2em]">Writing to Master SQL Registry</p>
                </div>
                <button onClick={() => setIsProvisioning(false)} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 transition-all active:scale-90 shadow-sm shrink-0">✕</button>
              </div>
              
              <form onSubmit={handleSaveSchool} className="space-y-6 md:space-y-8 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Campus Hub Binding</label>
                    <div className="relative">
                      <select required value={formData.campusId} onChange={e => {
                          const c = availableCampuses.find(x => x.id === e.target.value);
                          setFormData({...formData, campusId: e.target.value, campusName: c?.name || '', clusterId: '', clusterName: ''});
                      }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium appearance-none cursor-pointer">
                        <option value="">Select...</option>
                        {availableCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Cluster Jurisdiction</label>
                    <div className="relative">
                      <select required disabled={!formData.campusId} value={formData.clusterId} onChange={e => {
                          const c = availableClusters.find(x => x.id === e.target.value);
                          setFormData({...formData, clusterId: e.target.value, clusterName: c?.name || ''});
                      }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium appearance-none cursor-pointer disabled:opacity-40">
                        <option value="">Select...</option>
                        {availableClusters.filter(c => c.campusId === formData.campusId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Institutional Label</label>
                   <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner" placeholder="e.g. North Valley High" />
                </div>

                <SearchableSelect 
                  label="School Admin (Legal Name)" 
                  value={formData.headmaster} 
                  placeholder="Assign School Admin..."
                  options={schoolAdmins}
                  onChange={(v: string) => setFormData({...formData, headmaster: v})}
                />

                <div className="space-y-1.5">
                   <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Physical Node Address</label>
                   <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner" placeholder="Optional coordinate or address..." />
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 border-t border-slate-100">
                   <button type="button" onClick={() => setIsProvisioning(false)} className="w-full md:flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-semibold text-[10px] uppercase tracking-widest transition-all">Discard</button>
                   <button type="submit" disabled={isCommitting} className="w-full md:flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-semibold text-[10px] uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                      {isCommitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          SYNCING...
                        </>
                      ) : (
                        'Commit Entity'
                      )}
                   </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default SchoolManagement;
