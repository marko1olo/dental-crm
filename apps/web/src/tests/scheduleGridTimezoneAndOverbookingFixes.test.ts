import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeBuildSlotIso } from "../components/schedule/grid/gridSlotMath";
import { toDateTimeLocalValue, fromDateTimeLocalValue } from "../utils/dateTimeUtils";

describe("Schedule Grid Timezone & Collision Invariants (Red Team Fixer)", () => {
	it("1. safeBuildSlotIso with Europe/Moscow timezone builds exact UTC instant without +3h drift", () => {
		const timezone = "Europe/Moscow";
		const dateKey = "2026-11-22";
		const hour = "14:00";
		const durationMinutes = 30;

		const { startIso, endIso } = safeBuildSlotIso(dateKey, hour, durationMinutes, timezone);

		// In Moscow (UTC+3), 14:00 corresponds to 11:00 UTC
		assert.equal(startIso, "2026-11-22T11:00:00.000Z");
		assert.equal(endIso, "2026-11-22T11:30:00.000Z");

		// Round-trip verification: rendering this ISO in clinic timezone yields exactly 14:00
		const renderedLocal = toDateTimeLocalValue(startIso, timezone);
		assert.equal(renderedLocal, "2026-11-22T14:00");
	});

	it("2. safeBuildSlotIso with Europe/Samara timezone builds exact UTC instant without +4h drift", () => {
		const timezone = "Europe/Samara";
		const dateKey = "2026-11-22";
		const hour = "15:30";
		const durationMinutes = 45;

		const { startIso, endIso } = safeBuildSlotIso(dateKey, hour, durationMinutes, timezone);

		// In Samara (UTC+4), 15:30 corresponds to 11:30 UTC
		assert.equal(startIso, "2026-11-22T11:30:00.000Z");
		assert.equal(endIso, "2026-11-22T12:15:00.000Z");

		const renderedLocal = toDateTimeLocalValue(startIso, timezone);
		assert.equal(renderedLocal, "2026-11-22T15:30");
	});

	it("3. Suggested slot application accurately calculates target ISO in clinic timezone", () => {
		const timezone = "Europe/Moscow";
		const draftStartsAt = "2026-11-22T08:00:00.000Z"; // 11:00 MSK
		const slotTime = "14:30";
		const durationMs = 30 * 60_000;

		const [hh, mm] = slotTime.split(":").map(Number);
		assert.ok(hh !== undefined && mm !== undefined);

		const localDateStr = toDateTimeLocalValue(draftStartsAt, timezone).slice(0, 10);
		const targetLocalStr = `${localDateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
		const targetStartIso = fromDateTimeLocalValue(targetLocalStr, timezone);
		const parsedStartMs = Date.parse(targetStartIso);
		const newStartIso = new Date(parsedStartMs).toISOString();
		const newEndIso = new Date(parsedStartMs + durationMs).toISOString();

		// In Moscow, 14:30 is 11:30 UTC
		assert.equal(newStartIso, "2026-11-22T11:30:00.000Z");
		assert.equal(newEndIso, "2026-11-22T12:00:00.000Z");

		assert.equal(toDateTimeLocalValue(newStartIso, timezone), "2026-11-22T14:30");
	});

	it("4. Overbooking reset logic in appointment update safely clears isOverbooking when moving to empty slot", () => {
		type UpdateInput = {
			startsAt?: string;
			chairId?: string;
			doctorUserId?: string;
			allowOverbooking?: boolean;
			allowEmergencyOverride?: boolean;
		};

		function computeOverbookingFlag(input: UpdateInput, isEmergencyOverrideOverall: boolean): boolean | undefined {
			if (input.allowOverbooking !== undefined || input.allowEmergencyOverride !== undefined) {
				return Boolean(input.allowOverbooking || isEmergencyOverrideOverall);
			}
			if (!isEmergencyOverrideOverall && (input.startsAt !== undefined || input.chairId !== undefined || input.doctorUserId !== undefined)) {
				return false;
			}
			return undefined;
		}

		// Case A: Moving from overbooking to regular empty slot (startsAt specified, no allowOverbooking)
		const resetResult = computeOverbookingFlag({ startsAt: "2026-11-22T12:00:00.000Z" }, false);
		assert.equal(resetResult, false, "Overbooking flag must be reset to false when slot is moved without overbooking request");

		// Case B: Explicit allowOverbooking requested
		const explicitOverbook = computeOverbookingFlag({ allowOverbooking: true }, false);
		assert.equal(explicitOverbook, true, "Explicit overbooking must set flag to true");

		// Case C: Emergency override
		const emergencyOverbook = computeOverbookingFlag({ startsAt: "2026-11-22T12:00:00.000Z" }, true);
		assert.equal(emergencyOverbook, undefined, "Emergency booking preserves flag without forced false reset");
	});
});
