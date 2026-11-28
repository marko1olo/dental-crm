/**
 * Red Team Inquisitor Test Suite: Public Portal Routing, Guest Lab & Treatment Stage Cards
 * (MANDATES: 8c, 8d pt 7, 8e, 8k, 8n, 8s, 152-FZ, 63-FZ)
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";
import {
	buildBudgetPortalUrl,
	buildPublicBookingPortalUrl,
	isPublicPortalRoute,
	publicPortalRouteFromHash,
	BUDGET_PORTAL_PATH,
	LAB_ORDER_PORTAL_PATH,
	PUBLIC_BOOKING_PORTAL_PATH,
} from "../../../lib/publicPortalRoute.js";
import { GuestLabPortalTechnicalDetails } from "../../lab/guestPortal/GuestLabPortalTechnicalDetails.js";
import { GuestLabPortalClinicalNotes } from "../../lab/guestPortal/GuestLabPortalClinicalNotes.js";
import type { LabOrderData } from "../../lab/guestPortal/guestPortalTypes.js";
import { PublicBudgetSignaturePad } from "../../../pages/public/PublicBudgetSignaturePad.js";
import { TreatmentPlanStageCard } from "../patientCabinet/tabs/treatmentPlan/TreatmentPlanStageCard.js";
import { DEMO_PATIENT_CABINET } from "../patientCabinet/patientCabinetPresets.js";
import {
	formatDualServiceName,
	type DualServiceFormatResult,
} from "../patientDualNamingEngine.js";
import {
	SAMPLE_PORTAL_PROFILE,
	SAMPLE_PORTAL_TREATMENT_PLAN,
	SAMPLE_VISIT_PROTOCOLS,
} from "../patientPortalPresets.js";

describe("Red Team Inquisition: Public Portal Routing & SSR Isolation", () => {
	it("parses lab-order, budget, and booking public routes with strict isolation", () => {
		const labToken = "550e8400-e29b-41d4-a716-446655440000";
		const budgetToken = "bgt-tok-2026-audit";
		const clinicId = "org-spb-central";

		assert.deepEqual(publicPortalRouteFromHash(`#${LAB_ORDER_PORTAL_PATH}${labToken}`), {
			kind: "lab-order",
			token: labToken,
		});

		assert.deepEqual(publicPortalRouteFromHash(`#${BUDGET_PORTAL_PATH}${budgetToken}`), {
			kind: "budget",
			token: budgetToken,
		});

		assert.deepEqual(publicPortalRouteFromHash(`#${PUBLIC_BOOKING_PORTAL_PATH}${clinicId}`), {
			kind: "booking",
			organizationId: clinicId,
		});
	});

	it("neutralizes malicious null-bytes (%00) and query parameters from tokens", () => {
		const rawWithNull = "#/portal/lab-order/valid-token%00-attack?source=tg";
		const parsed = publicPortalRouteFromHash(rawWithNull);
		assert.ok(parsed);
		assert.equal(parsed.kind, "lab-order");
		if (parsed.kind === "lab-order") {
			assert.ok(!parsed.token.includes("\0"));
			assert.equal(parsed.token, "valid-token-attack");
		}
	});

	it("strictly keeps internal staff workplace routes away from guest portals", () => {
		const internalStaffRoutes = [
			"",
			"#",
			"#shift",
			"#patients",
			"#patients/card/123",
			"#schedule/chair",
			"#finance/cash",
			"#warehouse/stock",
			"#/portal/lab-order/",
			"#/portal/lab-order",
		];

		for (const route of internalStaffRoutes) {
			assert.equal(publicPortalRouteFromHash(route), null, `Route ${route} must not route to guest portal`);
			assert.equal(isPublicPortalRoute(route), false, `isPublicPortalRoute must be false for ${route}`);
		}
	});

	it("is SSR-safe without window.location", () => {
		const bookingUrl = buildPublicBookingPortalUrl("test-org-123", "https://dente.clinic");
		assert.equal(bookingUrl, "https://dente.clinic/#/portal/booking/test-org-123");

		const budgetUrl = buildBudgetPortalUrl("test-budget-456", "https://dente.clinic");
		assert.equal(budgetUrl, "https://dente.clinic/#/portal/budget/test-budget-456");

		assert.equal(buildPublicBookingPortalUrl("   ", "https://dente.clinic"), null);
		assert.equal(buildBudgetPortalUrl("   ", "https://dente.clinic"), null);
	});
});

describe("Red Team Inquisition: Guest Lab Portal Rendered DOM & Data Integrity", () => {
	it("GuestLabPortal sections render exact FDI tooth notation, clinical notes, and deadline", () => {
		const sampleOrder: LabOrderData = {
			id: "lab-ord-1",
			orderNumber: "ЗН-2026/14",
			patientName: "Смирнова А. В.",
			doctorName: "Д-р Воронов И. С.",
			toothFdi: "36",
			material: "zirconia",
			vitaShade: "A2",
			dueDate: "2026-09-10T10:00:00Z",
			status: "in_production",
			clinicalNotes: "Проверить прилегание уступа и окклюзионный контакт.",
			clinicName: "Клиника ДЕНТЕ",
		};

		const techHtml = renderToStaticMarkup(createElement(GuestLabPortalTechnicalDetails, { order: sampleOrder }));
		const notesHtml = renderToStaticMarkup(createElement(GuestLabPortalClinicalNotes, { notes: sampleOrder.clinicalNotes }));

		assert.ok(techHtml.includes("guest-portal-tooth-fdi"), "Must render FDI tooth testid");
		assert.ok(techHtml.includes("Зуб (FDI)"), "Must render FDI tooth label");
		assert.ok(techHtml.includes("36"), "Must render FDI tooth 36");
		assert.ok(techHtml.includes("Технические параметры и задание"), "Must render technical task title");
		assert.ok(techHtml.includes("guest-portal-due-date"), "Must render deadline testid");
		assert.ok(techHtml.includes("Срок сдачи (дедлайн)"), "Must render Russian deadline label");

		assert.ok(notesHtml.includes("Клинические заметки и указания врача"), "Must render doctor notes title");
		assert.ok(notesHtml.includes("Проверить прилегание уступа"), "Must render clinical notes text");
	});
});

describe("Red Team Inquisition: Doctor Autonomy (Mandate 8e) & Patient Digital Signing (152-FZ / 63-FZ)", () => {
	it("PublicBudgetSignaturePad renders interactive canvas, PEP agreement text, and unlocked CTA", () => {
		const padHtml = renderToStaticMarkup(
			createElement(PublicBudgetSignaturePad, {
				defaultSignerName: "Воронов Алексей Владимирович",
				isSubmitting: false,
				onSubmit: () => {},
			}),
		);

		assert.ok(padHtml.includes("<canvas"), "Must provide interactive signature canvas");
		assert.ok(
			padHtml.includes("Электронная подпись (ПЭП)"),
			"Must contain statutory PEP reference",
		);
		assert.ok(
			padHtml.includes("С планом лечения, условиями гарантии и стоимостью услуг согласен"),
			"Must contain patient agreement text",
		);
		assert.equal(
			padHtml.includes("<button disabled") || padHtml.includes('disabled=""'),
			false,
			"Primary CTA must never be disabled even during submission state",
		);

		const padBusyHtml = renderToStaticMarkup(
			createElement(PublicBudgetSignaturePad, {
				defaultSignerName: "Воронов Алексей Владимирович",
				isSubmitting: true,
				onSubmit: () => {},
			}),
		);
		assert.equal(
			padBusyHtml.includes("<button disabled") || padBusyHtml.includes('disabled=""'),
			false,
			"Submitting state uses aria-busy instead of disabled attribute",
		);
		assert.ok(padBusyHtml.includes('aria-busy="true"'));
	});
});

describe("Red Team Inquisition: Treatment Stage Cards, Clean Labels & Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
	it("TreatmentPlanStageCard eliminates inline dark fallbacks and uses semantic theme classes", () => {
		const stage = DEMO_PATIENT_CABINET.treatmentPlans[0]?.stages[0];
		assert.ok(stage);
		const html = renderToStaticMarkup(
			createElement(TreatmentPlanStageCard, {
				stage,
				idx: 0,
				isExpanded: true,
				onToggle: () => {},
				onPayStageWithSbp: () => {},
				onBookAppointment: () => {},
			}),
		);

		assert.ok(html.includes("pc-stage-card"), "Must render pc-stage-card CSS class");
		assert.equal(html.includes("#1e293b"), false, "No inline slate-800 fallback");
		assert.equal(html.includes("#0f172a"), false, "No inline slate-900 fallback");
		assert.equal(html.includes("#334155"), false, "No inline slate-700 fallback");
	});

	it("maps clinical codes with zero cartoon emojis and transparent warranty guarantees", () => {
		const testCases = [
			{ code: "A16.07.002.001", raw: "Кариес дентина", expectedTitle: "Лечение кариеса и светоотверждаемая пломба" },
			{ code: "A16.07.004.001", raw: "Пульпит", expectedTitle: "Лечение корневых каналов под микроскопом" },
			{ code: "A16.07.006.001", raw: "Коронка цирконий", expectedTitle: "Установка эстетической коронки (диоксид циркония / E.max)" },
			{ code: "A16.07.054.001", raw: "Имплантат", expectedTitle: "Установка дентального имплантата под ключ" },
		];

		const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

		for (const tc of testCases) {
			const res: DualServiceFormatResult = formatDualServiceName(tc.code, tc.raw);
			assert.equal(res.humanTitleRu, tc.expectedTitle);
			assert.ok(res.explanationRu.length > 10, "Explanation must be thorough");
			assert.ok(res.sensationRu.length > 5, "Sensation guide must reassure patient");
			assert.ok(res.defaultWarrantyRu.length > 3, "Must state statutory warranty");

			assert.equal(res.humanTitleRu.match(emojiRegex), null, "Title must have 0 emojis");
			assert.equal(res.explanationRu.match(emojiRegex), null, "Explanation must have 0 emojis");
			assert.equal(res.sensationRu.match(emojiRegex), null, "Sensation must have 0 emojis");
		}
	});

	it("verifies preset clinical scenarios use clean UI card notation (no 043/u) and 0 raw emojis", () => {
		const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

		assert.ok(SAMPLE_PORTAL_PROFILE.patientId.startsWith("PAT-"));
		assert.equal(SAMPLE_PORTAL_PROFILE.cardNumber.includes("043/у"), false, "Card number uses clean UI notation");
		assert.ok(SAMPLE_VISIT_PROTOCOLS.length >= 3);
		assert.ok(SAMPLE_PORTAL_TREATMENT_PLAN.stages.length >= 3);

		for (const stage of SAMPLE_PORTAL_TREATMENT_PLAN.stages) {
			assert.ok(stage.teethFdi.length > 0, `Stage ${stage.id} must define tooth FDI`);
			assert.equal(stage.titleRu.match(emojiRegex), null, `Stage ${stage.id} title has emojis`);
			assert.equal(stage.descriptionRu ? stage.descriptionRu.match(emojiRegex) : null, null, `Stage ${stage.id} description has emojis`);
		}
	});
});
