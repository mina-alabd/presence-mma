
import React, { useState, useEffect } from 'react';
import { Building, User, Printer, CheckCircle2, XCircle, Search, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as db from '../services/db';
import { Employee, AttendanceRecord } from '../types';
import { useAuth } from '../context/AuthContext';

const Reports: React.FC = () => {
  const { canViewCompany } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    // Only load employees that the user is allowed to see
    const allEmployees = db.getEmployees();
    const visibleEmployees = allEmployees.filter(e => canViewCompany(e.company));
    setEmployees(visibleEmployees);
    setAttendance(db.getAttendance());
  }, []);

  const uniqueCompanies = Array.from(new Set(employees.map(e => e.company)));

  // Filtering Logic
  const filteredEmployees = employees.filter(emp => {
    if (selectedCompany && emp.company !== selectedCompany) return false;
    if (selectedEmployeeId && emp.id !== selectedEmployeeId) return false;
    if (searchName && !emp.name.includes(searchName)) return false;
    return true;
  });

  const getStats = (employeeId: string) => {
    const records = attendance.filter(a => a.employeeId === employeeId);
    const present = records.filter(a => a.status === 'present').length;
    const absent = records.filter(a => a.status === 'absent').length;
    return { present, absent, records };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      
      {/* Filters (Hidden when printing) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 mb-4 md:mb-0">تقارير الحضور والغياب</h2>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4 ml-2" />
            طباعة التقرير
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Company Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">تصفية حسب الشركة</label>
            <div className="relative">
              <Building className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <select
                value={selectedCompany}
                onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setSelectedEmployeeId(''); // Reset employee specific if company changes
                }}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none bg-white"
              >
                <option value="">جميع الشركات</option>
                {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Name Search */}
           <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">بحث باسم الموظف</label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => {
                    setSearchName(e.target.value);
                    setSelectedEmployeeId('');
                }}
                placeholder="اكتب الاسم..."
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Specific Employee Select (Optional refinement) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">تحديد موظف معين</label>
            <div className="relative">
              <User className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none bg-white"
              >
                <option value="">عرض الكل</option>
                {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.name} {e.status === 'resigned' ? '(مستقيل)' : ''}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Area */}
      <div className="print-only bg-white p-8 rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        
        {/* Report Header for Print */}
        <div className="text-center mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">تقرير حضور وغياب الموظفين</h1>
          <p className="text-slate-500">
            {selectedCompany ? `الشركة: ${selectedCompany}` : 'جميع الشركات'} 
            {selectedEmployeeId ? ' - تقرير فردي' : ' - تقرير شامل'}
          </p>
          <p className="text-xs text-slate-400 mt-2">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {filteredEmployees.length === 0 ? (
            <div className="text-center text-slate-400 py-10">لا توجد بيانات للعرض (قد لا تملك صلاحيات كافية)</div>
        ) : (
            <div className="space-y-8">
                {filteredEmployees.map(emp => {
                    const stats = getStats(emp.id);
                    
                    return (
                        <div key={emp.id} className={`break-inside-avoid border border-slate-200 rounded-lg p-6 ${emp.status === 'resigned' ? 'bg-slate-50' : 'bg-slate-50/50'}`}>
                            {/* Employee Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                      {emp.name}
                                      {emp.status === 'resigned' && (
                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center">
                                          <UserX className="w-3 h-3 ml-1" />
                                          مستقيل
                                        </span>
                                      )}
                                    </h3>
                                    <div className="text-sm text-slate-500 flex gap-4 mt-1">
                                        <span>الرقم: {emp.refId}</span>
                                        <span>الشركة: {emp.company}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-center bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                                        <div className="text-xs text-green-600 font-medium">حضور</div>
                                        <div className="text-xl font-bold text-green-700">{stats.present} يوم</div>
                                    </div>
                                    <div className="text-center bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                                        <div className="text-xs text-red-600 font-medium">غياب</div>
                                        <div className="text-xl font-bold text-red-700">{stats.absent} يوم</div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed List */}
                            {stats.records.length > 0 ? (
                                <div className="mt-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">سجل الأيام المسجلة</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {stats.records
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map(rec => (
                                            <div key={rec.id} className={`flex items-center justify-between p-2 rounded text-xs border ${
                                                rec.status === 'present' 
                                                ? 'bg-white border-green-100 text-green-700' 
                                                : 'bg-white border-red-100 text-red-700'
                                            }`}>
                                                <span>{format(parseISO(rec.date), 'dd/MM')}</span>
                                                {rec.status === 'present' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic mt-2">لا توجد سجلات حضور مسجلة</div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
