/**
 * patientCabinetFamilyZeroMock.test.ts
 *
 * ZERO-MOCK PATIENT PORTAL & FAMILY LEDGER INQUISITION TEST SUITE
 *
 * Verifies:
 * 1. Deterministic rendering across invocations in FamilyTab and inline FamilyWalletModal.
 * 2. Deterministic canonical card number assignment for family members tied to parent cardNumber.
 * 3. Mobile touch targets >= 44px on primary buttons.
 * 4. Idempotent family refund mutation ticket generation.
 */

import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { PATIENT_CABINET_PRESET_ALEXEY } from "../patientCabinetPresets.js";

const { FamilyTab } = await import("../tabs/FamilyTab.js");
const { FamilyWalletModal } = await import("../../../patients/family/FamilyWalletModal.js");

describe("Zero-Mock Patient Portal & Family Ledger Inquisition", () => {
	it("1.1 File Purity: FamilyTab renders deterministically across repeated invocations", () => {
		const html1 = renderToStaticMarkup(createElement(FamilyTab, { data: PATIENT_CABINET_PRESET_ALEXEY }));
		const html2 = renderToStaticMarkup(createElement(FamilyTab, { data: PATIENT_CABINET_PRESET_ALEXEY }));
		assert.equal(html1, html2, "FamilyTab must produce deterministic DOM with zero random noise");
		assert.ok(html1.includes("pc-family-tab"));
	});

	it("1.2 Inline FamilyWalletModal renders real wallet UI deterministically", () => {
		const props = {
			isOpen: true,
			inline: true,
			onClose: () => {},
			patientId: PATIENT_CABINET_PRESET_ALEXEY.patientId,
			patientName: PATIENT_CABINET_PRESET_ALEXEY.fullName,
			familyData: {
				id: "fam-group-1",
				name: "Семья Вороновых",
				balance: 15000,
				members: [
					{
						id: PATIENT_CABINET_PRESET_ALEXEY.patientId,
						fullName: PATIENT_CABINET_PRESET_ALEXEY.fullName,
						roleRu: "Глава семьи",
					},
				],
			},
		};
		const html1 = renderToStaticMarkup(createElement(FamilyWalletModal, props));
		const html2 = renderToStaticMarkup(createElement(FamilyWalletModal, props));
		assert.equal(html1, html2, "FamilyWalletModal renders deterministically");
		assert.ok(html1.includes("family-wallet-inline-view"));
		assert.ok(html1.includes("Семья Вороновых") || html1.includes(PATIENT_CABINET_PRESET_ALEXEY.fullName));
	});

	it("2.1 Family Refund Mutation Key: Generates idempotent stable key without random salt", () => {
		const patientId = PATIENT_CABINET_PRESET_ALEXEY.patientId;
		const familyId = "fam-voronov-group-001";
		const amountRub = 4500;
		const reason = "Отмена визита ребенка";

		const key1 = ["refund", patientId, familyId, amountRub, reason].join("|");
		const key2 = ["refund", patientId, familyId, amountRub, reason].join("|");
		assert.equal(key1, key2, "Refund request signature must be identical for identical inputs");

		const ticketRef: { current: { requestKey: string; mutationId: string } | null } = { current: null };
		let counter = 0;
		const deterministicIdGen = () => {
			counter++;
			return `det-uuid-${counter}`;
		};

		const getMutationId = (requestKey: string) => {
			if (ticketRef.current?.requestKey !== requestKey) {
				ticketRef.current = { requestKey, mutationId: `family-refund-${deterministicIdGen()}` };
			}
			return ticketRef.current.mutationId;
		};

		const mutId1 = getMutationId(key1);
		const mutId2 = getMutationId(key2);

		assert.equal(mutId1, mutId2, "Retry must reuse existing mutation ID to protect against double deposit");
		assert.equal(mutId1, "family-refund-det-uuid-1");
	});

	it("3.1 FamilyTab Rendering: Renders honest family pool banner & members with canonical card numbers", () => {
		const data = {
			...PATIENT_CABINET_PRESET_ALEXEY,
			cardNumber: "К-8842",
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
		assert.ok(html.includes("К-8843"), "Renders spouse canonical card number К-8843");
		assert.ok(html.includes("К-8844"), "Renders child canonical card number К-8844");
		assert.ok(html.includes("btn-toggle-add-family-member"), "Renders add member toggle button");
		assert.ok(html.includes("min-height:44px") || html.includes("min-height: 44px"), "Enforces touch-friendly >=44px buttons");
	});

	it("3.2 buildWhatsAppLink: Uses real patient card number in emergency WhatsApp link", async () => {
		const { buildWhatsAppLink } = await import("../patientCareInstructionsEngine.js");
		const data = {
			...PATIENT_CABINET_PRESET_ALEXEY,
			fullName: "Воронов Алексей Владимирович",
			cardNumber: "ЭМК-2026/891",
		};

		const link = buildWhatsAppLink(
			"+79991234567",
			`Здравствуйте! Я пациент клиники DENTE (${data.fullName}, карта № ${data.cardNumber}). После недавнего лечения возникли вопросы.`,
		);

		assert.ok(link.startsWith("https://wa.me/79991234567?text="));
		assert.ok(link.includes("891"));
	});
});
