
import React, { useState, useMemo, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { UserRole } from '../types';

interface RegistrySetupProps {
  type: 'departments' | 'designations' | 'classes';
  userAssignment?: string;
  isGlobalAdmin?: boolean;
  currentUserRole?: UserRole;
  onViewProfile?: (id: string) => void;
}

const RegistrySetup: React.FC<RegistrySetupProps> = ({ type, userAssignment = 'Global Root', isGlobalAdmin = false, currentUserRole, onViewProfile }) => {
  const [search, setSearch] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [managingItem, setManagingItem] = useState<any | null>(null);
  const [originalItem, setOriginalItem] = useState<any | null>(null);
  const [viewingSubclasses, setViewingSubclasses] = useState<any | null>(null);
  const [assigningTeacher, setAssigningTeacher] = useState<{ grade: string, class: any } | null>(null);
  const [unbindingArtifact, setUnbindingArtifact] = useState<{ grade: string, class: any } | null>(null);
  const [deletingArtifact, setDeletingArtifact] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [newGradeInput, setNewGradeInput] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [items, setItems] = useState<any[]>([]);

  const isTeacher = currentUserRole === UserRole.TEACHER;
  const canModify = !isTeacher && (isGlobalAdmin || currentUserRole === UserRole.SCHOOL_ADMIN || currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const results = await dataService.getRecords(type);
      if (Array.isArray(results)) {
        setItems(results.map(item => {
          const processed = { ...item };
          if (type === 'classes') {
            processed.grades = typeof item.grades === 'string' ? JSON.parse(item.grades) : (item.grades || []);
            const rawAssignments = item.teacher_assignments || item.teacherAssignments || {};
            processed.teacherAssignments = typeof rawAssignments === 'string' ? JSON.parse(rawAssignments) : rawAssignments;
            if (processed.teacher_assignments) delete processed.teacher_assignments;
          } else if (type === 'departments') {
            processed.classes = typeof item.classes === 'string' ? JSON.parse(item.classes) : (item.classes || []);
            if (processed.grades) delete processed.grades;
          }
          return processed;
        }));
      }

      if (type === 'classes') {
        const allUsers = await dataService.getUsers();
        if (Array.isArray(allUsers)) {
          setTeachers(allUsers.filter((u: any) => 
            u.role === UserRole.TEACHER && 
            (isGlobalAdmin || u.school === userAssignment || u.assignment === userAssignment)
          ));
        }
      }
    } catch (err) {
      console.error("Registry Fetch Fault:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchItems(); }, [type, userAssignment]);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
      if (isGlobalAdmin) return matchesSearch;
      // Strict school-based filtering for faculty/school-admin context
      return i.school === userAssignment && matchesSearch;
    });
  }, [items, isGlobalAdmin, userAssignment, search]);

  const [formData, setFormData] = useState({ name: '', head: '' });

  const handleOpenAdd = () => {
    setFormData({ name: '', head: '' });
    setIsAddingItem(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCommitting(true);
    const artifactId = `${type.charAt(0).toUpperCase()}-NEW-${Date.now().toString().slice(-6)}`;
    
    let newRecord: any = { 
      id: artifactId, 
      name: formData.name, 
      school: userAssignment,
      status: 'Active' 
    };

    if (type === 'departments') {
      newRecord = { ...newRecord, head: formData.head, staff: 0, classes: [] };
    } else if (type === 'classes') {
      newRecord = { ...newRecord, dept_id: 'D-GEN', dept_name: 'General', total_students: 0, grades: ['A'], teacherAssignments: {} };
    }
    
    const res = await dataService.syncRecord(type, newRecord);
    if (res.status === 'success') {
      await fetchItems();
      setIsAddingItem(false);
      triggerSuccess();
    } else {
      alert(`Provisioning Failure: ${res.message}`);
    }
    setIsCommitting(false);
  };

  const handleManage = (item: any) => {
    const itemCopy = JSON.parse(JSON.stringify(item));
    setManagingItem(itemCopy);
    setOriginalItem(JSON.parse(JSON.stringify(item)));
    setNewGradeInput('');
  };

  const triggerSuccess = () => {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const addSubArtifact = () => {
    if (!newGradeInput.trim() || !managingItem) return;
    const cleanGrade = newGradeInput.trim().toUpperCase();
    
    if (type === 'classes') {
      const grades = managingItem.grades || [];
      if (grades.includes(cleanGrade)) {
        alert("This grade artifact already exists in this class node.");
        return;
      }
      setManagingItem({
        ...managingItem,
        grades: [...grades, cleanGrade]
      });
    } else if (type === 'departments') {
       const classes = managingItem.classes || [];
       if (classes.includes(cleanGrade)) {
        alert("This class is already linked to this department.");
        return;
      }
      setManagingItem({
        ...managingItem,
        classes: [...classes, cleanGrade]
      });
    }
    setNewGradeInput('');
  };

  const removeSubArtifact = (artifact: string) => {
    if (!managingItem) return;
    if (type === 'classes') {
      const nextGrades = (managingItem.grades || []).filter((g: string) => g !== artifact);
      const nextAssignments = { ...(managingItem.teacherAssignments || {}) };
      delete nextAssignments[artifact]; 
      
      setManagingItem({
        ...managingItem,
        grades: nextGrades,
        teacherAssignments: nextAssignments
      });
    } else if (type === 'departments') {
      setManagingItem({
        ...managingItem,
        classes: (managingItem.classes || []).filter((c: string) => c !== artifact)
      });
    }
  };

  const isDirty = useMemo(() => {
    if (!managingItem || !originalItem) return false;
    return JSON.stringify(managingItem) !== JSON.stringify(originalItem);
  }, [managingItem, originalItem]);

  const handleUpdateManagedItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!managingItem) return;
    setIsCommitting(true);
    
    const payload = { ...managingItem };
    if (payload.teacher_assignments) delete payload.teacher_assignments;
    
    try {
      const res = await dataService.syncRecord(type, payload);
      if (res.status === 'success') {
        await fetchItems();
        setManagingItem(null);
        setOriginalItem(null);
        triggerSuccess();
      } else {
        alert(`Propagation Failure: ${res.message}`);
      }
    } catch (err) {
      alert("Infrastructure Fault.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleAssignTeacher = async (teacherName: string) => {
    if (!assigningTeacher || isCommitting) return;
    setIsCommitting(true);

    const { grade, class: parentClass } = assigningTeacher;
    const nextAssignments = { ...(parentClass.teacherAssignments || {}), [grade]: teacherName };
    
    const payload = { ...parentClass };
    if (payload.teacher_assignments) delete payload.teacher_assignments;
    payload.teacherAssignments = nextAssignments;

    try {
      const res = await dataService.syncRecord('classes', payload);
      if (res.status === 'success') {
        await fetchItems();
        if (viewingSubclasses && viewingSubclasses.id === parentClass.id) {
           const updatedView = { ...parentClass, teacherAssignments: nextAssignments };
           setViewingSubclasses(updatedView);
        }
        setAssigningTeacher(null);
        triggerSuccess();
      } else {
         alert(`Handshake Failure: ${res.message}`);
      }
    } catch (err) {
      alert("Handshake failed.");
    } finally {
      setIsCommitting(false);
    }
  };

  const executeUnbindArtifact = async () => {
    if (!unbindingArtifact || isCommitting) return;
    
    const { grade, class: parentClass } = unbindingArtifact;
    const nextAssignments = { ...(parentClass.teacherAssignments || {}) };
    delete nextAssignments[grade];

    const originalRoster = viewingSubclasses;
    setIsCommitting(true);

    try {
      if (viewingSubclasses && viewingSubclasses.id === parentClass.id) {
        setViewingSubclasses({ ...parentClass, teacherAssignments: nextAssignments });
      }

      const payload = { ...parentClass };
      if (payload.teacher_assignments) delete payload.teacher_assignments;
      payload.teacherAssignments = nextAssignments;

      const res = await dataService.syncRecord('classes', payload);
      
      if (res.status === 'success') {
        await fetchItems();
        setUnbindingArtifact(null);
        triggerSuccess();
      } else {
        setViewingSubclasses(originalRoster);
        alert(`Registry Failure: ${res.message}`);
      }
    } catch (err) {
      setViewingSubclasses(originalRoster);
      alert("Infrastructure Fault: Node communication interrupted.");
    } finally {
      setIsCommitting(false);
    }
  };

  const executeDecommission = async () => {
    if (!deletingArtifact || isCommitting) return;
    setIsCommitting(true);
    const res = await dataService.deleteRecord(type, deletingArtifact.id);
    if (res.status === 'success') {
      await fetchItems();
      setDeletingArtifact(null);
      triggerSuccess();
    } else {
      alert(`Decommissioning Failure: ${res.message}`);
    }
    setIsCommitting(false);
  };

  const handleFacultyClick = (name: string) => {
    if (!onViewProfile) return;
    const teacher = teachers.find(t => t.name === name);
    if (teacher) {
      setViewingSubclasses(null);
      onViewProfile(teacher.id);
    } else {
      alert("Artifact Search Error: Identity node not found in local cache.");
    }
  };

  if (isLoading && items.length === 0) return <div className="p-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry...</div>;

  // Refined header logic to avoid "School Registry" confusion
  const headerTitle = `${type} Registry`;
  const contextLabel = isGlobalAdmin ? 'Global Root' : 'School-Level Node';

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
           <span>✓</span> Registry Synchronized
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 px-3 md:px-0">
        <div>
          <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight leading-none uppercase">{headerTitle}</h2>
          <p className="text-slate-400 font-bold mt-2 text-[9px] md:text-xs uppercase tracking-widest">{contextLabel}: <span className="text-blue-600">{userAssignment}</span></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
           <div className="relative flex-1">
              <input 
                type="text" 
                placeholder={`Filter ${type}...`} 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 h-14 md:h-16 text-xs font-bold outline-none shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-xs">🔍</span>
           </div>
           {canModify && (
             <button onClick={handleOpenAdd} className="w-full sm:w-auto bg-slate-900 text-white px-8 h-14 md:h-16 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
               <span>➕</span> Provision {type.slice(0, -1)}
             </button>
           )}
        </div>
      </div>

      {/* ITEMS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 px-3 md:px-0">
        {filteredItems.map((item: any) => (
          <div key={item.id} className="bg-white p-5 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full ring-1 ring-slate-50">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl md:text-3xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {type === 'departments' ? '🏢' : '📚'}
              </div>
              <span className="text-[7px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">ID: #{String(item.id).slice(-6)}</span>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg md:text-2xl font-black text-slate-900 mb-1 uppercase tracking-tight truncate">{item.name}</h3>
              <p className="text-[8px] md:text-[10px] text-blue-500 font-black uppercase mb-6 tracking-widest opacity-60 truncate">@{item.school}</p>
              
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                 <div className="bg-slate-50 p-3 md:p-5 rounded-2xl border border-slate-100/50">
                    <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{type === 'classes' ? 'Grades' : 'Classes'}</p>
                    <p className="text-xs md:text-lg font-black text-slate-700">{(type === 'departments' ? item.classes : item.grades)?.length || 0} Linked</p>
                 </div>
                 <div className="bg-slate-50 p-3 md:p-5 rounded-2xl border border-slate-100/50">
                    <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Students</p>
                    <p className="text-xs md:text-lg font-black text-slate-700">{type === 'departments' ? item.staff : item.total_students}</p>
                 </div>
              </div>
            </div>

            <div className="mt-6 md:mt-10 pt-5 md:pt-8 border-t border-slate-50 flex gap-2 md:gap-3 flex-wrap">
               {canModify && (
                 <button 
                  onClick={() => handleManage(item)}
                  className="flex-1 min-w-[80px] h-14 md:h-16 bg-slate-50 text-slate-500 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                 >
                   Config
                 </button>
               )}
               {type === 'classes' && (
                 <button 
                  onClick={() => setViewingSubclasses(item)}
                  className={`min-w-[120px] h-14 md:h-16 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-blue-600 transition-all active:scale-95 ${canModify ? 'flex-[2]' : 'flex-1'}`}
                 >
                   View Roster
                 </button>
               )}
               {canModify && (
                 <button onClick={() => setDeletingArtifact(item)} className="w-14 h-14 md:w-16 md:h-16 bg-rose-50 text-rose-400 rounded-xl md:rounded-2xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center text-xs">🗑️</button>
               )}
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No {type} nodes registered for {userAssignment}.</p>
          </div>
        )}
      </div>

      {/* MODAL: PROVISION NEW */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-xl w-full rounded-t-[2.5rem] md:rounded-[4rem] p-6 md:p-14 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">Provision {type.slice(0, -1)}</h3>
                    <p className="text-slate-400 text-[9px] md:text-[11px] font-black uppercase tracking-widest mt-2">Node: {userAssignment}</p>
                 </div>
                 <button onClick={() => setIsAddingItem(false)} className="w-10 h-10 bg-slate-50 hover:bg-rose-50 rounded-xl flex items-center justify-center text-slate-400">✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 pb-10 md:pb-0">
                 <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{type === 'classes' ? 'Class Identifier' : 'Entity Label'}</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 md:h-16 px-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner uppercase" placeholder={type === 'classes' ? 'e.g. 5' : 'e.g. Main Science'} />
                 </div>
                 {type === 'departments' && (
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Assigned Unit Head</label>
                       <input type="text" value={formData.head} onChange={e => setFormData({...formData, head: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 md:h-16 px-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner" placeholder="e.g. Dr. Salman" />
                    </div>
                 )}
                 <div className="flex flex-col sm:flex-row gap-3 pt-6">
                    <button type="button" onClick={() => setIsAddingItem(false)} className="w-full sm:flex-1 h-14 md:h-16 bg-slate-100 text-slate-600 rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest active:scale-95">Discard</button>
                    <button type="submit" disabled={isCommitting} className="w-full sm:flex-[2] h-14 md:h-16 bg-blue-600 text-white rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2">
                      {isCommitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Commit Node'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: ROSTER VIEW */}
      {viewingSubclasses && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-4xl w-full rounded-t-[3rem] md:rounded-[4.5rem] p-5 md:p-14 shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-700 max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex justify-between items-start mb-8 md:mb-12 sticky top-0 bg-white z-10 py-1">
                 <div>
                    <h3 className="text-xl md:text-5xl font-black text-slate-900 tracking-tight leading-none uppercase truncate max-w-[200px] md:max-w-none">{viewingSubclasses.name} Roster</h3>
                    <p className="text-blue-600 text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-2">Sectional Deployment Hub</p>
                 </div>
                 <button onClick={() => setViewingSubclasses(null)} className="w-10 h-10 md:w-14 md:h-14 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-xl md:rounded-[2rem] text-slate-400">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pb-10 md:pb-0">
                 {(viewingSubclasses.grades || []).map((grade: string) => {
                    const assignedTeacher = viewingSubclasses.teacherAssignments?.[grade];
                    return (
                      <div key={grade} className="bg-slate-50/50 border-2 border-slate-100 rounded-[2rem] p-5 md:p-8 hover:border-blue-400 hover:bg-white transition-all group flex flex-col h-full shadow-inner hover:shadow-xl relative overflow-hidden ring-1 ring-slate-100/50">
                         <div className="flex justify-between items-start mb-6 md:mb-10 relative z-10">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center text-xl md:text-4xl shadow-sm border border-slate-100 font-black text-blue-600 shrink-0">
                               {viewingSubclasses.name}{grade}
                            </div>
                            <span className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-widest bg-white px-2 py-0.5 rounded shadow-xs">Artifact</span>
                         </div>
                         
                         <div className="flex-1 space-y-3 relative z-10">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Class Faculty</p>
                            {assignedTeacher ? (
                               <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 shadow-sm">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shadow-inner shrink-0">👨‍🏫</div>
                                  <button 
                                    onClick={() => handleFacultyClick(assignedTeacher)}
                                    className="text-[11px] md:text-xs font-black text-slate-800 truncate uppercase tracking-tight hover:text-blue-600 transition-colors"
                                  >
                                    {assignedTeacher}
                                  </button>
                               </div>
                            ) : (
                               <p className="text-[9px] text-rose-400 font-black uppercase italic tracking-tighter animate-pulse">NO FACULTY BINDING</p>
                            )}
                         </div>

                         <div className="mt-6 md:mt-10 flex flex-col gap-2 relative z-10">
                            {canModify && (
                              <>
                                <button 
                                  onClick={() => setAssigningTeacher({ grade, class: viewingSubclasses })}
                                  disabled={isCommitting}
                                  className="w-full h-12 md:h-14 bg-white border-2 border-slate-100 text-slate-600 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all active:scale-95 shadow-xs"
                                >
                                  {assignedTeacher ? 'Update Binding' : 'Bind Faculty'}
                                </button>
                                {assignedTeacher && (
                                   <button 
                                    onClick={() => setUnbindingArtifact({ grade, class: viewingSubclasses })}
                                    disabled={isCommitting}
                                    className="w-full py-2 text-rose-400 text-[8px] font-black uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                                   >
                                     <span>🗑️ Unbind Artifact</span>
                                   </button>
                                )}
                              </>
                            )}
                         </div>
                      </div>
                    );
                 })}
              </div>
           </div>
        </div>
      )}

      {/* MODAL: ASSIGN TEACHER */}
      {assigningTeacher && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase">Assign Faculty</h3>
                   <p className="text-[9px] font-black text-blue-600 uppercase mt-1">Grade {assigningTeacher.class.name}{assigningTeacher.grade}</p>
                </div>
                <button onClick={() => setAssigningTeacher(null)} className="text-slate-400 hover:text-rose-600">✕</button>
             </div>
             
             <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2 mb-8">
               {teachers.map(t => (
                 <button 
                   key={t.id} 
                   onClick={() => handleAssignTeacher(t.name)}
                   disabled={isCommitting}
                   className="w-full p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl flex items-center gap-4 transition-all text-left group"
                 >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 overflow-hidden shadow-sm shrink-0">
                       <img src={`https://picsum.photos/seed/${t.id}/64/64`} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                       <p className="text-xs font-black text-slate-800 uppercase truncate group-hover:text-blue-600">{t.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">ID: {t.id}</p>
                    </div>
                 </button>
               ))}
               {teachers.length === 0 && (
                 <div className="py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">No faculty available</p>
                 </div>
               )}
             </div>
             
             <button 
               onClick={() => setAssigningTeacher(null)} 
               className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
             >
               Cancel Binding
             </button>
          </div>
        </div>
      )}

      {/* MODAL: UNBIND CONFIRMATION */}
      {unbindingArtifact && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[350] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">⚠️</div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">Unbind Protocol</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                Permanently dissolve the faculty relationship for <span className="font-black text-slate-900">{unbindingArtifact.class.name}{unbindingArtifact.grade}</span>? This action is recorded in the audit ledger.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={executeUnbindArtifact}
                  disabled={isCommitting}
                  className="w-full h-14 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                   {isCommitting ? (
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     'Dissolve Binding'
                   )}
                 </button>
                 <button 
                  onClick={() => setUnbindingArtifact(null)}
                  disabled={isCommitting}
                  className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                 >
                   Cancel Protocol
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: PURGE ARTIFACT CONFIRMATION */}
      {deletingArtifact && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[350] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 text-center">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-pulse">🗑️</div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">Irreversible Purge</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                Permanently decommission registry node <span className="font-black text-slate-900">{deletingArtifact.name}</span>? This action dissolves all bound sub-artifacts and is logged in the sovereign audit trail.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={executeDecommission}
                  disabled={isCommitting}
                  className="w-full h-14 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                   {isCommitting ? (
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     'Commit Purge'
                   )}
                 </button>
                 <button 
                  onClick={() => setDeletingArtifact(null)}
                  disabled={isCommitting}
                  className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                 >
                   Abort Protocol
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: CONFIG (STANDARDIZED HEIGHTS & DEFAULT STYLING) */}
      {managingItem && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-2xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-2xl w-full rounded-t-[2.5rem] md:rounded-[4rem] shadow-2xl animate-in slide-in-from-bottom-full md:zoom-in-95 duration-500 h-[92vh] md:max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* MODAL HEADER: STICKY DESKTOP & MOBILE */}
              <div className="px-6 py-6 md:px-14 md:py-10 border-b border-slate-100 flex justify-between items-start bg-white/90 backdrop-blur-md shrink-0 z-20">
                 <div>
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                       <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                       <p className="text-blue-600 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">Node Config Hub</p>
                    </div>
                    <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-none uppercase truncate max-w-[180px] md:max-w-none">{managingItem.name} Registry</h3>
                 </div>
                 <button 
                   onClick={() => { if (isDirty && !confirm("Discard staged changes?")) return; setManagingItem(null); }} 
                   className="w-10 h-10 md:w-14 md:h-14 bg-slate-50 hover:bg-rose-50 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center text-slate-400 hover:text-rose-600 shadow-sm border border-slate-100 transition-all shrink-0 active:scale-90"
                 >
                    ✕
                 </button>
              </div>

              {/* SCROLLABLE FORM CONTENT */}
              <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/30">
                <div className="px-6 py-8 md:px-14 space-y-12 pb-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1.5">Label Identity</label>
                         <input 
                           type="text" 
                           value={managingItem.name} 
                           onChange={e => setManagingItem({...managingItem, name: e.target.value})}
                           className="w-full bg-white border-2 border-slate-100 h-14 md:h-16 rounded-2xl md:rounded-3xl px-5 text-sm font-black outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-400 shadow-sm uppercase transition-all" 
                         />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1.5">Authority Node</label>
                         <div className="w-full bg-slate-100 border-2 border-slate-200 h-14 md:h-16 rounded-2xl md:rounded-3xl px-5 flex items-center text-[10px] md:text-xs font-black text-slate-400 cursor-not-allowed uppercase shadow-inner">
                            {managingItem.school}
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between px-1.5">
                         <h4 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                           <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                           Sectional Mesh
                         </h4>
                         <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest">
                            {type === 'classes' ? 'Grades' : 'Classes'}: {(type === 'classes' ? (managingItem.grades || []) : (managingItem.classes || [])).length}
                         </span>
                      </div>
                      
                      <div className="p-6 md:p-10 bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8 ring-1 ring-slate-200/20">
                         <div className="space-y-6">
                            <div className="flex flex-wrap gap-2.5 md:gap-3">
                               {(type === 'classes' ? (managingItem.grades || []) : (managingItem.classes || []))?.map((sub: string) => {
                                 const isNew = !originalItem || !(type === 'classes' ? (originalItem.grades || []) : (originalItem.classes || [])).includes(sub);
                                 return (
                                   <div key={sub} className={`flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-2xl border shadow-sm animate-in zoom-in-95 transition-all duration-300 ${isNew ? 'bg-indigo-600 border-indigo-500 text-white scale-105' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                      <span className={`text-[11px] md:text-xs font-black uppercase tracking-tight ${isNew ? 'text-white' : 'text-slate-800'}`}>
                                        {type === 'classes' ? `${managingItem.name}${sub}` : sub}
                                      </span>
                                      <button 
                                       type="button" 
                                       onClick={() => removeSubArtifact(sub)}
                                       className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black transition-all active:scale-75 ${isNew ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-300 border border-slate-100'}`}
                                      >✕</button>
                                   </div>
                                 );
                               })}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                               <input 
                                 type="text" 
                                 placeholder={type === 'classes' ? "Enter Grade (e.g. A)" : "Enter Class Name..."}
                                 value={newGradeInput}
                                 onChange={e => setNewGradeInput(e.target.value)}
                                 onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubArtifact(); } }}
                                 className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl h-14 md:h-16 px-5 text-xs font-black outline-none focus:bg-white focus:border-blue-400 focus:ring-8 focus:ring-blue-500/5 shadow-inner uppercase transition-all placeholder:normal-case"
                               />
                               <button 
                                 type="button" 
                                 onClick={addSubArtifact}
                                 className="px-10 h-14 md:h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-xl active:scale-95 transition-all hover:bg-blue-600 shrink-0"
                               >
                                 BIND NODE
                               </button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>

              {/* PERFECTED STICKY ACTION BAR - STANDARDIZED DEFAULT HEIGHTS */}
              <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-6 md:px-14 md:pb-12 md:pt-10 shrink-0 flex flex-col sm:flex-row gap-4 z-30 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
                 <button 
                   type="button" 
                   onClick={() => { if (isDirty && !confirm("Discard changes?")) return; setManagingItem(null); }} 
                   className="w-full sm:flex-1 h-14 md:h-16 bg-slate-50 text-slate-500 rounded-2xl md:rounded-[1.8rem] font-black text-[11px] md:text-xs uppercase tracking-widest active:scale-95 transition-all border border-slate-100 hover:bg-slate-100 shadow-sm"
                 >
                   Discard
                 </button>
                 
                 <div className="flex-[2] flex flex-col gap-2.5">
                    <button 
                      type="button" 
                      onClick={() => handleUpdateManagedItem()}
                      disabled={isCommitting || !isDirty} 
                      className={`w-full h-14 md:h-16 rounded-2xl md:rounded-[1.8rem] font-black text-[11px] md:text-xs uppercase tracking-[0.25em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group ${
                        isDirty 
                        ? 'bg-blue-600 text-white shadow-blue-500/40 hover:bg-blue-700 ring-4 ring-blue-500/10' 
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-50'
                      }`}
                    >
                      {isCommitting ? (
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className="relative z-10">PROPAGATE REGISTRY</span>
                          {isDirty && (
                            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          )}
                        </>
                      )}
                    </button>
                    {isDirty && (
                      <div className="flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                         <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                         <p className="text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-[0.25em] text-center">Identity changes staged for commit</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default RegistrySetup;
