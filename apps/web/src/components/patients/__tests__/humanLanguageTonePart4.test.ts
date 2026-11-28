import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PERIO_PATHOLOGY_PRESETS } from "../../../lib/protocols/perioAndHygieneProtocols";
import { POST_OP_PATIENT_MEMOS } from "../../../lib/protocols/patientMemosAndPhoto";
import { MedicalRecordStudioModal } from "../../emr/MedicalRecordStudioModal";
import { RecordNewDiaryInlineForm } from "../../emr/record/tabs/RecordNewDiaryInlineForm";
import { ConsentPackageBatchBanner } from "../../visit/consents/ConsentPackageBatchBanner";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	validatePatientDraftWithRequirements,
} from "../patientFieldRequirementsConfig";
import { PatientPassportAddressStep } from "../patientCreation/PatientPassportAddressStep";

describe("Red Team Inquisition: Human Clinical Language (Part 4: EMR, Protocols, Consents)", () => {
	it("16. MedicalRecordStudioModal uses human EMR language without raw 'ЕГИСЗ СЭМД'", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		let html = "";
		try {
			html = renderToStaticMarkup(
				React.createElement(MedicalRecordStudioModal, {
					isOpen: true,
					onClose: () => {},
				}),
			);
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
		assert.equal(html.includes("ЕГИСЗ СЭМД (XML)"), false);
		assert.equal(html.includes("СЭМД 834н"), false);
		assert.ok(html.includes("Подписать карту") || html.includes("Обзор и печать A4"));
	});

	it("17. PatientPassportAddressStep & patientFieldRequirementsConfig avoid raw ЕГИСЗ/РЭМД acronyms", () => {
		const htmlOpen = renderToStaticMarkup(
			React.createElement(PatientPassportAddressStep, {
				fieldRequirements: { ...DEFAULT_PATIENT_FIELD_REQUIREMENTS, requireSnils: true },
				validationErrors: {},
				isMinorUnder14: false,
				showDocFields: true,
				onToggleDocFields: () => {},
				snils: "",
				onSnilsChange: () => {},
				insurancePolicyNumber: "",
				onInsurancePolicyNumberChange: () => {},
				identityDocument: "",
				onIdentityDocumentChange: () => {},
				registrationAddress: "",
				onRegistrationAddressChange: () => {},
			}),
		);
		assert.equal(htmlOpen.includes("* (ЕГИСЗ)"), false);
		assert.equal(htmlOpen.includes("в ЕГИСЗ (РЭМД)"), false);
		assert.ok(htmlOpen.includes("СНИЛС"));

		const validation = validatePatientDraftWithRequirements(
			{ fullName: "Иванов И.", phone: "+7 (999) 111-22-33", snils: "" },
			{ ...DEFAULT_PATIENT_FIELD_REQUIREMENTS, requireSnils: true },
		);
		assert.equal(validation.isValid, true);
		assert.ok(validation.missingRequiredLabels.includes("СНИЛС"));
		assert.ok(validation.guidanceMessage?.includes("не блокируют регистрацию"));
	});

	it("18. RecordNewDiaryInlineForm renders physiological norm title without bare 'Санация'", () => {
		const html = renderToStaticMarkup(
			React.createElement(RecordNewDiaryInlineForm, {
				selectedTooth: "16",
				setSelectedTooth: () => {},
				commonTeeth: [11, 16, 26, 36, 46],
				subjective: "",
				setSubjective: () => {},
				objective: "",
				setObjective: () => {},
				diagnosisText: "",
				setDiagnosisText: () => {},
				icd10Code: "Z01.2",
				setIcd10Code: () => {},
				protocol: "",
				setProtocol: () => {},
				onApplyNorm: () => {},
				onClear: () => {},
				onSave: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-inline-diary-norm"'));
		assert.ok(html.includes("Физиологическая норма: интактный ряд"));
		assert.equal(html.includes('title="Санация"'), false);
	});

	it("19. clinicalProtocols catalogs use protocol badges instead of 043/у", () => {
		const badges = POST_OP_PATIENT_MEMOS.map((m) => m.badge);
		assert.equal(badges.includes("Хирургия 043/у"), false);
		assert.equal(badges.includes("Терапия 043/у"), false);
		assert.equal(badges.includes("Эндодонтия 043/у"), false);
		assert.ok(badges.includes("Хирургический протокол"));
		assert.ok(badges.includes("Терапевтический протокол"));
		assert.ok(badges.includes("Эндодонтический протокол"));

		const perioIntact = PERIO_PATHOLOGY_PRESETS.find((p) => p.id === "perio_intact");
		assert.ok(perioIntact);
		assert.ok(
			perioIntact.treatmentDescription.includes(
				"Полное лечение и гигиена. Плановый профосмотр через 6 месяцев.",
			),
		);
	});

	it("20. ConsentPackageBatchBanner renders humanized 'каталог согласий на лечение'", () => {
		const html = renderToStaticMarkup(
			React.createElement(ConsentPackageBatchBanner, {
				unsignedRequiredItems: [
					{
						key: "CONSENT_INSPECTION_1051N",
						title: "Осмотр полости рта",
					} as never,
				],
				onPrintTodayPackage: () => {},
				onMarkAllRequiredTodaySigned: () => {},
				onOpenInformedConsentModal: () => {},
			}),
		);
		assert.equal(html.includes("каталог бланков ИДС"), false);
		assert.ok(html.includes("каталог согласий на лечение"));
		assert.ok(html.includes("Требуется оформить 1 согласие"));
	});
});
