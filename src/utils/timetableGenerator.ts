import { Subject, TimetableSlot, User } from '../types/erp';

export interface TimeSlotConfig {
  index: number;
  startTime: string;
  endTime: string;
  label: string;
  isBreak?: boolean;
}

export const DEFAULT_TIME_SLOTS: TimeSlotConfig[] = [
  { index: 0, startTime: '09:00 AM', endTime: '10:00 AM', label: 'Period 1' },
  { index: 1, startTime: '10:00 AM', endTime: '11:00 AM', label: 'Period 2' },
  { index: 2, startTime: '11:15 AM', endTime: '12:15 PM', label: 'Period 3' },
  { index: 3, startTime: '01:00 PM', endTime: '02:00 PM', label: 'Period 4' },
  { index: 4, startTime: '02:00 PM', endTime: '03:00 PM', label: 'Period 5' },
  { index: 5, startTime: '03:00 PM', endTime: '04:00 PM', label: 'Period 6' },
];

export const DAYS_OF_WEEK: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export interface TimetableGenerationOptions {
  branchId: string;
  semester: number;
  divisions: string[];
  subjects: Subject[];
  teachers: User[];
  existingSlots?: TimetableSlot[]; // slots from other semesters to prevent teacher collision
}

/**
 * Conflict-free automated timetable generator.
 * Enforces:
 * 1. Teacher cannot teach two classes at the same day & time slot.
 * 2. Division cannot have two subjects at the same time slot.
 * 3. Daily subject distribution (avoids same subject repetition on the same day if possible).
 * 4. Room allocation per division / lab.
 */
