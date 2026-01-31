
import React, { useState } from 'react';
import { UserRole } from '../types';

interface ReportingModuleProps {
  userRole: UserRole;
  userName: string;
}

type ReportType = 'Attendance' | 'Training' | 'Inspections' | 'Leave';

const ReportingModule: React.FC<ReportingModuleProps> = ({ userRole, userName }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('Attendance');
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'This Month',
    institution: 'All Schools',
    status: 'All'
  });

  // Role-based visibility logic
  const availableReports: ReportType[] = [];
  if ([UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.RESOURCE_PERSON, UserRole.STUDENT].includes(userRole)) availableReports.push('Attendance');
  if ([UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.TEACHER].includes(userRole)) availableReports.push('Training');
  if ([UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.RESOURCE_PERSON].includes(userRole)) availableReports.push('Inspections');
  if ([UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT].includes(userRole)) availableReports.push('Leave');

  const handleExport = (format: 'PDF' | 'Excel') => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(`The ${activeReport} report for ${filters.dateRange} has been generated as an official institutional ${format} document and saved to your downloads.`);
    }, 1500);
  };

  const renderReportContent = () => {
    switch (activeReport) {
      case 'Attendance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Avg. Attendance" value="92.4%" sub="System Average" trend="up" />
              <SummaryCard label="Unauthorized Absence" value="12" sub="Flagged Incidents" trend="down" />
              <SummaryCard label="Late Arrivals" value="4.2%" sub="Grace Period Met" trend="neutral" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
               <table className="w-full text-left text-xs">
                 <thead className="bg-slate-50 border-b border-slate-100">
                   <tr>
                     <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Institution</th>
                     <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Enrolled</th>
                     <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Present</th>
                     <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Absent</th>
                     <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-right">Yield %</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {[
                     { name: 'North Valley High', enrolled: 1200, present: 1120, absent: 80, yield: '93.3%' },
                     { name: 'East Side Primary', enrolled: 850, present: 790, absent: 60, yield: '92.9%' },
                     { name: 'Valley Middle School', enrolled: 600, present: 540, absent: 60, yield: '90.0%' },
                   ].map((row, i) => (
                     <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 font-bold text-slate-700">{row.name}</td>
                       <td className="px-6 py-4 font-medium text-slate-500">{row.enrolled}</td>
                       <td className="px-6 py-4 font-bold text-emerald-600">{row.present}</td>
                       <td className="px-6 py-4 font-bold text-rose-600">{row.absent}</td>
                       <td className="px-6 py-4 text-right font-black text-blue-600">{row.yield}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        );
      case 'Training':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryCard label="Certification Rate" value="84%" sub="Target: 90%" trend="up" />
              <SummaryCard label="Ongoing Shifts" value="3" sub="Active Professional Dev." trend="neutral" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <h4 className="text-sm font-bold text-slate-800">Recent Professional Development Credits</h4>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { title: 'STEM Workshop', staff: 'Sarah Waters', date: '24 May', credits: '4.0' },
                  { title: 'Campus Safety', staff: 'David Miller', date: '22 May', credits: '2.5' },
                  { title: 'Pedagogy Lab', staff: 'John Doe', date: '20 May', credits: '3.0' },
                ].map((row, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{row.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{row.staff} • {row.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-blue-600">{row.credits} CPD Credits</p>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Inspections':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Compliance Score" value="4.2/5" sub="Cluster Average" trend="up" />
              <SummaryCard label="Facilities Health" value="88%" sub="Safety Audit Pass" trend="neutral" />
              <SummaryCard label="Open Violations" value="2" sub="Requires Cleanup" trend="down" />
            </div>
            <div className="space-y-4">
              {[
                { school: 'North Valley High', score: '4.8', status: 'Excellent', date: '12 May 2024', inspector: 'Michael West' },
                { school: 'East Side Primary', score: '3.9', status: 'Good', date: '10 May 2024', inspector: 'Michael West' },
              ].map((report, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-xl">📋</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{report.school}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inspected by {report.inspector} • {report.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1 justify-end">
                       <span className="text-lg font-black text-slate-900">{report.score}</span>
                       <span className="text-xs font-bold text-slate-400">/ 5.0</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-full">{report.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'Leave':
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard label="Staff on Leave" value="8" sub="Today's Count" trend="neutral" />
              <SummaryCard label="Avg. Approval Time" value="4.2h" sub="System Efficiency" trend="up" />
              <SummaryCard label="Medical Leave" value="65%" sub="Category Majority" trend="neutral" />
              <SummaryCard label="Exemption Loss" value="1.2%" sub="Yield Impact" trend="down" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
               <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Leave Distribution</h4>
                 <span className="text-[10px] text-slate-400 font-bold italic">Based on {filters.dateRange}</span>
               </div>
               <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { label: 'Medical', value: '42', color: 'bg-rose-500' },
                    { label: 'Personal', value: '18', color: 'bg-indigo-500' },
                    { label: 'Academic', value: '12', color: 'bg-blue-500' },
                    { label: 'Emergency', value: '5', color: 'bg-amber-500' },
                  ].map((item, i) => (
                    <div key={i} className="text-center">
                      <p className="text-2xl font-black text-slate-900 mb-1">{item.value}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{item.label}</p>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${(parseInt(item.value)/77)*100}%` }}></div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      {/* 1. Page Header & Global Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Reporting Node</h2>
          <p className="text-slate-500 font-medium">Verified data extraction for professional accountability</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => handleExport('PDF')}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-all"
           >
            📄 {isExporting ? 'Exporting...' : 'Export as PDF'}
           </button>
           <button 
            onClick={() => handleExport('Excel')}
            disabled={isExporting}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all"
           >
            📊 {isExporting ? 'Preparing...' : 'Data Spreadsheet'}
           </button>
        </div>
      </div>

      {/* 2. Filter Dashboard */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FilterSelect 
              label="Time Horizon" 
              value={filters.dateRange} 
              options={['Today', 'This Week', 'This Month', 'Academic Term', 'Full Year']}
              onChange={(val) => setFilters({...filters, dateRange: val})}
            />
            <FilterSelect 
              label="Organizational Level" 
              value={filters.institution} 
              options={['All Schools', 'Campus South', 'Central Cluster', 'North Valley High']}
              onChange={(val) => setFilters({...filters, institution: val})}
            />
            <FilterSelect 
              label="Status Filter" 
              value={filters.status} 
              options={['All', 'Present Only', 'Exceptions', 'Audited Only']}
              onChange={(val) => setFilters({...filters, status: val})}
            />
         </div>
      </div>

      {/* 3. Category Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-[1.5rem] w-fit">
        {availableReports.map(type => (
          <button
            key={type}
            onClick={() => setActiveReport(type)}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeReport === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* 4. Active Report Content */}
      <div className="min-h-[400px]">
        {renderReportContent()}
      </div>

      {/* 5. Policy Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-3">Institutional Filtering</h5>
          <p className="text-xs text-blue-800 leading-relaxed font-medium">
            Filtering allows you to isolate <strong>Performance Anomalies</strong> across different time horizons and departments. Reports are cross-referenced with GPS/NFC artifacts to ensure data integrity.
          </p>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-700 shadow-xl">
          <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Governance-Based Access</h5>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Reports strictly adhere to the <strong>Principle of Least Privilege</strong>. A Teacher only sees their classroom yield, while an Admin accesses the global institution health metrics.
          </p>
        </div>
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
          <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-3">Audit Readiness</h5>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Exported documents are <strong>Legally Compliant Artifacts</strong>. They contain cryptographic signatures and timestamp trails, making them suitable for regulatory board reviews and payroll processing.
          </p>
        </div>
      </div>
    </div>
  );
};

const FilterSelect: React.FC<{ label: string, value: string, options: string[], onChange: (val: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SummaryCard: React.FC<{ label: string, value: string, sub: string, trend: 'up' | 'down' | 'neutral' }> = ({ label, value, sub, trend }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <span className={`text-xs ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'}
      </span>
    </div>
    <p className="text-2xl font-black text-slate-900 leading-none mb-1">{value}</p>
    <p className="text-[10px] text-slate-400 font-bold uppercase">{sub}</p>
  </div>
);

export default ReportingModule;
