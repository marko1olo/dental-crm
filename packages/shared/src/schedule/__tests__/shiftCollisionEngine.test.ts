import assert from "node:assert/strict";
import test from "node:test";
import {
	areIntervalsOverlapping,
	calculateOverlapDurationMinutes,
	checkScheduleOverlap,
	calculateEmergencyReserveSlots,
	calculateScheduleOverlapGroups,
	findAvailableSlots,
	type ScheduledAppointment,
	type DoctorShiftSchedule,
} from "../shiftCollisionEngine.js";

test("areIntervalsOverlapping and calculateOverlapDurationMinutes", async (t) => {
	await t.test("detects overlap between intersecting intervals", () => {
		const res = areIntervalsOverlapping(
			"2026-11-21T10:00:00.000Z",
			"2026-11-21T11:00:00.000Z",
			"2026-11-21T10:30:00.000Z",
			"2026-11-21T11:30:00.000Z",
		);
		assert.equal(res, true);
		const duration = calculateOverlapDurationMinutes(
			"2026-11-21T10:00:00.000Z",
			"2026-11-21T11:00:00.000Z",
			"2026-11-21T10:30:00.000Z",
			"2026-11-21T11:30:00.000Z",
		);
		assert.equal(duration, 30);
	});

	await t.test("touching intervals do not overlap", () => {
		const res = areIntervalsOverlapping(
			"2026-11-21T10:00:00.000Z",
			"2026-11-21T11:00:00.000Z",
			"2026-11-21T11:00:00.000Z",
			"2026-11-21T12:00:00.000Z",
		);
		assert.equal(res, false);
		const duration = calculateOverlapDurationMinutes(
			"2026-11-21T10:00:00.000Z",
			"2026-11-21T11:00:00.000Z",
			"2026-11-21T11:00:00.000Z",
			"2026-11-21T12:00:00.000Z",
		);
		assert.equal(duration, 0);
	});

	await t.test("returns false on invalid dates", () => {
		assert.equal(areIntervalsOverlapping("invalid", "invalid", "2026-11-21T10:00:00Z", "2026-11-21T11:00:00Z"), false);
	});
});

test("checkScheduleOverlap - multi-chair collision checks", async (t) => {
	const clinicId = "11111111-1111-4111-8111-111111111111";
	const doctor1Id = "22222222-2222-4222-8222-222222222222";
	const doctor2Id = "33333333-3333-4333-8333-333333333333";
	const chair1Id = "44444444-4444-4444-8444-444444444444";
	const chair2Id = "55555555-5555-4555-8555-555555555555";
	const patient1Id = "66666666-6666-4666-8666-666666666666";
	const patient2Id = "77777777-7777-4777-8777-777777777777";

	const existingAppts: ScheduledAppointment[] = [
		{
			id: "a0000000-0000-4000-8000-000000000001",
			clinicId,
			doctorId: doctor1Id,
			cabinetId: chair1Id,
			patientId: patient1Id,
			startTime: "2026-11-21T10:00:00.000Z",
			endTime: "2026-11-21T11:00:00.000Z",
			status: "confirmed",
		},
		{
			id: "a0000000-0000-4000-8000-000000000002",
			clinicId,
			doctorId: doctor2Id,
			cabinetId: chair2Id,
			patientId: patient2Id,
			startTime: "2026-11-21T10:00:00.000Z",
			endTime: "2026-11-21T11:00:00.000Z",
			status: "cancelled", // should be ignored
		},
	];

	await t.test("detects doctor conflict", () => {
		const res = checkScheduleOverlap(
			{
				doctorId: doctor1Id,
				chairId: chair2Id, // different chair
				patientId: patient2Id,
				startsAt: "2026-11-21T10:30:00.000Z",
				endsAt: "2026-11-21T11:30:00.000Z",
			},
			existingAppts,
		);
		assert.equal(res.hasConflict, true);
		assert.equal(res.conflicts.length, 1);
		assert.equal(res.conflicts[0]?.type, "doctor_overlap");
		assert.equal(res.conflicts[0]?.overlapDurationMinutes, 30);
		assert.equal(res.canForceSchedule, true);
	});

	await t.test("detects chair conflict", () => {
		const res = checkScheduleOverlap(
			{
				doctorId: doctor2Id, // different doctor
				chairId: chair1Id, // same chair
				patientId: patient2Id,
				startsAt: "2026-11-21T10:15:00.000Z",
				endsAt: "2026-11-21T10:45:00.000Z",
			},
			existingAppts,
		);
		assert.equal(res.hasConflict, true);
		assert.equal(res.conflicts.length, 1);
		assert.equal(res.conflicts[0]?.type, "cabinet_overlap");
		assert.equal(res.conflicts[0]?.overlapDurationMinutes, 30);
	});

	await t.test("detects patient double booking and forbids forcing", () => {
		const res = checkScheduleOverlap(
			{
				doctorId: doctor2Id,
				chairId: chair2Id,
				patientId: patient1Id, // same patient
				startsAt: "2026-11-21T10:00:00.000Z",
				endsAt: "2026-11-21T11:00:00.000Z",
			},
			existingAppts,
		);
		assert.equal(res.hasConflict, true);
		assert.equal(res.conflicts[0]?.type, "patient_double_booking");
		assert.equal(res.canForceSchedule, false); // double booking a patient cannot be forced!
	});

	await t.test("ignores cancelled appointments and self ID", () => {
		const res = checkScheduleOverlap(
			{
				id: "a0000000-0000-4000-8000-000000000001", // self
				doctorId: doctor1Id,
				chairId: chair1Id,
				patientId: patient1Id,
				startsAt: "2026-11-21T10:00:00.000Z",
				endsAt: "2026-11-21T11:00:00.000Z",
			},
			existingAppts,
		);
		assert.equal(res.hasConflict, false);
	});
});

