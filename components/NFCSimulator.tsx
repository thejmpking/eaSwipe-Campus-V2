
import React, { useState } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';

interface NFCSimulatorProps {
  userRole: UserRole;
  userName: string;
  users?: UserIdentity[];
}

const NFCSimulator: React.FC<NFCSimulatorProps> = ({ userRole, userName, users = [] }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<UserIdentity | null>(null);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  const handleScan = (type: 'self' | 'subordinate') => {
    setIsScanning(true);
    setScanResult(null);
    setSecurityAlert(null);

    setTimeout(() => {
      setIsScanning(false);
      let target: UserIdentity | undefined;

      if (type === 'self') {
        target = users.find(u => u.name === userName);
      } else {
        target = users.find(u => u.role === UserRole.STUDENT);
      }

      if (target) {
        if (userRole === UserRole.STUDENT && target.name !== userName) {
          setSecurityAlert("UNAUTHORIZED: Student accounts restricted to self-verification.");
        } else {
          setScanResult(target);
        }
      } else {
        setSecurityAlert("ARTIFACT NOT FOUND: No identity registered for this pointer.");
      }
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-200 text-center flex flex-col items-center">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8">Secure Hardware Terminal</h3>
        
        <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner border-8 ${
          isScanning ? 'bg-blue-600 border-blue-400 animate-pulse' : 'bg-slate-50 border-white'
        }`}>
          <span className="text-6xl">{isScanning ? '📡' : scanResult ? '✅' : '📱'}</span>
        </div>

        <div className="mt-12 flex gap-4">
           <button onClick={() => handleScan('self')} disabled={isScanning} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95">Tap Your Card</button>
           {userRole !== UserRole.STUDENT && (
             <button onClick={() => handleScan('subordinate')} disabled={isScanning} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95">Student Tap</button>
           )}
        </div>
      </div>

      {scanResult && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 flex items-center gap-8 animate-in slide-in-from-bottom-6">
           <div className="w-24 h-24 rounded-3xl bg-slate-100 overflow-hidden border-4 border-white shadow-lg">
              <img src={scanResult.nfcUrl?.startsWith('data:') ? scanResult.nfcUrl : `https://picsum.photos/seed/${scanResult.id}/128/128`} className="w-full h-full object-cover" />
           </div>
           <div>
              <h4 className="text-2xl font-black text-slate-900 leading-none">{scanResult.name}</h4>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2">{scanResult.role} • Node: {scanResult.assignment}</p>
              <div className="mt-4 flex gap-2">
                 <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg">Pointer Resolved</span>
              </div>
           </div>
        </div>
      )}

      {securityAlert && (
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2.5rem] flex items-center gap-6 animate-in shake">
           <span className="text-4xl">🚫</span>
           <p className="text-rose-600 font-black uppercase tracking-widest text-xs leading-relaxed">{securityAlert}</p>
        </div>
      )}
    </div>
  );
};

export default NFCSimulator;
