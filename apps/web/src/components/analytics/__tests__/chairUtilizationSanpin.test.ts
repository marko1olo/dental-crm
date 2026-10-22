/**
 * apps/web/src/components/analytics/__tests__/chairUtilizationSanpin.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock chair duration, buffers and SanPiN utilization.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateClinicChairUtilization,
	getAppointmentDurationMinutes,
	type ChairDefinition,
	type RawAppointmentItem,
} from "../chairUtilizationEngine.js";

test("chairUtilizationEngine: getAppointmentDurationMinutes calculates and clamps accurately", () => {
	assert.equal(getAppointmentDurationMinutes("2026-10-02T10:00:00Z", "2026-10-02T11:00:00Z"), 60);
	assert.equal(getAppointmentDurationMinutes("2026-10-02T10:00:00Z", "2026-10-02T11:30:00Z"), 90);
	assert.equal(getAppointmentDurationMinutes("2026-10-02T12:00:00Z", "2026-10-02T11:00:00Z"), 30);
	assert.equal(getAppointmentDurationMinutes("invalid", "invalid"), 30);
	assert.equal(getAppointmentDurationMinutes("2026-10-02T10:00:00Z", "2026-10-02T10:02:00Z"), 5);
	assert.equal(getAppointmentDurationMinutes("2026-10-02T08:00:00Z", "2026-10-02T22:00:00Z"), 720);
});

test("chairUtilizationEngine: calculateClinicChairUtilization enforces SanPiN 15-min buffers", () => {
	const empty = calculateClinicChairUtilization({ appointments: [] });
	assert.equal(empty.isEmpty, true);
	assert.equal(empty.totalChairsCount, 3);
	assert.equal(empty.overallUtilizationPercent, 0);
	assert.equal(empty.overallPureOccupancyPercent, 0);

	const customChairs: readonly ChairDefinition[] = [
		{
			id: "chair-1",
			name: "Кресло 1 (Терапия)",
			cabinet: "Кабинет №1",
			workingHoursPerDay: 10,
			sanitationMinutesPerVisit: 15,
			isActive: true,
		},
	];

	const appointments: RawAppointmentItem[] = [
		{
			id: "a-1",
			chairId: "chair-1",
			startsAt: "2026-10-02T09:00:00Z",
			endsAt: "2026-10-02T10:30:00Z",
			status: "completed",
			revenueKopecks: 600000,
		},
		{
			id: "a-2",
			chairId: "chair-1",
			startsAt: "2026-10-02T11:00:00Z",
			endsAt: "2026-10-02T12:30:00Z",
			status: "completed",
			revenueKopecks: 800000,
		},
		{
			id: "a-3",
			chairId: "chair-1",
			startsAt: "2026-10-02T14:00:00Z",
			endsAt: "2026-10-02T15:00:00Z",
			status: "cancelled",
			revenueKopecks: 0,
		},
	];

	const res = calculateClinicChairUtilization({
		appointments,
		chairsConfig: customChairs,
		daysCount: 1,
	});

	assert.equal(res.isEmpty, false);
	assert.equal(res.chairs.length, 1);

	const ch1 = res.chairs[0]!;
	assert.equal(ch1.totalAppointments, 3);
	assert.equal(ch1.completedCount, 2);
	assert.equal(ch1.cancelledCount, 1);
	assert.equal(ch1.occupiedMinutes, 180);
	assert.equal(ch1.sanitationMinutes, 30);
	assert.equal(ch1.effectiveOccupiedMinutes, 210);
	assert.equal(ch1.availableMinutes, 600);
	assert.equal(ch1.idleMinutes, 390);
	assert.equal(ch1.pureOccupancyPercent, 30.0);
	assert.equal(ch1.effectiveUtilizationPercent, 35.0);
	assert.equal(ch1.totalRevenueKopecks, 1400000);
	assert.equal(ch1.revenuePerHourKopecks, 466667);
	assert.equal(ch1.capacityYieldPerHourKopecks, 140000);
	assert.equal(ch1.cancellationRatePercent, 33.3);
	assert.equal(ch1.isOverloaded, false);
});
