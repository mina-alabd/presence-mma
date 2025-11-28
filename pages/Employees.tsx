
import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Building, Phone, User as UserIcon, Hash, Edit, UserX, UserCheck, X, ShieldAlert } from 'lucide-react';
import { Employee } from '../types';
import * as db from '../services/db';
import { useAuth } from '../context/AuthContext';

const Employees: React.FC = () => {
  const { canEdit, canViewCompany } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [refId, setRefId] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [formError, setFormError] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    type: 'resign' | 'activate';
  }>({ isOpen: false, employee: null, type: 'resign' });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    // Only show employees that match the user's allowed companies
    const allEmployees = db.getEmployees();
    const visibleEmployees = allEmployees.filter(e => canViewCompany(e.company));
    setEmployees(visibleEmployees);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!canEdit) {
      setFormError('ليس لديك صلاحية لإضافة أو تعديل الموظفين');
      return;
    }

    if (!name || !refId || !company) return;

    // Validate if user has permission for the company they are trying to assign
    if (!canViewCompany(company)) {
      setFormError(`ليس لديك صلاحية لإضافة موظفين في شركة "${company}"`);
      return;
    }

    if (editingId) {
      // Update existing employee
      const existingEmployee = employees.find(e => e.id === editingId);
      if (existingEmployee) {
        const updatedEmployee: Employee = {
          ...existingEmployee,
          name,
          refId,
          phone,
          company
        };
        db.saveEmployee(updatedEmployee);
      }
    } else {
      // Create new employee
      const newEmployee: Employee = {
        id: db.generateId(),
        name,
        refId,
        phone,
        company,
        status: 'active'
      };
      db.saveEmployee(newEmployee);
    }

    loadEmployees();
    resetForm();
  };

  const handleEdit = (employee: Employee) => {
    if (!canEdit) return;
    setEditingId(employee.id);
    setName(employee.name);
    setRefId(employee.refId);
    setPhone(employee.phone);
    setCompany(employee.company);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRefId('');
    setPhone('');
    setCompany('');
    setFormError('');
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف جميع سجلات الحضور الخاصة به.')) {
      db.deleteEmployee(id);
      loadEmployees();
      if (editingId === id) resetForm();
    }
  };

  const handleToggleStatus = (employee: Employee) => {
    if (!canEdit) return;
    const type = employee.status === 'active' ? 'resign' : 'activate';
    setConfirmModal({ isOpen: true, employee, type });
  };

  const executeStatusChange = () => {
    const { employee, type } = confirmModal;
    if (employee) {
      const newStatus = type === 'resign' ? 'resigned' : 'active';
      const updatedEmployee: Employee = { ...employee, status: newStatus };
      db.saveEmployee(updatedEmployee);
      loadEmployees();
    }
    closeModal();
  };

  const closeModal = () => setConfirmModal({ ...confirmModal, isOpen: false });

  const filteredEmployees = employees.filter(emp => 
    emp.name.includes(searchTerm) || 
    emp.refId.includes(searchTerm) ||
    emp.company.includes(searchTerm) ||
    emp.phone.includes(searchTerm)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      
      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.employee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                confirmModal.type === 'resign' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                {confirmModal.type === 'resign' ? <UserX className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {confirmModal.type === 'resign' ? 'تأكيد الاستقالة' : 'تأكيد إعادة التفعيل'}
              </h3>
              
              <p className="text-slate-600 mb-6 leading-relaxed">
                {confirmModal.type === 'resign' 
                  ? <>
                      هل أنت متأكد من تسجيل استقالة الموظف <br/>
                      <span className="font-bold text-slate-900">{confirmModal.employee.name}</span>؟
                      <span className="block mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                        ⚠️ تنبيه: هذا الإجراء سيمنع تسجيل الحضور لهذا الموظف مستقبلاً.
                      </span>
                    </>
                  : <>
                      هل تريد إعادة تفعيل الموظف <br/>
                      <span className="font-bold text-slate-900">{confirmModal.employee.name}</span>؟
                      <span className="block mt-3 text-green-600 text-sm font-medium">
                        سيتمكن الموظف من تسجيل الحضور مرة أخرى.
                      </span>
                    </>
                }
              </p>

              <div className="flex w-full space-x-3 space-x-reverse">
                <button
                  onClick={executeStatusChange}
                  className={`flex-1 py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 shadow-md ${
                    confirmModal.type === 'resign' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                      : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                  }`}
                >
                  {confirmModal.type === 'resign' ? 'تأكيد الاستقالة' : 'إعادة التفعيل'}
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Section */}
      <div className="lg:col-span-1">
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8 ${!canEdit ? 'opacity-75 grayscale-[0.5]' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              {editingId ? (
                <>
                  <Edit className="w-5 h-5 ml-2 text-blue-600" />
                  تعديل بيانات موظف
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 ml-2 text-blue-600" />
                  إضافة موظف جديد
                </>
              )}
            </h2>
            {editingId && (
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {!canEdit && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg flex items-center text-sm">
              <ShieldAlert className="w-4 h-4 ml-2" />
              ليس لديك صلاحية لإضافة أو تعديل الموظفين
            </div>
          )}

          {formError && (
             <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg text-sm">
               {formError}
             </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الموظف</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-slate-100"
                  placeholder="الاسم الثلاثي"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الرقم التعريفي</label>
              <div className="relative">
                <Hash className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-slate-100"
                  placeholder="مثال: 1020"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  disabled={!canEdit}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-slate-100"
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الشركة</label>
              <div className="relative">
                <Building className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-slate-100"
                  placeholder="اسم الشركة أو القسم"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canEdit}
              className={`w-full font-bold py-2.5 rounded-lg transition-colors shadow-sm flex justify-center items-center ${
                editingId 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white disabled:bg-amber-300' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'
              }`}
            >
              {editingId ? (
                <>
                  <Edit className="w-5 h-5 ml-2" />
                  حفظ التعديلات
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 ml-2" />
                  حفظ البيانات
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* List Section */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">قائمة الموظفين</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم، الرقم، الشركة، الهاتف..."
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-full bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-600 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold">الموظف</th>
                  <th className="px-6 py-4 font-semibold">الرقم التعريفي</th>
                  <th className="px-6 py-4 font-semibold">الشركة</th>
                  <th className="px-6 py-4 font-semibold text-center">الحالة</th>
                  {canEdit && <th className="px-6 py-4 font-semibold text-center">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${emp.status === 'resigned' ? 'bg-slate-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ml-3 ${
                            emp.status === 'resigned' ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {emp.name.charAt(0)}
                          </div>
                          <div className={emp.status === 'resigned' ? 'opacity-50' : ''}>
                            <div className="font-medium text-slate-900">{emp.name}</div>
                            <div className="text-xs text-slate-500">{emp.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-slate-600 font-mono text-sm ${emp.status === 'resigned' ? 'opacity-50' : ''}`}>{emp.refId}</td>
                      <td className={`px-6 py-4 ${emp.status === 'resigned' ? 'opacity-50' : ''}`}>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {emp.company}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {emp.status === 'resigned' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-600">
                            مستقيل
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-600">
                            نشط
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4">
                          <div className="flex justify-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => handleEdit(emp)}
                              className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-full transition-colors"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className={`p-2 rounded-full transition-colors ${
                                emp.status === 'resigned' 
                                  ? 'text-green-500 hover:text-green-700 hover:bg-green-50' 
                                  : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={emp.status === 'resigned' ? "إعادة تفعيل" : "تسجيل استقالة"}
                            >
                              {emp.status === 'resigned' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="text-red-400 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                              title="حذف نهائي"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="px-6 py-12 text-center text-slate-400">
                      {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفين مسجلين (أو ليس لديك صلاحية لعرضهم)'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Employees;
