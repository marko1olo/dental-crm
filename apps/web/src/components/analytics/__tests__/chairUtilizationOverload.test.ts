/**
 * apps/web/src/components/analytics/__tests__/chairUtilizationOverload.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock chair overload detection and surgical sanitation.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateClinicChairUtilization,
	type ChairDefinition,
	type RawAppointmentItem,
} from "../chairUtilizationEngine.js";

test("chairUtilizationEngine: detects overloaded chair and surgery sanitation differential", () => {
	const customChairs: readonly ChairDefinition[] = [
		{
			id: "surg-1",
			name: "Хирургия",
			cabinet: "Операционная",
			workingHoursPerDay: 8, // 480 min
			sanitationMinutesPerVisit: 30, // 30 min per surgical visit
			isActive: true,
		},
	];

	// 4 surgical visits of 100 min each = 400 min occupied + 4 * 30 min sanitation = 120 min => 520 min -> capped at available 480
	const appointments: RawAppointmentItem[] = [
		{ id: "s1", chairId: "surg-1", startsAt: "2026-10-02T08:00:00Z", endsAt: "2026-10-02T09:40:00Z", status: "completed" },
		{ id: "s2", chairId: "surg-1", startsAt: "2026-10-02T10:00:00Z", endsAt: "2026-10-02T11:40:00Z", status: "completed" },
		{ id: "s3", chairId: "surg-1", startsAt: "2026-10-02T12:00:00Z", endsAt: "2026-10-02T13:40:00Z", status: "completed" },
		{ id: "s4", chairId: "surg-1", startsAt: "2026-10-02T14:00:00Z", endsAt: "2026-10-02T15:40:00Z", status: "completed" },
	];

	const res = calculateClinicChairUtilization({
		appointments,
		chairsConfig: customChairs,
		daysCount: 1,
	});

	const surg = res.chairs[0]!;
	assert.equal(surg.occupiedMinutes, 400);
	assert.equal(surg.sanitationMinutes, 120);
	assert.equal(surg.effectiveOccupiedMinutes, 480); // Clamped to availableMinutes (480)
	assert.equal(surg.idleMinutes, 0);
	assert.equal(surg.effectiveUtilizationPercent, 100.0);
	assert.equal(surg.isOverloaded, true); // >= 90%
});
