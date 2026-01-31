
import React, { useState } from 'react';
import { UserRole } from '../types';

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  type: 'Medical' | 'Personal' | 'Academic' | 'Emergency';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
}

const LeaveModule: React.FC<{ userRole: UserRole; userName: string }> = ({ userRole, userName }) => {
  const [activeView, setActiveView] = useState<'MyRequests' | 'PendingApprovals'>('MyRequests');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canApprove = [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.TEACHER].includes(userRole);

  const [myHistory, setMyHistory] = useState<LeaveRequest[]>([
    { id: 'L-101', userId: 'current', userName: userName, role: userRole, type: 'Personal', startDate: '2024-06-10', endDate: '2024-06-12', reason: 'Family event', status: 'Approved', appliedOn: '2024-05-20' },
    { id: 'L-102', userId: 'current', userName: userName, role: userRole, type: 'Medical', startDate: '2024-06-15', endDate: '2024-06-15', reason: 'Routine Checkup', status: 'Pending', appliedOn: '2024-05-22' },
  ]);

  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([
    { id: 'L-201', userId: 'STD-001', userName: 'Alice Thompson', role: UserRole.STUDENT, type: 'Medical', startDate: '2024-05-28', endDate: '2024-05-30', reason: 'Recovery from flu', status: 'Pending', appliedOn: '2024-05-24' },
    { id: 'L-202', userId: 'TEA-005', userName: 'Prof. David Miller', role: UserRole.TEACHER, type: 'Academic', startDate: '2024-06-01', endDate: '2024-06-03', reason: 'Curriculum Conference', status: 'Pending', appliedOn: '2024-05-24' },
  ]);

  const handleAction = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setPendingApprovals(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
    setNotification({ message: `Request ${id} has been ${newStatus.toLowerCase()}.`, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const submitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification({ message: "Leave application submitted to your supervisor.", type: 'success' });
    setShowApplyModal(false);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Leave Management</h2>
          <p className="text-slate-500 font-medium">Institutional absence & duty-exemption workflow</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowApplyModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            ➕ Apply for Leave
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveView('MyRequests')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeView === 'MyRequests' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          My History
          {activeView === 'MyRequests' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
        </button>
        {canApprove && (
          <button 
            onClick={() => setActiveView('PendingApprovals')}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeView === 'PendingApprovals' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            Pending Approvals
            <span className="ml-2 bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md text-[9px]">{pendingApprovals.filter(r => r.status === 'Pending').length}</span>
            {activeView === 'PendingApprovals' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee / Student</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type & Duration</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(activeView === 'MyRequests' ? myHistory : pendingApprovals).map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm">👤</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{req.userName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{req.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase tracking-widest">{req.type}</span>
                      <p className="text-xs font-bold text-slate-700">{req.startDate} → {req.endDate}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-slate-500 font-medium line-clamp-1 italic">"{req.reason}"</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      req.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {activeView === 'PendingApprovals' && req.status === 'Pending' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleAction(req.id, 'Approved')} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors" title="Approve">✅</button>
                        <button onClick={() => handleAction(req.id, 'Rejected')} className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" title="Reject">❌</button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(activeView === 'MyRequests' ? myHistory : pendingApprovals).length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-400 font-bold text-sm">No leave records found for this category.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
          <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>⚖️</span> Approval Hierarchy
          </h5>
          <p className="text-xs text-blue-800 leading-relaxed font-medium">
            Leaves follow a <strong>Superior-Subordinate Bond</strong>. Students apply to Teachers, Teachers to School Admins, and School Admins to Campus Heads. This ensures direct accountability and resource planning.
          </p>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-700 shadow-xl">
          <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>👁️</span> Visibility Rules
          </h5>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Data isolation is paramount. You can only view requests from users under your direct hierarchy. Peer-to-peer leave status is <strong>Masked</strong> to ensure staff privacy and prevent bias.
          </p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
          <h5 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>📉</span> Attendance Impact
          </h5>
          <p className="text-xs text-indigo-800 leading-relaxed font-medium">
            Approved leaves convert "Absent" marks into "Excused". This protects the user's <strong>Integrity Score</strong> and ensures institutional reporting accurately reflects professional conduct rather than simple absence.
          </p>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Request Exemption</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Submit your absence request for formal review.</p>
            
            <form onSubmit={submitApplication} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Start Date</label>
                  <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">End Date</label>
                  <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Reason for Absence</label>
                <textarea required rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Provide a professional explanation..."></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 ${notification.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'}`}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">{notification.type === 'success' ? '✨' : '⚠️'}</div>
          <p className="text-sm font-bold">{notification.message}</p>
        </div>
      )}
    </div>
  );
};

export default LeaveModule;
