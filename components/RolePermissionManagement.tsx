import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

export interface ModulePermission {
  id: string;
  label: string;
  category: 'Access' | 'Structure' | 'Personnel' | 'Operations' | 'Intelligence';
  icon: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  base_role: UserRole;
  permissions: string[]; 
}

const RolePermissionManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);

  const modules: ModulePermission[] = [
    { id: 'CARD_READ', label: 'Hardware Reader', category: 'Access', icon: '⏱️' },
    { id: 'CAMPUS', label: 'Regional Campuses', category: 'Structure', icon: '🏙️' },
    { id: 'CLUSTER', label: 'Institutional Clusters', category: 'Structure', icon: '📍' },
    { id: 'SCHOOL', label: 'Educational Schools', category: 'Structure', icon: '🏫' },
    { id: 'CLASS', label: 'Classes & Grades', category: 'Structure', icon: '📚' },
    { id: 'DEPARTMENT', label: 'Academic Depts', category: 'Personnel', icon: '🏢' },
    { id: 'DESIGNATION', label: 'Designations', category: 'Personnel', icon: '🏷️' },
    { id: 'USERS', label: 'User Identities', category: 'Personnel', icon: '👥' },
    { id: 'SHIFT', label: 'Time Windows', category: 'Operations', icon: '🕒' },
    { id: 'PRESENCE', label: 'Presence Ledger', category: 'Operations', icon: '📋' },
    { id: 'INSPECTION', label: 'Audit Visits', category: 'Operations', icon: '🔍' },
    { id: 'NFC_CARD', label: 'NFC Credentials', category: 'Access', icon: '🪪' },
    { id: 'REPORT', label: 'Intelligence Hub', category: 'Intelligence', icon: '📈' },
    { id: 'LEAVE', label: 'Leave Ledger', category: 'Operations', icon: '🗓️' },
  ];

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const dbRoles = await dataService.getRecords('roles');
      if (dbRoles && Array.isArray(dbRoles)) {
        setRoles(dbRoles.map(r => ({
          ...r,
          permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || [])
        })));
      }
    } catch (e) { console.error("Authority Sync Error", e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const [formName, setFormName] = useState('');
  const [formBaseRole, setFormBaseRole] = useState<UserRole>(UserRole.TEACHER);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const handleOpenEdit = (role: RoleDefinition) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormBaseRole(role.base_role);
    setFormPermissions([...role.permissions]);
    setIsCreating(true);
  };

  const handleOpenNew = () => {
    setEditingRole(null);
    setFormName('');
    setFormBaseRole(UserRole.TEACHER);
    setFormPermissions(['REPORT_VIEW', 'PRESENCE_VIEW']);
    setIsCreating(true);
  };

  const togglePermission = (permKey: string) => {
    setFormPermissions(prev => 
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  const handleCommitMatrix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { alert("Validation Error: Role Label required."); return; }
    
    setIsCommitting(true);
    const nextRole = {
      id: editingRole?.id || `RT-${Math.floor(Math.random() * 900 + 100)}`,
      name: formName.trim(),
      base_role: formBaseRole,
      permissions: JSON.stringify(formPermissions)
    };

    const res = await dataService.syncRecord('roles', nextRole);
    if (res.status === 'success') {
      await fetchRoles();
      setIsCreating(false);
    } else { alert(`Sync Failure: ${res.message}`); }
    setIsCommitting(false);
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (id.startsWith('CORE-')) {
      alert("PROTECTION FAULT: System Core roles cannot be decommissioned.");
      return;
    }
    if (window.confirm(`PURGE CONFIRMATION: Decommission "${name}" Authority Tier?`)) {
      setIsCommitting(true);
      await dataService.deleteRecord('roles', id);
      await fetchRoles();
      setIsCommitting(false);
    }
  };

  const seedStandardRoles = async () => {
    setIsCommitting(true);
    const defaults = [
      { id: 'CORE-SA', name: 'Main Admin', base_role: UserRole.SUPER_ADMIN, permissions: modules.flatMap(m => [`${m.id}_ADD`, `${m.id}_VIEW`, `${m.id}_EDIT`, `${m.id}_DELETE`]) },
      { id: 'CORE-AD', name: 'System Admin', base_role: UserRole.ADMIN, permissions: modules.flatMap(m => [`${m.id}_VIEW`, `${m.id}_EDIT`]) },
      { id: 'CORE-CH', name: 'Campus Head', base_role: UserRole.CAMPUS_HEAD, permissions: modules.filter(m => m.category !== 'Access').flatMap(m => [`${m.id}_VIEW`, `${m.id}_EDIT`]) },
      { id: 'CORE-RP', name: 'Resource Person', base_role: UserRole.RESOURCE_PERSON, permissions: ['INSPECTION_ADD', 'INSPECTION_VIEW', 'PRESENCE_VIEW', 'SCHOOL_VIEW', 'CLUSTER_VIEW'] },
      { id: 'CORE-SCH', name: 'School Admin', base_role: UserRole.SCHOOL_ADMIN, permissions: ['USERS_ADD', 'USERS_VIEW', 'USERS_EDIT', 'PRESENCE_VIEW', 'SHIFT_VIEW', 'CLASS_VIEW', 'STUDENT_VIEW'] },
      { id: 'CORE-TEA', name: 'Teacher', base_role: UserRole.TEACHER, permissions: ['PRESENCE_VIEW', 'CLASS_VIEW', 'STUDENT_VIEW', 'LEAVE_ADD', 'LEAVE_VIEW'] },
      { id: 'CORE-STD', name: 'Student', base_role: UserRole.STUDENT, permissions: ['PRESENCE_VIEW', 'CLASS_VIEW', 'REPORT_VIEW'] },
    ];

    for (const r of defaults) {
      await dataService.syncRecord('roles', { ...r, permissions: JSON.stringify(r.permissions) });
    }
    await fetchRoles();
    setIsCommitting(false);
  };

  if (isLoading && roles.length === 0) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Authority Matrix...</p>
    </div>
  );

  return (
    <div className="space-y-8 md:space-y-12 pb-24 max-w-7xl mx-auto px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Governance Protocol v4.0</p>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Authority Matrix</h2>
           <p className="text-slate-500 font-medium mt-3 text-sm md:text-lg">Binding institutional roles to functional modular logic.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={seedStandardRoles}
            disabled={isCommitting}
            className="bg-emerald-600 text-white px-8 py-5 rounded-2xl md:rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
          >
            🌱 Reset to Core Defaults
          </button>
          <button 
            onClick={handleOpenNew} 
            className="bg-slate-900 text-white px-8 py-5 rounded-2xl md:rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95"
          >
            ➕ Provision Custom Tier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8 px-4 md:px-0">
        {roles.map(role => {
          const rightsPercent = Math.round((role.permissions.length / (modules.length * 4)) * 100);
          return (
            <div key={role.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-10 shadow-sm hover:shadow-xl transition-all group flex flex-col relative overflow-hidden">
              {role.id.startsWith('CORE-') && (
                <div className="absolute top-4 right-4 bg-blue-50 text-blue-600 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">System Core</div>
              )}
              <div className="flex items-start gap-5 mb-8 md:mb-10">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-inner transition-all shrink-0 ${
                  role.base_role === UserRole.SUPER_ADMIN ? 'bg-slate-900 text-white' : 
                  role.base_role === UserRole.STUDENT ? 'bg-emerald-50 text-emerald-600' :
                  'bg-slate-50 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  {role.base_role === UserRole.SUPER_ADMIN ? '👑' : 
                   role.base_role === UserRole.STUDENT ? '🎓' : 
                   role.base_role === UserRole.TEACHER ? '👨‍🏫' : '🛡️'}
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-300">{role.id}</span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1 uppercase truncate">{role.name}</h3>
                  <p className="text-[9px] text-blue-400 font-bold uppercase mt-1 tracking-widest truncate">{role.base_role.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8 md:mb-10">
                 <div className="flex justify-between items-end mb-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Modular Access Depth</p>
                    <p className="text-[10px] font-black text-slate-900">{rightsPercent}%</p>
                 </div>
                 <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${rightsPercent}%` }}></div>
                 </div>
                 <div className="grid grid-cols-2 gap-2 mt-4">
                    {modules.slice(0, 4).map(m => {
                      const count = role.permissions.filter(p => p.startsWith(m.id)).length;
                      return (
                        <div key={m.id} className="flex items-center gap-2 p-2 bg-slate-50/50 rounded-xl border border-slate-100/50">
                           <span className="text-xs">{m.icon}</span>
                           <span className={`text-[8px] font-black uppercase ${count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{m.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                 </div>
              </div>

              <div className="flex gap-2 mt-auto">
                 <button onClick={() => handleOpenEdit(role)} className="flex-[3] py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95 shadow-lg hover:bg-blue-700 transition-all">Modify Logic</button>
                 {!role.id.startsWith('CORE-') && (
                   <button onClick={() => handleDeleteRole(role.id, role.name)} className="flex-1 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase transition-all hover:bg-rose-600 hover:text-white">🗑️</button>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-5xl w-full rounded-t-[3rem] md:rounded-[4rem] p-6 md:p-14 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 max-h-[96vh] overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex justify-between items-start mb-8 md:mb-12 sticky top-0 bg-white z-10 py-2">
                <div>
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none mb-2">{editingRole ? 'Modify Logic Artifact' : 'Provision Tier'}</h3>
                  <p className="text-slate-400 font-bold text-[9px] md:text-sm uppercase tracking-widest">Binding CRUD Handshakes to Identity Nodes</p>
                </div>
                <button onClick={() => setIsCreating(false)} className="w-10 h-10 md:w-14 md:h-14 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-xl md:rounded-3xl flex items-center justify-center text-slate-400 transition-all active:scale-90 shrink-0">✕</button>
              </div>
              
              <form onSubmit={handleCommitMatrix} className="space-y-8 md:space-y-12 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 bg-slate-50 p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-inner">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Institutional Tier Label</label>
                      <input 
                        type="text" required value={formName} 
                        onChange={e => setFormName(e.target.value)} 
                        placeholder="e.g. Senior Regional Auditor" 
                        className="w-full bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-6 text-sm font-black outline-none focus:ring-8 focus:ring-blue-500/5 shadow-sm uppercase placeholder:normal-case" 
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Logic Prototype (Base)</label>
                      <div className="relative">
                        <select 
                          value={formBaseRole} 
                          onChange={e => setFormBaseRole(e.target.value as UserRole)} 
                          className="w-full bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-6 text-[10px] md:text-xs font-black outline-none shadow-sm cursor-pointer appearance-none uppercase"
                        >
                          {Object.values(UserRole).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </select>
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[10px]">▼</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b-2 border-slate-50 pb-6 px-2 gap-4">
                     <div>
                        <p className="text-[10px] md:text-[14px] font-black text-slate-900 uppercase tracking-[0.2em]">Sovereign Modules ({modules.length} Nodes)</p>
                        <p className="text-[9px] text-blue-600 font-bold uppercase mt-1">Check individual CRUD rights to enable module nodes</p>
                     </div>
                     <div className="hidden lg:flex gap-10 xl:gap-14 pr-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                        <span className="w-14 text-center">Add</span>
                        <span className="w-14 text-center">View</span>
                        <span className="w-14 text-center">Edit</span>
                        <span className="w-14 text-center">Delete</span>
                     </div>
                  </div>

                  <div className="space-y-3 md:space-y-5">
                    {modules.map(module => (
                      <div key={module.id} className="bg-white border border-slate-100 rounded-[2rem] md:rounded-[3rem] p-5 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-blue-400 transition-all group hover:shadow-2xl hover:shadow-blue-500/5">
                        <div className="flex items-center gap-4 md:gap-8 min-w-0">
                           <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.8rem] bg-slate-50 flex items-center justify-center text-2xl md:text-4xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-50 shrink-0">
                              {module.icon}
                           </div>
                           <div className="min-w-0">
                              <h5 className="text-base md:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-none uppercase truncate mb-1 md:mb-2">{module.label}</h5>
                              <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">{module.category} Control Hub</p>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-4 sm:flex lg:justify-end gap-2 md:gap-6 xl:gap-10 pt-5 lg:pt-0 border-t lg:border-none border-slate-50">
                           {['ADD', 'VIEW', 'EDIT', 'DELETE'].map(type => {
                             const key = `${module.id}_${type}`;
                             const isActive = formPermissions.includes(key);
                             return (
                               <div key={type} className="flex flex-col items-center gap-2">
                                  <span className="lg:hidden text-[7px] font-black text-slate-300 uppercase mb-1">{type}</span>
                                  <button
                                    type="button"
                                    onClick={() => togglePermission(key)}
                                    className={`w-full h-14 sm:w-14 sm:h-14 xl:w-16 xl:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-xl transition-all border-2 active:scale-90 ${
                                      isActive 
                                      ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-500/20' 
                                      : 'bg-slate-50 text-slate-200 border-slate-100 hover:border-slate-300'
                                    }`}
                                  >
                                    {isActive ? '✓' : '○'}
                                  </button>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-10 border-t-2 border-slate-50">
                   <button type="button" onClick={() => setIsCreating(false)} className="w-full md:flex-1 py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all">Discard Changes</button>
                   <button 
                    type="submit" 
                    disabled={isCommitting}
                    className="w-full md:flex-[2] py-6 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {isCommitting ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           PROPAGATING...
                        </>
                     ) : 'Commit Authority Matrix'}
                   </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default RolePermissionManagement;