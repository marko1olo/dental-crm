import assert from "node:assert";
import { describe, test } from "node:test";
import type { DocumentKind } from "../index.js";
import {
	buildRuleBasedVisitDraftFromTranscript,
	documentAmountSource,
	documentKindSchema,
	documentPayloadActualKeys,
	documentPayloadAllowedKeys,
	documentPayloadDisallowedKeys,
	documentRequiresPaidRecord,
} from "../index.js";

// ════════════════════════════════════════════════════════════════════
// documentAmountSource
// ════════════════════════════════════════════════════════════════════

describe("documentAmountSource", () => {
	test("returns expected amount source for different document kinds", () => {
		assert.strictEqual(documentAmountSource("completed_works_act"), "paid");
		assert.strictEqual(
			documentAmountSource("tax_deduction_certificate"),
			"paid",
		);
		assert.strictEqual(
			documentAmountSource("paid_medical_services_contract"),
			"planned",
		);
		assert.strictEqual(documentAmountSource("treatment_plan"), "planned");
		assert.strictEqual(documentAmountSource("informed_consent"), "none");
		assert.strictEqual(
			documentAmountSource("procedure_specific_consent_packet"),
			"none",
		);
		assert.strictEqual(documentAmountSource("anesthesia_consent_log"), "none");
		assert.strictEqual(
			documentAmountSource("prescription_medication_order"),
			"none",
		);
	});

	test("handles all valid document kinds without throwing and returns a valid source", () => {
		const validSources = ["none", "planned", "paid"];
		for (const kind of documentKindSchema.options) {
			const result = documentAmountSource(kind);
			assert.ok(
				validSources.includes(result),
				`Invalid source '${result}' for document kind '${kind}'`,
			);
		}
	});
});

// ════════════════════════════════════════════════════════════════════
// documentRequiresPaidRecord
// ════════════════════════════════════════════════════════════════════

describe("documentRequiresPaidRecord", () => {
	test("returns expected boolean for different document kinds", () => {
		// Requires paid record
		assert.strictEqual(documentRequiresPaidRecord("completed_works_act"), true);
		assert.strictEqual(
			documentRequiresPaidRecord("tax_deduction_certificate"),
			true,
		);
		assert.strictEqual(documentRequiresPaidRecord("payment_receipt"), true);
		assert.strictEqual(
			documentRequiresPaidRecord("payment_refund_correction_request"),
			true,
		);
		assert.strictEqual(
			documentRequiresPaidRecord("legacy_tax_deduction_certificate"),
			true,
		);
		assert.strictEqual(
			documentRequiresPaidRecord("tax_deduction_registry"),
			true,
		);

		// Doesn't require paid record
		assert.strictEqual(
			documentRequiresPaidRecord("paid_medical_services_contract"),
			false,
		);
		assert.strictEqual(documentRequiresPaidRecord("treatment_plan"), false);
		assert.strictEqual(documentRequiresPaidRecord("payment_invoice"), false);
		assert.strictEqual(documentRequiresPaidRecord("informed_consent"), false);
		assert.strictEqual(
			documentRequiresPaidRecord("prescription_medication_order"),
			false,
		);
		assert.strictEqual(documentRequiresPaidRecord("lab_work_order"), false);
	});

	test("handles all valid document kinds without throwing", () => {
		for (const kind of documentKindSchema.options) {
			const result = documentRequiresPaidRecord(kind);
			assert.strictEqual(typeof result, "boolean");
		}
	});

	test("edge cases: handles invalid or missing document kinds gracefully", () => {
		assert.strictEqual(documentRequiresPaidRecord("" as any), false);
		assert.strictEqual(
			documentRequiresPaidRecord("invalid_kind" as any),
			false,
		);
		assert.strictEqual(documentRequiresPaidRecord(undefined as any), false);
		assert.strictEqual(documentRequiresPaidRecord(null as any), false);
	});
});

// ════════════════════════════════════════════════════════════════════
// documentPayloadActualKeys
// ════════════════════════════════════════════════════════════════════

