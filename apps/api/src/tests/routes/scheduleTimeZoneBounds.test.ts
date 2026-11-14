import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveScheduleDateBounds } from "../../routes/appointments/appointmentsQueryRoutes.js";

describe("Schedule Date Bounds in Clinic Timezone (Anti-Morning-Clipping)", () => {
	test("Asia/Vladivostok (UTC+10): morning appointment at 09:00 local time is within bounds", () => {
		const bounds = resolveScheduleDateBounds("2026-11-14", "Asia/Vladivostok");
		// 2026-11-14 00:00 Vladivostok = 2026-11-13 14:00:00.000 UTC
		assert.equal(bounds.dayStart.toISOString(), "2026-11-13T14:00:00.000Z");
		// 2026-11-14 23:59:59.999 Vladivostok = 2026-11-14 13:59:59.999 UTC
		assert.equal(bounds.dayEnd.toISOString(), "2026-11-14T13:59:59.999Z");

		// Morning appointment at 09:00 Vladivostok time = 2026-11-13 23:00:00 UTC
		const morningApptUtc = new Date("2026-11-13T23:00:00.000Z");
		assert.ok(morningApptUtc >= bounds.dayStart, "09:00 appt must be >= dayStart");
		assert.ok(morningApptUtc <= bounds.dayEnd, "09:00 appt must be <= dayEnd");
	});

	test("Europe/Samara (UTC+4): midnight and evening bounds", () => {
		const bounds = resolveScheduleDateBounds("2026-11-14", "Europe/Samara");
		// 2026-11-14 00:00 Samara = 2026-11-13 20:00:00.000 UTC
		assert.equal(bounds.dayStart.toISOString(), "2026-11-13T20:00:00.000Z");
		assert.equal(bounds.dayEnd.toISOString(), "2026-11-14T19:59:59.999Z");

		// Early appointment at 08:00 Samara time = 2026-11-14 04:00:00 UTC
		const earlyApptUtc = new Date("2026-11-14T04:00:00.000Z");
		assert.ok(earlyApptUtc >= bounds.dayStart);
		assert.ok(earlyApptUtc <= bounds.dayEnd);
	});

	test("Europe/Moscow (UTC+3): correctly resolves day bounds", () => {
		const bounds = resolveScheduleDateBounds("2026-11-14", "Europe/Moscow");
		assert.equal(bounds.dayStart.toISOString(), "2026-11-13T21:00:00.000Z");
		assert.equal(bounds.dayEnd.toISOString(), "2026-11-14T20:59:59.999Z");
	});

	test("Fallback on invalid timezone produces standard UTC bounds without crash", () => {
		const bounds = resolveScheduleDateBounds("2026-11-14", "Invalid/Timezone");
		assert.equal(bounds.dayStart.toISOString(), "2026-11-14T00:00:00.000Z");
		assert.equal(bounds.dayEnd.toISOString(), "2026-11-14T23:59:59.999Z");
	});
});
