import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Users,
  Award,
  ChevronRight,
  BookOpen,
  Filter,
  Layers,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_TIME_SLOTS, DAYS_OF_WEEK } from '../../utils/timetableGenerator';
import { downloadExamMarksTemplate, ParsedExamResultRow } from '../../utils/excelHelpers';
import { ExcelUploadModal } from '../common/ExcelUploadModal';
import { Exam, Subject } from '../../types/erp';

export const TeacherDashboard: React.FC = () => {
  const {
    currentUser,
    branches,
    users,
    subjects,
    timetableSlots,
    attendanceRecords,
    exams,
    examResults,
    recordAttendance,
    createExam,
    uploadExamResultsFromExcel,
  } = useERP();

  // Tabs
  const [activeTab, setActiveTab] = useState<'schedule' | 'attendance' | 'history' | 'exams'>('schedule');

  // Active day for schedule view
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Attendance marker states
  const [attDate, setAttDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attSemester, setAttSemester] = useState<number>(4);
  const [attDivision, setAttDivision] = useState<string>('A');
  const [attSubjectId, setAttSubjectId] = useState<string>(() => {
    return currentUser?.assignedSubjects?.[0] || 'subj_cs401';
  });
  const [attSlotIndex, setAttSlotIndex] = useState<number>(0);

  // Attendance student entries: studentId -> status & remarks
  const [studentStatuses, setStudentStatuses] = useState<
    Record<string, { status: 'Present' | 'Absent' | 'Late' | 'Excused'; remarks?: string }>
  >({});

  // Exam upload states
  const [selectedExamId, setSelectedExamId] = useState<string>(() => exams[0]?.id || '');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Exam Form
  const [newExamForm, setNewExamForm] = useState({
    name: '',
    examType: 'Mid-Term Exam' as Exam['examType'],
    date: new Date().toISOString().split('T')[0],
    totalMarks: 100,
    passingMarks: 40,
    semester: 4,
  });

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Teacher's assigned schedule
  const teacherSlots = useMemo(() => {
    return timetableSlots.filter((s) => s.teacherId === currentUser?.id);
  }, [timetableSlots, currentUser]);

  const todaySlots = useMemo(() => {
    return teacherSlots
      .filter((s) => s.day === selectedDay)
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }, [teacherSlots, selectedDay]);

  // Students for the attendance marking target
  const targetClassStudents = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === 'student' &&
        u.branchId === currentUser?.branchId &&
        u.studentProfile?.semester === attSemester &&
        u.studentProfile?.division === attDivision
    );
  }, [users, currentUser, attSemester, attDivision]);

  // Pre-fill student statuses when class changes or if an existing record exists for today
  React.useEffect(() => {
    const existing = attendanceRecords.find(
      (r) =>
        r.date === attDate &&
        r.subjectId === attSubjectId &&
        r.division === attDivision &&
        r.slotIndex === attSlotIndex
    );

    const initial: Record<
      string,
      { status: 'Present' | 'Absent' | 'Late' | 'Excused'; remarks?: string }
    > = {};

    targetClassStudents.forEach((stu) => {
      if (existing) {
        const found = existing.entries.find((e) => e.studentId === stu.id);
        if (found) {
          initial[stu.id] = { status: found.status, remarks: found.remarks || '' };
          return;
        }
      }
      initial[stu.id] = { status: 'Present', remarks: '' };
    });

    setStudentStatuses(initial);
  }, [attDate, attSemester, attDivision, attSubjectId, attSlotIndex, targetClassStudents, attendanceRecords]);

  // Bulk status helpers
  const markAll = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    const updated: Record<string, { status: any; remarks?: string }> = {};
    targetClassStudents.forEach((stu) => {
      updated[stu.id] = {
        status,
        remarks: studentStatuses[stu.id]?.remarks || '',
      };
    });
    setStudentStatuses(updated);
  };

  // Save Attendance
  const handleSaveAttendance = () => {
    if (!currentUser?.branchId) return;

    const entries = targetClassStudents.map((stu) => ({
      studentId: stu.id,
      status: studentStatuses[stu.id]?.status || 'Present',
      remarks: studentStatuses[stu.id]?.remarks || '',
    }));

    recordAttendance({
      date: attDate,
      branchId: currentUser.branchId,
      semester: attSemester,
      division: attDivision,
      subjectId: attSubjectId,
      teacherId: currentUser.id,
      slotIndex: attSlotIndex,
      entries,
    });

    const targetSubj = subjects.find((s) => s.id === attSubjectId);
    notify(
      `Attendance saved for ${targetSubj?.code || 'Course'} · Sem ${attSemester}-${attDivision} (${entries.length} students logged).`
    );
  };

  // Quick launch attendance from timetable slot
  const startAttendanceFromSlot = (slot: any) => {
    setAttSemester(slot.semester);
    setAttDivision(slot.division);
    setAttSubjectId(slot.subjectId);
    setAttSlotIndex(slot.slotIndex);
    setActiveTab('attendance');
  };

  // Exam Marks Excel confirmation
  const handleExamExcelUpload = (rows: ParsedExamResultRow[]) => {
    const { successCount, errors } = uploadExamResultsFromExcel(selectedExamId, rows);
    if (errors.length > 0) {
      alert(`Upload complete with warnings:\n${errors.slice(0, 5).join('\n')}`);
    }
    notify(`Successfully recorded marks for ${successCount} student submissions.`);
  };

  const handleCreateExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamForm.name || !currentUser?.branchId) return;

    const newId = createExam({
      name: newExamForm.name,
      branchId: currentUser.branchId,
      semester: Number(newExamForm.semester),
      examType: newExamForm.examType,
      date: newExamForm.date,
      totalMarks: Number(newExamForm.totalMarks),
      passingMarks: Number(newExamForm.passingMarks),
      subjectIds: currentUser.assignedSubjects || [],
    });

    setSelectedExamId(newId);
    setIsCreateExamOpen(false);
    notify(`Exam "${newExamForm.name}" created. You can now upload results.`);
  };

  // Attendance statistics calculations for current marking panel
  const presentCount = targetClassStudents.filter(
    (s) => studentStatuses[s.id]?.status === 'Present'
  ).length;
  const absentCount = targetClassStudents.filter(
    (s) => studentStatuses[s.id]?.status === 'Absent'
  ).length;
  const lateCount = targetClassStudents.filter(
    (s) => studentStatuses[s.id]?.status === 'Late'
  ).length;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Faculty Workspace · {currentUser?.name}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
              Sub Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Teaching {(currentUser?.assignedSubjects || []).length} Courses · Total {teacherSlots.length} Weekly Lectures & Labs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Today's Attendance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Award className="w-4 h-4 text-indigo-600" />
            Upload Exam Results
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'schedule'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Daily Schedule & Timetable
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark Attendance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance History Logs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exams')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'exams'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Examination Marks & Results
        </button>
      </div>

      {/* TAB 1: TEACHER SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Day Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedDay === day
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Slots List for this day */}
          <div className="space-y-3">
            {todaySlots.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  No classes scheduled on {selectedDay} for your profile.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Check other days of the week or ask Main Admin to review timetable allocation.
                </p>
              </div>
            ) : (
              todaySlots.map((slot) => {
                const subj = subjects.find((s) => s.id === slot.subjectId);
                return (
                  <div
                    key={slot.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] uppercase font-bold text-indigo-500">P{slot.slotIndex + 1}</span>
                        <Clock className="w-4 h-4 mt-0.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-800">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-indigo-700">
                            Sem {slot.semester} - Div {slot.division}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-600">{slot.roomNumber}</span>
                          {slot.isLab && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Lab Session
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {subj?.name || 'Assigned Subject'} ({subj?.code})
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startAttendanceFromSlot(slot)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs self-start sm:self-center"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Attendance
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MARK ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Target Class & Date Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Date</label>
              <input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="mt-1 block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Subject</label>
              <select
                value={attSubjectId}
                onChange={(e) => setAttSubjectId(e.target.value)}
                className="mt-1 block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Semester</label>
              <select
                value={attSemester}
                onChange={(e) => setAttSemester(Number(e.target.value))}
                className="mt-1 block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Division</label>
              <select
                value={attDivision}
                onChange={(e) => setAttDivision(e.target.value)}
                className="mt-1 block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="A">Division A</option>
                <option value="B">Division B</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Period Slot</label>
              <select
                value={attSlotIndex}
                onChange={(e) => setAttSlotIndex(Number(e.target.value))}
                className="mt-1 block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
              >
                {DEFAULT_TIME_SLOTS.map((s) => (
                  <option key={s.index} value={s.index}>
                    {s.label} ({s.startTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Action Strip & Metric Overview */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-slate-700">
                Total Enrolled: <span className="font-mono tabular-nums">{targetClassStudents.length}</span>
              </span>
              <span className="text-emerald-700">
                Present: <span className="font-mono tabular-nums">{presentCount}</span>
              </span>
              <span className="text-rose-600">
                Absent: <span className="font-mono tabular-nums">{absentCount}</span>
              </span>
              <span className="text-amber-700">
                Late: <span className="font-mono tabular-nums">{lateCount}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAll('Present')}
                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAll('Absent')}
                className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
              >
                Mark All Absent
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                Save Attendance Record
              </button>
            </div>
          </div>

          {/* Student Roster Marking Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Roll No</th>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">Attendance Status</th>
                    <th className="px-6 py-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetClassStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">
                        No students enrolled in Sem {attSemester} - Div {attDivision}.
                      </td>
                    </tr>
                  ) : (
                    targetClassStudents.map((stu) => {
                      const cur = studentStatuses[stu.id] || { status: 'Present' };

                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3 font-mono font-bold text-slate-900">
                            {stu.studentProfile?.rollNo || 'N/A'}
                          </td>
                          <td className="px-6 py-3 font-semibold text-slate-900">
                            {stu.name}
                          </td>
                          <td className="px-6 py-3">
                            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                              {(['Present', 'Absent', 'Late', 'Excused'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() =>
                                    setStudentStatuses({
                                      ...studentStatuses,
                                      [stu.id]: { ...cur, status: st },
                                    })
                                  }
                                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                    cur.status === st
                                      ? st === 'Present'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : st === 'Absent'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : st === 'Late'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-indigo-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              placeholder="Optional remarks (e.g. sick leave, late entry)"
                              value={cur.remarks || ''}
                              onChange={(e) =>
                                setStudentStatuses({
                                  ...studentStatuses,
                                  [stu.id]: { ...cur, remarks: e.target.value },
                                })
                              }
                              className="w-full max-w-xs px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-500 focus:outline-hidden"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE HISTORY LOGS */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Attendance Session Logs ({attendanceRecords.length} Recorded)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of completed lectures, labs, and student attendance logs.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Course / Subject</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Present / Total</th>
                  <th className="px-6 py-3">Attendance %</th>
                  <th className="px-6 py-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attendanceRecords.map((rec) => {
                  const subj = subjects.find((s) => s.id === rec.subjectId);
                  const total = rec.entries.length;
                  const pres = rec.entries.filter(
                    (e) => e.status === 'Present' || e.status === 'Late'
                  ).length;
                  const pct = total > 0 ? Math.round((pres / total) * 100) : 0;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-medium text-slate-900">
                        {rec.date}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{subj?.name || 'Course'}</div>
                        <div className="text-[11px] font-mono text-slate-500">{subj?.code}</div>
                      </td>
                      <td className="px-6 py-3.5 font-medium">
                        Sem {rec.semester} - Div {rec.division}
                      </td>
                      <td className="px-6 py-3.5 font-mono">
                        {pres} / {total}
                      </td>
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {pct}%
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXAM MARKS & RESULTS */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Examination & Results Entry Center
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload Excel spreadsheets with revision tests and semester exam scores mapped automatically by student Roll Number.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateExamOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
              >
                + Define New Exam
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetExam = exams.find((e) => e.id === selectedExamId);
                  const examSubjs = subjects.filter((s) => s.branchId === currentUser?.branchId);
                  const semStudents = users.filter((u) => u.role === 'student' && u.branchId === currentUser?.branchId);
                  downloadExamMarksTemplate(
                    targetExam?.name || 'Semester_Exam',
                    examSubjs,
                    semStudents
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download Marks Template
              </button>

              <button
                type="button"
                onClick={() => setIsExamModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Marks via Excel
              </button>
            </div>
          </div>

          {/* Exam Selector Strip */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Active Examination:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.examType} · Total {exam.totalMarks} Marks)
                </option>
              ))}
            </select>
          </div>

          {/* Exam Results Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Published Scores & Grades
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Values immediately synchronize to the respective Student Dashboard.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Roll No</th>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Marks Obtained</th>
                    <th className="px-6 py-3">Max Marks</th>
                    <th className="px-6 py-3">Grade</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {examResults
                    .filter((r) => r.examId === selectedExamId)
                    .map((item) => {
                      const stu = users.find((u) => u.id === item.studentId);
                      const subj = subjects.find((s) => s.id === item.subjectId);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3 font-mono font-bold text-slate-900">
                            {stu?.studentProfile?.rollNo || 'N/A'}
                          </td>
                          <td className="px-6 py-3 font-semibold text-slate-900">
                            {stu?.name || 'Student'}
                          </td>
                          <td className="px-6 py-3">
                            <span className="font-mono font-semibold text-indigo-700 mr-1.5">
                              {subj?.code}
                            </span>
                            <span>{subj?.name}</span>
                          </td>
                          <td className="px-6 py-3 font-mono font-bold tabular-nums text-slate-900">
                            {item.marksObtained}
                          </td>
                          <td className="px-6 py-3 font-mono text-slate-500 tabular-nums">
                            {item.maxMarks}
                          </td>
                          <td className="px-6 py-3 font-mono font-bold text-indigo-700">
                            {item.grade}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`font-semibold text-xs ${
                                item.status === 'Pass' ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-400 text-[11px]">
                            {item.remarks || '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal for Exam Marks */}
      <ExcelUploadModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title="Upload Examination Marks Spreadsheet"
        description="Select an Excel or CSV file containing Roll Numbers, Subject Codes, and Marks. The system will map each record directly to registered students."
        type="exam_results"
        templateDownloadFn={() => {
          const targetExam = exams.find((e) => e.id === selectedExamId);
          const examSubjs = subjects.filter((s) => s.branchId === currentUser?.branchId);
          const semStudents = users.filter((u) => u.role === 'student' && u.branchId === currentUser?.branchId);
          downloadExamMarksTemplate(targetExam?.name || 'Exam', examSubjs, semStudents);
        }}
        templateLabel="Sample Marks Template"
        onConfirmExamUpload={handleExamExcelUpload}
      />

      {/* Modal: Define New Exam */}
      {isCreateExamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Define Examination / Assessment
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateExamOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateExamSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Exam Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revision Test 2 (Units 3 & 4)"
                  value={newExamForm.name}
                  onChange={(e) => setNewExamForm({ ...newExamForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Assessment Type</label>
                  <select
                    value={newExamForm.examType}
                    onChange={(e) =>
                      setNewExamForm({ ...newExamForm, examType: e.target.value as any })
                    }
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Revision Test">Revision Test</option>
                    <option value="Mid-Term Exam">Mid-Term Exam</option>
                    <option value="End-Semester Exam">End-Semester Exam</option>
                    <option value="Practical Viva">Practical Viva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={newExamForm.semester}
                    onChange={(e) => setNewExamForm({ ...newExamForm, semester: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Total Marks</label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={newExamForm.totalMarks}
                    onChange={(e) => setNewExamForm({ ...newExamForm, totalMarks: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Passing Threshold</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newExamForm.passingMarks}
                    onChange={(e) => setNewExamForm({ ...newExamForm, passingMarks: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Conduct Date</label>
                <input
                  type="date"
                  value={newExamForm.date}
                  onChange={(e) => setNewExamForm({ ...newExamForm, date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateExamOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Save Exam Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
