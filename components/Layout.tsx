
import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userPermissions: string[];
  userId?: string;
  userName?: string;
  customAvatar?: string;
  onLogout?: () => void;
  onViewProfile?: (userId: string) => void;
  appName?: string;
  appCaption?: string;
  footerCredits?: string;
  logoUrl?: string;
  unreadCount?: number; // New prop for global alerts
}

const Layout: React.FC<LayoutProps> = ({ 
  children, activeTab, setActiveTab, userRole, userId, userName = "User", 
  customAvatar, onLogout, onViewProfile, appName = "EduSync", appCaption = "Unified Hub",
  logoUrl, unreadCount = 0
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [profileOpen]);

  const governanceLabel = (userRole === UserRole.RESOURCE_PERSON || userRole === UserRole.TEACHER || userRole === UserRole.SCHOOL_ADMIN) ? "ALL" : "Admin";

  const menuGroups = [
    {
      label: "Main",
      items: [
        { id: 'dashboard', label: 'Home', icon: '📊' },
        { id: 'terminal', label: 'Terminal', icon: '⏱️' },
        { id: 'timetable', label: 'Time Table', icon: '🗓️' },
      ]
    },
    {
      label: "Operations",
      items: [
        { id: 'attendance', label: 'Presence', icon: '📋' },
        { id: 'training', label: 'Training', icon: '🎓' },
        { id: 'inspections', label: 'Inspections', icon: '🔍' },
        { id: 'leave', label: 'Leave', icon: '🗓️' },
      ]
    },
    {
      label: "Infrastructure",
      items: [
        { id: 'directory', label: 'Campuses', icon: '🏙️' },
        { id: 'clusters', label: 'Clusters', icon: '📍' },
        { id: 'schools', label: 'Schools', icon: '🏫' },
      ]
    },
    {
      label: "Management",
      items: [
        { id: 'users', label: 'All Users', icon: '👥' },
        { id: 'shifts', label: 'Shifts', icon: '🕒' },
        { id: 'reporting', label: 'Reports', icon: '📈' },
      ]
    },
    {
      label: "Administration",
      items: [
        { id: 'governance', label: governanceLabel, icon: '⚙️', hasBadge: true },
        { id: 'system-health', label: 'Health', icon: '📡' },
        { id: 'super-admin', label: 'Master Config', icon: '🔑', restricted: true },
      ]
    }
  ];

  const filterTabs = (items: any[]) => items.filter((t: any) => 
    !t.restricted || userRole === UserRole.SUPER_ADMIN
  );

  const ProfileMenu = () => (
    <div 
      className="absolute right-0 top-full mt-3 w-72 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-300 origin-top-right ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
    >
       <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[12px] font-black text-slate-900 uppercase truncate mb-2 tracking-tight">{userName}</p>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">{userRole.replace('_', ' ')}</p>
          </div>
       </div>
       <div className="p-4 space-y-2">
          <button 
            onClick={(e) => { e.stopPropagation(); if (userId) onViewProfile?.(userId); }}
            className="w-full flex items-center gap-5 px-6 py-4 rounded-2xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-all text-left group"
          >
             <span className="text-2xl group-hover:scale-110 transition-transform">👤</span>
             <span className="text-[10px] font-black uppercase tracking-widest">Identity Profile</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onLogout?.(); }}
            className="w-full flex items-center gap-5 px-6 py-4 rounded-2xl hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all text-left group"
          >
             <span className="text-2xl group-hover:scale-110 transition-transform">🚪</span>
             <span className="text-[10px] font-black uppercase tracking-widest">Revoke Session</span>
          </button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F1F5F9]">
      {/* SIDEBAR: Desktop Obsidian UI */}
      <aside className="hidden md:flex flex-col w-[320px] bg-slate-950 text-white h-screen sticky top-0 z-50 shadow-2xl overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="p-12 pb-10 relative z-10">
          <div className="flex items-center gap-5 mb-10">
            {logoUrl ? (
              <img src={logoUrl} className="h-12 w-auto max-w-full object-contain" alt="Branding" />
            ) : (
              <>
                <div className="w-14 h-14 bg-blue-600 rounded-[1.25rem] shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] flex items-center justify-center shrink-0 border border-blue-400/30">
                  <span className="font-black italic text-3xl text-white">E</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-black truncate leading-none uppercase tracking-tighter">{appName}</h1>
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] mt-2.5 opacity-70 leading-none">{appCaption}</p>
                </div>
              </>
            )}
          </div>
          <div className="h-[1px] bg-white/5 w-full"></div>
        </div>
        <nav className="flex-1 space-y-12 overflow-y-auto custom-scrollbar px-8 pb-16 relative z-10">
          {menuGroups.map((group, idx) => {
            const visibleItems = filterTabs(group.items);
            if (visibleItems.length === 0) return null;
            return (
              <div key={idx} className="space-y-5">
                <p className="px-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{group.label}</p>
                <div className="space-y-2">
                  {visibleItems.map((tab) => {
                    const isTabActive = activeTab === tab.id;
                    const showRedBadge = tab.hasBadge && unreadCount > 0;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-6 px-6 py-4 rounded-2xl transition-all group relative border ${
                          isTabActive 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-[0_20px_40px_-10px_rgba(37,99,235,0.3)]' 
                          : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className={`text-2xl transition-transform group-hover:scale-110 ${isTabActive ? 'scale-110' : ''}`}>{tab.icon}</span>
                        <span className="font-black text-[12px] uppercase tracking-widest leading-none">{tab.label}</span>
                        {isTabActive && (
                           <div className="absolute right-4 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#fff]"></div>
                        )}
                        {!isTabActive && showRedBadge && (
                           <div className="absolute right-6 w-2 h-2 bg-rose-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.6)]"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="p-10 mt-auto border-t border-white/5 relative z-10 bg-slate-950/50 backdrop-blur-md">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-5 px-8 py-5 rounded-2xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 font-black text-[11px] uppercase tracking-[0.25em] transition-all border border-white/5 active:scale-95 group">
            <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between px-8 py-6 bg-white/90 border-b border-slate-200 sticky top-0 z-[100] backdrop-blur-3xl">
        <div className="flex items-center gap-4 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} className="h-9 max-h-[36px] w-auto max-w-[180px] object-contain" alt="Branding" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-blue-500/20">
                <span className="font-black italic text-xl text-white">E</span>
              </div>
              <span className="font-black text-slate-950 tracking-tighter text-lg uppercase truncate">{appName}</span>
            </div>
          )}
        </div>
        <div className="relative" ref={dropdownRef}>
          <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }} className="w-12 h-12 rounded-2xl border-2 border-slate-100 overflow-hidden shadow-2xl bg-slate-50 ring-2 ring-white">
            <img src={customAvatar || `https://picsum.photos/seed/${userName}/128/128`} className="w-full h-full object-cover" alt="p" />
          </button>
          {profileOpen && <ProfileMenu />}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="hidden md:flex bg-white/70 backdrop-blur-2xl border-b border-slate-200 px-16 py-10 items-center justify-between sticky top-0 z-[40]">
           <div className="animate-in slide-in-from-left-4 duration-500">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none">Institutional Registry Node</p>
              </div>
              <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase leading-none">{activeTab.replace('-', ' ')}</h2>
           </div>
           <div className="relative animate-in slide-in-from-right-4 duration-500" ref={dropdownRef}>
              <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }} className="flex items-center gap-8 group p-3 hover:bg-white rounded-[2rem] transition-all shadow-sm hover:shadow-2xl border border-transparent hover:border-slate-100 active:scale-[0.98]">
                 <div className="text-right min-w-0">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] leading-none mb-3">{userRole.replace('_', ' ')}</p>
                    <p className="text-[15px] font-black text-slate-900 uppercase tracking-tight truncate">{userName}</p>
                 </div>
                 <div className="w-16 h-16 rounded-[1.5rem] bg-slate-200 border-[4px] border-white overflow-hidden group-hover:scale-105 transition-transform shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)]">
                    <img src={customAvatar || `https://picsum.photos/seed/${userName}/128/128`} className="w-full h-full object-cover" alt="p" />
                 </div>
              </button>
              {profileOpen && <ProfileMenu />}
           </div>
        </header>
        <div className="flex-1 pb-36 md:pb-24 overflow-x-hidden">
          <div className="max-w-[1700px] mx-auto p-4 md:p-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {children}
          </div>
        </div>
      </main>

      {/* OPTIMIZED MOBILE BOTTOM DOCK: PREMIUM WHITE THEME CAPSULE */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 z-[100] pb-safe">
        <div className="bg-white/80 backdrop-blur-2xl border border-white px-2 py-2 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/50">
          <div className="grid grid-cols-5 gap-1">
            <DockItem id="dashboard" icon="📊" label="Home" activeId={activeTab} onClick={setActiveTab} />
            <DockItem id="terminal" icon="⏱️" label="Terminal" activeId={activeTab} onClick={setActiveTab} />
            <DockItem id="attendance" icon="📋" label="Presence" activeId={activeTab} onClick={setActiveTab} />
            <DockItem id="users" icon="👥" label="Staff" activeId={activeTab} onClick={setActiveTab} />
            <DockItem id="governance" icon="⚙️" label={governanceLabel} activeId={activeTab} onClick={setActiveTab} hasBadge={unreadCount > 0} />
          </div>
        </div>
      </nav>
    </div>
  );
};

const DockItem = ({ id, icon, label, activeId, onClick, hasBadge }: any) => {
  const isActive = activeId === id || (id === 'users' && activeId.startsWith('users-'));
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-[1.8rem] transition-all relative group ${
        isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <span className={`text-xl mb-1 transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
        {icon}
      </span>
      <span className={`text-[7px] font-black uppercase tracking-[0.1em] label-text transition-all duration-300 ${
        isActive ? 'opacity-100' : 'opacity-60'
      }`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute -top-1 w-1 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-pulse"></div>
      )}
      {!isActive && hasBadge && (
        <div className="absolute top-1 right-2 w-2 h-2 bg-rose-600 rounded-full shadow-lg animate-pulse"></div>
      )}
    </button>
  );
};

export default Layout;
