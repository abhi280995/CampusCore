import React, { useState } from 'react';
import {
  GraduationCap,
  Shield,
  Building,
  UserCheck,
  BookOpen,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Mail,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

export const LoginPage: React.FC = () => {
  const { login, switchUserById } = useERP();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your college email address');
      return;
    }
    const success = login(email);
    if (!success) {
      setError('No account found with this email. Try one of the demo accounts below.');
    }
  };

  const demoAccounts = [
    {
      role: 'Super Admin',
      name: 'Dr. Arthur Pendelton',
      email: 'superadmin@campuscore.edu',
      desc: 'Creates branches & assigns Main Admins across campus',
      id: 'u_superadmin',
      icon: Shield,
    },
    {
      role: 'Main Admin',
      name: 'Dr. Rajesh Verma',
      email: 'admin.cse@campuscore.edu',
      desc: 'Manages CSE Branch, generates timetables, assigns faculty',
      id: 'u_admin_cse',
      icon: Building,
    },
    {
      role: 'Class Incharge (Teacher)',
      name: 'Prof. Alan Turing',
      email: 'alan.turing@campuscore.edu',
      desc: 'Class Incharge Sem 4 Div A: uploads student Excel, marks attendance',
      id: 'u_prof_alan',
      icon: UserCheck,
    },
    {
      role: 'Teacher (Sub Admin)',
      name: 'Prof. Ada Lovelace',
      email: 'ada.lovelace@campuscore.edu',
      desc: 'Views daily schedule, records attendance & uploads exam marks',
      id: 'u_prof_ada',
      icon: BookOpen,
    },
    {
      role: 'Student',
      name: 'Aryan Mehta',
      email: 'aryan.mehta@campuscore.edu',
      desc: 'Views timetable, attendance gauge, circulars & exam grades',
      id: 'u_student_aryan',
      icon: GraduationCap,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          CampusCore ERP
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Integrated Collegiate Academic & Administration Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Institutional Email
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin.cse@campuscore.edu"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-xs transition-colors"
            >
              Sign In to ERP
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Fast Persona Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-900 mb-2">
              Instant Demo Access by Role:
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Click any profile below to immediately explore its role-based features:
            </p>

            <div className="space-y-2">
              {demoAccounts.map((acc) => {
                const IconComponent = acc.icon;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => switchUserById(acc.id)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-start gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-950">
                          {acc.role}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-medium">
                          Login →
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">{acc.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{acc.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
