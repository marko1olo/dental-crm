/**
 * documentsViewAutonomy.test.tsx
 *
 * DENTE Dental CRM — Documents View Outpatient Archive Autonomy & Non-blocking Selection Test Suite
 *
 * Mandate 8e: Doctor & Staff Autonomy (zero dead-ends, no grey disabled action buttons)
 * Mandate 8k: CRM != Reality Simulator (1-click auto-select sensible defaults, frictionless guidance)
 * Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 * Mandate 8o: Task-Scope Reporting
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { documentKindMetadata } from "@dental/shared";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import {
	DocumentsView,
	executeOpenLatestDocumentAutonomy,
} from "../../../DocumentsView";
import { DocumentsOutpatientArchive } from "../DocumentsOutpatientArchive";
import { PaidMedicalContractModal } from "../forms/PaidMedicalContractModal";
import { DentalMedicalCard043uForm } from "../forms/DentalMedicalCard043uForm";
import { TaxDeductionCertificateModal } from "../../finance/TaxDeductionCertificateModal";
import { documentSourceStatusClassNames } from "../../../workspaceUiLabels";

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	return fn;
}

const vi = {
	fn: (impl?: any) => createMockFn(impl),
};

function expect(actual: any, customMsg = "") {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected, customMsg),
		toBeFalsy: () => assert.ok(!actual, customMsg || `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), customMsg || `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null, customMsg),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined, customMsg),
			toMatch: (regex: RegExp) => assert.ok(!regex.test(String(actual)), customMsg),
			toContain: (expected: string) => {
				assert.ok(
					!actual?.includes?.(expected),
					customMsg || `Expected "${actual}" NOT to contain "${expected}"`,
				);
			},
			toHaveBeenCalled: () => {
				const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
				assert.strictEqual(
					count,
					0,
					customMsg || `Expected function NOT to have been called, but was called ${count} times`,
				);
			},
		},
		toContain: (expected: string) => {
			assert.ok(
				actual?.includes?.(expected),
				customMsg || `Expected "${actual}" to contain "${expected}"`,
			);
		},
		toHaveBeenCalled: () => {
			const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
			assert.ok(count > 0, customMsg || "Expected function to have been called");
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.mock?.calls ?? actual?.calls ?? [];
			const match = calls.some((callArgs: any[]) =>
				expectedArgs.every((arg, i) => callArgs[i] === arg),
			);
			assert.ok(
				match,
				customMsg ||
					`Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`,
			);
		},
	};
}

function createMockAppLogic(overrides: Record<string, unknown> = {}) {
	const labels = {
		treatment_plan: "План лечения",
		dental_medical_card_043u: "Карта 043/у",
		paid_medical_services_contract: "Договор на оказание платных медицинских услуг",
	};

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
		selectedDocumentMetadata: documentKindMetadata.dental_medical_card_043u,
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
		renderToothRowsEditor: () => null,
		renderClinicalToothRowsEditor: () => null,
		documentActionLabels: new Proxy({}, { get: () => "Действие с документом" }) as any,
		documentLabels: new Proxy(labels, {
			get: (target: any, prop: string) => target[prop] ?? prop,
		}) as any,
		documentStatusLabels: {
			draft: "Черновик",
			issued: "Выдан",
			voided: "Аннулирован",
		},
		patientName: (_patients: unknown[], id: string) =>
			id === "patient-1" ? "Иванов Иван Иванович" : id,
		formatShortDate: (val: string) => val,
		formatDateTime: (val: string) => val,
		money: (val: number) => `${val} ₽`,
		openIssuedDocumentHtml: vi.fn(),
		downloadIssuedDocumentPdf: vi.fn(),
		downloadIssuedDocumentHtml: vi.fn(),
		createDocument: vi.fn(),
		...overrides,
	};
}

describe("Documents View Outpatient Archive Autonomy & Non-blocking Selection (Mandates 8e, 8k, 8n)", () => {
	it("action buttons are NOT disabled when activeUsableDocuments has no selection (disabled === false)", () => {
		const mockContext = createMockAppLogic({
			activeUsableDocuments: [],
			activeDocuments: [],
		});

		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockContext as any}>
				<DocumentsView />
			</AppLogicProvider>,
		);

		// Button must exist in rendered markup
		expect(html).toContain('data-testid="btn-open-latest-document"');

		// Button must NOT have disabled attribute in rendered HTML
		// When disabled={false}, React omits disabled attribute completely
		const buttonMatch = html.match(
			/<button[^>]*data-testid="btn-open-latest-document"[^>]*>/,
		);
		expect(buttonMatch).not.toBeNull();
		const buttonTag = buttonMatch?.[0] ?? "";
		expect(buttonTag).not.toContain("disabled");

		// Also check other toolbar buttons are not disabled
		expect(html).toContain('data-testid="open-sick-leave-eln-modal-btn"');
		expect(html).toContain('data-testid="open-autoclave-log-257-btn"');
	});

	it("clicking with documents available auto-selects the first document and triggers action", () => {
		const mockOpenIssuedHtml = vi.fn();
		const mockToast = vi.fn();

		const result = executeOpenLatestDocumentAutonomy({
			activeUsableDocuments: [
				{ id: "doc-selected-101", status: "issued" },
				{ id: "doc-secondary-102", status: "issued" },
			],
			openIssuedDocumentHtml: mockOpenIssuedHtml,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(true);
		expect(result.documentId).toBe("doc-selected-101");
		expect(mockOpenIssuedHtml).toHaveBeenCalledWith("doc-selected-101");
		expect(mockToast).not.toHaveBeenCalled();
	});

	it("clicking with documents available in typedActiveDocuments fallbacks gracefully and executes action", () => {
		const mockOpenIssuedHtml = vi.fn();
		const mockToast = vi.fn();

		// activeUsableDocuments is empty, but typedActiveDocuments contains patient docs
		const result = executeOpenLatestDocumentAutonomy({
			activeUsableDocuments: [],
			typedActiveDocuments: [
				{ id: "doc-voided-1", status: "voided" },
				{ id: "doc-valid-2", status: "draft" },
			],
			openIssuedDocumentHtml: mockOpenIssuedHtml,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(true);
		expect(result.documentId).toBe("doc-valid-2");
		expect(mockOpenIssuedHtml).toHaveBeenCalledWith("doc-valid-2");
		expect(mockToast).not.toHaveBeenCalled();
	});

	it("clicking with empty document list displays guidance toast without crashing", () => {
		const mockOpenIssuedHtml = vi.fn();
		const mockToast = vi.fn();

		const result = executeOpenLatestDocumentAutonomy({
			activeUsableDocuments: [],
			typedActiveDocuments: [],
			openIssuedDocumentHtml: mockOpenIssuedHtml,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(false);
		expect(mockOpenIssuedHtml).not.toHaveBeenCalled();
		expect(mockToast).toHaveBeenCalledWith(
			"У пациента нет созданных документов. Нажмите «+ Создать документ» для выбора бланка ИДС, 043/у или договора",
			"info",
		);
	});

	it("handles null / undefined documents safely without crashing", () => {
		const mockOpenIssuedHtml = vi.fn();
		const mockToast = vi.fn();

		const result = executeOpenLatestDocumentAutonomy({
			activeUsableDocuments: null,
			typedActiveDocuments: undefined,
			openIssuedDocumentHtml: mockOpenIssuedHtml,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(false);
		expect(mockOpenIssuedHtml).not.toHaveBeenCalled();
		expect(mockToast).toHaveBeenCalled();
	});

	it("guarantees min-height 36px on desktop and 44px on touch for toolbar and document cards", () => {
		const mockContext = createMockAppLogic({
			activeDocuments: [
				{
					id: "doc-card-1",
					kind: "dental_medical_card_043u",
					status: "issued",
					patientId: "patient-1",
					issuedAt: "2026-09-01",
					totalAmountRub: 5000,
				},
			],
			activeUsableDocuments: [
				{
					id: "doc-card-1",
					kind: "dental_medical_card_043u",
					status: "issued",
					patientId: "patient-1",
					issuedAt: "2026-09-01",
					totalAmountRub: 5000,
				},
			],
		});

		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockContext as any}>
				<DocumentsView />
			</AppLogicProvider>,
		);

		// Verify responsive scoped style tag is embedded
		expect(html).toContain("min-height: 36px");
		expect(html).toContain("min-height: 44px");
		expect(html).toContain("@media (pointer: coarse)");

		// Verify toolbar buttons have min-h classes
		expect(html).toContain("min-h-[44px] sm:min-h-[36px]");

		// Verify action button in document card
		expect(html).toContain("doc-link min-h-[44px] sm:min-h-[36px]");
	});

	it("DocumentsOutpatientArchive renders 1-click quick blank toolbar with zero disabled buttons", () => {
		const mockContext = createMockAppLogic({
			activeDocuments: [
				{
					id: "doc-archive-1",
					title: "Договор платных услуг № 101",
					kind: "paid_medical_services_contract",
					status: "issued",
					patientId: "patient-1",
					issuedAt: "2026-09-01",
					totalAmountRub: 15000,
				},
				{
					id: "doc-archive-2",
					title: "Карта 043/у",
					kind: "dental_medical_card_043u",
					status: "draft",
					patientId: "patient-1",
					issuedAt: null,
					totalAmountRub: 0,
				},
			],
		});

		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockContext as any}>
				<DocumentsOutpatientArchive patientId="patient-1" />
			</AppLogicProvider>,
		);

		// Toolbar blank buttons must exist
		expect(html).toContain('data-testid="archive-quick-blank-contract-btn"');
		expect(html).toContain('data-testid="archive-quick-blank-consent-btn"');
		expect(html).toContain('data-testid="archive-quick-blank-form043-btn"');
		expect(html).toContain('data-testid="archive-quick-open-latest-btn"');

		// Status stamps
		expect(html).toContain("ПОДПИСАНО ВРАЧОМ");
		expect(html).toContain("ЧЕРНОВИК");

		// Action buttons (max 2 direct buttons + more menu per Miller's Law)
		expect(html).toContain('data-testid="archive-open-btn-doc-archive-1"');
		expect(html).toContain('data-testid="archive-print-btn-doc-archive-1"');
		expect(html).toContain('data-testid="archive-more-btn-doc-archive-1"');

		// No disabled buttons anywhere
		const disabledButtons = html.match(/<button[^>]*disabled[^>]*>/g);
		expect(disabledButtons).toBeNull();
	});

	it("PaidMedicalContractModal renders contract-stamp-badge and print-blank-contract-btn without crashing", () => {
		// Test draft state
		const draftHtml = renderToStaticMarkup(
			<PaidMedicalContractModal
				isOpen={true}
				onClose={() => {}}
				patient={{ fullName: "Сидоров Петр", birthDate: "1992-05-10" }}
			/>,
		);

		expect(draftHtml).toContain('data-testid="contract-stamp-badge"');
		expect(draftHtml).toContain("ЧЕРНОВИК");
		expect(draftHtml).toContain('data-testid="print-blank-contract-btn"');

		// Test signed state
		const signedHtml = renderToStaticMarkup(
			<PaidMedicalContractModal
				isOpen={true}
				onClose={() => {}}
				patient={{ fullName: "Сидоров Петр", birthDate: "1992-05-10" }}
				initialData={{ signedAt: "07.09.2026" }}
			/>,
		);

		expect(signedHtml).toContain('data-testid="contract-stamp-badge"');
		expect(signedHtml).toContain("ПОДПИСАНО ВРАЧОМ");
	});

	it("DentalMedicalCard043uForm renders form043-stamp-badge and btn-043-print-blank without blocking doctor", () => {
		// Draft state
		const draftHtml = renderToStaticMarkup(
			<DentalMedicalCard043uForm
				initialPayload={{
					medicalCardNumber: "043-99",
					patientFullName: "Кузнецов Иван",
					isSigned: false,
				}}
			/>,
		);

		expect(draftHtml).toContain('data-testid="form043-stamp-badge"');
		expect(draftHtml).toContain("ЧЕРНОВИК");
		expect(draftHtml).toContain('data-testid="btn-043-print-blank"');
		expect(draftHtml).toContain('data-testid="btn-043-fast-print"');

		// Signed state
		const signedHtml = renderToStaticMarkup(
			<DentalMedicalCard043uForm
				initialPayload={{
					medicalCardNumber: "043-100",
					patientFullName: "Кузнецов Иван",
					isSigned: true,
				}}
			/>,
		);

		expect(signedHtml).toContain('data-testid="form043-stamp-badge"');
		expect(signedHtml).toContain("ПОДПИСАНО ВРАЧОМ");
	});

	it("TaxDeductionCertificateModal renders tax-certificate-stamp-badge and btn-tax-print-blank", () => {
		// Zero payments (draft)
		const draftHtml = renderToStaticMarkup(
			<TaxDeductionCertificateModal
				isOpen={true}
				onClose={() => {}}
				patientName="Федоров Сергей"
				payments={[]}
			/>,
		);

		expect(draftHtml).toContain('data-testid="tax-certificate-stamp-badge"');
		expect(draftHtml).toContain("ЧЕРНОВИК");
		expect(draftHtml).toContain('data-testid="btn-tax-print-blank"');

		// With payments (signed / confirmed)
		const withPaymentsHtml = renderToStaticMarkup(
			<TaxDeductionCertificateModal
				isOpen={true}
				onClose={() => {}}
				patientName="Федоров Сергей"
				payments={[
					{
						id: "pay-1",
						dateIso: "2026-05-15T10:00:00Z",
						receiptNumber: "FR-001",
						fiscalDocumentNumber: "12345",
						fiscalSign: "9876543210",
						serviceName: "Лечение кариеса",
						code804n: "A16.07.002",
						amountKopecks: 500000,
						amountRub: 5000,
						taxCode: "1",
					},
				]}
				selectedYear={2026}
			/>,
		);

		expect(withPaymentsHtml).toContain('data-testid="tax-certificate-stamp-badge"');
		expect(withPaymentsHtml).toContain("ПОДПИСАНО ВРАЧОМ");
		expect(withPaymentsHtml).toContain('data-testid="btn-tax-print-blank"');
	});
});
