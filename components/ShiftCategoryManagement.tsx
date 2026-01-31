
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

interface ShiftCategory {
  id: string;
  label: string;
  description: string;
  colorCode: string;
  status: 'Active' | 'Inactive';
}

const ShiftCategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<ShiftCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ShiftCategory | null>(null);

  const [formData, setFormData] = useState({
    label: '',
    description: '',
    colorCode: '#2563eb'
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const db = await dataService.getRecords('shift_categories');
      setCategories(db || []);
    } catch (e) {
      console.error("Cloud Node Sync Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCommitting(true);
    const categoryData: ShiftCategory = {
      id: editingCategory ? editingCategory.id : `SC-${Math.floor(Math.random() * 900 + 100)}`,
      label: formData.label,
      description: formData.description,
      colorCode: formData.colorCode,
      status: 'Active'
    };

    const res = await dataService.syncRecord('shift_categories', categoryData);
    if (res.status === 'success') {
      await fetchCategories();
      setIsProvisioning(false);
      setEditingCategory(null);
    }
    setIsCommitting(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("PURGE ALERT: Revoking this category will affect all templates linked to it. Proceed?")) {
      await dataService.deleteRecord('shift_categories', id);
      await fetchCategories();
    }
  };

  if (isLoading && categories.length === 0) return <div className="p-20 text-center animate-pulse">Syncing Taxonomy...</div>;

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Shift Category Registry</h2>
          <p className="text-slate-500 font-medium mt-3 text-lg">Defining institutional taxonomies (Standard, Exam, Training, etc.)</p>
        </div>
        <button 
          onClick={() => { setEditingCategory(null); setFormData({label:'', description:'', colorCode:'#2563eb'}); setIsProvisioning(true); }}
          className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
        >
          ➕ Create Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-100" style={{ backgroundColor: `${cat.colorCode}10`, color: cat.colorCode }}>🏷️</div>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{cat.id}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">{cat.label}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed flex-1">{cat.description}</p>
            
            <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.colorCode }}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.status}</span>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => { setEditingCategory(cat); setFormData({label:cat.label, description:cat.description, colorCode:cat.colorCode}); setIsProvisioning(true); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline ml-2">Delete</button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
           <div className="bg-white max-w-xl w-full rounded-[4rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8">{editingCategory ? 'Update Artifact' : 'Define Category'}</h3>
              <form onSubmit={handleSave} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category Label</label>
                    <input type="text" required value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="e.g. Exam Shift" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-medium outline-none h-32 resize-none" placeholder="Operational context..." />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Visual Code (Color)</label>
                    <div className="flex items-center gap-4">
                       <input type="color" value={formData.colorCode} onChange={e => setFormData({...formData, colorCode: e.target.value})} className="w-12 h-12 rounded-xl cursor-pointer" />
                       <span className="text-xs font-mono font-black uppercase text-slate-400">{formData.colorCode}</span>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setIsProvisioning(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest">Discard</button>
                    <button type="submit" disabled={isCommitting} className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl">{isCommitting ? 'Cloud Syncing...' : 'Commit Category'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ShiftCategoryManagement;
