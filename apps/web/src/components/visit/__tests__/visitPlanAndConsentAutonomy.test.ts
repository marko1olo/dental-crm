/**
 * visitPlanAndConsentAutonomy.test.ts
 *
 * Инструментальные тесты АРМ врача:
 * 1. Канонический TreatmentPlanStudioModal + StudioModalFooter + DoctorDiscountPresetsList.
 * 2. Мандат 8e: Печать согласий (ИДС 1051н) и Формы 043/у со штампом «ЧЕРНОВИК» и «ПОДПИСАНО ВРАЧОМ».
 * 3. VisitHeaderFastPrintCluster, VisitHeaderMoreActionsDocItems, VisitAnamnesisTab, executeApplySomaticNormAutonomy.
 */

import assert from "node:assert/strict";
import { test, describe } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { TreatmentPlanStudioModal } from "../../treatment-plans/TreatmentPlanStudioModal";
import { StudioModalFooter } from "../../treatment-plans/studioModules/StudioModalFooter";
import { DoctorDiscountPresetsList } from "../billing/DoctorDiscountPresetsList";
import { VisitAnamnesisTab } from "../VisitAnamnesisTab";
import { VisitHeaderFastPrintCluster } from "../view/visitHeaderModules/VisitHeaderFastPrintCluster";
import { VisitHeaderMoreActionsDocItems } from "../view/visitHeaderModules/VisitHeaderMoreActionsDocItems";
import { executeApplySomaticNormAutonomy } from "../view/visitViewAutonomyActions";
import { generateInformedConsent1051nHtml } from "../../../lib/clinicalProtocols";
import { renderForm043uHtml } from "@dental/shared";

