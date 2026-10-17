import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { parseStudentExcel, parseExamMarksExcel, ParsedStudentRow, ParsedExamResultRow } from '../../utils/excelHelpers';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type: 'students' | 'exam_results';
  templateDownloadFn?: () => void;
  templateLabel?: string;
  onConfirmStudentUpload?: (rows: ParsedStudentRow[]) => void;
  onConfirmExamUpload?: (rows: ParsedExamResultRow[]) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type,
  templateDownloadFn,
  templateLabel = 'Download Excel Template',
  onConfirmStudentUpload,
  onConfirmExamUpload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [studentRows, setStudentRows] = useState<ParsedStudentRow[]>([]);
  const [examRows, setExamRows] = useState<ParsedExamResultRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsProcessing(true);
    setErrors([]);
    setSuccessMsg(null);

    try {
      if (type === 'students') {
        const parsed = await parseStudentExcel(selected);
        setStudentRows(parsed.students);
        setErrors(parsed.errors);
      } else {
        const parsed = await parseExamMarksExcel(selected);
        setExamRows(parsed.results);
        setErrors(parsed.errors);
      }
    } catch (err: any) {
      setErrors([`Failed to parse Excel file: ${err.message || 'Check file format'}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (type === 'students' && onConfirmStudentUpload) {
      onConfirmStudentUpload(studentRows);
      setSuccessMsg(`Successfully imported ${studentRows.length} student records.`);
      setTimeout(() => {
        onClose();
        resetModal();
      }, 1200);
    } else if (type === 'exam_results' && onConfirmExamUpload) {
      onConfirmExamUpload(examRows);
      setSuccessMsg(`Successfully uploaded ${examRows.length} examination marks entries.`);
      setTimeout(() => {
        onClose();
        resetModal();
      }, 1200);
    }
  };

  const resetModal = () => {
    setFile(null);
    setStudentRows([]);
    setExamRows([]);
    setErrors([]);
    setSuccessMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Template download action */}
          {templateDownloadFn && (
            <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 rounded-lg border border-indigo-100">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
                <span className="text-xs font-medium text-indigo-950">
                  Need the standard format? Download the sample Excel sheet first.
                </span>
              </div>
              <button
                type="button"
                onClick={templateDownloadFn}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors shadow-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                {templateLabel}
              </button>
            </div>
          )}

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 text-center bg-slate-50/50 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              Click to select an Excel (.xlsx, .xls) or CSV file
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports standard column headers. Columns are auto-mapped.
            </p>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer cursor-pointer"
            />
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="text-center py-4 text-xs font-medium text-slate-500">
              Parsing Excel sheets and validating fields...
            </div>
          )}

          {/* Errors list */}
          {errors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
              <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Validation Warnings ({errors.length}):
              </div>
              <ul className="text-xs text-rose-600 pl-6 list-disc space-y-0.5 max-h-24 overflow-y-auto">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Notice */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Preview: Student Rows */}
          {type === 'students' && studentRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Preview Ready: {studentRows.length} Students detected</span>
                <span className="text-slate-400">First 5 rows displayed</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Roll No</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Enrollment</th>
                      <th className="px-3 py-2">Parent Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {studentRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono text-slate-900 font-medium">{row.rollNo}</td>
                        <td className="px-3 py-1.5 font-medium">{row.name}</td>
                        <td className="px-3 py-1.5 text-slate-500">{row.email}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-500">{row.enrollmentNo}</td>
                        <td className="px-3 py-1.5 text-slate-500">{row.guardianContact || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview: Exam Result Rows */}
          {type === 'exam_results' && examRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Preview Ready: {examRows.length} Marks Entries detected</span>
                <span className="text-slate-400">First 5 rows displayed</span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Roll No</th>
                      <th className="px-3 py-2">Subject Code</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Max Marks</th>
                      <th className="px-3 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {examRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono text-slate-900 font-medium">{row.rollNo}</td>
                        <td className="px-3 py-1.5 font-mono font-medium text-indigo-700">{row.subjectCode}</td>
                        <td className="px-3 py-1.5 font-mono font-bold text-slate-900">{row.marksObtained}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-500">{row.maxMarks}</td>
                        <td className="px-3 py-1.5 text-slate-500">{row.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              isProcessing ||
              (type === 'students' && studentRows.length === 0) ||
              (type === 'exam_results' && examRows.length === 0)
            }
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            Confirm & Save to ERP
          </button>
        </div>
      </div>
    </div>
  );
};
