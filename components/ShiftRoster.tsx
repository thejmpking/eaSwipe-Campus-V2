import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Shift, ShiftAssignment } from '../types';
import { dataService } from '../services/dataService';

interface ShiftRosterProps {
  onBack: () => void;
  onSync?: () => void;
}

const ShiftRoster: React.FC<ShiftRosterProps> = ({ onBack, onSync }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [activeWeek, setActiveWeek] = useState(0); 
  const [activeSelection, setActiveSelection] = useState<{ empId: string, date: string } | null>(null);

  const fetchRegistry = async () => {
    setIsLoading(true);
    try {
      const [dbUsers, dbShifts, dbAssignments] = await Promise.all([
        dataService.getUsers(),
        dataService.getRecords('shifts'),
        dataService.getRecords('shift_assignments')
      ]);
      setUsers(dbUsers || []);
      setShifts(dbShifts || []);
      setAssignments(dbAssignments || []);
    } catch (e) {
      console.error("Roster Sync Failure", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRegistry(); }, []);

  const format12h = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const parts = timeStr.split(':');
      const h = parts[0];
      const m = parts[1] || '00';
      const hours = parseInt(h);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
    } catch (e) {
      return timeStr;
    }
  };

  const weekDates = useMemo(() => {
    const dates = [];
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) + (activeWeek * 7);
    const monday = new Date(now.setDate(diff));
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push({
        date: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
        month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        isToday: d.toDateString() === new Date().toDateString(),
        fullDate: d.toISOString().split('T')[0]
      });
    }
    return dates;
  }, [activeWeek]);

  const handleAssignShift = async (shiftId: string | null) => {
    if (!activeSelection) return;
    setIsCommitting(true);
    
    const existing = assignments.find(a => 
      a.targetId === activeSelection.empId && 
      (a.assignedDate === activeSelection.date || (a.startDate && a.endDate && activeSelection.date >= a.startDate && activeSelection.date <= a.endDate))
    );
    
    if (shiftId === null) {
      if (existing) {
        await dataService.deleteRecord('shift_assignments', existing.id);
        if (onSync) onSync(); // Immediate callback for parent/bindings sync
      }
    } else {
      const user = users.find(u => u.id === activeSelection.empId);
      const newAssign: ShiftAssignment = {
        id: existing?.id || `AS-${Math.floor(Math.random() * 900000)}`,
        shiftId: shiftId,
        targetId: activeSelection.empId,
        targetName: user?.name || 'Identity Node',
        targetType: 'Individual',
        assignedDate: activeSelection.date,
        startDate: activeSelection.date,
        endDate: activeSelection.date
      };
      const res = await dataService.syncRecord('shift_assignments', newAssign);
      if (res.status === 'error') {
        if (res.message?.includes("PGRST204") || res.message?.includes("end_date")) {
          const sqlFix = "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS start_date DATE; ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS end_date DATE;";
          if (confirm(`SQL SCHEMA ERROR: Missing temporal range columns. Copy fix SQL to clipboard?`)) {
            navigator.clipboard.writeText(sqlFix);
            alert("SQL Fix copied! Run it in your Supabase SQL Editor.");
          }
        } else {
          alert(`SQL Sync Error: ${res.message || 'Handshake failed.'}`);
        }
      } else {
        if (onSync) onSync(); // Immediate callback for parent/bindings sync
      }
    }
    
    await fetchRegistry();
    setActiveSelection(null);
    setIsCommitting(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      return matchesSearch && matchesRole && u.role !== UserRole.STUDENT; 
    });
  }, [users, searchQuery, roleFilter]);

  if (isLoading && users.length === 0) return (
    <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Querying Roster Nodes...</p>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-24 px-1 max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 px-2">
        <div className="flex items-center justify-between">
           <div className="min-w-0">
             <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Roster Feed</h2>
             <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-600 mt-1">Institutional Temporal Map</p>
           </div>
           <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
              <button onClick={() => setActiveWeek(prev => prev - 1)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 active:scale-90 transition-all">‹</button>
              <button onClick={() => setActiveWeek(0)} className="px-3 text-[8px] font-black uppercase tracking-widest text-slate-500">Today</button>
              <button onClick={() => setActiveWeek(prev => prev + 1)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 active:scale-90 transition-all">›</button>
           </div>
        </div>

        <div className="flex gap-2">
           <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Search name..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm focus:border-blue-400" 
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-20">🔍</span>
           </div>
           <select 
             value={roleFilter} 
             onChange={e => setRoleFilter(e.target.value)} 
             className="w-24 px-2 py-3 bg-white border border-slate-200 rounded-xl text-[8px] font-black uppercase appearance-none cursor-pointer text-center"
           >
              <option value="All">Roles</option>
              {Object.values(UserRole).map(r => <option key={r} value={r}>{r.split('_')[0]}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[3rem] shadow-sm overflow-hidden relative mx-1">
         <div className="overflow-x-auto custom-scrollbar scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left border-collapse table-fixed">
               <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-40">
                  <tr>
                     <th className="sticky left-0 z-30 bg-slate-50 px-3 md:px-8 py-4 md:py-6 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-r w-[150px] md:w-[300px] shadow-[4px_0_12px_rgba(0,0,0,0.05)]">
                        Identity
                     </th>
                     {weekDates.map((d, i) => (
                       <th key={i} className={`px-1 py-3 md:py-5 text-center border-r border-slate-200/40 w-[calc((100vw-158px)/3)] md:w-[120px] ${d.isToday ? 'bg-blue-600/5' : ''}`}>
                          <p className={`text-sm md:text-xl font-black leading-none ${d.isToday ? 'text-blue-600' : 'text-slate-800'}`}>{d.date}</p>
                          <p className={`text-[7px] md:text-[8px] font-black ${d.isToday ? 'text-blue-600' : 'text-slate-400'} uppercase mt-1`}>{d.dayName.substring(0, 3)}</p>
                       </th>
                     ))}
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 group transition-colors">
                       <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-3 md:px-8 py-3 md:py-5 border-r border-slate-100 shadow-[4px_0_12px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center gap-3 min-w-0">
                             <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-2xl bg-slate-100 border border-slate-200 shadow-sm overflow-hidden shrink-0">
                                <img src={emp.nfcUrl?.startsWith('data:') ? emp.nfcUrl : `https://picsum.photos/seed/${emp.id}/64/64`} className="w-full h-full object-cover" alt="p" />
                             </div>
                             <div className="min-w-0 flex-1 overflow-hidden">
                                <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase leading-snug mb-0.5 break-words whitespace-normal">{emp.name}</p>
                                <div className="flex items-center gap-1.5">
                                   <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                   <p className="text-[7px] md:text-[8px] text-slate-400 font-bold uppercase tracking-tighter truncate">#{emp.id.split('-').pop()}</p>
                                </div>
                             </div>
                          </div>
                       </td>
                       {weekDates.map((d, i) => {
                         const assign = assignments.find(a => 
                           a.targetId === emp.id && 
                           (d.fullDate === a.assignedDate || (a.startDate && a.endDate && d.fullDate >= a.startDate && d.fullDate <= a.endDate))
                         );
                         const shift = shifts.find(s => s.id === assign?.shiftId);
                         return (
                           <td key={i} className={`px-1.5 py-2 border-r border-slate-200/40 ${d.isToday ? 'bg-blue-600/5' : ''}`}>
                              <button 
                                onClick={() => setActiveSelection({ empId: emp.id, date: d.fullDate })}
                                className={`w-full h-10 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center font-black text-[7px] md:text-[9px] transition-all active:scale-90 border-2 ${
                                  shift 
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-500' 
                                  : 'bg-slate-50 text-slate-200 border-dashed border-slate-200 hover:border-blue-200 hover:text-blue-300'
                                }`}
                              >
                                {shift ? shift.label.substring(0, 3).toUpperCase() : '+'}
                              </button>
                           </td>
                         );
                       })}
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={8} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No node signatures found</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      <div className="md:hidden flex justify-center pb-2">
         <div className="bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-3">
            <span className="text-blue-600 animate-bounce">↔</span>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Swipe to view full horizon</span>
         </div>
      </div>

      {activeSelection && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 overflow-y-auto max-h-[85vh]">
              <div className="flex justify-between items-start mb-8 sticky top-0 bg-white py-1">
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Assign Shift</h3>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{new Date(activeSelection.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                 </div>
                 <button onClick={() => setActiveSelection(null)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-90 transition-all shadow-sm">✕</button>
              </div>
              <div className="space-y-2.5 md:space-y-4 pb-6">
                 {shifts.map(s => (
                   <button key={s.id} onClick={() => handleAssignShift(s.id)} className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl md:rounded-3xl hover:bg-blue-600 hover:border-blue-500 hover:shadow-xl group transition-all text-left">
                      <div className="min-w-0 flex-1">
                         <p className="text-xs md:text-sm font-black text-slate-800 group-hover:text-white uppercase truncate">{s.label}</p>
                         <p className="text-[8px] md:text-[9px] font-bold text-slate-400 group-hover:text-blue-100 uppercase mt-1">{format12h(s.startTime)} — {format12h(s.endTime)}</p>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-all text-white text-lg font-black ml-4 transform translate-x-[-10px] group-hover:translate-x-0">→</span>
                   </button>
                 ))}
                 <div className="pt-6 mt-6 border-t border-slate-100">
                    <button onClick={() => handleAssignShift(null)} className="w-full py-5 bg-rose-50 text-rose-600 rounded-2xl md:rounded-3xl font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-sm">🗑️ Clear Current Assignment</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex justify-center px-4 pt-4">
        <button onClick={onBack} className="w-full md:w-auto px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] md:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl">
          ← Return to Shift Registry
        </button>
      </div>
    </div>
  );
};

export default ShiftRoster;