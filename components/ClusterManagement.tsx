
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
}

const ClusterManagement: React.FC<ClusterManagementProps> = ({ onSelectCluster, onSelectFaculty }) => {
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
        if (dbCampuses.length > 0 && !formData.campusId) {
          setFormData(prev => ({ ...prev, campusId: dbCampuses[0].id, campusName: dbCampuses[0].name }));
        }
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
    if (!formData.campusId || !formData.rpId) {
      alert("Validation Error: Parent Campus Node and Resource Person are required.");
      return;
    }

    setIsCommitting(true);
    const targetCluster: ClusterData = {
      id: editingCluster ? editingCluster.id : `CL-${Math.floor(Math.random() * 900 + 400)}`,
      name: formData.name,
      campusId: formData.campusId,
      campusName: formData.campusName,
      resourcePerson: formData.resourcePerson,
      rpId: formData.rpId,
      status: 'Active'
    };

    const res = await dataService.syncRecord('clusters', targetCluster);
    if (res.status === 'success') {
      await fetchRegistry();
      setIsProvisioning(false);
    } else {
      alert("SQL Sync Error. Check connection.");
    }
    setIsCommitting(false);
  };

  const handleDeleteCluster = async () => {
    if (!editingCluster) return;
    if (window.confirm(`PURGE CONFIRMATION: You are about to permanently decommission the cluster jurisdiction: ${editingCluster.name}. This action is irreversible.`)) {
      setIsCommitting(true);
      const res = await dataService.deleteRecord('clusters', editingCluster.id);
      if (res.status === 'success') {
        await fetchRegistry();
        setIsProvisioning(false);
        setEditingCluster(null);
      } else {
        alert("Operation Failed. Node might be bound to active school registries.");
      }
      setIsCommitting(false);
    }
  };

  const handleCampusChange = (id: string) => {
    const campus = availableCampuses.find(c => c.id === id);
    if (campus) {
      setFormData({ ...formData, campusId: id, campusName: campus.name });
    }
  };

  const handleRPChange = (id: string) => {
    const rp = availableRPs.find(r => r.id === id);
    if (rp) {
      setFormData({ ...formData, rpId: id, resourcePerson: rp.name });
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
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying SQL Jurisdictions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Cluster Jurisdictions</h2>
          <p className="text-slate-500 font-medium mt-3 uppercase text-[10px] tracking-widest">Master SQL Registry View</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <input 
              type="text" 
              placeholder="Search Clusters..." 
              value={clusterSearchQuery}
              onChange={(e) => setClusterSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          <button 
            onClick={() => { 
              setEditingCluster(null); 
              setFormData({
                name:'', 
                campusId: availableCampuses[0]?.id || '', 
                campusName: availableCampuses[0]?.name || '', 
                resourcePerson: '', 
                rpId: ''
              }); 
              setIsProvisioning(true); 
            }}
            className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 shrink-0"
          >
            ➕ Provision Cluster
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {campusGroups.length > 0 ? campusGroups.map(campus => {
          const clustersInCampus = filteredClusters.filter(c => c.campusName === campus);
          if (clustersInCampus.length === 0) return null;
          const isExpanded = expandedCampuses.has(campus);

          return (
            <div key={campus} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
              <button 
                onClick={() => {
                  const next = new Set(expandedCampuses);
                  if (next.has(campus)) next.delete(campus); else next.add(campus);
                  setExpandedCampuses(next);
                }}
                className={`w-full flex items-center justify-between p-6 md:p-8 text-left transition-colors hover:bg-slate-50/50 ${isExpanded ? 'bg-slate-50/50 border-b border-slate-100' : ''}`}
              >
                <div className="flex items-center gap-6">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-400'}`}>
                      🏙️
                   </div>
                   <div>
                      <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">{campus}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">
                        {clustersInCampus.length} Active Nodes
                      </p>
                   </div>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
              </button>

              {isExpanded && (
                <div className="p-6 md:p-8 animate-in slide-in-from-top-2 duration-300">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {clustersInCampus.map(cluster => (
                       <div key={cluster.id} className="bg-white rounded-[2.5rem] border p-6 md:p-8 shadow-sm border-slate-100 hover:border-blue-200 hover:shadow-2xl transition-all flex flex-col">
                         <div className="mb-6">
                           <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full uppercase">{cluster.id}</span>
                           <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-4">{cluster.name}</h3>
                         </div>
                         <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 mb-8">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Auditor Node</p>
                            <p className="text-sm font-black text-slate-800">{cluster.resourcePerson}</p>
                            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-1">Authorized Resource Person</p>
                         </div>
                         <div className="mt-auto flex gap-3 pt-6 border-t border-slate-50">
                            <button onClick={() => onSelectCluster?.(cluster.id)} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Audit Hub</button>
                            <button onClick={() => { setEditingCluster(cluster); setFormData({name:cluster.name, campusId:cluster.campusId, campusName:cluster.campusName, resourcePerson:cluster.resourcePerson, rpId:cluster.rpId}); setIsProvisioning(true); }} className="px-5 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Edit</button>
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
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No jurisdictions found in live registry.</p>
          </div>
        )}
      </div>

      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-xl w-full rounded-[3.5rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{editingCluster ? 'Update Jurisdiction' : 'Provision Cluster'}</h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Writing Identity Artifact to SQL Ledger</p>
                 </div>
                 <button onClick={() => setIsProvisioning(false)} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-2xl text-slate-400 transition-colors">✕</button>
              </div>

              <form onSubmit={handleSaveCluster} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Parent Campus Node</label>
                   <select 
                      required 
                      value={formData.campusId} 
                      onChange={e => handleCampusChange(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner appearance-none cursor-pointer"
                   >
                      <option value="" disabled>Select Campus Node...</option>
                      {availableCampuses.map(campus => (
                        <option key={campus.id} value={campus.id}>{campus.name}</option>
                      ))}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cluster Label</label>
                   <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" placeholder="e.g. TIRUR CLUSTER" />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Assign Auditor (Resource Person)</label>
                   <select 
                      required 
                      value={formData.rpId} 
                      onChange={e => handleRPChange(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">Select Resource Person...</option>
                      {availableRPs.length > 0 ? (
                        availableRPs.map(rp => (
                          <option key={rp.id} value={rp.id}>{rp.name} ({rp.id})</option>
                        ))
                      ) : (
                        <option disabled>No Resource Persons found in registry</option>
                      )}
                   </select>
                </div>
                <div className="flex gap-4 pt-6">
                   {editingCluster ? (
                     <button type="button" disabled={isCommitting} onClick={handleDeleteCluster} className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase border border-rose-100">Purge Cluster</button>
                   ) : (
                     <button type="button" disabled={isCommitting} onClick={() => setIsProvisioning(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase">Discard</button>
                   )}
                   <button type="submit" disabled={isCommitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                     {isCommitting ? (
                        <>
                           <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           Cloud Syncing...
                        </>
                     ) : (
                        'Commit to MySQL'
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
