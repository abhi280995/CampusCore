import React, { useState } from 'react';
import {
  GraduationCap,
  LogOut,
  RotateCcw,
  UserCheck,
  ChevronDown,
  Building2,
  Shield,
  BookOpen,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface NavbarProps {
  onOpenResetConfirm?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { currentUser, logout, switchUserById, users, branches, resetToDefaultData } = useERP();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [showResetNotice, setShowResetNotice] = useState(false);

  // Current branch if any
  const currentBranch = branches.find((b) => b.id === currentUser?.branchId);

  // Format role label cleanly without pills
  const getRoleLabel = () => {
    if (!currentUser) return '';
    if (currentUser.role === 'super_admin') return 'Super Administrator';
    if (currentUser.role === 'main_admin') {
      return `Main Admin (${currentBranch?.code || 'Branch'})`;
    }
    if (currentUser.role === 'teacher') {
      return currentUser.isClassIncharge
        ? `Class Incharge · Sem ${currentUser.inchargeClass?.semester}-${currentUser.inchargeClass?.division}`
        : 'Faculty / Sub Admin';
    }
    if (currentUser.role === 'student') {
      return `Student · ${currentUser.studentProfile?.rollNo}`;
    }
    return '';
  };

  const handleReset = () => {
    if (window.confirm('Reset all ERP data to default demo state?')) {
      resetToDefaultData();
      setShowResetNotice(true);
      setTimeout(() => setShowResetNotice(false), 3000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* 3-Zone Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
              CampusCore ERP
            </span>
            <span className="text-[11px] text-slate-500 font-medium tracking-normal mt-0.5">
              College Management Suite
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation & Contextual Metadata */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-600 font-medium">
          {currentBranch ? (
            <div className="flex items-center gap-2 text-slate-700">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{currentBranch.name}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono text-slate-500 font-semibold">{currentBranch.code} Dept</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-700">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Central Administration</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>All Branches</span>
            </div>
          )}

          <span className="text-slate-200" aria-hidden="true">|</span>

          <div className="flex items-center gap-2 text-slate-500">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Academic Year 2026-27</span>
          </div>
        </div>

        {/* Zone 3: Quick Role Switcher + User Profile + Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Persona Switcher for Evaluation */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Test ERP as different roles"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Switch Role</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  1-Click Role Switcher
                </div>
                <div className="space-y-0.5">
                  {/* Super Admin */}
                  <button
                    type="button"
                    onClick={() => {
                      switchUserById('u_superadmin');
                      setIsSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      currentUser?.role === 'super_admin' ? 'bg-indigo-50 font-semibold text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-slate-900 font-medium">Super Admin</span>
                    <span className="text-[11px] text-slate-400">Dr. Arthur Pendelton · Central Oversight</span>
                  </button>

                  {/* Main Admin CSE */}
                  <button
                    type="button"
                    onClick={() => {
                      switchUserById('u_admin_cse');
                      setIsSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      currentUser?.id === 'u_admin_cse' ? 'bg-indigo-50 font-semibold text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-slate-900 font-medium">Main Admin (CSE Branch)</span>
                    <span className="text-[11px] text-slate-400">Dr. Rajesh Verma · Branch Head</span>
                  </button>

                  {/* Class Incharge Teacher */}
                  <button
                    type="button"
                    onClick={() => {
                      switchUserById('u_prof_alan');
                      setIsSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      currentUser?.id === 'u_prof_alan' ? 'bg-indigo-50 font-semibold text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-slate-900 font-medium">Class Incharge (Teacher)</span>
                    <span className="text-[11px] text-slate-400">Prof. Alan Turing · Sem 4 Div A Incharge</span>
                  </button>

                  {/* Regular Teacher */}
                  <button
                    type="button"
                    onClick={() => {
                      switchUserById('u_prof_ada');
                      setIsSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      currentUser?.id === 'u_prof_ada' ? 'bg-indigo-50 font-semibold text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-slate-900 font-medium">Subject Teacher</span>
                    <span className="text-[11px] text-slate-400">Prof. Ada Lovelace · Networks Faculty</span>
                  </button>

                  {/* Student */}
                  <button
                    type="button"
                    onClick={() => {
                      switchUserById('u_student_aryan');
                      setIsSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      currentUser?.id === 'u_student_aryan' ? 'bg-indigo-50 font-semibold text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-slate-900 font-medium">Student (Sem 4 Div A)</span>
                    <span className="text-[11px] text-slate-400">Aryan Mehta · Roll 24CS401</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo State button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Reset data to initial state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* User Profile */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[11px] text-slate-500 leading-tight">
                  {getRoleLabel()}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors ml-1"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showResetNotice && (
        <div className="bg-emerald-600 text-white text-xs py-1 px-4 text-center">
          ERP data reset to default demo dataset successfully.
        </div>
      )}
    </header>
  );
};
