import React, { useState, useMemo } from 'react';
import {
  Users,
  UploadCloud,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Download,
  Mail,
  Phone,
  UserPlus,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ExcelUploadModal } from '../common/ExcelUploadModal';
import { downloadStudentTemplate, ParsedStudentRow } from '../../utils/excelHelpers';
import { User } from '../../types/erp';

export const ClassInchargeView: React.FC = () => {
  const {
    currentUser,
    branches,
    users,
    subjects,
    attendanceRecords,
    importStudentsFromExcel,
    addStudent,
    deleteStudent,
  } = useERP();

  const semester = currentUser?.inchargeClass?.semester || 4;
  const division = currentUser?.inchargeClass?.division || 'A';
  const branch = branches.find((b) => b.id === currentUser?.branchId);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtRisk, setFilterAtRisk] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for single student
  const [studentForm, setStudentForm] = useState({
    rollNo: '',
    name: '',
    email: '',
    phone: '',
    enrollmentNo: '',
    guardianName: '',
    guardianContact: '',
    bloodGroup: 'B+',
  });

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter class students
  const classStudents = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === 'student' &&
        u.branchId === currentUser?.branchId &&
        u.studentProfile?.semester === semester &&
        u.studentProfile?.division === division
    );
  }, [users, currentUser, semester, division]);

  // Compute attendance stats per student
  const studentAttendanceStats = useMemo(() => {
    const stats = new Map<string, { total: number; attended: number; pct: number }>();

    // Filter attendance records relevant to this branch, sem, div
    const relevantRecords = attendanceRecords.filter(
      (r) =>
        r.branchId === currentUser?.branchId &&
        r.semester === semester &&
        r.division === division
    );

    classStudents.forEach((stu) => {
      let total = 0;
      let attended = 0;

      relevantRecords.forEach((rec) => {
        const entry = rec.entries.find((e) => e.studentId === stu.id);
        if (entry) {
          total++;
          if (entry.status === 'Present' || entry.status === 'Late') {
            attended++;
          }
        }
      });

      const pct = total > 0 ? Math.round((attended / total) * 100) : 100;
      stats.set(stu.id, { total, attended, pct });
    });

    return stats;
  }, [attendanceRecords, classStudents, currentUser, semester, division]);

  // Search and filter
  const filteredStudents = useMemo(() => {
    return classStudents.filter((stu) => {
      const stats = studentAttendanceStats.get(stu.id);
      const isAtRisk = (stats?.pct || 100) < 75;

      if (filterAtRisk && !isAtRisk) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        stu.name.toLowerCase().includes(term) ||
        stu.email.toLowerCase().includes(term) ||
        stu.studentProfile?.rollNo.toLowerCase().includes(term) ||
        stu.studentProfile?.enrollmentNo.toLowerCase().includes(term)
      );
    });
  }, [classStudents, studentAttendanceStats, filterAtRisk, searchTerm]);

  const atRiskCount = useMemo(() => {
    return classStudents.filter((s) => (studentAttendanceStats.get(s.id)?.pct || 100) < 75).length;
  }, [classStudents, studentAttendanceStats]);

  const handleStudentExcelUpload = (rows: ParsedStudentRow[]) => {
    if (!currentUser?.branchId) return;
    const added = importStudentsFromExcel(
      rows,
      currentUser.branchId,
      semester,
      division
    );
    notify(`Successfully imported ${added} students into Sem ${semester} - Div ${division}.`);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.rollNo || !studentForm.name || !currentUser?.branchId) return;

    addStudent({
      name: studentForm.name,
      email: studentForm.email || `${studentForm.rollNo.toLowerCase()}@campus.edu`,
      phone: studentForm.phone,
      branchId: currentUser.branchId,
      rollNo: studentForm.rollNo,
      enrollmentNo: studentForm.enrollmentNo || `EN${studentForm.rollNo}`,
      semester,
      division,
      guardianName: studentForm.guardianName,
      guardianContact: studentForm.guardianContact,
      bloodGroup: studentForm.bloodGroup,
    });

    notify(`Student ${studentForm.name} (Roll: ${studentForm.rollNo}) added to class roster.`);
    setIsAddStudentModalOpen(false);
    setStudentForm({
      rollNo: '',
      name: '',
      email: '',
      phone: '',
      enrollmentNo: '',
      guardianName: '',
      guardianContact: '',
      bloodGroup: 'B+',
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Class Incharge Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Class Incharge Portal · Semester {semester} - Division {division}
            </h2>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
              {branch?.code || 'CSE'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Faculty Incharge: <span className="font-semibold text-slate-800">{currentUser?.name}</span> · {classStudents.length} Students Enrolled
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadStudentTemplate(semester, division)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download Excel Template
          </button>
          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Students via Excel
          </button>
          <button
            type="button"
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Single Student
          </button>
        </div>
      </div>

      {/* Attendance Criteria Warning Bar */}
      {atRiskCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-950">
                Attendance Alert: {atRiskCount} Student{atRiskCount > 1 ? 's' : ''} with &lt; 75% Attendance
              </div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                University regulation requires minimum 75% aggregate attendance to sit for end-semester exams.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterAtRisk(!filterAtRisk)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterAtRisk
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
          >
            {filterAtRisk ? 'Show All Students' : 'Filter &lt; 75% Students'}
          </button>
        </div>
      )}

      {/* Roster Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student by roll no, name, or enrollment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredStudents.length} of {classStudents.length} enrolled students
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Roll No</th>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Enrollment ID</th>
                <th className="px-6 py-3">Attendance</th>
                <th className="px-6 py-3">Guardian Name & Contact</th>
                <th className="px-6 py-3">Email Address</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-xs">
                    No students found matching your criteria. Use "Upload Students via Excel" to import your class roster.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const stats = studentAttendanceStats.get(stu.id) || { total: 0, attended: 0, pct: 100 };
                  const isLow = stats.pct < 75;

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {stu.studentProfile?.rollNo || 'N/A'}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">
                        {stu.name}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">
                        {stu.studentProfile?.enrollmentNo || '-'}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              isLow ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {stats.pct}%
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({stats.attended}/{stats.total} sessions)
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                              At Risk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-slate-900 font-medium">
                          {stu.studentProfile?.guardianName || 'Guardian'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {stu.studentProfile?.guardianContact || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-500">
                        {stu.email}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove ${stu.name} from class roster?`)) {
                              deleteStudent(stu.id);
                              notify(`Student ${stu.name} removed.`);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title={`Upload Student Details · Sem ${semester} - Div ${division}`}
        description="Upload an Excel spreadsheet or CSV containing student roll numbers, full names, email addresses, and guardian contact details."
        type="students"
        templateDownloadFn={() => downloadStudentTemplate(semester, division)}
        templateLabel={`Sample Template (Sem ${semester} Div ${division})`}
        onConfirmStudentUpload={handleStudentExcelUpload}
      />

      {/* Modal: Manual Add Single Student */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Enroll Student · Sem {semester} Div {division}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleManualAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Roll Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24CS410"
                    value={studentForm.rollNo}
                    onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Enrollment No</label>
                  <input
                    type="text"
                    placeholder="EN2024CS010"
                    value={studentForm.enrollmentNo}
                    onChange={(e) => setStudentForm({ ...studentForm, enrollmentNo: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Iyer"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="maya.iyer@campuscore.edu"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Guardian Name</label>
                  <input
                    type="text"
                    placeholder="e.g. S. Iyer"
                    value={studentForm.guardianName}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianName: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Guardian Contact</label>
                  <input
                    type="text"
                    placeholder="+91 98765 11111"
                    value={studentForm.guardianContact}
                    onChange={(e) => setStudentForm({ ...studentForm, guardianContact: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
