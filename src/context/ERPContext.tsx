import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AttendanceRecord,
  Branch,
  Exam,
  ExamResultItem,
  Notice,
  Subject,
  TimetableSlot,
  User,
  UserRole,
} from '../types/erp';
import {
  INITIAL_ATTENDANCE,
  INITIAL_BRANCHES,
  INITIAL_EXAMS,
  INITIAL_NOTICES,
  INITIAL_RESULTS,
  INITIAL_SUBJECTS,
  INITIAL_TIMETABLE_SLOTS,
  INITIAL_USERS,
} from '../data/initialData';
import { ParsedStudentRow, ParsedExamResultRow } from '../utils/excelHelpers';

const STORAGE_KEY = 'campuscore_erp_v2';

interface ERPContextType {
  currentUser: User | null;
  users: User[];
  branches: Branch[];
  subjects: Subject[];
  timetableSlots: TimetableSlot[];
  attendanceRecords: AttendanceRecord[];
  notices: Notice[];
  exams: Exam[];
  examResults: ExamResultItem[];

  // Auth / Role switching
  login: (email: string) => boolean;
  logout: () => void;
  switchUserById: (userId: string) => void;
  quickSwitchRole: (role: UserRole | 'class_incharge') => void;

  // Super Admin actions
  createBranch: (branch: Omit<Branch, 'id' | 'createdAt'>) => void;
  updateBranch: (id: string, branch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  createMainAdmin: (admin: { name: string; email: string; phone: string; branchId: string }) => void;

  // Main Admin actions
  createTeacher: (teacher: {
    name: string;
    email: string;
    phone: string;
    branchId: string;
    assignedSubjects: string[];
    isClassIncharge?: boolean;
    inchargeClass?: { semester: number; division: string };
  }) => void;
  updateTeacher: (id: string, updates: Partial<User>) => void;
  createSubject: (subject: Omit<Subject, 'id'>) => void;
  deleteSubject: (id: string) => void;
  saveTimetableSlots: (newSlots: TimetableSlot[], branchId: string, semester: number, division?: string) => void;
  publishNotice: (notice: Omit<Notice, 'id' | 'publishedDate'>) => void;
  deleteNotice: (id: string) => void;

  // Class Incharge actions
  importStudentsFromExcel: (
    rows: ParsedStudentRow[],
    branchId: string,
    semester: number,
    division: string
  ) => number;
  addStudent: (student: {
    name: string;
    email: string;
    phone: string;
    branchId: string;
    rollNo: string;
    enrollmentNo: string;
    semester: number;
    division: string;
    guardianName: string;
    guardianContact: string;
    bloodGroup?: string;
  }) => void;
  deleteStudent: (id: string) => void;

  // Teacher / Sub Admin actions
  recordAttendance: (
    record: Omit<AttendanceRecord, 'id' | 'createdAt'>
  ) => void;
  createExam: (exam: Omit<Exam, 'id'>) => string;
  uploadExamResultsFromExcel: (
    examId: string,
    rows: ParsedExamResultRow[]
  ) => { successCount: number; errors: string[] };

  // Utilities
  resetToDefaultData: () => void;
}

const ERPContext = createContext<ERPContextType | null>(null);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from localStorage or use defaults
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [branches, setBranches] = useState<Branch[]>(() =>
    loadStored('branches', INITIAL_BRANCHES)
  );
  const [users, setUsers] = useState<User[]>(() =>
    loadStored('users', INITIAL_USERS)
  );
  const [subjects, setSubjects] = useState<Subject[]>(() =>
    loadStored('subjects', INITIAL_SUBJECTS)
  );
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(() =>
    loadStored('timetable', INITIAL_TIMETABLE_SLOTS)
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    loadStored('attendance', INITIAL_ATTENDANCE)
  );
  const [notices, setNotices] = useState<Notice[]>(() =>
    loadStored('notices', INITIAL_NOTICES)
  );
  const [exams, setExams] = useState<Exam[]>(() =>
    loadStored('exams', INITIAL_EXAMS)
  );
  const [examResults, setExamResults] = useState<ExamResultItem[]>(() =>
    loadStored('results', INITIAL_RESULTS)
  );

