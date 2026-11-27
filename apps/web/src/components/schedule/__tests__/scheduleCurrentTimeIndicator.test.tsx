import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ScheduleCurrentTimeIndicator,
	getCurrentTimeInfo,
} from "../grid/ScheduleCurrentTimeIndicator";

const SAMPLE_SLOTS = [
	"08:00",
	"08:30",
	"09:00",
	"09:30",
	"10:00",
	"10:30",
	"11:00",
	"19:30",
	"20:00",
];

describe("ScheduleCurrentTimeIndicator Real-Time Line & Timezone Verification", () => {
	it("1. Renders time pill and red horizontal line deterministically when clinic wall time is inside working slots", () => {
		// 2026-06-15T06:50:00Z === 09:50 in Europe/Moscow (UTC+3)
		const fixedNow = new Date("2026-06-15T06:50:00.000Z");
		const html = renderToStaticMarkup(
			<ScheduleCurrentTimeIndicator
				timeSlots={SAMPLE_SLOTS}
				gridStep={30}
				dateKey="2026-06-15"
				timezone="Europe/Moscow"
				baseSlotHeightPx={52}
				now={fixedNow}
			/>,
		);

		assert.ok(
			html.includes('data-testid="schedule-current-time-indicator"'),
			"Must render current time indicator inside working hours",
		);
		assert.ok(
			html.includes('data-time-formatted="09:50"'),
			"Must format clinic wall clock time in Europe/Moscow",
		);
		assert.ok(html.includes("09:50"), "Time pill must display 09:50");
	});

	it("2. Hides indicator when selected dateKey is not today in clinic timezone or outside slot range", () => {
		const fixedNow = new Date("2026-06-15T06:50:00.000Z");
		const wrongDayHtml = renderToStaticMarkup(
			<ScheduleCurrentTimeIndicator
				timeSlots={SAMPLE_SLOTS}
				gridStep={30}
				dateKey="2026-06-16"
				timezone="Europe/Moscow"
				now={fixedNow}
			/>,
		);
		assert.equal(wrongDayHtml, "", "Indicator must not render on future/past days");

		const nightHtml = renderToStaticMarkup(
			<ScheduleCurrentTimeIndicator
				timeSlots={SAMPLE_SLOTS}
				gridStep={30}
				dateKey="2026-06-15"
				timezone="Europe/Moscow"
				now={new Date("2026-06-15T19:30:00.000Z")} // 22:30 MSK
			/>,
		);
		assert.equal(nightHtml, "", "Indicator must hide outside schedule timeSlots range");
	});

	it("3. Resolves calendar day across midnight UTC boundary in clinic timezone (e.g. Asia/Vladivostok UTC+10)", () => {
		// 2026-06-15T15:10:00Z === 2026-06-16 01:10 in Asia/Vladivostok
		const info = getCurrentTimeInfo(
			"2026-06-16",
			"Asia/Vladivostok",
			new Date("2026-06-15T15:10:00.000Z"),
		);
		assert.equal(info.isToday, true);
		assert.equal(info.timeFormatted, "01:10");
		assert.equal(info.currentTotalMinutes, 70);
	});
});
