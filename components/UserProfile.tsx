
import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';

interface UserProfileProps {
  user: UserIdentity;
  loggedInRole: UserRole;
  onBack: () => void;
  onDeleteIdentity?: (id: string) => void;
  onUpdateUser?: (updated: UserIdentity) => void;
  onNavigateToRoles?: () => void;
  onViewOperationalDetails?: (userId: string, role: UserRole) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, loggedInRole, onBack, onDeleteIdentity, onUpdateUser, onNavigateToRoles, onViewOperationalDetails }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserIdentity>({ ...user });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditForm({ ...user });
  }, [user]);

  const schoolOptions = ["North Valley High", "East Side Primary", "Central Secondary", "Valley Middle School", "River Primary", "Waterfront Tech", "Command Center", "Campus Hub", "AL Hidaya Iringallur", "Rayhan Valley Kadampuzha"];
  const clusterOptions = ["Central Business Cluster", "Riverside Academic Cluster", "Northern Heights Cluster", "Southern Metro Cluster", "Global Root", "Vengara Cluster", "Tirur Cluster"];
  
  const isAdmin = loggedInRole === UserRole.ADMIN || loggedInRole === UserRole.SUPER_ADMIN;
  const isManagement = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.RESOURCE_PERSON].includes(loggedInRole);
  const canEdit = isAdmin || user.id === editForm.id;

  const handleSave = () => {
    if (onUpdateUser) {
      onUpdateUser(editForm);
    }
    alert("Institutional Record Updated and Synchronized.");
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({ ...user });
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditForm({ ...editForm, nfcUrl: base64String }); // We'll store avatar string in a dedicated field if needed, for now repurposing pointer or state
        alert("Image artifact processed for upload. Click Save to commit.");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteIdentity = () => {
    if (window.confirm(`PURGE CONFIRMATION: You are about to permanently delete the identity record for ${user.name}.`)) {
      if (onDeleteIdentity) {
        onDeleteIdentity(user.id);
      }
      onBack();
    }
  };

  // Resolve preview image
  const avatarPreview = editForm.nfcUrl?.startsWith('data:image') 
    ? editForm.nfcUrl 
    : `https://picsum.photos/seed/${user.id}/300/300`;

  return (
    <div className="space-y-6 md:space-y-8 pb-20 animate-in fade-in slide-in-from-right-5 duration-500 max-w-6xl mx-auto px-4 md:px-0">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*" 
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="group flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-colors w-fit"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-500 group-hover:text-blue-600 transition-all shadow-sm text-sm">
            ←
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Registry Return</span>
        </button>
        
        {isManagement && (
          <div className="flex flex-col sm:flex-row gap-3">
            {!isEditing ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => onViewOperationalDetails?.(user.id, user.role)}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                >
                  🔭 Operational Hub
                </button>
                
                {canEdit && (
                  <>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                    >
                      ✏️ Edit Identity
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={handleDeleteIdentity}
                        className="w-11 h-11 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center"
                        title="Delete User Identity"
                      >
                        🗑️
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={handleCancel}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  💾 Save & Sync
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-16 md:h-20 bg-slate-900"></div>
        <div className="relative z-10 p-6 md:p-10 pt-16 md:pt-24 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-12">
           <div className="w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] md:rounded-[3rem] border-4 md:border-[8px] border-white shadow-2xl overflow-hidden bg-slate-100 group relative shrink-0 -mt-10 md:-mt-16">
              <img src={avatarPreview} alt={user.name} className="w-full h-full object-cover" />
              {isEditing && (
                <button 
                  onClick={triggerUpload}
                  className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border-none"
                >
                   <span className="text-xl mb-1">📤</span>
                   <span className="text-white text-[8px] font-black uppercase tracking-widest text-center px-4">Upload New</span>
                </button>
              )}
           </div>
           
           <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex flex-col md:flex-row md:items-center flex-wrap gap-3 md:gap-6 mb-5">
                 {isEditing ? (
                   <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2 w-full md:w-auto outline-none focus:ring-4 focus:ring-blue-500/10"
                   />
                 ) : (
                   <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none break-words">{user.name}</h2>
                 )}
                 <div className="flex items-center justify-center md:justify-start gap-3 shrink-0">
                    <span className="px-4 py-1.5 bg-blue-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blue-500/20 whitespace-nowrap">
                        {user.role.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-xl shrink-0">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Registry Verified</span>
                    </div>
                 </div>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                 <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-black">ID:</span> 
                    <span className="text-slate-900 font-black">{user.id}</span>
                 </div>
                 <span className="hidden md:block w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                 <p className="text-slate-800 font-black">
                    {user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN ? 'System Authority' : user.designation}
                 </p>
                 <span className="hidden md:block w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                 <span className="text-slate-500 font-black break-words">{user.assignment}</span>
              </div>
           </div>
           
           <div className="flex gap-3 md:gap-5 mt-2 md:mt-2 shrink-0">
              <QuickStat label="Yield" value={user.yield || 'N/A'} icon="📊" />
              <QuickStat label="Tenure" value={user.experience || 'New'} icon="🏆" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 space-y-6 md:space-y-10">
           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-8 md:mb-12 flex items-center gap-4">
                 <span className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🔒</span> 
                 Security & Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <InfoField 
                    isEditing={isEditing} label="Login Password" icon="🔑" type="password"
                    value={isEditing ? (editForm.password || '') : '••••••••'}
                    onChange={v => setEditForm({...editForm, password: v})}
                  />
                 <InfoField 
                    isEditing={isEditing} label="NFC Pointer URL" icon="📡"
                    value={isEditing ? (editForm.nfcUrl || '') : (user.nfcUrl?.startsWith('data:') ? 'Image Link Sync' : (user.nfcUrl || 'Not Assigned'))}
                    onChange={v => setEditForm({...editForm, nfcUrl: v})}
                  />
              </div>
           </div>

           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-8 md:mb-12 flex items-center gap-4">
                 <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🏗️</span> 
                 Hierarchical Mapping
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                 <div className="md:col-span-2 xl:col-span-1">
                  <InfoField 
                    isEditing={isEditing} label="Primary Assignment" icon="🏫" 
                    value={isEditing ? editForm.assignment : user.assignment}
                    options={user.role === UserRole.TEACHER || user.role === UserRole.STUDENT ? schoolOptions : clusterOptions}
                    onChange={v => setEditForm({...editForm, assignment: v})}
                  />
                 </div>
                 <InfoField isEditing={false} label="Pointer Status" icon="📍" value={user.status} />
                 <InfoField isEditing={false} label="Account Stability" icon="🔍" variant="highlight" value={user.status === 'Verified' ? 'Optimal' : 'Audit Req'} />
              </div>
           </div>

           <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-slate-200">
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mb-8 md:mb-12 flex items-center gap-4">
                 <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner">👤</span>
                 Institutional Identity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 md:gap-y-10 gap-x-10 md:gap-x-14">
                 <InfoField isEditing={isEditing} label="Date of Birth" type="date" value={isEditing ? (editForm.dob || '') : (user.dob || 'Unset')} onChange={v => setEditForm({...editForm, dob: v})} />
                 <div className="grid grid-cols-2 gap-5 md:gap-6">
                    <InfoField isEditing={isEditing} label="Blood Group" variant="medical" value={isEditing ? (editForm.bloodGroup || '') : (user.bloodGroup || 'O+')} onChange={v => setEditForm({...editForm, bloodGroup: v})} />
                    <InfoField isEditing={false} label="Verification Hash" value={user.id.split('-')[1] || '003'} />
                 </div>
                 <div className="md:col-span-2">
                    <InfoField isEditing={isEditing} label="Verified Residence Address" value={isEditing ? (editForm.address || '') : (user.address || 'Registered Residential Node')} onChange={v => setEditForm({...editForm, address: v})} />
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-6 md:space-y-10">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] text-white shadow-2xl shadow-blue-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl pointer-events-none group-hover:scale-110 transition-transform translate-x-4 -translate-y-4">📊</div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-blue-100">Operational Hub</h4>
              <p className="text-[11px] md:text-xs font-bold leading-relaxed mb-8 text-blue-50 opacity-90">Detailed oversight artifacts (Attendance, Timetables, Professional Credits) are isolated here for administrative integrity.</p>
              <button 
                onClick={() => onViewOperationalDetails?.(user.id, user.role)}
                className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 relative z-10"
              >
                <span>📊</span> Open Operational Hub
              </button>
           </div>

           <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm relative overflow-hidden">
              <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8 md:mb-10">Secure Contact Vault</h4>
              <div className="space-y-8 md:space-y-10">
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Official Institutional Email</p>
                    {isEditing ? (
                      <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10" />
                    ) : (
                      <p className="text-sm md:text-base font-black text-slate-900 break-all">{user.email}</p>
                    )}
                 </div>
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Verified Phone Artifact</p>
                    {isEditing ? (
                      <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10" />
                    ) : (
                      <p className="text-sm md:text-base font-black text-slate-900">{user.phone || 'Registry Unlinked'}</p>
                    )}
                 </div>
                 <div className="pt-4">
                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem]">
                       <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                          Emergency Response
                       </p>
                       <p className="text-[11px] md:text-xs font-black text-slate-900 leading-relaxed italic">
                          {user.emergencyContact || 'Direct Campus Head Notification Protocol Active'}
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const QuickStat: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
  <div className="bg-white/90 backdrop-blur-md p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-xl flex-1 md:flex-none min-w-[90px] md:min-w-[120px] text-center group hover:scale-105 transition-transform">
    <div className="flex items-center justify-center gap-2 mb-2">
       <span className="text-sm md:text-lg">{icon}</span>
       <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-lg md:text-2xl font-black text-slate-900 leading-none tracking-tight">{value}</p>
  </div>
);

const InfoField: React.FC<{ 
  label: string, value: string, icon?: string, variant?: 'normal' | 'medical' | 'highlight', isEditing?: boolean, type?: string, options?: string[], onChange?: (val: string) => void
}> = ({ label, value, icon, variant = 'normal', isEditing, type = "text", options, onChange }) => (
  <div className="space-y-2.5">
    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{label}</p>
    {isEditing ? (
      options ? (
        <select value={value} onChange={e => onChange?.(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs md:text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner">
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange?.(e.target.value)} className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs md:text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner ${type === 'password' ? 'tracking-[0.5em]' : ''}`} />
      )
    ) : (
      <div className={`rounded-2xl md:rounded-[1.5rem] p-4 md:p-5 text-sm md:text-base font-black border transition-all h-full flex flex-col justify-center min-h-[64px] ${
        variant === 'medical' ? 'bg-rose-50 border-rose-100 text-rose-700' :
        variant === 'highlight' ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-500/20' :
        'bg-slate-50 border-slate-100 text-slate-800'
      }`}>
        <div className="flex items-start gap-3 md:gap-4">
            {icon && <span className="text-xl md:text-2xl shrink-0 mt-0.5">{icon}</span>}
            <span className={`leading-tight break-words whitespace-normal overflow-visible uppercase text-[11px] md:text-xs tracking-tight ${type === 'password' ? 'tracking-[0.5em]' : ''}`}>
              {value}
            </span>
        </div>
      </div>
    )}
  </div>
);

export default UserProfile;
