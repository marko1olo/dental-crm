import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	SeniorNurseDisposalActModal,
	executeSeniorNurseDisposalActInBackground,
} from "../SeniorNurseDisposalActModal.js";

describe("MDLP Senior Nurse Act Modal & Background Approval (Mandates 8e, 8k, 8n, 8d)", () => {
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
			}),
		);

		assert.ok(html.includes("data-testid=\"senior-nurse-disposal-act-modal\""));
		assert.ok(html.includes("data-testid=\"approve-act-paper-journal-btn\""));
		assert.ok(html.includes("СанПиН 3.3686-21"));
		assert.ok(html.includes("Иванова Е.В."));

		// Anti-Emoji Law: No emojis in senior nurse act modal
		assert.ok(!html.includes("⚡"));
		assert.ok(!html.includes("✓"));
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
		assert.ok(actData.approvedByPositionRu);
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
			}),
		);
		assert.strictEqual(html, "");
	});

	it("8. SeniorNurseDisposalActModal defaults to solo doctor / administrator approval without senior nurse requirement", () => {
		const html = renderToStaticMarkup(
			createElement(SeniorNurseDisposalActModal, {
				isOpen: true,
				onClose: () => {},
				items: [
					{
						id: "disp-doc-1",
						name: "Артикаин 4% 1.7 мл",
						quantity: 2,
						unitRu: "карп",
						series: "ART-2026",
					} as any,
				],
				organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
				initialApproverRole: "doctor",
				initialDentistName: "Д-р Кузнецов М.С.",
			}),
		);

		assert.ok(html.includes("Акт списания медикаментов и анестетиков"));
		assert.ok(html.includes("Д-р Кузнецов М.С."));
		assert.ok(html.includes("Медсестра ЦСО не требуется"));
		assert.ok(html.includes("Единоличное утверждение (без комиссии из 3 человек)"));
	});
});
