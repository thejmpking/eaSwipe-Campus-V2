import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { UserRole } from '../types';

interface ClusterData {
  id: string;
  name: string;
  campusId: string;
  campusName: string;
  resourcePerson: string;
  rpId: string;
  status: 'Active' | 'Under Audit' | 'Inactive';
}

interface CampusSnapshot {
  id: string;
  name: string;
}

interface RPSnapshot {
  id: string;
  name: string;
}

interface ClusterManagementProps {
  onSelectCluster?: (id: string) => void;
  onSelectFaculty?: (facultyId: string) => void;
  onSyncRegistry?: () => void;
}

const ClusterManagement: React.FC<ClusterManagementProps> = ({ onSelectCluster, onSelectFaculty, onSyncRegistry }) => {
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [availableCampuses, setAvailableCampuses] = useState<CampusSnapshot[]>([]);
  const [availableRPs, setAvailableRPs] = useState<RPSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterData | null>(null);
  const [expandedCampuses, setExpandedCampuses] = useState<Set<string>>(new Set());
  const [clusterSearchQuery, setClusterSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    campusName: '',
    campusId: '',
    resourcePerson: '',
    rpId: ''
  });

  const fetchRegistry = async () => {
    setIsLoading(true);
    try {
      const [dbClusters, dbCampuses, dbUsers] = await Promise.all([
        dataService.getClusters(),
        dataService.getCampuses(),
        dataService.getUsers()
      ]);

      if (dbCampuses && Array.isArray(dbCampuses)) {
        setAvailableCampuses(dbCampuses.map(c => ({ id: c.id, name: c.name })));
      }

      if (dbUsers && Array.isArray(dbUsers)) {
        const rps = dbUsers
          .filter((u: any) => u.role === UserRole.RESOURCE_PERSON)
          .map((u: any) => ({ id: u.id, name: u.name }));
        setAvailableRPs(rps);
      }

      if (dbClusters && Array.isArray(dbClusters)) {
        setClusters(dbClusters);
        const names = new Set(dbClusters.map(c => c.campusName));
        setExpandedCampuses(names);
      }
    } catch (e) {
      console.error("SQL Fetch Error", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const handleSaveCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.campusId) {
      alert("Binding Error: Parent Campus Node is required.");
      return;
    }
    if (!formData.name.trim()) {
      alert("Binding Error: Cluster Label is required.");
      return;
    }

    setIsCommitting(true);
    const targetCluster: ClusterData = {
      id: editingCluster ? editingCluster.id : `CL-${Math.floor(Math.random() * 900 + 400)}`,
      name: formData.name.trim(),
      campusId: formData.campusId,
      campusName: formData.campusName,
      resourcePerson: formData.resourcePerson || 'Unassigned',
      rpId: formData.rpId || 'NONE',
      status: 'Active'
    };

    try {
      const res = await dataService.syncRecord('clusters', targetCluster);
      
      if (res.status === 'success') {
        if (targetCluster.rpId && targetCluster.rpId !== 'NONE' && targetCluster.rpId !== 'Unassigned') {
          await dataService.syncRecord('users', {
            id: targetCluster.rpId,
            cluster: targetCluster.name
          });
        }

        await fetchRegistry();
        
        if (onSyncRegistry) {
          onSyncRegistry();
        }
        
        setIsProvisioning(false);
        setEditingCluster(null);
        setFormData({ name: '', campusId: '', campusName: '', resourcePerson: '', rpId: '' });
      } else {
        alert("SQL Sync Error: Registry handshake failed.");
      }
    } catch (err) {
      console.error("Propagation Error", err);
      alert("Sync Error: Master Registry connection failed.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDeleteCluster = async () => {
    if (!editingCluster) return;
    if (window.confirm(`CONFIRM: Decommission ${editingCluster.name}?`)) {
      setIsCommitting(true);
      const res = await dataService.deleteRecord('clusters', editingCluster.id);
      if (res.status === 'success') {
        await fetchRegistry();
        if (onSyncRegistry) onSyncRegistry();
        setIsProvisioning(false);
        setEditingCluster(null);
      }
      setIsCommitting(false);
    }
  };

  const handleCampusChange = (id: string) => {
    const campus = availableCampuses.find(c => c.id === id);
    if (campus) {
      setFormData({ ...formData, campusId: id, campusName: campus.name });
    } else {
      setFormData({ ...formData, campusId: '', campusName: '' });
    }
  };

  const handleRPChange = (id: string) => {
    const rp = availableRPs.find(r => r.id === id);
    if (rp) {
      setFormData({ ...formData, rpId: id, resourcePerson: rp.name });
    } else {
      setFormData({ ...formData, rpId: '', resourcePerson: '' });
    }
  };

  const campusGroups = useMemo(() => {
    return Array.from(new Set<string>(clusters.map(c => c.campusName))).sort();
  }, [clusters]);

  const filteredClusters = clusters.filter(c => 
    c.name.toLowerCase().includes(clusterSearchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(clusterSearchQuery.toLowerCase()) ||
    c.resourcePerson.toLowerCase().includes(clusterSearchQuery.toLowerCase())
  );

  if (isLoading && clusters.length === 0) {
    return (
      <div className="p-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Accessing Node Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20 max-w-7xl mx-auto px-1">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight leading-none uppercase">Cluster Jurisdictions</h2>
          <p className="text-slate-500 font-medium mt-2 md:mt-3 uppercase text-[9px] md:text-[10px] tracking-widest opacity-60">Master SQL Registry View</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <input 
              type="text" 
              placeholder="Search Clusters..." 
              value={clusterSearchQuery}
              onChange={(e) => setClusterSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          <button 
            onClick={() => { 
              setEditingCluster(null); 
              setFormData({
                name:'', 
                campusId: '', 
                campusName: '', 
                resourcePerson: '', 
                rpId: ''
              }); 
              setIsProvisioning(true); 
            }}
            className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-semibold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 shrink-0"
          >
            ➕ Provision Cluster
          </button>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {campusGroups.length > 0 ? campusGroups.map(campus => {
          const clustersInCampus = filteredClusters.filter(c => c.campusName === campus);
          if (clustersInCampus.length === 0) return null;
          const isExpanded = expandedCampuses.has(campus);

          return (
            <div key={campus} className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
              <button 
                onClick={() => {
                  const next = new Set(expandedCampuses);
                  if (next.has(campus)) next.delete(campus); else next.add(campus);
                  setExpandedCampuses(next);
                }}
                className={`w-full flex items-center justify-between p-5 md:p-8 text-left transition-colors hover:bg-slate-50/50 ${isExpanded ? 'bg-slate-50/50 border-b border-slate-100' : ''}`}
              >
                <div className="flex items-center gap-4 md:gap-6">
                   <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl transition-all ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-400'}`}>
                      🏙️
                   </div>
                   <div>
                      <h3 className="text-base md:text-xl font-semibold text-slate-900 tracking-tight leading-none uppercase">{campus}</h3>
                      <p className="text-[8px] md:text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em] mt-1.5 md:mt-2">
                        {clustersInCampus.length} Active Nodes
                      </p>
                   </div>
                </div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
              </button>

              {isExpanded && (
                <div className="p-4 md:p-8 animate-in slide-in-from-top-2 duration-300">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                     {clustersInCampus.map(cluster => (
                       <div key={cluster.id} className="bg-white rounded-[1.8rem] md:rounded-[2.5rem] border p-6 md:p-8 shadow-sm border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all flex flex-col">
                         <div className="mb-4 md:mb-6">
                           <span className="text-[8px] md:text-[9px] font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full uppercase">{cluster.id}</span>
                           <h3 className="text-lg md:text-2xl font-semibold text-slate-900 tracking-tight mt-3 md:mt-4 uppercase">{cluster.name}</h3>
                         </div>
                         <div className="p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100 mb-6 md:mb-8">
                            <p className="text-[7px] md:text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-2 md:mb-3">Auditor Node</p>
                            <p className="text-xs md:text-sm font-semibold text-slate-800 uppercase">{cluster.resourcePerson || 'Unassigned'}</p>
                            <p className="text-[8px] md:text-[9px] text-blue-600 font-medium uppercase tracking-widest mt-1">Resource Person Artifact</p>
                         </div>
                         <div className="mt-auto flex gap-2 md:gap-3 pt-4 md:pt-6 border-t border-slate-50">
                            <button onClick={() => onSelectCluster?.(cluster.id)} className="flex-1 py-3 md:py-3.5 bg-blue-600 text-white rounded-lg md:rounded-xl font-semibold text-[9px] md:text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Audit Hub</button>
                            <button onClick={() => { setEditingCluster(cluster); setFormData({name:cluster.name, campusId:cluster.campusId, campusName:cluster.campusName, resourcePerson:cluster.resourcePerson, rpId:cluster.rpId}); setIsProvisioning(true); }} className="px-4 md:px-5 py-3 md:py-3.5 bg-slate-100 text-slate-600 rounded-lg md:rounded-xl font-semibold text-[9px] md:text-[10px] uppercase tracking-widest">Edit</button>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">No jurisdictions found.</p>
          </div>
        )}
      </div>

      {/* PROVISION CLUSTER MODAL - TYPOGRAPHY OPTIMIZED */}
      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-xl w-full rounded-t-[2.5rem] md:rounded-[3.5rem] p-6 md:p-14 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 max-h-[96vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-8 md:mb-10 sticky top-0 bg-white z-10 py-1 md:relative md:py-0 border-b border-slate-50 md:border-none">
                 <div>
                    <h3 className="text-xl md:text-3xl font-semibold text-slate-900 tracking-tighter leading-none mb-1 md:mb-2 uppercase">
                      {editingCluster ? 'Modify Jurisdiction' : 'Provision Cluster'}
                    </h3>
                    <p className="text-slate-400 text-[8px] md:text-[10px] font-medium uppercase tracking-[0.2em]">Writing Identity Artifact to Master Ledger</p>
                 </div>
                 <button onClick={() => setIsProvisioning(false)} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center rounded-xl md:rounded-2xl text-slate-400 transition-all active:scale-90 shadow-sm shrink-0">✕</button>
              </div>

              <form onSubmit={handleSaveCluster} className="space-y-6 md:space-y-8 pb-10 md:pb-0">
                <div className="space-y-2">
                   <label className="text-[9px] md:text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Parent Campus Node <span className="text-rose-500">*</span></label>
                   <div className="relative">
                      <select 
                        required 
                        value={formData.campusId} 
                        onChange={e => handleCampusChange(e.target.value)} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20 shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="">Select Mandatory Campus...</option>
                        {availableCampuses.map(campus => (
                          <option key={campus.id} value={campus.id}>{campus.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">▼</span>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] md:text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Cluster Label <span className="text-rose-500">*</span></label>
                   <input 
                      type="text" 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20 shadow-inner placeholder:text-slate-300" 
                      placeholder="e.g. TIRUR CLUSTER" 
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] md:text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">Assign Auditor (Resource Person) <span className="text-slate-300 ml-1">(Optional)</span></label>
                   <div className="relative">
                      <select 
                        value={formData.rpId} 
                        onChange={e => handleRPChange(e.target.value)} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20 shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="">Select Resource Person...</option>
                        {availableRPs.map(rp => (
                          <option key={rp.id} value={rp.id}>{rp.name} ({rp.id})</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">▼</span>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 md:pt-10">
                   {editingCluster ? (
                     <button type="button" disabled={isCommitting} onClick={handleDeleteCluster} className="w-full md:flex-1 py-4 md:py-5 bg-rose-50 text-rose-600 rounded-xl md:rounded-2xl font-semibold text-[10px] md:text-xs uppercase tracking-widest border border-rose-100 active:scale-[0.98] transition-all">Decommission</button>
                   ) : (
                     <button type="button" disabled={isCommitting} onClick={() => setIsProvisioning(false)} className="w-full md:flex-1 py-4 md:py-5 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-semibold text-[10px] md:text-xs uppercase tracking-widest active:scale-[0.98] transition-all">Discard</button>
                   )}
                   <button type="submit" disabled={isCommitting} className="w-full md:flex-[2] py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-2xl font-semibold text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50">
                     {isCommitting ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           SYNCING...
                        </>
                     ) : (
                        'COMMIT TO CORE'
                     )}
                   </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClusterManagement;