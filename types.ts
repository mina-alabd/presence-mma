
export interface Employee {
  id: string;
  name: string;
  refId: string; // The "Reference ID" / الرقم التعريفي
  phone: string;
  company: string;
  status: 'active' | 'resigned';
}

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO string YYYY-MM-DD
  status: AttendanceStatus;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  isRead: boolean;
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  password?: string; // Optional when retrieving to UI
  role: 'admin' | 'user';
  displayName: string;
  permissions: {
    canEdit: boolean; // If false, read-only
    allowedCompanies: string[]; // List of company names, or ['*'] for all
  };
}

export interface AppState {
  employees: Employee[];
  attendance: AttendanceRecord[];
}
