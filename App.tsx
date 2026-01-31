
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AttendanceModule from './components/AttendanceModule';
import AttendanceTerminal from './components/AttendanceTerminal';
import NFCSimulator from './components/NFCSimulator';
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
import Login from './components/Login';
import SetupWizard from './components/SetupWizard';
import { dataService } from './services/dataService';

export interface UserIdentity {
  id: string;
  name: string;
  role: UserRole;
  assignment: string;
  status: 'Active' | 'Verified';
  lastActive: string;
  email: string;
  password?: string;
  nfcUrl?: string;
  designation?: string;
  phone?: string;
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
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(true);

  const [masterSettings, setMasterSettings] = useState<MasterSettings>({
    appName: localStorage.getItem('APP_NAME') || 'EduSync Cloud',
    appCaption: 'Unified Management',
    footerCredits: '© 2026 EduSync Systems.',
    version: '5.2.0-cloud',
    smtpHost: 'smtp.relay.edu', smtpPort: '587', smtpUser: 'relay@edu', smtpPass: '****',
    smsApiKey: 'EDU-SMS', smsSenderId: 'THIBYAN', dbHost: localStorage.getItem('SUPABASE_URL') || 'Cloud',
    dbName: 'Fabric_v5', backupFrequency: 'Daily', backupTarget: 'Cloud', mailNotifications: true, smsAlerts: true
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
      const [dbUsers, dbAttendance, dbCampuses, dbClusters, dbSchools] = await Promise.all([
        dataService.getUsers(),
        dataService.getRecords('attendance'),
        dataService.getCampuses(),
        dataService.getClusters(),
        dataService.getSchools()
      ]);
      setUsers((dbUsers as UserIdentity[]) || []);
      setAttendanceRecords(dbAttendance || []);
      setCampuses(dbCampuses || []);
      setClusters(dbClusters || []);
      setSchools(dbSchools || []);
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
    if (isProvisioned) {
      syncRegistry();
    }
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
    localStorage.removeItem('AUTH_STATE');
    localStorage.removeItem('AUTH_ROLE');
    localStorage.removeItem('AUTH_NAME');
    localStorage.removeItem('AUTH_ID');
    localStorage.removeItem('AUTH_NODE');
  };

  const handleViewOperationalHub = (id: string, role: UserRole) => {
    setSelectedUserId(null);
    if (role === UserRole.STUDENT) {
      setSelectedStudentIdForDetails(id);
    } else {
      setSelectedFacultyIdForDetails(id);
    }
  };

  const renderContent = () => {
    if (isLoadingRegistry && users.length === 0) return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Cloud Registry...</p>
      </div>
    );

    if (selectedUserId) return (
      <UserProfile 
        user={users.find(u => u.id === selectedUserId)!} 
        loggedInRole={userRole} 
        onBack={() => setSelectedUserId(null)} 
        onUpdateUser={syncRegistry} 
        onViewOperationalDetails={handleViewOperationalHub}
      />
    );

    if (selectedStudentIdForDetails) return <StudentDetails users={users} attendanceRecords={attendanceRecords} studentId={selectedStudentIdForDetails} onBack={() => setSelectedStudentIdForDetails(null)} />;
    if (selectedFacultyIdForDetails) return <FacultyDetails users={users} attendanceRecords={attendanceRecords} facultyId={selectedFacultyIdForDetails} onBack={() => setSelectedFacultyIdForDetails(null)} />;
    if (selectedSchoolIdForDetails) return <SchoolDetails schoolId={selectedSchoolIdForDetails} users={users} attendanceRecords={attendanceRecords} onBack={() => setSelectedSchoolIdForDetails(null)} onSelectStudent={setSelectedStudentIdForDetails} onSelectFaculty={setSelectedFacultyIdForDetails} onSelectCluster={setSelectedClusterId} onSelectCampus={setSelectedCampusIdForDetails} />;
    if (selectedClusterId) return <ClusterDetails clusterId={selectedClusterId} clusters={clusters} users={users} schools={schools} attendanceRecords={attendanceRecords} onBack={() => setSelectedClusterId(null)} onSelectSchool={setSelectedSchoolIdForDetails} onSelectStudent={setSelectedStudentIdForDetails} onSelectFaculty={setSelectedFacultyIdForDetails} onSelectCampus={setSelectedCampusIdForDetails} />;
    if (selectedCampusIdForDetails) return <CampusDetails campusId={selectedCampusIdForDetails} onBack={() => setSelectedCampusIdForDetails(null)} onSelectCluster={setSelectedClusterId} onSelectSchool={setSelectedSchoolIdForDetails} />;

    switch (activeTab) {
      case 'dashboard': return <Dashboard userRole={userRole} userName={userName} lastSync={lastSync} onNavigate={navigateToTab} stats={{ campuses: campuses.length, clusters: clusters.length, schools: schools.length, users: users.length }} />;
      case 'terminal': return <AttendanceTerminal userId={userId} userName={userName} userRole={userRole} userAssignment={userAssignment} onSyncRegistry={syncRegistry} />;
      case 'super-admin': return <SuperAdminPanel users={users} settings={masterSettings} onUpdateSettings={setMasterSettings} onImpersonate={handleLogin} />;
      case 'users': 
      case 'users-rp':
      case 'users-faculties':
      case 'users-staffs':
      case 'users-students': {
        let initialFilter = 'All';
        if (activeTab === 'users-rp') initialFilter = UserRole.RESOURCE_PERSON;
        if (activeTab === 'users-faculties') initialFilter = UserRole.TEACHER;
        if (activeTab === 'users-staffs') initialFilter = 'Staffs';
        if (activeTab === 'users-students') initialFilter = UserRole.STUDENT;

        return <UserManagement 
          users={users} 
          onSelectUser={setSelectedUserId} 
          onDeleteUser={syncRegistry} 
          onAddUser={syncRegistry} 
          onUpdateUser={syncRegistry}
          initialRoleFilter={initialFilter}
        />;
      }
      case 'attendance': return <AttendanceModule userRole={userRole} userName={userName} userId={userId} users={users} attendanceRecords={attendanceRecords} onSyncRegistry={syncRegistry} onSelectUser={setSelectedUserId} onClose={() => navigateToTab('dashboard')} />;
      case 'directory': return <Directory onSelectCampus={setSelectedCampusIdForDetails} />;
      case 'clusters': return <ClusterManagement onSelectCluster={setSelectedClusterId} onSelectFaculty={setSelectedFacultyIdForDetails} />;
      case 'schools': return <SchoolManagement userRole={userRole} userAssignment={userAssignment} onSelectSchool={setSelectedSchoolIdForDetails} onSelectCluster={setSelectedClusterId} onSelectCampus={setSelectedCampusIdForDetails} users={users} />;
      case 'inspections': return <InspectionModule userRole={userRole} schools={schools} users={users} />;
      case 'shifts': 
      case 'shifts-category': return <ShiftCategoryManagement />;
      case 'shifts-templates': return <ShiftManagement initialView="Registry" />;
      case 'shifts-roster': return <ShiftManagement initialView="Roster" />;
      case 'governance': return <Governance users={users} onSyncComplete={syncRegistry} onSelectCampus={setSelectedCampusIdForDetails} onSelectCluster={setSelectedClusterId} onSelectSchool={setSelectedSchoolIdForDetails} />;
      default: return <Dashboard userRole={userRole} userName={userName} onNavigate={navigateToTab} stats={{ campuses: campuses.length, clusters: clusters.length, schools: schools.length, users: users.length }} />;
    }
  };

  if (!isProvisioned) return <SetupWizard onComplete={handleSetupComplete} />;
  if (!isAuthenticated) return <Login users={users} isLoading={isLoadingRegistry} onLogin={handleLogin} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={navigateToTab} userRole={userRole} userPermissions={[]} userName={userName} onLogout={handleLogout} appName={masterSettings.appName} appCaption={masterSettings.appCaption} footerCredits={masterSettings.footerCredits}>
      <div className="max-w-7xl mx-auto">{renderContent()}</div>
    </Layout>
  );
};

export default App;
