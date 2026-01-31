
import React, { useState, useMemo, useEffect } from 'react';
import { UserIdentity } from '../App';

interface GovernanceProps {
  users: UserIdentity[];
  onSyncComplete?: () => void;
  onSelectCampus?: (id: string) => void;
  onSelectCluster?: (id: string) => void;
  onSelectSchool?: (id: string) => void;
}

const Governance: React.FC<GovernanceProps> = ({ users, onSyncComplete, onSelectCampus, onSelectCluster, onSelectSchool }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [showLockdown, setShowLockdown] = useState(false);
  
  // Deterministic Analysis Logic
  const analysis = useMemo(() => {
    const total = users.length;
    const nfcCovered = users.filter(u => u.nfcUrl).length;
    const verified = users.filter(u => u.status === 'Verified').length;
    
    return {
      identityCoverage: ((nfcCovered / total) * 100).toFixed(1),
      registryVerification: ((verified / total) * 100).toFixed(1),
      orphanedIdentities: total - verified,
      securityEntropy: nfcCovered === total ? 'Stable' : 'Vulnerable'
    };
  }, [users]);

  const handleGlobalSync = () => {
    setIsSyncing(true);
    setSyncLogs(['[INIT] Requesting Master Fabric Access...', '[AUTH] Identity Handshake Verified.']);
    
    const steps = [
      '[SYNC] Pulling Regional Registry (Thibyan Malappuram)...',
      '[SYNC] Pulling Regional Registry (Thibyan Calicut)...',
      '[COMPARE] Validating NFC URL Pointers against Ledger...',
      '[POLICY] Injecting Global Grace Periods (15m)...',
      '[GEO] Refreshing Geofence Coordinates...',
      '[FINALIZE] Committing Atomic State to Global Core.',
      '[DONE] Institutional Propagation Complete.'
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setSyncLogs(prev => [...prev, step]);
        if (i === steps.length - 1) {
          setIsSyncing(false);
          onSyncComplete?.();
        }
      }, (i + 1) * 600);
    });
  };

  return (
    <div className={`space-y-10 pb-24 transition-all duration-1000 ${showLockdown ? 'bg-rose-50/30 p-4 rounded-[4rem] ring-8 ring-rose-600/20' : ''}`}>
      
      {/* 1. Root Command Header */}
      <div className={`p-10 md:p-14 rounded-[3.5rem] shadow-2xl relative overflow-hidden transition-all duration-700 border-4 ${
        showLockdown ? 'bg-rose-950 border-rose-600' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="absolute top-0 right-0 p-12 opacity-10 text-[14rem] pointer-events-none rotate-12 transition-transform">
          {showLockdown ? '🚨' : '🛡️'}
        </div>
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <span className={`px-5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] shadow-lg ${
                showLockdown ? 'bg-rose-600 text-white animate-pulse' : 'bg-blue-600 text-white'
              }`}>
                {showLockdown ? 'EMERGENCY LOCKDOWN ACTIVE' : 'SUPER ADMIN SOVEREIGNTY'}
              </span>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-600"></div>
              <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">Master Command Hub v4.2</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-semibold text-white tracking-tighter leading-none mb-8">
              Institutional Core <br /><span className="text-blue-500">Sovereignty Hub</span>
            </h2>
            <div className="flex flex-wrap gap-4 mt-10">
               <HeaderMetric label="Identity Integrity" value={`${analysis.registryVerification}%`} status="Optimal" />
               <HeaderMetric label="Regional Nodes" value="6 / 6" status="Synced" />
               <HeaderMetric label="NFC Pointer Coverage" value={`${analysis.identityCoverage}%`} status={analysis.securityEntropy} />
            </div>
          </div>

          <div className="flex flex-col gap-5 shrink-0 min-w-[280px]">
             <button 
              onClick={handleGlobalSync}
              disabled={isSyncing || showLockdown}
              className="group relative px-10 py-6 bg-blue-600 text-white rounded-[2rem] font-semibold text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/40 hover:bg-blue-500 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10">{isSyncing ? 'Synchronizing Fabric...' : '🚀 Sync Global Fabric'}</span>
              {isSyncing && <div className="absolute inset-0 bg-blue-400/20 animate-pulse"></div>}
            </button>
            <button 
              onClick={() => setShowLockdown(!showLockdown)}
              className={`px-10 py-6 rounded-[2rem] font-semibold text-xs uppercase tracking-widest transition-all active:scale-95 border-2 ${
                showLockdown ? 'bg-white text-rose-600 border-white shadow-2xl' : 'bg-transparent text-rose-500 border-rose-500/30 hover:bg-rose-500/10'
              }`}
            >
              {showLockdown ? '🔓 Release Lockdown' : '🚨 Immediate Lockdown'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
        
        {/* 2. Operations Grid */}
        <div className="xl:col-span-3 space-y-10">
          {/* Diagnostic Log Console */}
          {(isSyncing || syncLogs.length > 0) && (
            <div className="bg-black rounded-[2.5rem] p-8 font-mono text-emerald-400 text-xs shadow-2xl animate-in slide-in-from-top-4 overflow-hidden border border-emerald-900/30">
               <div className="flex justify-between items-center mb-6 border-b border-emerald-900/30 pb-4">
                  <p className="font-semibold uppercase tracking-widest text-[10px]">Fabric Propagation Log</p>
                  <span className="text-[10px] animate-pulse">● LIVE_FEED</span>
               </div>
               <div className="space-y-2 h-40 overflow-y-auto custom-scrollbar">
                  {syncLogs.map((log, i) => (
                    <p key={i} className="opacity-80"><span className="text-emerald-600 mr-4">[{new Date().toLocaleTimeString()}]</span> {log}</p>
                  ))}
                  {isSyncing && <p className="animate-pulse">_</p>}
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CommandTile 
              title="Security Matrix" 
              sub="Zero-Trust Firewall & Threat Monitoring"
              metric="0 Active Breaches"
              icon="🛡️"
              status="Secure"
              color="rose"
            />
            <CommandTile 
              title="Registry Hub" 
              sub="Entities, Departments & Academic Structure"
              metric={`${users.length} Active Identity Records`}
              icon="🏢"
              status="Synced"
              color="blue"
            />
          </div>

          <section className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Institutional Architecture</h3>
                <p className="text-slate-500 font-medium mt-1">Direct oversight of Thibyan Campuses and regional hubs</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <ArchitectureNode 
                type="Campus" 
                name="THIBYAN MALAPPURAM" 
                stats="2 Clusters • 18 Schools" 
                compliance={99.1}
                status="Compliant"
                onClick={() => onSelectCampus?.('C-001')}
              />
              <div className="ml-12 border-l-4 border-slate-100 pl-8 space-y-6">
                 <ArchitectureNode 
                  type="Cluster" 
                  name="TIRUR CLUSTER" 
                  stats="6 Schools • RP: Michael West" 
                  compliance={97.0}
                  status="Active Audit"
                  onClick={() => onSelectCluster?.('CL-401')}
                />
                 <div className="ml-12 border-l-4 border-slate-50 pl-8 space-y-4">
                    <ArchitectureNode 
                      type="School" 
                      name="Thibyan Central High" 
                      stats="1500 Scholars • Principal: Ahmed" 
                      compliance={98.2}
                      status="Compliant"
                      onClick={() => onSelectSchool?.('S-401')}
                    />
                 </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <div className="bg-blue-50 p-10 md:p-12 rounded-[3.5rem] border border-blue-100 flex flex-col justify-between shadow-sm relative overflow-hidden group">
             <div className="absolute -bottom-10 -right-10 opacity-5 text-[12rem] group-hover:scale-110 transition-transform">⚖️</div>
             <div className="relative z-10">
                <h4 className="text-blue-900 font-semibold text-[11px] uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                  <span>⚡</span> Registry Diagnostic
                </h4>
                <div className="space-y-4">
                   <LogicIndicator label="Identity Resolution" status={`${analysis.registryVerification}%`} />
                   <LogicIndicator label="Regional Sync" status="Atomic" />
                   <LogicIndicator label="Data Firewall" status="Hardened" />
                </div>
             </div>
             <p className="text-[10px] text-blue-700 font-medium leading-tight pt-10 border-t border-blue-200/50 italic">
               System scan reveals {analysis.orphanedIdentities} identities require secondary verification.
             </p>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-200">
             <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-6">Sovereign Directives</h4>
             <div className="space-y-6">
                <DirectiveToggle label="Strict Zero-Trust" active={true} />
                <DirectiveToggle label="Global GPS Fencing" active={true} />
                <DirectiveToggle label="NFC Pointer Handshake" active={true} />
             </div>
          </div>

          <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-sm border border-slate-800">
             <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-6">Recent Sovereign Events</h4>
             <div className="space-y-5">
                <LogEntry event="REGISTRY_SYNC" user="Root Admin" time="Last Atomic" />
                <LogEntry event="THIBYAN_RECONFIG" user="Root Admin" time="Verified" />
                <LogEntry event="PERIMETER_SECURED" user="System Firewall" time="2h ago" />
             </div>
             <button className="w-full mt-8 py-3 text-[10px] font-semibold text-blue-600 uppercase tracking-widest hover:underline">View Master Ledger →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeaderMetric: React.FC<{ label: string, value: string, status: string }> = ({ label, value, status }) => (
  <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 flex flex-col">
     <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</span>
     <span className="text-xl font-semibold text-white leading-none">{value}</span>
     <span className="text-[8px] font-medium text-blue-400 uppercase mt-2 tracking-tighter">{status}</span>
  </div>
);

const CommandTile: React.FC<{ title: string, sub: string, metric: string, icon: string, status: string, color: string }> = ({ title, sub, metric, icon, status, color }) => {
  const colorMap: any = {
    rose: 'text-rose-500 bg-rose-50 border-rose-100',
    blue: 'text-blue-500 bg-blue-50 border-blue-100',
    indigo: 'text-indigo-500 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-500 bg-emerald-50 border-emerald-100'
  };
  return (
    <button className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all text-left group active:scale-[0.98] relative overflow-hidden">
       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-10 shadow-inner group-hover:scale-110 transition-transform ${colorMap[color]}`}>
         {icon}
       </div>
       <div className="flex justify-between items-start mb-2">
         <h4 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none">{title}</h4>
         <span className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-lg ${colorMap[color]}`}>{status}</span>
       </div>
       <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">{sub}</p>
       <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">{metric}</span>
          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Configure Hub →</span>
       </div>
    </button>
  );
};

const ArchitectureNode: React.FC<{ type: string, name: string, stats: string, status: string, compliance: number, onClick?: () => void }> = ({ type, name, stats, status, compliance, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-blue-200 hover:bg-white transition-all cursor-pointer shadow-sm active:scale-[0.99]"
  >
    <div className="flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-inner relative ${
        type === 'Campus' ? 'bg-indigo-600 text-white shadow-indigo-200' : 
        type === 'Cluster' ? 'bg-blue-600 text-white shadow-blue-200' :
        'bg-white text-slate-400 border border-slate-100'
      }`}>
        <span className="text-2xl">{type === 'Campus' ? '🏙️' : type === 'Cluster' ? '📍' : '🏫'}</span>
        <div className="absolute -bottom-1 w-8 h-1 bg-blue-400 rounded-full opacity-50"></div>
      </div>
      <div className="text-left">
        <p className="text-lg font-semibold text-slate-900 leading-none mb-2 group-hover:text-blue-600 transition-colors">{name}</p>
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest flex items-center gap-2">
          {type} <span className="text-slate-200">•</span> {stats}
        </p>
      </div>
    </div>
    
    <div className="flex items-center gap-8">
       <div className="text-right hidden md:block">
          <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">Health</p>
          <p className={`text-sm font-semibold ${compliance > 95 ? 'text-emerald-600' : 'text-amber-600'}`}>{compliance}%</p>
       </div>
       <span className={`text-[9px] font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm border ${
         status === 'Compliant' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
         status === 'Yield Alert' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
         'bg-amber-50 text-amber-700 border-amber-100'
       }`}>
         {status}
       </span>
    </div>
  </button>
);

const LogicIndicator: React.FC<{ label: string, status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between p-5 bg-white/80 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
     <p className="text-[10px] font-semibold text-blue-950 uppercase tracking-widest">{label}</p>
     <span className="text-[9px] font-semibold bg-blue-600 text-white px-3 py-1 rounded-lg uppercase shadow-lg shadow-blue-500/20">{status}</span>
  </div>
);

const DirectiveToggle: React.FC<{ label: string, active: boolean }> = ({ label, active }) => (
  <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-blue-100 hover:bg-white transition-all">
     <p className="text-[10px] font-semibold text-blue-900 uppercase tracking-widest">{label}</p>
     <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-inner ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
        {active ? '✓' : '✕'}
     </div>
  </div>
);

const LogEntry: React.FC<{ event: string, user: string, time: string }> = ({ event, user, time }) => (
  <div className="flex justify-between items-center text-[11px] font-mono">
     <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        <span className="font-semibold text-slate-200">{event}</span>
     </div>
     <span className="text-slate-400">[{time}]</span>
  </div>
);

export default Governance;