describe("АРМ Врача: Автономия смет, согласий и Формы 043/у (Мандаты 8d, 8e, 8k, 8n)", () => {
	test("1. Канонический TreatmentPlanStudioModal доступен из домена treatment-plans (Мандат 8s SSOT)", () => {
		assert.ok(TreatmentPlanStudioModal, "Канонический компонент презентера планов лечения должен существовать");
	});

	test("2. Мандат 8e: Автономия врача и отсутствие блокировок в StudioModalFooter", () => {
		const html = renderToStaticMarkup(
			React.createElement(StudioModalFooter, {
				sanitizedActiveTitle: "Оптимум",
				activeTierTotalRub: 45000,
				handleSaveDraft: () => {},
				handleApprove: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="approve-treatment-plan-btn"'), "Кнопка утверждения плана рендерится в StudioModalFooter");
		assert.equal(/<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i.test(html), false, "План лечения не блокирует кнопки");
	});

	test("3. Мандат 8e: Печать ИДС 1051н со штампом «ЧЕРНОВИК» при открытом приёме", () => {
		const draftConsentHtml = generateInformedConsent1051nHtml({
			patientFullName: "Иванов Иван Иванович",
			doctorFullName: "Д-р Петров П. С.",
			isClosed: false,
			isSigned: false,
		});

		assert.ok(draftConsentHtml.includes("ЧЕРНОВИК"), "В незакрытом визите ИДС печатается со штампом ЧЕРНОВИК");
		assert.ok(draftConsentHtml.includes("Приказ Минздрава РФ № 1051н"), "ИДС соответствует Приказу 1051н");
		assert.ok(draftConsentHtml.includes("Иванов Иван Иванович"), "ФИО пациента выведено в бланк");
	});

	test("4. Мандат 8e: Печать ИДС 1051н со штампом «ПОДПИСАНО ВРАЧОМ» при закрытом/подписанном приёме", () => {
		const signedConsentHtml = generateInformedConsent1051nHtml({
			patientFullName: "Иванов Иван Иванович",
			doctorFullName: "Д-р Петров П. С.",
			isClosed: true,
			isSigned: true,
		});

		assert.ok(signedConsentHtml.includes("ПОДПИСАНО ВРАЧОМ"), "В закрытом визите ИДС печатается со штампом ПОДПИСАНО ВРАЧОМ");
		assert.ok(!signedConsentHtml.includes("ЧЕРНОВИК"), "В подписанном визите штамп ЧЕРНОВИК отсутствует");
	});

	test("5. Мандат 8e: Печать Формы 043/у со штампом «ЧЕРНОВИК» и «ПОДПИСАНО ВРАЧОМ»", () => {
		const draft043Html = renderForm043uHtml({
			medicalCardNumber: "043-001",
			patientFullName: "Сергеева Анна Павловна",
			isClosed: false,
			watermarkText: "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП",
		});
		assert.ok(draft043Html.includes("ЧЕРНОВИК"), "Карта 043/у черновика содержит штамп ЧЕРНОВИК");

		const signed043Html = renderForm043uHtml({
			medicalCardNumber: "043-001",
			patientFullName: "Сергеева Анна Павловна",
			isClosed: true,
			watermarkText: "ПОДПИСАНО ВРАЧОМ",
		});
		assert.ok(signed043Html.includes("ПОДПИСАНО ВРАЧОМ"), "Подписанная карта 043/у содержит штамп ПОДПИСАНО ВРАЧОМ");
	});

	test("6. Кластер быстрой печати и меню документов VisitView рендерят кнопки без блокировок", () => {
		const clusterHtml = renderToStaticMarkup(
			React.createElement(VisitHeaderFastPrintCluster, {
				handlePrintMedicalCardFast: () => {},
				handlePrintCompletedActFast: () => {},
				handlePrintEstimateFast: () => {},
			}),
		);
		const menuHtml = renderToStaticMarkup(
			React.createElement(VisitHeaderMoreActionsDocItems, {
				onCloseMenu: () => {},
				handlePrintForm043uFast: () => {},
				handlePrintInformedConsentFast: () => {},
			}),
		);
		assert.ok(clusterHtml.includes('data-testid="btn-visit-fast-print-card"'));
		assert.ok(menuHtml.includes('data-testid="visit-more-action-print-medical-card"'));
		assert.equal(/<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i.test(clusterHtml + menuHtml), false);
	});

	test("7. DoctorDiscountPresetsList предоставляет врачу пресеты скидок до 100% (Мандат 8e)", () => {
		const html = renderToStaticMarkup(
			React.createElement(DoctorDiscountPresetsList, {
				isGlobalWarranty100: false,
				globalDiscountPercent: 0,
				onSelectPreset: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-discount-preset-100"'), "Скидка врача доступна до 100%");
	});

	test("8. Мандаты 8e, 8p: VisitAnamnesisTab скрывает кричащую зелёную плашку при отсутствии аллергий", () => {
		const mockAppLogic = {
			activePatient: { id: "pt-1", fullName: "Тестов И.И.", allergies: [] },
			dashboard: { patients: [] },
			updateVisitNoteField: () => {},
		} as unknown as AppLogicContextType;

		const html = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: mockAppLogic },
				React.createElement(VisitAnamnesisTab, {}),
			),
		);
		assert.ok(html.includes('data-testid="visit-anamnesis-tab"'));
		assert.equal(html.includes("visit-anamnesis-norm-banner"), false, "Нет кричащей зелёной плашки при норме");
	});

	test("9. Мандаты 8e, 8k: executeApplySomaticNormAutonomy заполняет соматическую норму", () => {
		const patches: Array<{ field: string; value: string }> = [];
		executeApplySomaticNormAutonomy({
			updateVisitNoteField: (field, value) => patches.push({ field, value: String(value ?? "") }),
			onShowToast: () => {},
		});
		const anamnesisPatch = patches.find((p) => p.field === "anamnesis");
		const objectivePatch = patches.find((p) => p.field === "objectiveStatus");
		assert.ok(anamnesisPatch && anamnesisPatch.value.includes("Соматически здоров"));
		assert.ok(objectivePatch && objectivePatch.value.length > 0);
	});
});
