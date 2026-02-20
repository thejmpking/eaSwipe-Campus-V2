import React, { useState, useMemo } from 'react';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface IDCardManagerProps {
  users: UserIdentity[];
  onSync?: () => void;
}

type IDStatus = 'All' | 'Active' | 'Expired' | 'Upcoming';

const IDCardManager: React.FC<IDCardManagerProps> = ({ users, onSync }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<IDStatus>('All');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  /**
   * SOVEREIGN TEMPORAL PARSING
   * Parses the "experience" string artifact into actionable date objects
   */
  const getIDMetadata = (experience?: string) => {
    // Default fallback for unconfigured artifacts
    const defaultRes = { status: 'Active', issue: '', expiry: '' };
    if (!experience || !experience.includes('|')) return defaultRes;

    try {
      // Format expected: "Issued: YYYY-MM-DD | Exp: YYYY-MM-DD"
      const parts = experience.split('|');
      const issue = parts[0].split(':')[1]?.trim() || '';
      const expiry = parts[1].split(':')[1]?.trim() || '';
      
      if (!expiry) return defaultRes;

      const expiryDate = new Date(expiry);
      expiryDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      thirtyDaysFromNow.setHours(23, 59, 59, 999);

      if (expiryDate < today) return { status: 'Expired', issue, expiry };
      if (expiryDate <= thirtyDaysFromNow) return { status: 'Upcoming', issue, expiry };
      return { status: 'Active', issue, expiry };
    } catch (e) {
      return defaultRes;
    }
  };

  // Pre-calculate counts for UI chips
  const counts = useMemo(() => {
    const initial = { All: users.length, Active: 0, Upcoming: 0, Expired: 0 };
    users.forEach(u => {
      const meta = getIDMetadata(u.experience);
      if (meta.status === 'Active') initial.Active++;
      else if (meta.status === 'Upcoming') initial.Upcoming++;
      else if (meta.status === 'Expired') initial.Expired++;
    });
    return initial;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                           u.id.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'All') return true;
      const meta = getIDMetadata(u.experience);
      return meta.status === filter;
    });
  }, [users, search, filter]);

  const handleUpdateDates = async (userId: string, issueDate: string, expiryDate: string) => {
    if (!issueDate || !expiryDate) {
      alert("Temporal Error: Both Issue and Expiry nodes are required for verification.");
      return;
    }
    setIsProcessing(userId);
    const res = await dataService.syncRecord('users', {
      id: userId,
      experience: `Issued: ${issueDate} | Exp: ${expiryDate}`
    });
    if (res.status === 'success') {
      onSync?.();
    } else {
      alert(`Sync Failure: ${res.message}`);
    }
    setIsProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Expired': return <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-1.5 shadow-sm">🚫 Expired</span>;
      case 'Upcoming': return <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1.5 shadow-sm">⚠️ Renewal</span>;
      default: return <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5 shadow-sm">✅ Active</span>;
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 px-1 md:px-0 pb-20">
      {/* SEARCH & FILTER HUB - Mobile Optimized Sticky */}
      <div className="bg-white/80 backdrop-blur-xl p-4 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm space-y-6 md:space-y-8 sticky top-[60px] md:top-0 z-30">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search identity ledger (ID or name)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold outline-none focus:ring-8 focus:ring-blue-500/5 focus:bg-white transition-all shadow-inner"
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-30 text-2xl">🔍</span>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors">✕</button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
           {[
             { id: 'All', label: 'All Artifacts' },
             { id: 'Active', label: 'Active Only' },
             { id: 'Upcoming', label: 'Due for Renewal' },
             { id: 'Expired', label: 'Expired Ledger' }
           ].map(t => {
             const isActive = filter === t.id;
             const count = (counts as any)[t.id];
             return (
               <button
                 key={t.id}
                 onClick={() => setFilter(t.id as IDStatus)}
                 className={`px-5 md:px-8 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${
                   isActive 
                   ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]' 
                   : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-transparent'
                 }`}
               >
                 <span>{t.label}</span>
                 <span className={`px-2 py-0.5 rounded-full text-[8px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
               </button>
             );
           })}
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Artifact</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Lifecycle Status</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Issue Node</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Expiry Node</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => {
                const meta = getIDMetadata(user.experience);
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-7">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-inner">
                           <img src={`https://picsum.photos/seed/${user.id}/128/128`} className="w-full h-full object-cover" alt="u" />
                        </div>
                        <div className="min-w-0">
                           <p className="text-sm md:text-base font-black text-slate-900 leading-none mb-2 uppercase truncate">{user.name}</p>
                           <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')} • {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-7 text-center">
                       {getStatusBadge(meta.status)}
                    </td>
                    <td className="px-10 py-7 text-center">
                       <input 
                        id={`issue-${user.id}`}
                        type="date" 
                        className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black outline-none focus:border-blue-500 focus:bg-white shadow-inner transition-all" 
                        defaultValue={meta.issue || '2024-01-01'} 
                       />
                    </td>
                    <td className="px-10 py-7 text-center">
                       <input 
                        id={`expiry-${user.id}`}
                        type="date" 
                        className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black outline-none focus:border-blue-500 focus:bg-white shadow-inner transition-all" 
                        defaultValue={meta.expiry || '2026-12-31'} 
                       />
                    </td>
                    <td className="px-10 py-7 text-right">
                      <button 
                        onClick={() => {
                          const iss = (document.getElementById(`issue-${user.id}`) as HTMLInputElement)?.value;
                          const exp = (document.getElementById(`expiry-${user.id}`) as HTMLInputElement)?.value;
                          handleUpdateDates(user.id, iss, exp);
                        }}
                        disabled={isProcessing === user.id}
                        className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-100 flex items-center gap-2 ml-auto"
                      >
                        {isProcessing === user.id ? (
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : 'Commit Node'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE / TABLET CARD GRID VIEW */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-2">
         {filteredUsers.map(user => {
           const meta = getIDMetadata(user.experience);
           const isCurrentProcessing = isProcessing === user.id;
           
           return (
             <div key={user.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 transition-all hover:shadow-xl">
                <div className="flex items-center justify-between gap-4">
                   <div className="flex items-center gap-4 md:gap-6 min-w-0">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.8rem] md:rounded-[2rem] bg-slate-100 overflow-hidden border-4 border-white shrink-0 shadow-xl">
                         <img src={`https://picsum.photos/seed/${user.id}/128/128`} className="w-full h-full object-cover" alt="u" />
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-base md:text-xl font-black text-slate-900 uppercase truncate leading-tight mb-1.5">{user.name}</h4>
                         <p className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest leading-none">{user.role.replace('_', ' ')}</p>
                         <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">Identity Node: #{user.id}</p>
                      </div>
                   </div>
                   <div className="shrink-0">
                      {getStatusBadge(meta.status)}
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 md:gap-5 pt-6 border-t border-slate-50">
                   <div className="space-y-2">
                      <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Issue Artifact</label>
                      <input 
                        id={`mob-issue-${user.id}`}
                        type="date" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-black outline-none focus:ring-8 focus:ring-blue-500/5 shadow-inner" 
                        defaultValue={meta.issue || '2024-01-01'} 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Expiry Artifact</label>
                      <input 
                        id={`mob-expiry-${user.id}`}
                        type="date" 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-black outline-none focus:ring-8 focus:ring-blue-500/5 shadow-inner" 
                        defaultValue={meta.expiry || '2026-12-31'} 
                      />
                   </div>
                </div>

                <button 
                  onClick={() => {
                    const iss = (document.getElementById(`mob-issue-${user.id}`) as HTMLInputElement)?.value;
                    const exp = (document.getElementById(`mob-expiry-${user.id}`) as HTMLInputElement)?.value;
                    handleUpdateDates(user.id, iss, exp);
                  }}
                  disabled={isCurrentProcessing}
                  className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
                >
                  {isCurrentProcessing ? (
                     <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        SYNCING LEDGER...
                     </>
                  ) : 'Sync Identity Artifact'}
                </button>
             </div>
           );
         })}
         
         {filteredUsers.length === 0 && (
           <div className="col-span-full py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 mx-2">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner opacity-20">🔎</div>
              <p className="text-slate-400 font-black uppercase text-[11px] tracking-[0.2em]">No matching identity artifacts found.</p>
              <button onClick={() => { setFilter('All'); setSearch(''); }} className="mt-6 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Reset Global Filters</button>
           </div>
         )}
      </div>
      
      {/* AUDIT NOTE */}
      <div className="bg-blue-50 p-8 rounded-[3rem] border border-blue-100 flex flex-col md:flex-row items-center gap-6 md:gap-10 mx-2 md:mx-0">
         <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-blue-200 flex items-center justify-center text-3xl shadow-sm shrink-0">🛡️</div>
         <div className="text-center md:text-left">
            <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-2">Temporal Integrity Protocol</h4>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">Changes committed here propagate immediately to hardware terminals. Expired artifacts will be automatically blocked by the gate handshake server even if credentials remain in-device.</p>
         </div>
      </div>
    </div>
  );
};

export default IDCardManager;