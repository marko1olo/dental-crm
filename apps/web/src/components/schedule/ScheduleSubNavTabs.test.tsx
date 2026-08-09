import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScheduleSubNavTabs } from "./ScheduleSubNavTabs";

describe("ScheduleSubNavTabs Component", () => {
	it("renders all sub-navigation buttons with horizontal scroll classes and shrink-0 whitespace-nowrap", () => {
		const html = renderToStaticMarkup(
			createElement(ScheduleSubNavTabs, {
				showShiftAnalytics: false,
				setShowShiftAnalytics: () => {},
				setScheduleDateFilter: () => {},
				todayScheduleDate: () => "2026-08-09",
				waitlistCount: 2,
				setWaitlistOpen: () => {},
				showConfirmationsPanel: false,
				setShowConfirmationsPanel: () => {},
				showFreedSlotsPanel: false,
				setShowFreedSlotsPanel: () => {},
				showClipboardPanel: false,
				setShowClipboardPanel: () => {},
			}),
		);

		assert.ok(
			html.includes("overflow-x-auto"),
			"Contains overflow-x-auto for horizontal scroll",
		);
		assert.ok(
			html.includes("whitespace-nowrap"),
			"Contains whitespace-nowrap for no text collapse",
		);
		assert.ok(
			html.includes("scrollbar-none"),
			"Contains scrollbar-none utility class",
		);
		assert.ok(
			html.includes("Показать аналитику"),
			"Renders 'Показать аналитику' tab",
		);
		assert.ok(html.includes("Сегодня"), "Renders 'Сегодня' tab");
		assert.ok(
			html.includes("Лист ожидания · 2"),
			"Renders 'Лист ожидания' tab with count",
		);
		assert.ok(
			html.includes("Утренний обзвон"),
			"Renders 'Утренний обзвон' tab",
		);
		assert.ok(
			html.includes("Освободившиеся окна"),
			"Renders 'Освободившиеся окна' tab",
		);
		assert.ok(html.includes("Буфер"), "Renders 'Буфер' tab");
	});
});
