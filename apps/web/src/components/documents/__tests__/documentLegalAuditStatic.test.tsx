import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { DocumentAuditFacts, GeneratedDocument, Patient } from "@dental/shared";
import { DocumentAuditFactsModal } from "../tabs/DocumentAuditFactsModal.js";
import { DocumentIssueConfirmationModal } from "../tabs/DocumentIssueConfirmationModal.js";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel.js";
import { collectAllText, hasCartoonEmojis, setupMockDom } from "./documentLegalAuditMockDom.js";

describe("Document Legal Audit and Issue Modals: Runtime Rendering & Compliance", () => {
	const samplePatient: Patient = {
		id: "11111111-1111-4111-8111-111111111111",
		organizationId: "22222222-2222-4222-8222-222222222222",
		fullName: "Волков Дмитрий Сергеевич",
		phone: "+7 999 000 11 22",
		birthDate: "1988-05-12",
		createdAt: "2026-01-10T10:00:00.000Z",
		updatedAt: "2026-01-10T10:00:00.000Z",
	} as unknown as Patient;

	it("1. DocumentAuditFactsModal mounts cleanly via portal with theme tokens, 63-ФЗ attestation & 0 emojis", async () => {
		const { doc, body } = setupMockDom();
		const container = doc.createElement("div");
		body.appendChild(container);
		const root = createRoot(container);

		const facts: DocumentAuditFacts = {
			documentId: "33333333-3333-4333-8333-333333333333",
			kind: "paid_medical_services_contract",
			status: "issued",
			documentNumber: "Д-2026/007",
			title: "Договор на оказание платных медицинских услуг",
			createdAt: "2026-05-01T10:00:00.000Z",
			issuedAt: "2026-05-01T10:05:00.000Z",
			sourceStatus: "ready",
			signatureAttestation: {
				mode: "qualified_ukep",
				signedAt: "2026-05-01T10:05:00.000Z",
				recipientFullName: "Волков Дмитрий Сергеевич",
				recipientRole: "patient",
				staffFullName: "Соколова А.А.",
				staffRole: "doctor",
				attestationText: "Подписано УКЭП ГОСТ в соответствии с 63-ФЗ",
			},
			auditTrail: [],
			events: [],
		} as unknown as DocumentAuditFacts;

		await act(async () => {
			root.render(
				React.createElement(DocumentAuditFactsModal, {
					documentAuditFacts: facts,
					documentIssueSignatureModeLabels: { qualified_ukep: "УКЭП ГОСТ", paper: "Бумага" },
					documentVoidReasonLabels: { typo: "Опечатка" },
					loadDocumentAuditFacts: () => {},
					setDocumentAuditFacts: () => {},
					openIssuedDocumentHtml: () => {},
					downloadIssuedDocumentHtml: () => {},
					downloadIssuedDocumentPdf: () => {},
				}),
			);
		});

		const text = collectAllText(body);
		assert.ok(text.length > 0, "Audit modal must render into portal body");
		assert.equal(hasCartoonEmojis(text), false, "Audit modal rendered text must contain 0 cartoon emojis");
		await act(async () => { root.unmount(); });
	});

	it("2. DocumentIssueConfirmationModal respects Mandate 8e autonomy (unlocked confirm CTA) and 0 emojis", async () => {
		const { doc, body } = setupMockDom();
		const container = doc.createElement("div");
		body.appendChild(container);
		const root = createRoot(container);

		const docRecord: GeneratedDocument = {
			id: "44444444-4444-4444-8444-444444444444",
			organizationId: "22222222-2222-4222-8222-222222222222",
			patientId: samplePatient.id,
			kind: "paid_medical_services_contract",
			status: "draft",
			title: "Договор № 12",
			createdAt: "2026-05-01T10:00:00.000Z",
			updatedAt: "2026-05-01T10:00:00.000Z",
		} as unknown as GeneratedDocument;

		await act(async () => {
			root.render(
				React.createElement(DocumentIssueConfirmationModal, {
					documentIssueConfirmation: docRecord,
					patients: [samplePatient],
					documentIssueSignatureMode: "paper",
					setDocumentIssueSignatureMode: () => {},
					normalizedDocumentIssueSignatureMode: () => "paper",
					documentIssueSignatureModeLabels: { paper: "Бумажная подпись", sms_otp: "ПЭП по СМС" },
					documentIssueSignedAt: "2026-05-01",
					setDocumentIssueSignedAt: () => {},
					documentIssueRecipientFullName: samplePatient.fullName,
					setDocumentIssueRecipientFullName: () => {},
					documentIssueRecipientRole: "Пациент",
					setDocumentIssueRecipientRole: () => {},
					documentIssueStaffFullName: "Соколова А.А.",
					setDocumentIssueStaffFullName: () => {},
					documentIssueStaffRole: "Врач",
					setDocumentIssueStaffRole: () => {},
					documentIssueNote: "",
					setDocumentIssueNote: () => {},
					documentIssueIdentityChecked: false,
					setDocumentIssueIdentityChecked: () => {},
					documentIssueDocumentOpenedAndChecked: false,
					setDocumentIssueDocumentOpenedAndChecked: () => {},
					documentIssueRecipientSigned: false,
					setDocumentIssueRecipientSigned: () => {},
					documentIssueClinicSigned: false,
					setDocumentIssueClinicSigned: () => {},
					documentIssueAttestationReady: false,
					documentIssueMissingSteps: [],
					documentIssueMissingGuidanceId: "",
					documentIssueSaving: false,
					setDocumentIssueConfirmationId: () => {},
					confirmDocumentIssue: () => {},
				}),
			);
		});

		const text = collectAllText(body);
		assert.ok(text.length > 0, "Issue confirmation modal must mount into portal body");
		assert.equal(hasCartoonEmojis(text), false, "Issue confirmation modal must contain 0 cartoon emojis");
		await act(async () => { root.unmount(); });
	});

	it("3. PaidContractRequiredFieldsPanel renders blank contract print action with >= 44px touch target", () => {
		const html = renderToString(
			React.createElement(PaidContractRequiredFieldsPanel, {
				review: { requiredCount: 4, filledCount: 1, missing: ["Паспорт пациента"] } as any,
				fieldsBlockTitle: "Заполнение реквизитов",
				patient: { fullName: samplePatient.fullName },
				doctorName: "Соколова А.А.",
			}),
		);
		assert.ok(html.includes('data-testid="btn-missing-fields-print-blank-contract"'));
		assert.ok(html.includes("min-h-[44px]"));
		assert.equal(hasCartoonEmojis(html), false);
	});
});