test("calculateEmergencyReserveSlots", () => {
	const shift: DoctorShiftSchedule = {
		id: "s0000000-0000-4000-8000-000000000001",
		clinicId: "11111111-1111-4111-8111-111111111111",
		doctorId: "22222222-2222-4222-8222-222222222222",
		shiftDate: "2026-11-21",
		startTime: "2026-11-21T09:00:00.000Z",
		endTime: "2026-11-21T15:00:00.000Z",
		isEmergencyReserveEnabled: true,
		emergencyReserveMinutes: 30,
	};

	const slots = calculateEmergencyReserveSlots(shift, []);
	assert.equal(slots.length, 1);
	assert.equal(slots[0]?.durationMinutes, 30);
	assert.equal(slots[0]?.startTime, "2026-11-21T14:30:00.000Z");
	assert.equal(slots[0]?.endTime, "2026-11-21T15:00:00.000Z");
	assert.equal(slots[0]?.isBooked, false);
});

test("calculateScheduleOverlapGroups - DSU grouping", () => {
	const clinicId = "11111111-1111-4111-8111-111111111111";
	const doctorId = "22222222-2222-4222-8222-222222222222";
	const patientId = "33333333-3333-4333-8333-333333333333";

	const appts: ScheduledAppointment[] = [
		{
			id: "a1",
			clinicId,
			doctorId,
			patientId,
			startTime: "2026-11-21T10:00:00.000Z",
			endTime: "2026-11-21T11:00:00.000Z",
			status: "confirmed",
		},
		{
			id: "a2",
			clinicId,
			doctorId,
			patientId,
			startTime: "2026-11-21T10:30:00.000Z",
			endTime: "2026-11-21T11:30:00.000Z",
			status: "confirmed",
		},
	];

	const groups = calculateScheduleOverlapGroups(appts);
	assert.equal(groups.size, 2);
	const pos1 = groups.get("a1");
	const pos2 = groups.get("a2");
	assert.ok(pos1);
	assert.ok(pos2);
	assert.equal(pos1.totalColumns, 2);
	assert.equal(pos2.totalColumns, 2);
	assert.notEqual(pos1.columnIndex, pos2.columnIndex);
});

test("findAvailableSlots - respects shifts, breaks and appointments", () => {
	const shift: DoctorShiftSchedule = {
		id: "s1",
		clinicId: "c1",
		doctorId: "d1",
		shiftDate: "2026-11-21",
		startTime: "2026-11-21T09:00:00.000Z",
		endTime: "2026-11-21T12:00:00.000Z",
		isEmergencyReserveEnabled: true,
		emergencyReserveMinutes: 30, // 11:30 to 12:00
	};

	const appts: ScheduledAppointment[] = [
		{
			id: "apt1",
			clinicId: "c1",
			doctorId: "d1",
			patientId: "p1",
			startTime: "2026-11-21T09:30:00.000Z",
			endTime: "2026-11-21T10:30:00.000Z",
			status: "confirmed",
		},
	];

	const freeSlots = findAvailableSlots(shift, appts, { minDurationMinutes: 30, excludeEmergencyReserves: true });
	// Shift: 09:00-12:00.
	// Appointment: 09:30-10:30.
	// Emergency reserve: 11:30-12:00.
	// Expected free slots:
	// 1: 09:00 - 09:30 (30 min)
	// 2: 10:30 - 11:30 (60 min)
	assert.equal(freeSlots.length, 2);
	assert.equal(freeSlots[0]?.startTime, "2026-11-21T09:00:00.000Z");
	assert.equal(freeSlots[0]?.endTime, "2026-11-21T09:30:00.000Z");
	assert.equal(freeSlots[0]?.durationMinutes, 30);
	assert.equal(freeSlots[0]?.qualifiesForTargetDuration, true);

	assert.equal(freeSlots[1]?.startTime, "2026-11-21T10:30:00.000Z");
	assert.equal(freeSlots[1]?.endTime, "2026-11-21T11:30:00.000Z");
	assert.equal(freeSlots[1]?.durationMinutes, 60);
	assert.equal(freeSlots[1]?.qualifiesForTargetDuration, true);
});
