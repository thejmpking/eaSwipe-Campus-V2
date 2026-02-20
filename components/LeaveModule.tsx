import React, { useState } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

interface LeaveModuleProps {
  userRole: UserRole;
  userName: string;
  userId: string;
  leaveRequests: any[];
  onSync: () => void;
}

const LeaveModule: React.FC<LeaveModuleProps> = ({ userRole, userId, leaveRequests, onSync }) => {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const canApprove = [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN].includes(userRole);
  const myHistory = leaveRequests.filter(r => r.userId === userId);
  const pendingForReview = leaveRequests.filter(r => r.status === 'Pending' && canApprove);

  const handleAction = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    setIsCommitting(true);
    const request = leaveRequests.find(r => r.id === id);
    if (request) {
      await dataService.syncRecord('leave_requests', { ...request, status: newStatus });
      await onSync();
    }
    setIsCommitting(false);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Leave Management</h2>
          <p className="text-slate-500 font-medium">Institutional absence & duty-exemption workflow</p>
        </div>
        <button onClick={() => setShowApplyModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">➕ Apply for Leave</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
         <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight">Active Ledger</h3>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{leaveRequests.length} Total Requests</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-white border-b">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Holder</th>
                    <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Type & Duration</th>
                    <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {leaveRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-5 text-sm font-semibold text-slate-800">{req.userName || req.userId}</td>
                       <td className="px-8 py-5">
                          <p className="text-xs font-semibold text-slate-700">{req.type} Exemption</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">{req.startDate} → {req.endDate}</p>
                       </td>
                       <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest ${
                            req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : req.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                          }`}>{req.status}</span>
                       </td>
                       <td className="px-8 py-5 text-right">
                          {canApprove && req.status === 'Pending' && (
                             <div className="flex justify-end gap-2">
                                <button onClick={() => handleAction(req.id, 'Approved')} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg">✅</button>
                                <button onClick={() => handleAction(req.id, 'Rejected')} className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg">✕</button>
                             </div>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default LeaveModule;