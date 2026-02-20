
import React, { useState, useEffect, useMemo } from 'react';
import { UserIdentity } from '../App';
import { UserRole } from '../types';
import AppSettings from './AppSettings';
import RolePermissionManagement from './RolePermissionManagement';
import NotificationSettings from './NotificationSettings';
import IDCardManager from './IDCardManager';
import SmtpSettings from './SmtpSettings';
import PolicySettings from './PolicySettings';
import TrainingPolicy from './TrainingPolicy';
import ReportAccessControl from './ReportAccessControl';
import SecuritySettings from './SecuritySettings';
import RegistrySetup from './RegistrySetup';
import { MasterSettings } from './SuperAdminPanel';
import { dataService } from '../services/dataService';

interface GovernanceProps {
  users: UserIdentity[];
  currentUserRole: UserRole;
  currentUserId: string;
  userAssignment?: string;
  settings: MasterSettings;
  clusterRequests?: any[]; 
  onUpdateSettings: (settings: MasterSettings) => void;
  onSyncComplete: () => void;
  onViewProfile?: (id: string) => void;
  onNavigate?: (tab: string) => void;
}

type AdminTab = 'branding' | 'roles' | 'alerts' | 'nfc-id' | 'smtp' | 'attendance' | 'training' | 'reports' | 'security';
type HubView = 'main' | 'pin' | 'requests' | 'contact' | 'support' | 'registry' | 'inspections';

