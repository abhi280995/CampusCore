import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Award,
  Bell,
  Users,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  UserCheck,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { currentUser, branches } = useERP();
  const currentBranch = branches.find((b) => b.id === currentUser?.branchId);

  if (!currentUser) return null;

  // Build menu items based on role
  const getNavItems = () => {
    switch (currentUser.role) {
      case 'super_admin':
        return [
          { id: 'super_admin_branches', label: 'Branches & Admins', icon: Building2 },
          { id: 'super_admin_overview', label: 'College Directory', icon: GraduationCap },
        ];
      case 'main_admin':
        return [
          { id: 'main_admin_timetable', label: 'Timetable Studio', icon: Calendar },
          { id: 'main_admin_faculty', label: 'Faculty & Incharges', icon: Users },
          { id: 'main_admin_subjects', label: 'Subject Master', icon: BookOpen },
          { id: 'main_admin_notices', label: 'Notices & Circulars', icon: Bell },
        ];
      case 'teacher':
        const teacherItems = [
          { id: 'teacher_schedule', label: 'My Teaching Schedule', icon: Calendar },
          { id: 'teacher_attendance', label: 'Mark Attendance', icon: CheckCircle2 },
          { id: 'teacher_exams', label: 'Exam Marks Upload', icon: Award },
        ];
        if (currentUser.isClassIncharge) {
          teacherItems.unshift({
            id: 'class_incharge_panel',
            label: `Class Incharge (Sem ${currentUser.inchargeClass?.semester}-${currentUser.inchargeClass?.division})`,
            icon: UserCheck,
          });
        }
        return teacherItems;
      case 'student':
        return [
          { id: 'student_overview', label: 'Academic Overview', icon: GraduationCap },
          { id: 'student_timetable', label: 'Class Timetable', icon: Calendar },
          { id: 'student_attendance', label: 'Attendance Records', icon: CheckCircle2 },
          { id: 'student_results', label: 'Grades & Results', icon: Award },
          { id: 'student_notices', label: 'Announcements', icon: Bell },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Role Banner */}
      <div className="p-4 border-b border-slate-100">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Active Workspace
        </div>
        <div className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1.5">
          {currentUser.role === 'super_admin' && <ShieldCheck className="w-4 h-4 text-indigo-600" />}
          {currentUser.role === 'main_admin' && <Building2 className="w-4 h-4 text-indigo-600" />}
          {currentUser.role === 'teacher' && <UserCheck className="w-4 h-4 text-indigo-600" />}
          {currentUser.role === 'student' && <GraduationCap className="w-4 h-4 text-indigo-600" />}
          <span>
            {currentUser.role === 'super_admin' && 'Central Administration'}
            {currentUser.role === 'main_admin' && `${currentBranch?.code || 'CSE'} Main Admin`}
            {currentUser.role === 'teacher' &&
              (currentUser.isClassIncharge ? 'Class Incharge & Faculty' : 'Faculty Workspace')}
            {currentUser.role === 'student' && 'Student Portal'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.name}</div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400">
        <div>CampusCore ERP v2.4</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Automated Timetable & Attendance Engine</div>
      </div>
    </aside>
  );
};
