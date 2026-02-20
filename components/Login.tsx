
import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface LoginProps {
  users: UserIdentity[];
  isLoading?: boolean;
  onLogin: (role: UserRole, name: string, assignment: string, id: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [creds, setCreds] = useState({ id: '' });
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isError, setIsError] = useState(false);

  const digitRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const executeHandshake = async (targetId: string, targetPin: string) => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setIsError(false);
    
    try {
      // Normalize ID to Uppercase to match system identity registry (ADM-001)
      const normalizedId = targetId.trim().toUpperCase();
      const auth = await dataService.verifyLogin(normalizedId, targetPin);
      
      if (auth) {
        onLogin(auth.role as UserRole, auth.name, auth.assignment, auth.id);
      } else {
        setIsError(true);
        setPinDigits(['', '', '', '']);
        digitRefs[0].current?.focus();
      }
    } catch (err) { 
      setIsError(true); 
    } finally { 
      setIsVerifying(false); 
    }
  };

  const handleDigitChange = (value: string, index: number) => {
    const char = value.slice(-1);
    
    if (char && !/^\d$/.test(char)) return;

    const nextPinArray = [...pinDigits];
    nextPinArray[index] = char;
    setPinDigits(nextPinArray);
    
    setIsError(false);

    if (char !== '' && index < 3) {
      digitRefs[index + 1].current?.focus();
    }

    const completePinString = nextPinArray.join('');
    if (completePinString.length === 4 && creds.id.trim() !== '') {
      executeHandshake(creds.id, completePinString);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (pinDigits[index] === '' && index > 0) {
        digitRefs[index - 1].current?.focus();
      }
      setIsError(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
    const newDigits = ['', '', '', ''];
    pasteData.forEach((char, i) => {
      if (i < 4) newDigits[i] = char;
    });
    setPinDigits(newDigits);
    
    const pastedPin = newDigits.join('');
    if (pastedPin.length === 4 && creds.id.trim() !== '') {
      executeHandshake(creds.id, pastedPin);
    } else {
      const focusIndex = Math.min(pasteData.length, 3);
      digitRefs[focusIndex].current?.focus();
    }
    setIsError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPin = pinDigits.join('');
    if (currentPin.length === 4) {
      executeHandshake(creds.id, currentPin);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-4 md:p-10 z-[1000] overflow-y-auto">
      <div className="w-full max-w-[400px] space-y-6 md:space-y-8 animate-in zoom-in-95 duration-700 py-8">
        <div className="text-center space-y-3">
           <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-slate-950 rounded-2xl shadow-2xl mb-2 italic font-black text-white text-2xl md:text-3xl">ES</div>
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase">Easwipe Campus</h1>
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Streamline Simplify Secured</p>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-100">
           <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identity ID</label>
                <input 
                  type="text" 
                  required 
                  value={creds.id} 
                  onChange={e => { setCreds({ id: e.target.value.toUpperCase() }); setIsError(false); }} 
                  disabled={isVerifying}
                  placeholder="Ex: ADM-001"
                  autoComplete="username"
                  className="w-full h-12 md:h-14 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-5 font-black text-slate-900 text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-600 transition-all placeholder:text-slate-300 uppercase" 
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Pin</label>
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">4-Digit Code</span>
                </div>
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                  {pinDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={digitRefs[index]}
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onClick={() => {
                        const firstEmpty = pinDigits.findIndex(d => d === '');
                        if (firstEmpty !== -1 && firstEmpty < index) {
                          digitRefs[firstEmpty].current?.focus();
                        }
                      }}
                      onChange={(e) => handleDigitChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={handlePaste}
                      disabled={isVerifying}
                      className={`w-full h-14 md:h-20 bg-slate-50 border-2 rounded-xl md:rounded-2xl text-center text-xl md:text-2xl font-black text-slate-900 outline-none transition-all shadow-inner ${
                        digit !== '' ? 'border-blue-500 bg-white ring-4 ring-blue-500/5' : 'border-slate-100'
                      } focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10`}
                    />
                  ))}
                </div>
              </div>

              {isError && (
                <div className="space-y-3 animate-in shake duration-300">
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                    <span className="text-rose-600">⚠️</span>
                    <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest leading-none">Access Refused</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                     <p className="text-[10px] text-blue-800 font-bold leading-relaxed uppercase">
                       Credential Mismatch. Check your ID and PIN.
                     </p>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isVerifying || pinDigits.some(d => !d) || !creds.id.trim()}
                className="w-full h-14 md:h-16 bg-slate-950 text-white rounded-2xl md:rounded-[1.5rem] font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
              >
                {isVerifying ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : 'Verify Identity'}
              </button>
           </form>
        </div>

        <div className="flex flex-col items-center gap-3 opacity-40 py-4">
           <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Thibyan Edition by LANDWHALE</p>
           <div className="flex gap-2">
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