const Governance: React.FC<GovernanceProps> = ({ 
  users, currentUserRole, currentUserId, userAssignment, settings, clusterRequests = [], onUpdateSettings, onSyncComplete, onViewProfile, onNavigate 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('branding');
  const [activeHubView, setActiveHubView] = useState<HubView>('main');
  const [availableClusters, setAvailableClusters] = useState<any[]>([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequestForm, setNewRequestForm] = useState({ target: '', reason: '' });
  const [pinForm, setPinForm] = useState({ new: '', confirm: '' });
  const [pinError, setPinError] = useState<string | null>(null);
  
  // Inspection Hub State
  const [schoolInspections, setSchoolInspections] = useState<any[]>([]);
  const [inspectionsMonth, setInspectionsMonth] = useState<number>(new Date().getMonth());
  const [inspectionsYear, setInspectionsYear] = useState<number>(new Date().getFullYear());
  const [viewedInspection, setViewedInspection] = useState<any | null>(null);
  
  const [ledgerRows, setLedgerRows] = useState<any[]>(clusterRequests);
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setLedgerRows(clusterRequests);
  }, [clusterRequests]);

  const isRP = currentUserRole === UserRole.RESOURCE_PERSON;
  const isTeacher = currentUserRole === UserRole.TEACHER;
  const isSchoolAdmin = currentUserRole === UserRole.SCHOOL_ADMIN;
  const isStaff = isTeacher || isRP || isSchoolAdmin;
  
  const me = useMemo(() => users.find(u => String(u.id) === String(currentUserId)), [users, currentUserId]);

  const fetchSchoolInspections = async () => {
    if (!isSchoolAdmin) return;
    try {
      const records = await dataService.getRecords('inspections');
      const mySchool = (me?.school || me?.assignment || userAssignment || '').trim();
      const myReports = (records || []).filter((r: any) => {
        const schoolName = (r.school || '').trim();
        return schoolName === mySchool;
      });
      setSchoolInspections(myReports);
    } catch (e) {
      console.error("Inspection Fetch Fault", e);
    }
  };

  useEffect(() => {
    if (activeHubView === 'requests' || !isStaff) {
      dataService.getClusters().then(setAvailableClusters);
    }
    if (isSchoolAdmin) {
      fetchSchoolInspections();
    }
  }, [activeHubView, isStaff, isSchoolAdmin, me, userAssignment]);

  const unreadInspectionsCount = useMemo(() => {
    // Strictly checking is_read from DB to avoid camelCase conflicts
    return schoolInspections.filter(r => r.is_read === false).length;
  }, [schoolInspections]);

  const filteredInspections = useMemo(() => {
    return schoolInspections.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === inspectionsMonth && d.getFullYear() === inspectionsYear;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [schoolInspections, inspectionsMonth, inspectionsYear]);

  const filteredRequests = useMemo(() => {
    return ledgerRows.filter(r => {
      const status = String(r.status || '').toLowerCase();
      const myCluster = String(me?.cluster || '').toLowerCase();
      const sourceCluster = String(r.currentCluster || r.current_cluster || '').toLowerCase();
      const targetCluster = String(r.requestedCluster || r.requested_cluster || '').toLowerCase();

      if (isTeacher || isSchoolAdmin) {
        return String(r.userId || r.user_id || '') === String(currentUserId);
      }

      if (isRP) {
        const isMyOutbound = sourceCluster === myCluster;
        const isMyInbound = targetCluster === myCluster && status === 'source_approved';
        return isMyOutbound || isMyInbound || (status === 'finalized' || status === 'rejected');
      }

      return true;
    });
  }, [ledgerRows, isRP, isTeacher, isSchoolAdmin, me, currentUserId]);

  const handleMarkSingleAsRead = async (insp: any) => {
    if (insp.is_read === true) return;
    
    // 1. Optimistic local state update to remove from unread count "outside" immediately
    setSchoolInspections(prev => prev.map(r => r.id === insp.id ? { ...r, is_read: true } : r));
    
    // 2. Persist to master ledger using strictly DB-compliant naming
    try {
      const artifact = { ...insp, is_read: true };
      // Remove any potential camelCase duplicates that might confuse the bridge
      if (artifact.isRead !== undefined) delete artifact.isRead;
      
      const res = await dataService.syncRecord('inspections', artifact);
      if (res.status === 'success') {
        // 3. Refresh global state (sidebar badge, etc)
        onSyncComplete();
      } else {
        // Rollback on failure
        setSchoolInspections(prev => prev.map(r => r.id === insp.id ? { ...r, is_read: false } : r));
      }
    } catch (err) {
      console.error("Ledger persistence failure", err);
      // Rollback on error
      setSchoolInspections(prev => prev.map(r => r.id === insp.id ? { ...r, is_read: false } : r));
    }
  };

  const handleOpenInspection = async (insp: any) => {
    setViewedInspection(insp);
    if (insp.is_read === false) {
      await handleMarkSingleAsRead(insp);
    }
  };

  const markAllAsRead = async () => {
    const unread = schoolInspections.filter(r => r.is_read === false);
    if (unread.length === 0) return;
    
    setIsProcessing(true);
    try {
      const updatePromises = unread.map(r => {
        const artifact = { ...r, is_read: true };
        if (artifact.isRead !== undefined) delete artifact.isRead;
        return dataService.syncRecord('inspections', artifact);
      });
      
      await Promise.all(updatePromises);
      setSchoolInspections(prev => prev.map(r => ({ ...r, is_read: true })));
      onSyncComplete();
      triggerSuccess();
    } catch (err) {
      console.error("Batch update failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const triggerSuccess = () => {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const handleAction = async (request: any, action: 'Approve' | 'Reject') => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const status = String(request.status || '').toLowerCase();
      const myCluster = String(me?.cluster || '').toLowerCase();
      const sourceCluster = String(request.currentCluster || request.current_cluster || '').toLowerCase();
      const targetCluster = String(request.requestedCluster || request.requested_cluster || '').toLowerCase();
      
      let nextStatus = '';
      let triggerFinalSync = false;

      if (action === 'Reject') { nextStatus = 'Rejected'; } 
      else {
        if (status === 'pending' && sourceCluster === myCluster) { nextStatus = 'Source_Approved'; } 
        else if (status === 'source_approved' && targetCluster === myCluster) {
          nextStatus = 'Finalized';
          triggerFinalSync = true;
        }
      }

      if (!nextStatus) {
        alert("Authority Error: Phase Mismatch");
        setIsProcessing(false);
        return;
      }

      const updateRes = await dataService.syncRecord('cluster_requests', { ...request, status: nextStatus });
      if (updateRes.status === 'success') {
        if (triggerFinalSync) {
          await dataService.syncRecord('users', { id: request.userId || request.user_id, cluster: request.requestedCluster || request.requested_cluster, assignment: request.requestedCluster || request.requested_cluster });
        }
        onSyncComplete();
      }
    } finally { setIsProcessing(false); }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (pinForm.new.length !== 4 || !/^\d+$/.test(pinForm.new)) {
      setPinError("Security Protocol Error: PIN must be exactly 4 numeric digits.");
      return;
    }
    if (pinForm.new !== pinForm.confirm) {
      setPinError("Handshake Error: PIN confirmation mismatch.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await dataService.syncRecord('users', { id: currentUserId, password: pinForm.new });
      if (res.status === 'success') {
        alert("SECURITY LEDGER UPDATED.");
        setPinForm({ new: '', confirm: '' });
        setActiveHubView('main');
        onSyncComplete();
      } else { setPinError(`Registry Error: ${res.message}`); }
    } catch (err) { setPinError("Infrastructure Fault."); }
    finally { setIsProcessing(false); }
  };

  const executePurge = async () => {
    if (isProcessing || !selectedArtifact) return;
    const recordId = String(selectedArtifact.id || selectedArtifact.ID || '').trim();
    setIsProcessing(true);
    try {
      const res = await dataService.deleteRecord('cluster_requests', recordId);
      if (res && res.status === 'success') {
        setShowDeleteConfirm(false);
        setSelectedArtifact(null);
        onSyncComplete();
      }
    } finally { setIsProcessing(false); }
  };

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestForm.target) return;
    setIsProcessing(true);
    try {
      const artifact = { id: `REQ-${Date.now()}`, user_id: currentUserId, user_name: me?.name || 'Staff', current_cluster: me?.cluster || 'Unassigned', requested_cluster: newRequestForm.target, reason: newRequestForm.reason.trim(), status: 'Pending', timestamp: new Date().toISOString() };
      const res = await dataService.syncRecord('cluster_requests', artifact);
      if (res.status === 'success') { setShowNewRequest(false); setNewRequestForm({ target: '', reason: '' }); onSyncComplete(); }
    } finally { setIsProcessing(false); }
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = [2024, 2025, 2026];

  const renderStaffHub = () => {
    switch (activeHubView) {
      case 'inspections':
        return (
          <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-8 pb-32">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-3">
                <div className="space-y-2">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Oversight Archives</h3>
                   <div className="flex items-center gap-3">
                      <p className="text-xl md:text-2xl font-black text-blue-600 uppercase tracking-tight mt-1 md:mt-2">Regional Inspection Ledger</p>
                      {unreadInspectionsCount > 0 && (
                        <button onClick={markAllAsRead} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">Mark All as Read</button>
                      )}
                   </div>
                </div>
                <div className="flex gap-2">
                   <select value={inspectionsMonth} onChange={e => setInspectionsMonth(parseInt(e.target.value))} className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none shadow-sm cursor-pointer">
                      {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                   </select>
                   <select value={inspectionsYear} onChange={e => setInspectionsYear(parseInt(e.target.value))} className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none shadow-sm cursor-pointer">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                         <tr>
                            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Chronology</th>
                            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Auditor</th>
                            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Node Rating</th>
                            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ledger</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {filteredInspections.map(insp => {
                           const auditor = users.find(u => u.id === insp.inspector);
                           const avatarUrl = auditor?.nfcUrl?.startsWith('data:') ? auditor.nfcUrl : `https://picsum.photos/seed/${auditor?.id || insp.inspector}/64/64`;
                           const isUnread = insp.is_read === false;
                           
                           return (
                             <tr key={insp.id} className={`hover:bg-slate-50/50 transition-colors group ${isUnread ? 'bg-blue-50/30' : ''}`}>
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-3">
                                      {isUnread && <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.4)]"></div>}
                                      <div>
                                         <p className="text-xs font-black text-slate-800 uppercase">{insp.date}</p>
                                         <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Artifact: {insp.id}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm">
                                         <img src={avatarUrl} className="w-full h-full object-cover" alt="auditor" />
                                      </div>
                                      <div className="min-w-0">
                                         <p className="text-sm font-black text-slate-900 uppercase truncate">{auditor?.name || insp.inspector || 'Regional Auditor'}</p>
                                         {isUnread && <span className="text-[7px] font-black text-rose-600 uppercase tracking-tighter">NEW REPORT</span>}
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <div className="flex flex-col items-center">
                                      <span className="text-2xl">{insp.ratingEmoji || insp.rating_emoji}</span>
                                      <span className="text-[8px] font-black text-slate-400 uppercase mt-1">{insp.ratingLabel || insp.rating_label}</span>
                                   </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                   <div className="flex items-center justify-end gap-2">
                                      {isUnread && (
                                        <button 
                                          onClick={() => handleMarkSingleAsRead(insp)}
                                          title="Mark as Read"
                                          className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90"
                                        >
                                          ✓
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => handleOpenInspection(insp)}
                                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 shadow-lg transition-all ${
                                          isUnread ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-900 text-white'
                                        }`}
                                      >
                                         View Report
                                      </button>
                                   </div>
                                </td>
                             </tr>
                           );
                         })}
                         {filteredInspections.length === 0 && (
                           <tr><td colSpan={4} className="py-32 text-center text-slate-300 uppercase text-[10px] font-black tracking-[0.3em]">No audit artifacts registered for this cycle.</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        );
      case 'registry':
        const effectiveNode = (isTeacher || isSchoolAdmin) ? (me?.school || userAssignment) : userAssignment;
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
             <RegistrySetup type="classes" userAssignment={effectiveNode} currentUserRole={currentUserRole} onViewProfile={onViewProfile} />
          </div>
        );
      case 'pin':
        return (
          <div className="max-w-xl mx-auto animate-in slide-in-from-bottom-8 duration-500 pb-32">
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
               <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">🔐</div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase">Security Terminal</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-8">Update your 4-digit security artifact for terminal handshakes.</p>
               </div>
               <form onSubmit={handleUpdatePin} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">New 4-Digit PIN</label>
                     <input type="password" inputMode="numeric" maxLength={4} required value={pinForm.new} onChange={e => setPinForm({...pinForm, new: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-16 px-6 text-2xl font-black tracking-[0.5em] text-center outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="••••" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Confirm PIN</label>
                     <input type="password" inputMode="numeric" maxLength={4} required value={pinForm.confirm} onChange={e => setPinForm({...pinForm, confirm: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-16 px-6 text-2xl font-black tracking-[0.5em] text-center outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="••••" />
                  </div>
                  {pinError && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase text-center animate-in shake">{pinError}</div>}
                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setActiveHubView('main')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Abort</button>
                     <button type="submit" disabled={isProcessing} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-3">{isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Update Security Artifact'}</button>
                  </div>
               </form>
            </div>
          </div>
        );
      case 'requests':
        return (
          <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-8 pb-32">
            <div className="flex justify-between items-end px-3">
               <div>
                  <h3 className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Migration Ledger</h3>
                  <p className="text-xs md:text-sm font-bold text-blue-600 uppercase tracking-widest mt-1 md:mt-2">Dual-Signature Pipeline</p>
               </div>
               {(isTeacher || isSchoolAdmin) && (
                 <button onClick={() => setShowNewRequest(true)} className="px-6 md:px-10 py-3.5 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-[2rem] font-black text-[9px] md:text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">New Request</button>
               )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
               {filteredRequests.map(req => {
                 const artifactId = String(req.id || req.ID || '').trim();
                 const status = String(req.status || '').toLowerCase();
                 return (
                   <div key={artifactId} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">#{artifactId}</span>
                         <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${status === 'pending' ? 'bg-amber-50 text-amber-600' : status === 'source_approved' ? 'bg-blue-50 text-blue-600' : status === 'finalized' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{status.replace('_', ' ')}</span>
                      </div>
                      <div>
                         <p className="text-sm font-black text-slate-900 uppercase">{req.user_name || req.userName}</p>
                         <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">{(req.current_cluster || req.currentCluster)} <span className="text-slate-300 mx-2">→</span> {(req.requested_cluster || req.requestedCluster)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] text-slate-500 font-medium leading-relaxed">"{req.reason}"</div>
                      <div className="flex gap-2">
                         {isRP && ((status === 'pending' && (req.current_cluster || req.currentCluster) === me?.cluster) || (status === 'source_approved' && (req.requested_cluster || req.requestedCluster) === me?.cluster)) && (
                            <>
                               <button onClick={() => handleAction(req, 'Approve')} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-blue-500/20 transition-all">Approve</button>
                               <button onClick={() => handleAction(req, 'Reject')} className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">Reject</button>
                            </>
                         )}
                         {(isTeacher || isSchoolAdmin) && status === 'pending' && (
                            <button onClick={() => { setSelectedArtifact(req); setShowDeleteConfirm(true); }} className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel Request</button>
                         )}
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <button onClick={() => setActiveHubView('requests')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-4 hover:shadow-xl hover:border-blue-200 transition-all group">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mx-auto group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">📦</div>
                <h4 className="text-lg font-black text-slate-900 uppercase">Migration Hub</h4>
                <p className="text-xs text-slate-400 font-medium">Request or approve jurisdictional cluster changes.</p>
             </button>
             {isSchoolAdmin && (
               <button onClick={() => setActiveHubView('inspections')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-4 hover:shadow-xl hover:border-blue-200 transition-all group relative">
                  {unreadInspectionsCount > 0 && (
                    <div className="absolute top-6 right-6 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg border-2 border-white animate-bounce">
                      {unreadInspectionsCount}
                    </div>
                  )}
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-3xl mx-auto group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner">🔍</div>
                  <h4 className="text-lg font-black text-slate-900 uppercase">Inspection Hub</h4>
                  <p className="text-xs text-slate-400 font-medium">Review and respond to regional audit reports.</p>
               </button>
             )}
             {(isTeacher || isSchoolAdmin) && (
               <button onClick={() => setActiveHubView('registry')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-4 hover:shadow-xl hover:border-blue-200 transition-all group">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">📚</div>
                  <h4 className="text-lg font-black text-slate-900 uppercase">Class Registry</h4>
                  <p className="text-xs text-slate-400 font-medium">Manage classes and teacher assignments.</p>
               </button>
             )}
             <button onClick={() => setActiveHubView('pin')} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-4 hover:shadow-xl hover:border-blue-200 transition-all group">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl mx-auto group-hover:bg-rose-600 group-hover:text-white transition-colors shadow-inner">🔒</div>
                <h4 className="text-lg font-black text-slate-900 uppercase">Security Terminal</h4>
                <p className="text-xs text-slate-400 font-medium">Configure your 4-digit security PIN.</p>
             </button>
          </div>
        );
    }
  };

  const renderAdminTabs = () => {
    switch (activeAdminTab) {
      case 'branding': return <AppSettings settings={settings} onUpdateSettings={onUpdateSettings} />;
      case 'roles': return <RolePermissionManagement />;
      case 'alerts': return <NotificationSettings />;
      case 'nfc-id': return <IDCardManager users={users} onSync={onSyncComplete} />;
      case 'smtp': return <SmtpSettings settings={settings} onUpdateSettings={onUpdateSettings} />;
      case 'attendance': return <PolicySettings />;
      case 'training': return <TrainingPolicy />;
      case 'reports': return <ReportAccessControl />;
      case 'security': return <SecuritySettings />;
    }
  };

  return (
    <div className="space-y-10">
      {showSuccessToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4">
           ✓ Sync Complete
        </div>
      )}

      {isStaff ? (
        <div className="space-y-10">
           <div className="flex justify-between items-center px-3">
              <h2 className="text-2xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Staff Governance</h2>
              <button onClick={() => setActiveHubView('main')} className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-900">Back to Grid</button>
           </div>
           {renderStaffHub()}
        </div>
      ) : (
        <div className="space-y-10">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-3">
              <div><h2 className="text-2xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Global Governance</h2><p className="text-slate-400 font-bold mt-2 md:mt-4 text-[10px] md:text-sm uppercase tracking-widest">Central Authority Node Configuration</p></div>
           </div>
           <div className="bg-slate-100 p-1.5 rounded-[2rem] md:rounded-[3rem] w-full flex overflow-x-auto scrollbar-hide gap-1 shadow-inner">
              {[{ id: 'branding', label: 'Branding', icon: '🎨' }, { id: 'attendance', label: 'Attendance', icon: '📋' }, { id: 'training', label: 'Events', icon: '🎓' }, { id: 'roles', label: 'Authority', icon: '🛡️' }, { id: 'nfc-id', label: 'Lifecycle', icon: '🪪' }, { id: 'reports', label: 'Firewall', icon: '📈' }, { id: 'security', label: 'Perimeter', icon: '🔒' }, { id: 'smtp', label: 'Relays', icon: '📡' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveAdminTab(tab.id as AdminTab)} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-[1.5rem] md:rounded-[2.2rem] text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${activeAdminTab === tab.id ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                  <span className="text-sm md:text-lg">{tab.icon}</span> {tab.label}
                </button>
              ))}
           </div>
           <div className="min-h-[500px]">{renderAdminTabs()}</div>
        </div>
      )}

      {/* INSPECTION DETAIL MODAL */}
      {viewedInspection && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[250] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-2xl w-full rounded-t-[2.5rem] md:rounded-[3.5rem] shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-start shrink-0">
                 <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Oversight Artifact</h3>
                    <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mt-1">{viewedInspection.id} • {viewedInspection.date}</p>
                 </div>
                 <button onClick={() => setViewedInspection(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                 {/* RP IDENTITY SECTION */}
                 <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex items-center gap-6 shadow-inner">
                    {(() => {
                       const auditor = users.find(u => u.id === viewedInspection.inspector);
                       const avatarUrl = auditor?.nfcUrl?.startsWith('data:') ? auditor.nfcUrl : `https://picsum.photos/seed/${auditor?.id || viewedInspection.inspector}/128/128`;
                       return (
                          <>
                             <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.8rem] bg-white border-4 border-white shadow-lg overflow-hidden shrink-0 relative">
                                <img src={avatarUrl} className="w-full h-full object-cover" alt="rp" />
                                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Verified Auditor"></div>
                             </div>
                             <div className="min-w-0 flex-1">
                                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Registered Auditor Artifact</p>
                                <h4 className="text-base md:text-xl font-black text-slate-900 uppercase truncate leading-none mb-2">{auditor?.name || viewedInspection.inspector || 'Regional Auditor'}</h4>
                                <div className="flex flex-wrap gap-2">
                                   <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[7px] md:text-[8px] font-black uppercase tracking-widest">Resource Person</span>
                                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">ID: {auditor?.id || viewedInspection.inspector}</span>
                                </div>
                             </div>
                          </>
                       );
                    })()}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <SummaryMetric label="Artifact Score" value={`${viewedInspection.score || viewedInspection.score}/5`} />
                    <SummaryMetric label="Oversight Status" value={viewedInspection.status} color={viewedInspection.status === 'Compliant' ? 'emerald' : 'rose'} />
                    <SummaryMetric label="Node Rating" value={`${viewedInspection.ratingEmoji || viewedInspection.rating_emoji} ${viewedInspection.ratingLabel || viewedInspection.rating_label}`} />
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Auditor Comments</h4>
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                       <p className="text-sm font-medium text-slate-800 leading-relaxed italic">"{viewedInspection.comments}"</p>
                    </div>
                 </div>
                 <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest mb-2">Institutional Advisory</p>
                    <p className="text-[10px] text-blue-800 leading-relaxed">This report has been finalized by the regional Resource Person. Action plans regarding discrepancies should be documented in the school registry within 72 hours.</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showDeleteConfirm && selectedArtifact && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[350] flex items-center justify-center p-6 animate-in fade-in duration-300"><div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 text-center"><div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-pulse">🗑️</div><h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">Revoke Request</h3><p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">Permanently decommission migration artifact <span className="font-black text-slate-900">#{selectedArtifact.id || selectedArtifact.ID}</span>?</p><div className="flex flex-col gap-3"><button onClick={executePurge} disabled={isProcessing} className="w-full h-14 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3">{isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Commit Revocation'}</button><button onClick={() => setShowDeleteConfirm(false)} disabled={isProcessing} className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Abort Protocol</button></div></div></div>
      )}

      {showNewRequest && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[250] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300"><div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 overflow-y-auto max-h-[95vh] custom-scrollbar"><div className="flex justify-between items-start mb-8"><div><h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Cluster Transfer</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Formal Migration Request</p></div><button onClick={() => setShowNewRequest(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">✕</button></div><form onSubmit={handleNewRequest} className="space-y-8"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Destination Node</label><div className="relative"><select required value={newRequestForm.target} onChange={e => setNewRequestForm({...newRequestForm, target: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black uppercase appearance-none cursor-pointer outline-none shadow-inner"><option value="">Select Destination...</option>{availableClusters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select><span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[8px]">▼</span></div></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Justification</label><textarea required value={newRequestForm.reason} onChange={e => setNewRequestForm({...newRequestForm, reason: e.target.value})} placeholder="Specify operational reason..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-medium outline-none h-40 resize-none shadow-inner" /></div><div className="flex gap-4"><button type="button" onClick={() => setShowNewRequest(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Discard</button><button type="submit" disabled={isProcessing} className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50">{isProcessing ? 'Syncing...' : 'Dispatch Request'}</button></div></form></div></div>
      )}
    </div>
  );
};

const SummaryMetric: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color = 'slate' }) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className={`text-sm font-black uppercase ${color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
  </div>
);

const TabItem = ({ label, active, onClick, count }: any) => (
  <button onClick={onClick} className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 ${active ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}>
    <span>{label}</span><span className={`px-2 py-0.5 rounded-full text-[8px] ${active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
  </button>
);

export default Governance;
