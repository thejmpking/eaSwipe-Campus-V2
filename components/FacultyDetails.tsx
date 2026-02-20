
import React, { useState, useMemo } from 'react';
import { UserIdentity } from '../App';

interface FacultyDetailsProps {
  facultyId: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  shifts: any[];
  shiftAssignments: any[];
  onBack: () => void;
}

type FacultyTab = 'personal' | 'attendance' | 'growth' | 'inspections';

const FacultyDetails: React.FC<FacultyDetailsProps> = ({ facultyId, users, attendanceRecords, shifts, shiftAssignments, onBack }) => {
  const [activeTab, setActiveTab] = useState<FacultyTab>('personal');
  
  // Temporal Filter State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // UI State
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [selectedAttendance, setSelectedAttendance] = useState<any | null>(null);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = [2024, 2025, 2026];

  const systemUser = useMemo(() => users.find(u => u.id === facultyId), [facultyId, users]);
  const appName = localStorage.getItem('APP_NAME') || 'EduSync Unified';

  const avatarSrc = systemUser?.nfcUrl?.startsWith('data:') 
    ? systemUser.nfcUrl 
    : `https://picsum.photos/seed/${facultyId}/128/128`;

  // Helper: Convert time string to minutes
  const toMinutes = (time: string | null | undefined) => {
    if (!time) return null;
    try {
      const parts = time.trim().split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) || 0;
      return (isNaN(h) || isNaN(m)) ? null : (h * 60 + m);
    } catch (e) {
      return null;
    }
  };

  const format12h = (time: string | null | undefined) => {
    if (!time) return '--:--';
    try {
      const [h, m] = time.split(':');
      const hours = parseInt(h, 10);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${m.substring(0, 2)} ${suffix}`;
    } catch (e) {
      return time;
    }
  };

  // 1. Resolve every record for the period
  const allPersonalRecords = useMemo(() => {
    return attendanceRecords
      .filter(r => r.userId === facultyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [facultyId, attendanceRecords]);

  // 2. Filtered artifacts based on UI selection
  const filteredRecords = useMemo(() => {
    return allPersonalRecords.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allPersonalRecords, selectedMonth, selectedYear]);

  // 3. COMPLIANCE RESOLVER (Calculates for all records in the filtered set)
  const resolvedCompliance = useMemo(() => {
    const map: Record<string, { shift: any, isLate: boolean, isHalfDay: boolean, workedHours: string }> = {};
    
    filteredRecords.forEach(record => {
      const recordDate = record.date;
      const targetId = facultyId;

      // Find assigned shift
      const assignment = shiftAssignments.find(a => 
        a.targetId === targetId && 
        (recordDate === a.assignedDate || (recordDate >= a.startDate && recordDate <= a.endDate))
      );
      
      const shift = assignment ? shifts.find(s => s.id === assignment.shiftId) : null;
      
      // Core Calculations
      const actualIn = toMinutes(record.clockIn);
      const actualOut = toMinutes(record.clockOut);
      
      let workedMinutes = 0;
      if (actualIn !== null && actualOut !== null) {
        workedMinutes = actualOut >= actualIn ? (actualOut - actualIn) : (1440 - actualIn) + actualOut;
      }

      let isLate = false;
      let isHalfDay = false;

      if (shift && actualIn !== null) {
        const shiftIn = toMinutes(shift.startTime) || 0;
        const shiftOut = toMinutes(shift.endTime) || 0;
        const grace = shift.gracePeriod || 0;
        isLate = actualIn > (shiftIn + grace);
        
        const shiftDuration = shiftOut - shiftIn;
        if (workedMinutes > 0 && shiftDuration > 0 && workedMinutes < (shiftDuration / 2)) {
          isHalfDay = true;
        }
      }

      map[record.id || `${record.date}-${record.userId}`] = {
        shift,
        isLate,
        isHalfDay,
        workedHours: (workedMinutes / 60).toFixed(1)
      };
    });

    return map;
  }, [filteredRecords, facultyId, shifts, shiftAssignments]);

  // 4. WEEKLY GROUPING LOGIC
  const groupedByWeek = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    filteredRecords.forEach(record => {
      const date = new Date(record.date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(record);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRecords]);

  // 5. Yield Analytics
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'Early').length;
    const absent = filteredRecords.filter(r => r.status === 'Absent' || r.status === 'On Leave').length;
    const yieldPerc = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    return { total, present, absent, yieldPerc };
  }, [filteredRecords]);

  const toggleWeek = (weekKey: string) => {
    const next = new Set(expandedWeeks);
    if (next.has(weekKey)) next.delete(weekKey);
    else next.add(weekKey);
    setExpandedWeeks(next);
  };

  const getWeekLabel = (mondayStr: string) => {
    const start = new Date(mondayStr);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} — ${end.toLocaleDateString('en-US', options)}`;
  };

  const handlePDFExport = () => {
    // Ensuring the event loop is clear before triggering browser print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Status", "Clock In", "Clock Out", "Hours", "Late", "Half Day", "Location"];
    const rows = filteredRecords.map(r => {
      const comp = resolvedCompliance[r.id || `${r.date}-${r.userId}`];
      return [
        r.date,
        r.status,
        r.clockIn || '--:--',
        r.clockOut || '--:--',
        comp?.workedHours || '0.0',
        comp?.isLate ? 'YES' : 'NO',
        comp?.isHalfDay ? 'YES' : 'NO',
        r.location || 'Sovereign Node'
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const filename = `Presence_${systemUser?.name || facultyId}_${months[selectedMonth]}_${selectedYear}.csv`.replace(/\s+/g, '_');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <div className="flex justify-between items-center px-1">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact Context</h4>
                 {systemUser?.whatsapp && (
                    <a 
                      href={`https://wa.me/91${systemUser.whatsapp.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      <span>💬</span> WhatsApp Node
                    </a>
                 )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ProfileField label="Identity" value={systemUser?.name || 'Staff Member'} icon="👤" />
                <ProfileField label="Institutional Role" value={systemUser?.role?.replace('_', ' ') || 'Faculty'} icon="🛡️" />
                <ProfileField label="Official Email" value={systemUser?.email || 'Unlinked'} icon="📧" />
                <ProfileField label="Blood Group" value={systemUser?.bloodGroup || 'O+'} icon="🩸" />
                <ProfileField label="Tenure Artifact" value={systemUser?.experience || 'New Member'} icon="⏳" />
              </div>
              <div className="pt-6 border-t border-slate-50 space-y-8">
                 <ProfileField label="Primary Node Assignment" value={systemUser?.assignment || 'Global Root'} icon="📍" />
                 <ProfileField label="Verified Residence" value={systemUser?.address || 'Registered Residential Node'} icon="🏠" />
              </div>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500 pb-24 printable-report">
            {/* --- PRINT ONLY HEADER --- */}
            <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-10">
               <div className="flex justify-between items-start mb-8">
                  <div>
                     <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{appName}</h1>
                     <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Presence Intelligence Artifact</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs font-bold text-slate-400 uppercase">Generation Date</p>
                     <p className="text-sm font-black text-slate-900 uppercase">{new Date().toLocaleDateString()}</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-10 bg-slate-50 p-8 rounded-3xl border border-slate-200">
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty Name</p>
                        <p className="text-xl font-black text-slate-900 uppercase">{systemUser?.name}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Node</p>
                        <p className="text-sm font-bold text-slate-700 uppercase">{facultyId} • {systemUser?.role?.replace('_', ' ')}</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Period</p>
                        <p className="text-lg font-black text-blue-600 uppercase">{months[selectedMonth]} {selectedYear}</p>
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase">Yield</p>
                           <p className="text-sm font-black text-slate-900">{metrics.yieldPerc}%</p>
                        </div>
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase">Present</p>
                           <p className="text-sm font-black text-slate-900">{metrics.present}</p>
                        </div>
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase">Absent</p>
                           <p className="text-sm font-black text-slate-900">{metrics.absent}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* ORGANIZED FILTERS HUB */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-full sm:w-auto">
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer border border-slate-100 hover:border-blue-200 transition-all min-w-[140px]"
                >
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="bg-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer border border-slate-100 hover:border-blue-200 transition-all"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                 <button 
                  type="button"
                  onClick={handlePDFExport}
                  className="flex-1 sm:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                 >
                   📄 PDF Report
                 </button>
                 <button 
                  type="button"
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   📊 CSV Data
                 </button>
              </div>
            </div>

            {/* PERIOD ANALYTICS */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 no-print">
               <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl shadow-inner border border-indigo-100">📈</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Window Yield ({months[selectedMonth]})</p>
                    <p className="text-3xl font-black text-slate-900 leading-none">{metrics.yieldPerc}%</p>
                  </div>
               </div>
               <div className="flex gap-4 md:gap-8 w-full md:w-auto justify-center md:justify-end border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-10">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Present</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{metrics.present}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Absent</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{metrics.absent}</p>
                  </div>
               </div>
            </div>

            {/* ARTIFACT LIST: WEEKLY ACCORDION */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-3 mb-2 no-print">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Weekly Temporal Map</h4>
              </div>
              
              {groupedByWeek.length > 0 ? groupedByWeek.map(([weekKey, records]) => {
                const isOpen = expandedWeeks.has(weekKey);
                return (
                  <div key={weekKey} className="space-y-2 break-inside-avoid">
                    <button 
                      type="button"
                      onClick={() => toggleWeek(weekKey)}
                      className={`w-full flex items-center justify-between p-6 rounded-[2rem] border transition-all no-print ${
                        isOpen ? 'bg-slate-900 border-slate-800 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${isOpen ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}>🗓️</div>
                        <div className="text-left">
                           <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isOpen ? 'text-blue-400' : 'text-slate-400'}`}>
                             {getWeekLabel(weekKey)}
                           </p>
                           <p className="text-sm font-black uppercase tracking-tight">Week Artifact</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${isOpen ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {records.length} Logs
                        </span>
                        <span className={`text-xl transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </button>

                    {/* Print Label for Week - Ensure it shows in print even if collapsed on screen */}
                    <div className="hidden print:block pt-6 pb-2 border-b border-slate-200">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getWeekLabel(weekKey)}</p>
                    </div>

                    <div className={`space-y-2 pl-4 pr-1 animate-in slide-in-from-top-4 duration-300 ${!isOpen ? 'hidden print:block' : 'block'}`}>
                      {records.map((record, i) => {
                        const comp = resolvedCompliance[record.id || `${record.date}-${record.userId}`];
                        return (
                          <div 
                            key={record.id || i} 
                            onClick={() => setSelectedAttendance(record)}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-300 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] break-inside-avoid"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-inner border ${
                                  record.status === 'Present' || record.status === 'Late' || record.status === 'Early' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                  : 'bg-rose-50 border-rose-100 text-rose-600'
                              }`}>
                                  {record.status === 'Present' ? '✓' : record.status === 'Late' ? '!' : record.status === 'Early' ? 'E' : '✕'}
                              </div>
                              <div className="min-w-0">
                                  <p className="text-[12px] font-black text-slate-900 uppercase leading-none mb-1.5">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                      {record.clockIn ? format12h(record.clockIn) : '--:--'} In • {comp?.workedHours}h
                                    </p>
                                    <div className="flex gap-1.5">
                                      {comp?.isHalfDay && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[7px] font-black uppercase">Half Day</span>}
                                      {comp?.isLate && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[7px] font-black uppercase">Late</span>}
                                    </div>
                                  </div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                              record.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 
                              record.status === 'Late' ? 'bg-amber-50 text-amber-600' : 
                              record.status === 'Early' ? 'bg-blue-50 text-blue-600' : 
                              'bg-rose-50 text-rose-600'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : (
                <div className="py-24 text-center bg-slate-100/50 rounded-[4rem] border-2 border-dashed border-slate-200">
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner opacity-20">🔎</div>
                   <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">No Presence Artifacts in this cycle</p>
                   <p className="text-slate-300 font-bold text-[9px] mt-2 uppercase">Window: {months[selectedMonth]} {selectedYear}</p>
                </div>
              )}
            </div>
            
            {/* Print Footer */}
            <div className="hidden print:block mt-16 pt-10 border-t-2 border-slate-200">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">End of Sovereign Presence Record • EduSync Cloud Reporting Protocol v7.2</p>
            </div>
          </div>
        );
      default:
        return <div className="py-40 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronization Engine Active...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-4 md:-m-12 relative">
      {/* ATTENDANCE DETAIL MODAL */}
      {selectedAttendance && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[300] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300 no-print">
           {(() => {
              const comp = resolvedCompliance[selectedAttendance.id || `${selectedAttendance.date}-${selectedAttendance.userId}`];
              return (
                <div className="bg-white max-w-lg w-full rounded-t-[2.5rem] md:rounded-[3.5rem] shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 overflow-hidden flex flex-col">
                  <div className="bg-slate-900 p-8 md:p-10 text-white shrink-0">
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Temporal Artifact Record</p>
                        <button type="button" onClick={() => setSelectedAttendance(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-colors">✕</button>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl border-4 border-white/10 ${
                          selectedAttendance.status === 'Present' || selectedAttendance.status === 'Late' || selectedAttendance.status === 'Early' ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}>
                          {selectedAttendance.status === 'Present' ? '✓' : selectedAttendance.status === 'Late' ? '!' : selectedAttendance.status === 'Early' ? 'E' : '✕'}
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tight uppercase leading-none mb-2">{new Date(selectedAttendance.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                          <div className="flex gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                comp?.isHalfDay ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                              }`}>
                                {comp?.isHalfDay ? '⚠️ Half Day' : '✅ Full Day'}
                              </span>
                              {comp?.isLate && (
                                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest">
                                    🚨 Late Arrival
                                </span>
                              )}
                          </div>
                        </div>
                    </div>
                  </div>
                  
                  <div className="p-8 md:p-10 space-y-8 bg-white">
                    {/* SHIFT CONTEXT BOX */}
                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4 shadow-inner">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xl shadow-sm">🕒</div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">Assigned Shift Window</p>
                          {comp?.shift ? (
                            <>
                              <p className="text-sm font-black text-slate-900 uppercase truncate leading-none">{comp.shift.label}</p>
                              <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">{format12h(comp.shift.startTime)} — {format12h(comp.shift.endTime)}</p>
                            </>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight italic">No Shift Bound in Ledger</p>
                          )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <ArtifactMetric label="Clock In Time" value={format12h(selectedAttendance.clockIn)} icon="🕒" />
                        <ArtifactMetric label="Clock Out Time" value={format12h(selectedAttendance.clockOut)} icon="⌛" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <ArtifactMetric label="Total Work Time" value={`${comp?.workedHours} Hours`} icon="📈" />
                        <ArtifactMetric label="Compliance Status" value={selectedAttendance.status} icon="🛡️" />
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Verification Artifact</p>
                        <p className="text-[10px] text-slate-500 italic leading-relaxed font-medium">
                          Location: <span className="font-bold text-slate-700">{selectedAttendance.location || 'Central Node'}</span> • Method: <span className="font-bold text-slate-700">{selectedAttendance.method || 'System Standard'}</span>
                        </p>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setSelectedAttendance(null)}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                    >
                      Acknowledge Record
                    </button>
                  </div>
                </div>
              );
           })()}
        </div>
      )}

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-[50] bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-5 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-transform">←</button>
          <div className="min-w-0 flex-1">
             <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">{facultyId}</span>
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verified Identity</span>
             </div>
             <h2 className="text-base md:text-xl font-black text-slate-900 leading-none truncate uppercase tracking-tight">{systemUser?.name || 'Staff Member'}</h2>
          </div>
          <div className="w-12 h-12 rounded-[1.5rem] overflow-hidden border-2 border-white shadow-xl bg-slate-100 shrink-0">
             <img src={avatarSrc} className="w-full h-full object-cover" alt="avatar" />
          </div>
        </div>
      </div>

      <div className="sticky top-[81px] z-[40] bg-slate-50/95 backdrop-blur-md px-4 py-3 border-b border-slate-200/50 no-print">
        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] flex gap-1 shadow-inner overflow-x-auto scrollbar-hide max-w-2xl mx-auto">
          {[
            { id: 'personal', label: 'Profile', icon: '👤' },
            { id: 'attendance', label: 'Presence', icon: '📋' },
            { id: 'growth', label: 'Growth', icon: '📈' },
            { id: 'inspections', label: 'Audit', icon: '🔍' },
          ].map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as FacultyTab)} className={`flex-1 flex flex-col items-center justify-center min-w-[75px] py-2.5 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-500'}`}>
              <span className="text-lg md:text-xl mb-0.5">{tab.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-6 md:pt-10">
        {renderContent()}
      </div>
    </div>
  );
};

const ProfileField: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-5 min-w-0">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0 shadow-inner">{icon}</div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
      <p className="text-sm font-black text-slate-800 leading-tight break-words uppercase">{value}</p>
    </div>
  </div>
);

const ArtifactMetric: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
     <span className="text-xl md:text-2xl opacity-60 shrink-0">{icon}</span>
     <div className="min-w-0">
        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">{label}</p>
        <p className="text-xs md:text-sm font-black text-slate-800 truncate uppercase tracking-tight">{value}</p>
     </div>
  </div>
);

export default FacultyDetails;
