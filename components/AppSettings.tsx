
import React, { useState } from 'react';

const AppSettings: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [appConfig, setAppConfig] = useState({
    appName: 'EduSync Unified',
    institutionPrefix: 'EDU',
    primaryColor: '#2563eb',
    accentColor: '#4f46e5',
    supportEmail: 'admin@edusync.edu',
    systemLabel: 'Unified Campus Management System'
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Institutional Identity Rebranded. The new visual profile has been propagated to all regional clusters and mobile client apps.");
    }, 1500);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Identity & Branding Studio</h2>
          <p className="text-slate-500 font-medium mt-3">Defining the visual authority and system-wide signature</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isSaving ? 'Syncing Brand Assets...' : '✨ Apply Institutional Rebrand'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          
          {/* 2. System Identity Section */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">System Nomenclature</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Application Name</label>
                  <input 
                    type="text" 
                    value={appConfig.appName}
                    onChange={(e) => setAppConfig({...appConfig, appName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                  <p className="text-[9px] text-slate-400 italic">Appears in mobile app stores and browser titles.</p>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional ID Prefix</label>
                  <input 
                    type="text" 
                    value={appConfig.institutionPrefix}
                    onChange={(e) => setAppConfig({...appConfig, institutionPrefix: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
                  />
                  <p className="text-[9px] text-slate-400 italic">Global prefix for NFC cards (e.g. EDU-001).</p>
               </div>
               <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">System Header Label</label>
                  <input 
                    type="text" 
                    value={appConfig.systemLabel}
                    onChange={(e) => setAppConfig({...appConfig, systemLabel: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
               </div>
            </div>
          </div>

          {/* 3. Assets & Appearance Section */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
             <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Visual Artifacts</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Institution Logo</p>
                      <div className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 group hover:border-indigo-400 transition-colors cursor-pointer">
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏙️</div>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Replace Logo Artifact</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Color</label>
                         <div className="flex items-center gap-3">
                            <input type="color" value={appConfig.primaryColor} onChange={(e) => setAppConfig({...appConfig, primaryColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden" />
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase">{appConfig.primaryColor}</span>
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Accent Tone</label>
                         <div className="flex items-center gap-3">
                            <input type="color" value={appConfig.accentColor} onChange={(e) => setAppConfig({...appConfig, accentColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 overflow-hidden" />
                            <span className="text-xs font-mono font-bold text-slate-500 uppercase">{appConfig.accentColor}</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Real-time Interface Preview</p>
                   <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden aspect-video">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-[10px]">🏙️</div>
                         <div className="w-20 h-2 bg-white/20 rounded-full"></div>
                      </div>
                      <div className="space-y-3">
                         <div className="w-full h-8 rounded-xl" style={{ backgroundColor: appConfig.primaryColor }}></div>
                         <div className="grid grid-cols-3 gap-2">
                            <div className="h-6 rounded-lg bg-white/10"></div>
                            <div className="h-6 rounded-lg bg-white/10"></div>
                            <div className="h-6 rounded-lg" style={{ backgroundColor: appConfig.accentColor }}></div>
                         </div>
                      </div>
                      <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-6 text-center">Simulated Mobile Header</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* 4. Logic Sidebars */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">🎨</div>
            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">System Identity Logic</h4>
            
            <div className="space-y-8">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Branding Consistency
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   In a multi-campus environment, a unified visual language creates <strong>Institutional Cohesion</strong>. When a Teacher moves between schools, the consistent interface reassures them of the system's stability and unified policy.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   The Restriction Mandate
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Application settings are restricted to the <strong>Main Admin</strong> to prevent "Visual Drift". If School Admins could change logos, the institution's official data extraction artifacts (PDFs, Excel) would lose their legal standardization.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Global Propagation
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Changes made here are <strong>Architectural</strong>. They update the primary CSS variables, favicon metadata, and API identification headers for all child clusters instantly.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
             <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <span>🛡️</span> Identity Safeguards
             </h4>
             <div className="space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Rebrand Logging</span>
                  <span className="text-emerald-600">Active</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Artifact Sync</span>
                  <span className="text-blue-600">Verified</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  <span>Cache Refresh</span>
                  <span className="text-blue-600">Automated</span>
               </div>
             </div>
             <p className="text-[9px] text-indigo-700 font-bold mt-8 italic px-1">
               "The brand is the vessel for the policy. A professional system commands professional compliance."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
