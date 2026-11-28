import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MedicalRecordStudioModal } from "../../emr/MedicalRecordStudioModal";
import { RecordHeaderMoreMenu } from "../../emr/record/RecordHeaderMoreMenu";
import { ImplantActionButtons } from "../../radiology/mpr/workspaces/modules/implant/ImplantActionButtons";
import { ImplantRidgeMorphometryCard } from "../../radiology/mpr/workspaces/modules/implant/ImplantRidgeMorphometryCard";
import { DoctorForm043TemplatesSection } from "../../settings/doctor/DoctorForm043TemplatesSection";
import { DoctorMaterialsCatalogSection } from "../../settings/doctor/DoctorMaterialsCatalogSection";
import { DoctorMaterialsLiveSnippetCard } from "../../settings/doctor/materials/DoctorMaterialsLiveSnippetCard";
import { VisitRecommendationsSection } from "../../visit/summaryModal/VisitRecommendationsSection";

describe("Red Team Inquisition: Human Clinical Language (Part 3: Protocols, Templates, Imaging)", () => {
	it("11. MedicalRecordStudioModal renders clinical Russian UI without bureaucratic 'Форма 043/у'", () => {
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
		assert.equal(html.includes("Форма 043/у"), false);
		assert.equal(html.includes("(Subjective)"), false);
		assert.equal(html.includes("(Status localis)"), false);
		assert.ok(html.includes("Обзор и печать A4"));
		assert.ok(html.includes("1. Паспортная часть"));
		assert.ok(html.includes("4. Дневники визитов"));
	});

	it("12. Doctor Templates & Materials Catalog render human labels without 043/у bloat", () => {
		const tplHtml = renderToStaticMarkup(
			React.createElement(DoctorForm043TemplatesSection),
		);
		assert.equal(tplHtml.includes("Тестовый диагноз МКБ-10:"), false);
		assert.ok(tplHtml.includes("Тестовый диагноз:"));

		const matHtml = renderToStaticMarkup(
			React.createElement(DoctorMaterialsCatalogSection),
		);
		const snippetHtml = renderToStaticMarkup(
			React.createElement(DoctorMaterialsLiveSnippetCard, {
				liveSoapSnippet: "Реставрация: нанокомпозит",
				onCopy: () => {},
			}),
		);
		assert.equal(matHtml.includes("(Форма 043/у)"), false);
		assert.ok(
			snippetHtml.includes("Автоматический фрагмент протокола для медкарты с вашими материалами"),
		);
		assert.ok(
			snippetHtml.includes("Скопировать готовый текст для медкарты"),
		);
	});

	it("13. ImplantActionButtons & ImplantRidgeMorphometryCard render human clinical wording instead of 043/у", () => {
		const btnsHtml = renderToStaticMarkup(
			React.createElement(ImplantActionButtons, {
				handleExportToPlan: () => {},
				handleExportToEmr: () => {},
			}),
		);
		assert.ok(btnsHtml.includes("В медкарту"));
		assert.equal(btnsHtml.includes("В медкарту 043/у"), false);

		const morphHtml = renderToStaticMarkup(
			React.createElement(ImplantRidgeMorphometryCard, {
				ridgeWidths: { w2: 6.2, w4: 7.4, w6: 8.8, h: 12.5, isAdequate: true, isDetected: true },
				selectedDiameterMm: 4.0,
				selectedLengthMm: 10.0,
				edentulousTooth: 26,
				setEdentulousTooth: () => {},
				isEditing043: false,
				setIsEditing043: () => {},
				edited043Text: "",
				setEdited043Text: () => {},
				edentulousData: {
					toothFdi: 26,
					width2mm: 6.2,
					width4mm: 7.4,
					width6mm: 8.8,
					heightMm: 12.5,
				} as never,
				resolvedPatient: "Иванов И.И.",
				handleExportToEmr: () => {},
			}),
		);
		assert.equal(morphHtml.includes("Текст 043/у"), false);
		assert.equal(morphHtml.includes("В 043/у"), false);
		assert.ok(morphHtml.includes("Текст протокола"));
		assert.ok(morphHtml.includes("В медкарту"));

		const morphEditingHtml = renderToStaticMarkup(
			React.createElement(ImplantRidgeMorphometryCard, {
				ridgeWidths: { w2: 6.2, w4: 7.4, w6: 8.8, h: 12.5, isAdequate: true, isDetected: true },
				selectedDiameterMm: 4.0,
				selectedLengthMm: 10.0,
				edentulousTooth: 26,
				setEdentulousTooth: () => {},
				isEditing043: true,
				setIsEditing043: () => {},
				edited043Text: "Протокол гребня",
				setEdited043Text: () => {},
				edentulousData: {
					toothFdi: 26,
					width2mm: 6.2,
					width4mm: 7.4,
					width6mm: 8.8,
					heightMm: 12.5,
				} as never,
				resolvedPatient: "Иванов И.И.",
			}),
		);
		assert.equal(morphEditingHtml.includes("Редактирование протокола 043/у"), false);
		assert.ok(morphEditingHtml.includes("Редактирование протокола (Иванов И.И.)"));
	});

	it("14. VisitRecommendationsSection renders humanized diary synthesis copy", () => {
		const recHtml = renderToStaticMarkup(
			React.createElement(VisitRecommendationsSection, {
				diary: {
					complaints: "",
					objectiveStatus: "",
					diagnosisIcd10: "K02.1",
					statusLocalis: "",
					treatmentPlan: "",
				} as never,
				abnormalTeeth: [],
				onScheduleNextStage: () => {},
				onOpenProtocolGenerator: () => {},
				onOpenMemoModal: () => {},
			}),
		);
		assert.equal(recHtml.includes("1-Click Синтез дневника по МКБ-10 и формуле"), false);
		assert.ok(recHtml.includes("Заполнение дневника по диагнозу и формуле"));
	});

	it("15. RecordHeaderMoreMenu renders clean export menu trigger without raw 'СЭМД ЕГИСЗ'", () => {
		const menuHtml = renderToStaticMarkup(
			React.createElement(RecordHeaderMoreMenu, {
				copiedToast: false,
				onExportXml: () => {},
				onExportJson: () => {},
				onCopyText: () => {},
			}),
		);
		assert.ok(menuHtml.includes('data-testid="btn-emr-more-actions"'));
		assert.equal(menuHtml.includes("СЭМД ЕГИСЗ"), false);
	});
});
