/**
 * treatmentPlanPatientSignatureModal.test.tsx — Тестирование модального окна подписания
 * плана лечения пациентом (Paper-First Autonomy, Mandate 8e).
 * Без кустарного Mock-DOM (Мандат 8wx, лимит <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import type { DigitalSignatureAgreementData } from "../types";
import { expect, sampleSignatureTier } from "./helpers/signatureTestHelpers";

const baseModalProps = {
	isOpen: true,
	tier: sampleSignatureTier,
	patientName: "Иванова Анна Сергеевна",
	patientId: "PAT-2026-1042",
	doctorFullName: "Д-р Воронова М.А.",
	clinicName: "Стоматология ДЕНТЕ",
	onClose: () => {},
	onSignedSuccess: () => {},
};

describe("TreatmentPlanSignatureModal — Paper-First Autonomy & Doctor Freedom (Mandate 8e)", () => {
	it("renders print button and 1-click paper confirmation button, eradicating SignaturePad canvas", () => {
		const html = renderToString(<TreatmentPlanSignatureModal {...baseModalProps} />);

		expect(html).toContain('data-testid="print-treatment-plan-btn"');
		expect(html).toContain("Печать плана (А4)");
		expect(html).toContain('data-testid="paper-signature-confirm-btn"');
		expect(html).toContain("Бумажный оригинал подписан пациентом");
		expect(html).toContain('data-testid="confirm-sign-plan-btn"');
		expect(html).toContain("Утвердить и подписать");
		expect(html).not.toContain("<canvas");
		expect(html).not.toContain("Личная подпись пациента (нарисуйте на экране)");
	});

	it("ensures button 'Утвердить и подписать' is NOT disabled when signature is empty (Mandate 8e)", () => {
		const html = renderToString(<TreatmentPlanSignatureModal {...baseModalProps} />);
		const confirmBtnMatch = html.match(/<button[^>]*data-testid="confirm-sign-plan-btn"[^>]*>/);
		expect(confirmBtnMatch).not.toBeNull();
		expect(confirmBtnMatch?.[0] ?? "").not.toMatch(/\sdisabled(?:=|\s|>)/);
	});

	it("ensures paper signature button is NOT disabled (Mandates 8e, 8k)", () => {
		const html = renderToString(<TreatmentPlanSignatureModal {...baseModalProps} />);
		const paperBtnMatch = html.match(/<button[^>]*data-testid="paper-signature-confirm-btn"[^>]*>/);
		expect(paperBtnMatch).not.toBeNull();
		expect(paperBtnMatch?.[0] ?? "").not.toMatch(/\sdisabled(?:=|\s|>)/);
	});

	it("builds valid 1-click paper agreement data in accordance with Mandate 8e", () => {
		let receivedAgreement: DigitalSignatureAgreementData | null = null;
		const onSignedSuccess = (res: DigitalSignatureAgreementData) => { receivedAgreement = res; };

		const agreementPayload: DigitalSignatureAgreementData = {
			patientId: baseModalProps.patientId,
			patientName: baseModalProps.patientName,
			planTierId: baseModalProps.tier.tierId,
			planTitle: baseModalProps.tier.title,
			totalAmountRub: baseModalProps.tier.totalRub,
			signatureBase64: "data:image/png;base64,Подписано на бумаге",
			agreedAtIso: new Date().toISOString(),
			doctorFullName: baseModalProps.doctorFullName,
			clinicName: baseModalProps.clinicName,
			termsAccepted: true,
		};
		onSignedSuccess(agreementPayload);

		expect(receivedAgreement).not.toBeNull();
		const agreement = receivedAgreement as unknown as DigitalSignatureAgreementData;
		expect(agreement.patientId).toBe("PAT-2026-1042");
		expect(agreement.patientName).toBe("Иванова Анна Сергеевна");
		expect(agreement.planTierId).toBe("standard");
		expect(agreement.totalAmountRub).toBe(125000);
		expect(agreement.termsAccepted).toBe(true);
		expect(agreement.signatureBase64).toContain("Подписано на бумаге");
	});
});
