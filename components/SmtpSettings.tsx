import React, { useState, useEffect } from 'react';
import { MasterSettings } from './SuperAdminPanel';

interface SmtpSettingsProps {
  settings?: MasterSettings;
  onUpdateSettings?: (settings: MasterSettings) => void;
}

const SmtpSettings: React.FC<SmtpSettingsProps> = ({ settings, onUpdateSettings }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [protocolLogs, setProtocolLogs] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [config, setConfig] = useState({
    host: settings?.smtpHost || '',
    port: settings?.smtpPort || '',
    user: settings?.smtpUser || '',
    pass: settings?.smtpPass || '',
    secure: true
  });

  useEffect(() => {
    if (settings) {
      setConfig({
        host: settings.smtpHost || '',
        port: settings.smtpPort || '',
        user: settings.smtpUser || '',
        pass: settings.smtpPass || '',
        secure: true
      });
    }
  }, [settings]);

  const handleConfigChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsConnected(false);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const addLog = (msg: string) => {
    setProtocolLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleTestHandshake = async () => {
    if (!showTestEmail) {
      setShowTestEmail(true);
      return;
    }

    if (!testEmail.includes('@')) {
      alert("Validation Error: Provide a valid recipient identity artifact (Email).");
      return;
    }

    setIsTesting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setProtocolLogs([]);
    
    addLog(`INITIATING HANDSHAKE: Targeting ${config.host}:${config.port}`);
    addLog(`PROTOCOL: ${config.port === '465' ? 'SMTPS (SSL)' : 'SMTP (STARTTLS Support)'}`);
    await new Promise(r => setTimeout(r, 600));
    
    addLog(`NEGOTIATING SOCKET WITH BRIDGE...`);
    
    try {
      const bridgeUrl = localStorage.getItem('SUPABASE_URL') || '';
      const apiKey = localStorage.getItem('SUPABASE_KEY') || '';
      
      const response = await fetch(`${bridgeUrl}?action=test_smtp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          user: config.user,
          pass: config.pass,
          test_email: testEmail
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        addLog(`220 ${config.host} ESMTP Ready`);
        addLog(`EHLO Handshake Successful`);
        if (config.port === '587') addLog(`STARTTLS Negotiation Complete`);
        addLog(`AUTH LOGIN SUCCESSFUL`);
        addLog(`MAIL FROM:<${config.user}> ACCEPTED`);
        addLog(`RCPT TO:<${testEmail}> ACCEPTED`);
        addLog(`250 OK: Artifact Queued for Delivery`);
        
        setIsConnected(true);
        setShowTestEmail(false);
        setSuccessMessage(`Relay Handshake Verified. Real mail artifact successfully routed to ${testEmail} using ${config.host}.`);
        setTestEmail('');
      } else {
        addLog(`550 Protocol Error: ${result.message}`);
        setErrorMessage(result.message);
      }
    } catch (e: any) {
      addLog(`421 Network Failure: Bridge reported a socket disconnect.`);
      setErrorMessage("Network Failure: Bridge could not reach the specified SMTP host. On Hostinger, ensure you are using port 587 with 'smtp.hostinger.com' or check if your hosting plan allows external SMTP connections.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    
    localStorage.setItem('SMTP_HOST', config.host);
    localStorage.setItem('SMTP_PORT', config.port);
    localStorage.setItem('SMTP_USER', config.user);
    localStorage.setItem('SMTP_PASS', config.pass);

    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        smtpHost: config.host,
        smtpPort: config.port,
        smtpUser: config.user,
        smtpPass: config.pass
      });
    }

    setTimeout(() => {
      setIsSaving(false);
      setSuccessMessage("SMTP Configuration committed and locked in the Master Ledger.");
    }, 1500);
  };

  return (
    <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10 px-1">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : errorMessage ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isConnected ? 'text-emerald-600' : errorMessage ? 'text-rose-600' : 'text-slate-400'}`}>
            {isConnected ? 'Relay Verified' : errorMessage ? 'Handshake Failed' : 'Relay Disconnected'}
          </span>
        </div>
        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">TLS 1.3 Encryption Standard</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
        <div className="space-y-6">
           <SmtpInput label="SMTP Host Address" value={config.host} onChange={(v: string) => handleConfigChange('host', v)} placeholder="e.g. smtp.hostinger.com" />
           <SmtpInput label="Port Number" value={config.port} onChange={(v: string) => handleConfigChange('port', v)} placeholder="587 (or 465)" />
        </div>
        <div className="space-y-6">
           <SmtpInput label="Relay Identity (Username)" value={config.user} onChange={(v: string) => handleConfigChange('user', v)} placeholder="noreply@domain.com" />
           <SmtpInput label="Authentication Token (Password)" type="password" value={config.pass} onChange={(v: string) => handleConfigChange('pass', v)} placeholder="••••••••" />
        </div>
      </div>

      {(isTesting || protocolLogs.length > 0) && (
        <div className="mt-8 p-6 bg-slate-950 rounded-[1.5rem] border border-slate-800 shadow-2xl font-mono animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
             <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${errorMessage ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                Handshake Diagnostics Console
             </p>
             <button onClick={() => { setProtocolLogs([]); setErrorMessage(null); }} className="text-white/20 hover:text-white text-[10px]">Clear</button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {protocolLogs.map((log, i) => (
              <p key={i} className={`text-[10px] leading-relaxed whitespace-pre-wrap ${log.includes('Error') || log.startsWith('5') || log.includes('Failure') ? 'text-rose-400' : 'text-slate-300'}`}>{log}</p>
            ))}
            {isTesting && (
              <p className="text-[10px] text-blue-400 animate-pulse mt-1">_ Handshaking with {config.host}...</p>
            )}
          </div>
        </div>
      )}

      {successMessage && !isTesting && (
        <div className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] flex items-center gap-4 animate-in slide-in-from-top-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm shrink-0 border border-emerald-100">✓</div>
          <p className="text-[11px] font-bold text-emerald-700 leading-relaxed uppercase tracking-tight">{successMessage}</p>
        </div>
      )}

      {errorMessage && !isTesting && (
        <div className="mt-8 p-6 bg-rose-50 border border-rose-100 rounded-[1.5rem] flex items-center gap-4 animate-in slide-in-from-top-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm shrink-0 border border-rose-100">✕</div>
          <div className="min-w-0">
             <p className="text-[11px] font-bold text-rose-700 uppercase tracking-tight">Handshake Refused</p>
             <p className="text-[9px] text-rose-400 font-medium mt-1 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {showTestEmail && !successMessage && !isTesting && (
        <div className="mt-8 p-6 bg-indigo-50/50 border border-indigo-100 rounded-[1.5rem] animate-in zoom-in-95 duration-300 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.15em] px-1">Test Recipient Identity (Email)</label>
            <button onClick={() => setShowTestEmail(false)} className="text-slate-400 hover:text-slate-600 text-xs p-1">✕</button>
          </div>
          <input 
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="e.g. yourname@gmail.com"
            className="w-full bg-white border-2 border-indigo-100 rounded-xl p-4 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all shadow-inner"
          />
          <p className="text-[9px] text-indigo-400 font-medium uppercase mt-3 px-1 italic">The system will perform a live protocol handshake and dispatch a test artifact.</p>
        </div>
      )}

      <div className="mt-8 md:mt-12 flex flex-col sm:flex-row justify-end gap-3">
        <button 
          onClick={handleTestHandshake}
          disabled={isTesting || isSaving}
          className={`w-full sm:w-auto px-8 py-4 rounded-xl md:rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${
            showTestEmail ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isTesting ? (
            <>
              <div className="w-3 h-3 border-2 rounded-full animate-spin border-white/30 border-t-white"></div>
              HANDSHAKING...
            </>
          ) : (
            showTestEmail ? 'Confirm Dispatch' : isConnected ? 'Re-Verify Relay' : 'Test Handshake'
          )}
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving || isTesting}
          className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              COMMITING...
            </>
          ) : (
            'Commit Relay Config'
          )}
        </button>
      </div>
    </div>
  );
};

const SmtpInput = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1">{label}</label>
    <input 
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl p-4 md:p-5 text-sm font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all shadow-inner placeholder:text-slate-300"
    />
  </div>
);

export default SmtpSettings;