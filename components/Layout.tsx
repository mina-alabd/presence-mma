
import React, { useEffect, useRef } from 'react';
import { Users, Calendar, BarChart3, Menu, X, Bell, Trash2, CheckCheck, Info, AlertTriangle, AlertCircle, LogOut, Shield, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, addNotification } = useNotifications();
  const notifRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  // Daily Reminder Logic
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkReminder = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastReminderKey = `last_attendance_reminder_${todayStr}`;
      const hasRemindedToday = localStorage.getItem(lastReminderKey);
      
      if (!hasRemindedToday) {
        const employees = db.getEmployees();
        if (employees.length === 0) return; // Don't remind if no employees

        const allAttendance = db.getAttendance();
        const todayRecords = allAttendance.filter(a => a.date === todayStr);
        
        // If less than 20% of employees have records for today, trigger reminder
        if (todayRecords.length < employees.length * 0.2) {
           addNotification(
             'تذكير تسجيل الحضور',
             `لم يتم تسجيل حضور اليوم (${todayStr}) لمعظم الموظفين. يرجى تحديث السجلات.`,
             'info'
           );
           localStorage.setItem(lastReminderKey, 'true');
        }
      }
    };
    
    // Check on mount
    checkReminder();
  }, [addNotification, isAuthenticated]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'إدارة الموظفين', icon: Users, show: true },
    { path: '/attendance', label: 'تسجيل الحضور', icon: Calendar, show: true },
    { path: '/reports', label: 'التقارير', icon: BarChart3, show: true },
    { path: '/users', label: 'المستخدمين', icon: Shield, show: isAdmin }, // Only for admins
  ];

  const getIconByType = (type: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  // If on login page, render simpler layout (just children)
  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  // If not authenticated, we still render children to allow Navigate to work
  // But we hide the main App UI (Navbar etc)
  if (!isAuthenticated) {
     return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="bg-blue-600 text-white shadow-lg no-print z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="bg-white p-1.5 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xl font-bold tracking-wide">نظام الحضور</span>
            </div>

            {/* Desktop Menu & Actions */}
            <div className="flex items-center space-x-4 space-x-reverse">
              
              {/* Main Nav (Desktop) */}
              <div className="hidden md:flex space-x-1 space-x-reverse ml-4">
                {navItems.filter(i => i.show).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-white text-blue-600'
                        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4 ml-2" />
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 rounded-full hover:bg-blue-500 transition-colors relative focus:outline-none"
                >
                  <Bell className="w-6 h-6 text-blue-100" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center border border-blue-600">
                      {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotifOpen && (
                  <div className="absolute left-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-2xl overflow-hidden ring-1 ring-black ring-opacity-5 origin-top-left z-50">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">الإشعارات</h3>
                      <div className="flex space-x-2 space-x-reverse">
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center px-2 py-1 hover:bg-blue-50 rounded"
                          title="تحديد الكل كمقروء"
                        >
                          <CheckCheck className="w-3 h-3 ml-1" />
                          قراءة الكل
                        </button>
                        <button 
                          onClick={clearNotifications}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center px-2 py-1 hover:bg-red-50 rounded"
                          title="مسح الكل"
                        >
                          <Trash2 className="w-3 h-3 ml-1" />
                          مسح
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => markAsRead(notif.id)}
                              className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1 flex-shrink-0">
                                  {getIconByType(notif.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <p className={`text-sm font-semibold ${!notif.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                      {notif.title}
                                    </p>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap mr-2">
                                      {formatTime(notif.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    {notif.message}
                                  </p>
                                </div>
                                {!notif.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400">
                          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                          <p>لا توجد إشعارات جديدة</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile & Logout */}
              <div className="hidden md:flex items-center border-r border-blue-500 pr-4 mr-2 space-x-3 space-x-reverse">
                <div className="text-left hidden lg:block">
                  <div className="text-sm font-bold">{user?.displayName}</div>
                  <div className="text-xs text-blue-200">{user?.role === 'admin' ? 'مشرف عام' : 'مستخدم'}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center border border-blue-400">
                  <User className="w-4 h-4 text-blue-200" />
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-blue-500 rounded-full transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5 text-blue-200 hover:text-white" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-blue-500 focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-blue-700 px-2 pt-2 pb-3 space-y-1">
            <div className="p-4 border-b border-blue-600 mb-2 flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center border border-blue-400">
                  <User className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="text-sm font-bold">{user?.displayName}</div>
                  <div className="text-xs text-blue-200">{user?.role === 'admin' ? 'مشرف عام' : 'مستخدم'}</div>
                </div>
            </div>
            {navItems.filter(i => i.show).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.path)
                    ? 'bg-white text-blue-600'
                    : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                <item.icon className="w-5 h-5 ml-3" />
                {item.label}
              </Link>
            ))}
            <button
               onClick={handleLogout}
               className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-red-200 hover:bg-red-500 hover:text-white mt-4"
            >
              <LogOut className="w-5 h-5 ml-3" />
              تسجيل خروج
            </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 relative z-0">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto no-print">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} جميع الحقوق محفوظة - نظام إدارة الحضور والغياب
        </div>
      </footer>
    </div>
  );
};

export default Layout;
