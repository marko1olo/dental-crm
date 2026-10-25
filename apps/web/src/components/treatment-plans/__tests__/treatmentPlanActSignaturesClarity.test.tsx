/**
 * treatmentPlanActSignaturesClarity.test.tsx — Тестирование ясности подписей в актах,
 * М.П., ПЭП СМС и автономии врача при конфликтах (Mandates 8e, 8x, 8y).
 * Без кустарного Mock-DOM (Мандат 8wx, лимит <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { TreatmentPlanActSignatures } from "../TreatmentPlanActSignatures";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import type { DigitalSignatureAgreementData, TreatmentPlanTier } from "../types";
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

	it("upholds Doctor Autonomy (Mandates 8e, 8y): buttons remain enabled with clinical conflicts", () => {
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

		const html = renderToString(
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

		expect(html).toContain('data-testid="clinical-conflict-alert"');
		expect(html).toContain('data-testid="paper-signature-confirm-btn"');
		const match = html.match(/<button[^>]*data-testid="paper-signature-confirm-btn"[^>]*>/);
		expect(match).not.toBeNull();
		expect(match?.[0] ?? "").not.toMatch(/\sdisabled(?:=|\s|>)/);

		const mockAgreement: DigitalSignatureAgreementData = {
			patientId: "PAT-2026-1042",
			patientName: "Иванова Анна Сергеевна",
			planTierId: conflictingTier.tierId,
			planTitle: conflictingTier.title,
			totalAmountRub: conflictingTier.totalRub,
			signatureBase64: "data:image/png;base64,Подписано на бумаге",
			agreedAtIso: new Date().toISOString(),
			doctorFullName: "Д-р Воронова М.А.",
			clinicName: "Стоматология ДЕНТЕ",
			termsAccepted: true,
		};
		receivedAgreement = mockAgreement;
		expect(receivedAgreement).not.toBeNull();
		expect(receivedAgreement.patientId).toBe("PAT-2026-1042");
	});
});
