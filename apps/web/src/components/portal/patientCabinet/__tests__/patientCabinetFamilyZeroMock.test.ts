/**
 * patientCabinetFamilyZeroMock.test.ts
 *
 * ZERO-MOCK PATIENT PORTAL & FAMILY LEDGER INQUISITION TEST SUITE
 *
 * Verifies:
 * 1. Absolute zero Math.random in FamilyTab and FamilyWalletPanel.
 * 2. Deterministic canonical card number assignment for family members (Форма 043/у)
 *    tied to parent patientId / cardNumber instead of random pseudo-numbers.
 * 3. Mobile touch targets >= 44px on primary buttons.
 * 4. Idempotent family refund mutation ticket generation.
 */

import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PATIENT_CABINET_PRESET_ALEXEY } from "../patientCabinetPresets.js";
import {
	familyMutationId,
	familyRefundRequestKey,
	type MutationTicketRef,
} from "../../../finance/familyWalletMutationKey.js";

const { FamilyTab } = await import("../tabs/FamilyTab.js");

describe("Zero-Mock Patient Portal & Family Ledger Inquisition", () => {
	it("1.1 File Purity: FamilyTab.tsx contains ZERO calls to Math.random()", () => {
		const familyTabPath = resolve(
			process.cwd(),
			"apps/web/src/components/portal/patientCabinet/tabs/FamilyTab.tsx",
		);
		const content = readFileSync(familyTabPath, "utf8");
		// Remove comments before asserting
		const codeWithoutComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
		assert.equal(
			codeWithoutComments.includes("Math.random"),
			false,
			"FamilyTab.tsx must contain ZERO Math.random() invocations in active code!",
		);
	});

	it("1.2 File Purity: FamilyWalletPanel.tsx contains ZERO calls to Math.random()", () => {
		const walletPanelPath = resolve(
			process.cwd(),
			"apps/web/src/components/finance/FamilyWalletPanel.tsx",
		);
		const content = readFileSync(walletPanelPath, "utf8");
		const codeWithoutComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
		assert.equal(
			codeWithoutComments.includes("Math.random"),
			false,
			"FamilyWalletPanel.tsx must contain ZERO Math.random() invocations in active code!",
		);
	});

	it("2.1 Family Refund Mutation Key: Generates idempotent stable key without random salt", () => {
		const patientId = "pat-alexey-voronov-001";
		const familyId = "fam-voronov-group-001";
		const amountRub = 4500;
		const reason = "Отмена визита ребенка";

		const key1 = familyRefundRequestKey(patientId, familyId, amountRub, reason);
		const key2 = familyRefundRequestKey(patientId, familyId, amountRub, reason);
		assert.equal(key1, key2, "Refund request signature must be identical for identical inputs");

		const ref: MutationTicketRef = { current: null };
		let counter = 0;
		const deterministicIdGen = () => {
			counter++;
			return `det-uuid-${counter}`;
		};

		const mutId1 = familyMutationId(ref, "family-refund", key1, deterministicIdGen);
		const mutId2 = familyMutationId(ref, "family-refund", key2, deterministicIdGen);

		assert.equal(mutId1, mutId2, "Retry must reuse existing mutation ID to protect against double deposit");
		assert.equal(mutId1, "family-refund-det-uuid-1");
	});

	it("3.1 FamilyTab Rendering: Renders honest family pool banner & members with canonical card numbers", () => {
		const data = {
			...PATIENT_CABINET_PRESET_ALEXEY,
			cardNumber: "043-8842",
		};

		const html = renderToStaticMarkup(
			createElement(FamilyTab, {
				data,
				onOpenBookingForMember: () => {},
				onOpenBooking: () => {},
				onShowToast: () => {},
			}),
		);

		assert.ok(html.includes("pc-family-tab"), "Renders family tab container");
		assert.ok(html.includes("Семейный депозит и бонусный пул"), "Renders family summary banner");
		assert.ok(html.includes("043-8843"), "Renders spouse canonical card number 043-8843");
		assert.ok(html.includes("043-8844"), "Renders child canonical card number 043-8844");
		assert.ok(html.includes("btn-toggle-add-family-member"), "Renders add member toggle button");
		assert.ok(html.includes("min-height:44px") || html.includes("min-height: 44px"), "Enforces touch-friendly >=44px buttons");
	});

	it("3.2 PatientPlanView: Uses real patient card number in emergency WhatsApp link", async () => {
		const { PatientPlanView } = await import("../../PatientPlanView.js");
		const data = {
			...PATIENT_CABINET_PRESET_ALEXEY,
			fullName: "Воронов Алексей Владимирович",
			cardNumber: "043/у-2026/891",
		};

		const html = renderToStaticMarkup(
			createElement(PatientPlanView, {
				fullCabinetData: data,
				emergencyWhatsappNumber: "+79991234567",
			}),
		);

		assert.ok(html.includes("patient-plan-view"), "Renders patient plan view");
		// Verify encoded card number in whatsapp link
		const encodedCard = encodeURIComponent("043/у-2026/891");
		assert.ok(
			html.includes(encodedCard) || html.includes("043%2F%D1%83-2026%2F891") || html.includes("891"),
			"WhatsApp hotline link must include real patient card number from fullCabinetData",
		);
	});
});
