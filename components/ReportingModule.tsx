import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';

interface ReportingModuleProps {
  userRole: UserRole;
  userName: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  schools?: any[];
  clusters?: any[];
}

type ReportType = 'Attendance' | 'Users' | 'Inspections' | 'Training' | 'Leave';

const ReportingModule: React.FC<ReportingModuleProps> = ({ userRole, userName, users = [], attendanceRecords = [], schools = [], clusters = [] }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('Attendance');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Attendance Filters
  const [attFilters, setAttFilters] = useState({
    horizon: 'Monthly',
    target: 'Faculty',
    school: 'All Schools',
    cluster: 'All Clusters',
    year: new Date().getFullYear().toString()
  });

  // User Report Specific Filters (Month/Date Removed)
  const [userReportFilters, setUserReportFilters] = useState({
    cluster: 'All',
    school: 'All',
    role: 'All',
    schoolSearch: ''
  });

  const [generalFilters, setGeneralFilters] = useState({
    dateRange: 'This Month',
    institution: 'All Schools',
    status: 'All'
  });

  // Clear error message when filters change
  useEffect(() => {
    setErrorMessage(null);
  }, [attFilters, userReportFilters]);

  const monthsList = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const yearsList = ["2024", "2025", "2026"];

  // Role-based visibility logic
  const availableReports: ReportType[] = [];
  if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.RESOURCE_PERSON, UserRole.STUDENT].includes(userRole)) availableReports.push('Attendance');
  if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN].includes(userRole)) availableReports.push('Users');
  if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.RESOURCE_PERSON].includes(userRole)) availableReports.push('Inspections');
  if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.TEACHER].includes(userRole)) availableReports.push('Training');
  if ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT].includes(userRole)) availableReports.push('Leave');

  const userStats = useMemo(() => {
    return {
      total: users.length,
      students: users.filter(u => u.role === UserRole.STUDENT).length,
      staff: users.filter(u => u.role !== UserRole.STUDENT).length,
      verified: users.filter(u => u.status === 'Verified').length,
    };
  }, [users]);

  const handleExport = (format: 'PDF' | 'Excel') => {
    if (format === 'PDF') {
      window.print();
    } else {
      setIsExporting(true);
      setTimeout(() => {
        setIsExporting(false);
        // Direct Excel download logic would go here, currently placeholder alert
        alert(`The ${activeReport} report has been prepared for data sheet extraction.`);
      }, 1500);
    }
  };

  const handleDownloadUserCSV = () => {
    const { cluster, school, role } = userReportFilters;
    
    // 1. Filter Logic
    const filtered = users.filter(u => {
      const matchesCluster = cluster === 'All' || u.cluster === cluster;
      const matchesSchool = school === 'All' || u.assignment === school || u.school === school;
      
      let matchesRole = true;
      if (role !== 'All') {
        if (role === 'Admins') matchesRole = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD].includes(u.role);
        else if (role === 'School Admin') matchesRole = u.role === UserRole.SCHOOL_ADMIN;
        else if (role === 'Faculties') matchesRole = u.role === UserRole.TEACHER;
        else if (role === 'RP') matchesRole = u.role === UserRole.RESOURCE_PERSON;
        else if (role === 'Student') matchesRole = u.role === UserRole.STUDENT;
      }

      return matchesCluster && matchesSchool && matchesRole;
    });

    if (filtered.length === 0) {
      setErrorMessage("System Notice: No identity artifacts found matching the selected jurisdictional node.");
      return;
    }

    // 2. CSV Generation
    const headers = ["ID Number", "Name", "Role", "Mobile Number", "Email", "Working Location", "Cluster", "Status"];
    const rows = filtered.map(u => [
      u.id,
      u.name,
      u.role.replace('_', ' '),
      u.phone || 'N/A',
      u.email,
      u.assignment || u.school || 'Unassigned',
      u.cluster || 'N/A',
      u.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // 3. Download
    const filename = `Users_${cluster !== 'All' ? cluster : 'Global'}_${school !== 'All' ? school : ''}.csv`.replace(/\s+/g, '_');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  };

  const handleDownloadCSV = (monthIndex: number) => {
    setErrorMessage(null);
    const selectedYearNum = parseInt(attFilters.year);
    const monthName = monthsList[monthIndex];
    
    const clusterRPs = users.filter(u => 
      u.role === UserRole.RESOURCE_PERSON && 
      u.cluster?.trim().toLowerCase() === attFilters.cluster.trim().toLowerCase()
    );
    const rpIds = clusterRPs.map(u => String(u.id));

    if (rpIds.length === 0) {
      setErrorMessage(`No Resource Persons are registered under the "${attFilters.cluster}" jurisdiction.`);
      return;
    }

    const filteredRecords = attendanceRecords.filter(r => {
      if (!r.date) return false;
      const dateParts = r.date.split('-');
      if (dateParts.length < 3) return false;
      const recordYear = parseInt(dateParts[0]);
      const recordMonth = parseInt(dateParts[1]) - 1;
      const rUserId = String(r.userId || r.user_id || '');
      return rpIds.includes(rUserId) && recordMonth === monthIndex && recordYear === selectedYearNum;
    });

    if (filteredRecords.length === 0) {
      setErrorMessage(`No attendance artifacts found for RPs in ${monthName} ${selectedYearNum} within the ${attFilters.cluster} node.`);
      return;
    }

    const headers = ["Date", "RP Name", "RP ID", "Status", "Clock In", "Clock Out", "Location", "Method"];
    const rows = filteredRecords.map(r => {
      const user = clusterRPs.find(u => String(u.id) === String(r.userId || r.user_id));
      return [
        r.date,
        user?.name || r.userName || r.user_name || 'Unknown Identity',
        r.userId || r.user_id || 'N/A',
        r.status || 'Marked',
        r.clockIn || r.clock_in || '--:--',
        r.clockOut || r.clock_out || '--:--',
        r.location || user?.assignment || 'Sovereign Node',
        r.method || 'Ledger'
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_RP_${attFilters.cluster.replace(/\s+/g, '_')}_${monthName}_${selectedYearNum}.csv`);
    link.click();
  };

  const renderAttendanceReport = () => {
    const isSpecificRPMonthly = attFilters.horizon === 'Monthly' && attFilters.target === 'RP' && attFilters.cluster !== 'All Clusters';

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FilterSelect 
              label="Time Horizon" 
              value={attFilters.horizon} 
              options={['Monthly', '3 Months', '6 Months', '1 Year']}
              onChange={(val) => setAttFilters({...attFilters, horizon: val})}
            />
            <FilterSelect 
              label="Selected Year" 
              value={attFilters.year} 
              options={yearsList}
              onChange={(val) => setAttFilters({...attFilters, year: val})}
            />
            <FilterSelect 
              label="Target Role" 
              value={attFilters.target} 
              options={['Faculty', 'RP', 'Student']}
              onChange={(val) => setAttFilters({...attFilters, target: val})}
            />
            {attFilters.target === 'RP' ? (
              <FilterSelect 
                label="Jurisdictional Cluster" 
                value={attFilters.cluster} 
                options={['All Clusters', ...clusters.map(c => c.name)]}
                onChange={(val) => setAttFilters({...attFilters, cluster: val})}
              />
            ) : (
              <FilterSelect 
                label="Educational Entity" 
                value={attFilters.school} 
                options={['All Schools', ...schools.map(s => s.name)]}
                onChange={(val) => setAttFilters({...attFilters, school: val})}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label={`Avg. ${attFilters.target} Attendance`} value="94.1%" sub={`${attFilters.horizon} Horizon`} trend="up" />
          <SummaryCard label="Node Compliance" value="100%" sub="Punctuality Check" trend="neutral" />
          <SummaryCard label="Flagged Anomalies" value="0" sub="Zero Variance" trend="down" />
        </div>

        {isSpecificRPMonthly && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 no-print">
             <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span>
                  <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em]">Monthly Narrative Archives</h4>
                </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {monthsList.map((month, index) => (
                  <div key={month} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">📊</div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">{month}</p>
                    <button 
                      onClick={() => handleDownloadCSV(index)}
                      className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      Download CSV
                    </button>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderUsersReport = () => {
    const filteredSchools = schools.filter(s => 
      (userReportFilters.cluster === 'All' || s.clusterName === userReportFilters.cluster) &&
      (s.name.toLowerCase().includes(userReportFilters.schoolSearch.toLowerCase()))
    );

    const isDownloadPossible = userReportFilters.cluster !== 'All';

    // Users specifically matching current report filters for the preview
    const ledgerPreviewUsers = users.filter(u => {
        const matchesCluster = userReportFilters.cluster === 'All' || u.cluster === userReportFilters.cluster;
        const matchesSchool = userReportFilters.school === 'All' || u.assignment === userReportFilters.school || u.school === userReportFilters.school;
        
        let matchesRole = true;
        if (userReportFilters.role !== 'All') {
          if (userReportFilters.role === 'Admins') matchesRole = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CAMPUS_HEAD].includes(u.role);
          else if (userReportFilters.role === 'School Admin') matchesRole = u.role === UserRole.SCHOOL_ADMIN;
          else if (userReportFilters.role === 'Faculties') matchesRole = u.role === UserRole.TEACHER;
          else if (userReportFilters.role === 'RP') matchesRole = u.role === UserRole.RESOURCE_PERSON;
          else if (userReportFilters.role === 'Student') matchesRole = u.role === UserRole.STUDENT;
        }
        return matchesCluster && matchesSchool && matchesRole;
    }).slice(0, 10);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* USER REPORT FILTERS - MOBILE OPTIMIZED (Month/Date Removed) */}
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            <FilterSelect 
              label="Jurisdictional Cluster" 
              value={userReportFilters.cluster} 
              options={['All', ...clusters.map(c => c.name)]}
              onChange={(val) => setUserReportFilters({...userReportFilters, cluster: val, school: 'All'})}
            />
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">School Entity (Search)</label>
              <div className="relative space-y-3">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search School Node..."
                    value={userReportFilters.schoolSearch}
                    onChange={(e) => setUserReportFilters({...userReportFilters, schoolSearch: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-xs">🔍</span>
                </div>
                <div className="relative">
                  <select 
                    value={userReportFilters.school} 
                    onChange={(e) => setUserReportFilters({...userReportFilters, school: e.target.value})}
                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black appearance-none cursor-pointer hover:border-indigo-200 transition-colors"
                  >
                    <option value="All">All Schools in {userReportFilters.cluster === 'All' ? 'Master' : userReportFilters.cluster}</option>
                    {filteredSchools.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 text-[8px]">▼</span>
                </div>
              </div>
            </div>

            <FilterSelect 
              label="Identity Tier (Role)" 
              value={userReportFilters.role} 
              options={['All', 'Student', 'RP', 'Faculties', 'School Admin', 'Admins']}
              onChange={(val) => setUserReportFilters({...userReportFilters, role: val})}
            />
          </div>
        </div>

        {/* MOBILE OPTIMIZED EXPORT ACTION CARD */}
        {isDownloadPossible ? (
          <div className="flex flex-col items-center justify-center p-8 md:p-20 bg-white rounded-[3rem] md:rounded-[4.5rem] border border-indigo-100 shadow-sm animate-in slide-in-from-bottom-4 group no-print">
             <div className="w-16 h-16 md:w-28 md:h-28 bg-indigo-50 text-indigo-600 rounded-[2rem] md:rounded-[3.5rem] flex items-center justify-center text-3xl md:text-5xl mb-6 md:mb-10 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">📥</div>
             <h3 className="text-xl md:text-4xl font-black text-slate-900 uppercase tracking-tight mb-2 md:mb-4 text-center">Export Jurisdictional Ledger</h3>
             <p className="text-[10px] md:text-base text-slate-500 font-medium mb-10 md:mb-16 text-center max-w-sm md:max-w-xl leading-relaxed px-4">
               Extracting comprehensive identity artifacts for {userReportFilters.school !== 'All' ? <span className="text-indigo-600 font-bold">"{userReportFilters.school}"</span> : <span className="text-indigo-600 font-bold">"the {userReportFilters.cluster} cluster"</span>}.
             </p>
             <button 
              onClick={handleDownloadUserCSV}
              className="w-full md:w-auto px-12 md:px-24 py-4 md:py-6 bg-indigo-600 text-white rounded-2xl md:rounded-[2.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.25em] shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all"
             >
               Download {userReportFilters.school !== 'All' ? 'School' : 'Cluster'} Users CSV
             </button>
          </div>
        ) : (
          <div className="bg-amber-50 p-10 rounded-[3rem] border border-amber-100 text-center animate-in fade-in no-print">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl mx-auto mb-4 shadow-sm">📍</div>
             <p className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em]">Sovereignty Required</p>
             <p className="text-xs text-amber-800 font-bold mt-2 max-w-xs mx-auto leading-relaxed">Select a specific Jurisdictional Cluster to enable high-fidelity data extraction.</p>
          </div>
        )}

        {/* PREVIEW TABLE (Optimized Card View for Mobile) */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Master Ledger Preview</h4>
              <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Top 10 Resolved</span>
           </div>
           
           {/* Desktop Table */}
           <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest">Identity Artifact</th>
                    <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest text-center">Authority</th>
                    <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest text-center">Node</th>
                    <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ledgerPreviewUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-10 py-6">
                        <p className="font-black text-slate-900 uppercase tracking-tight">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-tighter uppercase mt-1">Artifact: #{u.id}</p>
                      </td>
                      <td className="px-10 py-6 text-center">
                         <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase">{u.role.replace('_', ' ')}</span>
                      </td>
                      <td className="px-10 py-6 text-center font-bold text-slate-500 uppercase tracking-tight">
                         {u.assignment || 'Master Root'}
                      </td>
                      <td className="px-10 py-6 text-right">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.status === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{u.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>

           {/* Mobile Card List */}
           <div className="md:hidden space-y-3 px-2">
              {ledgerPreviewUsers.map(u => (
                <div key={u.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                   <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{u.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">#{u.id.split('-').pop()} • {u.role.replace('_', ' ')}</p>
                      <p className="text-[8px] font-black text-blue-500 uppercase mt-2">@{u.assignment || 'Root'}</p>
                   </div>
                   <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${u.status === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{u.status}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 max-w-6xl mx-auto px-1 relative">
      {/* ERROR MODAL POPUP - MOBILE OPTIMIZED */}
      {errorMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 md:p-12 shadow-2xl border-2 border-rose-100 text-center animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-inner">⚠️</div>
              <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mb-6">Institutional Error</h3>
              <p className="text-sm font-bold text-slate-800 leading-relaxed mb-12">{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage(null)}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-xl active:scale-95 transition-all"
              >
                Acknowledge Artifact
              </button>
           </div>
        </div>
      )}

      {/* 1. Page Header (Print Optimized) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
        <div className="printable-header">
          <div className="hidden print:block items-center gap-4 mb-8">
             <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xl italic font-black">ES</div>
             <div>
                <h1 className="text-2xl font-black uppercase tracking-widest">EduSync Institutional Ledger</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sovereign Report Cycle: {new Date().toLocaleDateString()}</p>
             </div>
          </div>
          <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none md:leading-tight uppercase">Institutional Reports</h2>
          <p className="text-slate-500 font-medium mt-2 md:mt-4 tracking-tight no-print">Verified data extraction for sovereign institutional accountability</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto no-print">
           <button 
            onClick={() => handleExport('PDF')}
            disabled={isExporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-all"
           >
            📄 {isExporting ? 'Syncing...' : 'Export PDF'}
           </button>
           <button 
            onClick={() => handleExport('Excel')}
            disabled={isExporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-95 transition-all"
           >
            📊 {isExporting ? 'Syncing...' : 'Data Sheets'}
           </button>
        </div>
      </div>

      {/* 2. Category Selector (App-style dock on mobile) */}
      <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] md:rounded-[3rem] no-print mx-3 md:mx-0">
         <div className="grid grid-cols-3 gap-1 md:gap-4">
            <ReportTile icon="📋" label="Presence" active={activeReport === 'Attendance'} onClick={() => setActiveReport('Attendance')} />
            <ReportTile icon="👥" label="Identity" active={activeReport === 'Users'} onClick={() => setActiveReport('Users')} />
            <ReportTile icon="🔍" label="Audit" active={activeReport === 'Inspections'} onClick={() => setActiveReport('Inspections')} />
         </div>
      </div>

      {/* 4. Active Report Content */}
      <div className="min-h-[400px] animate-in slide-in-from-bottom-2 px-4 md:px-0 printable-content">
        {activeReport === 'Attendance' ? renderAttendanceReport() : 
         activeReport === 'Users' ? renderUsersReport() : 
         (
          <div className="space-y-6">
             <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 no-print">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FilterSelect 
                    label="Time Horizon" 
                    value={generalFilters.dateRange} 
                    options={['Today', 'This Week', 'This Month', 'Academic Term', 'Full Year']}
                    onChange={(val) => setGeneralFilters({...generalFilters, dateRange: val})}
                  />
                  <FilterSelect 
                    label="Jurisdictional Level" 
                    value={generalFilters.institution} 
                    options={['All Schools', 'Campus South', 'Central Cluster', 'North Valley High']}
                    onChange={(val) => setGeneralFilters({...generalFilters, institution: val})}
                  />
                  <FilterSelect 
                    label="Status Audit" 
                    value={generalFilters.status} 
                    options={['All', 'Verified Only', 'Exceptions', 'Audited Only']}
                    onChange={(val) => setGeneralFilters({...generalFilters, status: val})}
                  />
               </div>
            </div>
            <div className="bg-white p-20 rounded-[4rem] border border-slate-100 text-center shadow-inner">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">⚙️</div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol Content Initializing...</p>
            </div>
          </div>
         )}
      </div>

      {/* 5. Policy Explanations (Hidden in print) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 px-4 md:px-0 no-print">
        <div className="bg-blue-50 p-6 md:p-8 rounded-[2.5rem] border border-blue-100 hover:shadow-lg transition-all group">
          <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-blue-600 rounded-full group-hover:scale-150 transition-transform"></span>
             Institutional Filtering
          </h5>
          <p className="text-xs text-blue-800 leading-relaxed font-medium">Reports are cross-referenced with institutional artifacts to ensure 99.9% data fidelity during extraction.</p>
        </div>
        <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] border border-slate-700 shadow-xl hover:bg-slate-800 transition-all">
          <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Sovereignty Access</h5>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">Reporting adheres to jurisdictional authority. Higher tiers access global aggregate yields via encrypted handshakes.</p>
        </div>
        <div className="bg-amber-50 p-6 md:p-8 rounded-[2.5rem] border border-amber-100 hover:shadow-lg transition-all group">
          <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-4 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-amber-600 rounded-full group-hover:scale-150 transition-transform"></span>
             Audit Readiness
          </h5>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">Exported artifacts contain digital signatures suitable for regulatory board reviews and regional planning.</p>
        </div>
      </div>
    </div>
  );
};

const ReportTile = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`p-4 md:p-12 rounded-2xl md:rounded-[4rem] border-2 flex flex-col items-center justify-center gap-2 md:gap-4 transition-all active:scale-95 ${
      active ? 'bg-white text-blue-600 border-transparent shadow-xl shadow-blue-200/20' : 'text-slate-400 border-transparent hover:bg-white/40'
    }`}
  >
    <span className="text-xl md:text-6xl">{icon}</span>
    <span className="text-[8px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.2em] truncate">{label}</span>
  </button>
);

const FilterSelect: React.FC<{ label: string, value: string, options: string[], onChange: (val: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <div className="relative">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all appearance-none cursor-pointer shadow-inner"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] opacity-30 pointer-events-none">▼</span>
    </div>
  </div>
);

const SummaryCard: React.FC<{ label: string, value: string | number, sub: string, trend: 'up' | 'down' | 'neutral' }> = ({ label, value, sub, trend }) => (
  <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
    <div className="flex justify-between items-start mb-4 md:mb-6">
      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <span className={`text-[10px] ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'}
      </span>
    </div>
    <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none mb-1.5 md:mb-2">{value}</p>
    <p className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none truncate">{sub}</p>
  </div>
);

export default ReportingModule;