
import React, { useState } from 'react';
import { UserRole } from '../types';

interface TrainingEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  attendees: number;
  max: number;
  type: 'Pedagogy' | 'Leadership' | 'STEM' | 'Safety';
  status: 'Upcoming' | 'In-Progress' | 'Completed';
}

interface TraineeRecord {
  id: string;
  name: string;
  role: string;
  school: string;
  status: 'Pending' | 'Attended' | 'Excused' | 'No-Show';
  verifiedAt?: string;
}

const TrainingModule: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isMarkingSelf, setIsMarkingSelf] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const events: TrainingEvent[] = [
    { id: '1', title: 'Advanced Pedagogy Workshop', description: 'Interactive session on student engagement techniques.', date: '2024-05-24', time: '09:00 AM', venue: 'Auditorium A', attendees: 42, max: 50, type: 'Pedagogy', status: 'Upcoming' },
    { id: '2', title: 'Campus Leadership Seminar', description: 'Strategic planning for school administrators and heads.', date: '2024-05-25', time: '02:00 PM', venue: 'Boardroom', attendees: 12, max: 15, type: 'Leadership', status: 'In-Progress' },
    { id: '3', title: 'Robotics & STEM Integration', description: 'Practical training on the new STEM curriculum modules.', date: '2024-05-26', time: '11:00 AM', venue: 'Lab 4', attendees: 18, max: 30, type: 'STEM', status: 'Upcoming' },
  ];

  const mockTrainees: TraineeRecord[] = [
    { id: 'T-01', name: 'Prof. David Miller', role: 'Teacher', school: 'North Valley High', status: 'Attended', verifiedAt: '09:05 AM' },
    { id: 'T-02', name: 'Sarah Waters', role: 'Teacher', school: 'East Side Primary', status: 'Pending' },
    { id: 'T-03', name: 'James Wilson', role: 'Teacher', school: 'North Valley High', status: 'Excused' },
    { id: 'T-04', name: 'Elena Rodriguez', role: 'Teacher', school: 'Valley Middle', status: 'No-Show' },
  ];

  const isSupervisor = [UserRole.ADMIN, UserRole.CAMPUS_HEAD, UserRole.SCHOOL_ADMIN, UserRole.RESOURCE_PERSON].includes(userRole);
  const isTrainee = userRole === UserRole.TEACHER;

  const handleSelfMark = () => {
    setIsMarkingSelf(true);
    setTimeout(() => {
      setIsMarkingSelf(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }, 1500);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header & Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Institutional Training Shifts</h2>
          <p className="text-slate-500 font-medium">Event-based professional development tracking</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
           <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Global Progress</p>
              <p className="text-xs font-bold text-blue-600">84% Staff Certified</p>
           </div>
           <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">🏆</div>
        </div>
      </div>

      {!selectedEventId ? (
        /* Event List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div 
              key={event.id} 
              onClick={() => setSelectedEventId(event.id)}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  event.type === 'Pedagogy' ? 'bg-indigo-100 text-indigo-700' :
                  event.type === 'Leadership' ? 'bg-purple-100 text-purple-700' :
                  event.type === 'STEM' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {event.type}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${
                  event.status === 'In-Progress' ? 'text-emerald-500 flex items-center gap-1' : 'text-slate-400'
                }`}>
                  {event.status === 'In-Progress' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>}
                  {event.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{event.title}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <span className="opacity-60">📅</span> {event.date}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <span className="opacity-60">📍</span> {event.venue} • {event.time}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <span>Enrolled Attendees</span>
                  <span className="text-blue-600">{event.attendees}/{event.max}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                    style={{ width: `${(event.attendees / event.max) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Detailed Event Console */
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <button 
            onClick={() => setSelectedEventId(null)}
            className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center gap-2 mb-4"
          >
            ← Back to Events
          </button>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
                  {selectedEvent?.type} Shift
                </span>
                <h3 className="text-3xl font-black">{selectedEvent?.title}</h3>
                <p className="text-slate-400 mt-2 font-medium">{selectedEvent?.description}</p>
              </div>

              <div className="shrink-0 flex gap-4">
                {isTrainee && selectedEvent?.status === 'In-Progress' && (
                  <button 
                    onClick={handleSelfMark}
                    disabled={isMarkingSelf}
                    className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl shadow-white/5 active:scale-95"
                  >
                    {isMarkingSelf ? 'Verifying...' : '📡 Tap to Self-Verify'}
                  </button>
                )}
                {isSupervisor && (
                  <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                    ➕ Add Attendee
                  </button>
                )}
              </div>
            </div>

            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-lg font-bold text-slate-900">Registered Participants</h4>
                <div className="flex items-center gap-4">
                   <div className="text-xs font-bold text-slate-500">Total present: <span className="text-emerald-600">28</span></div>
                   <input type="text" placeholder="Search staff..." className="text-xs border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Staff Member</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Origin School</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-center">Participation Status</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {mockTrainees.map(trainee => (
                      <tr key={trainee.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">👤</div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{trainee.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{trainee.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-xs font-medium text-slate-600">{trainee.school}</td>
                        <td className="py-5 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            trainee.status === 'Attended' ? 'bg-emerald-100 text-emerald-700' :
                            trainee.status === 'Excused' ? 'bg-blue-100 text-blue-700' :
                            trainee.status === 'No-Show' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {trainee.status}
                          </span>
                          {trainee.verifiedAt && <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">TAP-IN: {trainee.verifiedAt}</p>}
                        </td>
                        <td className="py-5 px-4 text-right">
                          {isSupervisor && trainee.status === 'Pending' && (
                            <button className="text-blue-600 hover:underline text-[10px] font-black uppercase tracking-widest">Mark Present</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy & Logic Explanations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
          <h5 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>🎓</span> Event-Based Logic
          </h5>
          <p className="text-xs text-indigo-800 leading-relaxed font-medium">
            Training attendance is <strong>Non-Transactional</strong> with daily registers. While daily attendance tracks presence for pay, training tracking monitors <strong>Skill Acquisition</strong> and professional development credits.
          </p>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-700 shadow-xl">
          <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>📈</span> Reporting & Accountability
          </h5>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Shift reports reflect <strong>Participation Rates</strong> rather than simple presence. High participation in STEM workshops triggers institutional budget increases for classroom labs, creating a feedback loop for growth.
          </p>
        </div>

        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
          <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>🔔</span> Automated Notifications
          </h5>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Trainees receive push reminders 2 hours before a shift. Failing to mark self-attendance or being marked a "No-Show" by a supervisor sends an automated alert to the <strong>School Admin</strong>.
          </p>
        </div>
      </div>

      {/* Floating Success Notification */}
      {showNotification && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-8">
           <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xl">✨</div>
           <div>
              <p className="text-xs font-black uppercase tracking-widest">Workshop Verified</p>
              <p className="text-sm font-medium text-slate-300">Your participation in {selectedEvent?.title} has been logged.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default TrainingModule;
