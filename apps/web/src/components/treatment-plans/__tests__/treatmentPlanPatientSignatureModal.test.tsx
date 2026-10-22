/**
 * treatmentPlanPatientSignatureModal.test.tsx — Тестирование модального окна подписания
 * плана лечения пациентом (Paper-First Autonomy, Mandate 8e).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import type { DigitalSignatureAgreementData } from "../types";
import { clickNode, findNodeByTestId, setupMockDom } from "./helpers/mockDomHelper";
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
		expect(html).toContain("Утвердить и подписать на бумаге");
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

	it("interactively triggers 1-click paper confirmation and passes paper agreement data", async () => {
		const { doc } = setupMockDom();
		let root: Root | null = null;
		let receivedAgreement: DigitalSignatureAgreementData | null = null;
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		await act(async () => {
			root = createRoot(container as unknown as HTMLElement);
			root.render(
				<TreatmentPlanSignatureModal
					{...baseModalProps}
					onSignedSuccess={(agreement) => { receivedAgreement = agreement; }}
				/>,
			);
		});

		const paperConfirmBtn = findNodeByTestId(doc.body, "paper-signature-confirm-btn");
		expect(paperConfirmBtn).not.toBeNull();
		await clickNode(paperConfirmBtn!);

		expect(receivedAgreement).not.toBeNull();
		const agreement = receivedAgreement as unknown as DigitalSignatureAgreementData;
		expect(agreement.patientId).toBe("PAT-2026-1042");
		expect(agreement.patientName).toBe("Иванова Анна Сергеевна");
		expect(agreement.planTierId).toBe("standard");
		expect(agreement.totalAmountRub).toBe(125000);
		expect(agreement.termsAccepted).toBe(true);
		expect(agreement.signatureBase64).toContain("Подписано на бумаге");

		await act(async () => { root?.unmount(); });
	});

	it("allows clicking 'Утвердить и подписать' directly without drawing, defaulting to paper signature", async () => {
		const { doc } = setupMockDom();
		let root: Root | null = null;
		let receivedAgreement: DigitalSignatureAgreementData | null = null;
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		await act(async () => {
			root = createRoot(container as unknown as HTMLElement);
			root.render(
				<TreatmentPlanSignatureModal
					{...baseModalProps}
					onSignedSuccess={(agreement) => { receivedAgreement = agreement; }}
				/>,
			);
		});

		const confirmBtn = findNodeByTestId(doc.body, "confirm-sign-plan-btn");
		expect(confirmBtn).not.toBeNull();
		await clickNode(confirmBtn!);

		expect(receivedAgreement).not.toBeNull();
		const fallback = receivedAgreement as unknown as DigitalSignatureAgreementData;
		expect(fallback.signatureBase64).toContain("Подписано на бумаге");

		await act(async () => { root?.unmount(); });
	});
});
