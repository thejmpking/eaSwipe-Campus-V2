
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types';
import { UserIdentity } from '../App';
import { dataService } from '../services/dataService';

interface UserManagementProps {
  users: UserIdentity[];
  onSelectUser?: (userId: string) => void;
  onDeleteUser: (id: string) => void;
  onAddUser: (user: UserIdentity) => void;
  onUpdateUser: (user: UserIdentity) => void;
  initialRoleFilter?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onSelectUser, onDeleteUser, onAddUser, onUpdateUser, initialRoleFilter = 'All' }) => {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserIdentity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter);
  
  const [availableNodes, setAvailableNodes] = useState<string[]>([]);
  
  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    role: UserRole.STUDENT,
    assignment: '',
    email: '',
    designation: '',
    password: '1234',
    nfcUrl: '',
    phone: '',
    dob: '',
    bloodGroup: 'O+',
    experience: '',
    address: '',
    emergencyContact: '',
    skills: '',
    yield: '0%'
  });

  useEffect(() => {
    setRoleFilter(initialRoleFilter);
  }, [initialRoleFilter]);

  useEffect(() => {
    const fetchNodes = async () => {
      const [schools, campuses] = await Promise.all([
        dataService.getSchools(),
        dataService.getCampuses()
      ]);
      const schoolNames = (schools || []).map((s: any) => s.name);
      const campusNames = (campuses || []).map((c: any) => c.name);
      setAvailableNodes([...new Set([...schoolNames, ...campusNames, 'Global Root'])]);
    };
    fetchNodes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.assignment) {
      alert("Binding Error: Primary Node Assignment is required.");
      return;
    }

    setIsCommitting(true);
    
    // CRITICAL FIX: Ensure empty dob is null for Postgres compatibility
    const identity: any = {
      id: userForm.id.trim() || `USR-${Math.floor(Math.random() * 10000)}`,
      name: userForm.name.trim(),
      role: userForm.role,
      assignment: userForm.assignment,
      status: 'Verified',
      lastActive: editingUser ? editingUser.lastActive : 'Never',
      email: userForm.email.trim(),
      password: userForm.password,
      nfcUrl: userForm.nfcUrl,
      designation: userForm.designation,
      phone: userForm.phone,
      dob: (!userForm.dob || userForm.dob === "") ? null : userForm.dob, 
      bloodGroup: userForm.bloodGroup,
      experience: userForm.experience,
      address: userForm.address,
      emergencyContact: userForm.emergencyContact,
      skills: userForm.skills,
      yield: userForm.yield
    };

    const res = await dataService.syncRecord('users', identity);
    if (res.status === 'success') {
      if (editingUser) onUpdateUser(identity as UserIdentity);
      else onAddUser(identity as UserIdentity);
      setIsProvisioning(false);
      setEditingUser(null);
    } else {
      alert("Cloud Commit Failed: Please verify your SQL deployment and field formats.");
    }
    setIsCommitting(false);
  };

  const handleOpenEdit = (user: UserIdentity) => {
    setEditingUser(user);
    setUserForm({
      id: user.id,
      name: user.name,
      role: user.role,
      assignment: user.assignment,
      email: user.email,
      designation: user.designation || '',
      password: user.password || '1234',
      nfcUrl: user.nfcUrl || '',
      phone: user.phone || '',
      dob: user.dob || '',
      bloodGroup: user.bloodGroup || 'O+',
      experience: user.experience || '',
      address: user.address || '',
      emergencyContact: user.emergencyContact || '',
      skills: user.skills || '',
      yield: user.yield || '0%'
    });
    setIsProvisioning(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesRole = roleFilter === 'All';
      if (!matchesRole) {
        if (roleFilter === 'Staffs') {
          matchesRole = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.CAMPUS_HEAD].includes(u.role);
        } else {
          matchesRole = u.role === roleFilter;
        }
      }
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Identity Registry</h2>
          <p className="text-slate-500 font-medium mt-3 text-lg">
            {roleFilter === 'All' ? 'Managing personnel binding to cloud nodes' : `Filtering by: ${roleFilter.replace('_', ' ')}`}
          </p>
        </div>
        <button onClick={() => { setEditingUser(null); setUserForm({id:'', name:'', role:UserRole.STUDENT, assignment:'', email:'', designation:'', password:'1234', nfcUrl:'', phone:'', dob:'', bloodGroup:'O+', experience:'', address:'', emergencyContact:'', skills:'', yield:'0%'}); setIsProvisioning(true); }} className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-95">➕ Provision Identity</button>
      </div>

      <div className="bg-white p-6 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
           <input type="text" placeholder="Search ID or Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner transition-all" />
           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer">
          <option value="All">All Tiers</option>
          <option value="Staffs">Staffs (Admins/Heads)</option>
          {Object.values(UserRole).map(role => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity Artifact</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jurisdictional Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden shadow-inner border border-white">
                         <img src={user.nfcUrl?.startsWith('data:') ? user.nfcUrl : `https://picsum.photos/seed/${user.id}/64/64`} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <button onClick={() => onSelectUser?.(user.id)} className="text-sm font-black text-slate-900 mb-1 hover:text-blue-600 transition-colors text-left block">
                          {user.name}
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')} • {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest truncate max-w-[180px] inline-block">{user.assignment}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handleOpenEdit(user)} className="px-4 py-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all border border-slate-100 text-[10px] font-black uppercase">Edit</button>
                       <button onClick={() => onSelectUser?.(user.id)} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all text-[10px] font-black uppercase shadow-lg shadow-blue-500/10">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isProvisioning && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-white max-w-5xl w-full rounded-[4rem] p-10 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[95vh] custom-scrollbar flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{editingUser ? 'Update Identity' : 'Provision Identity'}</h3>
                  <p className="text-slate-500 font-medium text-[11px] uppercase tracking-widest">Synchronizing Identity Artifact with Cloud Ledger</p>
                </div>
                <button onClick={() => setIsProvisioning(false)} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 transition-all">✕</button>
              </div>
              
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                 <div className="space-y-8">
                    <div className="space-y-4">
                       <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2">Institutional Mapping</h4>
                       <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional ID (Editable)</label>
                             <input type="text" required value={userForm.id} onChange={e => setUserForm({...userForm, id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="e.g. USR-XXXX" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Tier</label>
                               <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none appearance-none">
                                 {Object.values(UserRole).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                               <input type="date" value={userForm.dob} onChange={e => setUserForm({...userForm, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none" />
                            </div>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Node Assignment</label>
                          <select required value={userForm.assignment} onChange={e => setUserForm({...userForm, assignment: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none appearance-none">
                             <option value="" disabled>Select Assignment Node...</option>
                             {availableNodes.map(node => <option key={node} value={node}>{node}</option>)}
                          </select>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-2">Personal Identity</h4>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Full Name</label>
                          <input type="text" required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none" />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="space-y-4">
                       <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-100 pb-2">Credentials & Address</h4>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Security PIN</label>
                          <input type="password" required value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none tracking-widest" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Residence Address</label>
                          <input type="text" value={userForm.address} onChange={e => setUserForm({...userForm, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none" />
                       </div>
                    </div>
                 </div>

                 <div className="md:col-span-2 pt-6 flex gap-4 border-t border-slate-50">
                    <button type="button" disabled={isCommitting} onClick={() => setIsProvisioning(false)} className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest">Discard</button>
                    <button type="submit" disabled={isCommitting} className="flex-1 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-blue-700">
                      {isCommitting ? 'Committing...' : 'Commit to Registry'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
