
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';

interface NFCCard {
  uid: string; 
  userId: string;
  userName: string;
  nfcUrl: string; // The cryptographic pointer
  role: UserRole;
  issuedAt: string;
  lastTap: string;
  lastLocation: string;
  status: 'Active' | 'Lost' | 'Revoked';
  securityScore: number; 
  totalTaps: number;
}

// Mock registry for AJAX search simulation
const MOCK_USER_REGISTRY = [
  { id: 'USR-001', name: 'Dr. Sarah Johnson', role: UserRole.ADMIN, nfcUrl: 'https://verify.edusync.io/v/adm-001' },
  { id: 'USR-002', name: 'Robert Chen', role: UserRole.CAMPUS_HEAD, nfcUrl: 'https://verify.edusync.io/v/ch-002' },
  { id: 'USR-003', name: 'Michael West', role: UserRole.RESOURCE_PERSON, nfcUrl: 'https://verify.edusync.io/v/rp-003' },
  { id: 'USR-004', name: 'Helena Smith', role: UserRole.SCHOOL_ADMIN, nfcUrl: 'https://verify.edusync.io/v/sa-004' },
  { id: 'USR-005', name: 'David Miller', role: UserRole.TEACHER, nfcUrl: 'https://verify.edusync.io/v/tea-005' },
  { id: 'USR-006', name: 'Alice Thompson', role: UserRole.STUDENT, nfcUrl: 'https://verify.edusync.io/v/std-006' },
];

