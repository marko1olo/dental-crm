import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";
import * as portalBarrel from "../index.js";
import { calculateCabinetSummary, computePatientTeethFromStages } from "../patientCabinet/patientCabinetEngine.js";
import { DEMO_PATIENT_CABINET } from "../patientCabinet/patientCabinetPresets.js";
import { PatientCabinetModal } from "../patientCabinet/PatientCabinetModal.js";
import { MobileSelfCheckinModal } from "../selfCheckin/index.js";

test("Portal Domain SSOT Consolidation & Runtime Integrity (Mandates 8s, 8d pt 7, 8e)", async (t) => {
	const emojiRegex = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;

	await t.test("1. Canonical portal barrel exports functional runtime symbols and domain engines", () => {
		const dual = portalBarrel.formatDualServiceName("A16.07.002.001", "Кариес");
		assert.equal(dual.humanTitleRu, "Лечение кариеса и светоотверждаемая пломба");
		assert.ok(dual.explanationRu.length > 10);
		assert.ok(Array.isArray(portalBarrel.CLINIC_GUARANTEE_ITEMS) && portalBarrel.CLINIC_GUARANTEE_ITEMS.length > 0);
		assert.ok(Array.isArray(portalBarrel.PATIENT_COMFORT_STANDARDS) && portalBarrel.PATIENT_COMFORT_STANDARDS.length > 0);
		assert.ok(portalBarrel.SAMPLE_PORTAL_PROFILE.patientId.startsWith("PAT-"));
		assert.ok(Array.isArray(portalBarrel.SAMPLE_VISIT_PROTOCOLS) && portalBarrel.SAMPLE_VISIT_PROTOCOLS.length > 0);
		assert.ok(portalBarrel.SAMPLE_PORTAL_TREATMENT_PLAN.stages.length > 0);
		assert.equal(portalBarrel.PatientPortalModal, PatientCabinetModal);
	});

	await t.test("2. PatientCabinetModal & MobileSelfCheckinModal render cleanly from canonical SSOT without errors", () => {
		const cabinetHtml = renderToStaticMarkup(
			createElement(PatientCabinetModal, {
				isOpen: true,
				onClose: () => {},
				initialData: DEMO_PATIENT_CABINET,
			}),
		);
		assert.ok(cabinetHtml.includes("patient-cabinet-backdrop"));
		assert.ok(cabinetHtml.includes(DEMO_PATIENT_CABINET.fullName));
		assert.equal(emojiRegex.test(cabinetHtml), false, "Rendered PatientCabinetModal contains 0 cartoon emojis");

		const checkinHtml = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				patientName: DEMO_PATIENT_CABINET.fullName,
				initialStep: "phone_auth",
			}),
		);
		assert.ok(checkinHtml.includes("selfcheckin-modal-window"));
		assert.equal(emojiRegex.test(checkinHtml), false, "Rendered MobileSelfCheckinModal contains 0 cartoon emojis");
	});

	await t.test("3. Portal engine calculations preserve clinical integrity and FDI tooth formula", () => {
		const summary = calculateCabinetSummary(DEMO_PATIENT_CABINET);
		assert.ok(summary.totalPaidAmountRub >= 0);
		const plan = DEMO_PATIENT_CABINET.treatmentPlans[0];
		assert.ok(plan);
		const teeth = computePatientTeethFromStages(plan.stages, DEMO_PATIENT_CABINET.warranties);
		assert.equal(teeth.length, 32);
	});

	await t.test("4. Zero cartoon emojis in runtime portal preset texts and dual-naming outputs", () => {
		const textsToVerify = [
			portalBarrel.SAMPLE_PORTAL_PROFILE.fullName,
			portalBarrel.SAMPLE_PORTAL_PROFILE.cardNumber,
			JSON.stringify(portalBarrel.SAMPLE_VISIT_PROTOCOLS),
			JSON.stringify(portalBarrel.SAMPLE_PORTAL_TREATMENT_PLAN),
			JSON.stringify(portalBarrel.CLINIC_GUARANTEE_ITEMS),
		];

		for (const text of textsToVerify) {
			assert.equal(emojiRegex.test(text), false, `Found cartoon emoji in portal runtime text: ${text.slice(0, 120)}`);
		}
	});
});
