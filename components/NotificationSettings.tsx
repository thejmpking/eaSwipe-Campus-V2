
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
      alert("Notification Protocol Deployed. Alert routing has been updated for all 28,000+ system users.");
    }, 1200);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Institutional Alert Engine</h2>
          <p className="text-slate-500 font-medium mt-3">Configuring the flow of accountability and real-time status updates</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isSaving ? 'Deploying Rules...' : '💾 Save Notification Policy'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          
          {/* 2. Alert Configuration Registry */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Warning Protocols</h3>
               <p className="text-xs text-slate-500 font-medium mt-1">Defining priority, frequency, and authority routing</p>
            </div>
            
            <div className="divide-y divide-slate-50">
              {alerts.map(alert => (
                <div key={alert.id} className={`p-8 hover:bg-slate-50/30 transition-all flex flex-col md:flex-row md:items-center gap-8 ${!alert.enabled ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        alert.priority === 'Critical' ? 'bg-rose-100 text-rose-700' : 
                        alert.priority === 'Standard' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {alert.priority}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alert.type}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight">{alert.label}</h4>
                    <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed max-w-lg">{alert.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {alert.recipients.map(role => (
                        <span key={role} className="text-[9px] font-black text-slate-400 border border-slate-200 px-2.5 py-1 rounded-lg uppercase tracking-wider bg-white">
                          {role.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 shrink-0">
                    <div className="text-right hidden md:block">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Frequency</p>
                      <p className="text-sm font-black text-indigo-600">{alert.frequency}</p>
                    </div>
                    <button 
                      onClick={() => toggleAlert(alert.id)}
                      className={`w-14 h-8 rounded-full transition-all relative ${alert.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all ${alert.enabled ? 'right-1.5' : 'left-1.5'}`}></div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Global Notification Limits */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
             <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Alert Fatigue Safeguards</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Hourly Alerts / User</label>
                        <span className="text-sm font-black text-indigo-600">5 Alerts</span>
                      </div>
                      <input type="range" min="1" max="20" defaultValue="5" className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                      <p className="text-[9px] text-slate-400 italic mt-4">Beyond this limit, low-priority alerts are automatically converted into a daily digest to prevent "Notification Blindness."</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <div>
                        <p className="text-xs font-black text-indigo-900 leading-none">Consolidate Non-Critical</p>
                        <p className="text-[9px] text-indigo-600 font-bold uppercase mt-1">Batch daily summaries</p>
                      </div>
                      <button className="w-10 h-6 bg-indigo-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </button>
                   </div>
                   <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <div>
                        <p className="text-xs font-black text-indigo-900 leading-none">Hierarchy Mirroring</p>
                        <p className="text-[9px] text-indigo-600 font-bold uppercase mt-1">Follow organizational chart</p>
                      </div>
                      <button className="w-10 h-6 bg-indigo-600 rounded-full relative">
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
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none">🔔</div>
            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-8">Communication Logic</h4>
            
            <div className="space-y-8">
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   The Fatigue Barrier
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   When users receive too many alerts, they begin to ignore them. We separate "Transactional Info" from "Governance Breaches" to ensure that <strong>Critical Alerts</strong> always command attention.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   Hierarchical Transparency
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   Notifications align with <strong>Jurisdictional Authority</strong>. A Teacher is notified of their students' absence, but only the Campus Head is notified if an entire school shows anomalous absenteeism.
                 </p>
               </div>
               <div className="space-y-2">
                 <p className="text-sm font-black text-white flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                   The Configuration Mandate
                 </p>
                 <p className="text-[11px] text-slate-400 leading-relaxed font-medium pl-3.5">
                   No role should have "Hard-Coded" alerts. Institutional needs shift—e.g., during exam seasons, punctuality alerts may need to be strictly real-time for all stakeholders.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
             <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-6 flex items-center gap-2">
               <span>⚖️</span> Accountability Balance
             </h4>
             <div className="space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black text-amber-900 uppercase tracking-widest">
                  <span>Audit Trail</span>
                  <span>100% Logged</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-amber-900 uppercase tracking-widest">
                  <span>Delivery Success</span>
                  <span>99.9%</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black text-amber-900 uppercase tracking-widest">
                  <span>Data Latency</span>
                  <span>&lt; 200ms</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
