export type UserRole = 'super_admin' | 'main_admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  branchId?: string; // For main_admin, teacher, student
  // Teacher specific
  isClassIncharge?: boolean;
  inchargeClass?: {
    semester: number;
    division: string;
  };
  assignedSubjects?: string[]; // subject IDs
  assignedClasses?: {
    semester: number;
    division: string;
    subjectId: string;
  }[];
  // Student specific
  studentProfile?: {
    rollNo: string;
    enrollmentNo: string;
    semester: number;
    division: string;
    guardianName: string;
    guardianContact: string;
    admissionYear: number;
    bloodGroup?: string;
  };
}

export interface Branch {
  id: string;
  code: string; // e.g. "CSE", "ECE", "MECH"
  name: string; // e.g. "Computer Science & Engineering"
  description: string;
  headOfDepartment: string;
  totalSemesters: number;
  divisionsPerSemester: string[]; // ['A', 'B']
  mainAdminId?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  branchId: string;
  code: string; // e.g. "CS401"
  name: string; // e.g. "Database Management Systems"
  semester: number;
  credits: number;
  weeklyHours: number; // e.g. 4
  type: 'Theory' | 'Practical' | 'Tutorial';
  preferredRoomType?: 'Classroom' | 'Computer Lab' | 'Hardware Lab';
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  slotIndex: number; // 0 to 5
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "10:00 AM"
  branchId: string;
  semester: number;
  division: string;
  subjectId: string;
  teacherId: string;
  roomNumber: string;
  isLab?: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  branchId: string;
  semester: number;
  division: string;
  subjectId: string;
  teacherId: string;
  slotIndex?: number;
  entries: {
    studentId: string;
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    remarks?: string;
  }[];
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  category: 'Academic' | 'Exam' | 'Event' | 'Circular' | 'Urgent';
  targetBranchId?: string; // null or undefined means all branches
  targetSemester?: number; // optional semester filter
  targetRole?: UserRole | 'all';
  authorName: string;
  authorRole: string;
  publishedDate: string; // YYYY-MM-DD
  isUrgent?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface Exam {
  id: string;
  branchId: string;
  semester: number;
  name: string; // e.g. "Semester 4 Mid-Term 2026", "Revision Test 1"
  examType: 'Revision Test' | 'Mid-Term Exam' | 'End-Semester Exam' | 'Practical Viva';
  date: string;
  totalMarks: number;
  passingMarks: number;
  subjectIds: string[];
}

export interface ExamResultItem {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  status: 'Pass' | 'Fail';
  remarks?: string;
}
