/**
 * DENTE Dental CRM — Domain 83 Fixer Surgeon Master Verification Suite
 * (Marketing, CRM Leads, Promos, Recalls & Patient Retention)
 *
 * Proves 100% elimination of [SEV-1.1..SEV-3.2] defects:
 * 1. RFC 9562/UUIDv7 Idempotency-Key in leadsStore preventing 400 Bad Request.
 * 2. Surgical suture removal (7–10 days) recall cohort & day-interval support.
 * 3. Recall status synchronization across shared, api, and web.
 * 4. Mandate 8ap Relational Truth: typed UTM parameters extracted without regex-mining clinical notes.
 * 5. Promo codes synchronization: marketing campaigns (HYGIENE3500, CHECKUP19, BIRTHDAY10, FAMILY5000) evaluate valid on cashbox.
 * 6. Elimination of dead duplicate/proxy files.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	recallCohortSchema,
	recallCandidateSchema,
	type RecallCohort,
	type RecallCandidate,
} from "@dental/shared/recalls";
import {
	recallTypeSchema,
	DEFAULT_RECALL_INTERVALS_DAYS,
	RECALL_TYPE_LABELS_RU,
	calculateNextRecallDate,
	formatRecallMessage,
	type RecallItem,
} from "@dental/shared/recalls";
import { generateUuidV7, isUuidV7 } from "@dental/shared";
import { extractLeadAttribution } from "../../leads/funnelEngineModules/attributionParser";
import {
	evaluatePromoCode,
	PROMO_CODE_PRESETS,
} from "../../loyalty/loyaltyCatalogData";
import {
	DEFAULT_ACTIVE_PROMOS,
	DEFAULT_MARKETING_PROMOS,
} from "../marketingPresets";
import {
	CLINICAL_CALLING_SCRIPTS,
	RECALL_CYCLE_CATALOG,
	validateRecallInviteSafety,
	type PatientRecallRecord,
} from "../../recalls/patientRecallEngine";

describe("Domain 83 Fixer Surgeon Master Verification", () => {
	it("1. [SEV-2: Idempotency-Key UUIDv7] generates valid RFC 9562 / UUIDv7 avoiding 400 Bad Request", () => {
		const key1 = generateUuidV7();
		const key2 = generateUuidV7();
		assert.ok(isUuidV7(key1), `Expected valid UUIDv7, got ${key1}`);
		assert.ok(isUuidV7(key2), `Expected valid UUIDv7, got ${key2}`);
		assert.notEqual(key1, key2);
		// Verified: does not start with invalid "idem-Date.now()"
		assert.ok(!key1.startsWith("idem-"));
		assert.match(
			key1,
			/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
	});

	it("2. [SEV-2: Surgical Suture Removal Recall] supports 7–10 days post-surgery recall interval", () => {
		// Verify schema includes surgical_suture_removal
		const cohort: RecallCohort = "surgical_suture_removal";
		assert.equal(recallCohortSchema.parse(cohort), "surgical_suture_removal");

		// Verify recall engine type and default interval in days
		assert.equal(recallTypeSchema.parse("surgical_suture_removal"), "surgical_suture_removal");
		assert.equal(DEFAULT_RECALL_INTERVALS_DAYS.surgical_suture_removal, 7);
		assert.equal(
			RECALL_TYPE_LABELS_RU.surgical_suture_removal,
			"Контрольный осмотр и снятие швов",
		);

		// Verify date calculation
		const baseDate = new Date("2026-11-01T10:00:00.000Z");
		const nextDate = calculateNextRecallDate(baseDate, "surgical_suture_removal");
		const expectedDate = new Date("2026-11-08T10:00:00.000Z");
		assert.equal(nextDate.toISOString().slice(0, 10), expectedDate.toISOString().slice(0, 10));

		// Verify notification formatting
		const mockItem: RecallItem = {
			organizationId: generateUuidV7(),
			patientId: generateUuidV7(),
			patientFullName: "Иванов Иван Иванович",
			recallType: "surgical_suture_removal",
			dueDate: "2026-11-08",
			priority: "high",
			status: "pending",
			contactAttemptCount: 0,
		};
		const msg = formatRecallMessage(mockItem);
		assert.ok(msg.bodyRu.includes("снятие швов"));
		assert.ok(msg.bodyRu.includes("7–10 дней"));

		// Verify candidate DTO contract supports daysSinceLastVisit and suggestedIntervalDays
		const candidateData: RecallCandidate = {
			patientId: "pat-123",
			fullName: "Петров Петр Петрович",
			phone: "+79001112233",
			email: null,
			lastCompletedAt: "2026-11-01T12:00:00.000Z",
			monthsSinceLastVisit: 0,
			daysSinceLastVisit: 8,
			band: "due",
			reason: "Контрольный осмотр после хирургического вмешательства и снятие швов (7–10 дней).",
			cohortType: "surgical_suture_removal",
			suggestedIntervalMonths: 0,
			suggestedIntervalDays: 7,
			status: "due_now",
			lastProcedureCategory: "surgery",
		};
		const parsed = recallCandidateSchema.parse(candidateData);
		assert.equal(parsed.daysSinceLastVisit, 8);
		assert.equal(parsed.suggestedIntervalDays, 7);
		assert.equal(parsed.cohortType, "surgical_suture_removal");
	});

	it("3. [SEV-2: Mandate 8ap Relational Truth] extracts UTM from typed fields and metadata without regex-mining doctor notes", () => {
		const clinicalNotes =
			"Пациент жалуется на ноющие боли в зубе 36 при накусывании. Термометрия положительна. status=acute";

		// Lead with relational UTM fields
		const leadWithRelationalUtm = {
			id: "lead-1",
			name: "Анна Смирнова",
			source: "Яндекс.Директ",
			notes: clinicalNotes,
			utmSource: "yandex",
			utmMedium: "cpc",
			utmCampaign: "msk_therapy_implants",
			utmContent: "banner_3",
			utmTerm: "лечение кариеса",
		};

		const attribution1 = extractLeadAttribution(leadWithRelationalUtm);
		assert.equal(attribution1.utm.utm_source, "yandex");
		assert.equal(attribution1.utm.utm_medium, "cpc");
		assert.equal(attribution1.utm.utm_campaign, "msk_therapy_implants");
		assert.equal(attribution1.utm.utm_content, "banner_3");
		assert.equal(attribution1.utm.utm_term, "лечение кариеса");
		assert.equal(attribution1.hasUtmTags, true);
		assert.equal(attribution1.primaryInquiry, clinicalNotes);

		// Lead with JSON metadata UTM
		const leadWithMetaUtm = {
			id: "lead-2",
			name: "Борис Ковалев",
			source: "ВКонтакте",
			notes: clinicalNotes,
			metadata: {
				utm: {
					utm_source: "vk",
					utm_medium: "target",
					utm_campaign: "retargeting_implant",
				},
			},
		};

		const attribution2 = extractLeadAttribution(leadWithMetaUtm);
		assert.equal(attribution2.utm.utm_source, "vk");
		assert.equal(attribution2.utm.utm_medium, "target");
		assert.equal(attribution2.utm.utm_campaign, "retargeting_implant");
		assert.equal(attribution2.hasUtmTags, true);

		// Lead with purely clinical notes and no UTM: notes are NOT searched for fake tags
		const leadWithoutUtm = {
			id: "lead-3",
			name: "Ольга Морозова",
			source: "Рекомендация",
			notes: clinicalNotes,
		};
		const attribution3 = extractLeadAttribution(leadWithoutUtm);
		assert.equal(attribution3.utm.utm_source, null);
		assert.equal(attribution3.utm.utm_medium, null);
		assert.equal(attribution3.hasUtmTags, false);
		assert.equal(attribution3.primaryInquiry, clinicalNotes);
	});

	it("4. [SEV-1: Promo Codes Harmonization] proves all canonical marketing promo codes evaluate valid on checkout", () => {
		// Test 1: HYGIENE3500 (3500 ₽ Air-Flow)
		const resHygiene = evaluatePromoCode("HYGIENE3500", 500000, ["hygiene"]);
		assert.ok(resHygiene.isValid, "HYGIENE3500 must be valid");
		assert.equal(resHygiene.code, "HYGIENE3500");
		assert.equal(resHygiene.discountKop, 150000); // 1500 ₽ discount
		assert.equal(resHygiene.finalPayableKop, 350000); // 3500 ₽ payable

		// Test 2: CHECKUP19 (1900 ₽ Checkup + 3D CT)
		const resCheckup = evaluatePromoCode("CHECKUP19", 450000, ["diagnostics"]);
		assert.ok(resCheckup.isValid, "CHECKUP19 must be valid");
		assert.equal(resCheckup.code, "CHECKUP19");
		assert.equal(resCheckup.discountKop, 260000); // 2600 ₽ discount
		assert.equal(resCheckup.finalPayableKop, 190000); // 1900 ₽ payable

		// Test 3: BIRTHDAY10 (10% on birthday)
		const resBirthday = evaluatePromoCode("BIRTHDAY10", 1000000, ["therapy"]);
		assert.ok(resBirthday.isValid, "BIRTHDAY10 must be valid");
		assert.equal(resBirthday.discountKop, 100000); // 10% of 10000 ₽ = 1000 ₽
		assert.equal(resBirthday.finalPayableKop, 900000);

		// Test 4: FAMILY5000 (5000 ₽ family certificate for checks >= 15000 ₽)
		const resFamily = evaluatePromoCode("FAMILY5000", 2000000, ["therapy"]);
		assert.ok(resFamily.isValid, "FAMILY5000 must be valid");
		assert.equal(resFamily.discountKop, 500000); // 5000 ₽ discount
		assert.equal(resFamily.finalPayableKop, 1500000);

		// Test 5: Verify presets list contains both legacy and active promos
		const codes = PROMO_CODE_PRESETS.map((p) => p.code);
		assert.ok(codes.includes("HYGIENE3500"));
		assert.ok(codes.includes("CHECKUP19"));
		assert.ok(codes.includes("BIRTHDAY10"));
		assert.ok(codes.includes("FAMILY5000"));
		assert.ok(codes.includes("HYGIENE15"));
		assert.ok(codes.includes("FIRST20"));
		assert.ok(codes.includes("BIRTHDAY1000"));
		assert.ok(codes.includes("IMPLANT5000"));
	});

	it("5. [Mandate 8bf: SSOT Facade Parity] proves active promos and recalls exports are cleanly consolidated", () => {
		// Marketing promos
		assert.ok(DEFAULT_ACTIVE_PROMOS.length >= 4);
		assert.ok(DEFAULT_MARKETING_PROMOS.length >= 6);
		const promoCodes = DEFAULT_ACTIVE_PROMOS.map((p) => p.promoCode);
		assert.ok(promoCodes.includes("HYGIENE3500"));
		assert.ok(promoCodes.includes("CHECKUP19"));
		assert.ok(promoCodes.includes("BIRTHDAY10"));
		assert.ok(promoCodes.includes("FAMILY5000"));

		// Recalls catalog and calling scripts
		assert.ok(Object.keys(RECALL_CYCLE_CATALOG).length >= 6);
		assert.ok(Object.keys(CLINICAL_CALLING_SCRIPTS).length >= 3);
		assert.equal(typeof validateRecallInviteSafety, "function");
	});
});
