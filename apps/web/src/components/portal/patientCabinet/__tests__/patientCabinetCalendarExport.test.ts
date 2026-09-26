/**
 * patientCabinetCalendarExport.test.ts
 *
 * Unit tests verifying dynamic calendar exports (Apple iCal .ics, Google Calendar, Yandex Calendar)
 * in OverviewTab and AppointmentsTab according to Mandates 8c, 8e, and Wave 85.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getAppointmentCalendarDates, OverviewTab } from "../tabs/OverviewTab.js";
import { DEMO_PATIENT_CABINET } from "../patientCabinetPresets.js";
import { calculateCabinetSummary } from "../patientCabinetEngine.js";
import { calculateDentalHealthIndex } from "../../patientFriendlyOdontogramEngine.js";

describe("Patient Cabinet Dynamic Calendar Export Invariants", () => {
	it("1. getAppointmentCalendarDates parses standard date and time string", () => {
		const res = getAppointmentCalendarDates("2026-10-15", "11:30", 60);
		assert.strictEqual(res.startCompact, "20261015T113000");
		assert.strictEqual(res.endCompact, "20261015T123000");
		assert.strictEqual(res.startYandex, "2026-10-15T11:30:00");
		assert.strictEqual(res.endYandex, "2026-10-15T12:30:00");
	});

	it("2. getAppointmentCalendarDates parses time range '14:00-15:30' dynamically", () => {
		const res = getAppointmentCalendarDates("2026-11-20", "14:00-15:30");
		assert.strictEqual(res.startCompact, "20261120T140000");
		assert.strictEqual(res.endCompact, "20261120T153000");
		assert.strictEqual(res.startYandex, "2026-11-20T14:00:00");
		assert.strictEqual(res.endYandex, "2026-11-20T15:30:00");
	});

	it("3. getAppointmentCalendarDates handles ISO timestamp string", () => {
		const res = getAppointmentCalendarDates("2026-12-05T16:45:00Z");
		assert.strictEqual(res.startCompact, "20261205T164500");
		assert.strictEqual(res.endCompact, "20261205T174500");
		assert.strictEqual(res.startYandex, "2026-12-05T16:45:00");
		assert.strictEqual(res.endYandex, "2026-12-05T1745:00".replace("1745", "17:45"));
	});

	it("4. getAppointmentCalendarDates handles fallback when date/time is undefined", () => {
		const res = getAppointmentCalendarDates(undefined, undefined);
		assert.ok(res.startCompact.startsWith("20260901"));
		assert.ok(res.endCompact.startsWith("20260901"));
	});

	it("5. OverviewTab renders calendar export buttons with zero disabled state", () => {
		const data = { ...DEMO_PATIENT_CABINET };
		const summary = calculateCabinetSummary(data);
		const healthIndex = calculateDentalHealthIndex();

		const html = renderToStaticMarkup(
			createElement(OverviewTab, {
				data,
				summary,
				healthIndex,
				nextApptCountdown: "Через 3 дня",
				onOpenTab: () => {},
				onOpenReceptionQr: () => {},
				onOpenCareMemo: () => {},
				onOpenSbpForInvoice: () => {},
				onOpenSelfCheckin: () => {},
				onOpenBooking: () => {},
				onOpenReschedule: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="next-appt-apple-cal-btn"'), "Renders Apple iCal button");
		assert.ok(html.includes('data-testid="next-appt-google-cal-btn"'), "Renders Google Calendar button");
		assert.ok(html.includes('data-testid="next-appt-yandex-cal-btn"'), "Renders Yandex Calendar button");

		// Zero disabled buttons invariant
		assert.strictEqual(
			html.includes("<button disabled") || html.includes('disabled=""'),
			false,
			"Zero disabled buttons across Overview tab",
		);
	});
});
