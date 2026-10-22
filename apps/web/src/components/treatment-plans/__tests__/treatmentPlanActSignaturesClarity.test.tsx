/**
 * treatmentPlanActSignaturesClarity.test.tsx — Тестирование ясности подписей в актах,
 * М.П., ПЭП СМС и автономии врача при конфликтах (Mandates 8e, 8x, 8y).
 */

import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { TreatmentPlanActSignatures } from "../TreatmentPlanActSignatures";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import type { DigitalSignatureAgreementData, TreatmentPlanTier } from "../types";
import { clickNode, findNodeByTestId, setupMockDom } from "./helpers/mockDomHelper";
import { expect, sampleSignatureTier } from "./helpers/signatureTestHelpers";

describe("TreatmentPlanActSignatures & Doctor Autonomy with Clinical Conflicts", () => {
	const samplePalette = {
		primaryDark: "#0f172a",
		accentBorder: "#cbd5e1",
		softBg: "#f8fafc",
	} as any;

	it("renders clean human Russian verification labels and paper signature fallback lines with М.П.", () => {
		const htmlDraft = renderToString(
			<TreatmentPlanActSignatures
				actData={{
					actNumber: "АКТ-2026-01",
					actDate: "13.10.2026",
					patientName: "Иванова Анна Сергеевна",
					doctorFullName: "Д-р Воронова М.А.",
					status: "draft",
				} as any}
				palette={samplePalette}
				legalName='ООО "Стоматология ДЕНТЕ"'
				showDoctorStampFrame={true}
				showQrVerification={true}
				verificationHash="sha256:1234567890abcdef"
			/>,
		);

		expect(htmlDraft).toContain("М.П.");
		expect(htmlDraft).toContain("Готов к подписанию на бумаге или электронно");
		expect(htmlDraft).not.toContain("Ожидает подписания (на бумаге или УКЭП)");

		const htmlPep = renderToString(
			<TreatmentPlanActSignatures
				actData={{
					actNumber: "АКТ-2026-02",
					actDate: "13.10.2026",
					patientName: "Иванова Анна Сергеевна",
					doctorFullName: "Д-р Воронова М.А.",
					status: "signed",
					signingMethod: "pep_sms",
				} as any}
				palette={samplePalette}
				legalName='ООО "Стоматология ДЕНТЕ"'
				showDoctorStampFrame={true}
				showQrVerification={true}
				verificationHash="sha256:abcdef1234567890"
			/>,
		);

		expect(htmlPep).toContain("Подписано простой электронной подписью пациента (код подтверждения)");
	});

	it("upholds Doctor Autonomy (Mandates 8e, 8y): buttons remain enabled with clinical conflicts", async () => {
		const { doc } = setupMockDom();
		let root: Root | null = null;
		let receivedAgreement: DigitalSignatureAgreementData | null = null;

		const conflictingTier: TreatmentPlanTier = {
			...sampleSignatureTier,
			stages: [
				{
					id: "stage-conflicts",
					title: "Хирургический этап",
					items: [
						{ id: "item-ext", name: "Удаление зуба сложное", code804n: "A16.07.001.001", category: "SURGERY", priceRub: 5000, quantity: 1, toothNumber: 16, isDraft: false },
						{ id: "item-crown", name: "Восстановление зуба коронкой постоянной", code804n: "A16.07.004.001", category: "PROSTHETICS", priceRub: 25000, quantity: 1, toothNumber: 16, isDraft: false },
					],
				} as any,
			],
		};

		const container = doc.createElement("div");
		doc.body.appendChild(container);

		await act(async () => {
			root = createRoot(container as unknown as HTMLElement);
			root.render(
				<TreatmentPlanSignatureModal
					isOpen={true}
					tier={conflictingTier}
					patientName="Иванова Анна Сергеевна"
					patientId="PAT-2026-1042"
					doctorFullName="Д-р Воронова М.А."
					clinicName="Стоматология ДЕНТЕ"
					onClose={() => {}}
					onSignedSuccess={(agreement) => { receivedAgreement = agreement; }}
				/>,
			);
		});

		const conflictAlert = findNodeByTestId(doc.body, "clinical-conflict-alert");
		expect(conflictAlert).not.toBeNull();

		const paperConfirmBtn = findNodeByTestId(doc.body, "paper-signature-confirm-btn");
		expect(paperConfirmBtn).not.toBeNull();
		assert.equal(paperConfirmBtn?.getAttribute("disabled"), null, "Paper button must not be disabled");

		await clickNode(paperConfirmBtn!);
		expect(receivedAgreement).not.toBeNull();

		await act(async () => { root?.unmount(); });
	});
});
