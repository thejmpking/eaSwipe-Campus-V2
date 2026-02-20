
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, Shift, ShiftAssignment } from '../types';
import { dataService } from '../services/dataService';
import ShiftRoster from './ShiftRoster';

interface ShiftManagementProps {
  initialView?: 'Registry' | 'Roster';
}

const ShiftManagement: React.FC<ShiftManagementProps> = ({ initialView = 'Registry' }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [view, setView] = useState<'Registry' | 'Assignments' | 'Detail' | 'Roster'>(initialView);
  const [activeModal, setActiveModal] = useState<'none' | 'create' | 'edit' | 'assign'>('none');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const [shiftForm, setShiftForm] = useState<Partial<Shift>>({
    label: '', startTime: '08:00', endTime: '16:00', gracePeriod: 15, earlyMarkMinutes: 5, type: 'Standard'
  });

  const [assignForm, setAssignForm] = useState<Partial<ShiftAssignment>>({
    shiftId: '', targetType: 'Class', targetId: '', targetName: '', startDate: new Date().toISOString().split('T')[0], endDate: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const formatTime12h = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const parts = timeStr.split(':');
      let hours = parseInt(parts[0]);
      const minutes = parts[1] ? parts[1].substring(0, 2).padStart(2, '0') : '00';
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const sanitizeTimeForInput = (timeStr: string) => {
    if (!timeStr) return '08:00';
    return timeStr.split(':').slice(0, 2).join(':'); 
  };

  const fetchRegistry = async () => {
    setIsLoading(true);
    try {
      const [dbShifts, dbAssignments, dbClasses, dbUsers, dbCategories] = await Promise.all([
        dataService.getRecords('shifts'),
        dataService.getRecords('shift_assignments'),
        dataService.getRecords('classes'),
        dataService.getUsers(),
        dataService.getRecords('shift_categories')
      ]);
      setShifts(dbShifts || []);
      setAssignments(dbAssignments || []);
      setAvailableClasses(dbClasses || []);
      setAvailableUsers(dbUsers || []);
      setCategories(dbCategories || []);
      
      if (dbCategories && dbCategories.length > 0 && !shiftForm.type) {
          setShiftForm(prev => ({ ...prev, type: dbCategories[0].label }));
      }
    } catch (e) {
      console.error("Cloud Node Sync Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRegistry(); }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const delayDebounceFn = setTimeout(() => {
      const source = assignForm.targetType === 'Class' ? availableClasses : availableUsers;
      const filtered = source.filter((item: any) => 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, assignForm.targetType, availableClasses, availableUsers]);

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCommitting(true);
    const shiftData: Shift = {
      id: selectedShift?.id || `SH-${Math.floor(Math.random() * 9000 + 1000)}`,
      label: shiftForm.label || 'Unnamed Shift',
      startTime: shiftForm.startTime || '08:00',
      endTime: shiftForm.endTime || '16:00',
      gracePeriod: Number(shiftForm.gracePeriod) || 0,
      earlyMarkMinutes: Number(shiftForm.earlyMarkMinutes) || 0,
      type: shiftForm.type as any || 'Standard',
      status: 'Active'
    };

    const res = await dataService.syncRecord('shifts', shiftData);
    if (res.status === 'success') {
      await fetchRegistry();
      setActiveModal('none');
    } else {
      alert(`Handshake Failure: ${res.message || 'Check SQL table presence.'}`);
    }
    setIsCommitting(false);
  };

  const handleDeleteShift = async (id: string) => {
    if (assignments.some(a => a.shiftId === id)) {
      alert("RESTRICTION: Shift is bound to active targets. Unbind entities before purge.");
      return;
    }
    if (window.confirm("PURGE CONFIRMATION: Decommissioning this template?")) {
      setIsCommitting(true);
      await dataService.deleteRecord('shifts', id);
      await fetchRegistry();
      setIsCommitting(false);
      setView('Registry');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.shiftId || !assignForm.targetId || !assignForm.startDate || !assignForm.endDate) {
      alert("Binding Error: All temporal parameters (Shift, Target, Start, End) are mandatory.");
      return;
    }

    setIsCommitting(true);
    const newAssign: ShiftAssignment = {
      id: `AS-${Math.floor(Math.random() * 100000)}`,
      shiftId: assignForm.shiftId!,
      targetId: assignForm.targetId!,
      targetName: assignForm.targetName || 'Unknown Entity',
      targetType: assignForm.targetType as any || 'Class',
      startDate: assignForm.startDate!,
      endDate: assignForm.endDate!,
      assignedDate: new Date().toISOString().split('T')[0]
    };

    const res = await dataService.syncRecord('shift_assignments', newAssign);
    if (res.status === 'success') {
      await fetchRegistry();
      setActiveModal('none');
    } else {
      if (res.message?.includes("PGRST204") || res.message?.includes("end_date") || res.message?.includes("start_date")) {
        const sqlFix = "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS start_date DATE; ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS end_date DATE;";
        if (confirm(`SQL SCHEMA MISMATCH: Your database table 'shift_assignments' is missing columns.\n\nWould you like to copy the corrective SQL code?`)) {
          navigator.clipboard.writeText(sqlFix);
          alert("SQL Fix copied! Paste and run it in your Supabase SQL Editor, then refresh.");
        }
      } else {
        alert(`Registry Sync Error: ${res.message || 'Unknown Failure'}`);
      }
    }
    setIsCommitting(false);
  };

  const deleteAssignment = async (id: string) => {
    if (window.confirm("UNBIND ALERT: Revoking this shift assignment?")) {
      await dataService.deleteRecord('shift_assignments', id);
      await fetchRegistry();
    }
  };

  if (isLoading && shifts.length === 0) return (
    <div className="p-10 md:p-20 text-center">
      <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Cloud Registry...</p>
    </div>
  );

  if (view === 'Roster') {
    return (
      <ShiftRoster 
        onBack={async () => {
          await fetchRegistry(); // Ensure return to Registry/Bindings is synced
          setView('Registry');
        }} 
        onSync={fetchRegistry} 
      />
    );
  }

  const currentShiftAssignments = selectedShift ? assignments.filter(a => a.shiftId === selectedShift.id) : [];

  return (
    <div className="space-y-6 md:space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700 px-2 md:px-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
        <div className="flex items-center gap-4 md:gap-6">
          {view === 'Detail' && (
             <button onClick={() => setView('Registry')} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm shrink-0">←</button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 md:mb-3">
               <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
               <span className="text-[8px] md:text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Temporal Node Sync</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none truncate uppercase">
                {view === 'Detail' ? selectedShift?.label : view === 'Assignments' ? 'Shift Bindings' : 'Shift Registry'}
            </h2>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
           <button onClick={() => setView('Roster')} className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 md:px-8 py-3.5 md:py-5 rounded-2xl md:rounded-3xl font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-emerald-100 active:scale-95 flex items-center justify-center gap-2"><span>📅</span> Roster</button>
           <button onClick={() => { setAssignForm({shiftId: selectedShift?.id || '', targetType: 'Class', startDate: new Date().toISOString().split('T')[0], endDate: ''}); setActiveModal('assign'); }} className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-900 px-6 md:px-8 py-3.5 md:py-5 rounded-2xl md:rounded-3xl font-black text-[9px] md:text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 active:scale-95">🔗 Bind</button>
           <button onClick={() => { setShiftForm({label: '', startTime: '08:00', endTime: '16:00', gracePeriod: 15, earlyMarkMinutes: 5, type: categories[0]?.label || 'Standard'}); setSelectedShift(null); setActiveModal('create'); }} className="w-full sm:w-auto bg-slate-900 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-[9px] md:text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 active:scale-95">➕ New Template</button>
        </div>
      </div>

      <div className="flex gap-1.5 p-1 bg-slate-200/50 rounded-2xl md:rounded-3xl w-full sm:w-fit shadow-inner">
         <button onClick={() => setView('Registry')} className={`flex-1 sm:flex-none px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'Registry' || view === 'Detail' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Registry</button>
         <button onClick={() => setView('Assignments')} className={`flex-1 sm:flex-none px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'Assignments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Bindings</button>
      </div>

      <div className="min-h-[400px]">
        {view === 'Registry' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
            {shifts.map(shift => (
              <div key={shift.id} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group relative overflow-hidden flex flex-col">
                <div className="mb-6 md:mb-8">
                   <div className="flex justify-between items-start mb-3 md:mb-4">
                      <span className="px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600">{shift.type}</span>
                      <span className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest">#{shift.id}</span>
                   </div>
                   <button onClick={() => { setSelectedShift(shift); setView('Detail'); }} className="text-left w-full">
                    <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2 hover:text-blue-600 transition-colors uppercase truncate">{shift.label}</h3>
                   </button>
                   <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{shift.status}</p>
                </div>
                <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                   <div className="flex justify-between p-3.5 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                      <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Window</span>
                      <span className="text-[11px] md:text-sm font-black text-slate-900">{formatTime12h(shift.startTime)} — {formatTime12h(shift.endTime)}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 text-center">
                        <p className="text-[7px] md:text-[8px] font-black text-blue-500 uppercase tracking-widest">Early Mark</p>
                        <p className="text-xs font-black text-blue-700">{shift.earlyMarkMinutes || 0}m</p>
                      </div>
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 text-center">
                        <p className="text-[7px] md:text-[8px] font-black text-amber-500 uppercase tracking-widest">Late Mark</p>
                        <p className="text-xs font-black text-amber-700">{shift.gracePeriod || 0}m</p>
                      </div>
                   </div>
                </div>
                <div className="mt-auto pt-6 md:pt-8 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[7px] md:text-[8px] font-black text-white shadow-sm shrink-0">
                        {assignments.filter(a => a.shiftId === shift.id).length}
                      </div>
                      <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Links</span>
                   </div>
                   <button onClick={() => { setSelectedShift(shift); setShiftForm({...shift, startTime: sanitizeTimeForInput(shift.startTime), endTime: sanitizeTimeForInput(shift.endTime)}); setActiveModal('edit'); }} className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Config →</button>
                </div>
              </div>
            ))}
          </div>
        ) : view === 'Assignments' ? (
          <div className="bg-white rounded-[1.5rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 md:px-10 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</th>
                    <th className="px-5 md:px-10 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                    <th className="px-5 md:px-10 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Template</th>
                    <th className="px-5 md:px-10 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assignments.map(assign => {
                    const shift = shifts.find(s => s.id === assign.shiftId);
                    return (
                      <tr key={assign.id} className="hover:bg-slate-50/50">
                        <td className="px-5 md:px-10 py-4 md:py-6">
                           <div className="flex items-center gap-3 md:gap-4 min-w-0">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 flex items-center justify-center shadow-sm shrink-0">{assign.targetType === 'Class' ? '📚' : '👤'}</div>
                              <div className="min-w-0">
                                 <p className="text-[11px] md:text-sm font-black text-slate-900 leading-none mb-1 md:mb-1.5 uppercase truncate">{assign.targetName}</p>
                                 <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase truncate">{assign.targetId}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-5 md:px-10 py-4 md:py-6">
                           <p className="text-[10px] md:text-xs font-black text-slate-600 uppercase whitespace-nowrap">{assign.startDate} <span className="text-slate-300">→</span></p>
                           <p className="text-[10px] md:text-xs font-black text-slate-600 uppercase whitespace-nowrap">{assign.endDate}</p>
                        </td>
                        <td className="px-5 md:px-10 py-4 md:py-6">
                           <p className="text-[10px] md:text-xs font-black truncate max-w-[100px] sm:max-w-none uppercase">{shift?.label || 'ORPHANED'}</p>
                           <p className="text-[8px] md:text-[10px] font-bold text-blue-500 uppercase">{formatTime12h(shift?.startTime || '')}</p>
                        </td>
                        <td className="px-5 md:px-10 py-4 md:py-6 text-right">
                           <button onClick={() => deleteAssignment(assign.id)} className="p-2 md:p-3 text-rose-400 hover:text-rose-600 active:scale-90 transition-all">🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                  {assignments.length === 0 && (
                    <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No active bindings found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                <div className="space-y-4 md:space-y-6">
                   <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 md:mb-6">Template Metadata</p>
                      <div className="space-y-3 md:space-y-4">
                         <div className="flex justify-between items-center"><span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">In</span><span className="text-[11px] md:text-xs font-black text-blue-600">{formatTime12h(selectedShift?.startTime || '')}</span></div>
                         <div className="flex justify-between items-center"><span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Out</span><span className="text-[11px] md:text-xs font-black text-blue-600">{formatTime12h(selectedShift?.endTime || '')}</span></div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Early Mark</span>
                            <span className="text-[11px] md:text-xs font-black text-emerald-600">{selectedShift?.earlyMarkMinutes || 0}m</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Late Mark</span>
                            <span className="text-[11px] md:text-xs font-black text-amber-600">{selectedShift?.gracePeriod || 0}m</span>
                         </div>
                      </div>
                      <button onClick={() => { setShiftForm({...selectedShift, startTime: sanitizeTimeForInput(selectedShift!.startTime), endTime: sanitizeTimeForInput(selectedShift!.endTime)}); setActiveModal('edit'); }} className="w-full mt-6 md:mt-8 py-3.5 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Modify Rules</button>
                   </div>
                </div>
                <div className="lg:col-span-3">
                   <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 md:p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-base md:text-xl font-black text-slate-900 uppercase">Bound Entities</h3>
                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentShiftAssignments.length} Linked</span>
                      </div>
                      <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-white border-b border-slate-50">
                               <tr>
                                  <th className="px-5 md:px-10 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                                  <th className="px-5 md:px-10 py-4 md:py-5 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {currentShiftAssignments.map(assign => (
                                 <tr key={assign.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 md:px-10 py-4 md:py-6"><p className="text-[11px] md:text-sm font-black text-slate-800 uppercase truncate">{assign.targetName}</p></td>
                                    <td className="px-5 md:px-10 py-4 md:py-6 text-right"><button onClick={() => deleteAssignment(assign.id)} className="text-rose-400 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest">Unbind</button></td>
                                 </tr>
                               ))}
                               {currentShiftAssignments.length === 0 && (
                                 <tr><td colSpan={2} className="py-16 text-center text-[10px] font-black text-slate-300 uppercase">No entities bound to this template</td></tr>
                               )}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {(activeModal === 'create' || activeModal === 'edit') && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[3.5rem] p-6 md:p-14 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex justify-between items-start mb-6 md:mb-10 sticky top-0 bg-white z-10 py-1 md:relative md:py-0 border-b border-slate-50 md:border-none">
                 <div>
                    <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-1 md:mb-2 uppercase">{activeModal === 'create' ? 'Define Template' : 'Modify Artifact'}</h3>
                    <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Writing Temporal Rules to Ledger</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-xl md:rounded-2xl text-slate-400 transition-all active:scale-90 shadow-sm shrink-0">✕</button>
              </div>

              <form onSubmit={handleSaveShift} className="space-y-5 md:space-y-6 pb-8 md:pb-0">
                 <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Label</label>
                    <input type="text" required value={shiftForm.label} onChange={e => setShiftForm({...shiftForm, label: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-3xl p-4 md:p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20 shadow-inner" placeholder="e.g. Standard Morning" />
                 </div>
                 <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clock-In</label>
                       <input type="time" required value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 text-sm font-black shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clock-Out</label>
                       <input type="time" required value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 text-sm font-black shadow-inner" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Early Mark (Minutes)</label>
                       <input type="number" required value={shiftForm.earlyMarkMinutes} onChange={e => setShiftForm({...shiftForm, earlyMarkMinutes: parseInt(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 text-sm font-black shadow-inner" placeholder="e.g. 5" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Late Mark (Minutes)</label>
                       <input type="number" required value={shiftForm.gracePeriod} onChange={e => setShiftForm({...shiftForm, gracePeriod: parseInt(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 text-sm font-black shadow-inner" placeholder="e.g. 15" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shift Taxonomy (Category)</label>
                    <div className="relative">
                       <select required value={shiftForm.type} onChange={e => setShiftForm({...shiftForm, type: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm font-black outline-none appearance-none cursor-pointer shadow-inner">
                          {categories.map(cat => <option key={cat.id} value={cat.label}>{cat.label}</option>)}
                          {categories.length === 0 && <option value="Standard">Standard Shift</option>}
                       </select>
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">▼</span>
                    </div>
                 </div>
                 <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 md:pt-10">
                    <button type="button" onClick={() => setActiveModal('none')} className="w-full md:flex-1 py-4 md:py-5 bg-slate-100 text-slate-600 rounded-xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-widest active:scale-95 transition-all">Discard</button>
                    <button type="submit" disabled={isCommitting} className="w-full md:flex-[2] py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                       {isCommitting ? 'SYNCING...' : 'COMMIT TEMPLATE'}
                    </button>
                    {activeModal === 'edit' && (
                       <button type="button" onClick={() => handleDeleteShift(selectedShift!.id)} className="w-full md:w-auto px-6 md:px-8 py-4 md:py-5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl md:rounded-3xl font-black text-xs uppercase transition-all hover:bg-rose-100 active:scale-90">🗑️</button>
                    )}
                 </div>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'assign' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[3.5rem] p-6 md:p-12 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 overflow-y-auto max-h-[95vh] custom-scrollbar flex flex-col">
              <div className="flex justify-between items-start mb-6 md:mb-10 sticky top-0 bg-white z-10 py-1 md:relative md:py-0 border-b border-slate-100 md:border-none">
                 <div>
                    <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-1 md:mb-2 uppercase">Node Binding</h3>
                    <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Mapping Identities to Temporal Windows</p>
                 </div>
                 <button onClick={() => setActiveModal('none')} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all shadow-sm shrink-0">✕</button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-6 md:space-y-8 pb-8 md:pb-0">
                 <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Template</label>
                    <div className="relative">
                       <select required value={assignForm.shiftId} onChange={e => setAssignForm({...assignForm, shiftId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm font-black uppercase shadow-inner appearance-none cursor-pointer">
                          <option value="">Choose Shift...</option>
                          {shifts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                       </select>
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">▼</span>
                    </div>
                 </div>

                 <div className="space-y-4 md:space-y-6">
                    <div className="flex p-1 bg-slate-100 rounded-xl md:rounded-2xl shadow-inner">
                       <button type="button" onClick={() => { setAssignForm({...assignForm, targetType: 'Class', targetId: '', targetName: ''}); setSearchQuery(''); }} className={`flex-1 py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${assignForm.targetType === 'Class' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Class</button>
                       <button type="button" onClick={() => { setAssignForm({...assignForm, targetType: 'Individual', targetId: '', targetName: ''}); setSearchQuery(''); }} className={`flex-1 py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${assignForm.targetType === 'Individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Person</button>
                    </div>
                    <div className="relative">
                       <input 
                         type="text" 
                         required 
                         placeholder="Search Node Ledger..." 
                         value={searchQuery} 
                         onFocus={() => setShowResults(true)} 
                         onChange={e => {setSearchQuery(e.target.value); setShowResults(true);}} 
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm font-black uppercase shadow-inner outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20" 
                       />
                       {showResults && searchQuery.length >= 2 && (
                          <div className="absolute z-[110] left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in slide-in-from-top-2">
                             {searchResults.map(item => (
                               <button key={item.id} type="button" onClick={() => { setAssignForm({...assignForm, targetId: item.id, targetName: item.name}); setSearchQuery(item.name); setShowResults(false); }} className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-blue-50 text-left border-b border-slate-50 last:border-0 transition-colors">
                                  <p className="text-xs md:text-sm font-black text-slate-800 uppercase">{item.name}</p>
                                  <span className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Select</span>
                               </button>
                             ))}
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 md:gap-6 pt-2">
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">From Date</label>
                       <input 
                        type="date" 
                        required 
                        value={assignForm.startDate} 
                        onChange={e => setAssignForm({...assignForm, startDate: e.target.value})} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 text-sm font-black shadow-inner" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Date</label>
                       <input 
                        type="date" 
                        required 
                        value={assignForm.endDate} 
                        onChange={e => setAssignForm({...assignForm, endDate: e.target.value})} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 text-sm font-black shadow-inner" 
                       />
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 md:pt-10 border-t border-slate-50">
                   <button type="button" onClick={() => setActiveModal('none')} className="w-full md:flex-1 py-4 md:py-5 bg-slate-100 text-slate-600 rounded-xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all">Cancel</button>
                   <button type="submit" disabled={!assignForm.shiftId || !assignForm.targetId || !assignForm.startDate || !assignForm.endDate || isCommitting} className="w-full md:flex-[2] py-4 md:py-5 bg-indigo-600 text-white rounded-xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                      {isCommitting ? 'HANDSHAKE...' : 'LINK BINDING'}
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;