  // Default active user is the CSE Main Admin for rapid exploration, or student
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem(`${STORAGE_KEY}_current_user_id`);
    if (savedUserId) {
      const found = users.find((u) => u.id === savedUserId);
      if (found) return found;
    }
    // Default to Main Admin CSE so all modules are readily visible
    return users.find((u) => u.id === 'u_admin_cse') || users[0];
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_branches`, JSON.stringify(branches));
  }, [branches]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_subjects`, JSON.stringify(subjects));
  }, [subjects]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_timetable`, JSON.stringify(timetableSlots));
  }, [timetableSlots]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_notices`, JSON.stringify(notices));
  }, [notices]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_exams`, JSON.stringify(exams));
  }, [exams]);
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_results`, JSON.stringify(examResults));
  }, [examResults]);
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${STORAGE_KEY}_current_user_id`, currentUser.id);
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_current_user_id`);
    }
  }, [currentUser]);

  // Auth methods
  const login = (email: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchUserById = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const quickSwitchRole = (role: UserRole | 'class_incharge') => {
    if (role === 'class_incharge') {
      const incharge = users.find((u) => u.role === 'teacher' && u.isClassIncharge);
      if (incharge) setCurrentUser(incharge);
      return;
    }
    const userForRole = users.find((u) => {
      if (role === 'teacher') return u.role === 'teacher' && !u.isClassIncharge;
      return u.role === role;
    }) || users.find((u) => u.role === role);

    if (userForRole) setCurrentUser(userForRole);
  };

  // Super Admin methods
  const createBranch = (branchData: Omit<Branch, 'id' | 'createdAt'>) => {
    const newBranch: Branch = {
      ...branchData,
      id: `b_${branchData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBranches((prev) => [...prev, newBranch]);
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const deleteBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const createMainAdmin = (admin: {
    name: string;
    email: string;
    phone: string;
    branchId: string;
  }) => {
    const newAdminId = `u_admin_${Date.now()}`;
    const newAdmin: User = {
      id: newAdminId,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: 'main_admin',
      branchId: admin.branchId,
    };
    setUsers((prev) => [...prev, newAdmin]);
    // update branch mainAdminId
    updateBranch(admin.branchId, { mainAdminId: newAdminId });
  };

  // Main Admin methods
  const createTeacher = (teacher: {
    name: string;
    email: string;
    phone: string;
    branchId: string;
    assignedSubjects: string[];
    isClassIncharge?: boolean;
    inchargeClass?: { semester: number; division: string };
  }) => {
    const newTeacherId = `u_teacher_${Date.now()}`;
    const assignedClasses = (teacher.assignedSubjects || []).map((subId) => ({
      semester: 4,
      division: 'A',
      subjectId: subId,
    }));

    const newTeacher: User = {
      id: newTeacherId,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      role: 'teacher',
      branchId: teacher.branchId,
      assignedSubjects: teacher.assignedSubjects,
      isClassIncharge: teacher.isClassIncharge || false,
      inchargeClass: teacher.inchargeClass,
      assignedClasses,
    };

    setUsers((prev) => [...prev, newTeacher]);
  };

  const updateTeacher = (id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const createSubject = (subjectData: Omit<Subject, 'id'>) => {
    const newSubj: Subject = {
      ...subjectData,
      id: `subj_${subjectData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
    };
    setSubjects((prev) => [...prev, newSubj]);
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const saveTimetableSlots = (
    newSlots: TimetableSlot[],
    branchId: string,
    semester: number,
    division?: string
  ) => {
    setTimetableSlots((prev) => {
      // Remove old slots for this branch & semester (& division if specified)
      const remaining = prev.filter((s) => {
        if (s.branchId !== branchId || s.semester !== semester) return true;
        if (division && s.division !== division) return true;
        return false;
      });
      return [...remaining, ...newSlots];
    });
  };

  const publishNotice = (notice: Omit<Notice, 'id' | 'publishedDate'>) => {
    const newNotice: Notice = {
      ...notice,
      id: `not_${Date.now()}`,
      publishedDate: new Date().toISOString().split('T')[0],
    };
    setNotices((prev) => [newNotice, ...prev]);
  };

  const deleteNotice = (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  // Class Incharge methods
  const importStudentsFromExcel = (
    rows: ParsedStudentRow[],
    branchId: string,
    semester: number,
    division: string
  ): number => {
    let addedCount = 0;
    const newStudents: User[] = [];

    setUsers((prev) => {
      const existingRolls = new Set(
        prev
          .filter((u) => u.role === 'student' && u.studentProfile?.rollNo)
          .map((u) => u.studentProfile!.rollNo.toLowerCase())
      );

      for (const row of rows) {
        if (existingRolls.has(row.rollNo.toLowerCase())) {
          continue; // skip duplicate roll number
        }

        const studentUser: User = {
          id: `u_student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: row.name,
          email: row.email,
          phone: row.phone,
          role: 'student',
          branchId,
          studentProfile: {
            rollNo: row.rollNo,
            enrollmentNo: row.enrollmentNo || `EN${Date.now()}`,
            semester,
            division,
            guardianName: row.guardianName || 'Guardian',
            guardianContact: row.guardianContact || '',
            admissionYear: new Date().getFullYear(),
            bloodGroup: row.bloodGroup || 'B+',
          },
        };

        newStudents.push(studentUser);
        existingRolls.add(row.rollNo.toLowerCase());
        addedCount++;
      }

      return [...prev, ...newStudents];
    });

    return addedCount;
  };

  const addStudent = (student: {
    name: string;
    email: string;
    phone: string;
    branchId: string;
    rollNo: string;
    enrollmentNo: string;
    semester: number;
    division: string;
    guardianName: string;
    guardianContact: string;
    bloodGroup?: string;
  }) => {
    const newStudentUser: User = {
      id: `u_student_${Date.now()}`,
      name: student.name,
      email: student.email,
      phone: student.phone,
      role: 'student',
      branchId: student.branchId,
      studentProfile: {
        rollNo: student.rollNo,
        enrollmentNo: student.enrollmentNo,
        semester: student.semester,
        division: student.division,
        guardianName: student.guardianName,
        guardianContact: student.guardianContact,
        admissionYear: new Date().getFullYear(),
        bloodGroup: student.bloodGroup || 'O+',
      },
    };
    setUsers((prev) => [...prev, newStudentUser]);
  };

  const deleteStudent = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Teacher / Sub Admin actions
  const recordAttendance = (
    record: Omit<AttendanceRecord, 'id' | 'createdAt'>
  ) => {
    const newRec: AttendanceRecord = {
      ...record,
      id: `att_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAttendanceRecords((prev) => {
      // If there's already a record for same date, subject, division, slot, replace it
      const filtered = prev.filter(
        (r) =>
          !(
            r.date === record.date &&
            r.subjectId === record.subjectId &&
            r.division === record.division &&
            r.slotIndex === record.slotIndex
          )
      );
      return [newRec, ...filtered];
    });
  };

  const createExam = (exam: Omit<Exam, 'id'>): string => {
    const newId = `exam_${Date.now()}`;
    const newExam: Exam = {
      ...exam,
      id: newId,
    };
    setExams((prev) => [newExam, ...prev]);
    return newId;
  };

  const uploadExamResultsFromExcel = (
    examId: string,
    rows: ParsedExamResultRow[]
  ): { successCount: number; errors: string[] } => {
    let successCount = 0;
    const errors: string[] = [];
    const newResultItems: ExamResultItem[] = [];

    // Helper map from rollNo -> student user
    const rollToStudentMap = new Map<string, User>();
    users
      .filter((u) => u.role === 'student' && u.studentProfile?.rollNo)
      .forEach((stu) => {
        rollToStudentMap.set(stu.studentProfile!.rollNo.toLowerCase(), stu);
      });

    // Helper map from subject code -> Subject
    const codeToSubjectMap = new Map<string, Subject>();
    subjects.forEach((s) => {
      codeToSubjectMap.set(s.code.toLowerCase(), s);
    });

    const targetExam = exams.find((e) => e.id === examId);
    const passThreshold = targetExam ? targetExam.passingMarks : 40;

    for (const row of rows) {
      const student = rollToStudentMap.get(row.rollNo.toLowerCase());
      if (!student) {
        errors.push(`Roll No "${row.rollNo}" not found in registered students.`);
        continue;
      }

      const subject = codeToSubjectMap.get(row.subjectCode.toLowerCase());
      if (!subject) {
        errors.push(`Subject code "${row.subjectCode}" is invalid.`);
        continue;
      }

      const pct = (row.marksObtained / (row.maxMarks || 100)) * 100;
      let grade = 'F';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 80) grade = 'A';
      else if (pct >= 70) grade = 'B+';
      else if (pct >= 60) grade = 'B';
      else if (pct >= 50) grade = 'C';
      else if (pct >= 40) grade = 'D';

      const isPass = row.marksObtained >= (passThreshold * (row.maxMarks / (targetExam?.totalMarks || 100)));

      newResultItems.push({
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        examId,
        studentId: student.id,
        subjectId: subject.id,
        marksObtained: row.marksObtained,
        maxMarks: row.maxMarks,
        grade,
        status: isPass ? 'Pass' : 'Fail',
        remarks: row.remarks || '',
      });
      successCount++;
    }

    if (newResultItems.length > 0) {
      setExamResults((prev) => {
        // Replace existing results for same exam, student, and subject
        const updated = prev.filter((existing) => {
          return !newResultItems.some(
            (n) =>
              n.examId === existing.examId &&
              n.studentId === existing.studentId &&
              n.subjectId === existing.subjectId
          );
        });
        return [...updated, ...newResultItems];
      });
    }

    return { successCount, errors };
  };

  const resetToDefaultData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_branches`);
    localStorage.removeItem(`${STORAGE_KEY}_users`);
    localStorage.removeItem(`${STORAGE_KEY}_subjects`);
    localStorage.removeItem(`${STORAGE_KEY}_timetable`);
    localStorage.removeItem(`${STORAGE_KEY}_attendance`);
    localStorage.removeItem(`${STORAGE_KEY}_notices`);
    localStorage.removeItem(`${STORAGE_KEY}_exams`);
    localStorage.removeItem(`${STORAGE_KEY}_results`);
    localStorage.removeItem(`${STORAGE_KEY}_current_user_id`);

    setBranches(INITIAL_BRANCHES);
    setUsers(INITIAL_USERS);
    setSubjects(INITIAL_SUBJECTS);
    setTimetableSlots(INITIAL_TIMETABLE_SLOTS);
    setAttendanceRecords(INITIAL_ATTENDANCE);
    setNotices(INITIAL_NOTICES);
    setExams(INITIAL_EXAMS);
    setExamResults(INITIAL_RESULTS);
    setCurrentUser(INITIAL_USERS.find((u) => u.id === 'u_admin_cse') || INITIAL_USERS[0]);
  };

  return (
    <ERPContext.Provider
      value={{
        currentUser,
        users,
        branches,
        subjects,
        timetableSlots,
        attendanceRecords,
        notices,
        exams,
        examResults,
        login,
        logout,
        switchUserById,
        quickSwitchRole,
        createBranch,
        updateBranch,
        deleteBranch,
        createMainAdmin,
        createTeacher,
        updateTeacher,
        createSubject,
        deleteSubject,
        saveTimetableSlots,
        publishNotice,
        deleteNotice,
        importStudentsFromExcel,
        addStudent,
        deleteStudent,
        recordAttendance,
        createExam,
        uploadExamResultsFromExcel,
        resetToDefaultData,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
