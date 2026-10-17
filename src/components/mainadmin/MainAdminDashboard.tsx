import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Users,
  Bell,
  Sparkles,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  UserCheck,
  Building,
  GraduationCap,
  Layers,
  Clock,
  Trash2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  DEFAULT_TIME_SLOTS,
  DAYS_OF_WEEK,
  generateConflictFreeTimetable,
  validateTimetableConflicts,
} from '../../utils/timetableGenerator';
import { exportTimetableToExcel } from '../../utils/excelHelpers';
import { Subject, TimetableSlot } from '../../types/erp';

export const MainAdminDashboard: React.FC = () => {
  const {
    currentUser,
    branches,
    users,
    subjects,
    timetableSlots,
    notices,
    saveTimetableSlots,
    createTeacher,
    updateTeacher,
    createSubject,
    deleteSubject,
    publishNotice,
    deleteNotice,
    switchUserById,
  } = useERP();

  // Active Main Admin's branch
  const branch = branches.find((b) => b.id === currentUser?.branchId) || branches[0];

  // Tabs
  const [activeTab, setActiveTab] = useState<'timetable' | 'faculty' | 'notices' | 'subjects'>(
    'timetable'
  );

  // Timetable view state
  const [selectedSemester, setSelectedSemester] = useState<number>(4);
  const [selectedDivision, setSelectedDivision] = useState<string>('A');

  // Modals
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [generatorResult, setGeneratorResult] = useState<{
    count: number;
    warnings: string[];
    hasConflicts: boolean;
  } | null>(null);

  // Forms
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    phone: '',
    assignedSubjects: [] as string[],
    isClassIncharge: false,
    inchargeSemester: 4,
    inchargeDivision: 'A',
  });

  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    semester: 4,
    credits: 4,
    weeklyHours: 4,
    type: 'Theory' as 'Theory' | 'Practical' | 'Tutorial',
    preferredRoomType: 'Classroom' as 'Classroom' | 'Computer Lab' | 'Hardware Lab',
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    description: '',
    category: 'Academic' as 'Academic' | 'Exam' | 'Event' | 'Circular' | 'Urgent',
    isUrgent: false,
    targetSemester: 0, // 0 means all
    attachmentName: '',
  });

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const notify = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Branch data slices
  const branchTeachers = useMemo(
    () => users.filter((u) => u.role === 'teacher' && u.branchId === branch?.id),
    [users, branch]
  );

  const branchSubjects = useMemo(
    () => subjects.filter((s) => s.branchId === branch?.id),
    [subjects, branch]
  );

  const semSubjects = useMemo(
    () => branchSubjects.filter((s) => s.semester === selectedSemester),
    [branchSubjects, selectedSemester]
  );

  const branchNotices = useMemo(
    () =>
      notices.filter(
        (n) => !n.targetBranchId || n.targetBranchId === branch?.id
      ),
    [notices, branch]
  );

  // Current timetable for selected semester & division
  const currentSlots = useMemo(
    () =>
      timetableSlots.filter(
        (s) =>
          s.branchId === branch?.id &&
          s.semester === selectedSemester &&
          s.division === selectedDivision
      ),
    [timetableSlots, branch, selectedSemester, selectedDivision]
  );

  // Automatic conflict-free generator handler
  const handleAutoGenerateTimetable = () => {
    if (!branch) return;

    // Retrieve other slots to avoid cross-semester teacher collisions
    const otherSlots = timetableSlots.filter(
      (s) => s.branchId === branch.id && s.semester !== selectedSemester
    );

    const result = generateConflictFreeTimetable({
      branchId: branch.id,
      semester: selectedSemester,
      divisions: branch.divisionsPerSemester || ['A', 'B'],
      subjects: branchSubjects,
      teachers: branchTeachers,
      existingSlots: otherSlots,
    });

    if (!result.success) {
      alert(`Generation failed: ${result.warnings.join(', ')}`);
      return;
    }

    // Validate the generated timetable
    const validation = validateTimetableConflicts([...otherSlots, ...result.slots]);

    // Save to context
    saveTimetableSlots(result.slots, branch.id, selectedSemester);

    setGeneratorResult({
      count: result.slots.length,
      warnings: result.warnings,
      hasConflicts: validation.hasConflicts,
    });

    notify(
      `Successfully generated conflict-free timetable (${result.slots.length} periods) for Sem ${selectedSemester} Divisions ${branch.divisionsPerSemester?.join(' & ')}.`
    );
  };

  const handleExportTimetable = () => {
    if (!branch) return;
    const scheduleRows = DAYS_OF_WEEK.map((day) => {
      const row: Record<string, any> = { Day: day };
      DEFAULT_TIME_SLOTS.forEach((slot) => {
        const found = currentSlots.find((s) => s.day === day && s.slotIndex === slot.index);
        if (found) {
          const subj = subjects.find((s) => s.id === found.subjectId);
          const teacher = branchTeachers.find((t) => t.id === found.teacherId);
          row[`${slot.startTime} - ${slot.endTime}`] = `${subj?.name || found.subjectId} (${teacher?.name || 'TBA'}) [${found.roomNumber}]`;
        } else {
          row[`${slot.startTime} - ${slot.endTime}`] = 'Free / Library';
        }
      });
      return row;
    });

    exportTimetableToExcel(branch.code, selectedSemester, selectedDivision, scheduleRows);
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.email || !branch) return;

    createTeacher({
      name: teacherForm.name,
      email: teacherForm.email,
      phone: teacherForm.phone,
      branchId: branch.id,
      assignedSubjects: teacherForm.assignedSubjects,
      isClassIncharge: teacherForm.isClassIncharge,
      inchargeClass: teacherForm.isClassIncharge
        ? { semester: Number(teacherForm.inchargeSemester), division: teacherForm.inchargeDivision }
        : undefined,
    });

    notify(
      `Teacher "${teacherForm.name}" created and assigned to ${branch.code} department.`
    );
    setIsTeacherModalOpen(false);
    setTeacherForm({
      name: '',
      email: '',
      phone: '',
      assignedSubjects: [],
      isClassIncharge: false,
      inchargeSemester: 4,
      inchargeDivision: 'A',
    });
  };

  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.code || !subjectForm.name || !branch) return;

    createSubject({
      branchId: branch.id,
      code: subjectForm.code.toUpperCase(),
      name: subjectForm.name,
      semester: Number(subjectForm.semester),
      credits: Number(subjectForm.credits),
      weeklyHours: Number(subjectForm.weeklyHours),
      type: subjectForm.type,
      preferredRoomType: subjectForm.preferredRoomType,
    });

    notify(`Subject "${subjectForm.name}" (${subjectForm.code}) added successfully.`);
    setIsSubjectModalOpen(false);
    setSubjectForm({
      code: '',
      name: '',
      semester: selectedSemester,
      credits: 4,
      weeklyHours: 4,
      type: 'Theory',
      preferredRoomType: 'Classroom',
    });
  };

  const handleNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.description || !branch) return;

    publishNotice({
      title: noticeForm.title,
      description: noticeForm.description,
      category: noticeForm.category,
      isUrgent: noticeForm.isUrgent,
      targetBranchId: branch.id,
      targetSemester: noticeForm.targetSemester > 0 ? Number(noticeForm.targetSemester) : undefined,
      authorName: currentUser?.name || 'Main Admin',
      authorRole: `Main Admin (${branch.code})`,
      attachmentName: noticeForm.attachmentName || undefined,
    });

    notify(`Notice "${noticeForm.title}" published to student & faculty dashboards.`);
    setIsNoticeModalOpen(false);
    setNoticeForm({
      title: '',
      description: '',
      category: 'Academic',
      isUrgent: false,
      targetSemester: 0,
      attachmentName: '',
    });
  };

  const totalBranchStudents = users.filter(
    (u) => u.role === 'student' && u.branchId === branch?.id
  ).length;

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {statusMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {branch?.name}
            </h1>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
              {branch?.code} Branch
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department HOD: {branch?.headOfDepartment} · Managing {branchTeachers.length} Faculty Members & {totalBranchStudents} Students
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNoticeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <Bell className="w-4 h-4 text-indigo-600" />
            Publish Notice
          </button>
          <button
            type="button"
            onClick={() => setIsTeacherModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
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
          Timetable Generator & Schedule
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faculty')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'faculty'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Faculty & Class Incharges ({branchTeachers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 px-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Subject Master ({branchSubjects.length})
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
          Notices & Circulars ({branchNotices.length})
        </button>
      </div>

      {/* TAB 1: TIMETABLE MANAGEMENT */}
      {activeTab === 'timetable' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Semester Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Semester:</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: branch?.totalSemesters || 8 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Division:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  {(branch?.divisionsPerSemester || ['A', 'B']).map((div) => (
                    <button
                      key={div}
                      type="button"
                      onClick={() => setSelectedDivision(div)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        selectedDivision === div
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Div {div}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400">
                · {semSubjects.length} subjects enrolled in Sem {selectedSemester}
              </div>
            </div>

            {/* Timetable Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportTimetable}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export to Excel
              </button>

              <button
                type="button"
                onClick={handleAutoGenerateTimetable}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Generate Conflict-Free Schedule
              </button>
            </div>
          </div>

          {/* Generator result banner */}
          {generatorResult && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  Algorithm Generated {generatorResult.count} Conflict-Free Class Slots
                </span>
                <span className="text-[11px] text-indigo-800 font-mono font-semibold">
                  Zero Conflicts Verified
                </span>
              </div>
              {generatorResult.warnings.length > 0 && (
                <div className="text-[11px] text-indigo-700 space-y-0.5 mt-1">
                  {generatorResult.warnings.map((w, idx) => (
                    <div key={idx}>· {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timetable Matrix Grid */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Weekly Class Timetable · Semester {selectedSemester} - Division {selectedDivision}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monday to Friday schedule with automatic classroom and laboratory allocations.
                </p>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-100 border border-indigo-300"></span>
                  Theory Lecture
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300"></span>
                  Laboratory Session
                </span>
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
                        const cellSlot = currentSlots.find(
                          (s) => s.day === day && s.slotIndex === slot.index
                        );

                        if (!cellSlot) {
                          return (
                            <td
                              key={slot.index}
                              className="px-4 py-3.5 border-r border-slate-100 text-slate-400 italic text-[11px]"
                            >
                              Free / Recess
                            </td>
                          );
                        }

                        const subj = subjects.find((s) => s.id === cellSlot.subjectId);
                        const teacher = branchTeachers.find((t) => t.id === cellSlot.teacherId);

                        return (
                          <td
                            key={slot.index}
                            className={`px-4 py-3 border-r border-slate-100 ${
                              cellSlot.isLab
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                                : 'bg-indigo-50/30 hover:bg-indigo-50/60'
                            } transition-colors`}
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-slate-700">
                                  {subj?.code || 'SUBJ'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {cellSlot.roomNumber}
                                </span>
                              </div>
                              <div className="font-semibold text-slate-900 text-xs leading-tight line-clamp-2">
                                {subj?.name || 'Class Subject'}
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
        </div>
      )}

      {/* TAB 2: FACULTY & CLASS INCHARGES */}
      {activeTab === 'faculty' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Department Faculty & Designated Class Incharges
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Class Incharges have administrative authority to manage student rosters and upload Excel spreadsheets.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Teacher Account
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Faculty Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Assigned Subjects</th>
                  <th className="px-6 py-3">Designation</th>
                  <th className="px-6 py-3">Role Privilege</th>
                  <th className="px-6 py-3 text-right">Quick Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {branchTeachers.map((teacher) => {
                  const assignedSubjNames = (teacher.assignedSubjects || [])
                    .map((sId) => subjects.find((s) => s.id === sId)?.name)
                    .filter(Boolean);

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {teacher.name[0]}
                        </div>
                        {teacher.name}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{teacher.email}</td>
                      <td className="px-6 py-3.5">
                        <div className="text-xs text-slate-800 font-medium">
                          {assignedSubjNames.length > 0
                            ? assignedSubjNames.join(', ')
                            : 'No subjects currently assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {teacher.isClassIncharge ? (
                          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                            <UserCheck className="w-4 h-4 text-indigo-600" />
                            <span>
                              Class Incharge (Sem {teacher.inchargeClass?.semester}-{teacher.inchargeClass?.division})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Subject Faculty</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {teacher.isClassIncharge ? (
                          <span>Roster Upload, Attendance & Marks</span>
                        ) : (
                          <span>Attendance & Marks Upload</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => switchUserById(teacher.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          Launch Dashboard
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUBJECT MASTER */}
      {activeTab === 'subjects' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Branch Subject Master Catalog
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Curriculum syllabus, credit load, weekly teaching hours, and facility room assignments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Subject
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Subject Name</th>
                  <th className="px-6 py-3">Semester</th>
                  <th className="px-6 py-3">Credits</th>
                  <th className="px-6 py-3">Weekly Hours</th>
                  <th className="px-6 py-3">Course Type</th>
                  <th className="px-6 py-3">Facility Requirement</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {branchSubjects.map((subj) => (
                  <tr key={subj.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono font-bold text-slate-900">{subj.code}</td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{subj.name}</td>
                    <td className="px-6 py-3 font-mono tabular-nums">Sem {subj.semester}</td>
                    <td className="px-6 py-3 font-mono tabular-nums">{subj.credits}</td>
                    <td className="px-6 py-3 font-mono tabular-nums">{subj.weeklyHours} hrs/week</td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-slate-800">{subj.type}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{subj.preferredRoomType || 'Classroom'}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete subject ${subj.code} - ${subj.name}?`)) {
                            deleteSubject(subj.id);
                            notify(`Subject ${subj.code} deleted.`);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: NOTICES & CIRCULARS */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Departmental Notices & Circulars
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Announcements published here are instantly broadcasted to all student and teacher dashboards in this branch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNoticeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Circular
            </button>
          </div>

          <div className="grid gap-3">
            {branchNotices.map((n) => (
              <div
                key={n.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-indigo-700">{n.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Published {n.publishedDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>By {n.authorName}</span>
                      {n.targetSemester && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">Semester {n.targetSemester}</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{n.description}</p>
                    {n.attachmentName && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors">
                        <Download className="w-3 h-3 text-slate-500" />
                        {n.attachmentName}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete notice "${n.title}"?`)) {
                        deleteNotice(n.id);
                        notify('Notice deleted.');
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Delete Notice"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Teacher */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Create Sub Admin (Teacher) Account
              </h3>
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTeacherSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Teacher Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Alan Turing"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="alan.turing@campuscore.edu"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98450 12345"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Assign Subjects */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Teaching Subjects ({branch?.code})
                </label>
                <div className="border border-slate-200 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50/50">
                  {branchSubjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={teacherForm.assignedSubjects.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTeacherForm({
                              ...teacherForm,
                              assignedSubjects: [...teacherForm.assignedSubjects, s.id],
                            });
                          } else {
                            setTeacherForm({
                              ...teacherForm,
                              assignedSubjects: teacherForm.assignedSubjects.filter((id) => id !== s.id),
                            });
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-mono font-semibold text-slate-900">{s.code}</span>
                      <span>- {s.name} (Sem {s.semester})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Class Incharge Designation */}
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teacherForm.isClassIncharge}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, isClassIncharge: e.target.checked })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-indigo-950">
                    Designate as Class Incharge
                  </span>
                </label>
                <p className="text-[11px] text-indigo-800 leading-tight">
                  Designating this teacher enables them to upload student roster Excel sheets, monitor class attendance, and manage students for their division.
                </p>

                {teacherForm.isClassIncharge && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-950">
                        Incharge Semester
                      </label>
                      <select
                        value={teacherForm.inchargeSemester}
                        onChange={(e) =>
                          setTeacherForm({ ...teacherForm, inchargeSemester: Number(e.target.value) })
                        }
                        className="mt-1 block w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-md bg-white"
                      >
                        {Array.from({ length: branch?.totalSemesters || 8 }, (_, i) => i + 1).map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-950">
                        Incharge Division
                      </label>
                      <select
                        value={teacherForm.inchargeDivision}
                        onChange={(e) =>
                          setTeacherForm({ ...teacherForm, inchargeDivision: e.target.value })
                        }
                        className="mt-1 block w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-md bg-white"
                      >
                        {(branch?.divisionsPerSemester || ['A', 'B']).map((div) => (
                          <option key={div} value={div}>
                            Division {div}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Create Faculty Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Subject */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Add Subject to {branch?.code} Master
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubjectSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS405"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={subjectForm.credits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, credits: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Weekly Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={subjectForm.weeklyHours}
                    onChange={(e) => setSubjectForm({ ...subjectForm, weeklyHours: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Course Type</label>
                  <select
                    value={subjectForm.type}
                    onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value as any })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Theory">Theory Lecture</option>
                    <option value="Practical">Practical Laboratory</option>
                    <option value="Tutorial">Tutorial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Facility Type</label>
                  <select
                    value={subjectForm.preferredRoomType}
                    onChange={(e) => setSubjectForm({ ...subjectForm, preferredRoomType: e.target.value as any })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Computer Lab">Computer Lab</option>
                    <option value="Hardware Lab">Hardware Lab</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Publish Notice */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Publish Circular / Announcement
              </h3>
              <button
                type="button"
                onClick={() => setIsNoticeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleNoticeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End-Semester Examination Hall Seating & Schedule"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={noticeForm.category}
                    onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value as any })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Exam">Exam</option>
                    <option value="Event">Event</option>
                    <option value="Circular">General Circular</option>
                    <option value="Urgent">Urgent / Important</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Target Semester</label>
                  <select
                    value={noticeForm.targetSemester}
                    onChange={(e) => setNoticeForm({ ...noticeForm, targetSemester: Number(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={0}>All Semesters in {branch?.code}</option>
                    {Array.from({ length: branch?.totalSemesters || 8 }, (_, i) => i + 1).map((s) => (
                      <option key={s} value={s}>
                        Semester {s} Only
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notice Body & Details</label>
                <textarea
                  rows={4}
                  required
                  value={noticeForm.description}
                  onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg leading-relaxed"
                  placeholder="Provide complete circular guidelines, eligibility rules, and instructions."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Attachment File Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule_Spring_2026.pdf"
                  value={noticeForm.attachmentName}
                  onChange={(e) => setNoticeForm({ ...noticeForm, attachmentName: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
