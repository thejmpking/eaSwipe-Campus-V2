
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
  const [searchQuery, setSearchQuery] = useState('');

  const [campusForm, setCampusForm] = useState({ name: '', region: '', head: '' });

  const fetchCampuses = async () => {
    setIsLoading(true);
    const db = await dataService.getCampuses();
    setCampuses(db || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchCampuses(); }, []);

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

  if (isLoading && campuses.length === 0) return <div className="p-20 text-center animate-pulse">Syncing...</div>;

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <h2 className="text-3xl font-semibold text-slate-900 tracking-tight leading-none">Institutional Directory</h2>
        <button onClick={() => { setEditingCampus(null); setCampusForm({name:'', region:'', head:''}); setIsAdding(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-[11px] uppercase shadow-lg">Provision New Hub</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {campuses.map(campus => (
          <div key={campus.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col group">
            <div className="flex justify-between items-start mb-6">
               <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[9px] font-semibold">{campus.id}</span>
               <button onClick={() => { setEditingCampus(campus); setCampusForm({name:campus.name, region:campus.region, head:campus.head}); setIsAdding(true); }} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">✏️</button>
            </div>
            <button onClick={() => onSelectCampus?.(campus.id)} className="text-left">
              <h3 className="text-2xl font-semibold text-blue-600 mb-2">{campus.name}</h3>
            </button>
            <p className="text-[10px] font-black text-slate-400 uppercase">{campus.region} Jurisdiction</p>
            <div className="mt-auto pt-8 border-t border-slate-50 flex justify-between items-center">
               <p className="text-xs font-semibold text-slate-800">Head: {campus.head}</p>
               <button onClick={() => onSelectCampus?.(campus.id)} className="text-[9px] font-black text-blue-600 uppercase">Oversight →</button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-md w-full rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-2xl font-semibold text-slate-900 mb-6">{editingCampus ? 'Update Hub' : 'Provision Hub'}</h3>
              <form onSubmit={handleSaveCampus} className="space-y-5">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Campus Name</label>
                    <input type="text" required value={campusForm.name} onChange={e => setCampusForm({...campusForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Region</label>
                    <input type="text" required value={campusForm.region} onChange={e => setCampusForm({...campusForm, region: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1">Director</label>
                    <input type="text" required value={campusForm.head} onChange={e => setCampusForm({...campusForm, head: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" />
                 </div>
                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black text-[10px] uppercase">Discard</button>
                    <button type="submit" disabled={isCommitting} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl">Commit</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Directory;
