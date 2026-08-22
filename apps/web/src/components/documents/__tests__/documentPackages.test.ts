import assert from "node:assert";
import { describe, test } from "node:test";
import { type DocumentKind, type GeneratedDocument } from "@dental/shared";
import { SURGICAL_STATUTORY_ITEMS } from "../SurgicalPackageModal";

describe("Document Packages and 1-Click Intake Scenarios", () => {
	test("Surgical package contains all 6 statutory medical documents", () => {
		assert.strictEqual(SURGICAL_STATUTORY_ITEMS.length, 6);
		const kinds = SURGICAL_STATUTORY_ITEMS.map((item) => item.kind);
		assert.ok(kinds.includes("procedure_specific_consent_packet"));
		assert.ok(kinds.includes("anesthesia_consent_log"));
		assert.ok(kinds.includes("dental_medical_card_043u"));
		assert.ok(kinds.includes("xray_cbct_referral"));
		assert.ok(kinds.includes("prescription_medication_order"));
		assert.ok(kinds.includes("post_visit_recommendations"));
	});

	test("1-click batch calculation detects missing documents correctly", () => {
		const existingDocs: Partial<GeneratedDocument>[] = [
			{ id: "doc-1", kind: "dental_medical_card_043u", status: "issued" },
			{ id: "doc-2", kind: "anesthesia_consent_log", status: "draft" },
		];

		const existingKinds = new Set(existingDocs.map((d) => d.kind));
		const missing = SURGICAL_STATUTORY_ITEMS.filter((item) => !existingKinds.has(item.kind)).map(
			(item) => item.kind,
		);

		assert.strictEqual(missing.length, 4);
		assert.ok(missing.includes("procedure_specific_consent_packet"));
		assert.ok(missing.includes("xray_cbct_referral"));
		assert.ok(missing.includes("prescription_medication_order"));
		assert.ok(missing.includes("post_visit_recommendations"));
		assert.ok(!missing.includes("dental_medical_card_043u"));
		assert.ok(!missing.includes("anesthesia_consent_log"));
	});

	test("Fully completed surgical package reports 0 missing items", () => {
		const allKinds: DocumentKind[] = [
			"procedure_specific_consent_packet",
			"anesthesia_consent_log",
			"dental_medical_card_043u",
			"xray_cbct_referral",
			"prescription_medication_order",
			"post_visit_recommendations",
		];
		const existingDocs: Partial<GeneratedDocument>[] = allKinds.map((kind, idx) => ({
			id: `doc-${idx}`,
			kind,
			status: "issued",
		}));

		const existingKinds = new Set(existingDocs.map((d) => d.kind));
		const missing = SURGICAL_STATUTORY_ITEMS.filter((item) => !existingKinds.has(item.kind));
		assert.strictEqual(missing.length, 0);
	});
});
