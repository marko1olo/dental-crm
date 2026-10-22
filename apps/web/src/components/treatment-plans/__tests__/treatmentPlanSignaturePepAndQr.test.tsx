import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import { sampleTier } from "./helpers/stagesDispatchAndPepTestHelpers";

describe("TreatmentPlanSignature — PEP & QR Modes", () => {
	it("renders 3 signing methods (SMS PEP 63-FZ, QR code, Paper) in TreatmentPlanSignatureModal", () => {
		const html = renderToString(
			<TreatmentPlanSignatureModal
				isOpen={true}
				tier={sampleTier}
				patientName="Петров Иван Васильевич"
				patientId="PAT-2026-0042"
				initialSignMethod="sms"
				onClose={() => {}}
				onSignedSuccess={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="signature-method-sms"'));
		assert.ok(html.includes('data-testid="signature-method-qr"'));
		assert.ok(html.includes('data-testid="signature-method-paper"'));
		assert.ok(html.includes('data-testid="request-sms-btn"'));
		assert.ok(html.includes("Простая электронная подпись (ПЭП) по СМС"));
	});

	it("renders dynamic QR code and instructions when initialSignMethod is qr", () => {
		const html = renderToString(
			<TreatmentPlanSignatureModal
				isOpen={true}
				tier={sampleTier}
				patientName="Петров Иван Васильевич"
				patientId="PAT-2026-0042"
				initialSignMethod="qr"
				onClose={() => {}}
				onSignedSuccess={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="qr-code-svg-container"'));
		assert.ok(html.includes("<svg"));
		assert.ok(html.includes("Сканирование QR-кода пациентом"));
	});
});
