import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Patient } from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	taxApplicationDeliveryChannelOptions,
	taxApplicationFormOptions,
	taxApplicationRelationshipOptions,
} from "../AppConstants";
import {
	normalizedTaxApplicationDeliveryChannel,
	normalizedTaxApplicationForm,
	normalizedTaxApplicationRelationshipSelect,
} from "../AppHelpers";
import { appendChipToText } from "../components/documents/documentChipText";
import { MedicalInterventionRefusalForm } from "../components/documents/forms/MedicalInterventionRefusalForm";
import { PaidServiceContractForm } from "../components/documents/forms/PaidServiceContractForm";
import { TaxDeductionApplicationForm } from "../components/documents/forms/TaxDeductionApplicationForm";
import { TreatmentCostEstimateForm } from "../components/documents/forms/TreatmentCostEstimateForm";
import { DocumentFormSwitch } from "../components/documents/tabs/DocumentFormSwitch";
import { AppLogicProvider, type AppLogicContextType } from "../contexts/AppLogicContext";
import { DocumentsView, DENTAL_MEDICAL_CARD_KIND } from "../DocumentsView";

const mockPatient: Patient = {
	id: "pat-doc-1",
	organizationId: "org-1",
	status: "active",
	fullName: "Николаев Дмитрий Сергеевич",
	phone: "+7 (999) 555-12-34",
	email: null,
	notes: null,
	gender: "male",
	birthDate: "1991-07-20",
	balanceRub: 0,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseContext = {
	dashboard: {
		patients: [mockPatient],
		staff: [],
		appointments: [],
		payments: [],
		clinicSettings: { profile: { clinicName: "ДЕНТЕ Клиника" } },
	},
	activePatient: mockPatient,
	activeDoctor: { id: "doc-1", fullName: "Соколов Алексей Викторович", specialty: "Терапевт" },
	activeDocuments: [],
	activeUsableDocuments: [],
	selectedPatient: mockPatient,
	auth: {
		currentUser: { name: "Соколов А.В." },
		denteClinicalReadHeaders: () => ({}),
		denteClinicalMutationHeaders: () => ({}),
	},
} as unknown as AppLogicContextType;

describe("DocumentsView Decomposition & Live Form Routing (6G SUT)", () => {
	it("1. DocumentsView renders desktop and mobile containers for both empty and populated patient states", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		try {
			const populatedHtml = renderToStaticMarkup(
				React.createElement(
					AppLogicProvider,
					{ value: baseContext },
					React.createElement(DocumentsView, {
						activePatient: mockPatient,
						activeDoctor: { id: "doc-1", fullName: "Соколов Алексей Викторович" },
						activeDocuments: [],
					}),
				),
			);
			assert.ok(populatedHtml.includes('id="documents"'));
			assert.ok(populatedHtml.includes("desktop-documents-experience"));
			assert.ok(populatedHtml.includes("mobile-documents-hub-wrapper"));
			assert.equal(DENTAL_MEDICAL_CARD_KIND, "dental_medical_card");

			const emptyHtml = renderToStaticMarkup(
				React.createElement(
					AppLogicProvider,
					{ value: { ...baseContext, activePatient: null, selectedPatient: null } as unknown as AppLogicContextType },
					React.createElement(DocumentsView, { activePatient: null, activeDocuments: [] }),
				),
			);
			assert.ok(emptyHtml.includes('id="documents"'));
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});

	it("2. appendChipToText formats empty, whitespace-padded, and existing text cleanly", () => {
		assert.equal(appendChipToText("", "Кариес дентина"), "Кариес дентина");
		assert.equal(appendChipToText("   ", "Пульпит"), "Пульпит");
		assert.equal(appendChipToText("Острая боль  ", "Отёк десны"), "Острая боль, отёк десны");
	});

	it("3. DocumentFormSwitch routes extracted contract, refusal, estimate, and tax deduction forms", () => {
		const contractHtml = renderToStaticMarkup(
			React.createElement(DocumentFormSwitch, {
				selectedDocumentKind: "paid_service_contract",
				activePatient: mockPatient,
				activeDoctor: { id: "doc-1", fullName: "Соколов Алексей Викторович" } as never,
				paidContractTotalRubValue: () => 12500,
				money: (v) => `${v ?? 0} ₽`,
			}),
		);
		assert.ok(contractHtml.includes("Николаев Дмитрий Сергеевич"));
		assert.ok(contractHtml.includes("12500 ₽"));

		const refusalHtml = renderToStaticMarkup(
			React.createElement(DocumentFormSwitch, {
				selectedDocumentKind: "medical_intervention_refusal",
				activeDoctor: { id: "doc-1", fullName: "Соколов Алексей Викторович" } as never,
				inferredTreatmentArea: "Зуб 36",
			}),
		);
		assert.ok(refusalHtml.includes("document-payload-card"));

		const estimateHtml = renderToStaticMarkup(
			React.createElement(TreatmentCostEstimateForm, {
				activeDoctorFullName: "Соколов Алексей Викторович",
				treatmentEstimatePatientOrPayerFullNameValue: () => "Николаев Дмитрий Сергеевич",
				treatmentEstimateTotalRubValue: () => 45000,
				treatmentEstimateTreatmentBasisValue: () => "Восстановление коронки",
				money: (v) => `${v ?? 0} ₽`,
			}),
		);
		assert.ok(estimateHtml.includes("45000 ₽"));
		assert.ok(estimateHtml.includes("Восстановление коронки"));

		const taxHtml = renderToStaticMarkup(
			React.createElement(TaxDeductionApplicationForm, {
				relationshipOptions: taxApplicationRelationshipOptions,
				formOptions: taxApplicationFormOptions,
				deliveryChannelOptions: taxApplicationDeliveryChannelOptions,
				normalizeRelationship: normalizedTaxApplicationRelationshipSelect,
				normalizeForm: normalizedTaxApplicationForm,
				normalizeDeliveryChannel: normalizedTaxApplicationDeliveryChannel,
				patientName: "Николаев Дмитрий Сергеевич",
			}),
		);
		assert.ok(taxHtml.includes("Заявитель / налогоплательщик"));

		const directRefusal = renderToStaticMarkup(
			React.createElement(MedicalInterventionRefusalForm, {
				activeDoctorFullName: "Соколов Алексей Викторович",
				activeVisitComplaint: "Острая боль",
			}),
		);
		assert.ok(directRefusal.includes("Соколов Алексей Викторович"));
		assert.ok(
			renderToStaticMarkup(
				React.createElement(PaidServiceContractForm, {
					documentPatientFullName: "Николаев Дмитрий Сергеевич",
					totalRubValue: 5000,
					totalRubFormatted: "5 000 ₽",
				}),
			).includes("5 000 ₽"),
		);
	});
});