export function generateConflictFreeTimetable({
  branchId,
  semester,
  divisions,
  subjects,
  teachers,
  existingSlots = [],
}: TimetableGenerationOptions): {
  success: boolean;
  slots: TimetableSlot[];
  warnings: string[];
} {
  const generatedSlots: TimetableSlot[] = [];
  const warnings: string[] = [];

  // Map to track teacher busy state: `${teacherId}-${day}-${slotIndex}` -> true
  const teacherBusyMap = new Set<string>();

  // Initialize with existing slots
  for (const s of existingSlots) {
    teacherBusyMap.add(`${s.teacherId}-${s.day}-${s.slotIndex}`);
  }

  // Filter semester subjects
  const semSubjects = subjects.filter(
    (s) => s.branchId === branchId && s.semester === semester
  );

  if (semSubjects.length === 0) {
    return {
      success: false,
      slots: [],
      warnings: [`No subjects found for semester ${semester}. Please add subjects first.`],
    };
  }

  // Map each subject to its qualified teacher(s)
  const subjectTeacherMap = new Map<string, User>();
  for (const subj of semSubjects) {
    const assigned = teachers.find(
      (t) =>
        t.branchId === branchId &&
        (t.assignedSubjects?.includes(subj.id) ||
          t.assignedClasses?.some((c) => c.subjectId === subj.id))
    );
    if (assigned) {
      subjectTeacherMap.set(subj.id, assigned);
    } else {
      // Fallback: pick any teacher in this branch
      const branchTeacher = teachers.find((t) => t.branchId === branchId);
      if (branchTeacher) {
        subjectTeacherMap.set(subj.id, branchTeacher);
        warnings.push(
          `No specific teacher assigned for "${subj.name}". Assigned ${branchTeacher.name}.`
        );
      }
    }
  }

  // Generate for each division
  for (const division of divisions) {
    // Division busy grid: `${day}-${slotIndex}`
    const divisionBusyGrid = new Set<string>();
    // Track daily subject frequency: `${day}-${subjectId}` -> count
    const dailySubjectCount = new Map<string, number>();

    // Prepare pool of periods required for each subject
    // E.g., a subject with 4 weekly hours needs 4 periods
    const periodsToSchedule: { subject: Subject; teacher: User }[] = [];
    for (const subj of semSubjects) {
      const teacher = subjectTeacherMap.get(subj.id);
      if (!teacher) continue;
      const count = Math.max(2, Math.min(6, subj.weeklyHours || 4));
      for (let i = 0; i < count; i++) {
        periodsToSchedule.push({ subject: subj, teacher });
      }
    }

    // Shuffle slightly for balanced distribution
    periodsToSchedule.sort(() => 0.5 - Math.random());

    const defaultRoom = `${branchId.toUpperCase()}-R${semester}0${division === 'A' ? '1' : '2'}`;
    const labRoom = `${branchId.toUpperCase()}-Lab${semester <= 4 ? '1' : '2'}`;

    for (const item of periodsToSchedule) {
      const { subject, teacher } = item;
      let scheduled = false;

      // Find an available (day, slot) that doesn't violate teacher or division constraints
      // Prioritize days where subject is not taught yet
      const candidateDays = [...DAYS_OF_WEEK].sort((a, b) => {
        const countA = dailySubjectCount.get(`${a}-${subject.id}`) || 0;
        const countB = dailySubjectCount.get(`${b}-${subject.id}`) || 0;
        return countA - countB;
      });

      for (const day of candidateDays) {
        if (scheduled) break;

        for (const slot of DEFAULT_TIME_SLOTS) {
          const slotKey = `${day}-${slot.index}`;
          const teacherKey = `${teacher.id}-${day}-${slot.index}`;

          // Checks
          const divisionFree = !divisionBusyGrid.has(slotKey);
          const teacherFree = !teacherBusyMap.has(teacherKey);
          const dailyCount = dailySubjectCount.get(`${day}-${subject.id}`) || 0;

          // Do not repeat subject on the same day if count already >= 1, unless no other choice
          if (divisionFree && teacherFree && dailyCount < 1) {
            // Schedule here!
            divisionBusyGrid.add(slotKey);
            teacherBusyMap.add(teacherKey);
            dailySubjectCount.set(`${day}-${subject.id}`, dailyCount + 1);

            generatedSlots.push({
              id: `slot_${branchId}_s${semester}_d${division}_${day}_${slot.index}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              day,
              slotIndex: slot.index,
              startTime: slot.startTime,
              endTime: slot.endTime,
              branchId,
              semester,
              division,
              subjectId: subject.id,
              teacherId: teacher.id,
              roomNumber: subject.type === 'Practical' ? labRoom : defaultRoom,
              isLab: subject.type === 'Practical',
            });

            scheduled = true;
            break;
          }
        }
      }

      // If couldn't schedule with strict 1-per-day, allow 2-per-day (e.g. lab or extra hour)
      if (!scheduled) {
        for (const day of DAYS_OF_WEEK) {
          if (scheduled) break;
          for (const slot of DEFAULT_TIME_SLOTS) {
            const slotKey = `${day}-${slot.index}`;
            const teacherKey = `${teacher.id}-${day}-${slot.index}`;

            if (!divisionBusyGrid.has(slotKey) && !teacherBusyMap.has(teacherKey)) {
              divisionBusyGrid.add(slotKey);
              teacherBusyMap.add(teacherKey);
              const currentCount = dailySubjectCount.get(`${day}-${subject.id}`) || 0;
              dailySubjectCount.set(`${day}-${subject.id}`, currentCount + 1);

              generatedSlots.push({
                id: `slot_${branchId}_s${semester}_d${division}_${day}_${slot.index}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                day,
                slotIndex: slot.index,
                startTime: slot.startTime,
                endTime: slot.endTime,
                branchId,
                semester,
                division,
                subjectId: subject.id,
                teacherId: teacher.id,
                roomNumber: subject.type === 'Practical' ? labRoom : defaultRoom,
                isLab: subject.type === 'Practical',
              });

              scheduled = true;
              break;
            }
          }
        }
      }

      if (!scheduled) {
        warnings.push(
          `Could not fit 1 period of ${subject.name} for Division ${division} without conflict.`
        );
      }
    }
  }

  return {
    success: true,
    slots: generatedSlots,
    warnings,
  };
}

/**
 * Validates a timetable for any existing conflicts.
 */
export function validateTimetableConflicts(slots: TimetableSlot[]): {
  hasConflicts: boolean;
  conflictDetails: string[];
} {
  const teacherMap = new Map<string, TimetableSlot>();
  const classMap = new Map<string, TimetableSlot>();
  const conflictDetails: string[] = [];

  for (const slot of slots) {
    const teacherKey = `${slot.teacherId}-${slot.day}-${slot.slotIndex}`;
    const classKey = `${slot.branchId}-${slot.semester}-${slot.division}-${slot.day}-${slot.slotIndex}`;

    if (teacherMap.has(teacherKey)) {
      const prev = teacherMap.get(teacherKey)!;
      conflictDetails.push(
        `Teacher Conflict on ${slot.day} at ${slot.startTime}: Teacher assigned to both Sem ${prev.semester}-${prev.division} and Sem ${slot.semester}-${slot.division}.`
      );
    } else {
      teacherMap.set(teacherKey, slot);
    }

    if (classMap.has(classKey)) {
      conflictDetails.push(
        `Class Conflict on ${slot.day} at ${slot.startTime}: Sem ${slot.semester}-${slot.division} has multiple subjects scheduled simultaneously.`
      );
    } else {
      classMap.set(classKey, slot);
    }
  }

  return {
    hasConflicts: conflictDetails.length > 0,
    conflictDetails,
  };
}
