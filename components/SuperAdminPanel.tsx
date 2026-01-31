import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';

export interface MasterSettings {
  appName: string;
  appCaption: string;
  footerCredits: string;
  version: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smsApiKey: string;
  smsSenderId: string;
  dbHost: string;
  dbName: string;
  backupFrequency: string;
  backupTarget: string;
  mailNotifications: boolean;
  smsAlerts: boolean;
}

interface SuperAdminPanelProps {
  users: UserIdentity[];
  settings: MasterSettings;
  onUpdateSettings: (settings: MasterSettings) => void;
  onImpersonate: (role: UserRole, name: string, assignment: string) => void;
}

type SubTab = 'core' | 'comms' | 'infra' | 'assets' | 'impersonate';

const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ users, settings, onUpdateSettings, onImpersonate }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('core');
  const [isDeploying, setIsDeploying] = useState(false);
  const [impersonateSearch, setImpersonateSearch] = useState('');
  
  const [localSettings, setLocalSettings] = useState<MasterSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(impersonateSearch.toLowerCase()) || 
      u.id.toLowerCase().includes(impersonateSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(impersonateSearch.toLowerCase())
    );
  }, [users, impersonateSearch]);

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      onUpdateSettings(localSettings);
      setIsDeploying(false);
      alert("System Core Re-configured. Master settings have been updated and cached across the node network.");
    }, 1500);
  };

  const renderSubContent = () => {
    switch (activeSubTab) {
      case 'core':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">Institutional Identity Artifacts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <AdminField 
                    label="Application Label" 
                    value={localSettings.appName} 
                    onChange={v => setLocalSettings({...localSettings, appName: v})} 
                   />
                   <AdminField 
                    label="Application Caption" 
                    value={localSettings.appCaption} 
                    onChange={v => setLocalSettings({...localSettings, appCaption: v})} 
                   />
                   <AdminField label="System Version" value={localSettings.version} readOnly />
                   <div className="md:col-span-2">
                    <AdminField 
                      label="Legal Footer Credits" 
                      value={localSettings.footerCredits} 
                      onChange={v => setLocalSettings({...localSettings, footerCredits: v})} 
                    />
                   </div>
                </div>
             </div>
          </div>
        );
      case 'comms':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">SMTP Relay Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <AdminField label="SMTP Host" value={localSettings.smtpHost} onChange={v => setLocalSettings({...localSettings, smtpHost: v})} />
                   <AdminField label="SMTP Port" value={localSettings.smtpPort} onChange={v => setLocalSettings({...localSettings, smtpPort: v})} />
                   <AdminField label="Relay Identity (User)" value={localSettings.smtpUser} onChange={v => setLocalSettings({...localSettings, smtpUser: v})} />
                   <AdminField label="Relay Token (Password)" value={localSettings.smtpPass} type="password" onChange={v => setLocalSettings({...localSettings, smtpPass: v})} />
                </div>
             </div>
             <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">SMS Gateway (NFC Alerts)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <AdminField label="Provider API Key" value={localSettings.smsApiKey} onChange={v => setLocalSettings({...localSettings, smsApiKey: v})} />
                   <AdminField label="Authorized Sender ID" value={localSettings.smsSenderId} onChange={v => setLocalSettings({...localSettings, smsSenderId: v})} />
                </div>
             </div>
          </div>
        );
      case 'infra':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="bg-slate-950 text-white p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl font-mono">DB</div>
                <h3 className="text-xl font-black text-blue-400 mb-8 flex items-center gap-3">
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                   Persistent Ledger (Database)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono">
                   <AdminField label="Primary DB Host" value={localSettings.dbHost} dark onChange={v => setLocalSettings({...localSettings, dbHost: v})} />
                   <AdminField label="Master Schema Name" value={localSettings.dbName} dark onChange={v => setLocalSettings({...localSettings, dbName: v})} />
                </div>
             </div>
             <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">Disaster Recovery (Backup)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <AdminField label="Archive Cycle" value={localSettings.backupFrequency} onChange={v => setLocalSettings({...localSettings, backupFrequency: v})} />
                   <AdminField label="Storage Target Node" value={localSettings.backupTarget} onChange={v => setLocalSettings({...localSettings, backupTarget: v})} />
                </div>
             </div>
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">System Assets</h3>
                <div className="flex flex-col md:flex-row items-center gap-10">
                   <div className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:border-blue-400 transition-all cursor-pointer group">
                      <span className="text-3xl group-hover:scale-110 transition-transform">🖼️</span>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Main Logo</p>
                   </div>
                   <div className="flex-1 space-y-4">
                      <p className="text-sm font-bold text-slate-600 leading-relaxed">
                        Replace the master institutional logo artifact. Supported formats: PNG, SVG (Max 512kb).
                      </p>
                      <button className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Select File</button>
                   </div>
                </div>
             </div>
          </div>
        );
      case 'impersonate':
        return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
             <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6">Identity Assumption Portal</h3>
                <div className="relative mb-8">
                  <input 
                    type="text" 
                    placeholder="Search by Name, ID or Role..." 
                    value={impersonateSearch}
                    onChange={e => setImpersonateSearch(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:bg-white hover:border-blue-200 hover:shadow-xl transition-all">
                       <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 overflow-hidden shrink-0 shadow-sm">
                             <img src={`https://picsum.photos/seed/${u.id}/64/64`} alt="avatar" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-sm font-black text-slate-900 truncate leading-none mb-1.5">{u.name}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">{u.role}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{u.assignment}</span>
                             </div>
                          </div>
                       </div>
                       <button 
                        onClick={() => onImpersonate(u.role, u.name, u.assignment)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg active:scale-95"
                       >
                         Assume
                       </button>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="col-span-full py-10 text-center text-slate-400">
                       <p className="text-xs font-black uppercase tracking-widest">No matching identities found in registry.</p>
                    </div>
                  )}
                </div>
             </div>
             
             <div className="bg-amber-50 p-8 rounded-[3rem] border border-amber-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl">🎭</div>
                <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em] mb-4">Audit Transparency Protocol</h4>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Assumption of identity allows root operators to verify UI logic and permission boundaries. Note: Every action performed while impersonating is logged as an <strong>Administrative Override</strong> in the immutable audit trail.
                </p>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="bg-slate-900 p-10 md:p-14 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-5 text-[14rem] font-black pointer-events-none -rotate-12">ROOT</div>
         <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
            <div>
               <div className="flex items-center gap-4 mb-6">
                  <span className="px-5 py-1.5 bg-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">SYSTEM SOVEREIGNTY</span>
                  <span className="text-slate-500 text-[10px] font-bold tracking-widest">• ROOT NODE ACCESSED</span>
               </div>
               <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-4">Master Engine <br /><span className="text-blue-500">Infrastructure Control</span></h2>
               <p className="text-slate-400 font-medium max-w-xl text-lg">Central nervous system configuration for the global EduSync ecosystem.</p>
            </div>
            <button 
              onClick={handleDeploy}
              disabled={isDeploying}
              className="px-10 py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shrink-0"
            >
               {isDeploying ? (
                 <><div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div> Deploying...</>
               ) : (
                 <>⚡ Apply Master Config</>
               )}
            </button>
         </div>
      </div>

      <div className="bg-slate-100 p-2 rounded-[2.5rem] w-full flex overflow-x-auto scrollbar-hide gap-2">
         {[
           { id: 'core', label: 'Identity', icon: '🏛️' },
           { id: 'comms', label: 'Relays', icon: '📡' },
           { id: 'infra', label: 'Infra', icon: '⚙️' },
           { id: 'assets', label: 'Assets', icon: '🎨' },
           { id: 'impersonate', label: 'Impersonate', icon: '🎭' },
         ].map(tab => (
           <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as SubTab)}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 px-6 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'
            }`}
           >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
           </button>
         ))}
      </div>

      <div className="min-h-[500px]">
        {renderSubContent()}
      </div>
    </div>
  );
};

const AdminField: React.FC<{ label: string, value: string, onChange?: (v: string) => void, type?: string, readOnly?: boolean, dark?: boolean }> = ({ label, value, onChange, type = "text", readOnly = false, dark = false }) => (
  <div className="space-y-3">
    <label className={`text-[10px] font-black uppercase tracking-widest px-2 ${dark ? 'text-blue-400' : 'text-slate-400'}`}>{label}</label>
    <input 
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      className={`w-full p-5 rounded-3xl text-sm font-bold outline-none transition-all ${
        dark 
        ? 'bg-white/5 border border-white/10 text-white focus:bg-white/10' 
        : 'bg-slate-50 border border-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10'
      }`}
    />
  </div>
);

export default SuperAdminPanel;