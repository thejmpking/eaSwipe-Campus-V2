
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';
import { UserIdentity } from '../App';

interface SchoolData {
  id: string;
  name: string;
  clusterId: string;
  clusterName: string;
  campusName: string;
  campusId?: string;
  headmaster: string;
  address?: string;
  strength: {
    students: number;
    teachers: number;
    staff: number;
  };
  status: 'Active' | 'Suspended' | 'Closed';
}

interface SchoolManagementProps {
  userRole: UserRole;
  userAssignment: string;
  onSelectSchool?: (schoolId: string) => void;
  onSelectCluster?: (clusterId: string) => void;
  onSelectCampus?: (campusId: string) => void;
  users?: UserIdentity[];
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ userRole, userAssignment, onSelectSchool, onSelectCluster, onSelectCampus, users = [] }) => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [availableClusters, setAvailableClusters] = useState<any[]>([]);
  const [availableCampuses, setAvailableCampuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [filter, setFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    campusId: '',
    campusName: '',
    clusterId: '',
    clusterName: '',
    headmaster: '',
    address: ''
  });

  const fetchRegistry = async () => {
    setIsLoading(true);
    try {
      const [dbSchools, dbClusters, dbCampuses] = await Promise.all([
        dataService.getSchools(),
        dataService.getClusters(),
        dataService.getCampuses()
      ]);

      if (Array.isArray(dbSchools)) {
        setSchools(dbSchools.map((s: any) => ({
          ...s,
          strength: typeof s.strength === 'string' ? JSON.parse(s.strength) : (s.strength || { students: 0, teachers: 0, staff: 0 })
        })));
      }
      setAvailableClusters(dbClusters || []);
      setAvailableCampuses(dbCampuses || []);
    } catch (e) { console.error("Cloud Registry Error", e); }
    setIsLoading(false);
  };

  useEffect(() => { fetchRegistry(); }, []);

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campusId || !formData.clusterId) {
      alert("Binding Error: Parent Campus and Cluster nodes are required.");
      return;
    }

    setIsCommitting(true);
    
    // Explicitly handle empty address as null to avoid PostgREST mapping friction
    const sanitizedAddress = formData.address?.trim() === "" ? null : formData.address?.trim();

    const newSchool = {
      id: editingSchool ? editingSchool.id : `SCH-${Math.floor(Math.random() * 900 + 100)}`,
      name: formData.name.trim(),
      campusId: formData.campusId,
      campusName: formData.campusName,
      clusterId: formData.clusterId,
      clusterName: formData.clusterName,
      headmaster: formData.headmaster,
      address: sanitizedAddress,
      strength: editingSchool ? editingSchool.strength : { students: 0, teachers: 0, staff: 0 },
      status: 'Active'
    };

    const res = await dataService.syncRecord('schools', newSchool);
    if (res.status === 'success') {
      await fetchRegistry();
      setIsProvisioning(false);
      setEditingSchool(null);
      setFormData({ name: '', campusId: '', campusName: '', clusterId: '', clusterName: '', headmaster: '', address: '' });
    } else {
      alert("Cloud Sync Failure: Please ensure the 'address' column has been added to your SQL schema.");
    }
    setIsCommitting(false);
  };

  const handleEdit = (school: SchoolData) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      campusId: school.campusId || '',
      campusName: school.campusName,
      clusterId: school.clusterId,
      clusterName: school.clusterName,
      headmaster: school.headmaster,
      address: school.address || ''
    });
    setIsProvisioning(true);
  };

  const handleDelete = async () => {
    if (!editingSchool) return;
    if (window.confirm(`PURGE CONFIRMATION: Decommission institutional node: ${editingSchool.name}?`)) {
      setIsCommitting(true);
      const res = await dataService.deleteRecord('schools', editingSchool.id);
      if (res.status === 'success') {
        await fetchRegistry();
        setIsProvisioning(false);
        setEditingSchool(null);
      }
      setIsCommitting(false);
    }
  };

  const potentialPrincipals = useMemo(() => {
    return users.filter(u => [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.CAMPUS_HEAD].includes(u.role));
  }, [users]);

  const filteredClustersForSelect = useMemo(() => {
    return availableClusters.filter(c => c.campusId === formData.campusId);
  }, [availableClusters, formData.campusId]);

  const filteredSchools = useMemo(() => {
    return schools.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || s.id.toLowerCase().includes(filter.toLowerCase()));
  }, [schools, filter]);

  if (isLoading && schools.length === 0) return <div className="p-20 text-center animate-pulse">Syncing...</div>;

  return (
    <div className="space-y-6 md:space-y-10 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Institutional Nodes</h2>
        </div>
        <button onClick={() => { setEditingSchool(null); setFormData({name:'', campusId:'', campusName:'', clusterId:'', clusterName:'', headmaster:'', address:''}); setIsProvisioning(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">➕ Provision School</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredSchools.map(school => (
          <div key={school.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm group hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start mb-6">
               <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black">{school.id}</span>
               <button onClick={() => handleEdit(school)} className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">✏️</button>
            </div>
            <button onClick={() => onSelectSchool?.(school.id)} className="text-left w-full">
              <h3 className="text-xl font-black text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">{school.name}</h3>
            </button>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
               <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Principal Authority</p>
                  <p className="text-xs font-bold text-slate-800">{school.headmaster}</p>
               </div>
               <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Jurisdiction</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{school.clusterName}</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-xl w-full rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-2xl font-black text-slate-900 mb-8">{editingSchool ? 'Modify School' : 'Provision School'}</h3>
              <form onSubmit={handleSaveSchool} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Parent Campus</label>
                    <select required value={formData.campusId} onChange={e => {
                        const c = availableCampuses.find(x => x.id === e.target.value);
                        setFormData({...formData, campusId: e.target.value, campusName: c?.name || '', clusterId: '', clusterName: ''});
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-bold">
                      <option value="">Select Campus...</option>
                      {availableCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Parent Cluster</label>
                    <select required disabled={!formData.campusId} value={formData.clusterId} onChange={e => {
                        const c = availableClusters.find(x => x.id === e.target.value);
                        setFormData({...formData, clusterId: e.target.value, clusterName: c?.name || ''});
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-bold disabled:opacity-50">
                      <option value="">Select Cluster...</option>
                      {filteredClustersForSelect.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Label</label>
                   <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold" placeholder="e.g. NORTH VALLEY HIGH" />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Address (Optional)</label>
                   <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold" placeholder="Physical location metadata" />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Principal Selection</label>
                   <select required value={formData.headmaster} onChange={e => setFormData({...formData, headmaster: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-bold appearance-none">
                     <option value="">Choose Registered Principal...</option>
                     {potentialPrincipals.map(u => (
                       <option key={u.id} value={u.name}>{u.name} ({u.id})</option>
                     ))}
                   </select>
                </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsProvisioning(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase">Discard</button>
                   <button type="submit" disabled={isCommitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Commit Registry</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default SchoolManagement;
