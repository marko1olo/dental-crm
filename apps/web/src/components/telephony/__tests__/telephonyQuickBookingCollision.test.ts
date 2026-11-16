import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { computeQuickBookingSlots, type QuickBookingDashboardLike } from "../IncomingCallQuickBooking.js";
import { mockPatients, mockStaff, mockChairs } from "./telephonyTestFixtures.js";

describe("Telephony: Collision-Free Quick Booking Slots", () => {
	const mockDashboard: QuickBookingDashboardLike = {
		todayIso: "2026-10-02",
		clinicSettings: {
			staff: mockStaff,
			chairs: mockChairs,
		},
		appointments: [],
	};

	test("computeQuickBookingSlots returns 3 configured slot options", () => {
		const { slots, getSlotInterval } = computeQuickBookingSlots(mockDashboard);
		assert.equal(slots.length, 3);
		assert.equal(slots[0]?.type, "today_urgent");
		assert.equal(slots[1]?.type, "today_standard");
		assert.equal(slots[2]?.type, "tomorrow");

		const urgentInterval = getSlotInterval("today_urgent");
		assert.ok(urgentInterval.startsAt);
		assert.ok(urgentInterval.endsAt);
		assert.ok(Date.parse(urgentInterval.endsAt) > Date.parse(urgentInterval.startsAt));
	});

	test("computeQuickBookingSlots avoids chair collisions by shifting slot", () => {
		const busyDashboard: QuickBookingDashboardLike = {
			...mockDashboard,
			appointments: [
				{
					id: "appt-conflict-1",
					organizationId: "99999999-9999-9999-9999-999999999999",
					doctorUserId: mockStaff[0]?.id || "33333333-3333-3333-3333-333333333333",
					chairId: mockChairs[0]?.id || "55555555-5555-5555-5555-555555555555",
					patientId: "11111111-1111-1111-1111-111111111111",
					startsAt: "2026-10-02T14:00:00.000Z",
					endsAt: "2026-10-02T15:00:00.000Z",
					status: "confirmed",
					reason: null,
					comment: null,
				},
			],
		};

		const { getSlotInterval } = computeQuickBookingSlots(busyDashboard);
		const standardInterval = getSlotInterval("today_standard");

		const startMs = Date.parse(standardInterval.startsAt);
		const endMs = Date.parse(standardInterval.endsAt);
		const conflictStart = Date.parse("2026-10-02T14:00:00.000Z");
		const conflictEnd = Date.parse("2026-10-02T15:00:00.000Z");

		const hasOverlap = Math.max(startMs, conflictStart) < Math.min(endMs, conflictEnd);
		assert.equal(hasOverlap, false, "Quick booking slot must never overlap existing confirmed appointment");
	});
});
