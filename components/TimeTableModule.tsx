
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Shift, TimeTable, TimeTableSlot } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface TimeTableModuleProps {
  userRole: UserRole;
  userId: string;
  userAssignment: string;
  users: UserIdentity[];
  onSyncRegistry: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const TimeTableModule: React.FC<TimeTableModuleProps> = ({ userRole, userId, userAssignment, users, onSyncRegistry }) => {
  const [timeTables, setTimeTables] = useState<TimeTable[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingTT, setEditingTT] = useState<TimeTable | null>(null);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

  const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN].includes(userRole);
  
  const [formData, setFormData] = useState<Partial<TimeTable>>({
    label: '',
    shiftId: '',
    targetId: '',
    targetType: 'Class',
    status: 'Active',
    content: []
  });

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  const fetchRegistry = async () => {
    setIsLoading(true);
    try {
      const [dbTT, dbShifts, dbClasses] = await Promise.all([
        dataService.getRecords('time_tables'),
        dataService.getRecords('shifts'),
        dataService.getRecords('classes')
      ]);
      setTimeTables(dbTT.map((t: any) => ({
        ...t,
        content: typeof t.content === 'string' ? JSON.parse(t.content) : (t.content || [])
      })) || []);
      setShifts(dbShifts || []);
      
      const allClassNodes = dbClasses || [];
      if (userRole === UserRole.SCHOOL_ADMIN) {
        setClasses(allClassNodes.filter((c: any) => c.school === userAssignment));
      } else {
        setClasses(allClassNodes);
      }
    } catch (e) {
      console.error("TimeTable Sync Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRegistry(); }, []);

  const myTimeTable = useMemo(() => {
    if (isAdmin) return null;
    const me = users.find(u => u.id === userId);
    if (!me) return null;

    if (userRole === UserRole.STUDENT) {
      return timeTables.find(t => 
        t.targetType === 'Class' && 
        (t.targetId === me.assignment || (me.designation && t.targetId.includes(me.designation)))
      );
    } else {
      // Teachers & RP bind via Individual ID
      return timeTables.find(t => t.targetType === 'Individual' && t.targetId === userId);
    }
  }, [timeTables, userRole, userId, users, isAdmin]);

  // STAFF SPECIFIC: Calculate Current & Upcoming Periods
  const temporalInsights = useMemo(() => {
    if (!myTimeTable) return { current: null, upcoming: null };
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const nowTotalMinutes = nowHours * 60 + nowMinutes;

    const todaySlots = myTimeTable.content
      .filter(s => s.day === currentDay)
      .map(s => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return {
          ...s,
          startTotal: sh * 60 + sm,
          endTotal: eh * 60 + em
        };
      })
      .sort((a, b) => a.startTotal - b.startTotal);

    const current = todaySlots.find(s => nowTotalMinutes >= s.startTotal && nowTotalMinutes < s.endTotal);
    const upcoming = todaySlots.find(s => s.startTotal > nowTotalMinutes);

    return { current, upcoming };
  }, [myTimeTable]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let resolvedTargetId = formData.targetId;
    if (formData.targetType === 'Class') {
      const classNode = classes.find(c => c.id === selectedClassId);
      if (!classNode) {
         alert("Validation Error: Please select a valid class node.");
         return;
      }
      if (selectedGrades.length === 0) {
        alert("Validation Error: Please select at least one grade artifact.");
        return;
      }
      resolvedTargetId = `${classNode.name}:${selectedGrades.join(',')}`;
    }

    if (!formData.shiftId || !resolvedTargetId) {
      alert("Binding Error: Shift and Target nodes are mandatory.");
      return;
    }

    setIsCommitting(true);
    const ttData: TimeTable = {
      id: editingTT?.id || `TT-${Date.now().toString().slice(-6)}`,
      label: formData.label || 'Standard Schedule',
      shiftId: formData.shiftId!,
      targetId: resolvedTargetId,
      targetType: formData.targetType as any,
      school: userAssignment,
      content: formData.content || [],
      status: 'Active'
    };

    const res = await dataService.syncRecord('time_tables', {
      ...ttData,
      content: JSON.stringify(ttData.content)
    });

    if (res.status === 'success') {
      await fetchRegistry();
      setIsProvisioning(false);
      setEditingTT(null);
    } else {
      alert(`Registry Failure: ${res.message}`);
    }
    setIsCommitting(false);
  };

  const addSlot = () => {
    const newId = `SLOT-${Math.random().toString(36).substr(2, 9)}`;
    const newSlot: TimeTableSlot = {
      id: newId,
      subject: 'New Subject',
      day: 'Monday',
      startTime: '08:00',
      endTime: '09:00',
      facultyName: '',
      facultyId: ''
    };
    setFormData(prev => ({ ...prev, content: [...(prev.content || []), newSlot] }));
    setExpandedSlotId(newId);
  };

  const updateSlot = (slotId: string, updates: Partial<TimeTableSlot>) => {
    setFormData(prev => ({
      ...prev,
      content: (prev.content || []).map(s => s.id === slotId ? { ...s, ...updates } : s)
    }));
  };

  const removeSlot = (slotId: string) => {
    setFormData(prev => ({
      ...prev,
      content: (prev.content || []).filter(s => s.id !== slotId)
    }));
    if (expandedSlotId === slotId) setExpandedSlotId(null);
  };

  const handleSaveSlot = (slot: TimeTableSlot) => {
    const clash = (formData.content || []).find(s => 
      s.id !== slot.id && 
      s.day === slot.day && 
      s.startTime === slot.startTime
    );

    if (clash) {
      alert(`TIMELINE COLLISION: The time slot ${format12h(slot.startTime)} on ${slot.day} is already assigned to "${clash.subject}". Please adjust the start time to ensure a unique chronological map.`);
      return;
    }

    setExpandedSlotId(null);
  };

  const format12h = (time: string) => {
    if (!time) return '--:--';
    const [h, m] = time.split(':');
    const hours = parseInt(h);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
  };

  const handleEdit = (tt: TimeTable) => {
    setEditingTT(tt);
    setFormData({ ...tt });
    
    if (tt.targetType === 'Class' && tt.targetId.includes(':')) {
       const [className, gradeStr] = tt.targetId.split(':');
       const matchedClass = classes.find(c => c.name === className);
       if (matchedClass) {
          setSelectedClassId(matchedClass.id);
          setSelectedGrades(gradeStr.split(','));
       }
    } else {
       setSelectedClassId('');
       setSelectedGrades([]);
    }
    setIsProvisioning(true);
    setExpandedSlotId(null);
  };

  const currentSelectedClassGrades = useMemo(() => {
    const matched = classes.find(c => c.id === selectedClassId);
    if (!matched) return [];
    return typeof matched.grades === 'string' ? JSON.parse(matched.grades) : (matched.grades || []);
  }, [selectedClassId, classes]);

  const filteredUsersForIndividual = useMemo(() => {
    return users.filter(u => {
       const isNotStudent = u.role !== UserRole.STUDENT;
       if (userRole === UserRole.SCHOOL_ADMIN) {
          return isNotStudent && (u.school === userAssignment || u.assignment === userAssignment);
       }
       return isNotStudent;
    });
  }, [users, userRole, userAssignment]);

  if (isLoading && timeTables.length === 0) return <div className="p-20 text-center animate-pulse text-[10px] font-black uppercase text-slate-400">Syncing Temporal Fabric...</div>;

  const renderSchedule = (tt: TimeTable) => (
    <div className="space-y-10 animate-in fade-in duration-700">
       {/* STAFF HEADER: Current & Upcoming Periods */}
       {(userRole === UserRole.TEACHER || userRole === UserRole.RESOURCE_PERSON) && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {/* Current Period Card */}
            <div className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/10">
               <div className="absolute -right-4 -bottom-4 opacity-5 text-8xl font-black">NOW</div>
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                     <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_#10b981]"></span>
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">Currently Active</p>
                  </div>
                  {temporalInsights.current ? (
                    <div>
                       <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">{temporalInsights.current.subject}</h3>
                       <p className="text-slate-400 font-bold mt-3 text-sm uppercase tracking-widest">
                          {format12h(temporalInsights.current.startTime)} — {format12h(temporalInsights.current.endTime)}
                       </p>
                       <p className="text-blue-500 text-[10px] font-black uppercase mt-4">Room: {temporalInsights.current.room || 'Main Hall'}</p>
                    </div>
                  ) : (
                    <div className="py-2">
                       <p className="text-slate-500 font-bold uppercase text-xs italic">No active session at this time.</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Upcoming Period Card */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-8xl font-black text-slate-900">NEXT</div>
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                     <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_12px_#6366f1]"></span>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Next Up</p>
                  </div>
                  {temporalInsights.upcoming ? (
                    <div>
                       <h3 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 uppercase leading-none group-hover:text-indigo-600 transition-colors">{temporalInsights.upcoming.subject}</h3>
                       <p className="text-slate-400 font-bold mt-3 text-sm uppercase tracking-widest">
                          Starts @ {format12h(temporalInsights.upcoming.startTime)}
                       </p>
                       <p className="text-indigo-500 text-[10px] font-black uppercase mt-4">Venue: {temporalInsights.upcoming.room || 'TBD'}</p>
                    </div>
                  ) : (
                    <div className="py-2">
                       <p className="text-slate-300 font-bold uppercase text-xs italic">No more sessions today.</p>
                    </div>
                  )}
               </div>
            </div>
         </div>
       )}

       {/* DAILY DROPDOWN ACCORDION VIEW */}
       <div className="space-y-4">
          <div className="flex items-center gap-3 px-2 mb-2">
             <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Full Weekly Temporal Roadmap</h4>
          </div>
          
          {DAYS.map(day => {
            const daySlots = tt.content.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (daySlots.length === 0) return null;
            const isOpen = expandedDay === day;

            return (
              <div key={day} className={`bg-white rounded-[2rem] border transition-all duration-500 overflow-hidden ${isOpen ? 'border-blue-200 shadow-xl' : 'border-slate-100 shadow-sm opacity-80 hover:opacity-100'}`}>
                <button 
                  onClick={() => setExpandedDay(isOpen ? null : day)}
                  className={`w-full flex items-center justify-between px-8 py-6 text-left transition-colors ${isOpen ? 'bg-blue-50/30' : 'bg-white hover:bg-slate-50'}`}
                >
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                         🗓️
                      </div>
                      <div>
                        <h4 className={`text-base font-black uppercase tracking-tight ${isOpen ? 'text-blue-600' : 'text-slate-900'}`}>{day}</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{daySlots.length} Scheduled Periods</p>
                      </div>
                   </div>
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : ''}`}>
                      ▼
                   </div>
                </button>

                {isOpen && (
                  <div className="p-4 md:p-8 animate-in slide-in-from-top-4 duration-500 bg-white">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {daySlots.map(slot => (
                          <div key={slot.id} className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 shadow-inner group/slot relative overflow-hidden hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
                             <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover/slot:opacity-10 transition-all">📚</div>
                             <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-3">{format12h(slot.startTime)} — {format12h(slot.endTime)}</p>
                             <h5 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2 truncate">{slot.subject}</h5>
                             <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none truncate">@{slot.room || 'Campus Node'}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
              </div>
            );
          })}
       </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-500">
      {isAdmin ? (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 md:px-0">
            <div>
              <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase">Schedule Ledger</h2>
              <p className="text-slate-400 font-bold mt-3 text-[10px] md:text-sm uppercase tracking-widest">Constructing the institutional chronological backbone</p>
            </div>
            <button 
              onClick={() => { setEditingTT(null); setFormData({label: '', shiftId: '', targetId: '', targetType: 'Class', content: []}); setSelectedClassId(''); setSelectedGrades([]); setIsProvisioning(true); }}
              className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl md:rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              ➕ Provision Timetable
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 px-2 md:px-0">
             {timeTables.map(tt => (
               <div key={tt.id} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6 md:mb-8">
                     <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm">{tt.id}</span>
                     <div className="flex gap-2">
                        <button onClick={() => handleEdit(tt)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm">✏️</button>
                        <button onClick={async () => { if (confirm("PURGE CONFIRMATION: Decommission this schedule?")) { await dataService.deleteRecord('time_tables', tt.id); fetchRegistry(); } }} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm">🗑️</button>
                     </div>
                  </div>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors uppercase leading-tight tracking-tight">{tt.label}</h3>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{tt.targetType}: <span className="text-slate-900">{tt.targetId.includes(':') ? tt.targetId.split(':')[0] : tt.targetId}</span></p>
                  
                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-lg shadow-inner">📅</div>
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Content Capacity</p>
                           <p className="text-xs font-black text-slate-800 uppercase">{tt.content.length} Periods Defined</p>
                        </div>
                     </div>
                     <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg uppercase">{tt.status}</span>
                  </div>
               </div>
             ))}
             {timeTables.length === 0 && (
               <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 px-6">
                  <div className="text-5xl mb-6 grayscale opacity-20">🗓️</div>
                  <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No institutional schedules found in current ledger.</p>
               </div>
             )}
          </div>
        </div>
      ) : (
        <div className="px-2 md:px-0">
           {myTimeTable ? renderSchedule(myTimeTable) : (
             <div className="py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 px-6">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner grayscale opacity-40">🗓️</div>
                <h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase mb-3">No Schedule Artifact</h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-sm max-w-md mx-auto leading-relaxed">
                  Your identity node is currently operating without a bound temporal timetable. Please contact your <span className="text-blue-600">School Administrator</span> to initialize your schedule node.
                </p>
             </div>
           )}
        </div>
      )}

      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-4xl w-full rounded-t-[2.5rem] md:rounded-[4rem] shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 overflow-y-auto max-h-[96vh] custom-scrollbar flex flex-col">
              <div className="p-6 md:p-14 pb-4 md:pb-8 flex justify-between items-start sticky top-0 bg-white z-10 border-b border-slate-100 md:border-none">
                 <div>
                    <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">{editingTT ? 'Modify Map' : 'Provision Map'}</h3>
                    <p className="text-slate-400 font-bold text-[9px] md:text-sm uppercase tracking-widest mt-2">Writing Temporal Logic to Core Ledger</p>
                 </div>
                 <button onClick={() => setIsProvisioning(false)} className="w-10 h-10 md:w-14 md:h-14 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-slate-400 transition-all active:scale-90 shadow-sm shrink-0">✕</button>
              </div>

              <form onSubmit={handleSave} className="p-6 md:p-14 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Institutional Label</label>
                       <input 
                         type="text" required value={formData.label} 
                         onChange={e => setFormData({...formData, label: e.target.value})} 
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 md:p-5 text-sm font-black outline-none focus:ring-8 focus:ring-blue-500/5 shadow-inner uppercase placeholder:normal-case" 
                         placeholder="e.g. GRADE 10 SCIENCE"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Primary Shift Anchor</label>
                       <div className="relative">
                          <select 
                            required value={formData.shiftId} 
                            onChange={e => setFormData({...formData, shiftId: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 md:p-5 text-sm font-medium appearance-none cursor-pointer outline-none focus:ring-8 focus:ring-blue-500/5 shadow-inner uppercase"
                          >
                             <option value="">Select Anchor Shift...</option>
                             {shifts.map(s => <option key={s.id} value={s.id}>{s.label} ({s.startTime} - {s.endTime})</option>)}
                          </select>
                          <span className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[10px]">▼</span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Target Taxonomy</label>
                       <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner">
                          <button type="button" onClick={() => setFormData({...formData, targetType: 'Class', targetId: ''})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.targetType === 'Class' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Class & Grade</button>
                          <button type="button" onClick={() => setFormData({...formData, targetType: 'Individual', targetId: ''})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.targetType === 'Individual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Individual</button>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Target Node Binder</label>
                       <div className="relative">
                          {formData.targetType === 'Class' ? (
                             <select 
                               required value={selectedClassId} 
                               onChange={e => { setSelectedClassId(e.target.value); setSelectedGrades([]); }}
                               className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 md:p-5 text-sm font-medium appearance-none cursor-pointer outline-none focus:ring-8 focus:ring-blue-500/5 shadow-inner uppercase"
                             >
                                <option value="">Choose Class...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>) }
                             </select>
                          ) : (
                             <select 
                               required value={formData.targetId} 
                               onChange={e => setFormData({...formData, targetId: e.target.value})}
                               className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 md:p-5 text-sm font-medium appearance-none cursor-pointer outline-none focus:ring-8 focus:ring-blue-500/5 shadow-inner uppercase"
                             >
                                <option value="">Choose Personnel...</option>
                                {filteredUsersForIndividual.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role.split('_')[0]})</option>) }
                             </select>
                          )}
                          <span className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[10px]">▼</span>
                       </div>
                    </div>
                 </div>

                 {formData.targetType === 'Class' && selectedClassId && (
                   <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between px-2">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mark Grades for Schedule Binding</h4>
                         <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase">{selectedGrades.length} Marked</span>
                      </div>
                      <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] shadow-inner">
                         {currentSelectedClassGrades.map((grade: string) => {
                           const isSelected = selectedGrades.includes(grade);
                           return (
                             <button
                               key={grade}
                               type="button"
                               onClick={() => setSelectedGrades(prev => isSelected ? prev.filter(g => g !== grade) : [...prev, grade])}
                               className={`px-6 py-3 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border-2 ${
                                 isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20' : 'bg-white border-white text-slate-400 hover:border-blue-100'
                               }`}
                             >
                               {classes.find(c => c.id === selectedClassId)?.name}{grade}
                             </button>
                           );
                         })}
                      </div>
                   </div>
                 )}

                 <div className="space-y-6 pt-10 border-t border-slate-100">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Chronological Slots</h4>
                       <button type="button" onClick={addSlot} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95">➕ Add Period</button>
                    </div>

                    <div className="space-y-4">
                       {(formData.content || []).map((slot, idx) => {
                         const isExpanded = expandedSlotId === slot.id;
                         return (
                           <div key={slot.id} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-md">
                              {/* Accordion Header */}
                              <div 
                                onClick={() => setExpandedSlotId(isExpanded ? null : slot.id)}
                                className="flex items-center justify-between p-5 md:p-6 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                                       {idx + 1}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{slot.subject}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{slot.day} • {format12h(slot.startTime)} — {format12h(slot.endTime)}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <button 
                                      type="button" 
                                      onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }} 
                                      className="p-2 text-rose-300 hover:text-rose-600 transition-colors active:scale-90"
                                    >
                                      🗑️
                                    </button>
                                    <span className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                 </div>
                              </div>

                              {/* Expanded Form Body */}
                              {isExpanded && (
                                <div className="p-6 md:p-10 border-t border-slate-50 bg-white space-y-6 animate-in slide-in-from-top-2 duration-300">
                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                      <div className="space-y-2">
                                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Day</label>
                                         <select value={slot.day} onChange={e => updateSlot(slot.id, { day: e.target.value as any })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-medium uppercase outline-none focus:border-blue-400 shadow-inner">
                                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                         </select>
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Subject Title</label>
                                         <input type="text" value={slot.subject} onChange={e => updateSlot(slot.id, { subject: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-400 shadow-inner" />
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Room/Venue</label>
                                         <input type="text" value={slot.room || ''} onChange={e => updateSlot(slot.id, { room: e.target.value })} placeholder="e.g. Lab 1" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-400 shadow-inner placeholder:normal-case" />
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Time In</label>
                                         <input type="time" value={slot.startTime} onChange={e => updateSlot(slot.id, { startTime: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-400 shadow-inner" />
                                      </div>
                                      <div className="space-y-2">
                                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Time Out</label>
                                         <input type="time" value={slot.endTime} onChange={e => updateSlot(slot.id, { endTime: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-400 shadow-inner" />
                                      </div>
                                   </div>
                                   <div className="flex justify-end pt-4">
                                      <button 
                                        type="button" 
                                        onClick={() => handleSaveSlot(slot)}
                                        className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all hover:bg-emerald-700"
                                      >
                                         ✓ Save Period Artifact
                                      </button>
                                   </div>
                                </div>
                              )}
                           </div>
                         );
                       })}
                       {(formData.content || []).length === 0 && (
                          <div className="py-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No temporal slots defined. Add a period to begin construction.</p>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-100">
                    <button type="button" onClick={() => setIsProvisioning(false)} className="w-full md:flex-1 py-6 bg-slate-100 text-slate-600 rounded-2xl md:rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all">Discard Changes</button>
                    <button 
                      type="submit" 
                      disabled={isCommitting || expandedSlotId !== null}
                      className="w-full md:flex-[2] py-6 bg-blue-600 text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                       {isCommitting ? 'SYNCING ARCHIVE...' : 'Commit Temporal Map'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TimeTableModule;
