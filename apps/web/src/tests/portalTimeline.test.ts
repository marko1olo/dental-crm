/**
 * Unit Test Suite for Patient Mobile Portal Odontogram & Treatment Progress Timeline
 * (DOMAIN: PORTAL TIMELINE)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEMO_PATIENT_PORTAL_TIMELINE,
	PLAIN_LANGUAGE_TOOTH_STATUSES,
	getToothAnatomyInfo,
} from "../components/portal/timeline/portalTimelinePresets";
import {
	aggregateToothStatuses,
	calculateFinancialLedger,
	calculatePortalProgress,
	filterTimelineEvents,
	generateTaxCertificateRequest,
} from "../components/portal/timeline/portalTimelineEngine";

describe("Patient Mobile Portal - Plain-Language Statuses & Anatomy Mapping", () => {
	it("contains friendly, reassuring patient descriptions for all clinical tooth states", () => {
		const statuses = PLAIN_LANGUAGE_TOOTH_STATUSES;
		assert.ok(statuses.healthy_observed);
		assert.ok(statuses.caries_cured);
		assert.ok(statuses.endo_microscope);
		assert.ok(statuses.crown_zirconia);
		assert.ok(statuses.veneer_emax);
		assert.ok(statuses.implant_integrated);
		assert.ok(statuses.implant_crown_loaded);
		assert.ok(statuses.scheduled_treatment);
		assert.ok(statuses.missing_to_restore);

		// Assert friendly titles
		assert.match(statuses.healthy_observed.titleRu, /Здоровый зуб/);
		assert.match(statuses.endo_microscope.titleRu, /под микроскопом/);
		assert.match(statuses.crown_zirconia.titleRu, /диоксида циркония/);
		assert.match(statuses.implant_crown_loaded.titleRu, /Коронка на импланте/);
	});

	it("maps FDI tooth numbers to quadrant and anatomy in plain Russian", () => {
		// Tooth 1.1 (Upper Right Central Incisor)
		const t11 = getToothAnatomyInfo("1.1");
		assert.equal(t11.toothFdi, "1.1");
		assert.equal(t11.quadrant, 1);
		assert.equal(t11.archRu, "Верхняя челюсть");
		assert.equal(t11.toothTypeRu, "Резец");
		assert.match(t11.friendlyNameRu, /Верхняя челюсть, Центральный резец/);

		// Tooth 3.6 (Lower Left First Molar)
		const t36 = getToothAnatomyInfo(36);
		assert.equal(t36.toothFdi, "3.6");
		assert.equal(t36.quadrant, 3);
		assert.equal(t36.archRu, "Нижняя челюсть");
		assert.equal(t36.toothTypeRu, "Моляр");
		assert.match(t36.friendlyNameRu, /Нижняя челюсть, Первый моляр/);

		// Tooth 2.3 (Upper Left Canine)
		const t23 = getToothAnatomyInfo("2.3");
		assert.equal(t23.toothTypeRu, "Клык");

		// Tooth 4.8 (Lower Right Wisdom Tooth)
		const t48 = getToothAnatomyInfo(48);
		assert.equal(t48.quadrant, 4);
		assert.match(t48.friendlyNameRu, /зуб мудрости/);
	});
});

describe("Treatment Progress & Financial Ledger Calculations", () => {
	it("calculates overall treatment completion progress accurately", () => {
		const demo = DEMO_PATIENT_PORTAL_TIMELINE;
		const progress = calculatePortalProgress(demo);

		assert.equal(progress.totalVisitsPlanned, 6);
		assert.equal(progress.completedVisitsCount, 4);
		assert.equal(progress.remainingVisitsCount, 2);
		assert.equal(progress.overallProgressPercent, 70);
		assert.equal(progress.isPlanFinished, false);

		// Test completed plan
		const completedData = { ...demo, completedVisitsCount: 6 };
		const doneProgress = calculatePortalProgress(completedData);
		assert.equal(doneProgress.remainingVisitsCount, 0);
		assert.equal(doneProgress.isPlanFinished, true);
	});

	it("calculates financial ledger with total cost, paid percentage, and client savings", () => {
		const demo = DEMO_PATIENT_PORTAL_TIMELINE;
		const fin = calculateFinancialLedger(demo);

		assert.equal(fin.totalPlanCostRub, 340000);
		assert.equal(fin.totalPaidRub, 235000);
		assert.equal(fin.remainingDueRub, 340000 - 235000); // 105,000 руб
		assert.equal(fin.dmsSavedRub, 28000);
		assert.equal(fin.loyaltyBonusBalance, 12500);
		assert.equal(fin.totalClientBenefitsRub, 28000 + 12500);
		assert.equal(fin.isFullySettled, false);
	});

	it("prepares 1-Click Tax Deduction Certificate request for FNS", () => {
		// Surgical treatment of 235,000 руб (Code 02 -> 13% uncapped = 30,550 руб)
		const tax02 = generateTaxCertificateRequest("Иванов И. И.", 235000, true);
		assert.equal(tax02.code, "02");
		assert.equal(tax02.refundEstimatedRub, 30550);
		assert.match(tax02.applicationTextRu, /Иванов И\. И\./);
		assert.match(tax02.applicationTextRu, /30[\s\u00A0]550/);

		// Standard therapy of 200,000 руб (Code 01 -> capped at 150,000 = 19,500 руб)
		const tax01 = generateTaxCertificateRequest("Петров П. П.", 200000, false);
		assert.equal(tax01.code, "01");
		assert.equal(tax01.refundEstimatedRub, 19500);
	});
});

describe("Tooth Status Aggregation & Timeline Filtering", () => {
	it("aggregates tooth formula statuses and counts healthy vs restored vs implants", () => {
		const statuses = DEMO_PATIENT_PORTAL_TIMELINE.toothStatuses;
		const agg = aggregateToothStatuses(statuses);

		assert.ok(agg.totalTeethTracked > 0);
		assert.ok(agg.restoredCount > 0);
		assert.ok(agg.implantsCount > 0);
		assert.ok(agg.scheduledCount > 0);
		assert.ok(agg.statusGroups.length > 0);
	});

	it("filters chronological visits feed by completion and media attachments", () => {
		const visits = DEMO_PATIENT_PORTAL_TIMELINE.visitsHistory;

		const allVisits = filterTimelineEvents(visits, "all");
		assert.equal(allVisits.length, visits.length);

		const completedVisits = filterTimelineEvents(visits, "completed");
		assert.equal(completedVisits.length, visits.length); // All 4 in demo history are completed

		const withMediaVisits = filterTimelineEvents(visits, "with_media");
		assert.ok(withMediaVisits.length > 0);
		assert.ok(withMediaVisits.every((v) => v.mediaAttachments.length > 0));
	});
});
