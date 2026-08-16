import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	ClinicCapacitySchedulerService,
	type AppointmentSlot,
} from "./ClinicCapacitySchedulerService.js";

describe("ClinicCapacitySchedulerService — Feature #182 Chair Utilization & Burnout Protection", () => {
	test("1. Computes chair utilization percentage correctly", () => {
		// 720 operating minutes (12 hours), 540 booked minutes (9 hours) => 75%
		const res = ClinicCapacitySchedulerService.calculateChairUtilization("chair-1", 720, 540);
		assert.equal(res.utilizationRatePct, 75);
		assert.equal(res.status, "optimal");

		const under = ClinicCapacitySchedulerService.calculateChairUtilization("chair-2", 720, 200);
		assert.equal(under.status, "underutilized");

		const over = ClinicCapacitySchedulerService.calculateChairUtilization("chair-3", 720, 680);
		assert.equal(over.status, "overloaded");
	});

	test("2. Detects doctor fatigue on >8 hours without 30m break", () => {
		const baseDate = new Date("2026-08-17T08:00:00Z");
		// 9 hours continuous slots with only 12m gaps
		const slots: AppointmentSlot[] = [
			{
				id: "s1",
				doctorId: "doc-1",
				chairId: "chair-1",
				startsAt: new Date(baseDate.getTime()),
				endsAt: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000), // 4h
			},
			{
				id: "s2",
				doctorId: "doc-1",
				chairId: "chair-1",
				startsAt: new Date(baseDate.getTime() + 4.2 * 60 * 60 * 1000), // +12m break
				endsAt: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000), // total > 8h continuous
			},
		];

		const fatigue = ClinicCapacitySchedulerService.checkDoctorFatigue("doc-1", slots);
		assert.equal(fatigue.isFatigueWarningTriggered, true);
		assert.ok(fatigue.message !== null);
	});

	test("3. Finds emergency pain appointment gaps in chair schedule", () => {
		const dayStart = new Date("2026-08-17T09:00:00Z");
		const dayEnd = new Date("2026-08-17T18:00:00Z");

		const bookedSlots: AppointmentSlot[] = [
			{
				id: "b1",
				doctorId: "doc-1",
				chairId: "chair-1",
				startsAt: new Date("2026-08-17T10:00:00Z"),
				endsAt: new Date("2026-08-17T12:00:00Z"),
			},
			{
				id: "b2",
				doctorId: "doc-2",
				chairId: "chair-1",
				startsAt: new Date("2026-08-17T13:00:00Z"),
				endsAt: new Date("2026-08-17T17:00:00Z"),
			},
		];

		const gaps = ClinicCapacitySchedulerService.findEmergencySlots("chair-1", dayStart, dayEnd, bookedSlots, 30);
		// Gaps expected: 09:00-10:00 (60m), 12:00-13:00 (60m), 17:00-18:00 (60m)
		assert.equal(gaps.length, 3);
		assert.equal(gaps[0]!.availableDurationMinutes, 60);
		assert.equal(gaps[1]!.availableDurationMinutes, 60);
		assert.equal(gaps[2]!.availableDurationMinutes, 60);
	});
});
