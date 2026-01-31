
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Shift, ShiftAssignment } from '../types';
import { dataService } from '../services/dataService';

interface ShiftRosterProps {
  onBack: () => void;
}

const ShiftRoster: React.FC<ShiftRosterProps> = ({ onBack }) => {
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
    
    // Find existing assignment for this user on this exact date
    const existing = assignments.find(a => a.targetId === activeSelection.empId && a.assignedDate === activeSelection.date);
    
    if (shiftId === null) {
      if (existing) await dataService.deleteRecord('shift_assignments', existing.id);
    } else {
      const user = users.find(u => u.id === activeSelection.empId);
      const newAssign: ShiftAssignment = {
        id: existing?.id || `AS-${Math.floor(Math.random() * 900000)}`,
        shiftId: shiftId,
        targetId: activeSelection.empId,
        targetName: user?.name || 'Identity Node',
        targetType: 'Individual',
        assignedDate: activeSelection.date
      };
      await dataService.syncRecord('shift_assignments', newAssign);
    }
    
    await fetchRegistry();
    setActiveSelection(null);
    setIsCommitting(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      return matchesSearch && matchesRole && u.role !== UserRole.STUDENT; // Roster primarily for faculty/staff
    });
  }, [users, searchQuery, roleFilter]);

  if (isLoading && users.length === 0) return <div className="p-20 text-center animate-pulse">Querying Roster Nodes...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Cloud Roster Feed</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Active Week: {weekDates[0].month} {weekDates[0].date} — {weekDates[6].date}</p>
        </div>
        <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
           <button onClick={() => setActiveWeek(prev => prev - 1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all">‹</button>
           <button onClick={() => setActiveWeek(0)} className="px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Current</button>
           <button onClick={() => setActiveWeek(prev => prev + 1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all">›</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
         <div className="relative flex-1">
            <input type="text" placeholder="Filter identities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none shadow-inner" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-20">🔍</span>
         </div>
         <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase appearance-none cursor-pointer">
            <option value="All">All Tiers</option>
            {Object.values(UserRole).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
         </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden relative">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[1000px]">
               <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                     <th className="sticky left-0 z-30 bg-slate-50 px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r min-w-[280px]">Node Identity</th>
                     {weekDates.map((d, i) => (
                       <th key={i} className="px-1 py-5 text-center border-r border-slate-200/40">
                          <p className={`text-xl font-black ${d.isToday ? 'text-blue-600' : 'text-slate-800'}`}>{d.date}</p>
                          <p className={`text-[8px] font-black ${d.isToday ? 'text-blue-600' : 'text-slate-400'} uppercase`}>{d.dayName.substring(0, 3)}</p>
                       </th>
                     ))}
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 group transition-colors">
                       <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-8 py-4 border-r border-slate-100 shadow-sm">
                          <div className="flex items-center gap-4">
                             <div className="w-11 h-11 rounded-2xl bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">
                                <img src={emp.nfcUrl?.startsWith('data:') ? emp.nfcUrl : `https://picsum.photos/seed/${emp.id}/64/64`} className="w-full h-full object-cover" />
                             </div>
                             <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 uppercase truncate leading-none mb-1.5">{emp.name}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate">{emp.assignment}</p>
                             </div>
                          </div>
                       </td>
                       {weekDates.map((d, i) => {
                         const assign = assignments.find(a => a.targetId === emp.id && a.assignedDate === d.fullDate);
                         const shift = shifts.find(s => s.id === assign?.shiftId);
                         return (
                           <td key={i} className="px-2 py-3 border-r border-slate-200/40">
                              <button 
                                onClick={() => setActiveSelection({ empId: emp.id, date: d.fullDate })}
                                className={`w-full h-12 rounded-xl flex items-center justify-center font-black text-[9px] shadow-sm active:scale-95 transition-all ${
                                  shift ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-50 text-slate-200 border-2 border-dashed border-slate-100 hover:border-blue-300 hover:text-blue-300'
                                }`}
                              >
                                {shift ? shift.label.split(' ')[0].toUpperCase() : '+'}
                              </button>
                           </td>
                         );
                       })}
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {activeSelection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-md w-full rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-start mb-8">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Atomic Shift Override</h3>
                 <button onClick={() => setActiveSelection(null)} className="text-slate-400 hover:text-slate-900 transition-colors">✕</button>
              </div>
              <div className="space-y-3">
                 {shifts.map(s => (
                   <button key={s.id} onClick={() => handleAssignShift(s.id)} className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:bg-blue-600 hover:border-blue-500 hover:shadow-xl group transition-all">
                      <div className="text-left">
                         <p className="text-sm font-black text-slate-800 group-hover:text-white">{s.label}</p>
                         <p className="text-[10px] font-bold text-slate-400 group-hover:text-blue-100 uppercase mt-1">{s.startTime} — {s.endTime}</p>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                   </button>
                 ))}
                 <div className="pt-4 mt-4 border-t border-slate-100">
                    <button onClick={() => handleAssignShift(null)} className="w-full p-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">🗑️ Clear Assignment</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex justify-center"><button onClick={onBack} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-2">← Return to Management</button></div>
    </div>
  );
};

export default ShiftRoster;
