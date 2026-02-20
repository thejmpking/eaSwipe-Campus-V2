import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { UserIdentity } from '../App';
import { UserRole } from '../types';

interface CampusDetailsProps {
  campusId: string;
  users: UserIdentity[];
  attendanceRecords: any[];
  onBack: () => void;
  onSelectCluster?: (clusterId: string) => void;
  onSelectSchool?: (schoolId: string) => void;
}

type TabType = 'overview' | 'clusters' | 'schools';

const CampusDetails: React.FC<CampusDetailsProps> = ({ campusId, users, attendanceRecords, onBack, onSelectCluster, onSelectSchool }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [campusInfo, setCampusInfo] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [allCampuses, allClusters, allSchools] = await Promise.all([
          dataService.getCampuses(),
          dataService.getClusters(),
          dataService.getSchools()
        ]);
        const currentCampus = (allCampuses || []).find((c: any) => c.id === campusId);
        if (currentCampus) {
          setCampusInfo(currentCampus);
          setClusters((allClusters || []).filter((c: any) => c.campusId === campusId));
          setSchools((allSchools || []).filter((s: any) => s.campusId === campusId || s.campusName === currentCampus.name));
        }
      } catch (e) { console.error("Cloud Error", e); }
      setIsLoading(false);
    };
    fetchData();
  }, [campusId]);

  // JURISDICTIONAL ANALYTICS
  const analytics = useMemo(() => {
    if (!campusInfo) return { presented: 0, leave: 0, topCluster: 'N/A', students: 0, faculty: 0, rps: 0 };
    
    const today = new Date().toISOString().split('T')[0];
    const schoolNames = schools.map(s => s.name);
    const clusterNames = clusters.map(c => c.name);

    // Filter populations
    const campusStudents = users.filter(u => u.role === UserRole.STUDENT && schoolNames.includes(u.assignment));
    const campusFaculty = users.filter(u => u.role === UserRole.TEACHER && schoolNames.includes(u.assignment));
    const campusRPs = users.filter(u => u.role === UserRole.RESOURCE_PERSON && (clusterNames.includes(u.cluster || '') || u.assignment.includes(campusInfo.name)));
    
    const studentIds = campusStudents.map(u => u.id);
    const todayRecords = attendanceRecords.filter(r => r.date === today && studentIds.includes(r.userId));
    
    const presented = todayRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const leave = campusStudents.length - presented;

    // Identify Top Cluster by Student Population
    const clusterStats = clusters.map(c => ({
      name: c.name,
      count: users.filter(u => u.cluster === c.name && u.role === UserRole.STUDENT).length
    })).sort((a, b) => b.count - a.count);

    return {
      presented,
      leave,
      students: campusStudents.length,
      faculty: campusFaculty.length,
      rps: campusRPs.length,
      topCluster: clusterStats[0]?.name || 'N/A'
    };
  }, [campusInfo, schools, users, attendanceRecords, clusters]);

  if (isLoading || !campusInfo) return (
    <div className="flex flex-col items-center justify-center p-20 md:p-32 space-y-6">
      <div className="w-10 h-10 md:w-12 md:h-12 border-[4px] md:border-[6px] border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Node Metadata...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-right-5 duration-700 max-w-7xl mx-auto px-1 sm:px-0">
      {/* COMPACT MOBILE HEADER */}
      <div className="flex items-center gap-3 md:gap-8 px-2 md:px-0">
        <button onClick={onBack} className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.8rem] bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-90 shrink-0">
           <span className="text-lg md:text-2xl">←</span>
        </button>
        <div className="min-w-0">
           <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-3">
              <span className="text-[7px] md:text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 md:px-4 md:py-1.5 rounded-full uppercase tracking-widest md:tracking-[0.2em] shadow-lg shadow-blue-500/20">{campusId}</span>
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Oversite Active</span>
           </div>
           <h2 className="text-lg md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none truncate uppercase">{campusInfo.name}</h2>
        </div>
      </div>

      {/* MOBILE OPTIMIZED TABS */}
      <div className="bg-slate-200/50 p-1 md:p-2 rounded-[1.5rem] md:rounded-[2.5rem] flex gap-1 md:gap-2 w-full md:w-fit overflow-x-auto scrollbar-hide shadow-inner snap-x">
        {[
          { id: 'overview', label: 'Summary', icon: '🏛️' },
          { id: 'clusters', label: 'Clusters', icon: '📍' },
          { id: 'schools', label: 'Schools', icon: '🏫' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`whitespace-nowrap flex-1 md:flex-none px-4 md:px-10 py-2.5 md:py-4 rounded-xl md:rounded-[1.8rem] text-[8px] md:text-[10px] font-black uppercase tracking-widest md:tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 md:gap-3 snap-start ${
              activeTab === tab.id ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'
            }`}
          >
            <span className="text-sm md:text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-4 md:space-y-10 animate-in fade-in duration-500">
            {/* GRID 1: CORE STATS (8 ITEMS) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8 px-2 md:px-0">
              <StatNode label="Students" value={analytics.students} icon="🎓" />
              <StatNode label="Faculty" value={analytics.faculty} icon="👨‍🏫" />
              <StatNode label="RPs" value={analytics.rps} icon="🕵️" color="indigo" />
              <StatNode label="Clusters" value={clusters.length} icon="📍" color="blue" />
              <StatNode label="Schools" value={schools.length} icon="🏫" />
              <StatNode label="Present" value={analytics.presented} icon="✅" color="emerald" />
              <StatNode label="Leaves" value={analytics.leave} icon="🚫" color="rose" />
              <StatNode label="Yield" value={`${campusInfo.yield || 0}%`} icon="📈" />
            </div>

            {/* GRID 2: HERO CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-10 px-2 md:px-0">
               <div className="bg-[#0F172A] p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] text-white relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 p-6 md:p-10 opacity-[0.03] text-6xl md:text-[10rem] font-black -rotate-12 pointer-events-none uppercase">DIR</div>
                  <h4 className="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6 md:mb-12">Mandate</h4>
                  <div className="space-y-6 md:space-y-10 relative z-10">
                     <p className="text-xs md:text-xl font-bold text-slate-300 leading-relaxed italic opacity-90">
                       "Standardizing high-fidelity data extraction across the {campusInfo.region} jurisdiction."
                     </p>
                     <div className="pt-5 md:pt-10 border-t border-white/5 flex items-center gap-3 md:gap-6">
                        <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.8rem] bg-white border-[3px] md:border-4 border-white/10 shadow-2xl overflow-hidden shrink-0">
                           <img src={`https://picsum.photos/seed/${campusInfo.head}/128/128`} className="w-full h-full object-cover" alt="head" />
                        </div>
                        <div className="min-w-0">
                           <p className="text-[7px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Campus Head</p>
                           <p className="text-sm md:text-2xl font-black text-white leading-none truncate uppercase">{campusInfo.head}</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col justify-center gap-6 md:gap-10">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Infra Load</h4>
                    <div className="text-right">
                       <p className="text-[7px] md:text-[8px] font-black text-blue-600 uppercase tracking-widest">Top Jurisdiction</p>
                       <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase">{analytics.topCluster}</p>
                    </div>
                  </div>
                  <div className="space-y-6 md:space-y-10">
                     <ProgressBar label="Nodes" current={clusters.length} max={12} color="bg-blue-600" />
                     <ProgressBar label="Entities" current={schools.length} max={25} color="bg-indigo-600" />
                  </div>
               </div>
            </div>
          </div>
        )}
        
        {activeTab === 'clusters' && (
          <div className="bg-white rounded-[1.5rem] md:rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500 mx-2 md:mx-0">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                         <th className="px-4 md:px-12 py-4 md:py-8 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[140px]">Cluster</th>
                         <th className="px-4 md:px-12 py-4 md:py-8 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hidden sm:table-cell">Status</th>
                         <th className="px-4 md:px-12 py-4 md:py-8 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right min-w-[120px]">Auditor</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {clusters.map((cluster: any) => (
                        <tr key={cluster.id} className="hover:bg-blue-50/20 transition-all group">
                           <td className="px-4 md:px-12 py-4 md:py-7">
                              <button onClick={() => onSelectCluster?.(cluster.id)} className="text-left group/btn">
                                 <p className="text-[11px] md:text-sm font-black text-slate-800 group-hover/btn:text-blue-600 transition-colors uppercase tracking-tight truncate max-w-[100px] md:max-w-none">{cluster.name}</p>
                                 <p className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">{cluster.id}</p>
                              </button>
                           </td>
                           <td className="px-4 md:px-12 py-4 md:py-7 text-center hidden sm:table-cell">
                              <span className="px-3 md:px-4 py-1 md:py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg md:rounded-xl text-[7px] md:text-[8px] font-black uppercase tracking-widest">{cluster.status}</span>
                           </td>
                           <td className="px-4 md:px-12 py-4 md:py-7 text-right">
                              <p className="text-[10px] md:text-[11px] font-black text-slate-600 uppercase whitespace-normal sm:whitespace-nowrap ml-auto">{cluster.resourcePerson}</p>
                              <p className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">{cluster.rpId}</p>
                           </td>
                        </tr>
                      ))}
                      {clusters.length === 0 && (
                        <tr>
                           <td colSpan={3} className="py-16 md:py-20 text-center text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">No jurisdictional nodes.</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'schools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 animate-in slide-in-from-bottom-4 duration-500 px-2 md:mx-0">
             {schools.map((school: any) => (
               <div key={school.id} onClick={() => onSelectSchool?.(school.id)} className="bg-white p-5 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:border-blue-300">
                  <div className="flex items-center gap-4 md:gap-8 min-w-0">
                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.8rem] bg-slate-50 flex items-center justify-center text-xl md:text-3xl shadow-inner border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">🏫</div>
                    <div className="min-w-0">
                      <span className="text-[7px] md:text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">{school.id}</span>
                      <h4 className="text-[11px] md:text-lg font-black text-slate-900 mt-1 md:mt-4 leading-tight group-hover:text-blue-600 transition-colors uppercase line-clamp-2">{school.name}</h4>
                      <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest truncate">Head: {school.headmaster}</p>
                    </div>
                  </div>
                  <div className="w-7 h-7 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-all text-xs md:text-xl font-black shrink-0">→</div>
               </div>
             ))}
             {schools.length === 0 && (
               <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                  <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">No educational entities.</p>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

const StatNode = ({ label, value, icon, color = 'blue' }: any) => (
  <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex items-center md:items-start md:flex-col gap-3 md:gap-0 h-full">
     <div className={`w-9 h-9 md:w-14 md:h-14 rounded-lg md:rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-lg md:text-3xl border border-slate-100 transition-all ${
        color === 'blue' ? 'group-hover:bg-blue-600' : 
        color === 'rose' ? 'group-hover:bg-rose-600' :
        color === 'indigo' ? 'group-hover:bg-indigo-600' : 
        'group-hover:bg-emerald-600'
     } group-hover:text-white group-hover:shadow-xl md:mb-6 shrink-0`}>{icon}</div>
     <div className="min-w-0">
        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.15em] mb-0.5 md:mb-2 leading-none truncate">{label}</p>
        <p className="text-lg md:text-3xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
     </div>
  </div>
);

const ProgressBar = ({ label, current, max, color }: any) => (
  <div className="space-y-2 md:space-y-4">
     <div className="flex justify-between items-end px-1">
        <p className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.2em] truncate">{label}</p>
        <p className="text-[10px] md:text-sm font-black text-slate-900 shrink-0">{current} <span className="opacity-20 font-bold">/ {max}</span></p>
     </div>
     <div className="w-full h-1.5 md:h-3 bg-slate-50 border border-slate-100 rounded-full overflow-hidden p-0.5">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${Math.min((current/max)*100, 100)}%` }}></div>
     </div>
  </div>
);

export default CampusDetails;