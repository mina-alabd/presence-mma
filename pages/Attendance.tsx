
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Search, ChevronRight, ChevronLeft, Check, X, Building, Lock } from 'lucide-react';
import * as db from '../services/db';
import { Employee, AttendanceRecord, AttendanceStatus } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const Attendance: React.FC = () => {
  const { canEdit, canViewCompany } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadData();
  }, [currentDate]); 

  const loadData = () => {
    const allEmployees = db.getEmployees();
    const visibleEmployees = allEmployees.filter(e => canViewCompany(e.company));
    setEmployees(visibleEmployees);
    setAttendanceData(db.getAttendance());
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const handleStatusChange = (employeeId: string, date: Date, status: AttendanceStatus) => {
    if (!canEdit) return; // Guard clause for permissions

    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check current status
    const currentRecord = attendanceData.find(
      a => a.employeeId === employeeId && a.date === dateStr
    );

    let newStatus: AttendanceStatus | null = status;

    // If clicking the same status, toggle it off (remove record)
    if (currentRecord && currentRecord.status === status) {
      newStatus = null;
    }

    db.saveAttendance(employeeId, dateStr, newStatus);
    
    // Check for "Unexpected Absence" Alert logic
    // If status is being set to 'absent', trigger a notification
    if (newStatus === 'absent' && (!currentRecord || currentRecord.status !== 'absent')) {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        addNotification(
          'تنبيه غياب',
          `تم تسجيل غياب للموظف ${employee.name} بتاريخ ${dateStr}.`,
          'alert'
        );
      }
    }

    // Optimistic update for UI
    const updatedAttendance = db.getAttendance();
    setAttendanceData(updatedAttendance);
  };

  const getStatusForDay = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceData.find(
      a => a.employeeId === employeeId && a.date === dateStr
    )?.status;
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const uniqueCompanies = Array.from(new Set(employees.map(e => e.company)));

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.includes(searchTerm) || 
      emp.refId.includes(searchTerm);
    const matchesCompany = companyFilter ? emp.company === companyFilter : true;
    return matchesSearch && matchesCompany;
  });

  // Calculate dynamic grid columns
  const gridTemplateColumns = `250px repeat(${daysInMonth.length}, minmax(50px, 1fr))`;

  return (
    <div className="space-y-6">
      
      {/* Controls Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Month Navigation */}
        <div className="flex items-center space-x-4 space-x-reverse bg-slate-50 p-1 rounded-lg border border-slate-200">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="px-4 font-bold text-lg text-slate-800 min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: ar })}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {!canEdit && (
             <div className="flex items-center px-3 py-2 bg-amber-50 text-amber-600 text-xs rounded-lg border border-amber-100">
               <Lock className="w-3 h-3 ml-1" />
               للقراءة فقط
             </div>
          )}
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث (اسم أو رقم)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          
          <div className="relative">
            <Building className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full sm:w-48 pr-10 pl-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none bg-white"
            >
              <option value="">كل الشركات</option>
              {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <div className="min-w-max">
          <div 
            className="grid border-b border-slate-200 bg-slate-50"
            style={{ gridTemplateColumns }}
          >
            {/* Header Row */}
            <div className="p-4 font-bold text-slate-700 sticky right-0 bg-slate-50 z-10 border-l border-slate-200">
              الموظف
            </div>
            {daysInMonth.map((day) => (
              <div key={day.toString()} className="p-2 text-center border-l border-slate-100 flex flex-col justify-center items-center min-w-[50px]">
                <span className="text-xs text-slate-500">{format(day, 'EEE', { locale: ar })}</span>
                <span className="font-bold text-slate-700">{format(day, 'd')}</span>
              </div>
            ))}
          </div>

          {/* Employee Rows */}
          {filteredEmployees.map((emp) => {
            const isResigned = emp.status === 'resigned';
            const disableRow = isResigned || !canEdit;
            
            return (
              <div 
                key={emp.id} 
                className={`grid border-b border-slate-100 transition-colors ${isResigned ? 'bg-slate-50/70' : 'hover:bg-slate-50'}`}
                style={{ gridTemplateColumns }}
              >
                
                {/* Employee Info Column */}
                <div className={`p-3 sticky right-0 z-10 border-l border-slate-200 flex items-center shadow-[1px_0_5px_rgba(0,0,0,0.05)] ${isResigned ? 'bg-slate-50' : 'bg-white'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ml-3 shrink-0 ${isResigned ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                    {emp.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <div className={`font-medium text-sm truncate flex items-center gap-2 ${isResigned ? 'text-slate-500' : 'text-slate-900'}`}>
                      {emp.name}
                      {isResigned && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">مستقيل</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{emp.refId} | {emp.company}</div>
                  </div>
                </div>

                {/* Days Columns */}
                {daysInMonth.map((day) => {
                  const status = getStatusForDay(emp.id, day);
                  const isPresent = status === 'present';
                  const isAbsent = status === 'absent';

                  return (
                    <div key={day.toString()} className="p-1 border-l border-slate-100 flex items-center justify-center relative group">
                      {disableRow && !isPresent && !isAbsent ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                           <Lock className="w-3 h-3 opacity-20" />
                        </div>
                      ) : (
                        <div className={`flex flex-col gap-1 w-full h-full items-center justify-center ${disableRow ? 'opacity-70' : ''}`}>
                          {/* Check Button */}
                          {!isAbsent && (
                            <button
                              disabled={disableRow}
                              onClick={() => handleStatusChange(emp.id, day, 'present')}
                              className={`w-full h-6 rounded flex items-center justify-center transition-all ${
                                isPresent 
                                  ? 'bg-green-100 text-green-600 ring-1 ring-green-300' 
                                  : 'text-slate-200 hover:bg-green-50 hover:text-green-400'
                              } ${disableRow && !isPresent ? 'hidden' : ''}`}
                              title={disableRow ? "لا يمكن التعديل" : "حضور"}
                            >
                              <Check className={`w-4 h-4 ${isPresent ? 'stroke-[3px]' : ''}`} />
                            </button>
                          )}
                          
                          {/* X Button */}
                          {!isPresent && (
                            <button
                              disabled={disableRow}
                              onClick={() => handleStatusChange(emp.id, day, 'absent')}
                              className={`w-full h-6 rounded flex items-center justify-center transition-all ${
                                isAbsent 
                                  ? 'bg-red-100 text-red-600 ring-1 ring-red-300' 
                                  : 'text-slate-200 hover:bg-red-50 hover:text-red-400'
                              } ${disableRow && !isAbsent ? 'hidden' : ''}`}
                              title={disableRow ? "لا يمكن التعديل" : "غياب"}
                            >
                              <X className={`w-4 h-4 ${isAbsent ? 'stroke-[3px]' : ''}`} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {filteredEmployees.length === 0 && (
             <div className="p-10 text-center text-slate-400">
               {employees.length === 0 ? 'لا توجد شركات مصرح لك بعرضها' : 'لا يوجد موظفين مطابقين للبحث'}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
