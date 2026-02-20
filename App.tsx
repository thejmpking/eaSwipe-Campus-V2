
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AttendanceModule from './components/AttendanceModule';
import AttendanceTerminal from './components/AttendanceTerminal';
import InspectionModule from './components/InspectionModule';
import Directory from './components/Directory';
import CampusDetails from './components/CampusDetails';
import ClusterManagement from './components/ClusterManagement';
import ClusterDetails from './components/ClusterDetails';
import SchoolManagement from './components/SchoolManagement';
import SchoolDetails from './components/SchoolDetails';
import StudentDetails from './components/StudentDetails';
import FacultyDetails from './components/FacultyDetails';
import UserManagement from './components/UserManagement';
import UserProfile from './components/UserProfile';
import ShiftManagement from './components/ShiftManagement';
import ShiftCategoryManagement from './components/ShiftCategoryManagement';
import SuperAdminPanel, { MasterSettings } from './components/SuperAdminPanel';
import Governance from './components/Governance';
import TrainingModule from './components/TrainingModule';
import LeaveModule from './components/LeaveModule';
import ReportingModule from './components/ReportingModule';
import SystemHealth from './components/SystemHealth';
import AuditLogs from './components/AuditLogs';
import Login from './components/Login';
import SetupWizard from './components/SetupWizard';
import TimeTableModule from './components/TimeTableModule';
import { dataService } from './services/dataService';

export interface UserIdentity {
  id: string;
  name: string;
  role: UserRole;
  assignment: string; // Legacy field
  school?: string;    // Explicit working school
  cluster?: string;   // Explicit cluster jurisdiction
  status: 'Active' | 'Verified';
  lastActive: string;
  email: string;
  password?: string;
  nfcUrl?: string;
  designation?: string;
  phone?: string;
  whatsapp?: string; // Explicit WhatsApp Node
  dob?: string;
  bloodGroup?: string;
  experience?: string;
  yield?: string;
  skills?: string;
  emergencyContact?: string;
  address?: string;
}

