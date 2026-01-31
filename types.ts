
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CAMPUS_HEAD = 'CAMPUS_HEAD',
  RESOURCE_PERSON = 'RESOURCE_PERSON',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export type Permission = 
  | 'SEC_MASTER' 
  | 'GOV_POLICY' 
  | 'STRUCT_CONTROL' 
  | 'REGISTRY_SETUP' 
  | 'USER_LIFECYCLE' 
  | 'NFC_LIFECYCLE' 
  | 'INSP_UNANNOUNCED' 
  | 'ATTENDANCE_RECON' 
  | 'LEAVE_AUTHORITY' 
  | 'TRAINING_ADMIN' 
  | 'REPORT_GLOBAL' 
  | 'REPORT_RAW' 
  | 'AUDIT_LEDGER';

export interface Institution {
  id: string;
  name: string;
  type: 'Campus' | 'Cluster' | 'School';
  parentId?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  status: 'Present' | 'Absent' | 'Late';
  timestamp: string;
  schoolId: string;
  method: 'NFC' | 'Manual' | 'Facial';
}

export interface Shift {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  gracePeriod: number; // in minutes
  type: 'Standard' | 'Exam' | 'Special';
  status: 'Active' | 'Draft';
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  targetId: string; // Class ID or User ID
  targetName: string;
  targetType: 'Class' | 'Individual';
  assignedDate: string;
}

export interface TrainingShift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: string[];
}

export interface InspectionReport {
  id: string;
  inspectorId: string;
  schoolId: string;
  date: string;
  score: number;
  comments: string;
  status: 'Draft' | 'Submitted';
}
