/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — SlotConflictModal.test.tsx
 *
 * Targeted Unit Tests for Slot Conflict Modal & SSOT Half-Open Interval Math.
 * Ensures strict alignment with backend scheduleConflictService.ts SSOT:
 * [start, end) intervals where adjacent slots eA === sB do NOT collide.
 * Touch targets >= 44px on coarse pointers per Mandate 8d.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	SlotConflictModal,
	hasTimeOverlap,
	areSlotsAdjacent,
	type AlternativeChairOption,
} from "../SlotConflictModal";

const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("SlotConflictModal & Canonical Interval Math SSOT", () => {
	describe("1. hasTimeOverlap Canonical Half-Open Interval [start, end)", () => {
		it("detects genuine overlap when slots intersect in time", () => {
			const startA = "2026-10-02T10:00:00.000Z";
			const endA = "2026-10-02T10:45:00.000Z";
			const startB = "2026-10-02T10:30:00.000Z";
			const endB = "2026-10-02T11:00:00.000Z";

			assert.equal(
				hasTimeOverlap(startA, endA, startB, endB),
				true,
				"Slots overlapping by 15 min must return true",
			);
			assert.equal(
				hasTimeOverlap(startB, endB, startA, endA),
				true,
				"Symmetric overlap must return true",
			);
		});

		it("strictly allows adjacent back-to-back slots (endA === startB) without false conflict", () => {
			const startA = "2026-10-02T10:00:00.000Z";
			const endA = "2026-10-02T10:30:00.000Z";
			const startB = "2026-10-02T10:30:00.000Z";
			const endB = "2026-10-02T11:00:00.000Z";

			assert.equal(
				hasTimeOverlap(startA, endA, startB, endB),
				false,
				"Back-to-back adjacent slots must NOT trigger collision",
			);
		});

		it("returns false for completely disjoint slots separated by a gap", () => {
			const startA = "2026-10-02T09:00:00.000Z";
			const endA = "2026-10-02T09:30:00.000Z";
			const startB = "2026-10-02T11:00:00.000Z";
			const endB = "2026-10-02T11:30:00.000Z";

			assert.equal(
				hasTimeOverlap(startA, endA, startB, endB),
				false,
				"Disjoint intervals must return false",
			);
		});

		it("detects 1-minute boundary overlap", () => {
			const startA = "2026-10-02T10:00:00.000Z";
			const endA = "2026-10-02T10:31:00.000Z";
			const startB = "2026-10-02T10:30:00.000Z";
			const endB = "2026-10-02T11:00:00.000Z";

			assert.equal(
				hasTimeOverlap(startA, endA, startB, endB),
				true,
				"1-minute overlap must return true",
			);
		});

		it("handles invalid or corrupt dates gracefully without throwing", () => {
			assert.equal(
				hasTimeOverlap("invalid", "invalid", "2026-10-02T10:00:00.000Z", "2026-10-02T10:30:00.000Z"),
				false,
				"Corrupt date strings must safely return false",
			);
		});
	});

	describe("2. areSlotsAdjacent Helper", () => {
		it("returns true when end of first slot matches start of second within 1 min", () => {
			const endA = "2026-10-02T10:30:00.000Z";
			const startB = "2026-10-02T10:30:00.000Z";

			assert.equal(
				areSlotsAdjacent(endA, startB),
				true,
				"Exact match must return true",
			);
		});

		it("returns false when there is a significant gap between slots", () => {
			const endA = "2026-10-02T10:30:00.000Z";
			const startB = "2026-10-02T10:45:00.000Z";

			assert.equal(
				areSlotsAdjacent(endA, startB),
				false,
				"15 minute gap is not adjacent",
			);
		});
	});

	describe("3. SlotConflictModal SSR Rendering & Touch Targets", () => {
		it("returns null when isOpen is false", () => {
			const html = renderToString(
				<SlotConflictModal
					isOpen={false}
					onClose={() => {}}
					doctorName="Д-р Иванов"
					patientName="Петров А.А."
					suggestedSlots={[]}
					onSelectSlot={() => {}}
				/>,
			);
			assert.equal(html, "", "Modal must return empty string when closed");
		});

		it("renders modal with 44px touch-target action buttons and 0 cartoon emojis", () => {
			const chairs: AlternativeChairOption[] = [
				{ id: "chair-2", name: "Кабинет 2 (Ортопедия)" },
				{ id: "chair-3", name: "Кабинет 3 (Хирургия)" },
			];

			const html = renderToString(
				<SlotConflictModal
					isOpen={true}
					onClose={() => {}}
					conflictType="doctor"
					doctorName="Д-р Смирнова"
					patientName="Кузнецов В.В."
					conflictMessage="Доктор Смирнова уже ведет прием пациента Кузнецов В.В. в это время"
					alternativeChairs={chairs}
					suggestedSlots={["15:00", "15:30", "16:00"]}
					onShiftMinutes={() => {}}
					onMoveToChair={() => {}}
					onSelectSlot={() => {}}
					onOverbook={() => {}}
				/>,
			);

			assert.ok(html.includes("Врач занят в это время"), "Modal title rendered");
			assert.ok(html.includes("Д-р Смирнова"), "Doctor name rendered");
			assert.ok(html.includes("Кузнецов В.В."), "Conflicting patient rendered");
			assert.ok(html.includes("min-h-[44px]"), "Enforces min-h-[44px] touch target for mobile/tablet pointers");
			assert.ok(html.includes("touch-manipulation"), "Enforces touch-manipulation CSS class for responsive click");
			assert.equal(CARTOON_EMOJI_REGEX.test(html), false, "Strict 0 cartoon emojis mandate");
		});
	});
});