const NFCCardManagement: React.FC = () => {
  const [cards, setCards] = useState<NFCCard[]>([
    { uid: 'NFC-8821-X9', userId: 'USR-005', userName: 'Prof. David Miller', nfcUrl: 'https://verify.edusync.io/v/tea-005', role: UserRole.TEACHER, issuedAt: '2023-09-01', lastTap: 'Today, 08:15 AM', lastLocation: 'North Valley High', status: 'Active', securityScore: 98, totalTaps: 1242 },
    { uid: 'NFC-1102-B2', userId: 'USR-004', userName: 'Helena Smith', nfcUrl: 'https://verify.edusync.io/v/sa-004', role: UserRole.SCHOOL_ADMIN, issuedAt: '2023-08-15', lastTap: '2h ago', lastLocation: 'Campus South Entry', status: 'Active', securityScore: 95, totalTaps: 890 },
    { uid: 'NFC-9941-K0', userId: 'USR-006', userName: 'Alice Thompson', nfcUrl: 'https://verify.edusync.io/v/std-006', role: UserRole.STUDENT, issuedAt: '2024-01-10', lastTap: 'May 12, 07:50 AM', lastLocation: 'Main Gate B', status: 'Lost', securityScore: 40, totalTaps: 412 },
  ]);

  const [isIssuing, setIsIssuing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // AJAX User Search Effect
  useEffect(() => {
    if (userSearchQuery.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    const timer = setTimeout(() => {
      const results = MOCK_USER_REGISTRY.filter(u => 
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
        u.id.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
      setUserSearchResults(results);
      setIsSearchingUsers(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const handleIssueCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const isAlreadyIssued = cards.some(c => c.userId === selectedUser.id && c.status === 'Active');
    if (isAlreadyIssued) {
      alert("POLICY RESTRICTION: This user already possesses an active credential. Revoke existing card before re-issuing.");
      return;
    }

    const newCard: NFCCard = {
      uid: `NFC-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9)}`,
      userId: selectedUser.id,
      userName: selectedUser.name,
      nfcUrl: selectedUser.nfcUrl || `https://verify.edusync.io/v/tmp-${Math.floor(Math.random()*1000)}`,
      role: selectedUser.role,
      issuedAt: new Date().toISOString().split('T')[0],
      lastTap: 'Never',
      lastLocation: 'None',
      status: 'Active',
      securityScore: 100,
      totalTaps: 0
    };

    setCards([newCard, ...cards]);
    setIsIssuing(false);
    setSelectedUser(null);
    setUserSearchQuery('');
    alert(`Master Token initialized and bound to pointer: ${newCard.nfcUrl}`);
  };

  const handleStatusChange = (uid: string, newStatus: 'Lost' | 'Revoked' | 'Active') => {
    if (window.confirm(`PROTOCOL CONFIRMATION: Shift status of ${uid} to ${newStatus.toUpperCase()}? URL resolution will be immediately blocked.`)) {
      setCards(prev => prev.map(c => c.uid === uid ? { ...c, status: newStatus, securityScore: newStatus === 'Active' ? 100 : 0 } : c));
    }
  };

  const filteredCards = cards.filter(c => 
    c.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nfcUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
             <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Hardware Trust Layer</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">NFC Identity Vault</h2>
          <p className="text-slate-500 font-medium mt-3 text-lg">Provisioning secure pointers for institutional hardware access</p>
        </div>
        <button 
          onClick={() => setIsIssuing(true)}
          className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
        >
          ➕ Issue Master Credential
        </button>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Active Pointers" value={cards.filter(c => c.status === 'Active').length} sub="Resolved by Server" color="blue" />
        <StatCard label="Blocked URLs" value={cards.filter(c => c.status !== 'Active').length} sub="Revoked Handshakes" color="rose" />
        <StatCard label="URL Resolves" value="182k" sub="Monthly Handshakes" color="amber" />
        <StatCard label="URL Integrity" value="99.9%" sub="Zero-Trust Baseline" color="emerald" />
      </div>

      {/* Search & Registry */}
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 flex items-center shadow-sm">
           <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Search by URL Pointer, Holder Name, or Hardware UID..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xl">🔍</span>
           </div>
        </div>

        <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hardware Artifact</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">NFC URL Pointer</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolution Identity</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCards.map(card => (
                    <tr key={card.uid} className={`hover:bg-slate-50/50 transition-colors ${card.status !== 'Active' ? 'opacity-60 bg-slate-50/20' : ''}`}>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border ${
                             card.status === 'Active' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                           }`}>💳</div>
                           <div>
                              <p className="text-sm font-black text-slate-900 leading-none mb-1.5">{card.uid}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">UID Bound</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="space-y-1">
                           <p className="text-xs font-mono font-black text-blue-600 break-all">{card.nfcUrl}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last Tap: {card.lastTap}</p>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="space-y-1">
                           <p className="text-sm font-black text-slate-800 leading-none">{card.userName}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{card.role} • {card.userId}</p>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          {card.status === 'Active' ? (
                            <>
                              <button onClick={() => handleStatusChange(card.uid, 'Lost')} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all">Flag Lost</button>
                              <button onClick={() => handleStatusChange(card.uid, 'Revoked')} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">Revoke</button>
                            </>
                          ) : (
                            <button onClick={() => handleStatusChange(card.uid, 'Active')} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">Restore Link</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCards.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-10 py-24 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No active URL pointers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* Logic Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 text-white p-12 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden border border-white/10">
           <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl pointer-events-none">🔐</div>
           <h4 className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] mb-12">Architecture Logic: Pointer Resolution</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                 <h5 className="text-xl font-black flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-sm italic">1</span>
                    Zero Hardware Exposure
                 </h5>
                 <p className="text-sm text-slate-400 leading-relaxed font-medium">
                   By storing only a URL pointer on the physical card, we eliminate the risk of hardware cloning revealing sensitive user IDs. The relationship between the URL and Identity is only visible to the <strong>Master Institutional Ledger</strong>.
                 </p>
              </div>
              <div className="space-y-6">
                 <h5 className="text-xl font-black flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-sm italic">2</span>
                    Dynamic Redirection
                 </h5>
                 <p className="text-sm text-slate-400 leading-relaxed font-medium">
                   NFC URLs allow the system to redirect access logic without re-issuing physical plastic. If a user's shift changes, the URL resolution server handles the shift-matching logic instantly.
                 </p>
              </div>
           </div>
        </div>

        <div className="bg-blue-50 p-10 md:p-12 rounded-[4rem] border border-blue-100 flex flex-col justify-between shadow-sm">
           <div className="space-y-10">
              <h4 className="text-blue-900 font-black text-xs uppercase tracking-widest flex items-center gap-3">
                <span>🛡️</span> Integrity Protocol
              </h4>
              <div className="space-y-5">
                 <PolicyIndicator label="Server-Side Resolution" status="Mandatory" />
                 <PolicyIndicator label="Pointer Hashing" status="Active" />
                 <PolicyIndicator label="Handshake Logging" status="Atomic" />
              </div>
           </div>
           <div className="mt-12 pt-8 border-t border-blue-200">
              <p className="text-[9px] text-blue-700 font-bold leading-tight italic px-1">
                "The physical card is a key, the NFC URL is the cylinder. We change the logic on the server to protect the institution."
              </p>
           </div>
        </div>
      </div>

      {/* Issuance Modal */}
      {isIssuing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white max-w-2xl w-full rounded-[4rem] p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">Provision Secure Pointer</h3>
                  <p className="text-slate-500 font-medium text-[10px] uppercase tracking-widest">Binding NFC Hardware to Identity Vault</p>
                </div>
                <button onClick={() => { setIsIssuing(false); setSelectedUser(null); }} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-2xl text-slate-400 transition-colors">✕</button>
              </div>
              
              <form onSubmit={handleIssueCard} className="space-y-8">
                 <div className="space-y-2 relative">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Registered Identity</label>
                       {isSearchingUsers && <span className="text-[9px] font-black text-blue-600 animate-pulse uppercase">Syncing...</span>}
                    </div>
                    <div className="relative">
                       <input 
                        type="text" 
                        placeholder="Search Registry (e.g. David)"
                        autoComplete="off"
                        value={userSearchQuery}
                        onChange={e => setUserSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" 
                       />
                       <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 text-xl">🔍</span>
                    </div>

                    {userSearchResults.length > 0 && !selectedUser && (
                       <div className="absolute z-[110] left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in slide-in-from-top-2">
                          {userSearchResults.map(u => (
                             <button key={u.id} type="button" onClick={() => { setSelectedUser(u); setUserSearchQuery(u.name); }} className="w-full flex items-center justify-between p-4 hover:bg-blue-50 text-left transition-colors border-b border-slate-50">
                                <div>
                                   <p className="text-sm font-black text-slate-900">{u.name}</p>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase">{u.role} • Pointer: {u.nfcUrl}</p>
                                </div>
                                <span className="text-[9px] font-black text-blue-600 uppercase">Bind Artifact →</span>
                             </button>
                          ))}
                       </div>
                    )}

                    {selectedUser && (
                       <div className="mt-4 p-5 bg-blue-50 border border-blue-100 rounded-3xl animate-in zoom-in-95">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-2xl shadow-sm">✅</div>
                             <div className="flex-1">
                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Bound Pointer URL</p>
                                <p className="text-xs font-mono font-black text-slate-900 mt-2 break-all">{selectedUser.nfcUrl}</p>
                             </div>
                             <button type="button" onClick={() => { setSelectedUser(null); setUserSearchQuery(''); }} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Change</button>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="p-8 bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-[2.5rem] text-center space-y-4">
                    <div className="text-4xl">📡</div>
                    <div>
                       <p className="text-sm font-black text-blue-900">Awaiting Hardware Handshake</p>
                       <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">Tap a clean card to initialize pointer write</p>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsIssuing(false)} className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                   <button type="submit" disabled={!selectedUser} className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">Provision Artifact</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string | number, sub: string, color: string }> = ({ label, value, sub, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-6 shadow-inner ${colorMap[color]}`}>
        {color === 'blue' ? '📡' : color === 'rose' ? '🚨' : color === 'amber' ? '⏳' : '✨'}
      </div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3">{sub}</p>
    </div>
  );
};

const PolicyIndicator: React.FC<{ label: string, status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-blue-100 shadow-sm">
     <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{label}</p>
     <span className="text-[9px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">{status}</span>
  </div>
);

export default NFCCardManagement;
