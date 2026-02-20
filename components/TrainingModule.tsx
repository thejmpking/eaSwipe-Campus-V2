import React, { useState } from 'react';
import { UserRole } from '../types';
import { dataService } from '../services/dataService';

interface TrainingModuleProps {
  userRole: UserRole;
  userId: string;
  trainingEvents: any[];
  users: any[];
  onSync: () => void;
}

const TrainingModule: React.FC<TrainingModuleProps> = ({ userRole, userId, trainingEvents, users, onSync }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const isSupervisor = [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.RESOURCE_PERSON].includes(userRole);
  const selectedEvent = trainingEvents.find(e => e.id === selectedEventId);

  const handleVerification = async (traineeId: string, status: string) => {
    setIsCommitting(true);
    const record = {
      id: `TR-REC-${Date.now()}`,
      eventId: selectedEventId,
      userId: traineeId,
      status: status,
      verifiedAt: new Date().toLocaleTimeString()
    };
    await dataService.syncRecord('training_attendance', record);
    await onSync();
    setIsCommitting(false);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Institutional Training Shifts</h2>
          <p className="text-slate-500 font-medium">Verified professional development ledger</p>
        </div>
      </div>

      {!selectedEventId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainingEvents.map(event => (
            <div key={event.id} onClick={() => setSelectedEventId(event.id)} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group">
              <span className="px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest bg-indigo-50 text-indigo-700 mb-6 inline-block">{event.type}</span>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{event.title}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
              <div className="mt-6 space-y-2 border-t pt-6">
                <p className="text-xs text-slate-600 font-medium">📅 {event.date}</p>
                <p className="text-xs text-slate-600 font-medium">📍 {event.venue} • {event.startTime}</p>
              </div>
            </div>
          ))}
          {trainingEvents.length === 0 && <div className="col-span-full py-20 text-center text-[10px] font-medium text-slate-400 uppercase tracking-widest">No Events Found in Ledger</div>}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <button onClick={() => setSelectedEventId(null)} className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center gap-2">← Return to Events</button>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <h3 className="text-3xl font-semibold">{selectedEvent?.title}</h3>
                <p className="text-slate-400 mt-2 font-medium">{selectedEvent?.description}</p>
              </div>
              {userRole === UserRole.TEACHER && (
                 <button disabled={isCommitting} onClick={() => handleVerification(userId, 'Attended')} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold text-xs uppercase tracking-widest shadow-xl active:scale-95">📡 Tap to Verify</button>
              )}
            </div>
            <div className="p-10">
               <h4 className="text-lg font-semibold text-slate-900 mb-8">Registered Participants</h4>
               <div className="space-y-4">
                  {users.filter(u => u.role === UserRole.TEACHER).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">👤</div>
                          <div>
                             <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                             <p className="text-[9px] text-slate-400 font-medium uppercase">{u.id}</p>
                          </div>
                       </div>
                       {isSupervisor && <button onClick={() => handleVerification(u.id, 'Attended')} className="text-blue-600 text-[10px] font-semibold uppercase hover:underline">Mark Presence</button>}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingModule;