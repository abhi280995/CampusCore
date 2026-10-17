import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Bell,
  Printer,
  Download,
  BookOpen,
  User,
  Phone,
  Mail,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_TIME_SLOTS, DAYS_OF_WEEK } from '../../utils/timetableGenerator';

export const StudentDashboard: React.FC = () => {
  const {
    currentUser,
    branches,
    subjects,
    timetableSlots,
    attendanceRecords,
    notices,
    exams,
    examResults,
    users,
  } = useERP();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'timetable' | 'attendance' | 'results' | 'notices'>(
    'overview'
  );

  // Selected exam for results tab
  const [selectedExamId, setSelectedExamId] = useState<string>(() => exams[0]?.id || '');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Student profile attributes
  const profile = currentUser?.studentProfile;
  const semester = profile?.semester || 4;
  const division = profile?.division || 'A';
  const branch = branches.find((b) => b.id === currentUser?.branchId);

  // Semester subjects for student
  const studentSubjects = useMemo(() => {
    return subjects.filter(
      (s) => s.branchId === currentUser?.branchId && s.semester === semester
    );
  }, [subjects, currentUser, semester]);

  // Student's timetable slots (filtered strictly to their branch, sem, division)
  const myTimetableSlots = useMemo(() => {
    return timetableSlots.filter(
      (s) =>
        s.branchId === currentUser?.branchId &&
        s.semester === semester &&
        s.division === division
    );
  }, [timetableSlots, currentUser, semester, division]);

  // Today's classes
  const todayClasses = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[new Date().getDay()] as any;
    const targetDay = DAYS_OF_WEEK.includes(currentDayName) ? currentDayName : 'Monday';

    return myTimetableSlots
      .filter((s) => s.day === targetDay)
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }, [myTimetableSlots]);

  // Subject-wise attendance breakdown
  const attendanceBreakdown = useMemo(() => {
    const breakdown = studentSubjects.map((subj) => {
      // Find all records for this subject and student's division
      const records = attendanceRecords.filter(
        (r) =>
          r.subjectId === subj.id &&
          r.branchId === currentUser?.branchId &&
          r.semester === semester &&
          r.division === division
      );

      let total = 0;
      let attended = 0;

      records.forEach((rec) => {
        const entry = rec.entries.find((e) => e.studentId === currentUser?.id);
        if (entry) {
          total++;
          if (entry.status === 'Present' || entry.status === 'Late') {
            attended++;
          }
        }
      });

      const pct = total > 0 ? Math.round((attended / total) * 100) : 100;
      return {
        subject: subj,
        totalClasses: total,
        attendedClasses: attended,
        percentage: pct,
        isDebarredRisk: total > 0 && pct < 75,
      };
    });

    const totalConducted = breakdown.reduce((acc, b) => acc + b.totalClasses, 0);
    const totalAttended = breakdown.reduce((acc, b) => acc + b.attendedClasses, 0);
    const overallPct = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 100;

    return {
      list: breakdown,
      totalConducted,
      totalAttended,
      overallPct,
      isOverallEligible: overallPct >= 75,
    };
  }, [studentSubjects, attendanceRecords, currentUser, semester, division]);

  // Exam Results for selected exam
  const currentExamResults = useMemo(() => {
    return examResults.filter(
      (r) => r.examId === selectedExamId && r.studentId === currentUser?.id
    );
  }, [examResults, selectedExamId, currentUser]);

  const activeExam = exams.find((e) => e.id === selectedExamId);

  // Calculated GPA/SGPA
  const calculatedGPA = useMemo(() => {
    if (currentExamResults.length === 0) return 0;
    const gradePointsMap: Record<string, number> = {
      'A+': 10,
      A: 9,
      'B+': 8,
      B: 7,
      C: 6,
      D: 5,
      F: 0,
    };
    let totalPoints = 0;
    currentExamResults.forEach((r) => {
      totalPoints += gradePointsMap[r.grade] || 7;
    });
    return (totalPoints / currentExamResults.length).toFixed(2);
  }, [currentExamResults]);

  // Relevant Notices
  const studentNotices = useMemo(() => {
    return notices.filter((n) => {
      if (n.targetBranchId && n.targetBranchId !== currentUser?.branchId) return false;
      if (n.targetSemester && n.targetSemester !== semester) return false;
      return true;
    });
  }, [notices, currentUser, semester]);

  return (
    <div className="space-y-6">
      {/* Student Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            {currentUser?.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {currentUser?.name}
              </h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                Roll: {profile?.rollNo}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span>{branch?.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-700">
                Semester {semester} - Division {division}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Reg: {profile?.enrollmentNo}</span>
              <span aria-hidden="true">·</span>
              <span>Blood Group: {profile?.bloodGroup || 'O+'}</span>
            </div>
          </div>
        </div>

        {/* Quick Attendance Summary Badge */}
        <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 shrink-0">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-400">Overall Attendance</div>
            <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {attendanceBreakdown.overallPct}%
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Exam Eligibility</div>
            <div
              className={`text-xs font-bold ${
                attendanceBreakdown.isOverallEligible ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {attendanceBreakdown.isOverallEligible ? 'Eligible (≥ 75%)' : 'Debarred Warning (< 75%)'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Academic Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timetable')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'timetable'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          My Class Timetable
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
          Attendance Records
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'results'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Examination Results & Grades
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notices')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'notices'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          Notices & Circulars ({studentNotices.length})
        </button>
      </div>

      {/* TAB 1: ACADEMIC OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Today's Schedule Highlight */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Today's Class Schedule</h3>
                <p className="text-xs text-slate-500">Live lecture schedule for Sem {semester} - Div {division}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('timetable')}
                className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
              >
                View Full Weekly Timetable <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayClasses.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No scheduled lectures today.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {todayClasses.map((slot) => {
                  const subj = subjects.find((s) => s.id === slot.subjectId);
                  const teacher = users.find((u) => u.id === slot.teacherId);

                  return (
                    <div
                      key={slot.id}
                      className={`p-3.5 rounded-xl border ${
                        slot.isLab
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-mono font-semibold text-slate-700">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <span className="font-mono font-bold text-slate-800">{slot.roomNumber}</span>
                      </div>
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {subj?.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 truncate">
                        Faculty: {teacher?.name || 'Assigned Professor'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dual Split: Attendance summary & Latest Circulars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject Attendance mini-card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Subject Attendance</h3>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {attendanceBreakdown.overallPct}% Aggregate
                </span>
              </div>
              <div className="space-y-3">
                {attendanceBreakdown.list.slice(0, 4).map((item) => (
                  <div key={item.subject.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate max-w-[200px]">
                        {item.subject.name}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          item.percentage < 75 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {item.percentage}% ({item.attendedClasses}/{item.totalClasses})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.percentage < 75 ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Notices */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Department Circulars</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('notices')}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  All ({studentNotices.length})
                </button>
              </div>
              <div className="space-y-2.5">
                {studentNotices.slice(0, 3).map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-indigo-700">{n.category}</span>
                      <span>{n.publishedDate}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-0.5">{n.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY CLASS TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Weekly Class Timetable · Semester {semester} - Division {division}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assigned lecture rooms, laboratory sessions, and course professors.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="px-4 py-3 border-r border-slate-200 w-28">Day</th>
                  {DEFAULT_TIME_SLOTS.map((slot) => (
                    <th key={slot.index} className="px-4 py-3 border-r border-slate-200 min-w-[170px]">
                      <div className="font-semibold text-slate-900">{slot.label}</div>
                      <div className="text-[11px] text-slate-500 font-mono font-normal">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DAYS_OF_WEEK.map((day) => (
                  <tr key={day} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-semibold text-slate-900 border-r border-slate-200 bg-slate-50/30">
                      {day}
                    </td>
                    {DEFAULT_TIME_SLOTS.map((slot) => {
                      const cell = myTimetableSlots.find(
                        (s) => s.day === day && s.slotIndex === slot.index
                      );

                      if (!cell) {
                        return (
                          <td
                            key={slot.index}
                            className="px-4 py-3.5 border-r border-slate-100 text-slate-400 italic text-[11px]"
                          >
                            Recess / Self-Study
                          </td>
                        );
                      }

                      const subj = subjects.find((s) => s.id === cell.subjectId);
                      const teacher = users.find((u) => u.id === cell.teacherId);

                      return (
                        <td
                          key={slot.index}
                          className={`px-4 py-3 border-r border-slate-100 ${
                            cell.isLab
                              ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                              : 'bg-indigo-50/30 hover:bg-indigo-50/60'
                          } transition-colors`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-slate-700">
                                {subj?.code || 'SUBJ'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 font-medium">
                                {cell.roomNumber}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-900 text-xs leading-tight line-clamp-2">
                              {subj?.name}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              {teacher?.name || 'Faculty Member'}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE RECORDS */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Attendance Records & Academic Statute
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Minimum 75% aggregate is required in all theory and practical courses to maintain examination eligibility.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Aggregate:</span>
              <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                {attendanceBreakdown.overallPct}%
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Course Code</th>
                    <th className="px-6 py-3">Subject Name</th>
                    <th className="px-6 py-3">Course Type</th>
                    <th className="px-6 py-3">Classes Attended</th>
                    <th className="px-6 py-3">Total Conducted</th>
                    <th className="px-6 py-3">Attendance %</th>
                    <th className="px-6 py-3">University Criteria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {attendanceBreakdown.list.map((item) => (
                    <tr key={item.subject.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {item.subject.code}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">
                        {item.subject.name}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 font-medium">
                        {item.subject.type}
                      </td>
                      <td className="px-6 py-3.5 font-mono tabular-nums font-semibold text-slate-900">
                        {item.attendedClasses}
                      </td>
                      <td className="px-6 py-3.5 font-mono tabular-nums text-slate-500">
                        {item.totalClasses}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`font-mono font-bold tabular-nums text-sm ${
                            item.percentage < 75 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {item.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {item.percentage >= 75 ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Shortage Warning
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXAMINATION RESULTS & GRADES */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Examination Marksheet & Grade Cards
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Semester evaluation scores published by department faculty.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Grade Report
              </button>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400">Semester GPA</div>
              <div className="text-2xl font-bold font-mono text-indigo-700 mt-1 tabular-nums">
                {calculatedGPA} / 10.0
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400">Total Subjects Evaluated</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {currentExamResults.length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400">Assessment Status</div>
              <div className="text-base font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All Cleared
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-400">Academic Standing</div>
              <div className="text-base font-bold text-slate-900 mt-1">
                Distinction / First Class
              </div>
            </div>
          </div>

          {/* Subject Scores Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Subject Code</th>
                    <th className="px-6 py-3">Subject Name</th>
                    <th className="px-6 py-3">Marks Obtained</th>
                    <th className="px-6 py-3">Max Marks</th>
                    <th className="px-6 py-3">Grade Awarded</th>
                    <th className="px-6 py-3">Result Status</th>
                    <th className="px-6 py-3">Faculty Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {currentExamResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-xs">
                        No results published yet for this examination.
                      </td>
                    </tr>
                  ) : (
                    currentExamResults.map((r) => {
                      const subj = subjects.find((s) => s.id === r.subjectId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                            {subj?.code || 'SUBJ'}
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900">
                            {subj?.name}
                          </td>
                          <td className="px-6 py-3.5 font-mono font-bold tabular-nums text-slate-900">
                            {r.marksObtained}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-slate-500 tabular-nums">
                            {r.maxMarks}
                          </td>
                          <td className="px-6 py-3.5 font-mono font-bold text-indigo-700 text-sm">
                            {r.grade}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`font-semibold text-xs ${
                                r.status === 'Pass' ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 text-[11px]">
                            {r.remarks || 'Satisfactory'}
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

      {/* TAB 5: NOTICES & CIRCULARS */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Official Campus Notices & Circulars
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Announcements published by the Academic Dean and Department Heads.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {studentNotices.map((n) => (
              <div
                key={n.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-indigo-700">{n.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Published {n.publishedDate}</span>
                  <span aria-hidden="true">·</span>
                  <span>By {n.authorName} ({n.authorRole})</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{n.description}</p>
                {n.attachmentName && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors cursor-pointer">
                    <Download className="w-3 h-3 text-slate-500" />
                    {n.attachmentName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable Progress Report Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden p-8 space-y-6">
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest font-mono text-slate-400">
                  CampusCore University Portal
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  Official Statement of Marks
                </h2>
                <div className="text-xs text-slate-600 mt-0.5">
                  {activeExam?.name} · Spring Semester 2026
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-slate-900">
                  Roll: {profile?.rollNo}
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  Reg: {profile?.enrollmentNo}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Student Name:</span>{' '}
                <span className="font-bold text-slate-900">{currentUser?.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Department:</span>{' '}
                <span className="font-bold text-slate-900">{branch?.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Semester & Div:</span>{' '}
                <span className="font-bold text-slate-900">Sem {semester} - Div {division}</span>
              </div>
              <div>
                <span className="text-slate-400">Calculated SGPA:</span>{' '}
                <span className="font-bold font-mono text-indigo-700">{calculatedGPA} / 10.0</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Subject Name</th>
                    <th className="px-4 py-2 text-right">Marks</th>
                    <th className="px-4 py-2 text-right">Max</th>
                    <th className="px-4 py-2 text-center">Grade</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentExamResults.map((r) => {
                    const subj = subjects.find((s) => s.id === r.subjectId);
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-2 font-mono font-medium">{subj?.code}</td>
                        <td className="px-4 py-2">{subj?.name}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold">{r.marksObtained}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-400">{r.maxMarks}</td>
                        <td className="px-4 py-2 text-center font-mono font-bold text-indigo-700">{r.grade}</td>
                        <td className="px-4 py-2 text-center font-semibold text-emerald-700">{r.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Verified electronically by College Examination Branch · {new Date().toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
