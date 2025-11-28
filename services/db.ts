
import { Employee, AttendanceRecord, AttendanceStatus, User } from '../types';

const STORAGE_KEY_EMPLOYEES = 'app_employees';
const STORAGE_KEY_ATTENDANCE = 'app_attendance';
const STORAGE_KEY_USERS = 'app_users';

// --- Utility ---
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// --- Users Management ---

export const getUsers = (): User[] => {
  const data = localStorage.getItem(STORAGE_KEY_USERS);
  let users = data ? JSON.parse(data) : [];
  
  // Seed default admin if no users exist
  if (users.length === 0) {
    const adminUser: User = {
      id: 'admin-001',
      username: 'admin',
      password: 'admin123', // In a real app, hash this!
      displayName: 'المشرف العام',
      role: 'admin',
      permissions: {
        canEdit: true,
        allowedCompanies: ['*']
      }
    };
    users.push(adminUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }
  return users;
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  
  if (index >= 0) {
    // If updating, preserve password if not provided in update object
    if (!user.password) {
      user.password = users[index].password;
    }
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

export const deleteUser = (id: string): void => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};


// --- Employees Management ---

export const getEmployees = (): Employee[] => {
  const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  const employees = data ? JSON.parse(data) : [];
  // Ensure backward compatibility for existing records without status
  return employees.map((e: any) => ({
    ...e,
    status: e.status || 'active'
  }));
};

export const saveEmployee = (employee: Employee): void => {
  const employees = getEmployees();
  // Check if exists update, else add
  const index = employees.findIndex(e => e.id === employee.id);
  if (index >= 0) {
    employees[index] = employee;
  } else {
    employees.push(employee);
  }
  localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
};

export const deleteEmployee = (id: string): void => {
  const employees = getEmployees().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
  
  // Cleanup attendance
  const attendance = getAttendance().filter(a => a.employeeId !== id);
  localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendance));
};

// --- Attendance Management ---

export const getAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
  return data ? JSON.parse(data) : [];
};

export const saveAttendance = (employeeId: string, date: string, status: AttendanceStatus | null): void => {
  let attendance = getAttendance();
  // Remove existing record for this day/employee if exists
  attendance = attendance.filter(a => !(a.employeeId === employeeId && a.date === date));
  
  if (status) {
    attendance.push({
      id: `${employeeId}_${date}`,
      employeeId,
      date,
      status
    });
  }
  
  localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendance));
};

export const getEmployeeAttendance = (employeeId: string): AttendanceRecord[] => {
  return getAttendance().filter(a => a.employeeId === employeeId);
};
