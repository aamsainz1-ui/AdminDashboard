
export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT'
}

export enum WorkMode {
  OFFICE = 'OFFICE',
  REMOTE = 'REMOTE'
}

export enum Language {
  TH = 'TH',
  EN = 'EN'
}

export enum LeaveType {
  SICK = 'SICK',
  ANNUAL = 'ANNUAL',
  PERSONAL = 'PERSONAL',
  OTHER = 'OTHER'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

// Core roles for system logic
export const UserRole = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE'
} as const;

export type UserRoleType = string;

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface AttendanceRecord {
  id: string;
  type: AttendanceType;
  workMode?: WorkMode;
  timestamp: number;
  location?: GeoLocation;
  timezone: string;
  notes?: string;
}

export interface LeaveRecord {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  requestedAt: number;
  employeeName?: string;
  employeeId?: string;
}

export interface OrganizationMember {
  id: string;
  name: string;
  position: string;
  department: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'OFFLINE';
  avatar: string;
  email: string;
  lastCheckIn?: number;
  teamId?: string;
  leaveBalances?: {
    sick: number;
    annual: number;
    personal: number;
  };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  category: 'GENERAL' | 'POLICY' | 'EVENT';
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  memberIds: string[];
  createdAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  position: string;
  department: string;
  employeeId: string;
  joinDate: string;
  company: string;
  avatar: string;
  role: UserRoleType;
  teamId?: string;
  storedFace?: string;
  faceSignature?: number[];
  pin?: string; // 4-6 digit PIN for switching accounts
  leaveBalances: {
    sick: number;
    annual: number;
    personal: number;
  };
}
export interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // radius in meters for geofencing
}

export interface WorkShift {
  name: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface SystemSettings {
  lateThresholdMinute: number;
  officeLocations: OfficeLocation[];
  workStartTimes: WorkShift[]; // Support multiple shifts with name and times
  availableRoles: string[]; // Dynamic roles manageable by owner
  rolePermissions?: RolePermissions; // Permission matrix for role-based access control
  teams: Team[]; // Teams in the organization
  enableGeofencing?: boolean; // Toggle geofencing on/off
  mktViewPermissions?: Record<string, string>; // userId → staff name to show in MKT
}

export interface DailySummaryRecord {
  id: string;
  employeeId: string;
  date: string;
  fb: number;
  google: number;
  tiktok: number;
  registrations: number;
  depositors: number;
  firstDeposit: number;
  fullDayDeposit: number;
  fullMonthDeposit: number;
}

export enum ContentPlatform {
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
  INSTAGRAM = 'INSTAGRAM'
}

export interface ContentPlan {
  id: string;
  title: string;
  description: string;
  platform: ContentPlatform;
  scheduledDate: string;
  status: 'DRAFT' | 'READY' | 'PUBLISHED';
  author: string;
  imageUrl?: string;
}

export interface PenaltyRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reason: string; // สาเหตุที่หัก
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  mealAllowance: number; // ค่าข้าว
  commission: number; // ค่าคอม
  bonus: number; // โบนัส
  overtime: number; // OT
  damageCost: number; // ยอดเสียหาย
  mistakePenalty: number; // ทำงานผิดพลาด
  debtRepayment: number; // หักหนี้
  remainingDebt: number; // หนี้คงเหลือ
  deductions: number; // หักรวม (คำนวณอัตโนมัติ)
  netPayable: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';
  paymentDate?: string;
  notes?: string;
}

export interface CompensationSettings {
  id: string;
  employeeId: string;
  baseSalary: number;
  commissionRate: number; // percentage
  allowances: number;
}

// Permission Management Types
export type PermissionKey =
  | 'dashboard'
  | 'history'
  | 'insights'
  | 'profile'
  | 'leave'
  | 'organization'
  | 'announcements'
  | 'content'
  | 'calendar'
  | 'payroll'
  | 'admin'
  | 'mkt'
  | 'mkt_edit'
  | 'chat'
  | 'chat_dm'
  | 'permissions'
  | 'teams';

export interface Permission {
  key: PermissionKey;
  label: string;
  labelTH: string;
  icon: string;
}

export interface RolePermissions {
  [role: string]: PermissionKey[];
}

