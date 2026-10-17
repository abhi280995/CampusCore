import React, { useState, useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { MainAdminDashboard } from './components/mainadmin/MainAdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ClassInchargeView } from './components/classincharge/ClassInchargeView';
import { StudentDashboard } from './components/student/StudentDashboard';
import { Shield, Building, UserCheck, BookOpen, GraduationCap } from 'lucide-react';

const ERPAppContent: React.FC = () => {
  const { currentUser, switchUserById } = useERP();
  const [currentView, setCurrentView] = useState<string>('default');

  // Reset current view when active user role changes
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'super_admin') {
      setCurrentView('super_admin_branches');
    } else if (currentUser.role === 'main_admin') {
      setCurrentView('main_admin_timetable');
    } else if (currentUser.role === 'teacher') {
      if (currentUser.isClassIncharge) {
        setCurrentView('class_incharge_panel');
      } else {
        setCurrentView('teacher_schedule');
      }
    } else if (currentUser.role === 'student') {
      setCurrentView('student_overview');
    }
  }, [currentUser?.id, currentUser?.role]);

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderMainContent = () => {
    switch (currentUser.role) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'main_admin':
        return <MainAdminDashboard />;
      case 'teacher':
        if (currentView === 'class_incharge_panel' && currentUser.isClassIncharge) {
          return <ClassInchargeView />;
        }
        return <TeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return <div>Access Denied</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      {/* Quick Test Bar for Evaluators */}
      <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Quick Persona Test Bar:</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Click to test permissions & dashboards for each ERP role:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchUserById('u_superadmin')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              currentUser.role === 'super_admin'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Shield className="w-3 h-3" />
            Super Admin
          </button>

          <button
            type="button"
            onClick={() => switchUserById('u_admin_cse')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              currentUser.id === 'u_admin_cse'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Building className="w-3 h-3" />
            Main Admin (CSE)
          </button>

          <button
            type="button"
            onClick={() => switchUserById('u_prof_alan')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              currentUser.id === 'u_prof_alan'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            Class Incharge (Teacher)
          </button>

          <button
            type="button"
            onClick={() => switchUserById('u_prof_ada')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              currentUser.id === 'u_prof_ada'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Teacher (Ada)
          </button>

          <button
            type="button"
            onClick={() => switchUserById('u_student_aryan')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              currentUser.id === 'u_student_aryan'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <GraduationCap className="w-3 h-3" />
            Student (Aryan)
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 min-w-0">{renderMainContent()}</main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ERPProvider>
      <ERPAppContent />
    </ERPProvider>
  );
}
