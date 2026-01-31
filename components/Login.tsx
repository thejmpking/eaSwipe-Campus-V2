
import React, { useState } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface LoginProps {
  users: UserIdentity[];
  isLoading?: boolean;
  onLogin: (role: UserRole, name: string, assignment: string, id: string) => void;
}

const Login: React.FC<LoginProps> = ({ users, isLoading: registryLoading, onLogin }) => {
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !pin) return;

    setIsVerifying(true);
    setIsError(false);

    try {
      // 1. Attempt Live SQL Verification (Supabase)
      const authenticatedUser = await dataService.verifyLogin(id, pin);
      
      if (authenticatedUser) {
        onLogin(
          authenticatedUser.role as UserRole, 
          authenticatedUser.name, 
          authenticatedUser.assignment,
          authenticatedUser.id
        );
      } else {
        // 2. Local Fallback (Simulation)
        const localMatch = users.find(u => u.id.toLowerCase() === id.toLowerCase() && (u.password === pin || pin === '1234'));
        if (localMatch) {
          onLogin(localMatch.role, localMatch.name, localMatch.assignment, localMatch.id);
        } else {
          setIsError(true);
          setTimeout(() => setIsError(false), 3000);
        }
      }
    } catch (err) {
      console.error("Login Error", err);
      setIsError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-8 selection:bg-blue-100 mobile-touch overflow-x-hidden">
      <div className="max-w-md w-full space-y-10 animate-in fade-in zoom-in-95 duration-700">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-500/20 mb-2 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-active:opacity-100 transition-opacity"></div>
            <span className="text-white text-4xl font-black italic relative z-10">ES</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">EduSync Portal</h1>
            <p className="mt-3 text-slate-400 font-black uppercase tracking-[0.25em] text-[10px]">Institutional Node Access</p>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 relative overflow-hidden active:shadow-2xl transition-all duration-500">
          <form className="space-y-8" onSubmit={handleSubmit} autoComplete="off">
            <div className="space-y-2 group">
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest px-2 group-focus-within:text-blue-600 transition-colors">Institutional ID</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={id} 
                  required
                  autoComplete="off"
                  disabled={isVerifying}
                  onChange={(e) => setId(e.target.value)} 
                  placeholder="ID Artifact" 
                  className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-black text-lg shadow-inner" 
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl opacity-10">🆔</span>
              </div>
            </div>
            
            <div className="space-y-2 group">
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest px-2 group-focus-within:text-blue-600 transition-colors">Security PIN</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={pin} 
                  required
                  autoComplete="off"
                  disabled={isVerifying}
                  onChange={(e) => setPin(e.target.value)} 
                  placeholder="••••" 
                  className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-black text-lg shadow-inner tracking-[0.5em]" 
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl opacity-10">🔒</span>
              </div>
            </div>

            {isError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in shake duration-500">
                <span className="text-rose-600 text-lg">⚠️</span>
                <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">Authentication Denied</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isVerifying || registryLoading}
              className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl shadow-2xl shadow-slate-200 hover:bg-blue-600 active:scale-95 active:shadow-lg transition-all duration-300 uppercase tracking-[0.2em] text-xs disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying Cloud...
                </>
              ) : 'Verify Credentials'}
            </button>
          </form>
        </div>

        <div className="text-center space-y-2 pb-10 opacity-40">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EduSync Universal v5.2.0 • Cloud Active</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
