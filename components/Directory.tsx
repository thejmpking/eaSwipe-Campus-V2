import React, { useState, useMemo, useEffect } from 'react';
import { dataService } from '../services/dataService';

interface CampusData {
  id: string;
  name: string;
  head: string;
  region: string;
  clusters: number;
  schools: number;
  students: number;
  staff: number;
  status: 'Active' | 'Deactivated';
  yield: number;
}

interface DirectoryProps {
  onSelectCampus?: (id: string) => void;
}

const Directory: React.FC<DirectoryProps> = ({ onSelectCampus }) => {
  const [campuses, setCampuses] = useState<CampusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCampus, setEditingCampus] = useState<CampusData | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const fetchCampuses = async () => {
    setIsLoading(true);
    const db = await dataService.getCampuses();
    setCampuses(db || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchCampuses(); }, []);

  const [campusForm, setCampusForm] = useState({ name: '', region: '', head: '' });

  const handleSaveCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCommitting(true);
    const targetId = editingCampus ? editingCampus.id : `C-00${campuses.length + 1}`;
    const newCampus: CampusData = {
      id: targetId,
      name: campusForm.name,
      region: campusForm.region,
      head: campusForm.head,
      clusters: editingCampus?.clusters || 0,
      schools: editingCampus?.schools || 0,
      students: editingCampus?.students || 0,
      staff: editingCampus?.staff || 0,
      status: 'Active',
      yield: editingCampus?.yield || 0
    };

    const result = await dataService.syncRecord('campuses', newCampus);
    if (result.status === 'success') {
      await fetchCampuses();
      setIsAdding(false);
      setEditingCampus(null);
    }
    setIsCommitting(false);
  };

  const handleDeleteCampus = async (id: string, name: string) => {
    if (window.confirm(`PURGE CONFIRMATION: Permanently decommission "${name}"? This will dissolve all child jurisdictional bindings.`)) {
      setIsCommitting(true);
      const res = await dataService.deleteRecord('campuses', id);
      if (res.status === 'success') {
        await fetchCampuses();
      } else {
        alert("Purge Failure: Could not decommission campus node.");
      }
      setIsCommitting(false);
    }
  };

  if (isLoading && campuses.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Querying Hubs...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-10 pb-24 max-w-7xl mx-auto px-1">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">Campus Hubs</h2>
          <p className="text-slate-400 font-bold mt-2 uppercase text-[9px] md:text-[10px] tracking-[0.2em]">Institutional Directory</p>
        </div>
        <button 
          onClick={() => { setEditingCampus(null); setCampusForm({name:'', region:'', head:''}); setIsAdding(true); }} 
          className="bg-blue-600 text-white px-6 md:px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full sm:w-auto"
        >
          Provision Hub
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {campuses.map(campus => (
          <div key={campus.id} className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 p-6 md:p-10 flex flex-col group hover:shadow-xl hover:border-blue-100 transition-all">
            <div className="flex justify-between items-start mb-6">
               <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest">{campus.id}</span>
               <div className="flex gap-2">
                  <button onClick={() => { setEditingCampus(campus); setCampusForm({name:campus.name, region:campus.region, head:campus.head}); setIsAdding(true); }} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm">✏️</button>
                  <button onClick={() => handleDeleteCampus(campus.id, campus.name)} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm">🗑️</button>
               </div>
            </div>
            <button onClick={() => onSelectCampus?.(campus.id)} className="text-left group/title">
              <h3 className="text-xl md:text-3xl font-black text-slate-900 mb-1 group-hover/title:text-blue-600 transition-colors uppercase leading-tight tracking-tight">{campus.name}</h3>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{campus.region} Jurisdiction</p>
            </button>
            <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
               <div className="min-w-0 pr-4">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Node Authority</p>
                  <p className="text-xs font-bold text-slate-800 truncate uppercase">{campus.head}</p>
               </div>
               <button onClick={() => onSelectCampus?.(campus.id)} className="shrink-0 flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:translate-x-1 transition-transform">
                  Oversight <span>→</span>
               </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-8 md:p-10 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{editingCampus ? 'Modify Hub' : 'Provision Hub'}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Writing to Cloud Registry</p>
                 </div>
                 <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">✕</button>
              </div>
              <form onSubmit={handleSaveCampus} className="space-y-5">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campus Name</label>
                    <input type="text" required value={campusForm.name} onChange={e => setCampusForm({...campusForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="e.g. THIBYAN SOUTH" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Region</label>
                    <input type="text" required value={campusForm.region} onChange={e => setCampusForm({...campusForm, region: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="e.g. Coastal District" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Director (Identity)</label>
                    <input type="text" required value={campusForm.head} onChange={e => setCampusForm({...campusForm, head: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="e.g. Dr. Salman" />
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3 pt-6">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Discard</button>
                    <button type="submit" disabled={isCommitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                      {isCommitting ? 'Syncing...' : 'Commit Hub'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Directory;