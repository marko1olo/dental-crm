import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { DocumentAuditFactsModal } from "../tabs/DocumentAuditFactsModal.js";
import {
	setupMockDom,
	findNodeByTestId,
	collectAllText,
	hasCartoonEmojis,
} from "./documentLegalAuditMockDom.js";

describe("DocumentAuditFactsModal Mount and Render Compliance", () => {
	let dom: ReturnType<typeof setupMockDom>;

	beforeEach(() => {
		dom = setupMockDom();
	});

	it("DocumentAuditFactsModal mounts via createPortal and displays complete legal facts", async () => {
		const facts = {
			documentId: "doc-uuid-12345",
			kind: "treatment_contract",
			status: "issued",
			createdAt: "2026-03-15T10:00:00.000Z",
			issuedAt: "2026-03-15T10:15:00.000Z",
			totalAmountRub: 45000,
			title: "Договор на оказание платных медицинских услуг № ДПМУ-2026-0042",
			patient: {
				id: "patient-123",
				fullName: "Смирнова Екатерина Павловна",
				phone: "+7 (916) 123-45-67",
			},
			visitId: "visit-uuid-777",
			treatmentPlanId: "plan-uuid-888",
			snapshotSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			signatureAttestation: {
				mode: "simple_sms_otp",
				signedAt: "2026-03-15T10:14:30.000Z",
				recipientFullName: "Смирнова Екатерина Павловна",
				recipientRole: "patient",
				staffFullName: "Д-р Воронов А.В.",
				staffRole: "doctor",
				signerFullName: "Смирнова Екатерина Павловна",
				signerPhone: "+7 (916) 123-45-67",
				otpCodeMasked: "••84",
				sha256Digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			},
			cryptoSignaturePkcs7: "MIIE...CERTIFICATE...DATA",
			doctorSignedAt: "2026-03-15T10:15:00.000Z",
		};

		const container = dom.doc.createElement("div");
		dom.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<DocumentAuditFactsModal
					documentAuditFacts={facts}
					documentIssueSignatureModeLabels={{ simple_sms_otp: "Простая ЭЦП (СМС код)" }}
					documentVoidReasonLabels={{}}
					loadDocumentAuditFacts={() => {}}
					setDocumentAuditFacts={() => {}}
					openIssuedDocumentHtml={() => {}}
					downloadIssuedDocumentHtml={() => {}}
					downloadIssuedDocumentPdf={() => {}}
				/>,
			);
		});

		const modalDialog = findNodeByTestId(dom.body, "modal-document-audit-facts");
		assert.ok(modalDialog, "Must mount into document.body via createPortal");
		const allText = collectAllText(modalDialog);
		assert.ok(allText.includes("Аудит юридической чистоты"));
		assert.ok(allText.includes("63-ФЗ"));
		assert.ok(allText.includes("Смирнова Екатерина Павловна"));
		assert.ok(allText.includes("visit-uu"));
		assert.ok(allText.includes("plan-uui"));
		assert.ok(allText.includes("ГОСТ"));
		assert.ok(allText.includes("e3b0c44298"));
		assert.strictEqual(hasCartoonEmojis(allText), false);

		await act(async () => {
			root.unmount();
		});
	});
});