describe("documentPayloadActualKeys", () => {
	test("returns empty array for null or undefined", () => {
		assert.deepStrictEqual(documentPayloadActualKeys(null), []);
		assert.deepStrictEqual(documentPayloadActualKeys(undefined), []);
	});

	test("returns empty array for empty payload", () => {
		assert.deepStrictEqual(documentPayloadActualKeys({}), []);
	});

	test("returns defined keys", () => {
		const payload = {
			treatmentPlan: {
				/* mock data */
			},
			completedWorksAct: {
				/* mock data */
			},
		};
		// @ts-expect-error Mock payload
		assert.deepStrictEqual(documentPayloadActualKeys(payload), [
			"treatmentPlan",
			"completedWorksAct",
		]);
	});

	test("filters out undefined values", () => {
		const payload = {
			treatmentPlan: {
				/* mock data */
			},
			completedWorksAct: undefined,
		};
		// @ts-expect-error Mock payload
		assert.deepStrictEqual(documentPayloadActualKeys(payload), [
			"treatmentPlan",
		]);
	});
});

// ════════════════════════════════════════════════════════════════════
// documentPayloadAllowedKeys
// ════════════════════════════════════════════════════════════════════

describe("documentPayloadAllowedKeys", () => {
	test("returns expected payload keys for specific document kinds", () => {
		assert.deepStrictEqual(
			documentPayloadAllowedKeys("paid_medical_services_contract"),
			["paidMedicalServicesContract"],
		);
		assert.deepStrictEqual(documentPayloadAllowedKeys("treatment_plan"), [
			"treatmentPlan",
		]);
		assert.deepStrictEqual(
			documentPayloadAllowedKeys("tax_deduction_certificate"),
			["taxPaymentSelection"],
		);
		assert.deepStrictEqual(
			documentPayloadAllowedKeys("patient_intake_questionnaire"),
			["patientIntakeQuestionnaire"],
		);
	});

	test("returns an empty array for unknown document kinds", () => {
		assert.deepStrictEqual(
			documentPayloadAllowedKeys("unknown_kind" as DocumentKind),
			[],
		);
	});

	test("handles all valid document kinds without throwing and returns an array", () => {
		for (const kind of documentKindSchema.options) {
			const result = documentPayloadAllowedKeys(kind);
			assert.ok(Array.isArray(result), `Expected array for kind ${kind}`);
		}
	});
});

// ════════════════════════════════════════════════════════════════════
// documentPayloadDisallowedKeys
// ════════════════════════════════════════════════════════════════════

describe("documentPayloadDisallowedKeys", () => {
	test("returns empty array for null or undefined payload", () => {
		assert.deepStrictEqual(
			documentPayloadDisallowedKeys("patient_intake_questionnaire", null),
			[],
		);
		assert.deepStrictEqual(
			documentPayloadDisallowedKeys("patient_intake_questionnaire", undefined),
			[],
		);
	});

	test("returns empty array when payload is an empty object", () => {
		assert.deepStrictEqual(
			documentPayloadDisallowedKeys("patient_intake_questionnaire", {}),
			[],
		);
	});

	test("returns empty array when payload only contains allowed keys", () => {
		const payload = {
			patientIntakeQuestionnaire: {
				answers: [],
				completedAt: "2023-01-01",
				patientSignature: { mode: "paper_signed", signedAt: "2023-01-01" },
			},
		};
		assert.deepStrictEqual(
			documentPayloadDisallowedKeys(
				"patient_intake_questionnaire",
				payload as any,
			),
			[],
		);
	});

	test("returns array of disallowed keys when payload contains keys not allowed for the given kind", () => {
		const payload = {
			patientIntakeQuestionnaire: {
				answers: [],
				completedAt: "2023-01-01",
				patientSignature: { mode: "paper_signed", signedAt: "2023-01-01" },
			},
			paidMedicalServicesContract: {
				contractNumber: "123",
				contractDate: "2023-01-01",
				patientSignature: { mode: "paper_signed", signedAt: "2023-01-01" },
			},
		};
		assert.deepStrictEqual(
			documentPayloadDisallowedKeys(
				"patient_intake_questionnaire",
				payload as any,
			),
			["paidMedicalServicesContract"],
		);
	});

	test("ignores keys with undefined values", () => {
		const payload = {
			patientIntakeQuestionnaire: {
				answers: [],
				completedAt: "2023-01-01",
				patientSignature: { mode: "paper_signed", signedAt: "2023-01-01" },
			},
			paidMedicalServicesContract: undefined,
		};
		assert.deepStrictEqual(
			documentPayloadDisallowedKeys(
				"patient_intake_questionnaire",
				payload as any,
			),
			[],
		);
	});
});

