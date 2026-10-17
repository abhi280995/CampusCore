import * as XLSX from 'xlsx';
import { User, Subject } from '../types/erp';

export interface ParsedStudentRow {
  rollNo: string;
  name: string;
  email: string;
  phone?: string;
  enrollmentNo: string;
  gender?: string;
  guardianName?: string;
  guardianContact?: string;
  bloodGroup?: string;
}

export interface ParsedExamResultRow {
  rollNo: string;
  studentName?: string;
  subjectCode: string;
  marksObtained: number;
  maxMarks: number;
  remarks?: string;
}

/**
 * Parse an Excel or CSV file containing student details.
 */
export async function parseStudentExcel(file: File): Promise<{
  students: ParsedStudentRow[];
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
        });

        const students: ParsedStudentRow[] = [];
        const errors: string[] = [];

        jsonRows.forEach((row, index) => {
          const rowNum = index + 2; // account for header
          // Normalise keys by removing spaces and lowercasing
          const normalized: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = row[key];
          }

          const rollNo = String(
            normalized['rollno'] ||
            normalized['rollnumber'] ||
            normalized['roll'] ||
            normalized['id'] ||
            ''
          ).trim();

          const name = String(
            normalized['name'] ||
            normalized['studentname'] ||
            normalized['fullname'] ||
            ''
          ).trim();

          const email = String(
            normalized['email'] ||
            normalized['emailaddress'] ||
            normalized['studentemail'] ||
            (rollNo ? `${rollNo.toLowerCase()}@college.edu` : '')
          ).trim();

          const enrollmentNo = String(
            normalized['enrollmentno'] ||
            normalized['enrollmentnumber'] ||
            normalized['regno'] ||
            normalized['registrationno'] ||
            rollNo
          ).trim();

          if (!name || !rollNo) {
            errors.push(`Row ${rowNum}: Missing mandatory 'Roll No' or 'Name'. Skipped.`);
            return;
          }

          students.push({
            rollNo,
            name,
            email,
            phone: String(normalized['phone'] || normalized['mobile'] || normalized['contact'] || ''),
            enrollmentNo,
            gender: String(normalized['gender'] || ''),
            guardianName: String(normalized['guardianname'] || normalized['parentname'] || ''),
            guardianContact: String(normalized['guardiancontact'] || normalized['parentcontact'] || ''),
            bloodGroup: String(normalized['bloodgroup'] || ''),
          });
        });

        resolve({ students, errors });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse an Excel or CSV file containing exam results.
 */
export async function parseExamMarksExcel(file: File): Promise<{
  results: ParsedExamResultRow[];
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
        });

        const results: ParsedExamResultRow[] = [];
        const errors: string[] = [];

        jsonRows.forEach((row, index) => {
          const rowNum = index + 2;
          const normalized: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = row[key];
          }

          const rollNo = String(
            normalized['rollno'] || normalized['rollnumber'] || normalized['studentid'] || ''
          ).trim();

          const subjectCode = String(
            normalized['subjectcode'] ||
            normalized['subject'] ||
            normalized['coursecode'] ||
            ''
          ).trim();

          const marksObtained = Number(
            normalized['marksobtained'] || normalized['marks'] || normalized['score'] || 0
          );

          const maxMarks = Number(
            normalized['maxmarks'] || normalized['totalmarks'] || normalized['outof'] || 100
          );

          if (!rollNo) {
            errors.push(`Row ${rowNum}: Missing 'Roll No'. Skipped.`);
            return;
          }

          results.push({
            rollNo,
            studentName: String(normalized['studentname'] || normalized['name'] || ''),
            subjectCode,
            marksObtained,
            maxMarks,
            remarks: String(normalized['remarks'] || ''),
          });
        });

        resolve({ results, errors });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a pre-formatted Excel template for Class Incharges to upload student details.
 */
export function downloadStudentTemplate(semester: number, division: string) {
  const sampleData = [
    {
      'Roll No': '2026CS401',
      'Student Name': 'Aarav Sharma',
      'Email Address': 'aarav.sharma@campus.edu',
      'Phone': '+91 98765 43210',
      'Enrollment No': 'EN2024CS001',
      'Gender': 'Male',
      'Guardian Name': 'Ramesh Sharma',
      'Guardian Contact': '+91 98765 43211',
      'Blood Group': 'O+',
    },
    {
      'Roll No': '2026CS402',
      'Student Name': 'Ananya Patel',
      'Email Address': 'ananya.patel@campus.edu',
      'Phone': '+91 98765 43212',
      'Enrollment No': 'EN2024CS002',
      'Gender': 'Female',
      'Guardian Name': 'Kishore Patel',
      'Guardian Contact': '+91 98765 43213',
      'Blood Group': 'B+',
    },
    {
      'Roll No': '2026CS403',
      'Student Name': 'Rohan Deshmukh',
      'Email Address': 'rohan.d@campus.edu',
      'Phone': '+91 98765 43214',
      'Enrollment No': 'EN2024CS003',
      'Gender': 'Male',
      'Guardian Name': 'Sunil Deshmukh',
      'Guardian Contact': '+91 98765 43215',
      'Blood Group': 'A+',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Trigger download
  XLSX.writeFile(workbook, `Student_Upload_Template_Sem${semester}_Div${division}.xlsx`);
}

/**
 * Downloads a pre-formatted Excel template for Teachers to upload Exam Marks.
 */
export function downloadExamMarksTemplate(
  examName: string,
  subjects: Subject[],
  students: User[]
) {
  const sampleRows: Record<string, any>[] = [];

  students.forEach((stu) => {
    subjects.forEach((subj) => {
      sampleRows.push({
        'Roll No': stu.studentProfile?.rollNo || stu.id,
        'Student Name': stu.name,
        'Subject Code': subj.code,
        'Subject Name': subj.name,
        'Marks Obtained': 85,
        'Max Marks': 100,
        'Remarks': 'Satisfactory',
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks_Entry');

  XLSX.writeFile(
    workbook,
    `${examName.replace(/[^a-zA-Z0-9]/g, '_')}_Marks_Template.xlsx`
  );
}

/**
 * Export Timetable to Excel
 */
export function exportTimetableToExcel(
  branchName: string,
  semester: number,
  division: string,
  scheduleGrid: any[]
) {
  const worksheet = XLSX.utils.json_to_sheet(scheduleGrid);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
  XLSX.writeFile(
    workbook,
    `Timetable_${branchName}_Sem${semester}_Div${division}.xlsx`
  );
}
