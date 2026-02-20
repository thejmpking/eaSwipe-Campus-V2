import React, { useState, useRef } from 'react';
import { MasterSettings } from './SuperAdminPanel';

interface AppSettingsProps {
  settings?: MasterSettings;
  onUpdateSettings?: (settings: MasterSettings) => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ settings, onUpdateSettings }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [appConfig, setAppConfig] = useState({
    appName: settings?.appName || localStorage.getItem('APP_NAME') || 'EduSync Unified',
    logoUrl: settings?.logoUrl || localStorage.getItem('APP_LOGO') || '',
    faviconUrl: settings?.faviconUrl || localStorage.getItem('APP_FAVICON') || '',
    timezone: 'UTC+5:30',
    primaryColor: '#2563eb',
    supportEmail: 'admin@edusync.edu',
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAppConfig(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'faviconUrl']: base64
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    
    // Global persistence
    localStorage.setItem('APP_NAME', appConfig.appName);
    localStorage.setItem('APP_LOGO', appConfig.logoUrl);
    localStorage.setItem('APP_FAVICON', appConfig.faviconUrl);

    // Update parent state if available
    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        appName: appConfig.appName,
        logoUrl: appConfig.logoUrl,
        faviconUrl: appConfig.faviconUrl
      });
    }

    // Apply favicon dynamically to the document
    if (appConfig.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = appConfig.faviconUrl;
    }

    setTimeout(() => {
      setIsSaving(false);
      alert("Institutional Branding Synchronized Globally.");
    }, 1200);
  };

  return (
    <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20">
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Application Name</label>
            <input 
              type="text" 
              value={appConfig.appName}
              onChange={e => setAppConfig({...appConfig, appName: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all uppercase tracking-tight"
              placeholder="e.g. EDUSYNC CLOUD"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Logo Artifact</label>
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-blue-300 transition-all group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
              <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                {appConfig.logoUrl ? (
                  <img src={appConfig.logoUrl} className="w-full h-full object-contain p-2" alt="logo" />
                ) : (
                  <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">🏙️</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 uppercase">Select File</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">PNG, SVG or JPEG (Max 1MB)</p>
              </div>
              <input 
                type="file" 
                ref={logoInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'logo')} 
              />
            </div>
          </div>

          {/* Favicon Upload */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Browser Favicon Artifact</label>
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-blue-300 transition-all group cursor-pointer" onClick={() => faviconInputRef.current?.click()}>
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                {appConfig.faviconUrl ? (
                  <img src={appConfig.faviconUrl} className="w-full h-full object-contain p-1" alt="favicon" />
                ) : (
                  <span className="text-xl grayscale group-hover:grayscale-0 transition-all">✨</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 uppercase">Select Icon</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">ICO or PNG (32x32 recommended)</p>
              </div>
              <input 
                type="file" 
                ref={faviconInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'favicon')} 
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Regional Timezone</label>
            <div className="relative">
              <select 
                value={appConfig.timezone}
                onChange={e => setAppConfig({...appConfig, timezone: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-semibold appearance-none outline-none focus:border-blue-200 cursor-pointer"
              >
                <option value="UTC+0" className="font-medium py-2">GMT (UTC+0)</option>
                <option value="UTC+3" className="font-medium py-2">Riyadh (UTC+3)</option>
                <option value="UTC+5:30" className="font-medium py-2">India (UTC+5:30)</option>
                <option value="UTC-5" className="font-medium py-2">EST (UTC-5)</option>
              </select>
              <span className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[10px]">▼</span>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-8">
            <div className="flex justify-between items-center px-1">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Identity Deployment Preview
               </h4>
               <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Context Mockup</span>
            </div>

            {/* Desktop Mockup Snippet */}
            <div className="space-y-3">
               <p className="text-[9px] font-bold text-slate-400 uppercase px-2">Desktop Hub View</p>
               <div className="bg-[#0F172A] p-6 rounded-3xl border border-white/5 shadow-xl">
                  <div className="flex items-center gap-3">
                    {appConfig.logoUrl ? (
                      <img src={appConfig.logoUrl} className="h-8 w-auto max-w-[120px] object-contain" alt="Branding" />
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                          <span className="font-semibold italic text-sm text-white">ES</span>
                        </div>
                        <div className="min-w-0">
                          <h1 className="text-sm font-semibold text-white truncate leading-none uppercase tracking-tight">{appConfig.appName}</h1>
                          <p className="text-[8px] text-blue-400 font-medium uppercase tracking-widest mt-1 opacity-60">Unified Hub</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 h-px bg-white/5"></div>
               </div>
            </div>

            {/* Mobile Header Snippet */}
            <div className="space-y-3">
               <p className="text-[9px] font-bold text-slate-400 uppercase px-2">Mobile Navigation View</p>
               <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    {appConfig.logoUrl ? (
                      <img src={appConfig.logoUrl} className="h-5 w-auto max-w-[100px] object-contain" alt="Branding" />
                    ) : (
                      <>
                        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
                          <span className="font-semibold italic text-[10px] text-white">ES</span>
                        </div>
                        <span className="font-semibold text-slate-900 tracking-tight text-[10px] uppercase truncate max-w-[80px]">{appConfig.appName}</span>
                      </>
                    )}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200"></div>
               </div>
            </div>
            
            <p className="text-[9px] text-slate-400 font-medium leading-relaxed px-2 italic">
              "System branding is deployed atomically across all jurisdictional nodes to maintain visual authority."
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-end gap-3">
        <button 
          onClick={() => {
             setAppConfig({
               appName: 'EduSync Unified',
               logoUrl: '',
               faviconUrl: '',
               timezone: 'UTC+5:30',
               primaryColor: '#2563eb',
               supportEmail: 'admin@edusync.edu',
             });
          }}
          className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
        >
          Reset Default
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-16 py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              SYNCING LEDGER...
            </>
          ) : 'Apply Regional Branding'}
        </button>
      </div>
    </div>
  );
};

export default AppSettings;