
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';

export interface ModulePermission {
  id: string;
  label: string;
  category: 'Access' | 'Structure' | 'Personnel' | 'Operations' | 'Intelligence';
}

export interface RoleDefinition {
  id: string;
  name: string;
  baseRole: UserRole;
  permissions: string[]; // Composite keys: 'CLASS_ADD', 'SCHOOL_VIEW', etc.
}

interface RolePermissionManagementProps {
  roles: RoleDefinition[];
  onUpdateRoles: (roles: RoleDefinition[]) => void;
}

const RolePermissionManagement: React.FC<RolePermissionManagementProps> = ({ roles, onUpdateRoles }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);

  // The 13 Institutional Modules (Final Specification)
  const modules: ModulePermission[] = [
    { id: 'CARD_READ', label: 'Hardware Card Read', category: 'Access' },
    { id: 'CAMPUS', label: 'Regional Campuses', category: 'Structure' },
    { id: 'CLUSTER', label: 'Institutional Clusters', category: 'Structure' },
    { id: 'SCHOOL', label: 'Educational Schools', category: 'Structure' },
    { id: 'CLASS', label: 'Classes & Grades', category: 'Structure' },
    { id: 'DEPARTMENT', label: 'Academic Departments', category: 'Personnel' },
    { id: 'DESIGNATION', label: 'Personnel Designations', category: 'Personnel' },
    { id: 'USERS', label: 'User Identities (Staff/Std)', category: 'Personnel' },
    { id: 'SHIFT', label: 'Time Windows (Shifts)', category: 'Operations' },
    { id: 'PRESENCE', label: 'Presence Tracking', category: 'Operations' },
    { id: 'INSPECTION', label: 'Audit Inspections', category: 'Operations' },
    { id: 'NFC_CARD', label: 'NFC Credential Management', category: 'Access' },
    { id: 'REPORT', label: 'Intelligence Artifacts', category: 'Intelligence' },
  ];

  const [formName, setFormName] = useState('');
  const [formBaseRole, setFormBaseRole] = useState<UserRole>(UserRole.TEACHER);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const handleOpenEdit = (role: RoleDefinition) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormBaseRole(role.baseRole);
    setFormPermissions([...role.permissions]);
    setIsCreating(true);
  };

  const handleOpenNew = () => {
    setEditingRole(null);
    setFormName('');
    setFormBaseRole(UserRole.TEACHER);
    setFormPermissions(['CARD_READ_VIEW', 'PRESENCE_VIEW']);
    setIsCreating(true);
  };

  const togglePermission = (permKey: string) => {
    setFormPermissions(prev => 
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  // Fixed Commit Function - Propagates to Parent
  const handleCommitMatrix = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName.trim()) {
      alert("Validation Error: Role Label is mandatory.");
      return;
    }

    const nextRole: RoleDefinition = {
      id: editingRole?.id || `R-CUST-${Date.now()}`,
      name: formName,
      baseRole: formBaseRole,
      permissions: [...formPermissions]
    };

    const nextRoles = roles.find(r => r.id === nextRole.id)
      ? roles.map(r => r.id === nextRole.id ? nextRole : r)
      : [...roles, nextRole];

    onUpdateRoles(nextRoles);
    setIsCreating(false);
    
    alert(`Authority Matrix Propagated: Access logic for ${nextRole.name} updated globally.`);
  };

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Authority Matrix</h2>
          <p className="text-slate-500 font-medium mt-3 text-lg">Granular CRUD controls for exactly {modules.length} institutional modules</p>
        </div>
        <button 
          onClick={handleOpenNew} 
          className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
        >
          ➕ Provision Custom Tier
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-[3.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-50 text-blue-600">ID: {role.id}</span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-3">{role.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Base Prototype: {role.baseRole}</p>
              </div>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl border border-slate-100 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">🛡️</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10 flex-1">
               {modules.map(m => {
                 const count = role.permissions.filter(p => p.startsWith(m.id)).length;
                 if (count === 0) return null;
                 return (
                   <div key={m.id} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1 hover:border-blue-300 transition-colors">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{m.label}</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase">{count}/4 Rights</p>
                   </div>
                 );
               })}
            </div>

            <button onClick={() => handleOpenEdit(role)} className="w-full py-5 bg-slate-100 text-slate-700 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95 mt-6">🛠️ Configure Tier Logic</button>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-12 rounded-[4rem] border border-blue-100 relative overflow-hidden">
         <div className="absolute -bottom-10 -right-10 opacity-5 text-[12rem]">⚖️</div>
         <h4 className="text-blue-900 font-black text-sm uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
           <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
           Data Sovereignty Protocol
         </h4>
         <p className="text-xs text-blue-800 leading-relaxed font-medium max-w-4xl">
           Notice: Institutional data (Classes, Departments, Grades) is bound to the <strong>School Node</strong>. If a School Admin is replaced, the incoming admin automatically inherits all historical and active data artifacts linked to that school jurisdiction. Data visibility is determined by Jurisdictional Binding, not individual user IDs.
         </p>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-white max-w-6xl w-full rounded-[4rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">{editingRole ? `Edit: ${editingRole.name}` : 'Provision Authority Tier'}</h3>
                  <p className="text-slate-500 font-medium text-lg uppercase tracking-widest">Logic Mapping Panel: Hierarchical CRUD Control</p>
                </div>
                <button onClick={() => setIsCreating(false)} className="w-14 h-14 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-3xl text-slate-400 transition-colors">✕</button>
              </div>
              
              <form onSubmit={handleCommitMatrix} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 shadow-inner">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Role Custom Label</label>
                      <input 
                        type="text" required value={formName} 
                        onChange={e => setFormName(e.target.value)} 
                        placeholder="e.g. Senior Regional Auditor" 
                        className="w-full bg-white border border-slate-200 rounded-3xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm" 
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Base Access Profile</label>
                      <select 
                        value={formBaseRole} 
                        onChange={e => setFormBaseRole(e.target.value as UserRole)} 
                        className="w-full bg-white border border-slate-200 rounded-3xl p-5 text-xs font-black outline-none shadow-sm cursor-pointer appearance-none"
                      >
                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-12">
                  <div className="flex justify-between items-end border-b-2 border-slate-100 pb-6 px-4">
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Modules ({modules.length} Nodes)</p>
                     <div className="hidden lg:flex gap-12 pr-12 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span className="w-16 text-center">Add</span>
                        <span className="w-16 text-center">View</span>
                        <span className="w-16 text-center">Edit</span>
                        <span className="w-16 text-center">Delete</span>
                     </div>
                  </div>

                  <div className="space-y-6">
                    {modules.map(module => (
                      <div key={module.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:border-blue-400 transition-all group hover:shadow-xl hover:shadow-blue-500/5">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                              {module.category === 'Access' ? '🔑' : module.category === 'Structure' ? '🏙️' : module.category === 'Personnel' ? '👥' : module.category === 'Operations' ? '🕒' : '📈'}
                           </div>
                           <div>
                              <h5 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-none">{module.label}</h5>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-2">{module.category} Control Cluster</p>
                           </div>
                        </div>
                        
                        <div className="flex justify-between lg:justify-end gap-3 lg:gap-12">
                           {['ADD', 'VIEW', 'EDIT', 'DELETE'].map(type => {
                             const key = `${module.id}_${type}`;
                             const isActive = formPermissions.includes(key);
                             return (
                               <div key={type} className="flex flex-col items-center gap-3">
                                  <span className="lg:hidden text-[8px] font-black text-slate-300 uppercase">{type}</span>
                                  <button
                                    type="button"
                                    onClick={() => togglePermission(key)}
                                    className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center text-xs transition-all border-2 ${
                                      isActive 
                                      ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-200 active:scale-90' 
                                      : 'bg-slate-50 text-slate-300 border-slate-100 hover:border-slate-200'
                                    }`}
                                  >
                                    {type === 'ADD' ? '+' : type === 'VIEW' ? '👁️' : type === 'EDIT' ? '✎' : '🗑️'}
                                  </button>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-6 pt-10 border-t-2 border-slate-100">
                   <button type="button" onClick={() => setIsCreating(false)} className="flex-1 px-8 py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Discard Changes</button>
                   <button 
                    type="submit" 
                    className="flex-1 px-10 py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                   >
                     Commit Authority Matrix
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
