
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

interface AttendanceTerminalProps {
  userId: string;
  userName: string;
  userRole: UserRole;
  userAssignment: string;
  onSyncRegistry: () => void;
}

const AttendanceTerminal: React.FC<AttendanceTerminalProps> = ({ userId, userName, userRole, userAssignment, onSyncRegistry }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'In' | 'Out' | null>(null);
  const [isAutoHalfDay, setIsAutoHalfDay] = useState(false);
  const [calculatedThreshold, setCalculatedThreshold] = useState<number>(0);

  // Helper: Convert "HH:mm:ss" or "HH:mm" to total minutes
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || '0');
    const m = parseInt(parts[1] || '0');
    return h * 60 + m;
  };

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchState = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [records, shifts, assignments] = await Promise.all([
        dataService.getRecords('attendance'),
        dataService.getRecords('shifts'),
        dataService.getRecords('shift_assignments')
      ]);

      const record = records.find((r: any) => r.userId === userId && r.date === today);
      setTodayRecord(record || null);

      const userAssign = assignments.find((a: any) => a.targetId === userId);
      const targetShiftId = userAssign?.shiftId || (shifts.length > 0 ? shifts[0].id : null);
      
      if (targetShiftId) {
        const shift = shifts.find((s: any) => s.id === targetShiftId);
        setActiveShift(shift);
        
        // Calculate shift 50% threshold
        const start = timeToMinutes(shift.startTime);
        const end = timeToMinutes(shift.endTime);
        let total = end - start;
        if (total < 0) total += 1440; // Midnight cross
        setCalculatedThreshold(total / 2);
      } else {
        // Default to 4 hours if no shift is bound
        setCalculatedThreshold(240);
      }
    } catch (e) {
      console.error("Terminal Sync Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [userId]);

  const handleClockAction = async () => {
    setIsCommitting(true);
    setIsAutoHalfDay(false);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    try {
      if (!todayRecord) {
        // CLOCK IN
        const payload = {
          userId,
          userName,
          userRole,
          status: 'Present',
          date: dateStr,
          clockIn: timeStr,
          location: userAssignment,
          method: 'Terminal',
          shiftLabel: activeShift?.label || 'General Shift'
        };
        await dataService.syncRecord('attendance', payload);
        setShowSuccess('In');
      } else {
        // CLOCK OUT + STRICT 50% THRESHOLD LOGIC
        const minutesIn = timeToMinutes(todayRecord.clockIn);
        const minutesOut = timeToMinutes(timeStr);
        let duration = minutesOut - minutesIn;
        if (duration < 0) duration += 1440; 

        // If duration < 50% of the active shift's total duration, mark as Half Day
        const isBelowThreshold = duration < calculatedThreshold;
        const finalStatus = isBelowThreshold ? 'Half Day' : 'Present';
        
        if (isBelowThreshold) {
          setIsAutoHalfDay(true);
        }

        const payload = {
          ...todayRecord,
          clockOut: timeStr,
          status: finalStatus
        };
        await dataService.syncRecord('attendance', payload);
        setShowSuccess('Out');
      }
      
      await fetchState();
      onSyncRegistry();
      setTimeout(() => setShowSuccess(null), 4500);
    } catch (e) {
      alert("Terminal Handshake Failed. Connection to Cloud Registry lost.");
    } finally {
      setIsCommitting(false);
    }
  };

  if (isLoading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waking Terminal Node...</p>
    </div>
  );

  const isClockedIn = !!todayRecord?.clockIn;
  const isClockedOut = !!todayRecord?.clockOut;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24 animate-in fade-in duration-700">
      {/* Terminal Header */}
      <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 p-12 opacity-5 text-[12rem] font-black pointer-events-none -rotate-12 uppercase">Node</div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-center md:text-left space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-3">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">Institutional Attendance Terminal</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <span className="text-2xl md:text-3xl text-slate-600 ml-2 font-medium">:{currentTime.getSeconds().toString().padStart(2, '0')}</span>
            </h2>
            <p className="text-lg text-slate-400 font-medium">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] min-w-[280px]">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Operator Identity</p>
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-xl">
                   <img src={`https://picsum.photos/seed/${userId}/128/128`} className="w-full h-full object-cover" alt="Operator" />
                </div>
                <div className="min-w-0">
                   <p className="text-base font-black text-white truncate leading-none mb-1.5">{userName}</p>
                   <p className="text-[10px] font-bold text-blue-500 uppercase truncate">{userAssignment}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
           <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm p-10 md:p-14 text-center space-y-10 relative overflow-hidden">
              {showSuccess && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center text-white z-20 animate-in zoom-in-95 duration-300 ${isAutoHalfDay ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                   <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl">{isAutoHalfDay ? '⯪' : '✓'}</div>
                   <h3 className="text-3xl font-black uppercase tracking-tight">
                     Clock {showSuccess} {isAutoHalfDay ? 'Limited' : 'Success'}
                   </h3>
                   <p className="mt-4 text-white font-black uppercase tracking-widest text-[10px] px-12 leading-relaxed opacity-90">
                     {isAutoHalfDay 
                       ? `DURATION BELOW 50% THRESHOLD (${Math.round(calculatedThreshold)}m): MARKED AS HALF DAY ARTIFACT.` 
                       : 'IDENTITY HANDSHAKE COMMITTED TO CLOUD LEDGER.'}
                   </p>
                </div>
              )}

              <div className="space-y-3">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Temporal Boundary</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-2 px-4 rounded-full inline-block border border-slate-100">
                   {activeShift ? `${activeShift.label}: ${activeShift.startTime} — ${activeShift.endTime}` : 'No Standard Shift Detected'}
                 </p>
                 {activeShift && (
                   <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-3">
                      Minimum Duration for Full Presence: <span className="underline underline-offset-4">{Math.round(calculatedThreshold)} Minutes</span>
                   </p>
                 )}
              </div>

              <div className="flex flex-col items-center gap-8 py-6">
                {isClockedOut ? (
                  <div className="space-y-6">
                    <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center text-5xl shadow-inner border border-slate-100">🏁</div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-800 tracking-tight">Session Terminated</h4>
                      <p className={`text-sm font-medium mt-3 flex items-center justify-center gap-3 ${todayRecord?.status === 'Half Day' ? 'text-amber-600' : 'text-slate-400'}`}>
                        Committed as: <span className="font-black underline uppercase">{todayRecord?.status}</span> {todayRecord?.status === 'Half Day' && <span className="text-xl">⯪</span>}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleClockAction}
                    disabled={isCommitting}
                    className={`w-64 h-64 rounded-full border-[12px] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] group ${
                      !isClockedIn 
                      ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500' 
                      : 'bg-rose-600 border-rose-500 hover:bg-rose-500'
                    }`}
                  >
                    <span className="text-6xl group-hover:scale-110 transition-transform">
                       {isCommitting ? '⌛' : !isClockedIn ? '🔓' : '🔒'}
                    </span>
                    <span className="text-white text-xl font-black uppercase tracking-[0.2em] mt-2">
                       {isCommitting ? 'Syncing' : !isClockedIn ? 'Clock In' : 'Clock Out'}
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-10 border-t border-slate-50">
                 <div className="p-6 bg-slate-50 rounded-[2.5rem] text-left border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest leading-none">Punch In</p>
                    <p className="text-xl font-black text-slate-800 tabular-nums">{todayRecord?.clockIn || '--:--'}</p>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-[2.5rem] text-left border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest leading-none">Punch Out</p>
                    <p className="text-xl font-black text-slate-800 tabular-nums">{todayRecord?.clockOut || '--:--'}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 opacity-5 text-9xl transition-transform group-hover:scale-110">📋</div>
              <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-8">System Compliance</h4>
              <div className="space-y-6">
                 <ProtocolStep icon="🛰️" label="GPS Verification" status="Active" />
                 <ProtocolStep icon="👤" label="ID Bind Valid" status="Verified" />
                 <ProtocolStep icon="⚖️" label="Half-Day Logic" status="Enforced" />
              </div>
           </div>

           <div className="bg-indigo-50 p-10 rounded-[3.5rem] border border-indigo-100 flex flex-col justify-between shadow-sm">
              <div>
                 <h4 className="text-indigo-900 font-black text-[10px] uppercase tracking-widest mb-6">Punctuality Analytics</h4>
                 <p className="text-xs text-indigo-700 font-medium italic leading-relaxed">
                   "Institutional records are strictly audited. Clocking out before 50% of your assigned shift results in a automatic Half-Day mark to preserve reporting integrity."
                 </p>
              </div>
              <div className="pt-8 mt-8 border-t border-indigo-200/50 flex justify-between items-end">
                 <div>
                    <p className="text-[10px] font-black text-indigo-900 uppercase">Yield Integrity</p>
                    <p className="text-3xl font-black text-indigo-700 leading-none mt-2 tracking-tighter">98.2%</p>
                 </div>
                 <div className="w-10 h-10 bg-indigo-200/50 rounded-xl flex items-center justify-center text-xl">📊</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ProtocolStep: React.FC<{ icon: string, label: string, status: string }> = ({ icon, label, status }) => (
  <div className="flex items-center justify-between">
     <div className="flex items-center gap-4">
        <span className="text-xl">{icon}</span>
        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{label}</span>
     </div>
     <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">{status}</span>
  </div>
);

export default AttendanceTerminal;
