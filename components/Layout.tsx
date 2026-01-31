
import React, { useState } from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userPermissions: string[];
  userName?: string;
  customAvatar?: string;
  onLogout?: () => void;
  appName?: string;
  appCaption?: string;
  footerCredits?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  userRole, 
  userPermissions, 
  userName = "User", 
  customAvatar,
  onLogout,
  appName = "EduSync",
  appCaption = "Unified Campus",
  footerCredits = "© 2026 EduSync Systems."
}) => {
  const [usersMenuOpen, setUsersMenuOpen] = useState(true);
  const [shiftsMenuOpen, setShiftsMenuOpen] = useState(true);

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'terminal', label: 'Terminal', icon: '⏱️' },
    { id: 'super-admin', label: 'Master Engine', icon: '⚡', superOnly: true },
    { id: 'directory', label: 'Campuses', icon: '🏙️' },
    { id: 'clusters', label: 'Clusters', icon: '📍' },
    { id: 'schools', label: 'Schools', icon: '🏫' },
    { id: 'attendance', label: 'Presence', icon: '📋' }, 
    { 
      id: 'shifts', 
      label: 'Shifts', 
      icon: '🕒',
      hasSubmenu: true,
      subItems: [
        { id: 'shifts-category', label: 'Shift Category', icon: '🏷️' },
        { id: 'shifts-templates', label: 'Shift Templates', icon: '⏰' },
        { id: 'shifts-roster', label: 'Shift Roster', icon: '📅' },
      ]
    },
    { id: 'inspections', label: 'Inspection', icon: '🔍' },
    { 
      id: 'users', 
      label: 'Users', 
      icon: '👥', 
      hasSubmenu: true,
      subItems: [
        { id: 'users-rp', label: 'Resource Person (RP)', icon: '👤' },
        { id: 'users-faculties', label: 'Faculties', icon: '👨‍🏫' },
        { id: 'users-staffs', label: 'Staffs', icon: '💼' },
        { id: 'users-students', label: 'Students', icon: '🎓' },
      ]
    },
    { id: 'governance', label: 'Admin Hub', icon: '⚙️' },
  ];

  const isUserSubtab = activeTab.startsWith('users-');
  const isShiftSubtab = activeTab.startsWith('shifts-');

  const visibleTabs = tabs.filter(tab => {
    if (tab.superOnly && userRole !== UserRole.SUPER_ADMIN) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white h-screen sticky top-0 p-6 z-20 shadow-2xl">
        <div className="mb-10 flex items-center gap-4 px-2">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center font-semibold italic text-xl shadow-lg shadow-blue-500/20">ES</div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight leading-none truncate">{appName}</h1>
            <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest mt-1 truncate">{appCaption}</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
          {visibleTabs.map((tab) => {
            const isUsersActive = tab.id === 'users' && (activeTab === 'users' || isUserSubtab);
            const isShiftsActive = tab.id === 'shifts' && (activeTab === 'shifts' || isShiftSubtab);
            const isCurrentActive = activeTab === tab.id || isUsersActive || isShiftsActive;
            const isMenuOpen = tab.id === 'users' ? usersMenuOpen : shiftsMenuOpen;

            return (
              <div key={tab.id} className="space-y-1">
                <button
                  onClick={() => {
                    if (tab.hasSubmenu) {
                      if (tab.id === 'users') setUsersMenuOpen(!usersMenuOpen);
                      if (tab.id === 'shifts') setShiftsMenuOpen(!shiftsMenuOpen);
                      setActiveTab(tab.id);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all group ${
                    isCurrentActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl group-hover:scale-110 transition-transform">{tab.icon}</span>
                    <span className="font-medium text-sm tracking-tight">{tab.label}</span>
                  </div>
                  {tab.hasSubmenu && (
                    <span className={`text-[8px] transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>▼</span>
                  )}
                </button>

                {tab.hasSubmenu && isMenuOpen && (
                  <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {tab.subItems?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                          activeTab === sub.id 
                          ? 'text-blue-400 bg-blue-400/10' 
                          : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span>{sub.icon}</span>
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-400 hover:bg-rose-900/20 transition-all font-semibold text-[10px] uppercase tracking-widest">
            <span>🚪</span><span>Secure Logout</span>
          </button>
          <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest mt-4 px-4 leading-relaxed">{footerCredits}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 pb-32 md:pb-0">
        <header className="hidden md:flex bg-white/80 backdrop-blur-md border-b border-slate-200 px-12 py-6 items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' ? 'Home' : isUserSubtab ? 'Identity Registry' : isShiftSubtab ? 'Temporal Logistics' : visibleTabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-8">
             <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 mb-0.5">{userName}</p>
                <p className="text-[10px] text-blue-600 uppercase tracking-widest font-semibold leading-none">{userRole.replace('_', ' ')}</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden ring-4 ring-slate-50 shadow-md">
                <img src={customAvatar || `https://picsum.photos/seed/${userName}/128/128`} alt="Profile" className="w-full h-full object-cover" />
             </div>
          </div>
        </header>

        <div className="p-4 md:p-12 max-w-7xl mx-auto w-full flex-1 animate-in fade-in duration-700 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
