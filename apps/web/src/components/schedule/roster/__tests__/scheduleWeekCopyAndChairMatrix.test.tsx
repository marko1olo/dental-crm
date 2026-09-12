import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  addDaysToDateIso,
  getWeekDaysIso,
  copyWeekShiftsToTargetWeek,
  copyWeekShiftsToMonth,
  clearWeekShifts,
  rotateWeekShifts,
} from '../doctorWeeklyScheduleGenerator';
import type { DoctorShift } from '../doctorShiftRosterEngine';

describe('doctorWeeklyScheduleGenerator - copy and clear functions', () => {
  const mockShifts: DoctorShift[] = [
    {
      id: 'shift-1',
      doctorId: 'doc-1',
      doctorName: 'Иванов Иван Иванович',
      doctorRole: 'therapist',
      cabinetId: 'cab-1',
      chairId: 'chair-1',
      dateIso: '2026-09-07',
      archetypeId: 'morning_shift',
      startTime: '09:00',
      endTime: '15:00',
      durationHours: 6,
      breakMinutes: 30,
      isNight: false,
      nightHours: 0,
      status: 'scheduled',
      assistantId: 'asst-1',
      assistantName: 'Петрова Анна',
    },
    {
      id: 'shift-2',
      doctorId: 'doc-2',
      doctorName: 'Смирнова Елена',
      doctorRole: 'orthopedist',
      cabinetId: 'cab-2',
      chairId: 'chair-2',
      dateIso: '2026-09-08',
      archetypeId: 'evening_shift',
      startTime: '15:00',
      endTime: '21:00',
      durationHours: 6,
      breakMinutes: 30,
      isNight: false,
      nightHours: 0,
      status: 'scheduled',
      assistantId: null,
      assistantName: null,
    },
  ];

  it('addDaysToDateIso correctly shifts ISO dates by N days', () => {
    assert.equal(addDaysToDateIso('2026-09-07', 7), '2026-09-14');
    assert.equal(addDaysToDateIso('2026-09-07', 1), '2026-09-08');
    assert.equal(addDaysToDateIso('2026-09-07', -7), '2026-08-31');
  });

  it('getWeekDaysIso returns 7 days of the week starting from Monday', () => {
    const days = getWeekDaysIso('2026-09-07');
    assert.equal(days.length, 7);
    assert.equal(days[0], '2026-09-07'); // Monday
    assert.equal(days[6], '2026-09-13'); // Sunday
  });

  it('copyWeekShiftsToTargetWeek copies current week shifts to next week exactly 7 days ahead', () => {
    const currentMonday = '2026-09-07';
    const targetMonday = '2026-09-14';

    const result = copyWeekShiftsToTargetWeek(mockShifts, currentMonday, targetMonday);

    assert.equal(result.length, 4); // 2 original + 2 copied
    const copied1 = result.find((s) => s.doctorId === 'doc-1' && s.dateIso === '2026-09-14');
    const copied2 = result.find((s) => s.doctorId === 'doc-2' && s.dateIso === '2026-09-15');

    assert.ok(copied1, 'Copied shift 1 must exist on 2026-09-14');
    assert.equal(copied1?.doctorName, 'Иванов Иван Иванович');
    assert.equal(copied1?.chairId, 'chair-1');
    assert.equal(copied1?.startTime, '09:00');
    assert.equal(copied1?.endTime, '15:00');
    assert.equal(copied1?.assistantId, 'asst-1');

    assert.ok(copied2, 'Copied shift 2 must exist on 2026-09-15');
    assert.equal(copied2?.doctorName, 'Смирнова Елена');
    assert.equal(copied2?.chairId, 'chair-2');
  });

  it('copyWeekShiftsToTargetWeek overwrites target week if target already had shifts', () => {
    const currentMonday = '2026-09-07';
    const targetMonday = '2026-09-14';

    const existingTargetShift: DoctorShift = {
      id: 'existing-target-shift',
      doctorId: 'doc-old',
      doctorName: 'Старый Врач',
      doctorRole: 'therapist',
      cabinetId: 'cab-1',
      chairId: 'chair-1',
      dateIso: '2026-09-14',
      archetypeId: 'morning_shift',
      startTime: '10:00',
      endTime: '18:00',
      durationHours: 8,
      breakMinutes: 30,
      isNight: false,
      nightHours: 0,
      status: 'scheduled',
      assistantId: null,
      assistantName: null,
    };

    const initial = [...mockShifts, existingTargetShift];
    const result = copyWeekShiftsToTargetWeek(initial, currentMonday, targetMonday);

    const oldFound = result.find((s) => s.id === 'existing-target-shift');
    assert.equal(oldFound, undefined, 'Old target shift must be replaced by new copy');
    const newTargetShift = result.find((s) => s.dateIso === '2026-09-14');
    assert.equal(newTargetShift?.doctorId, 'doc-1');
  });

  it('copyWeekShiftsToMonth copies current week to next 4 weeks', () => {
    const currentMonday = '2026-09-07';
    const result = copyWeekShiftsToMonth(mockShifts, currentMonday);

    // Week 0 (original): 2 shifts
    // Week 1 (7 days): 2 shifts (2026-09-14, 2026-09-15)
    // Week 2 (14 days): 2 shifts (2026-09-21, 2026-09-22)
    // Week 3 (21 days): 2 shifts (2026-09-28, 2026-09-29)
    // Week 4 (28 days): 2 shifts (2026-10-05, 2026-10-06)
    assert.equal(result.length, 10);

    const week1Shift = result.find((s) => s.dateIso === '2026-09-14');
    const week2Shift = result.find((s) => s.dateIso === '2026-09-21');
    const week3Shift = result.find((s) => s.dateIso === '2026-09-28');
    const week4Shift = result.find((s) => s.dateIso === '2026-10-05');

    assert.ok(week1Shift, 'Week 1 shift must exist');
    assert.ok(week2Shift, 'Week 2 shift must exist');
    assert.ok(week3Shift, 'Week 3 shift must exist');
    assert.ok(week4Shift, 'Week 4 shift must exist');
  });

  it('clearWeekShifts removes only shifts in the specified week', () => {
    const currentMonday = '2026-09-07';
    const otherShift: DoctorShift = {
      id: 'other-shift',
      doctorId: 'doc-3',
      doctorName: 'Другой Врач',
      doctorRole: 'surgeon',
      cabinetId: 'cab-3',
      chairId: 'chair-3',
      dateIso: '2026-09-20',
      archetypeId: 'morning_shift',
      startTime: '09:00',
      endTime: '15:00',
      durationHours: 6,
      breakMinutes: 30,
      isNight: false,
      nightHours: 0,
      status: 'scheduled',
      assistantId: null,
      assistantName: null,
    };

    const initial = [...mockShifts, otherShift];
    const cleared = clearWeekShifts(initial, currentMonday);

    assert.equal(cleared.length, 1);
    assert.equal(cleared[0]?.id, 'other-shift');
  });

  it('rotateWeekShifts swaps morning and evening shifts for the active week (Утро ⇄ Вечер)', () => {
    const currentMonday = '2026-09-07';
    const rotated = rotateWeekShifts(mockShifts, currentMonday);

    assert.equal(rotated.length, 2);

    // shift-1 was morning (09:00-15:00) -> should become evening (14:00-20:00, evening_shift)
    const rot1 = rotated.find((s) => s.id === 'shift-1');
    assert.ok(rot1);
    assert.equal(rot1?.archetypeId, 'evening_shift');
    assert.equal(rot1?.startTime, '14:00');
    assert.equal(rot1?.endTime, '20:00');

    // shift-2 was evening (15:00-21:00) -> should become morning (08:00-14:00, morning_shift)
    const rot2 = rotated.find((s) => s.id === 'shift-2');
    assert.ok(rot2);
    assert.equal(rot2?.archetypeId, 'morning_shift');
    assert.equal(rot2?.startTime, '08:00');
    assert.equal(rot2?.endTime, '14:00');
  });

  it('rotateWeekShifts with chairId option rotates only the specified chair shifts', () => {
    const currentMonday = '2026-09-07';
    const rotated = rotateWeekShifts(mockShifts, currentMonday, { chairId: 'chair-1' });

    assert.equal(rotated.length, 2);

    // shift-1 on chair-1 was morning -> becomes evening
    const rot1 = rotated.find((s) => s.id === 'shift-1');
    assert.equal(rot1?.archetypeId, 'evening_shift');

    // shift-2 on chair-2 is NOT rotated because chairId was chair-1
    const rot2 = rotated.find((s) => s.id === 'shift-2');
    assert.equal(rot2?.archetypeId, 'evening_shift');
    assert.equal(rot2?.startTime, '15:00');
  });
});


