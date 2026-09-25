/**
 * Red Team Inquisitor Test Suite: Public Portal Routing, Guest Lab & Treatment Stage Cards
 * (MANDATES: 8c, 8d pt 7, 8e, 8k, 8n, 8s, 152-FZ, 63-FZ)
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { describe, it } from "node:test";
import {
	buildBudgetPortalUrl,
	buildPublicBookingPortalUrl,
	isPublicPortalRoute,
	publicPortalRouteFromHash,
	BUDGET_PORTAL_PATH,
	LAB_ORDER_PORTAL_PATH,
	PUBLIC_BOOKING_PORTAL_PATH,
} from "../../../lib/publicPortalRoute.js";
import {
	formatDualServiceName,
	type DualServiceFormatResult,
} from "../PatientPortalTreatmentStageCard.js";
import {
	SAMPLE_PORTAL_PROFILE,
	SAMPLE_PORTAL_TREATMENT_PLAN,
	SAMPLE_VISIT_PROTOCOLS,
} from "../patientPortalPresets.js";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

describe("Red Team Inquisition: Public Portal Routing & SSR Isolation", () => {
	it("parses lab-order, budget, and booking public routes with strict isolation", () => {
		const labToken = "550e8400-e29b-41d4-a716-446655440000";
		const budgetToken = "bgt-tok-2026-audit";
		const clinicId = "org-spb-central";

		// Lab Order
		assert.deepEqual(publicPortalRouteFromHash(`#${LAB_ORDER_PORTAL_PATH}${labToken}`), {
			kind: "lab-order",
			token: labToken,
		});

		// Budget
		assert.deepEqual(publicPortalRouteFromHash(`#${BUDGET_PORTAL_PATH}${budgetToken}`), {
			kind: "budget",
			token: budgetToken,
		});

		// Booking
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
		// Calling URL builders with custom origin or fallback in Node.js
		const bookingUrl = buildPublicBookingPortalUrl("test-org-123", "https://dente.clinic");
		assert.equal(bookingUrl, "https://dente.clinic/#/portal/booking/test-org-123");

		const budgetUrl = buildBudgetPortalUrl("test-budget-456", "https://dente.clinic");
		assert.equal(budgetUrl, "https://dente.clinic/#/portal/budget/test-budget-456");

		// Empty token or org returns null safely
		assert.equal(buildPublicBookingPortalUrl("   ", "https://dente.clinic"), null);
		assert.equal(buildBudgetPortalUrl("   ", "https://dente.clinic"), null);
	});
});

describe("Red Team Inquisition: Guest Lab Portal Ergonomics & Data Integrity", () => {
	it("GuestLabPortal.tsx contains exact FDI tooth notation, clinical tasks, and deadline", () => {
		const source = readSource("GuestLabPortal.tsx");

		// Tooth FDI badge
		assert.ok(source.includes("guest-portal-tooth-fdi"), "Must have data-testid for FDI tooth number");
		assert.ok(source.includes("Зуб (FDI)"), "Must display FDI tooth label");

		// Technical parameters and clinical task
		assert.ok(source.includes("Технические параметры и задание"), "Must display technical task title");
		assert.ok(source.includes("Клинические заметки и указания врача"), "Must display doctor notes title");

		// Deadline / dueDate
		assert.ok(source.includes("guest-portal-due-date"), "Must display deadline with data-testid");
		assert.ok(source.includes("Срок сдачи (дедлайн)"), "Must display Russian deadline label");
		assert.ok(source.includes("dueDate"), "Must include dueDate in LabOrderData");

		// Zero blocking popups
		assert.ok(!source.includes("window.prompt"), "Blocking window.prompt is forbidden");
		assert.ok(!source.includes("window.confirm"), "Blocking window.confirm is forbidden");
		assert.ok(!source.includes("window.alert"), "Blocking window.alert is forbidden");
	});

	it("GuestLabPortal.css has 0 hardcoded hex colors and complies with design tokens", () => {
		const css = readSource("GuestLabPortal.css");
		const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g);
		assert.equal(hexMatches, null, `Found hardcoded hex in GuestLabPortal.css: ${hexMatches?.join(", ")}`);

		assert.ok(css.includes("var(--paper)"), "Must use --paper token");
		assert.ok(css.includes("var(--ink)"), "Must use --ink token");
		assert.ok(css.includes("var(--line)"), "Must use --line token");
		assert.ok(css.includes("var(--teal)"), "Must use --teal token");
	});
});

describe("Red Team Inquisition: Doctor Autonomy (Mandate 8e) & Patient Digital Signing (152-FZ / 63-FZ)", () => {
	it("PatientBudgetSignView.tsx enforces 152-FZ & 63-FZ legal consent, mobile canvas signature and 0 disabled buttons", () => {
		const source = readSource("components/portal/PatientBudgetSignView.tsx");

		// 152-FZ and 63-FZ consent
		assert.ok(source.includes("152-ФЗ"), "Must contain statutory 152-FZ consent reference");
		assert.ok(source.includes("63-ФЗ"), "Must contain statutory 63-FZ PEP reference");
		assert.ok(source.includes("patient-budget-152fz-checkbox"), "Must have 152-FZ consent checkbox");

		// Frictionless interactive mobile canvas signature
		assert.ok(!source.includes('style={{ display: "none" }}'), "Canvas must not be hidden with display: none");
		assert.ok(source.includes("patient-budget-signature-canvas"), "Must provide interactive touch signature canvas");
		assert.ok(source.includes("onPointerDown"), "Must support pointer events for touch & stylus");
		assert.ok(source.includes("patient-budget-clear-canvas-btn"), "Must provide clear canvas button");
		assert.ok(source.includes("patient-budget-generate-pep-stamp-btn"), "Must provide 1-click PEP stamp generation");

		// 0 disabled buttons
		assert.ok(
			!source.includes("disabled={isVerifying || !verifyFactor.trim()}"),
			"2FA button must not be disabled; must show accessible validation instead",
		);
		assert.ok(
			!source.includes("disabled={isSubmittingSign || !hasStrokes}"),
			"Submit button must not be blocked by lack of strokes (auto-PEP 1-click fallback)",
		);

		// SHA-256 integrity display
		assert.ok(source.includes("SHA-256"), "Must show SHA-256 document integrity upon completion");
	});

	it("patientBudgetSign.css has 0 hardcoded hex colors and complies with design tokens", () => {
		const css = readSource("components/portal/patientBudgetSign.css");
		const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g);
		assert.equal(hexMatches, null, `Found hardcoded hex in patientBudgetSign.css: ${hexMatches?.join(", ")}`);

		assert.ok(css.includes("var(--paper)"), "Must use --paper token");
		assert.ok(css.includes("var(--ink)"), "Must use --ink token");
		assert.ok(css.includes("var(--teal)"), "Must use --teal token");
		assert.ok(css.includes("var(--line)"), "Must use --line token");
	});
});

describe("Red Team Inquisition: Treatment Stage Cards & Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
	it("PatientPortalTreatmentStageCard.tsx eliminates dark fallbacks and uses semantic theme variables", () => {
		const source = readSource("components/portal/PatientPortalTreatmentStageCard.tsx");

		// Mixed-theme dark fallback checks
		assert.ok(
			!source.includes("#1e293b"),
			"Forbidden hardcoded slate-800 (#1e293b) fallback creating dark card in light theme",
		);
		assert.ok(
			!source.includes("#0f172a"),
			"Forbidden hardcoded slate-900 (#0f172a) fallback",
		);
		assert.ok(
			!source.includes("#334155"),
			"Forbidden hardcoded slate-700 (#334155) fallback",
		);

		// Token verification
		assert.ok(source.includes("var(--pc-surface, var(--paper-strong))"), "Must use --paper-strong fallback");
		assert.ok(source.includes("var(--pc-bg, var(--paper))"), "Must use --paper fallback");
		assert.ok(source.includes("var(--pc-border, var(--line))"), "Must use --line fallback");
	});

	it("maps Order 804n codes with zero cartoon emojis and transparent warranty guarantees", () => {
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

			// Check 0 raw emojis in returned text
			assert.equal(res.humanTitleRu.match(emojiRegex), null, "Title must have 0 emojis");
			assert.equal(res.explanationRu.match(emojiRegex), null, "Explanation must have 0 emojis");
			assert.equal(res.sensationRu.match(emojiRegex), null, "Sensation must have 0 emojis");
		}
	});

	it("verifies preset clinical scenarios provide FDI tooth numbers and 0 raw emojis", () => {
		const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

		// Presets check
		assert.ok(SAMPLE_PORTAL_PROFILE.patientId.startsWith("PAT-"));
		assert.ok(SAMPLE_VISIT_PROTOCOLS.length >= 3);
		assert.ok(SAMPLE_PORTAL_TREATMENT_PLAN.stages.length >= 3);

		for (const stage of SAMPLE_PORTAL_TREATMENT_PLAN.stages) {
			assert.ok(stage.teethFdi.length > 0, `Stage ${stage.id} must define tooth FDI`);
			assert.equal(stage.titleRu.match(emojiRegex), null, `Stage ${stage.id} title has emojis`);
			assert.equal(stage.descriptionRu ? stage.descriptionRu.match(emojiRegex) : null, null, `Stage ${stage.id} description has emojis`);
		}
	});
});
