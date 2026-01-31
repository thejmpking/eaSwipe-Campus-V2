
import React, { useState } from 'react';
import { UserRole } from '../types';

interface ReportPermission {
  category: string;
  description: string;
  isSensitive: boolean;
  access: Record<UserRole, { canView: boolean; canExport: boolean }>;
}

const ReportAccessControl: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  // Fix: Added missing SUPER_ADMIN role to each access record to satisfy Record<UserRole, T>
  const [permissions, setPermissions] = useState<ReportPermission[]>([
    {
      category: 'Institutional Attendance',
      description: 'Aggregated yield data and punctuality trends across entities.',
      isSensitive: false,
      access: {
        [UserRole.SUPER_ADMIN]: { canView: true, canExport: true },
        [UserRole.ADMIN]: { canView: true, canExport: true },
        [UserRole.CAMPUS_HEAD]: { canView: true, canExport: true },
        [UserRole.RESOURCE_PERSON]: { canView: true, canExport: false },
        [UserRole.SCHOOL_ADMIN]: { canView: true, canExport: true },
        [UserRole.TEACHER]: { canView: true, canExport: false },
        [UserRole.STUDENT]: { canView: true, canExport: false },
      }
    },
    {
      category: 'Unannounced Inspections',
      description: 'Detailed compliance scores and auditor observations.',
      isSensitive: true,
      access: {
        [UserRole.SUPER_ADMIN]: { canView: true, canExport: true },
        [UserRole.ADMIN]: { canView: true, canExport: true },
        [UserRole.CAMPUS_HEAD]: { canView: true, canExport: true },
        [UserRole.RESOURCE_PERSON]: { canView: true, canExport: true },
        [UserRole.SCHOOL_ADMIN]: { canView: false, canExport: false },
        [UserRole.TEACHER]: { canView: false, canExport: false },
        [UserRole.STUDENT]: { canView: false, canExport: false },
      }
    },
    {
      category: 'Medical & Personal Leave',
      description: 'Employee absence reasons and physician-verified records.',
      isSensitive: true,
      access: {
        [UserRole.SUPER_ADMIN]: { canView: true, canExport: true },
        [UserRole.ADMIN]: { canView: true, canExport: true },
        [UserRole.CAMPUS_HEAD]: { canView: true, canExport: true },
        [UserRole.RESOURCE_PERSON]: { canView: false, canExport: false },
        [UserRole.SCHOOL_ADMIN]: { canView: true, canExport: true },
        [UserRole.TEACHER]: { canView: false, canExport: false },
        [UserRole.STUDENT]: { canView: false, canExport: false },
      }
    },
    {
      category: 'Professional Development',
      description: 'Shift participation and skill certification credits.',
      isSensitive: false,
      access: {
        [UserRole.SUPER_ADMIN]: { canView: true, canExport: true },
        [UserRole.ADMIN]: { canView: true, canExport: true },
        [UserRole.CAMPUS_HEAD]: { canView: true, canExport: true },
        [UserRole.RESOURCE_PERSON]: { canView: true, canExport: true },
        [UserRole.SCHOOL_ADMIN]: { canView: true, canExport: true },
        [UserRole.TEACHER]: { canView: true, canExport: true },
        [UserRole.STUDENT]: { canView: false, canExport: false },
      }
    }
  ]);

  const toggleAccess = (catIndex: number, role: UserRole, type: 'canView' | 'canExport') => {
    if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return; // Admins cannot be restricted
    const newPerms = [...permissions];
    newPerms[catIndex].access[role][type] = !newPerms[catIndex].access[role][type];
    // Rule: If you can't view, you can't export
    if (type === 'canView' && !newPerms[catIndex].access[role].canView) {
      newPerms[catIndex].access[role].canExport = false;
    }
    // Rule: If you can export, you must be able to view
    if (type === 'canExport' && newPerms[catIndex].access[role].canExport) {
      newPerms[catIndex].access[role].canView = true;
    }
    setPermissions(newPerms);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Institutional Data Firewall Synchronized. Reporting visibility has been updated across all jurisdictions.");
    }, 1200);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Intelligence Firewall</h2>
          <p className="text-slate-500 font-medium mt-3">Defining data extraction rights and export accountability</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isSaving ? 'Updating Firewall...' : '🔒 Commit Data Policy'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          
          {/* 2. Access Matrix */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">Visibility Matrix</h3>
                 <p className="text-xs text-slate-500 font-medium mt-1">Hierarchical control over extraction artifacts</p>
               </div>
               <div className="flex gap-2">
                 <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-slate-200">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">View</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-slate-200">
                   <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Export</span>
                 </div>
               </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[240px]">Report Domain</th>
                    {Object.values(UserRole).map(role => (
                      <th key={role} className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        {role.replace('_', ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {permissions.map((perm, idx) => (
                    <tr key={perm.category} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-black text-slate-800">{perm.category}</span>
                          {perm.isSensitive && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded">Sensitive</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">{perm.description}</p>
                      </td>
                      {Object.values(UserRole).map(role => (
                        <td key={role} className="px-4 py-6">
                          <div className="flex flex-col items-center gap-2">
                             <button 
                                onClick={() => toggleAccess(idx, role, 'canView')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  perm.access[role].canView ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm' : 'bg-slate-50 text-slate-200 border border-slate-100'
                                }`}
                             >
                               👁️
                             </button>
                             <button 
                                onClick={() => toggleAccess(idx, role, 'canExport')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  perm.access[role].canExport ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' : 'bg-slate-50 text-slate-200 border border-slate-100'
                                }`}
                             >
                               💾
                             </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Global Format Controls */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
             <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Export Sanitization Engine</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Excel Availability</label>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Admin/School Only</span>
                      </div>
                      <p className="text-[9px] text-slate-400 italic leading-relaxed">Raw data exports are restricted to high-tier roles to prevent unverified manipulation of institutional yields.</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div>
                        <p className="text-xs font-black text-blue-900 leading-none">PII Masking</p>
                        <p className="text-[9px] text-blue-600 font-bold uppercase mt-1">Hide personal student IDs</p>
                      </div>
                      <button className="w-10 h-6 bg-blue-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                   </div>
                   <div className="flex items-center justify-between p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div>
                        <p className="text-xs font-black text-blue-900 leading-none">Watermark Exports</p>
                        <p className="text-[9px] text-blue-600 font-bold uppercase mt-1">Include digital signature</p>
                      </div>
                      <button className="w-10 h-6 bg-blue-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* 4. Logic Sidebars */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">🔐</div>
            <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">Data Protection Logic</h4>
            
            <div className="space-y-8">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   Unrestricted Data Risk
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Allowing lower-tier roles to export mass data (e.g. all student addresses) creates an <strong>Institutional Liability</strong>. We separate "Screen Visibility" from "Physical Download" to protect the institution from data leaks.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   Accountability Through Access
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Report access isn't just about privacy; it's about <strong>Operational Integrity</strong>. If a Teacher can export high-level Cluster data, the clear chain of jurisdictional authority is weakened.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                   Format Strategy
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Editable formats (Excel) are reserved for roles performing <strong>Resource Planning</strong>. Fixed formats (PDF) are used for verification by roles performing <strong>Record Maintenance</strong>.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
             <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <span>🛡️</span> Security Scorecard
             </h4>
             <div className="space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Privacy Shield</span>
                  <span className="text-emerald-600">Maximized</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>PII Exposure</span>
                  <span className="text-blue-600">Restricted</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Export Logging</span>
                  <span className="text-blue-600">100% Active</span>
               </div>
             </div>
             <p className="text-[9px] text-indigo-700 font-bold mt-8 italic px-1">
               "Information is power. In a managed hierarchy, power is distributed by authorized permission, not by default access."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportAccessControl;