const App: React.FC = () => {
  const [isProvisioned, setIsProvisioned] = useState<boolean>(() => localStorage.getItem('SYSTEM_PROVISIONED') === 'true');
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('AUTH_STATE') === 'true');
  const [userRole, setUserRole] = useState<UserRole>(() => (localStorage.getItem('AUTH_ROLE') as UserRole) || UserRole.ADMIN);
  const [userName, setUserName] = useState(() => localStorage.getItem('AUTH_NAME') || '');
  const [userId, setUserId] = useState(() => localStorage.getItem('AUTH_ID') || '');
  const [userAssignment, setUserAssignment] = useState(() => localStorage.getItem('AUTH_NODE') || 'Global Root');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastSync, setLastSync] = useState<string>('Never');
  
  const [users, setUsers] = useState<UserIdentity[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<any[]>([]);
  const [trainingEvents, setTrainingEvents] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [clusterRequests, setClusterRequests] = useState<any[]>([]); // Centralized requests
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(true);

  const [masterSettings, setMasterSettings] = useState<MasterSettings>({
    appName: localStorage.getItem('APP_NAME') || 'EduSync Cloud',
    appCaption: 'Unified Management',
    footerCredits: '© 2026 EduSync Systems.',
    version: '5.2.0-cloud',
    smtpHost: localStorage.getItem('SMTP_HOST') || 'smtp.relay.edu', 
    smtpPort: localStorage.getItem('SMTP_PORT') || '587', 
    smtpUser: localStorage.getItem('SMTP_USER') || 'relay@edu', 
    smtpPass: localStorage.getItem('SMTP_PASS') || '****',
    smsApiKey: 'EDU-SMS', smsSenderId: 'THIBYAN', dbHost: localStorage.getItem('SUPABASE_URL') || 'Cloud',
    dbName: 'Fabric_v5', backupFrequency: 'Daily', backupTarget: 'Cloud', mailNotifications: true, smsAlerts: true,
    logoUrl: localStorage.getItem('APP_LOGO') || '',
    faviconUrl: localStorage.getItem('APP_FAVICON') || '',
  });
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedCampusIdForDetails, setSelectedCampusIdForDetails] = useState<string | null>(null);
  const [selectedSchoolIdForDetails, setSelectedSchoolIdForDetails] = useState<string | null>(null);
  const [selectedStudentIdForDetails, setSelectedStudentIdForDetails] = useState<string | null>(null);
  const [selectedFacultyIdForDetails, setSelectedFacultyIdForDetails] = useState<string | null>(null);

  const navigateToTab = (tab: string) => {
    setSelectedUserId(null);
    setSelectedClusterId(null);
    setSelectedCampusIdForDetails(null);
    setSelectedSchoolIdForDetails(null);
    setSelectedStudentIdForDetails(null);
    setSelectedFacultyIdForDetails(null);
    setActiveTab(tab);
  };

  const syncRegistry = async () => {
    const provisioned = localStorage.getItem('SYSTEM_PROVISIONED') === 'true';
    if (!provisioned && !isProvisioned) return;

    setIsLoadingRegistry(true);
    try {
      const [dbUsers, dbAttendance, dbCampuses, dbClusters, dbSchools, dbTraining, dbLeave, dbAudit, dbShifts, dbShiftAssigns, dbRequests, dbInspections] = await Promise.all([
        dataService.getUsers(),
        dataService.getRecords('attendance'),
        dataService.getCampuses(),
        dataService.getClusters(),
        dataService.getSchools(),
        dataService.getRecords('training_events'),
        dataService.getRecords('leave_requests'),
        dataService.getRecords('audit_logs'),
        dataService.getRecords('shifts'),
        dataService.getRecords('shift_assignments'),
        dataService.getRecords('cluster_requests'),
        dataService.getRecords('inspections')
      ]);
      setUsers((dbUsers as UserIdentity[]) || []);
      setAttendanceRecords(dbAttendance || []);
      setCampuses(dbCampuses || []);
      setClusters(dbClusters || []);
      setSchools(dbSchools || []);
      setShifts(dbShifts || []);
      setShiftAssignments(dbShiftAssigns || []);
      setTrainingEvents(dbTraining || []);
      setLeaveRequests(dbLeave || []);
      setAuditLogs(dbAudit || []);
      setClusterRequests(dbRequests || []);
      setInspections(dbInspections || []);
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Cloud Registry Sync Failed", e);
    } finally {
      setIsLoadingRegistry(false);
    }
  };

  const handleSetupComplete = () => {
    setIsProvisioned(true);
    syncRegistry();
  };

  useEffect(() => { 
    if (isProvisioned) syncRegistry();
  }, [isProvisioned]);

  const handleLogin = (role: UserRole, name: string, assignment: string, id: string) => {
    setUserRole(role); setUserName(name); setUserAssignment(assignment); setUserId(id); setIsAuthenticated(true);
    localStorage.setItem('AUTH_STATE', 'true'); 
    localStorage.setItem('AUTH_ROLE', role); 
    localStorage.setItem('AUTH_NAME', name); 
    localStorage.setItem('AUTH_ID', id);
    localStorage.setItem('AUTH_NODE', assignment);
  };

  const handleLogout = () => {
    setIsAuthenticated(false); 
    setUserRole(UserRole.STUDENT);
    setUserName('');
    setUserId('');
    setUserAssignment('Global Root');
    setActiveTab('dashboard');
    setSelectedUserId(null);
    
    localStorage.removeItem('AUTH_STATE');
    localStorage.removeItem('AUTH_ROLE');
    localStorage.removeItem('AUTH_NAME');
    localStorage.removeItem('AUTH_ID');
    localStorage.removeItem('AUTH_NODE');
  };

  const handleOversightFromProfile = (id: string, role: UserRole) => {
    setSelectedUserId(null);
    if (role === UserRole.STUDENT) {
      setSelectedStudentIdForDetails(id);
    } else {
      setSelectedFacultyIdForDetails(id);
    }
  };

  const handleDeleteUserCleanup = (id: string) => {
    syncRegistry();
    setSelectedUserId(null);
    setSelectedStudentIdForDetails(null);
    setSelectedFacultyIdForDetails(null);
  };

  const unreadGlobalInspections = useMemo(() => {
    if (userRole !== UserRole.SCHOOL_ADMIN) return 0;
    const me = users.find(u => u.id === userId);
    const mySchool = (me?.school || me?.assignment || userAssignment || '').trim();
    // Strictly checking is_read from DB to avoid camelCase conflicts
    return inspections.filter(r => {
      const rSchool = (r.school || '').trim();
      return rSchool === mySchool && r.is_read === false;
    }).length;
  }, [inspections, userRole, userId, users, userAssignment]);

  const dashboardStats = useMemo(() => {
    if (userRole === UserRole.TEACHER) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const todayStr = now.toISOString().split('T')[0];
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      const myAttendance = attendanceRecords.filter(r => {
        if (r.userId !== userId) return false;
        const d = new Date(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (r.status === 'Present' || r.status === 'Late');
      });

      const myLeaves = attendanceRecords.filter(r => {
        if (r.userId !== userId) return false;
        const d = new Date(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (r.status === 'Absent' || r.status === 'On Leave');
      });

      // Find Today's Shift
      const myAssignment = shiftAssignments.find(a => 
        a.targetId === userId && 
        a.targetType === 'Individual' &&
        (todayStr === a.assignedDate || (todayStr >= a.startDate && todayStr <= a.endDate))
      );
      
      let shiftLabel = 'Unassigned';
      if (myAssignment) {
        const shift = shifts.find(s => s.id === myAssignment.shiftId);
        if (shift) shiftLabel = shift.label;
      }

      return {
        monthlyAttendance: `${myAttendance.length}/${daysInMonth}`,
        monthlyLeaves: myLeaves.length,
        todayShift: shiftLabel
      };
    }

    if (userRole === UserRole.RESOURCE_PERSON) {
      const rpUser = users.find(u => u.id === userId);
      const rpCluster = rpUser?.cluster || userAssignment;
      
      const clusterSchools = schools.filter(s => s.clusterName === rpCluster || s.clusterId === rpCluster);
      const schoolNames = clusterSchools.map(s => s.name);
      
      const clusterFaculty = users.filter(u => 
        u.role === UserRole.TEACHER && 
        (u.cluster === rpCluster || schoolNames.includes(u.school || u.assignment))
      );
      
      const clusterStudents = users.filter(u => 
        u.role === UserRole.STUDENT && 
        (u.cluster === rpCluster || schoolNames.includes(u.school || u.assignment))
      );

      return {
        schools: clusterSchools.length,
        faculty: clusterFaculty.length,
        students: clusterStudents.length
      };
    }

    if (userRole === UserRole.SCHOOL_ADMIN) {
      const mySchool = userAssignment;
      const schoolUsers = users.filter(u => u.assignment === mySchool || u.school === mySchool);
      
      const students = schoolUsers.filter(u => u.role === UserRole.STUDENT);
      const staff = schoolUsers.filter(u => u.role !== UserRole.STUDENT);
      
      const studentIds = students.map(u => u.id);
      const staffIds = staff.map(u => u.id);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecords = attendanceRecords.filter(r => r.date === todayStr);
      
      const studentPresent = todayRecords.filter(r => studentIds.includes(r.userId) && (r.status === 'Present' || r.status === 'Late')).length;
      const studentLeaves = todayRecords.filter(r => studentIds.includes(r.userId) && (r.status === 'Absent' || r.status === 'On Leave')).length;
      
      const staffPresent = todayRecords.filter(r => staffIds.includes(r.userId) && (r.status === 'Present' || r.status === 'Late')).length;
      const staffLeaves = todayRecords.filter(r => staffIds.includes(r.userId) && (r.status === 'Absent' || r.status === 'On Leave')).length;

      return {
        totalStudents: students.length,
        totalStaff: staff.length,
        studentPresent,
        studentLeaves,
        staffPresent,
        staffLeaves
      };
    }
    
    return {
      campuses: campuses.length,
      clusters: clusters.length,
      schools: schools.length,
      users: users.length
    };
  }, [userRole, userId, users, schools, campuses, userAssignment, attendanceRecords, shiftAssignments, shifts]);

  const renderContent = () => {
    if (isLoadingRegistry && users.length === 0) return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Querying Cloud Registry...</p>
      </div>
    );

    if (selectedUserId) return (
      <UserProfile 
        user={users.find(u => u.id === selectedUserId)!} 
        onBack={() => setSelectedUserId(null)} 
        onUpdateUser={syncRegistry} 
        onDeleteUser={handleDeleteUserCleanup}
        onOversight={handleOversightFromProfile}
        currentUserRole={userRole}
        currentUserId={userId}
      />
    );

    if (selectedStudentIdForDetails) return <StudentDetails users={users} attendanceRecords={attendanceRecords} studentId={selectedStudentIdForDetails} onBack={() => setSelectedStudentIdForDetails(null)} />;
    if (selectedFacultyIdForDetails) return <FacultyDetails users={users} attendanceRecords={attendanceRecords} shifts={shifts} shiftAssignments={shiftAssignments} facultyId={selectedFacultyIdForDetails} onBack={() => setSelectedFacultyIdForDetails(null)} />;
    if (selectedSchoolIdForDetails) return <SchoolDetails schoolId={selectedSchoolIdForDetails} users={users} attendanceRecords={attendanceRecords} onBack={() => setSelectedSchoolIdForDetails(null)} onSelectStudent={setSelectedStudentIdForDetails} onSelectFaculty={setSelectedFacultyIdForDetails} onSelectCluster={setSelectedClusterId} onSelectCampus={setSelectedCampusIdForDetails} />;
    if (selectedClusterId) return <ClusterDetails clusterId={selectedClusterId} clusters={clusters} users={users} schools={schools} attendanceRecords={attendanceRecords} onBack={() => setSelectedClusterId(null)} onSelectSchool={setSelectedSchoolIdForDetails} onSelectStudent={setSelectedStudentIdForDetails} onSelectFaculty={setSelectedFacultyIdForDetails} onSelectCampus={setSelectedCampusIdForDetails} />;
    if (selectedCampusIdForDetails) return <CampusDetails campusId={selectedCampusIdForDetails} users={users} attendanceRecords={attendanceRecords} onBack={() => setSelectedCampusIdForDetails(null)} onSelectCluster={setSelectedClusterId} onSelectSchool={setSelectedSchoolIdForDetails} />;

    switch (activeTab) {
      case 'dashboard': return <Dashboard userRole={userRole} userName={userName} lastSync={lastSync} onNavigate={navigateToTab} stats={dashboardStats} />;
      case 'terminal': return <AttendanceTerminal users={users} userId={userId} userName={userName} userRole={userRole} userAssignment={userAssignment} onSyncRegistry={syncRegistry} schools={schools} shifts={shifts} shiftAssignments={shiftAssignments} />;
      case 'super-admin': return <SuperAdminPanel users={users} settings={masterSettings} onUpdateSettings={setMasterSettings} onImpersonate={handleLogin} />;
      case 'users': return <UserManagement users={users} onSelectUser={setSelectedUserId} onDeleteUser={syncRegistry} onAddUser={syncRegistry} onUpdateUser={syncRegistry} initialRoleFilter="All" currentUserRole={userRole} currentUserId={userId} currentUserAssignment={userAssignment} schools={schools} clusters={clusters} campuses={campuses} />;
      case 'attendance': return <AttendanceModule userRole={userRole} currentUserAssignment={userAssignment} users={users} attendanceRecords={attendanceRecords} onSyncRegistry={syncRegistry} onSelectUser={setSelectedUserId} />;
      case 'directory': return <Directory onSelectCampus={setSelectedCampusIdForDetails} />;
      case 'clusters': return <ClusterManagement onSelectCluster={setSelectedClusterId} onSelectFaculty={setSelectedFacultyIdForDetails} onSyncRegistry={syncRegistry} />;
      case 'schools': return <SchoolManagement userRole={userRole} userAssignment={userAssignment} onSelectSchool={setSelectedSchoolIdForDetails} onSelectCluster={setSelectedClusterId} onSelectCampus={setSelectedCampusIdForDetails} users={users} currentUserId={userId} />;
      case 'inspections': return <InspectionModule userRole={userRole} schools={schools} users={users} userName={userName} userId={userId} />;
      case 'training': return <TrainingModule userRole={userRole} userId={userId} trainingEvents={trainingEvents} users={users} onSync={syncRegistry} />;
      case 'leave': return <LeaveModule userRole={userRole} userName={userName} userId={userId} leaveRequests={leaveRequests} onSync={syncRegistry} />;
      case 'reporting': return <ReportingModule userRole={userRole} userName={userName} users={users} attendanceRecords={attendanceRecords} schools={schools} clusters={clusters} />;
      case 'system-health': return <SystemHealth users={users} attendanceRecords={attendanceRecords} campuses={campuses} schools={schools} />;
      case 'audit-logs': return <AuditLogs logs={auditLogs} />;
      case 'shifts': return <ShiftManagement initialView="Registry" />;
      case 'timetable': return <TimeTableModule userRole={userRole} userId={userId} userAssignment={userAssignment} users={users} onSyncRegistry={syncRegistry} />;
      case 'governance': return <Governance users={users} currentUserRole={userRole} currentUserId={userId} userAssignment={userAssignment} settings={masterSettings} clusterRequests={clusterRequests} onUpdateSettings={setMasterSettings} onSyncComplete={syncRegistry} onViewProfile={(id) => setSelectedUserId(id)} onNavigate={navigateToTab} />;
      default: return <Dashboard userRole={userRole} userName={userName} onNavigate={navigateToTab} stats={dashboardStats} />;
    }
  };

  if (!isProvisioned) return <SetupWizard onComplete={handleSetupComplete} />;
  if (!isAuthenticated) return <Login users={users} isLoading={isLoadingRegistry} onLogin={handleLogin} />;

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={navigateToTab} 
      userRole={userRole} 
      userPermissions={[]} 
      userId={userId}
      userName={userName} 
      onViewProfile={(id) => { setSelectedUserId(id); }}
      customAvatar={users.find(u => u.id === userId)?.nfcUrl} 
      onLogout={handleLogout} 
      appName={masterSettings.appName} 
      appCaption={masterSettings.appCaption} 
      footerCredits={masterSettings.footerCredits}
      logoUrl={masterSettings.logoUrl}
      unreadCount={unreadGlobalInspections}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
