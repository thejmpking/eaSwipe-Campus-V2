
import React, { useState, useMemo, useEffect } from 'react';
import { dataService } from '../services/dataService';

interface CampusDetailsProps {
  campusId: string;
  onBack: () => void;
  onSelectCluster?: (clusterId: string) => void;
  onSelectSchool?: (schoolId: string) => void;
}

type TabType = 'overview' | 'clusters' | 'schools' | 'analytics';

const CampusDetails: React.FC<CampusDetailsProps> = ({ campusId, onBack, onSelectCluster, onSelectSchool }) => {
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
      } catch (e) { console.error("Cloud Node Fetch Error", e); }
      setIsLoading(false);
    };
    fetchData();
  }, [campusId]);

  if (isLoading || !campusInfo) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolving Cloud Jurisdictions...</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <SummaryCard label="Attendance Yield" value={`${campusInfo.yield || 0}%`} trend="up" icon="📈" />
              <SummaryCard label="Node Status" value={campusInfo.status} trend="neutral" icon="🕒" />
              <div className="sm:col-span-2 lg:col-span-1">
                <SummaryCard label="Compliance" value="99.1%" trend="up" icon="🛡️" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
               <div className="bg-slate-50 p-6 md:p-10 rounded-[2rem] border border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Director's Regional Mandate</h4>
                  <div className="space-y-6">
                     <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                       "The {campusInfo.region} core is focusing on high-fidelity synchronization. Data integrity is the foundation of our sovereign educational protocol."
                     </p>
                     <div className="pt-6 border-t border-slate-200 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-sm overflow-hidden shrink-0">
                           <img src={`https://picsum.photos/seed/${campusInfo.head}/128/128`} alt="Head" className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Campus Head</p>
                           <p className="text-base md:text-lg font-black text-slate-900 leading-none">{campusInfo.head}</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-6 md:p-10 rounded-[2rem] border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Live Capacity Artifacts</h4>
                  <div className="space-y-8">
                     <CapacityNode label="Mapped Clusters" current={clusters.length} max={10} color="bg-blue-600" />
                     <CapacityNode label="Active Institutions" current={schools.length} max={20} color="bg-indigo-600" />
                  </div>
               </div>
            </div>
          </div>
        );
      case 'clusters':
        return (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                         <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jurisdiction</th>
                         <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                         <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">RP Identity</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {clusters.map((cluster: any) => (
                        <tr key={cluster.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-10 py-6">
                              <button onClick={() => onSelectCluster?.(cluster.id)} className="text-left group">
                                 <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">{cluster.name}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{cluster.id}</p>
                              </button>
                           </td>
                           <td className="px-10 py-6 text-center">
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase">{cluster.status}</span>
                           </td>
                           <td className="px-10 py-6 text-right">
                              <p className="text-xs font-black text-slate-600">{cluster.resourcePerson}</p>
                           </td>
                        </tr>
                      ))}
                      {clusters.length === 0 && (
                        <tr><td colSpan={3} className="p-20 text-center text-slate-400 text-[10px] font-black uppercase">No clusters registered to this node.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        );
      case 'schools':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
             {schools.map((school: any) => (
               <div key={school.id} onClick={() => onSelectSchool?.(school.id)} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer">
                  <div>
                    <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{school.id}</span>
                    <h4 className="text-lg font-black text-slate-900 mt-2 leading-tight">{school.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Head: {school.headmaster}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">→</div>
               </div>
             ))}
             {schools.length === 0 && (
                <div className="col-span-full p-20 text-center text-slate-400 uppercase text-[10px] font-black">No active institutions mapped.</div>
             )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 animate-in fade-in slide-in-from-right-10 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
         <div className="flex items-center gap-4 md:gap-8">
            <button onClick={onBack} className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">←</button>
            <div className="min-w-0">
               <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-lg uppercase tracking-widest">{campusId}</span>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Supabase Node Connected</span>
               </div>
               <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none truncate">{campusInfo.name}</h2>
            </div>
         </div>
      </div>

      <div className="flex gap-2 bg-slate-200/50 p-1.5 md:p-2 rounded-2xl md:rounded-3xl w-full md:w-fit overflow-x-auto scrollbar-hide">
        {[
          { id: 'overview', label: 'Summary', icon: '🏛️' },
          { id: 'clusters', label: 'Jurisdictions', icon: '📍' },
          { id: 'schools', label: 'Institutions', icon: '🏫' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`whitespace-nowrap px-8 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 md:gap-3 ${
              activeTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="text-base md:text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string, value: string, trend: 'up' | 'down' | 'neutral', icon: string }> = ({ label, value, trend, icon }) => (
  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
     <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors mb-6">{icon}</div>
     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
  </div>
);

const CapacityNode: React.FC<{ label: string, current: number, max: number, color: string }> = ({ label, current, max, color }) => (
  <div className="space-y-3">
     <div className="flex justify-between items-end">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-[10px] font-black text-slate-900">{current} <span className="opacity-40">/ {max}</span></p>
     </div>
     <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min((current/max)*100, 100)}%` }}></div>
     </div>
  </div>
);

export default CampusDetails;
