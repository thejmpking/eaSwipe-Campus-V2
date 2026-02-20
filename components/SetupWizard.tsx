
import React, { useState } from 'react';
import { dataService } from '../services/dataService';
import { UserRole } from '../types';

interface SetupWizardProps {
  onComplete: (config: any) => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSql, setShowSql] = useState(false);
  
  const [creds, setCreds] = useState({
    url: '', key: '', instName: 'EduSync Unified'
  });

  const sqlSchema = `
-- EduSync Institutional SQL Schema v7.0 [ENHANCED OVERSIGHT]
-- MANDATORY: Enable RLS and execute policies for sovereign data integrity.

-- 1. MANDATORY PATCHES
ALTER TABLE users ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cluster TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS yield TEXT;
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE cluster_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_assignments JSONB DEFAULT '{}'::jsonb;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS early_mark_minutes INTEGER DEFAULT 0;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 2. MASTER TABLE DEFINITIONS
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT, base_role TEXT, permissions JSONB);
CREATE TABLE IF NOT EXISTS campuses (id TEXT PRIMARY KEY, name TEXT, head TEXT, region TEXT, clusters INTEGER, schools INTEGER, students INTEGER, staff INTEGER, status TEXT, yield INTEGER);
CREATE TABLE IF NOT EXISTS clusters (id TEXT PRIMARY KEY, name TEXT, campus_id TEXT, campus_name TEXT, resource_person TEXT, rp_id TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT, cluster_id TEXT, cluster_name TEXT, campus_id TEXT, campus_name TEXT, headmaster TEXT, address TEXT, status TEXT, strength JSONB);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, role TEXT, assignment TEXT, school TEXT, cluster TEXT, status TEXT, last_active TIMESTAMPTZ, email TEXT, password TEXT, nfc_url TEXT, designation TEXT, phone TEXT, whatsapp TEXT, dob DATE, blood_group TEXT, experience TEXT, address TEXT, emergency_contact TEXT, skills TEXT, yield TEXT);
CREATE TABLE IF NOT EXISTS attendance (id BIGINT PRIMARY KEY, user_id TEXT, user_name TEXT, status TEXT, date DATE, clock_in TIME, clock_out TIME, location TEXT, method TEXT);
CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, label TEXT, start_time TIME, end_time TIME, grace_period INTEGER, early_mark_minutes INTEGER DEFAULT 0, type TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS shift_assignments (id TEXT PRIMARY KEY, shift_id TEXT, target_id TEXT, target_name TEXT, target_type TEXT, assigned_date DATE, start_date DATE, end_date DATE);
CREATE TABLE IF NOT EXISTS shift_categories (id TEXT PRIMARY KEY, label TEXT, description TEXT, color_code TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS leave_requests (id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT, type TEXT, start_date DATE, end_date DATE, status TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS training_events (id TEXT PRIMARY KEY, title TEXT, description TEXT, date DATE, start_time TIME, end_time TIME, venue TEXT, type TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT, school TEXT, dept_id TEXT, dept_name TEXT, total_students INTEGER, grades JSONB, teacher_assignments JSONB DEFAULT '{}'::jsonb, status TEXT);
CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, name TEXT, head TEXT, school TEXT, staff INTEGER, classes JSONB, status TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, timestamp TIMESTAMPTZ DEFAULT NOW(), actor_name TEXT, actor_role TEXT, action TEXT, target TEXT, category TEXT, metadata TEXT);
CREATE TABLE IF NOT EXISTS cluster_requests (id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT, current_cluster TEXT, requested_cluster TEXT, reason TEXT, rejection_reason TEXT, status TEXT, timestamp TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS time_tables (id TEXT PRIMARY KEY, label TEXT, shift_id TEXT, target_id TEXT, target_type TEXT, school TEXT, content JSONB, status TEXT);
CREATE TABLE IF NOT EXISTS inspections (id TEXT PRIMARY KEY, school TEXT, date DATE, inspector TEXT, score FLOAT, discrepancies INTEGER, status TEXT, rating_emoji TEXT, rating_label TEXT, comments TEXT, is_read BOOLEAN DEFAULT FALSE);

-- 3. SECURITY POLICIES
ALTER TABLE cluster_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Insert" ON cluster_requests;
CREATE POLICY "Allow All Insert" ON cluster_requests FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow All Select" ON cluster_requests;
CREATE POLICY "Allow All Select" ON cluster_requests FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow All Delete" ON cluster_requests;
CREATE POLICY "Allow All Delete" ON cluster_requests FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "Allow All Update" ON cluster_requests;
CREATE POLICY "Allow All Update" ON cluster_requests FOR UPDATE TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Select TT" ON time_tables;
CREATE POLICY "Allow All Select TT" ON time_tables FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow All Insert TT" ON time_tables;
CREATE POLICY "Allow All Insert TT" ON time_tables FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Select Insp" ON inspections;
CREATE POLICY "Allow All Select Insp" ON inspections FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow All Insert Insp" ON inspections;
CREATE POLICY "Allow All Insert Insp" ON inspections FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow All Update Insp" ON inspections;
CREATE POLICY "Allow All Update Insp" ON inspections FOR UPDATE TO anon WITH CHECK (true);
  `.trim();

  const handleVerify = async () => {
    let cleanUrl = creds.url.trim().replace(/\/+$/, "").replace(/^["']|["']$/g, '');
    const cleanKey = creds.key.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();
    
    if (cleanUrl.includes('supabase.com/dashboard')) {
        alert("Configuration Error: Please use the 'Project URL' from Settings > API.");
        return;
    }

    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    if (!cleanUrl || !cleanKey) { 
      alert("Binding Error: Supabase URL and API Key are required."); 
      return; 
    }

    setIsProcessing(true);
    try {
      const testEndpoint = `${cleanUrl}/rest/v1/users?select=id&limit=1`;
      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers: { 'apikey': cleanKey, 'Authorization': `Bearer ${cleanKey}` }
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid Security Key.");
      }

      localStorage.setItem('SUPABASE_URL', cleanUrl);
      localStorage.setItem('SUPABASE_KEY', cleanKey);
      setCreds({ ...creds, url: cleanUrl, key: cleanKey });
      setStep(2);
    } catch (e: any) {
      alert(`Handshake Failure: ${e.message}`);
    } finally { setIsProcessing(false); }
  };

  const finalizeProvisioning = async () => {
    setIsProcessing(true);
    try {
        localStorage.setItem('APP_NAME', creds.instName);
        const rootAdmin = {
            id: 'ADM-001',
            name: 'Master Administrator',
            role: UserRole.SUPER_ADMIN,
            assignment: 'Global Root',
            school: creds.instName,
            status: 'Verified' as const,
            email: 'admin@system.local',
            password: '1234',
            designation: 'System Architect'
        };
        const seedResult = await dataService.syncRecord('users', rootAdmin);
        if (seedResult.status === 'error') {
            const msg = seedResult.message || "";
            if (msg.includes('42P01')) {
                alert(`SQL Registry Error: "users" table missing. Run SQL blueprint first.`);
                setIsProcessing(false);
                return;
            }
            throw new Error(msg);
        }
        localStorage.setItem('SYSTEM_PROVISIONED', 'true');
        onComplete(creds);
    } catch (e: any) {
        alert(`Provisioning Error: ${e.message}`);
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A] z-[1000] flex items-center justify-center overflow-y-auto">
      <div className="w-full h-full md:h-auto md:max-w-[520px] bg-white/5 backdrop-blur-3xl border-white/10 md:border md:rounded-[3rem] p-8 md:p-12 text-center shadow-2xl relative animate-in zoom-in-95 duration-700">
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-4">
               <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-2xl mb-2 italic font-semibold text-white text-2xl">ES</div>
               <h2 className="text-3xl font-semibold text-white tracking-tighter leading-none">Provision Core</h2>
               <p className="text-white/40 text-[10px] font-medium uppercase tracking-[0.4em]">Master Fabric Initialization</p>
            </div>
            <div className="space-y-6 text-left">
              <SetupInput label="Supabase API URL" value={creds.url} onChange={(v: string) => setCreds({...creds, url: v})} placeholder="https://xyz.supabase.co" />
              <SetupInput label="Anon/Public API Key" value={creds.key} type="password" onChange={(v: string) => setCreds({...creds, key: v})} placeholder="Your project anon key" />
            </div>
            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-left">
               <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Handshake Protocol</p>
               <p className="text-[10px] text-white/60 leading-relaxed font-medium">Please ensure the v7.0 schema is applied to your project database to enable oversight tracking.</p>
            </div>
            <button onClick={() => setShowSql(!showSql)} className="text-[9px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">
              {showSql ? 'Hide SQL Blueprint' : 'View SQL Blueprint'}
            </button>
            {showSql && (
              <div className="bg-black/40 rounded-2xl p-5 text-left border border-white/10 animate-in slide-in-from-top-4">
                 <p className="text-[8px] font-mono text-emerald-400/60 mb-3 uppercase">Master Blueprint v7.0:</p>
                 <pre className="text-[8px] font-mono text-emerald-500 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40 custom-scrollbar">{sqlSchema}</pre>
                 <button onClick={() => { navigator.clipboard.writeText(sqlSchema); alert("Copied."); }} className="mt-4 w-full py-2 bg-white/5 text-[8px] font-black text-white rounded-lg">COPY SQL</button>
              </div>
            )}
            <button onClick={handleVerify} disabled={isProcessing} className="w-full h-16 bg-blue-600 text-white rounded-2xl font-semibold uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
              {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'VERIFY HANDSHAKE →'}
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl shadow-2xl mb-2 italic font-semibold text-white text-2xl">✓</div>
              <h2 className="text-3xl font-semibold text-white tracking-tighter leading-none">Identity Check</h2>
              <p className="text-white/40 text-[10px] font-medium uppercase tracking-[0.4em]">Branding & Authority</p>
            </div>
            <div className="text-left">
                <SetupInput label="Institution Name" value={creds.instName} onChange={(e: string) => setCreds({...creds, instName: e})} />
            </div>
            <button onClick={finalizeProvisioning} disabled={isProcessing} className="w-full h-16 bg-emerald-500 text-white rounded-2xl font-semibold uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 hover:bg-emerald-400 flex items-center justify-center gap-3">
              {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'LAUNCH HUB →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SetupInput = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
  <div className="space-y-3 group">
    <label className="text-[9px] font-semibold text-white/30 uppercase tracking-[0.2em] px-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-white/5 border-2 border-white/5 rounded-xl p-5 text-white text-sm font-medium outline-none focus:border-blue-500/40 transition-all" />
  </div>
);

export default SetupWizard;
