
import React, { useState, useMemo, useEffect } from 'react';
import { dataService } from '../services/dataService';

interface RegistrySetupProps {
  type: 'departments' | 'designations' | 'classes';
  userAssignment?: string;
  isGlobalAdmin?: boolean;
}

const RegistrySetup: React.FC<RegistrySetupProps> = ({ type, userAssignment = 'Global Root', isGlobalAdmin = false }) => {
  const [search, setSearch] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [managingItem, setManagingItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  
  const [items, setItems] = useState<any[]>([]);

  const fetchItems = async () => {
    setIsLoading(true);
    const results = await dataService.getRecords(type);
    if (Array.isArray(results)) {
      setItems(results.map(item => ({
        ...item,
        classes: typeof item.classes === 'string' ? JSON.parse(item.classes) : (item.classes || []),
        grades: typeof item.grades === 'string' ? JSON.parse(item.grades) : (item.grades || [])
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchItems(); }, [type]);

  const filteredItems = useMemo(() => {
    return items.filter(i => (isGlobalAdmin || i.school === userAssignment) && i.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, isGlobalAdmin, userAssignment, search]);

  const [formData, setFormData] = useState({ name: '', head: '' });

  const handleOpenAdd = () => {
    setFormData({ name: '', head: '' });
    setIsAddingItem(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCommitting(true);
    const artifactId = `${type.charAt(0).toUpperCase()}-NEW-${Date.now().toString().slice(-6)}`;
    
    let newRecord: any = { 
      id: artifactId, 
      name: formData.name, 
      school: userAssignment,
      status: 'Active' 
    };

    if (type === 'departments') {
      newRecord = { ...newRecord, head: formData.head, staff: 0, classes: [] };
    } else if (type === 'classes') {
      newRecord = { ...newRecord, dept_id: 'D-GEN', dept_name: 'General', total_students: 0, grades: ['A'] };
    }
    
    const res = await dataService.syncRecord(type, newRecord);
    if (res.status === 'success') {
      await fetchItems();
      setIsAddingItem(false);
    }
    setIsCommitting(false);
  };

  const handleManage = (item: any) => {
    setManagingItem(item);
  };

  const handleUpdateManagedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingItem) return;
    setIsCommitting(true);
    
    const dataToSync = {
      ...managingItem,
      classes: Array.isArray(managingItem.classes) ? JSON.stringify(managingItem.classes) : managingItem.classes,
      grades: Array.isArray(managingItem.grades) ? JSON.stringify(managingItem.grades) : managingItem.grades
    };

    const res = await dataService.syncRecord(type, dataToSync);
    if (res.status === 'success') {
      await fetchItems();
      setManagingItem(null);
    }
    setIsCommitting(false);
  };

  if (isLoading && items.length === 0) return <div className="p-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry Fabric...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none capitalize">{type} Setup</h2>
          <p className="text-slate-500 font-medium mt-3">Node Authority: <span className="text-blue-600 font-black">{userAssignment}</span></p>
        </div>
        <div className="flex gap-3">
           <input type="text" placeholder="Filter jurisdiction..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold outline-none shadow-sm" />
           <button onClick={handleOpenAdd} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">➕ Provision {type.slice(0, -1)}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredItems.map((item: any) => (
          <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {type === 'departments' ? '🏢' : '📚'}
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">{item.id}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">{item.name}</h3>
            <p className="text-[10px] text-blue-600 font-black uppercase mb-4 tracking-widest">Jurisdiction: {item.school}</p>
            
            <div className="flex items-center gap-4 mt-6">
               <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Sub-Units</p>
                  <p className="text-xs font-black text-slate-700">{type === 'departments' ? (item.classes?.length || 0) : (item.grades?.length || 0)} Linked</p>
               </div>
               <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Capacity</p>
                  <p className="text-xs font-black text-slate-700">{type === 'departments' ? item.staff : item.total_students} Registered</p>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex gap-3">
               <button 
                onClick={() => handleManage(item)}
                className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-colors active:scale-95"
               >
                 Manage Unit
               </button>
               <button className="px-5 py-4 bg-slate-100 text-slate-400 rounded-xl hover:text-rose-500 transition-colors">🗑️</button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active nodes in this jurisdiction.</p>
          </div>
        )}
      </div>

      {isAddingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
           <div className="bg-white max-w-xl w-full rounded-[4.5rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Provision {type.slice(0, -1)}</h3>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mb-10">Mandatory Binding to {userAssignment}</p>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Institutional Label</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" placeholder="e.g. Science Wing A" />
                 </div>
                 {type === 'departments' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Assigned Unit Head</label>
                       <input type="text" value={formData.head} onChange={e => setFormData({...formData, head: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" placeholder="e.g. Dr. Salman" />
                    </div>
                 )}
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAddingItem(false)} className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                    <button type="submit" disabled={isCommitting} className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700">
                      {isCommitting ? 'Committing...' : 'Commit to Node'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {managingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
           <div className="bg-white max-w-2xl w-full rounded-[4rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex justify-between items-start mb-10">
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Manage: {managingItem.name}</h3>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Unit Artifact {managingItem.id}</p>
                 </div>
                 <button onClick={() => setManagingItem(null)} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-2xl text-slate-400 transition-colors">✕</button>
              </div>

              <form onSubmit={handleUpdateManagedItem} className="space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Label Identity</label>
                       <input 
                         type="text" 
                         value={managingItem.name} 
                         onChange={e => setManagingItem({...managingItem, name: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Sovereign School</label>
                       <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm font-black text-slate-500 cursor-not-allowed">
                          {managingItem.school}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">Mapping Attributes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Linked Entities</p>
                          <div className="space-y-2">
                             {(type === 'departments' ? managingItem.classes : managingItem.grades)?.map((sub: string) => (
                               <div key={sub} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                  <span className="text-xs font-black text-slate-700">{sub}</span>
                                  <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">Active</span>
                               </div>
                             ))}
                          </div>
                          <button type="button" className="w-full mt-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black text-slate-400 uppercase hover:border-blue-400 hover:text-blue-600 transition-all">+ Add Sub-Artifact</button>
                       </div>

                       <div className="space-y-4">
                          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                             <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Operational State</p>
                             <div className="flex items-center justify-between pt-2">
                                <span className="text-sm font-black text-slate-800">Status: {managingItem.status}</span>
                                <button type="button" className="text-[9px] font-black text-emerald-600 uppercase underline">Change</button>
                             </div>
                          </div>
                          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                             <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Assigned Head</p>
                             <p className="text-sm font-black text-slate-800 pt-2">{managingItem.head || managingItem.dept_name || 'Unassigned'}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-6 border-t border-slate-50">
                    <button type="button" onClick={() => setManagingItem(null)} className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                    <button type="submit" disabled={isCommitting} className="flex-1 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">Propagate Changes</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default RegistrySetup;
