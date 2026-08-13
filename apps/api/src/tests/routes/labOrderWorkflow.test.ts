import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_VALID_VITA_SHADES,
	isValidVitaShade,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	VITA_CLASSICAL_SHADES,
} from "@dental/shared";
import {
	LAB_ORDER_CLINIC_TRANSITIONS,
	LAB_ORDER_TECHNICIAN_TRANSITIONS,
	type LabOrderStatus,
} from "../../db/labQuery.js";

describe("Dental Laboratory VITA Shades & FDI Tooth Validation", () => {
	it("validates all 16 VITA Classical shades (A1–D4)", () => {
		for (const shade of VITA_CLASSICAL_SHADES) {
			assert.equal(
				isValidVitaShade(shade),
				true,
				`Expected VITA Classical shade ${shade} to be valid`,
			);
			assert.equal(
				isValidVitaShade(shade.toLowerCase()),
				true,
				`Expected lower-case shade ${shade} to be normalized and valid`,
			);
		}
	});

	it("validates VITA Bleach shades (0M1-0M3, BL1-BL4)", () => {
		for (const shade of VITA_BLEACH_SHADES) {
			assert.equal(
				isValidVitaShade(shade),
				true,
				`Expected VITA Bleach shade ${shade} to be valid`,
			);
		}
	});

	it("validates 26 VITA 3D-Master shades (e.g. 1M1, 2M2, 3L1.5)", () => {
		for (const shade of VITA_3D_MASTER_SHADES) {
			assert.equal(
				isValidVitaShade(shade),
				true,
				`Expected VITA 3D-Master shade ${shade} to be valid`,
			);
		}
	});

	it("rejects non-standard or invalid shade names", () => {
		const invalidShades = ["E1", "Z9", "superwhite", "123", "A5", ""];
		for (const shade of invalidShades) {
			assert.equal(
				isValidVitaShade(shade),
				false,
				`Expected shade ${shade} to be rejected`,
			);
		}
	});
});

describe("Dental Lab Order State Machine Transitions", () => {
	it("allows standard clinic forward lifecycle from draft to completed", () => {
		const transitions: Array<[LabOrderStatus, LabOrderStatus]> = [
			["draft", "sent"],
			["sent", "in_progress"],
			["in_progress", "shipped"],
			["shipped", "received"],
			["received", "completed"],
		];

		for (const [from, to] of transitions) {
			const allowed = LAB_ORDER_CLINIC_TRANSITIONS[from];
			assert.ok(
				allowed.includes(to),
				`Expected clinic transition ${from} -> ${to} to be permitted`,
			);
		}
	});

	it("allows clinic cancellation from any non-final state", () => {
		const cancellableStates: LabOrderStatus[] = [
			"draft",
			"sent",
			"in_progress",
			"shipped",
			"received",
			"refitting",
		];

		for (const state of cancellableStates) {
			const allowed = LAB_ORDER_CLINIC_TRANSITIONS[state];
			assert.ok(
				allowed.includes("cancelled"),
				`Expected cancellation from state ${state} to be permitted for clinic`,
			);
		}
	});

	it("technician portal cannot directly cancel or reopen draft orders", () => {
		assert.equal(
			LAB_ORDER_TECHNICIAN_TRANSITIONS.draft.length,
			0,
			"Technician cannot transition draft orders directly",
		);
		assert.equal(
			LAB_ORDER_TECHNICIAN_TRANSITIONS.completed.length,
			0,
			"Completed orders are locked and cannot transition",
		);
		assert.equal(
			LAB_ORDER_TECHNICIAN_TRANSITIONS.cancelled.length,
			0,
			"Cancelled orders are locked and cannot transition",
		);
	});
});
