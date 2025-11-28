
import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Edit, Shield, Check, X, Building2, Lock, Unlock } from 'lucide-react';
import * as db from '../services/db';
import { User as UserType } from '../types';

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [employeesCompanyList, setEmployeesCompanyList] = useState<string[]>([]);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  
  // Permissions State
  const [canEdit, setCanEdit] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  
  // UI State
  const [newCompanyInput, setNewCompanyInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const currentUsers = db.getUsers();
    setUsers(currentUsers);
    
    // 1. Get companies from Employees
    const employees = db.getEmployees();
    const employeeCompanies = employees.map(e => e.company);

    // 2. Get companies that are already assigned to users (persisted permissions)
    // This ensures companies with 0 employees but assigned permissions still show up
    const permissionCompanies = currentUsers
      .flatMap(u => u.permissions?.allowedCompanies || [])
      .filter(c => c && c !== '*');

    // 3. Merge and Unique
    const uniqueCompanies = Array.from(new Set([...employeeCompanies, ...permissionCompanies]))
      .filter(Boolean)
      .sort();

    setEmployeesCompanyList(uniqueCompanies);
  };

  const handleCompanyToggle = (company: string) => {
    if (company === '*') {
      setSelectedCompanies(['*']);
      return;
    }
    
    let newSelection = [...selectedCompanies];
    if (newSelection.includes('*')) {
      newSelection = [];
    }

    if (newSelection.includes(company)) {
      newSelection = newSelection.filter(c => c !== company);
    } else {
      newSelection.push(company);
    }
    setSelectedCompanies(newSelection);
  };

  const handleAddManualCompany = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newCompanyInput && !employeesCompanyList.includes(newCompanyInput)) {
      setEmployeesCompanyList(prev => [...prev, newCompanyInput].sort());
      // Automatically select the new company
      handleCompanyToggle(newCompanyInput);
      setNewCompanyInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !displayName) return;
    if (!editingId && !password) return; // Password required for new users

    // Check for unique username
    const existingUser = users.find(u => u.username === username && u.id !== editingId);
    if (existingUser) {
      setError('اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر.');
      return;
    }

    // Determine Final Permissions
    // If Admin, force full permissions. If User, use form state.
    const finalCanEdit = role === 'admin' ? true : canEdit;
    const finalAllowedCompanies = role === 'admin' ? ['*'] : (selectedCompanies.length > 0 ? selectedCompanies : []);

    const userData: UserType = {
      id: editingId || db.generateId(),
      username,
      displayName,
      role,
      permissions: {
        canEdit: finalCanEdit,
        allowedCompanies: finalAllowedCompanies
      }
    };
    
    if (password) {
      userData.password = password;
    }

    db.saveUser(userData);
    loadData();
    resetForm();
  };

  const handleEdit = (user: UserType) => {
    setEditingId(user.id);
    setUsername(user.username);
    setDisplayName(user.displayName);
    setRole(user.role);
    setCanEdit(user.permissions.canEdit);
    setSelectedCompanies(user.permissions.allowedCompanies);
    setPassword(''); // Don't show password
    setError('');
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      db.deleteUser(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setUsername('');
    setPassword('');
    setDisplayName('');
    setRole('user');
    setCanEdit(false);
    setSelectedCompanies([]);
    setNewCompanyInput('');
    setError('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              {editingId ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
            </h2>
            {editingId && (
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الظاهر</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="مثال: أحمد محمد"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="اسم الدخول"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                كلمة المرور {editingId && <span className="text-slate-400 text-xs">(اتركها فارغة للإبقاء على الحالية)</span>}
              </label>
              <input
                type="password"
                required={!editingId}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="****"
                autoComplete="new-password"
              />
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">نوع الحساب</label>
              <div className="flex gap-4 mb-4">
                <label className={`flex-1 cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center transition-all ${role === 'user' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <input type="radio" className="hidden" checked={role === 'user'} onChange={() => setRole('user')} />
                  <User className="w-6 h-6 mb-1" />
                  <span className="text-sm font-bold">مستخدم</span>
                </label>
                <label className={`flex-1 cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center transition-all ${role === 'admin' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <input type="radio" className="hidden" checked={role === 'admin'} onChange={() => setRole('admin')} />
                  <Shield className="w-6 h-6 mb-1" />
                  <span className="text-sm font-bold">مشرف عام</span>
                </label>
              </div>
            </div>

            {role === 'user' && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                   <Lock className="w-4 h-4 ml-2 text-slate-500" />
                   صلاحيات المستخدم
                </h3>
                
                {/* Edit Permission */}
                <div className="mb-4">
                   <label className="flex items-center space-x-2 space-x-reverse cursor-pointer p-2 bg-white rounded border border-slate-200 hover:border-blue-300 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={canEdit}
                      onChange={(e) => setCanEdit(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="mr-2">
                      <div className="text-sm font-medium text-slate-800">السماح بالتعديل</div>
                      <div className="text-xs text-slate-500">يمكنه إضافة/حذف موظفين وتسجيل الحضور</div>
                    </div>
                   </label>
                </div>

                {/* Company Permissions */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">الوصول للشركات</label>
                  </div>
                  
                  {/* Add New Company Input */}
                  <div className="flex space-x-2 space-x-reverse mb-2">
                    <input 
                      type="text"
                      value={newCompanyInput}
                      onChange={(e) => setNewCompanyInput(e.target.value)}
                      placeholder="إضافة شركة جديدة..."
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={handleAddManualCompany}
                      disabled={!newCompanyInput}
                      className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                      title="إضافة شركة للقائمة"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto p-2 bg-white border border-slate-200 rounded">
                    <label className={`flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-slate-50 p-1 rounded ${selectedCompanies.includes('*') ? 'bg-blue-50' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedCompanies.includes('*')}
                        onChange={() => handleCompanyToggle('*')}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-800 font-bold">كل الشركات (وصول كامل)</span>
                    </label>
                    
                    <div className="my-1 border-t border-slate-100"></div>
                    
                    {employeesCompanyList.length > 0 ? (
                      employeesCompanyList.map(comp => (
                        <label key={comp} className="flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={selectedCompanies.includes(comp) || selectedCompanies.includes('*')}
                            disabled={selectedCompanies.includes('*')}
                            onChange={() => handleCompanyToggle(comp)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-700">{comp}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 p-2 text-center">قم بإضافة شركة أعلاه للبدء</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center shadow-md"
            >
              {editingId ? <><Edit className="w-4 h-4 ml-2" /> حفظ التعديلات</> : <><Plus className="w-4 h-4 ml-2" /> إضافة مستخدم</>}
            </button>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">إدارة الحسابات</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-600 text-sm uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold">المستخدم</th>
                  <th className="px-6 py-4 font-semibold">الدور</th>
                  <th className="px-6 py-4 font-semibold">الصلاحيات</th>
                  <th className="px-6 py-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {u.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.displayName}</div>
                          <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                          مشرف عام
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          مستخدم
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-slate-500 flex items-center">
                            <Shield className="w-3 h-3 ml-1" />
                            صلاحيات كاملة
                        </span>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center text-xs">
                             {u.permissions.canEdit ? (
                                <span className="flex items-center text-green-600 font-medium">
                                    <Unlock className="w-3 h-3 ml-1" />
                                    تحرير ومشاركة
                                </span>
                             ) : (
                                <span className="flex items-center text-amber-600 font-medium">
                                    <Lock className="w-3 h-3 ml-1" />
                                    مشاهدة فقط
                                </span>
                             )}
                          </div>
                          <div className="flex items-start text-xs text-slate-500">
                            <Building2 className="w-3 h-3 ml-1 mt-0.5 shrink-0" />
                            <span className="max-w-[200px] leading-relaxed" title={u.permissions.allowedCompanies.join(', ')}>
                              {u.permissions.allowedCompanies.includes('*') 
                                ? 'كل الشركات' 
                                : u.permissions.allowedCompanies.length > 0 
                                  ? u.permissions.allowedCompanies.join('، ')
                                  : 'لا توجد شركات'}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2 space-x-reverse">
                        <button 
                          onClick={() => handleEdit(u)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {u.username !== 'admin' && ( // Prevent deleting main admin easily
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
