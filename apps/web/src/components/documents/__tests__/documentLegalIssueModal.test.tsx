import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { DocumentIssueConfirmationModal } from "../tabs/DocumentIssueConfirmationModal.js";
import { setupMockDom, findNodeByTestId } from "./documentLegalAuditMockDom.js";

describe("DocumentIssueConfirmationModal Non-blocking Execution", () => {
	let dom: ReturnType<typeof setupMockDom>;

	beforeEach(() => {
		dom = setupMockDom();
	});

	it("DocumentIssueConfirmationModal mounts via createPortal and executes non-blocking CTA", async () => {
		const doc: GeneratedDocument = {
			id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
			organizationId: "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
			patientId: "patient-123",
			visitId: null,
			kind: "tax_deduction_certificate",
			status: "draft",
			title: "Справка об оплате медицинских услуг для ФНС",
			totalAmountRub: 120000,
			issuedAt: null,
		};

		const container = dom.doc.createElement("div");
		dom.body.appendChild(container);

		let confirmedWithBypass = false;
		let identityChecked = false;
		let documentOpened = false;
		let recipientSigned = false;
		let clinicSigned = false;

		const root = createRoot(container);

		await act(async () => {
			root.render(
				<DocumentIssueConfirmationModal
					documentIssueConfirmation={doc}
					patients={[{ id: "patient-123", organizationId: "org-1", fullName: "Ковалев Д.С.", phone: "+79055554433", status: "active", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" } as Patient]}
					patientName={(_, id) => (id === "patient-123" ? "Ковалев Д.С." : "")}
					money={(v) => `${v} ₽`}
					documentIssueSignatureMode="paper_handwritten"
					setDocumentIssueSignatureMode={() => {}}
					normalizedDocumentIssueSignatureMode={(v) => v}
					documentIssueSignatureModeLabels={{ paper_handwritten: "Бумажный оригинал" }}
					documentIssueSignedAt="2026-03-15T12:00:00.000Z"
					setDocumentIssueSignedAt={() => {}}
					documentIssueRecipientFullName="Ковалев Д.С."
					setDocumentIssueRecipientFullName={() => {}}
					documentIssueRecipientRole="patient"
					setDocumentIssueRecipientRole={() => {}}
					documentIssueStaffFullName="Д-р Воронов А.В."
					setDocumentIssueStaffFullName={() => {}}
					documentIssueStaffRole="doctor"
					setDocumentIssueStaffRole={() => {}}
					documentIssueNote=""
					setDocumentIssueNote={() => {}}
					activeDoctor={{ fullName: "Д-р Воронов А.В." }}
					documentIssueIdentityChecked={false}
					setDocumentIssueIdentityChecked={(v) => { identityChecked = v; }}
					documentIssueDocumentOpenedAndChecked={false}
					setDocumentIssueDocumentOpenedAndChecked={(v) => { documentOpened = v; }}
					documentIssueRecipientSigned={false}
					setDocumentIssueRecipientSigned={(v) => { recipientSigned = v; }}
					documentIssueClinicSigned={false}
					setDocumentIssueClinicSigned={(v) => { clinicSigned = v; }}
					documentIssueAttestationReady={false}
					documentIssueMissingSteps={["Личность не подтверждена"]}
					documentIssueMissingGuidanceId="guidance-1"
					documentIssueSaving={false}
					setDocumentIssueConfirmationId={() => {}}
					confirmDocumentIssue={(bypass) => { confirmedWithBypass = Boolean(bypass); }}
				/>,
			);
		});

		const modalNode = findNodeByTestId(dom.body, "modal-document-issue-confirmation");
		assert.ok(modalNode, "Must mount into document.body via createPortal");
		const primaryBtn = findNodeByTestId(modalNode, "btn-confirm-issue-primary");
		assert.ok(primaryBtn, "Must render primary CTA button");
		assert.strictEqual(primaryBtn.disabled, false, "Primary CTA must NOT be disabled (Mandate 8e)");

		await act(async () => {
			primaryBtn.dispatchEvent({ type: "click" });
		});

		assert.strictEqual(identityChecked, true, "Must set identityChecked = true");
		assert.strictEqual(documentOpened, true, "Must set documentOpened = true");
		assert.strictEqual(recipientSigned, true, "Must set recipientSigned = true");
		assert.strictEqual(clinicSigned, true, "Must set clinicSigned = true");
		assert.strictEqual(confirmedWithBypass, true, "Must call confirmDocumentIssue(true)");

		await act(async () => {
			root.unmount();
		});
	});
});
