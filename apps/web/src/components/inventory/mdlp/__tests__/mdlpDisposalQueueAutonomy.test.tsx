/**
 * ============================================================================
 * MDLP DISPOSAL QUEUE AUTONOMY TESTS (MANDATES 8e, 8k, 8n, 8d)
 * Unit tests for MDLP Disposal Queue Staff & Doctor Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; 1-click carpules fallbacks)
 * - Mandate 8k: CRM != Reality Simulator (Elimination of carpule-by-carpule scanning friction)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 * - Mandate 8d: Anti-Matryoshka (depth 1), zero emojis in acts and journals
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createCarpuleQueueItem } from "@dental/shared";
import { MdlpDisposalQueueModal } from "../MdlpDisposalQueueModal.js";
import {
	SeniorNurseDisposalActModal,
	executeSeniorNurseDisposalActInBackground,
} from "../SeniorNurseDisposalActModal.js";

describe("MDLP Disposal Queue Staff & Doctor Autonomy (Mandates 8e, 8k, 8n, 8d)", () => {
	it("1. createCarpuleQueueItem creates valid queue item with FEFO metadata", () => {
		const validRaw = "010460700836012421SN123456789\x1d17280531\x1d10LOT1\x1d91ABCD\x1d92qwe";
		const dummyItem = createCarpuleQueueItem(validRaw, {
			costRub: 420,
			patientId: "pat-1",
			patientName: "Тест Пациент",
			doctorId: "doc-1",
			doctorName: "Тест Врач",
		});

		assert.ok(dummyItem.id);
		assert.strictEqual(dummyItem.patientName, "Тест Пациент");
		assert.strictEqual(dummyItem.doctorName, "Тест Врач");
		assert.strictEqual(dummyItem.status, "queued");
	});

	it("2. MdlpDisposalQueueModal renders with 1-click shift carpules button and non-blocking actions", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: true,
				onClose: () => {},
				initialItems: [],
				patientName: "Иванов И.И.",
				doctorName: "Д-р Смирнов",
			})
		);

		// Must render modal dialog
		assert.ok(html.includes("data-testid=\"mdlp-disposal-queue-modal\""));
		// Must render 1-click batch disposal of all empty carpules for the shift
		assert.ok(html.includes("data-testid=\"banner-quick-shift-carpules-btn\""));
		assert.ok(html.includes("Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)"));
		// Barcode add button and confirm button
		assert.ok(html.includes("data-testid=\"add-barcode-btn\""));
		assert.ok(html.includes("data-testid=\"confirm-disposal-btn\""));
		assert.ok(html.includes("data-testid=\"print-disposal-act-btn\""));

		// Anti-Emoji Law: No emojis in the modal
		assert.ok(!html.includes("⚡"));
		assert.ok(!html.includes("✓"));
	});

	it("3. Buttons meet touch target requirement (min-h-[44px] or minHeight 44px)", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: true,
				onClose: () => {},
				initialItems: [],
			})
		);

		assert.ok(html.includes("min-h-[44px]") || html.includes("min-height: 44px") || html.includes("min-height:44px"));
	});

	it("4. SeniorNurseDisposalActModal renders act without bureaucratic 3-person commission and zero emojis", () => {
		const html = renderToStaticMarkup(
			createElement(SeniorNurseDisposalActModal, {
				isOpen: true,
				onClose: () => {},
				items: [
					{
						id: "disp-1",
						name: "Ультракаин Д-С 1.7 мл",
						quantity: 10,
						unitRu: "амп",
						series: "410224",
						expirationDate: "2028-12-31",
					} as any,
				],
				organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
				initialSeniorNurseName: "Иванова Е.В.",
				initialApproverRole: "senior_nurse",
			})
		);

		assert.ok(html.includes("data-testid=\"senior-nurse-disposal-act-modal\""));
		assert.ok(html.includes("data-testid=\"approve-act-paper-journal-btn\""));
		assert.ok(html.includes("СанПиН 3.3686-21"));
		assert.ok(html.includes("Иванова Е.В."));

		// Anti-Emoji Law: No emojis in senior nurse act modal
		assert.ok(!html.includes("⚡"));
		assert.ok(!html.includes("✓"));
	});

	it("5. MdlpDisposalQueueModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: false,
				onClose: () => {},
			})
		);
		assert.strictEqual(html, "");
	});

	it("6. executeSeniorNurseDisposalActInBackground approves act silently in background without commission", async () => {
		let approvedData: any = null;
		const actData = await executeSeniorNurseDisposalActInBackground({
			items: [
				{
					id: "item-bg-1",
					sgtin: "0460700836012421SN12345",
					costRub: 420,
					status: "disposed",
				} as any,
			],
			organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
			approverName: "Д-р Кузнецов М.С.",
			approverRole: "doctor",
			onApproveAct: (data) => {
				approvedData = data;
			},
		});

		assert.ok(actData.actNumber.startsWith("СПИС-"));
		assert.strictEqual(actData.commission.length, 1);
		assert.ok(actData.commission[0]?.positionRu.includes("единолично"));
		assert.strictEqual(actData.approverRole, undefined);
		assert.strictEqual(actData.approvedByFullName, "Д-р Кузнецов М.С.");
		assert.ok(approvedData);
		assert.strictEqual(approvedData.actNumber, actData.actNumber);
	});

	it("7. SeniorNurseDisposalActModal with backgroundMode returns empty markup and avoids blocking UI", () => {
		const html = renderToStaticMarkup(
			createElement(SeniorNurseDisposalActModal, {
				isOpen: true,
				backgroundMode: true,
				onClose: () => {},
				items: [],
			})
		);
		assert.strictEqual(html, "");
	});
});