// ════════════════════════════════════════════════════════════════════
// buildRuleBasedVisitDraftFromTranscript
// ════════════════════════════════════════════════════════════════════

describe("buildRuleBasedVisitDraftFromTranscript", () => {
	test("happy path: extracts all sections perfectly from a structured transcript", () => {
		const transcript =
			"Жалобы на боль в 36 зубе при накусывании. Анамнез: зуб болит уже третий день, аллергии на медикаменты нет. Объективно: глубокая кариозная полость, перкуссия резко болезненна. Диагноз: острый верхушечный периодонтит 36 зуба. Лечение: анестезия, коффердам, экстирпация пульпы, механическая и медикаментозная обработка корневых каналов, пломбирование каналов гуттаперчей, временная пломба.";
		const draft = buildRuleBasedVisitDraftFromTranscript(transcript);

		assert.strictEqual(draft.complaint, "на боль в 36 зубе при накусывании");
		assert.strictEqual(
			draft.anamnesis,
			"зуб болит уже третий день, аллергии на медикаменты нет",
		);
		assert.strictEqual(
			draft.objectiveStatus,
			"глубокая кариозная полость, перкуссия резко болезненна",
		);
		assert.strictEqual(
			draft.diagnosis,
			"острый верхушечный периодонтит 36 зуба",
		);
		assert.strictEqual(
			draft.treatmentPlan,
			"анестезия, коффердам, экстирпация пульпы, механическая и медикаментозная обработка корневых каналов, пломбирование каналов гуттаперчей, временная пломба",
		);

		assert.ok(draft.quality);
		assert.strictEqual(draft.quality.level, "ready");
		assert.ok(draft.quality.confidence > 0.8);
		assert.ok(draft.quality.detectedToothCodes.includes("36"));
	});

	test("fallback mechanisms: applies fallbacks when sections are missing", () => {
		const transcript = "Просто болит зуб";
		const draft = buildRuleBasedVisitDraftFromTranscript(transcript);

		assert.strictEqual(draft.complaint, "Просто болит зуб");
		assert.ok(draft.anamnesis?.includes("Анамнез уточнить"));
		assert.ok(draft.objectiveStatus?.includes("Просто болит зуб"));
		assert.strictEqual(draft.diagnosis, null);
		assert.ok(draft.treatmentPlan?.includes("План: маршрутизация"));

		assert.ok(draft.quality);
		assert.strictEqual(draft.quality.level, "needs_more_dictation");
	});

	test("tooth extraction: correctly identifies multiple tooth codes", () => {
		const transcript =
			"Кариес на 11 и 21 зубах. Также нужно посмотреть 46 и 47. 8-ки не беспокоят.";
		const draft = buildRuleBasedVisitDraftFromTranscript(transcript);

		assert.ok(draft.quality);
		const teeth = draft.quality.detectedToothCodes;
		assert.ok(teeth.includes("11"));
		assert.ok(teeth.includes("21"));
		assert.ok(teeth.includes("46"));
		assert.ok(teeth.includes("47"));
	});

	test("empty/garbage transcript: falls back gracefully", () => {
		const draft = buildRuleBasedVisitDraftFromTranscript("");

		assert.strictEqual(
			draft.complaint,
			"Жалобы не распознаны, уточнить у пациента.",
		);
		assert.ok(draft.anamnesis?.includes("Анамнез уточнить"));

		assert.ok(draft.quality);
		assert.strictEqual(draft.quality.level, "needs_more_dictation");
		assert.strictEqual(draft.quality.confidence, 0.25);
	});

	test("specialty differences: implantologist specialty alters fallbacks", () => {
		const transcript = "Просто короткая запись";

		const universalDraft = buildRuleBasedVisitDraftFromTranscript(
			transcript,
			"universal",
		);
		const implantologistDraft = buildRuleBasedVisitDraftFromTranscript(
			transcript,
			"implantologist",
		);

		assert.notStrictEqual(
			universalDraft.objectiveStatus,
			implantologistDraft.objectiveStatus,
		);
		assert.ok(
			implantologistDraft.objectiveStatus?.includes("уточнить зону адентии"),
		);
	});
});
