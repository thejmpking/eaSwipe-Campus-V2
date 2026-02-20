import React, { useState } from 'react';
import { UserRole } from '../types';

interface AlertConfig {
  id: string;
  label: string;
  description: string;
  type: 'Attendance' | 'Training' | 'Security';
  priority: 'Critical' | 'Standard' | 'Summary';
  recipients: UserRole[];
  enabled: boolean;
  frequency: 'Real-time' | 'Daily Batch' | 'Weekly Audit';
}

const NotificationSettings: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [alerts, setAlerts] = useState<AlertConfig[]>([
    { 
      id: 'ALT-01', 
      label: 'Critical Understaffing', 
      description: 'Triggered when more than 15% of staff are absent at a single school.',
      type: 'Attendance', 
      priority: 'Critical', 
      recipients: [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN],
      enabled: true,
      frequency: 'Real-time'
    },
    { 
      id: 'ALT-02', 
      label: 'Student Punctuality Yield', 
      description: 'Summarized report of late arrivals against the grace period.',
      type: 'Attendance', 
      priority: 'Standard', 
      recipients: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN],
      enabled: true,
      frequency: 'Daily Batch'
    },
    { 
      id: 'ALT-03', 
      label: 'Training No-Show Alert', 
      description: 'Sent when a registered staff member fails to mark arrival at a professional development event.',
      type: 'Training', 
      priority: 'Standard', 
      recipients: [UserRole.RESOURCE_PERSON, UserRole.SCHOOL_ADMIN],
      enabled: true,
      frequency: 'Real-time'
    },
    { 
      id: 'ALT-04', 
      label: 'Unauthorized Proximity Tap', 
      description: 'Flagged when a student card is detected on an admin-only reader.',
      type: 'Security', 
      priority: 'Critical', 
      recipients: [UserRole.ADMIN, UserRole.SCHOOL_ADMIN],
      enabled: true,
      frequency: 'Real-time'
    },
  ]);

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Notification Protocol Deployed. Alert routing has been updated for all system nodes.");
    }, 1200);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto px-1 md:px-0">
      {/* HEADER ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Alert Hub</h2>
          <p className="text-slate-500 font-medium mt-3">Governing the flow of real-time institutional status alerts</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'Deploying...' : '💾 Save Notification Policy'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6 md:space-y-8">
          
          <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/50">
               <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Active Protocols</h3>
            </div>
            
            <div className="divide-y divide-slate-50">
              {alerts.map(alert => (
                <div key={alert.id} className={`p-6 md:p-8 hover:bg-slate-50/30 transition-all flex flex-col md:flex-row md:items-center gap-6 md:gap-8 ${!alert.enabled ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        alert.priority === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {alert.priority}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">[{alert.type}]</span>
                      <span className="md:hidden text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 rounded-lg">{alert.frequency}</span>
                    </div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 leading-tight uppercase">{alert.label}</h4>
                    <p className="text-[11px] md:text-xs text-slate-500 font-medium leading-relaxed max-w-lg">{alert.description}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {alert.recipients.map(role => (
                        <span key={role} className="text-[8px] font-black text-slate-400 border border-slate-100 px-2 py-0.5 rounded-lg uppercase bg-white">
                          {role.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:flex-col md:items-end gap-4 shrink-0 pt-4 md:pt-0 border-t md:border-none border-slate-50">
                    <div className="text-right hidden md:block">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Frequency</p>
                      <p className="text-xs font-black text-indigo-600 uppercase">{alert.frequency}</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest md:hidden">{alert.enabled ? 'Active' : 'Disabled'}</span>
                       <button 
                        onClick={() => toggleAlert(alert.id)}
                        className={`w-14 h-8 rounded-full transition-all relative ${alert.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                       >
                        <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all ${alert.enabled ? 'right-1.5' : 'left-1.5'}`}></div>
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR LOGIC - HIDDEN OR STACKED ON MOBILE */}
        <div className="space-y-6 md:space-y-8">
           <div className="bg-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">🔔</div>
              <h4 className="text-blue-400 font-black text-[9px] uppercase tracking-[0.2em] mb-8">Communication Engine</h4>
              <div className="space-y-6 md:space-y-8">
                 <div className="space-y-2">
                    <p className="text-xs font-black text-white uppercase flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                       Node Hierarchies
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium pl-3.5">
                       Alerts are automatically routed based on jurisdictional authority. Higher tiers receive global aggregate summaries.
                    </p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-xs font-black text-white uppercase flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                       Audit Immortality
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium pl-3.5">
                       All system alerts are logged permanently in the sovereign audit trail, even if delivery fails.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;