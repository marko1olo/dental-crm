import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	toCanonicalRecallStatus,
	fromCanonicalRecallStatus,
	CANONICAL_RECALL_STATUS_CONFIG,
	type CanonicalRecallWorkflowStatus,
} from "../../patientRecallEngine";

describe("2. Canonical Workflow Statuses & Mapping", () => {
	it("maps legacy and contact statuses into the 4 canonical workflow buckets", () => {
		assert.equal(toCanonicalRecallStatus("due_now"), "not_called");
		assert.equal(toCanonicalRecallStatus("pending"), "not_called");

		assert.equal(toCanonicalRecallStatus("invited"), "reached");
		assert.equal(toCanonicalRecallStatus("contacted"), "reached");

		assert.equal(toCanonicalRecallStatus("declined"), "declined");

		assert.equal(toCanonicalRecallStatus("scheduled"), "scheduled");
		assert.equal(toCanonicalRecallStatus("completed"), "scheduled");
	});

	it("maps canonical workflow statuses back to engine contact statuses", () => {
		assert.equal(fromCanonicalRecallStatus("not_called"), "due_now");
		assert.equal(fromCanonicalRecallStatus("reached"), "contacted");
		assert.equal(fromCanonicalRecallStatus("declined"), "declined");
		assert.equal(fromCanonicalRecallStatus("scheduled"), "scheduled");
	});

	it("defines canonical status config with localized Russian labels and color tokens", () => {
		const statuses: CanonicalRecallWorkflowStatus[] = [
			"not_called",
			"reached",
			"declined",
			"scheduled",
		];
		for (const s of statuses) {
			const cfg = CANONICAL_RECALL_STATUS_CONFIG[s];
			assert.ok(cfg, `Config for status ${s} must exist`);
			assert.ok(cfg.label.length > 0);
			assert.ok(cfg.badgeColorToken.length > 0);
		}
		assert.equal(CANONICAL_RECALL_STATUS_CONFIG.not_called.label, "Не звонили");
		assert.equal(CANONICAL_RECALL_STATUS_CONFIG.reached.label, "Дозвонились");
		assert.equal(CANONICAL_RECALL_STATUS_CONFIG.declined.label, "Отказ");
		assert.equal(CANONICAL_RECALL_STATUS_CONFIG.scheduled.label, "Записан");
	});
});
