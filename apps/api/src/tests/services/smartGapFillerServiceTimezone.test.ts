import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { utcToLocalWallTime } from "../../routes/publicBooking/index.js";
import {
	parsePreferredRanges,
	slotFitsRanges,
} from "../../services/schedule/waitlistMatching.js";

describe("smartGapFillerService: Timezone drift & waitlist slot calculation", () => {
	it("correctly calculates wall-clock time in clinic timezone without host drift", () => {
		// 10:00:00 UTC
		const utcDate = new Date("2026-11-20T10:00:00.000Z");

		// In Samara (UTC+4), wall time should be 14:00 (minute 14 * 60 = 840)
		const samaraWall = utcToLocalWallTime(utcDate, "Europe/Samara");
		assert.equal(samaraWall.hours, 14);
		assert.equal(samaraWall.minutes, 0);

		const samaraStartMinute = samaraWall.hours * 60 + samaraWall.minutes;
		assert.equal(samaraStartMinute, 840);

		// In Moscow (UTC+3), wall time should be 13:00 (minute 13 * 60 = 780)
		const moscowWall = utcToLocalWallTime(utcDate, "Europe/Moscow");
		assert.equal(moscowWall.hours, 13);
		assert.equal(moscowWall.minutes, 0);

		const moscowStartMinute = moscowWall.hours * 60 + moscowWall.minutes;
		assert.equal(moscowStartMinute, 780);

		// In Vladivostok (UTC+10), wall time should be 20:00 (minute 20 * 60 = 1200)
		const vlWall = utcToLocalWallTime(utcDate, "Asia/Vladivostok");
		assert.equal(vlWall.hours, 20);
		assert.equal(vlWall.minutes, 0);

		const vlStartMinute = vlWall.hours * 60 + vlWall.minutes;
		assert.equal(vlStartMinute, 1200);
	});

	it("matches patient preferred time ranges using clinic wall-clock minutes", () => {
		// Slot at 06:30 UTC
		const slotUtc = new Date("2026-11-20T06:30:00.000Z");

		// Samara (UTC+4) -> 10:30 local wall-clock (630 minutes from midnight)
		const samaraWall = utcToLocalWallTime(slotUtc, "Europe/Samara");
		const samaraMinutes = samaraWall.hours * 60 + samaraWall.minutes;
		assert.equal(samaraMinutes, 630);

		// Patient prefers morning: 09:00 - 12:00
		const morningRanges = parsePreferredRanges(["09:00-12:00"]);
		assert.equal(slotFitsRanges(samaraMinutes, morningRanges), true);

		// Patient prefers evening: 17:00 - 20:00
		const eveningRanges = parsePreferredRanges(["17:00-20:00"]);
		assert.equal(slotFitsRanges(samaraMinutes, eveningRanges), false);
	});
});
