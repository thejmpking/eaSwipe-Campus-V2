
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface UserProfileProps {
  user: UserIdentity;
  onBack: () => void;
  onUpdateUser?: (updated: UserIdentity) => void;
  onDeleteUser?: (id: string) => void;
  onOversight?: (id: string, role: UserRole) => void;
  currentUserRole: UserRole;
  currentUserId: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onBack, onUpdateUser, onDeleteUser, onOversight, currentUserRole, currentUserId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [form, setForm] = useState<UserIdentity>({ ...user });
  
  // Migration Request States
  const [isRequestingMigration, setIsRequestingMigration] = useState(false);
  const [migrationForm, setMigrationForm] = useState({ targetCluster: '', reason: '' });
  const [availableClusters, setAvailableClusters] = useState<any[]>([]);

  useEffect(() => {
    if (isRequestingMigration) {
      dataService.getClusters().then(setAvailableClusters);
    }
  }, [isRequestingMigration]);

  // JURISDICTIONAL HELPER: Enforce edit protection at profile level
  const canEditTarget = useMemo(() => {
    // Super Admin absolute power
    if (currentUserRole === UserRole.SUPER_ADMIN) return true;

    // Self Edit Bypass
    if (user.id === currentUserId) return true;

    // School Admin specific authority locks
    if (currentUserRole === UserRole.SCHOOL_ADMIN) {
      const protectedFromSchoolAdmin = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.CAMPUS_HEAD,
        UserRole.RESOURCE_PERSON,
        UserRole.SCHOOL_ADMIN
      ];
      if (protectedFromSchoolAdmin.includes(user.role)) return false;
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
      if (protectedTargets.includes(user.role)) {
        return false;
      }
    }
    return true;
  }, [currentUserRole, user.role, user.id, currentUserId]);

  // OVERSIGHT HELPER: Determine if current user can perform oversight on target
  const canViewOversight = useMemo(() => {
    if (!onOversight || isEditing || user.id === currentUserId) return false;
    
    // RP Oversight Rule: Only School Admin and above can oversee Resource Persons
    if (user.role === UserRole.RESOURCE_PERSON) {
      const authorizedOverseers = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN];
      return authorizedOverseers.includes(currentUserRole);
    }
    
    return true;
  }, [onOversight, isEditing, user.id, user.role, currentUserId, currentUserRole]);

  // AUTHORITY HELPER: Only Super Admin and Admin can decommission users
  const canDelete = (currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.ADMIN) && user.id !== currentUserId;

  // SECURITY HELPER: Check if user is authorized to manage PINs
  const canManagePin = useMemo(() => {
    const authorizedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RESOURCE_PERSON, UserRole.SCHOOL_ADMIN];
    return authorizedRoles.includes(currentUserRole);
  }, [currentUserRole]);

  const handleSave = async () => {
    setIsCommitting(true);
    try {
      // PERSISTENT SYNC: Write the modified artifact to the SQL ledger
      const res = await dataService.syncRecord('users', form);
      
      if (res.status === 'success') {
        onUpdateUser?.(form);
        setIsEditing(false);
      } else {
        // SQL SCHEMA ERROR DETECTION
        if (res.message?.includes('PGRST204') || res.message?.toLowerCase().includes('whatsapp')) {
          const sqlFix = "ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT;";
          if (confirm(`DATABASE SCHEMA MISMATCH: The 'whatsapp' column is missing from your SQL table.\n\nWould you like to copy the corrective SQL command to your clipboard?`)) {
            navigator.clipboard.writeText(sqlFix);
            alert("SQL Copied! Run it in your Supabase/Postgres SQL editor to fix this error permanently.");
          }
        } else {
          alert(`Registry Error: ${res.message}`);
        }
      }
    } catch (err) {
      alert("Infrastructure Error: Failed to communicate with identity vault.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDeleteIdentity = async () => {
    if (!canDelete) return;
    if (window.confirm(`PURGE CONFIRMATION: Permanently decommissioning identity artifact "${user.name}"? This action is immutable and will dissolve all temporal bindings in the ledger.`)) {
      setIsCommitting(true);
      try {
        const res = await dataService.deleteRecord('users', user.id);
        if (res.status === 'success') {
          onDeleteUser?.(user.id);
          onBack(); // Return to the list context
        } else {
          alert(`Handshake Failure: ${res.message}`);
        }
      } catch (err) {
        alert("Infrastructure Fault during decommissioning.");
      } finally {
        setIsCommitting(false);
      }
    }
  };

  const submitMigrationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migrationForm.targetCluster || !migrationForm.reason.trim()) {
      alert("Validation Error: Destination node and justification artifact are mandatory.");
      return;
    }
    setIsCommitting(true);
    
    const requestArtifact = {
      id: `REQ-${Date.now()}`,
      user_id: user.id,
      user_name: user.name,
      current_cluster: user.cluster || 'None',
      requested_cluster: migrationForm.targetCluster,
      reason: migrationForm.reason,
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    try {
      const res = await dataService.syncRecord('cluster_requests', requestArtifact);
      if (res.status === 'success') {
        alert(`MIGRATION LOGGED: Your request to join ${migrationForm.targetCluster} has been dispatched to the Resource Person's ledger for verification.`);
        setIsRequestingMigration(false);
        setMigrationForm({ targetCluster: '', reason: '' });
      } else {
        alert(`Sync Error: ${res.message}`);
      }
    } catch (err) {
      alert("Infrastructure Error during migration dispatch.");
    } finally {
      setIsCommitting(false);
    }
  };

  const getRankColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'bg-slate-900 text-white';
      case UserRole.ADMIN: return 'bg-blue-600 text-white';
      case UserRole.TEACHER: return 'bg-indigo-50 text-indigo-600';
      case UserRole.STUDENT: return 'bg-emerald-50 text-emerald-600';
      default: return 'bg-slate-500 text-white';
    }
  };

  const expiryArtifact = useMemo(() => {
    const expStr = user.experience;
    if (!expStr || !expStr.includes('|')) return { date: 'No Artifact', status: 'none' };
    
    try {
      const parts = expStr.split('|');
      const expPart = parts.find(p => p.toLowerCase().includes('exp:'));
      if (!expPart) return { date: 'Not Bound', status: 'none' };
      
      const dateVal = expPart.split(':')[1]?.trim() || '';
      if (!dateVal) return { date: 'Invalid', status: 'none' };

      const expiryDate = new Date(dateVal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thirtyDays = new Date();
      thirtyDays.setDate(today.getDate() + 30);

      if (expiryDate < today) return { date: dateVal, status: 'expired' };
      if (expiryDate <= thirtyDays) return { date: dateVal, status: 'upcoming' };
      return { date: dateVal, status: 'valid' };
    } catch (e) {
      return { date: 'Format Err', status: 'none' };
    }
  }, [user.experience]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-500 pb-24 px-2 sm:px-0">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 active:scale-90 transition-all shadow-sm">←</button>
        <div className="flex gap-2">
           {isEditing ? (
             <>
               <button disabled={isCommitting} onClick={() => setIsEditing(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest disabled:opacity-50">Cancel</button>
               {canDelete && (
                 <button 
                   onClick={handleDeleteIdentity}
                   disabled={isCommitting}
                   className="px-5 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                 >
                   <span>🗑️</span> Decommission
                 </button>
               )}
               <button 
                 onClick={handleSave} 
                 disabled={isCommitting}
                 className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
               >
                 {isCommitting ? (
                   <>
                     <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     Syncing...
                   </>
                 ) : 'Commit Artifact'}
               </button>
             </>
           ) : (
             <>
               {currentUserRole === UserRole.TEACHER && user.id === currentUserId && (
                 <button 
                   onClick={() => setIsRequestingMigration(true)} 
                   className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2"
                 >
                   <span>📂</span> Cluster Request
                 </button>
               )}
               {canViewOversight && (
                 <button 
                   onClick={() => onOversight!(user.id, user.role)} 
                   className="hidden sm:flex px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 items-center gap-2"
                 >
                   <span>📊</span> Active Oversite
                 </button>
               )}
               {canEditTarget && (
                 <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95">Edit Identity</button>
               )}
             </>
           )}
        </div>
      </div>

      {/* IDENTITY HERO */}
      <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-14 border border-slate-100 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-9xl font-black -rotate-12 pointer-events-none uppercase">{user.role.split('_')[0]}</div>
         
         <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] bg-slate-50 border-[6px] border-white shadow-2xl overflow-hidden shrink-0">
               <img src={`https://picsum.photos/seed/${user.id}/400/400`} className="w-full h-full object-cover" alt="profile" />
            </div>
            
            <div className="text-center md:text-left flex-1 min-w-0">
               <div className="inline-flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${getRankColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Verified Artifact</span>
               </div>
               <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none mb-4 truncate uppercase">
                 {isEditing ? (
                    <input 
                      className="bg-slate-50 border-b-2 border-blue-500 w-full outline-none focus:bg-white px-2 py-1" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                    />
                 ) : user.name}
               </h2>
               <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
                  <StatPill label="Global ID" value={user.id} />
                  <StatPill label="Avg. Yield" value={user.yield || '94.2%'} />
                  <StatPill label="Status" value={user.status} color="text-emerald-600" />
               </div>
               
               {canViewOversight && (
                 <div className="mt-8 flex justify-center md:justify-start">
                    <button 
                      onClick={() => onOversight!(user.id, user.role)} 
                      className="sm:hidden w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95"
                    >
                      <span>📊</span> Begin Active Oversite
                    </button>
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* CORE REGISTRY DATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Jurisdiction Column */}
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-1 flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
               Jurisdictional Nodes
            </h3>
            <div className="space-y-6">
               <ProfileItem 
                  label="Working School" 
                  value={isEditing && (currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.ADMIN || (currentUserRole === UserRole.SCHOOL_ADMIN && user.id === currentUserId)) ? form.school : (user.school || 'NOT_ASSIGNED')} 
                  icon="🏫" 
                  isEditing={isEditing && (currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.ADMIN || (currentUserRole === UserRole.SCHOOL_ADMIN && user.id === currentUserId))} 
                  onChange={(v: string) => setForm({...form, school: v})} 
               />
               <ProfileItem 
                  label="Cluster Hub" 
                  value={isEditing && (currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.ADMIN || (currentUserRole === UserRole.SCHOOL_ADMIN && user.id === currentUserId)) ? form.cluster : (user.cluster || 'NOT_LINKED')} 
                  icon="📍" 
                  isEditing={isEditing && (currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.ADMIN || (currentUserRole === UserRole.SCHOOL_ADMIN && user.id === currentUserId))} 
                  onChange={(v: string) => setForm({...form, cluster: v})} 
                  color="text-blue-600"
               />
               <ProfileItem 
                  label="Physical Address" 
                  value={isEditing ? (form.address || '') : (user.address || 'NO_ADDRESS_BOUND')} 
                  icon="🏠" 
                  isEditing={isEditing} 
                  onChange={(v: string) => setForm({...form, address: v})} 
               />
            </div>
         </div>

         {/* Connectivity Column */}
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-1 flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
               Connectivity Nodes
            </h3>
            <div className="space-y-6">
               <ProfileItem 
                  label="Institutional Email" 
                  value={isEditing ? form.email : user.email} 
                  icon="📧" 
                  isEditing={isEditing} 
                  onChange={(v: string) => setForm({...form, email: v})} 
                  lowercase
               />
               <ProfileItem 
                  label="Academic Designation" 
                  value={isEditing ? (form.designation || '') : (user.designation || 'General Personnel')} 
                  icon="🏷️" 
                  isEditing={isEditing} 
                  onChange={(v: string) => setForm({...form, designation: v})} 
               />
               
               {/* WHATSAPP ACTION HUB */}
               <div className="space-y-2.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">WhatsApp Connectivity</label>
                  {isEditing ? (
                    <div className="flex">
                       <span className="flex items-center justify-center bg-slate-100 border-2 border-r-0 border-slate-100 rounded-l-xl px-3 text-[10px] font-black text-slate-400 tracking-tighter shrink-0">+91</span>
                       <input 
                         className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-r-xl px-4 py-3 text-xs font-black outline-none focus:border-emerald-400 shadow-inner" 
                         value={form.whatsapp} 
                         onChange={e => setForm({...form, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
                         placeholder="10-digit number"
                       />
                    </div>
                  ) : user.whatsapp ? (
                    <a 
                      href={`https://wa.me/91${user.whatsapp.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full p-5 bg-emerald-600 border-2 border-emerald-500 rounded-[1.5rem] shadow-xl shadow-emerald-500/10 group transition-all active:scale-95"
                    >
                       <div className="flex items-center gap-4">
                          <span className="text-2xl group-hover:scale-110 transition-transform">💬</span>
                          <div className="min-w-0">
                             <p className="text-xs font-black text-white uppercase leading-none">Open WhatsApp Chat</p>
                             <p className="text-[8px] font-black text-emerald-100 uppercase tracking-widest mt-1">+91 {user.whatsapp}</p>
                          </div>
                       </div>
                       <span className="text-white opacity-40 group-hover:opacity-100 text-xs font-black">START →</span>
                    </a>
                  ) : (
                    <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-center">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No communication node bound</p>
                    </div>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* PRIVILEGED SECURITY PIN CONFIGURATION */}
      {isEditing && canManagePin && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-bottom-4">
          <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.25em] px-1 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
             Sovereign Security Node
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
             <div className="space-y-6">
                <ProfileItem 
                    label="Identity Security PIN (4-Digits)" 
                    value={form.password || ''} 
                    icon="🔐" 
                    isEditing={true} 
                    onChange={(v: string) => setForm({...form, password: v.replace(/\D/g, '').slice(0, 4)})} 
                />
                <p className="text-[10px] text-slate-400 font-medium px-1 leading-relaxed">
                  Enter a numeric 4-digit PIN for high-fidelity terminal handshakes. This artifact is used for secure biometric and NFC resolution.
                </p>
             </div>
             <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100/50">
                <p className="text-[9px] font-black text-rose-900 uppercase tracking-widest mb-2">Protocol Advisory</p>
                <p className="text-[10px] text-rose-800 leading-relaxed">Updating this artifact will immediately invalidate existing temporal session tokens. Users must use the new PIN for the next terminal handshake.</p>
             </div>
          </div>
        </div>
      )}

      {/* ADDITIONAL METADATA & HARDWARE VALIDITY */}
      <div className="bg-slate-50 p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-inner">
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <MetaInfo label="Last Pulse" value={user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'N/A'} />
            <MetaInfo label="Registry Entry" value={user.dob || 'Unknown'} />
            <MetaInfo label="Blood Artifact" value={user.bloodGroup || 'O+'} />
            <MetaInfo 
              label="Hardware Expiry" 
              value={expiryArtifact.date} 
              color={
                expiryArtifact.status === 'expired' ? 'text-rose-600' : 
                expiryArtifact.status === 'upcoming' ? 'text-amber-600' : 
                'text-emerald-600'
              }
              icon={expiryArtifact.status === 'expired' ? '🚫' : expiryArtifact.status === 'upcoming' ? '⚠️' : '✅'}
            />
         </div>
      </div>

      {/* CLUSTER MIGRATION REQUEST MODAL */}
      {isRequestingMigration && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[250] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 overflow-y-auto max-h-[95vh] custom-scrollbar">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Jurisdictional Transfer</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Formal Migration Request</p>
                 </div>
                 <button onClick={() => setIsRequestingMigration(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">✕</button>
              </div>

              <form onSubmit={submitMigrationRequest} className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Destination Cluster Node</label>
                    <div className="relative">
                       <select 
                        required 
                        value={migrationForm.targetCluster} 
                        onChange={e => setMigrationForm({...migrationForm, targetCluster: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black uppercase appearance-none cursor-pointer outline-none focus:ring-8 focus:ring-blue-500/5 shadow-inner"
                       >
                          <option value="">Select Destination...</option>
                          {availableClusters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                       </select>
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[8px]">▼</span>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Justification for Migration <span className="text-rose-500">*</span></label>
                    <textarea 
                      required
                      value={migrationForm.reason}
                      onChange={e => setMigrationForm({...migrationForm, reason: e.target.value})}
                      placeholder="Please provide a valid professional or personal reason for this jurisdictional change. Resource Persons must verify this justification artifact."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-medium outline-none h-40 resize-none focus:ring-8 focus:ring-blue-500/5 shadow-inner"
                    />
                 </div>

                 <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                       <span>⚠️</span> Policy Mandate
                    </p>
                    <p className="text-[10px] text-amber-800 leading-relaxed font-bold">Requests without valid professional or logistical artifacts will be immediately rejected by the regional auditor.</p>
                 </div>

                 <div className="flex gap-4">
                    <button type="button" onClick={() => setIsRequestingMigration(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Discard</button>
                    <button 
                      type="submit" 
                      disabled={isCommitting}
                      className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                       {isCommitting ? 'HANDSHAKING...' : 'DISPATCH REQUEST'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* SYSTEM ADVISORY */}
      <div className="bg-blue-50 p-8 rounded-[3rem] border border-blue-100">
         <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>🛡️</span> Institutional Security Advisory
         </h4>
         <p className="text-xs text-blue-800 leading-relaxed font-medium">
            This identity artifact is subject to periodic cryptographic validation. Hardware access through NFC terminals is strictly bound to the <strong>Hardware Expiry</strong> node displayed above. Expired credentials will be automatically blacklisted by the gate resolution server.
         </p>
      </div>
    </div>
  );
};

const StatPill = ({ label, value, color = "text-slate-500" }: any) => (
  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-xs font-black uppercase ${color}`}>{value}</p>
  </div>
);

const ProfileItem = ({ label, value, icon, isEditing, onChange, color = "text-slate-900", lowercase = false }: any) => (
  <div className="flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg shadow-inner">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
      {isEditing ? (
        <input 
          className="w-full bg-slate-50 border-b border-blue-200 text-sm font-bold outline-none focus:border-blue-500 py-0.5" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
        />
      ) : (
        <p className={`text-sm font-black truncate leading-tight ${lowercase ? '' : 'uppercase'} ${color}`}>{value}</p>
      )}
    </div>
  </div>
);

const MetaInfo = ({ label, value, color = "text-slate-900", icon }: any) => (
  <div className="space-y-1 text-center md:text-left">
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <div className="flex items-center justify-center md:justify-start gap-1.5">
       {icon && <span className="text-[10px]">{icon}</span>}
       <p className={`text-xs font-black uppercase tracking-tight ${color}`}>{value}</p>
    </div>
  </div>
);

export default UserProfile;
