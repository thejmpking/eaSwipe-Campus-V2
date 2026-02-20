
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';
import { UserIdentity } from '../App';
import jsQR from 'jsqr';

interface AttendanceTerminalProps {
  userId: string;
  userName: string;
  userRole: UserRole;
  userAssignment: string;
  onSyncRegistry: () => void;
  users: UserIdentity[];
  schools?: any[];
  shifts?: any[];
  shiftAssignments?: any[];
}

const AttendanceTerminal: React.FC<AttendanceTerminalProps> = ({ 
  users, userId, userName, userAssignment, userRole, onSyncRegistry,
  schools = [], shifts = [], shiftAssignments = []
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'In' | 'Out' | 'Manual' | null>(null);

  // Proxy Marking State
  const [isMarkingOthers, setIsMarkingOthers] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<UserIdentity | null>(null);
  const [targetStatus, setTargetStatus] = useState<'Present' | 'Absent' | 'Late' | 'Early'>('Present');
  const [targetLocation, setTargetLocation] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationResults, setShowLocationResults] = useState(false);

  // QR Scanning State
  const [isScanningQR, setIsScanningQR] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const format12h = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const [h, m] = timeStr.split(':');
      const hours = parseInt(h);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
    } catch (e) {
      return timeStr;
    }
  };

  const fetchState = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const records = await dataService.getRecords('attendance');
      const record = records.find((r: any) => r.userId?.toString() === userId.toString() && r.date === today);
      setTodayRecord(record || null);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchState(); }, [userId]);

  const handleAction = async () => {
    setIsCommitting(true);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    // Resolve shift for status calculation
    const myAssignment = (shiftAssignments || []).find(a => 
      a.targetId === userId && 
      (dateStr === a.assignedDate || (dateStr >= a.startDate && dateStr <= a.endDate))
    );
    const shift = myAssignment ? (shifts || []).find(s => s.id === myAssignment.shiftId) : null;
    
    let calculatedStatus = 'Present';
    if (shift) {
       const [sh, sm] = shift.startTime.split(':').map(Number);
       const shiftStart = new Date(now);
       shiftStart.setHours(sh, sm, 0, 0);
       
       const diffMinutes = (now.getTime() - shiftStart.getTime()) / 60000;
       
       if (diffMinutes < 0) {
          // Check Early threshold
          if (Math.abs(diffMinutes) <= (shift.earlyMarkMinutes || 0)) {
             calculatedStatus = 'Early';
          }
       } else if (diffMinutes > (shift.gracePeriod || 0)) {
          // Check Late threshold
          calculatedStatus = 'Late';
       }
    }

    try {
      if (!todayRecord) {
        await dataService.syncRecord('attendance', {
          id: Date.now(), userId, userName, status: calculatedStatus,
          date: dateStr, clockIn: timeStr, location: userAssignment, method: 'Terminal'
        });
        setShowSuccess('In');
      } else {
        await dataService.syncRecord('attendance', { ...todayRecord, clockOut: timeStr });
        setShowSuccess('Out');
      }
      await fetchState();
      onSyncRegistry();
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (e) { alert("Sync Error"); }
    finally { setIsCommitting(false); }
  };

  // QR SCANNER LOGIC
  const stopScanner = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsScanningQR(false);
  };

  const startScanner = async () => {
    setIsScanningQR(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); 
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error("Camera Access Refused", err);
      setIsScanningQR(false);
      alert("Camera Permission Required for QR Identity Resolution.");
    }
  };

  const scanFrame = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          const matchedUser = users.find(u => u.nfcUrl === code.data);
          if (matchedUser) {
            // JURISDICTIONAL CHECK FOR QR SCANNING TOO
            if (userRole === UserRole.TEACHER) {
                const isStudentInMySchool = matchedUser.role === UserRole.STUDENT && 
                                           (matchedUser.assignment === userAssignment || matchedUser.school === userAssignment);
                if (!isStudentInMySchool) {
                    alert("AUTHORIZATION ERROR: Scanned identity is outside your assigned school node.");
                    stopScanner();
                    return;
                }
            }
            
            // Authorized Match Found
            selectTarget(matchedUser);
            stopScanner();
            return;
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanFrame);
  };

  const handleProxyMark = async () => {
    if (!selectedTarget || isCommitting || !targetLocation) {
        if (!targetLocation) alert("Please select a work location.");
        return;
    }
    setIsCommitting(true);
    
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    try {
      const allRecords = await dataService.getRecords('attendance');
      const targetExistingRecord = allRecords.find((r: any) => 
        r.userId?.toString() === selectedTarget.id.toString() && 
        r.date === dateStr
      );

      if (targetExistingRecord) {
        if (!targetExistingRecord.clockOut) {
          await dataService.syncRecord('attendance', {
            ...targetExistingRecord,
            clockOut: timeStr,
            method: 'Proxy'
          });
        } else {
          await dataService.syncRecord('attendance', {
            id: Date.now(),
            userId: selectedTarget.id,
            userName: selectedTarget.name,
            status: targetStatus,
            date: dateStr,
            clockIn: timeStr,
            location: targetLocation,
            method: 'Proxy'
          });
        }
      } else {
        await dataService.syncRecord('attendance', {
          id: Date.now(),
          userId: selectedTarget.id,
          userName: selectedTarget.name,
          status: targetStatus,
          date: dateStr,
          clockIn: timeStr,
          location: targetLocation,
          method: 'Proxy'
        });
      }
      
      setShowSuccess('Manual');
      setIsMarkingOthers(false);
      setSelectedTarget(null);
      setTargetSearch('');
      onSyncRegistry();
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (e) {
      alert("Proxy Mark Sync Failure");
    } finally {
      setIsCommitting(false);
    }
  };

  const canMarkOthers = useMemo(() => {
    return [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.RESOURCE_PERSON, UserRole.TEACHER].includes(userRole);
  }, [userRole]);

  const filteredTargets = useMemo(() => {
    if (!targetSearch || targetSearch.length < 2) return [];
    return users.filter(u => {
      // JURISDICTIONAL ENFORCEMENT: Faculty can ONLY mark students in their school
      if (userRole === UserRole.TEACHER) {
        if (u.role !== UserRole.STUDENT) return false;
        const matchesMyNode = u.assignment === userAssignment || u.school === userAssignment;
        if (!matchesMyNode) return false;
      }
      
      if (u.id === userId) return false;

      const matchesSearch = u.name.toLowerCase().includes(targetSearch.toLowerCase()) || 
                           u.id.toLowerCase().includes(targetSearch.toLowerCase());
      return matchesSearch;
    }).slice(0, 5);
  }, [users, targetSearch, userRole, userId, userAssignment]);

  const filteredLocations = useMemo(() => {
    if (userRole === UserRole.TEACHER) {
        // Faculty location is locked to their school
        return schools.filter(s => s.name === userAssignment);
    }
    if (!locationSearch || locationSearch.length < 1) return schools.slice(0, 5);
    return schools.filter(s => 
      s.name.toLowerCase().includes(locationSearch.toLowerCase())
    ).slice(0, 5);
  }, [schools, locationSearch, userRole, userAssignment]);

  const selectedTargetShift = useMemo(() => {
    if (!selectedTarget) return null;
    const assignment = (shiftAssignments || []).find(a => a.targetId === selectedTarget.id && a.targetType === 'Individual');
    if (assignment) {
      return (shifts || []).find(s => s.id === assignment.shiftId);
    }
    return null;
  }, [selectedTarget, shifts, shiftAssignments]);

  const selectTarget = (user: UserIdentity) => {
    setSelectedTarget(user);
    const defaultLoc = user.school || user.assignment || userAssignment;
    setTargetLocation(defaultLoc);
    setLocationSearch(defaultLoc);
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Binding Node...</div>;

  const isClockedIn = !!todayRecord?.clockIn;
  const isClockedOut = !!todayRecord?.clockOut;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-700 pb-24">
      {/* TIME HEADER */}
      <div className="bg-slate-900 rounded-[2rem] p-8 md:p-14 text-white text-center relative overflow-hidden shadow-2xl">
         <div className="absolute inset-0 bg-blue-600/10 opacity-50"></div>
         <div className="relative z-10 space-y-4">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Temporal Terminal</p>
            <h2 className="text-5xl md:text-8xl font-black tabular-nums tracking-tighter leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </h2>
            <p className="text-slate-400 text-sm font-bold">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
         </div>
      </div>

      {/* MAIN PUNCH BOX */}
      <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-sm text-center space-y-10 relative overflow-hidden">
        {showSuccess && (
          <div className="absolute inset-0 bg-emerald-600 flex flex-col items-center justify-center text-white z-20 animate-in zoom-in-95">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl mb-4 shadow-xl">✓</div>
             <h3 className="text-xl font-black uppercase">
               {showSuccess === 'Manual' ? 'Proxy Log Success' : `Clock ${showSuccess} Success`}
             </h3>
             <p className="text-[9px] font-bold uppercase tracking-widest mt-2 opacity-80">Synchronized State</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-8 py-4">
          {isClockedOut ? (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl border border-slate-100 shadow-inner mx-auto">🏁</div>
              <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Shift Concluded</h4>
            </div>
          ) : (
            <button 
              onClick={handleAction} 
              disabled={isCommitting} 
              className={`w-48 h-48 md:w-60 md:h-60 rounded-full border-[8px] flex flex-col items-center justify-center transition-all active:scale-90 shadow-2xl ${
                !isClockedIn ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'
              }`}
            >
               <span className="text-4xl mb-2">{isCommitting ? '⌛' : !isClockedIn ? '🔓' : '🔒'}</span>
               <span className="text-white text-base font-black uppercase tracking-widest">
                 {isCommitting ? 'Syncing' : !isClockedIn ? 'Punch In' : 'Punch Out'}
               </span>
            </button>
          )}

          {canMarkOthers && !isClockedOut && (
             <button 
               onClick={() => {
                 setIsMarkingOthers(true);
                 setTargetLocation(userAssignment); 
                 setLocationSearch(userAssignment);
               }}
               className="px-8 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200"
             >
               📋 Mark for Someone Else
             </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-10 border-t border-slate-50">
           <PunchDisplay label="Entry" time={format12h(todayRecord?.clockIn)} />
           <PunchDisplay label="Exit" time={format12h(todayRecord?.clockOut)} />
        </div>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
         <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 shrink-0">
            <img src={`https://picsum.photos/seed/${userId}/128/128`} className="w-full h-full object-cover" alt="u" />
         </div>
         <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Current Node Operator</p>
            <h4 className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{userName}</h4>
         </div>
      </div>

      {/* PROXY MARKING MODAL */}
      {isMarkingOthers && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Proxy Presence</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Authorizing Subordinate Arrival</p>
                 </div>
                 <button onClick={() => { setIsMarkingOthers(false); setSelectedTarget(null); setLocationSearch(''); setShowLocationResults(false); stopScanner(); }} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">✕</button>
              </div>

              <div className="space-y-6">
                 {/* QR SCANNER VIEWPORT */}
                 {isScanningQR && (
                   <div className="relative w-full aspect-square bg-black rounded-[2.5rem] overflow-hidden mb-6 border-4 border-blue-600 animate-in zoom-in-95 shadow-2xl">
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-[40px] border-black/40"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-400 rounded-2xl shadow-[0_0_50px_rgba(37,99,235,0.4)]">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 shadow-lg animate-[scan_2s_linear_infinite]"></div>
                      </div>
                      <button onClick={stopScanner} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Close Camera</button>
                      <style>{`
                        @keyframes scan {
                          0% { transform: translateY(0); }
                          100% { transform: translateY(192px); }
                        }
                      `}</style>
                   </div>
                 )}

                 {!selectedTarget ? (
                    <div className="space-y-4">
                       <div className="flex gap-2">
                          <div className="relative flex-1">
                             <input 
                               type="text" 
                               placeholder={userRole === UserRole.TEACHER ? "Search students in your school..." : "Search by Name or ID..."}
                               value={targetSearch}
                               onChange={e => setTargetSearch(e.target.value)}
                               className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10"
                             />
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                          </div>
                          <button 
                            type="button"
                            onClick={startScanner}
                            className="w-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg active:scale-90 transition-transform"
                          >
                            🔳
                          </button>
                       </div>
                       
                       <div className="space-y-2">
                          {filteredTargets.map(u => (
                             <button 
                                key={u.id}
                                onClick={() => selectTarget(u)}
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 hover:border-blue-400 transition-all text-left shadow-sm group"
                             >
                                <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                                   <img src={`https://picsum.photos/seed/${u.id}/64/64`} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-xs font-black text-slate-900 leading-none group-hover:text-blue-600 truncate uppercase">{u.name}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {u.id} • {u.role}</p>
                                </div>
                             </button>
                          ))}
                          {targetSearch.length >= 2 && filteredTargets.length === 0 && (
                             <div className="py-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {userRole === UserRole.TEACHER ? 'No matching students found in your school node.' : 'No matching artifacts found.'}
                             </div>
                          )}
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-8 animate-in zoom-in-95">
                       <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex flex-col gap-4">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-blue-200 overflow-hidden shadow-sm shrink-0">
                               <img src={`https://picsum.photos/seed/${selectedTarget.id}/128/128`} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Marking Presence For</p>
                               <h4 className="text-base md:text-lg font-black text-slate-900 leading-tight truncate uppercase">{selectedTarget.name}</h4>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{selectedTarget.id} • {selectedTarget.role}</p>
                            </div>
                            <button onClick={() => setSelectedTarget(null)} className="text-[9px] font-black text-blue-600 uppercase underline">Change</button>
                          </div>
                          
                          <div className="pt-3 border-t border-blue-200/50 flex justify-between items-center">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Shift</p>
                             <p className={`text-[10px] font-black uppercase ${selectedTargetShift ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {selectedTargetShift ? `${selectedTargetShift.label} (${format12h(selectedTargetShift.startTime)} - ${format12h(selectedTargetShift.endTime)})` : 'NOT ASSIGNED'}
                             </p>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="space-y-3 relative">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Work Location (School Node)</label>
                             <div className="relative">
                                <input 
                                   type="text"
                                   placeholder="Search school..."
                                   value={locationSearch}
                                   disabled={userRole === UserRole.TEACHER}
                                   onFocus={() => setShowLocationResults(true)}
                                   onChange={e => { setLocationSearch(e.target.value); setShowLocationResults(true); }}
                                   className={`w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black uppercase outline-none transition-all shadow-inner ${userRole === UserRole.TEACHER ? 'opacity-60 cursor-not-allowed' : 'focus:ring-4 focus:ring-blue-500/10'}`}
                                />
                                {userRole !== UserRole.TEACHER && <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-[10px]">🔍</span>}
                             </div>
                             
                             {showLocationResults && userRole !== UserRole.TEACHER && (
                               <div className="absolute z-[110] left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in slide-in-from-top-2">
                                  {filteredLocations.map(s => (
                                    <button 
                                       key={s.id} 
                                       type="button" 
                                       onClick={() => { 
                                          setTargetLocation(s.name); 
                                          setLocationSearch(s.name); 
                                          setShowLocationResults(false); 
                                       }} 
                                       className="w-full p-4 hover:bg-blue-50 text-left border-b border-slate-50 last:border-0"
                                    >
                                       <p className="text-xs font-black text-slate-800 uppercase">{s.name}</p>
                                       <p className="text-[8px] text-slate-400 font-bold uppercase">{s.id}</p>
                                    </button>
                                  ))}
                                  {filteredLocations.length === 0 && (
                                     <div className="p-4 text-center text-[9px] font-black text-slate-400 uppercase">No locations found</div>
                                  )}
                               </div>
                             )}
                          </div>

                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Presence State</label>
                             <div className="grid grid-cols-4 gap-2">
                                {(['Present', 'Early', 'Late', 'Absent'] as const).map(status => (
                                   <button 
                                     key={status}
                                     onClick={() => setTargetStatus(status)}
                                     className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                       targetStatus === status 
                                       ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                                       : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                                     }`}
                                   >
                                      {status}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>

                       <div className="flex flex-col sm:flex-row gap-3 pt-4">
                          <button onClick={() => { setIsMarkingOthers(false); setSelectedTarget(null); setLocationSearch(''); setShowLocationResults(false); stopScanner(); }} className="w-full sm:flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase">Discard</button>
                          <button 
                            onClick={handleProxyMark}
                            disabled={isCommitting}
                            className="w-full sm:flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center gap-2"
                          >
                             {isCommitting ? 'Commiting Handshake...' : 'Authorize Proxy Log'}
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const PunchDisplay = ({ label, time }: any) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className="text-lg md:text-xl font-black text-slate-800 tabular-nums leading-none">{time || '--:--'}</p>
  </div>
);

export default AttendanceTerminal;
