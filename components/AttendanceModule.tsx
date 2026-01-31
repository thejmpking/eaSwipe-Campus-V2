
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Shift } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface AttendanceModuleProps {
  userRole: UserRole;
  userName: string;
  userId: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  onSyncRegistry: () => void;
  onSelectUser?: (id: string) => void;
  onClose?: () => void;
}

type PresenceStatus = 'Holiday' | 'Day Off' | 'Present' | 'Half Day' | 'Late' | 'Absent' | 'On Leave' | 'Empty';
type ActiveAction = 'None' | 'ManualMarking' | 'ViewDetail';

const AttendanceModule: React.FC<AttendanceModuleProps> = ({ userRole, userName, userId, users, attendanceRecords, onSyncRegistry, onSelectUser, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [schoolFilter, setSchoolFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('February'); 
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [activeAction, setActiveAction] = useState<ActiveAction>('None');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<{ id: string; day: number; data: any } | null>(null);
  const [markingTarget, setMarkingTarget] = useState<{ id: string; day: number; existingId?: string | number } | null>(null);
  
  // Optimistic Deletion Cache to prevent refetch race conditions
  const [blacklistedRecordIds, setBlacklistedRecordIds] = useState<Set<string | number>>(new Set());
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);

  const [timeForm, setTimeForm] = useState({
    clockIn: '08:00',
    clockOut: '16:00',
    location: '',
    status: 'Present' as PresenceStatus,
    shift: ''
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = ['2024', '2025', '2026'];
  const weekDaysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const daysInMonth = 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const shifts = await dataService.getRecords('shifts');
        if (shifts && Array.isArray(shifts)) {
          setAvailableShifts(shifts);
          if (shifts.length > 0) {
            setTimeForm(prev => ({ ...prev, shift: shifts[0].label }));
          }
        }
      } catch (e) {
        console.error("Shift Sync Failure", e);
      }
    };
    fetchShifts();
  }, []);

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

  const attendanceMap = useMemo(() => {
    const map: Record<string, any> = {};
    attendanceRecords.forEach(record => {
      // PROOF CHECK: Skip records that are optimistically deleted
      const recordId = record.id ?? record.ID;
      if (blacklistedRecordIds.has(recordId)) return;

      const dateParts = record.date?.split('-') || [];
      if (dateParts.length === 3) {
        const year = dateParts[0];
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        const key = `${record.userId}-${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        map[key] = record;
      }
    });
    return map;
  }, [attendanceRecords, blacklistedRecordIds]);

  const availableSchools = useMemo(() => Array.from(new Set(users.map(u => u.assignment))).sort(), [users]);

  const handleCellClick = (staffId: string, day: number) => {
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const key = `${staffId}-${selectedYear}-${monthIndex.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const record = attendanceMap[key];

    if (!record) {
      const targetUser = users.find(u => u.id === staffId);
      setMarkingTarget({ id: staffId, day });
      setTimeForm({
        clockIn: '08:00', 
        clockOut: '16:00', 
        location: targetUser?.assignment || availableSchools[0] || 'Hub',
        status: 'Present', 
        shift: availableShifts[0]?.label || "General Shift"
      });
      setActiveAction('ManualMarking');
    } else {
      setViewingRecord({ id: staffId, day, data: record });
      setActiveAction('ViewDetail');
    }
  };

  const handleDeleteArtifact = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rawData = viewingRecord?.data;
    if (!rawData) return;

    // Resolve ID properly (Check for both id and ID)
    const recordId = rawData.id ?? rawData.ID;
    
    console.log("[DEBUG] Starting Purge for Record ID:", recordId);
    console.log("[DEBUG] Record context:", rawData);

    if (recordId === undefined || recordId === null) {
      alert("Binding Error: ID Artifact not found in local registry cache.");
      return;
    }
    
    if (window.confirm("PURGE CONFIRMATION: Permanently remove this record from the Presence Ledger?")) {
      setIsDeleting(true);
      
      // OPTIMISTIC REMOVE: Add to blacklist immediately for instant UI feedback
      setBlacklistedRecordIds(prev => new Set(prev).add(recordId));
      
      try {
        const result = await dataService.deleteRecord('attendance', recordId);
        
        if (result.status === 'success') {
          console.log("[DEBUG] Deletion confirmed by server.");
          // Success: Close modal and refresh global state
          onSyncRegistry(); 
          setActiveAction('None');
          setViewingRecord(null);
        } else {
          // REVERT: If server delete failed, remove from blacklist
          setBlacklistedRecordIds(prev => {
            const next = new Set(prev);
            next.delete(recordId);
            return next;
          });
          console.error("[DEBUG] Deletion rejected:", result.error);
          alert(`Purge Failure: ${result.error || 'Server rejected request'}. This usually indicates a Supabase RLS Policy violation (Bucket C).`);
        }
      } catch (err: any) {
        console.error("[DEBUG] Network exception:", err);
        // REVERT
        setBlacklistedRecordIds(prev => {
          const next = new Set(prev);
          next.delete(recordId);
          return next;
        });
        alert(`Critical Failure: ${err.message || 'SQL connection interrupted'}.`);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const commitManualMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markingTarget) return;

    setIsCommitting(true);
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const dateStr = `${selectedYear}-${monthIndex.toString().padStart(2, '0')}-${markingTarget.day.toString().padStart(2, '0')}`;
    const targetUser = users.find(u => u.id === markingTarget.id);

    const isPresence = ['Present', 'Late', 'Half Day'].includes(timeForm.status);

    const record = {
      ...(markingTarget.existingId ? { id: markingTarget.existingId } : {}),
      userId: markingTarget.id,
      userName: targetUser?.name || 'Manual Identity',
      userRole: targetUser?.role || UserRole.TEACHER,
      status: timeForm.status,
      date: dateStr,
      clockIn: isPresence ? timeForm.clockIn : null,
      clockOut: isPresence ? timeForm.clockOut : null,
      location: targetUser?.assignment || 'Manual Override',
      method: 'Manual',
      markedBy: `${userName} [${userId}]`, 
      shiftLabel: timeForm.shift
    };

    const res = await dataService.syncRecord('attendance', record);
    if (res.status === 'success') {
      onSyncRegistry();
      setActiveAction('None');
    } else {
      alert("Ledger Sync Failure: Check database schema compatibility.");
    }
    setIsCommitting(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (u.role === UserRole.STUDENT) return false;
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.id.toLowerCase().includes(searchQuery.toLowerCase());
      const normRoleFilter = roleFilter.replace(' ', '_');
      const matchesRole = roleFilter === 'All' || u.role === normRoleFilter;
      const matchesSchool = schoolFilter === 'All' || u.assignment === schoolFilter;
      return matchesSearch && matchesRole && matchesSchool;
    });
  }, [users, searchQuery, roleFilter, schoolFilter]);

  const getStatusNode = (status: string) => {
    switch (status) {
      case 'Present': return <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow-sm">✓</div>;
      case 'Half Day': return <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] shadow-sm font-black">⯪</div>;
      case 'Late': return <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] shadow-sm">!</div>;
      case 'Absent': return <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] shadow-sm">✕</div>;
      case 'On Leave': return <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] shadow-sm font-bold">L</div>;
      default: return <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>;
    }
  };

  const hasManagementAuthority = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.CAMPUS_HEAD, UserRole.RESOURCE_PERSON].includes(userRole);

  return (
    <div className="space-y-6 md:space-y-10 pb-24 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Presence Ledger</h2>
           <p className="text-[11px] text-blue-600 font-black uppercase tracking-widest mt-3">{selectedMonth} {selectedYear} • Operational Oversight</p>
        </div>
        {onClose && <button onClick={onClose} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 active:scale-95 transition-all shadow-sm">✕</button>}
      </div>

      {/* Filter Station */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm space-y-5">
        <div className="relative">
           <input 
            type="text" placeholder="Search Identity Artifacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none shadow-inner focus:ring-4 focus:ring-blue-500/5 transition-all"
           />
           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-20">🔍</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Temporal Month</p>
             <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase appearance-none shadow-inner cursor-pointer">
               {months.map(m => <option key={m} value={m}>{m}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Institution</p>
             <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase appearance-none shadow-inner cursor-pointer">
               <option value="All">All Schools</option>
               {availableSchools.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Role Tier</p>
             <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase appearance-none shadow-inner cursor-pointer">
               <option value="All">All Tiers</option>
               {Object.values(UserRole).filter(r => r !== UserRole.STUDENT).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Ledger Year</p>
             <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase appearance-none shadow-inner cursor-pointer">
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1200px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r w-64">Identity Artifact</th>
                {days.map((day) => (
                  <th key={day} className="px-1 py-4 text-center border-r border-slate-100 w-10">
                    <div className={`text-[8px] font-bold uppercase mb-1 ${weekDaysShort[(day-1) % 7] === 'S' ? 'text-rose-500' : 'text-slate-400'}`}>
                      {weekDaysShort[(day-1) % 7]}
                    </div>
                    <div className="text-[11px] font-black text-slate-900 leading-none">{day}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/80 px-8 py-5 border-r shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">
                        <img src={staff.nfcUrl?.startsWith('data:') ? staff.nfcUrl : `https://picsum.photos/seed/${staff.id}/64/64`} alt={staff.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <button onClick={() => onSelectUser?.(staff.id)} className="text-[11px] font-black text-slate-900 uppercase truncate leading-none mb-1 hover:text-blue-600 block transition-colors text-left">{staff.name}</button>
                        <p className="text-[9px] text-slate-400 font-bold uppercase truncate tracking-tight">{staff.role.replace('_', ' ')} • {staff.id}</p>
                      </div>
                    </div>
                  </td>
                  {days.map((day) => {
                    const monthIndex = months.indexOf(selectedMonth) + 1;
                    const key = `${staff.id}-${selectedYear}-${monthIndex.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    const record = attendanceMap[key];
                    return (
                      <td key={day} className="px-1 py-5 text-center border-r border-slate-50/50">
                        <div onClick={() => handleCellClick(staff.id, day)} className="flex items-center justify-center min-h-[32px] cursor-pointer hover:scale-125 transition-transform active:scale-95">
                          {record ? getStatusNode(record.status) : <div className="w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Manual Marking (Add/Edit) */}
      {activeAction === 'ManualMarking' && markingTarget && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-10">
                <div>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">
                      {markingTarget.existingId ? 'Update Identity Mark' : 'Manual Override'}
                   </h3>
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      Ledger Chronology: {markingTarget.day} {selectedMonth} {selectedYear}
                   </p>
                </div>
                <button onClick={() => setActiveAction('None')} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 active:scale-90 transition-all">✕</button>
             </div>
             
             <div className="mb-10 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-2xl shrink-0">👤</div>
                <div className="min-w-0">
                   <p className="text-base font-black text-slate-900 uppercase truncate leading-none mb-1.5">
                      {users.find(u => u.id === markingTarget.id)?.name}
                   </p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{markingTarget.id}</p>
                </div>
             </div>

             <form onSubmit={commitManualMark} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Presence Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Present', 'Half Day', 'Late', 'Absent', 'On Leave'].map(s => (
                      <button 
                          key={s} type="button" onClick={() => setTimeForm({...timeForm, status: s as PresenceStatus})} 
                          className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            timeForm.status === s 
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/10' 
                            : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          {s}
                        </button>
                    ))}
                  </div>
                </div>

                {['Present', 'Late', 'Half Day'].includes(timeForm.status) && (
                  <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Check In</label>
                        <input 
                          type="time" required value={sanitizeTimeForInput(timeForm.clockIn)} 
                          onChange={e => setTimeForm({...timeForm, clockIn: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Check Out</label>
                        <input 
                          type="time" required value={sanitizeTimeForInput(timeForm.clockOut)} 
                          onChange={e => setTimeForm({...timeForm, clockOut: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" 
                        />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assigned Temporal Window (Shift)</label>
                   <select value={timeForm.shift} onChange={e => setTimeForm({...timeForm, shift: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs font-black outline-none appearance-none cursor-pointer">
                      {availableShifts.length > 0 ? availableShifts.map(s => (
                        <option key={s.id} value={s.label}>{s.label}</option>
                      )) : <option value="General Shift">General Shift</option>}
                   </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setActiveAction('None')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Discard</button>
                  <button type="submit" disabled={isCommitting} className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
                    {isCommitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Syncing...</> : markingTarget.existingId ? 'Update Artifact' : 'Commit to Ledger'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL: View Detail */}
      {activeAction === 'ViewDetail' && viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[250] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 md:p-16 shadow-2xl animate-in zoom-in-95 duration-300">
              
              <div className="flex justify-between items-start mb-12">
                 <div>
                    <h3 className="text-[36px] font-bold text-[#111827] tracking-tight leading-tight">Record Artifact</h3>
                    <p className="text-[#94A3B8] text-[14px] font-medium mt-1 tracking-wide">{viewingRecord.data.date}</p>
                 </div>
                 <div className={`px-6 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest text-white shadow-xl ${
                    viewingRecord.data.status === 'Present' ? 'bg-[#10B981] shadow-emerald-500/20' : 
                    viewingRecord.data.status === 'Absent' ? 'bg-[#EF4444] shadow-rose-500/20' : 'bg-[#F59E0B] shadow-amber-500/20'
                 }`}>
                   {viewingRecord.data.status}
                 </div>
              </div>

              <div className="space-y-12">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="p-10 bg-white rounded-[3.5rem] border border-[#F1F5F9] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center">
                       <p className="text-[11px] font-black text-[#94A3B8] uppercase mb-4 tracking-[0.15em]">PUNCH IN</p>
                       <p className="text-[28px] font-bold text-[#111827] tabular-nums whitespace-nowrap">{formatTime12h(viewingRecord.data.clockIn)}</p>
                    </div>
                    <div className="p-10 bg-white rounded-[3.5rem] border border-[#F1F5F9] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center">
                       <p className="text-[11px] font-black text-[#94A3B8] uppercase mb-4 tracking-[0.15em]">PUNCH OUT</p>
                       <p className="text-[28px] font-bold text-[#111827] tabular-nums whitespace-nowrap">{formatTime12h(viewingRecord.data.clockOut)}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex items-center justify-between p-7 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
                       <span className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.15em]">TEMPORAL WINDOW</span>
                       <span className="text-[13px] font-bold text-[#111827]">{viewingRecord.data.shiftLabel || 'General Shift'}</span>
                    </div>
                    <div className="flex items-center justify-between p-7 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
                       <span className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.15em]">CAPTURE METHOD</span>
                       <span className="text-[13px] font-bold text-[#111827] uppercase">{viewingRecord.data.method}</span>
                    </div>
                    <div className="flex items-center justify-between p-7 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
                       <span className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.15em]">AUTHORIZED BY</span>
                       <span className="text-[13px] font-bold text-[#111827] truncate max-w-[220px]">{viewingRecord.data.markedBy || 'Hardware Terminal'}</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-5 pt-8">
                    <button 
                      onClick={() => setActiveAction('None')} 
                      className="px-10 py-6 bg-[#F1F5F9] text-[#64748B] rounded-full font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#E2E8F0] transition-all active:scale-95"
                    >
                      CLOSE
                    </button>
                    
                    {hasManagementAuthority && (
                       <button 
                         onClick={() => {
                           setMarkingTarget({ 
                             id: viewingRecord.id, 
                             day: viewingRecord.day, 
                             existingId: viewingRecord.data.id ?? viewingRecord.data.ID 
                           });
                           setTimeForm({
                             clockIn: sanitizeTimeForInput(viewingRecord.data.clockIn),
                             clockOut: sanitizeTimeForInput(viewingRecord.data.clockOut),
                             status: viewingRecord.data.status,
                             shift: viewingRecord.data.shiftLabel || (availableShifts[0]?.label || 'General Shift'),
                             location: viewingRecord.data.location
                           });
                           setActiveAction('ManualMarking');
                         }}
                         className="flex-1 py-6 bg-[#2563EB] text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all"
                       >
                         EDIT ARTIFACT
                       </button>
                    )}

                    {hasManagementAuthority && (
                       <button 
                        type="button"
                        onClick={handleDeleteArtifact}
                        disabled={isDeleting}
                        className="w-20 h-20 bg-[#FFF1F2] text-[#EF4444] rounded-[2rem] font-black text-2xl uppercase border border-[#FFE4E6] hover:bg-[#FECDD3] transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-xl shadow-rose-500/5"
                       >
                         {isDeleting ? <div className="w-6 h-6 border-2 border-rose-400/30 border-t-rose-600 rounded-full animate-spin"></div> : '🗑️'}
                       </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceModule;
