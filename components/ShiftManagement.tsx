
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
    label: '', startTime: '08:00', endTime: '16:00', gracePeriod: 15, type: 'Standard'
  });

  const [assignForm, setAssignForm] = useState<Partial<ShiftAssignment>>({
    shiftId: '', targetType: 'Class', targetId: '', targetName: ''
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
      
      // Default type to first category if form is empty
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
      gracePeriod: Number(shiftForm.gracePeriod) || 15,
      type: shiftForm.type as any || 'Standard',
      status: 'Active'
    };

    const res = await dataService.syncRecord('shifts', shiftData);
    if (res.status === 'success') {
      await fetchRegistry();
      setActiveModal('none');
    } else {
      alert("Binding Error: Ensure SQL tables are provisioned.");
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
    if (!assignForm.shiftId || !assignForm.targetId) return;

    setIsCommitting(true);
    const newAssign: ShiftAssignment = {
      id: `AS-${Math.floor(Math.random() * 100000)}`,
      shiftId: assignForm.shiftId,
      targetId: assignForm.targetId,
      targetName: assignForm.targetName || 'Unknown Entity',
      targetType: assignForm.targetType as any || 'Class',
      assignedDate: new Date().toISOString().split('T')[0]
    };

    const res = await dataService.syncRecord('shift_assignments', newAssign);
    if (res.status === 'success') {
      await fetchRegistry();
      setActiveModal('none');
    } else {
      alert("Handshake Failure: Verify SQL schema.");
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
    <div className="p-20 text-center">
      <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Cloud Registry...</p>
    </div>
  );

  if (view === 'Roster') {
    return <ShiftRoster onBack={() => setView('Registry')} />;
  }

  const currentShiftAssignments = selectedShift ? assignments.filter(a => a.shiftId === selectedShift.id) : [];

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          {view === 'Detail' && (
             <button onClick={() => setView('Registry')} className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm shrink-0">←</button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-3">
               <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Temporal Node Sync</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                {view === 'Detail' ? selectedShift?.label : view === 'Assignments' ? 'Shift Bindings' : 'Shift Template Registry'}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
           <button onClick={() => setView('Roster')} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 active:scale-95 flex items-center gap-3"><span>📅</span> Shift Roster</button>
           <button onClick={() => { setAssignForm({shiftId: selectedShift?.id || '', targetType: 'Class'}); setActiveModal('assign'); }} className="bg-white border border-slate-200 text-slate-900 px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 active:scale-95">🔗 Bind Shift</button>
           <button onClick={() => { setShiftForm({label: '', startTime: '08:00', endTime: '16:00', gracePeriod: 15, type: categories[0]?.label || 'Standard'}); setSelectedShift(null); setActiveModal('create'); }} className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 active:scale-95">➕ Create Template</button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-3xl w-fit">
         <button onClick={() => setView('Registry')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'Registry' || view === 'Detail' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Registry</button>
         <button onClick={() => setView('Assignments')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'Assignments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Bindings</button>
      </div>

      <div className="min-h-[500px]">
        {view === 'Registry' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {shifts.map(shift => (
              <div key={shift.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all group relative overflow-hidden flex flex-col">
                <div className="mb-8">
                   <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600">{shift.type}</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{shift.id}</span>
                   </div>
                   <button onClick={() => { setSelectedShift(shift); setView('Detail'); }} className="text-left">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2 hover:text-blue-600 transition-colors">{shift.label}</h3>
                   </button>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shift.status}</p>
                </div>
                <div className="space-y-4 mb-10">
                   <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Window</span>
                      <span className="text-sm font-black text-slate-900">{formatTime12h(shift.startTime)} — {formatTime12h(shift.endTime)}</span>
                   </div>
                </div>
                <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex -space-x-3">
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                        {assignments.filter(a => a.shiftId === shift.id).length}
                      </div>
                   </div>
                   <button onClick={() => { setSelectedShift(shift); setShiftForm({...shift, startTime: sanitizeTimeForInput(shift.startTime), endTime: sanitizeTimeForInput(shift.endTime)}); setActiveModal('edit'); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Configure →</button>
                </div>
              </div>
            ))}
          </div>
        ) : view === 'Assignments' ? (
          <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Template</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assignments.map(assign => {
                    const shift = shifts.find(s => s.id === assign.shiftId);
                    return (
                      <tr key={assign.id} className="hover:bg-slate-50/50">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shadow-sm">{assign.targetType === 'Class' ? '📚' : '👤'}</div>
                              <div>
                                 <p className="text-sm font-black text-slate-900 leading-none mb-1.5">{assign.targetName}</p>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase">{assign.targetId}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <p className="text-xs font-black">{shift?.label || 'ORPHANED'}</p>
                           <p className="text-[10px] font-bold text-blue-500">{formatTime12h(shift?.startTime || '')}</p>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <button onClick={() => deleteAssignment(assign.id)} className="p-3 text-rose-400 hover:text-rose-600 active:scale-90 transition-all">🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="space-y-6">
                   <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Template Metadata</p>
                      <div className="space-y-4">
                         <div className="flex justify-between"><span className="text-xs font-bold text-slate-500">In</span><span className="text-xs font-black text-blue-600">{formatTime12h(selectedShift?.startTime || '')}</span></div>
                         <div className="flex justify-between"><span className="text-xs font-bold text-slate-500">Out</span><span className="text-xs font-black text-blue-600">{formatTime12h(selectedShift?.endTime || '')}</span></div>
                         <div className="flex justify-between"><span className="text-xs font-bold text-slate-500">Grace</span><span className="text-xs font-black text-emerald-600">{selectedShift?.gracePeriod}m</span></div>
                      </div>
                      <button onClick={() => { setShiftForm({...selectedShift, startTime: sanitizeTimeForInput(selectedShift!.startTime), endTime: sanitizeTimeForInput(selectedShift!.endTime)}); setActiveModal('edit'); }} className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Modify Rules</button>
                   </div>
                </div>
                <div className="lg:col-span-3">
                   <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900">Bound Entities</h3>
                      </div>
                      <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead className="bg-white border-b border-slate-50">
                               <tr>
                                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                                  <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {currentShiftAssignments.map(assign => (
                                 <tr key={assign.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-10 py-6"><p className="text-sm font-black text-slate-800">{assign.targetName}</p></td>
                                    <td className="px-10 py-6 text-right"><button onClick={() => deleteAssignment(assign.id)} className="text-rose-400 hover:text-rose-600 text-xs font-bold">Unbind</button></td>
                                 </tr>
                               ))}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-2xl w-full rounded-[4rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8">{activeModal === 'create' ? 'Define Template' : 'Modify Artifact'}</h3>
              <form onSubmit={handleSaveShift} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Label</label>
                    <input type="text" required value={shiftForm.label} onChange={e => setShiftForm({...shiftForm, label: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="e.g. Standard Morning" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clock-In</label><input type="time" required value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clock-Out</label><input type="time" required value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" /></div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shift Type (Taxonomy)</label>
                    <select required value={shiftForm.type} onChange={e => setShiftForm({...shiftForm, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none">
                       {categories.map(cat => <option key={cat.id} value={cat.label}>{cat.label}</option>)}
                       {categories.length === 0 && <option value="Standard">Standard Shift</option>}
                    </select>
                 </div>
                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setActiveModal('none')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black text-xs uppercase tracking-widest">Discard</button>
                    <button type="submit" disabled={isCommitting} className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl">{isCommitting ? 'Cloud Syncing...' : 'Commit Template'}</button>
                    {activeModal === 'edit' && <button type="button" onClick={() => handleDeleteShift(selectedShift!.id)} className="px-6 py-5 bg-rose-50 text-rose-600 rounded-3xl font-black text-xs uppercase tracking-widest">🗑️</button>}
                 </div>
              </form>
           </div>
        </div>
      )}

      {activeModal === 'assign' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-xl w-full rounded-[4rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Node Assignment</h3>
              <form onSubmit={handleCreateAssignment} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Template</label>
                    <select required value={assignForm.shiftId} onChange={e => setAssignForm({...assignForm, shiftId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold">
                       <option value="">Choose Shift Template...</option>
                       {shifts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                 </div>
                 <div className="space-y-6">
                    <div className="flex p-1 bg-slate-100 rounded-2xl">
                       <button type="button" onClick={() => { setAssignForm({...assignForm, targetType: 'Class', targetId: '', targetName: ''}); setSearchQuery(''); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${assignForm.targetType === 'Class' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Class</button>
                       <button type="button" onClick={() => { setAssignForm({...assignForm, targetType: 'Individual', targetId: '', targetName: ''}); setSearchQuery(''); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${assignForm.targetType === 'Individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Person</button>
                    </div>
                    <div className="relative">
                       <input type="text" required placeholder="Search Registry..." value={searchQuery} onFocus={() => setShowResults(true)} onChange={e => {setSearchQuery(e.target.value); setShowResults(true);}} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold uppercase shadow-inner" />
                       {showResults && searchQuery.length >= 2 && (
                          <div className="absolute z-[110] left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                             {searchResults.map(item => (
                               <button key={item.id} type="button" onClick={() => { setAssignForm({...assignForm, targetId: item.id, targetName: item.name}); setSearchQuery(item.name); setShowResults(false); }} className="w-full flex items-center justify-between p-5 hover:bg-blue-50 text-left border-b border-slate-50 last:border-0"><p className="text-sm font-black text-slate-800">{item.name}</p><span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Select</span></button>
                             ))}
                          </div>
                       )}
                    </div>
                 </div>
                 <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setActiveModal('none')} className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black text-xs uppercase tracking-widest">Cancel</button>
                   <button type="submit" disabled={!assignForm.shiftId || !assignForm.targetId || isCommitting} className="flex-1 px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl">{isCommitting ? 'Cloud Handshake...' : 'Link Binding'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;
