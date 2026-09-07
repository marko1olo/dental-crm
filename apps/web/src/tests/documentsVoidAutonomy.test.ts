/**
 * documentsVoidAutonomy.test.ts
 *
 * DENTE Dental CRM — Documents View Voiding Autonomy & Safe Defaults Test Suite
 *
 * Governed by:
 * - Mandate 8e: Doctor & Clinical Staff Autonomy (no dead-ends, no blocked buttons without cause, auto-defaults)
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law, batch sensible defaults)
 * - Mandate 8n: Scale Sovereignty (solo doctor on chair rental & small clinic prioritization)
 * - Mandate 8o: Task-scope reporting
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { documentKindMetadata } from "@dental/shared";
import { AppLogicProvider } from "../contexts/AppLogicContext";
import {
	DEFAULT_VOID_REASON_TEXT,
	DEFAULT_VOID_STAFF_NAME,
	DEFAULT_VOID_STAFF_ROLE,
	DocumentsView,
	executeDocumentVoidAutonomy,
} from "../DocumentsView";
import { useDocumentStore } from "../store/documentStore";
import { documentSourceStatusClassNames } from "../workspaceUiLabels";

interface MockFn {
	(...args: any[]): any;
	calls: any[][];
	mockResolvedValue: (val: any) => MockFn;
}

function createMockFn(defaultReturn?: any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return defaultReturn;
	}) as unknown as MockFn;
	fn.calls = calls;
	fn.mockResolvedValue = (val: any) => {
		const asyncFn = ((...args: any[]) => {
			calls.push(args);
			return Promise.resolve(val);
		}) as unknown as MockFn;
		asyncFn.calls = calls;
		return asyncFn;
	};
	return fn;
}

function createMockAppLogic(overrides: Record<string, unknown> = {}) {
	return {
		dashboard: {
			clinicSettings: {
				profile: {
					clinicName: "Стоматология ДЕНТЕ",
					organizationId: "org-test-1",
				},
			},
			patients: [
				{
					id: "patient-1",
					fullName: "Иванов Иван Иванович",
					phone: "+7 999 111-22-33",
				},
			],
			serviceCatalog: [],
		},
		activeDoctor: {
			id: "doc-1",
			fullName: "Д-р Смирнов Алексей Владимирович",
			role: "doctor",
		},
		activePatient: {
			id: "patient-1",
			fullName: "Иванов Иван Иванович",
			birthDate: "1988-04-12",
			phone: "+7 999 111-22-33",
		},
		documentVoidConfirmation: {
			id: "doc-void-101",
			kind: "treatment_plan",
			status: "issued",
			patientId: "patient-1",
			taxYear: 2026,
		},
		documentVoidReady: false,
		documentVoidSaving: false,
		documentVoidReasonCode: "clerical_error",
		documentVoidReasonText: "",
		documentVoidStaffFullName: "",
		documentVoidStaffRole: "",
		documentVoidArchivePreserved: false,
		documentVoidStatusReviewed: false,
		documentVoidReplacementRequired: false,
		documentVoidPatientOrPayerNotified: false,
		documentVoidCorrectionDocumentId: "",
		documentLabels: {
			treatment_plan: "План лечения",
			dental_medical_card_043u: "Карта 043/у",
		},
		documentStatusLabels: {
			draft: "Черновик",
			issued: "Выдан",
			voided: "Аннулирован",
		},
		documentVoidReasonLabels: {
			clerical_error: "Техническая ошибка ввода",
			patient_request: "По согласованию с пациентом",
		},
		patientName: (_patients: unknown[], id: string) =>
			id === "patient-1" ? "Иванов Иван Иванович" : id,
		formatShortDate: (val: string) => val,
		formatDateTime: (val: string) => val,
		money: (val: number) => `${val} ₽`,
		activeDocuments: [],
		activeUsableDocuments: [],
		activeIssuedPaidContracts: [],
		eligiblePaymentReceiptPayments: [],
		eligibleRefundCorrectionPayments: [],
		eligibleTaxPayments: [],
		issuedMedicalCopyRequestDocuments: [],
		patientIntakePregnancyStatusOptions: [],
		photoVideoMaterialOptions: [],
		postVisitCareTopicOptions: [],
		procedureSpecificConsentProcedureOptions: [],
		taxApplicationDeliveryChannelOptions: [],
		taxApplicationFormOptions: [],
		taxApplicationRelationshipOptions: [],
		taxDocumentPayerOptions: [],
		xrayPregnancyStatusOptions: [],
		xrayStudyTypeOptions: [],
		selectedDocumentMetadata: documentKindMetadata.treatment_plan,
		documentSourceStatusClassNames,
		structuredPayloadDocumentKinds: new Set(),
		treatmentAcceptancePlannedTotalRub: () => 0,
		completedActContractReferenceForUi: () => "",
		completedActFiscalReceiptLines: () => [],
		completedActPaidRubValue: () => 0,
		installmentScheduleBaseDocumentTitleValue: () => "",
		installmentScheduleInstallmentRows: () => [],
		installmentSchedulePrepaidRubValue: () => 0,
		installmentScheduleRemainingRubValue: () => 0,
		installmentScheduleTotalRubValue: () => 0,
		minorConsentDiagnosisOrIndicationValue: () => "",
		minorConsentInterventionScopeValue: () => "",
		minorConsentPatientBirthDateValue: () => "",
		minorConsentPatientFullNameValue: () => "",
		minorRepresentativeFullNameValue: () => "",
		minorRepresentativeIdentityDocumentValue: () => "",
		minorRepresentativePhoneValue: () => "",
		minorRepresentativeRelationshipValue: () => "",
		outpatient025uMedicalCardNumberValue: () => "",
		paidContractTotalRubValue: () => 0,
		paymentFiscalReceiptLabelForUi: () => "",
		paymentInvoiceTotalRubValue: () => 0,
		paymentReceiptFiscalReceiptLines: () => [],
		paymentReceiptIssuedByValue: () => "",
		paymentReceiptPayerBirthDateValue: () => "",
		paymentReceiptPayerFullNameValue: () => "",
		paymentReceiptPayerIdentityDocumentValue: () => "",
		paymentReceiptPayerInnValue: () => "",
		paymentReceiptPayerRelationshipValue: () => "",
		plannedServiceLinesForFinancialPayload: () => [],
		releaseProtectionNote: () => "",
		treatmentEstimatePatientOrPayerFullNameValue: () => "",
		treatmentEstimateTotalRubValue: () => 0,
		treatmentEstimateTreatmentBasisValue: () => "",
		warrantyLinkedActOrContractValue: () => "",
		warrantyServiceOrWorkNameValue: () => "",
		warrantyTeethOrAreaValue: () => "",
		renderClinicalToothRowsEditor: () => null,
		auth: {
			denteClinicalReadHeaders: () => ({}),
			denteClinicalMutationHeaders: () => ({}),
		},
		normalizedDocumentVoidReasonCode: (val: string) => val,
		setDocumentVoidConfirmationId: createMockFn(),
		setDocumentVoidReasonCode: createMockFn(),
		setDocumentVoidStaffFullName: createMockFn(),
		setDocumentVoidStaffRole: createMockFn(),
		setDocumentVoidCorrectionDocumentId: createMockFn(),
		setDocumentVoidReasonText: createMockFn(),
		setDocumentVoidReplacementRequired: createMockFn(),
		setDocumentVoidPatientOrPayerNotified: createMockFn(),
		setDocumentVoidArchivePreserved: createMockFn(),
		setDocumentVoidStatusReviewed: createMockFn(),
		confirmDocumentVoid: createMockFn(),
		updateDocumentStatus: createMockFn().mockResolvedValue(true),
		setError: createMockFn(),
		...overrides,
	};
}

describe("Documents View Voiding Autonomy (Mandates 8e, 8k, 8n)", () => {
	it("1. Void confirmation button is NOT disabled when documentVoidReady is false", () => {
		const mockContext = createMockAppLogic({
			documentVoidReady: false,
			documentVoidSaving: false,
			documentVoidReasonText: "",
			documentVoidStaffFullName: "",
			documentVoidStaffRole: "",
			documentVoidArchivePreserved: false,
			documentVoidStatusReviewed: false,
		});

		// biome-ignore lint/suspicious/noExplicitAny: AppLogicContextType mock for unit test
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, {
				value: mockContext as any,
				children: createElement(DocumentsView),
			}),
		);

		// The void section is mounted
		assert.ok(html.includes("Аннулирование без удаления архива"));
		assert.ok(html.includes("План лечения"));

		// Guidance warning is visible to guide staff
		assert.ok(html.includes("document-void-missing-guidance"));
		assert.ok(html.includes("Чтобы аннулировать документ, осталось:"));

		// The void button is present and says "Аннулировать с причиной"
		assert.ok(html.includes("Аннулировать с причиной"));

		// Crucial verification: The primary button in the void dialog MUST NOT be disabled when documentVoidReady === false
		const voidSectionMatch = html.match(
			/<section[^>]*aria-label="Аннулирование документа"[\s\S]*?<\/section>/,
		);
		assert.ok(voidSectionMatch !== null);
		const voidSectionHtml = voidSectionMatch?.[0] ?? "";
		const buttonMatch = voidSectionHtml.match(
			/<button[^>]*class="primary-button"[^>]*>([\s\S]*?)<\/button>/,
		);
		assert.ok(buttonMatch !== null);
		const buttonTag = buttonMatch?.[0] ?? "";
		assert.ok(buttonTag.includes("Аннулировать с причиной"));
		assert.ok(!buttonTag.includes("disabled"));
		assert.ok(buttonTag.includes("min-height:44px"));
	});

	it("2. Void confirmation button becomes disabled ONLY when documentVoidSaving is true", () => {
		const mockContext = createMockAppLogic({
			documentVoidReady: false,
			documentVoidSaving: true,
		});

		// biome-ignore lint/suspicious/noExplicitAny: AppLogicContextType mock for unit test
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, {
				value: mockContext as any,
				children: createElement(DocumentsView),
			}),
		);

		const voidSectionMatch = html.match(
			/<section[^>]*aria-label="Аннулирование документа"[\s\S]*?<\/section>/,
		);
		assert.ok(voidSectionMatch !== null);
		const voidSectionHtml = voidSectionMatch?.[0] ?? "";

		assert.ok(voidSectionHtml.includes("Аннулирую документ"));
		const buttonMatch = voidSectionHtml.match(
			/<button[^>]*class="primary-button"[^>]*>([\s\S]*?)<\/button>/,
		);
		assert.ok(buttonMatch !== null);
		const buttonTag = buttonMatch?.[0] ?? "";
		assert.ok(buttonTag.includes("disabled"));
	});

	it("3. Executing void auto-populates safe defaults and cancels document without bureaucratic dead-ends", async () => {
		const setDocumentVoidStaffFullName = createMockFn();
		const setDocumentVoidStaffRole = createMockFn();
		const setDocumentVoidArchivePreserved = createMockFn();
		const setDocumentVoidStatusReviewed = createMockFn();
		const setDocumentVoidReasonText = createMockFn();
		const setDocumentVoidConfirmationId = createMockFn();
		const updateDocumentStatus = createMockFn().mockResolvedValue(true);
		const rawConfirmDocumentVoid = createMockFn();
		const setError = createMockFn();

		const result = await executeDocumentVoidAutonomy({
			activeDoctor: { fullName: "Д-р Смирнов Алексей Владимирович" },
			documentVoidStaffFullName: "",
			setDocumentVoidStaffFullName: setDocumentVoidStaffFullName as any,
			documentVoidStaffRole: "",
			setDocumentVoidStaffRole: setDocumentVoidStaffRole as any,
			setDocumentVoidArchivePreserved: setDocumentVoidArchivePreserved as any,
			setDocumentVoidStatusReviewed: setDocumentVoidStatusReviewed as any,
			documentVoidReasonText: "",
			setDocumentVoidReasonText: setDocumentVoidReasonText as any,
			documentVoidReady: false,
			setDocumentVoidConfirmationId: setDocumentVoidConfirmationId as any,
			updateDocumentStatus: updateDocumentStatus as any,
			rawConfirmDocumentVoid: rawConfirmDocumentVoid as any,
			setError: setError as any,
			documentVoidConfirmation: {
				id: "doc-void-101",
			},
			documentVoidReasonCode: "clerical_error",
			documentVoidReplacementRequired: false,
			documentVoidPatientOrPayerNotified: false,
			documentVoidCorrectionDocumentId: "",
		});

		assert.equal(result.executed, true);
		assert.equal(result.effectiveStaffFullName, "Д-р Смирнов Алексей Владимирович");
		assert.equal(result.effectiveStaffRole, DEFAULT_VOID_STAFF_ROLE);
		assert.equal(result.effectiveReasonText, DEFAULT_VOID_REASON_TEXT);

		assert.equal(setDocumentVoidStaffFullName.calls.length, 1);
		assert.equal(setDocumentVoidStaffFullName.calls[0]?.[0], "Д-р Смирнов Алексей Владимирович");
		assert.equal(setDocumentVoidStaffRole.calls.length, 1);
		assert.equal(setDocumentVoidStaffRole.calls[0]?.[0], DEFAULT_VOID_STAFF_ROLE);
		assert.equal(setDocumentVoidArchivePreserved.calls.length, 1);
		assert.equal(setDocumentVoidArchivePreserved.calls[0]?.[0], true);
		assert.equal(setDocumentVoidStatusReviewed.calls.length, 1);
		assert.equal(setDocumentVoidStatusReviewed.calls[0]?.[0], true);
		assert.equal(setDocumentVoidReasonText.calls.length, 1);
		assert.equal(setDocumentVoidReasonText.calls[0]?.[0], DEFAULT_VOID_REASON_TEXT);

		// Verify updateDocumentStatus was called with full payload including safe defaults
		assert.equal(updateDocumentStatus.calls.length, 1);
		assert.equal(updateDocumentStatus.calls[0]?.[0], "doc-void-101");
		assert.equal(updateDocumentStatus.calls[0]?.[1], "void");
		const payload = updateDocumentStatus.calls[0]?.[2] as any;
		assert.ok(payload && payload.voidAttestation);
		assert.equal(payload.voidAttestation.reasonCode, "clerical_error");
		assert.equal(payload.voidAttestation.reasonText, DEFAULT_VOID_REASON_TEXT);
		assert.equal(payload.voidAttestation.staffFullName, "Д-р Смирнов Алексей Владимирович");
		assert.equal(payload.voidAttestation.staffRole, DEFAULT_VOID_STAFF_ROLE);
		assert.equal(payload.voidAttestation.archivePreserved, true);
		assert.equal(payload.voidAttestation.statusReviewed, true);

		// Modal was closed and any previous error reset
		assert.equal(setDocumentVoidConfirmationId.calls.length, 1);
		assert.equal(setDocumentVoidConfirmationId.calls[0]?.[0], null);
		assert.equal(setError.calls.length, 1);
		assert.equal(setError.calls[0]?.[0], null);
	});

	it("4. Scale sovereignty (Mandate 8n): solo doctor on chair rental gets doctor name as safe default, administrator fallback when no doctor", async () => {
		const setSoloDocName = createMockFn();
		const resultSolo = await executeDocumentVoidAutonomy({
			activeDoctor: { fullName: "Д-р Кузнецов И.М." },
			documentVoidStaffFullName: "",
			setDocumentVoidStaffFullName: setSoloDocName as any,
			documentVoidConfirmation: { id: "doc-1" },
		});
		assert.equal(setSoloDocName.calls.length, 1);
		assert.equal(setSoloDocName.calls[0]?.[0], "Д-р Кузнецов И.М.");
		assert.equal(resultSolo.effectiveStaffFullName, "Д-р Кузнецов И.М.");

		// When activeDoctor is absent (e.g. frontdesk admin session)
		const setAdminName = createMockFn();
		const resultAdmin = await executeDocumentVoidAutonomy({
			activeDoctor: null,
			documentVoidStaffFullName: "   ",
			setDocumentVoidStaffFullName: setAdminName as any,
			documentVoidConfirmation: { id: "doc-2" },
		});
		assert.equal(setAdminName.calls.length, 1);
		assert.equal(setAdminName.calls[0]?.[0], DEFAULT_VOID_STAFF_NAME);
		assert.equal(resultAdmin.effectiveStaffFullName, DEFAULT_VOID_STAFF_NAME);
	});

	it("5. Explicitly entered custom staff and reason values are preserved without overwrite", async () => {
		const setStaffFullName = createMockFn();
		const setStaffRole = createMockFn();
		const setReasonText = createMockFn();
		const updateDocumentStatus = createMockFn().mockResolvedValue(true);

		const result = await executeDocumentVoidAutonomy({
			activeDoctor: { fullName: "Д-р Смирнов А.В." },
			documentVoidStaffFullName: "Петрова Екатерина Сергеевна",
			setDocumentVoidStaffFullName: setStaffFullName as any,
			documentVoidStaffRole: "Старший куратор лечения",
			setDocumentVoidStaffRole: setStaffRole as any,
			documentVoidReasonText:
				"Пациент выбрал альтернативный план протезирования на цирконии",
			setDocumentVoidReasonText: setReasonText as any,
			documentVoidReady: false,
			updateDocumentStatus: updateDocumentStatus as any,
			documentVoidConfirmation: { id: "doc-custom-1" },
		});

		// Custom values must not be overwritten by setter calls
		assert.equal(setStaffFullName.calls.length, 0);
		assert.equal(setStaffRole.calls.length, 0);
		assert.equal(setReasonText.calls.length, 0);

		assert.equal(result.effectiveStaffFullName, "Петрова Екатерина Сергеевна");
		assert.equal(result.effectiveStaffRole, "Старший куратор лечения");
		assert.equal(
			result.effectiveReasonText,
			"Пациент выбрал альтернативный план протезирования на цирконии",
		);

		assert.equal(updateDocumentStatus.calls.length, 1);
		assert.equal(updateDocumentStatus.calls[0]?.[0], "doc-custom-1");
		assert.equal(updateDocumentStatus.calls[0]?.[1], "void");
		const payload = updateDocumentStatus.calls[0]?.[2] as any;
		assert.ok(payload && payload.voidAttestation);
		assert.equal(payload.voidAttestation.staffFullName, "Петрова Екатерина Сергеевна");
		assert.equal(payload.voidAttestation.staffRole, "Старший куратор лечения");
		assert.equal(
			payload.voidAttestation.reasonText,
			"Пациент выбрал альтернативный план протезирования на цирконии",
		);
		assert.equal(payload.voidAttestation.archivePreserved, true);
		assert.equal(payload.voidAttestation.statusReviewed, true);
	});

	it("6. Touch target compliance: buttons, select dropdowns, inputs, and checkbox labels have min-height >= 44px", () => {
		const mockContext = createMockAppLogic({
			documentVoidReady: false,
			documentVoidSaving: false,
		});

		// biome-ignore lint/suspicious/noExplicitAny: AppLogicContextType mock for unit test
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, {
				value: mockContext as any,
				children: createElement(DocumentsView),
			}),
		);

		// Secondary button has min-height: 44px
		assert.match(
			html,
			/<button[^>]*class="secondary-button"[^>]*style="[^"]*min-height:44px[^"]*"[^>]*>Вернуться<\/button>/,
		);

		// Primary button has min-height: 44px
		assert.match(
			html,
			/<button[^>]*class="primary-button"[^>]*style="[^"]*min-height:44px[^"]*"[^>]*>Аннулировать с причиной<\/button>/,
		);

		// Checkbox labels have min-height: 44px
		const checkboxLabelMatches = html.match(
			/<label[^>]*style="[^"]*min-height:44px[^"]*"[^>]*>\s*<input[^>]*type="checkbox"/g,
		);
		assert.ok(checkboxLabelMatches !== null);
		assert.equal(checkboxLabelMatches?.length, 4);
	});
});
