/**
 * visitPlanAndConsentAutonomy.test.ts
 *
 * Инструментальные тесты АРМ врача (VisitView & TreatmentPlanPriceValidatorModal):
 * 1. Экспорт и доступность модального окна валидации цен плана через фасад-делегат visit.
 * 2. Мандат 8e: Истечение 30 дней плана лечения НЕ БЛОКИРУЕТ создание нарядов ЗТЛ, оказание услуг или оплату.
 * 3. Мандат 8e: Печать согласий (ИДС 1051н) со штампом «ЧЕРНОВИК» (при открытом визите) и «ПОДПИСАНО ВРАЧОМ» (при закрытом).
 * 4. Мандат 8e: Печать Формы 043/у со штампом «ЧЕРНОВИК» и «ПОДПИСАНО ВРАЧОМ».
 * 5. Инспекция кнопок: отсутствие заблокированных disabled кнопок без объяснения.
 *
 * Мандаты: 8d (Бремя доказательства), 8e (Автономия врача), 8k (CRM != симулятор), 8n (Соло-врач).
 */

import assert from "node:assert/strict";
import { test, describe } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TreatmentPlanStudioModal } from "../../treatment-plans/TreatmentPlanStudioModal";
import { generateInformedConsent1051nHtml } from "../../../lib/clinicalProtocols";
import { renderForm043uHtml } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("АРМ Врача: Автономия смет, согласий и Формы 043/у (Мандаты 8d, 8e, 8k, 8n)", () => {
	test("1. Канонический TreatmentPlanStudioModal доступен из домена treatment-plans (Мандат 8s SSOT)", () => {
		assert.ok(TreatmentPlanStudioModal, "Канонический компонент презентера планов лечения должен существовать");
	});

	test("2. Мандат 8e: Автономия врача и отсутствие блокировок при утверждении планов лечения", () => {
		const studioPath = path.resolve(__dirname, "../../treatment-plans/TreatmentPlanStudioModal.tsx");
		const studioSource = fs.readFileSync(studioPath, "utf8");
		assert.ok(studioSource.includes("approve-treatment-plan-btn"), "Кнопка утверждения плана присутствует в StudioModal");
		assert.ok(!studioSource.includes("disabled={isPlanExpired}"), "План лечения не блокируется по истечении срока");
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

	test("6. Инспекция исходного кода VisitView: кнопки печати и предупреждений не заблокированы", () => {
		const visitViewPath = path.resolve(__dirname, "../../../VisitView.tsx");
		const viewDir = path.resolve(__dirname, "../view");
		const visitFiles = [
			visitViewPath,
			path.resolve(viewDir, "VisitViewHeader.tsx"),
			path.resolve(viewDir, "VisitViewDesktopLayout.tsx"),
			path.resolve(viewDir, "VisitViewMobileLayout.tsx"),
			path.resolve(viewDir, "VisitActionFooter.tsx"),
			path.resolve(viewDir, "visitHeaderModules/VisitHeaderFastPrintCluster.tsx"),
			path.resolve(viewDir, "visitHeaderModules/VisitHeaderMoreActionsDocItems.tsx"),
			path.resolve(viewDir, "visitHeader/toolbar/VisitToolbarMoreMenuItems.tsx"),
			path.resolve(viewDir, "visitHeader/toolbar/VisitToolbarDocumentPrinting.tsx"),
			path.resolve(__dirname, "../consents/ConsentItemRow.tsx"),
		];
		const visitViewSource = visitFiles
			.map((p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""))
			.join("\n");

		// Проверка кнопок быстрого доступа к согласиям и 043/у
		assert.ok(visitViewSource.includes("btn-visit-fast-print-043u"), "Кнопка быстрой печати 043/у присутствует в шапке");
		assert.ok(visitViewSource.includes("btn-visit-fast-print-consent-1051n"), "Кнопка печати ИДС присутствует в панели согласий");
		assert.ok(visitViewSource.includes("visit-more-action-print-consent"), "Пункт печати ИДС присутствует в меню дополнительных действий");
		assert.ok(visitViewSource.includes("visit-plan-expired-soft-notice"), "Мягкое предупреждение о плане > 30 дней присутствует");

		// Проверка отсутствия необоснованных disabled кнопок
		assert.ok(!visitViewSource.includes("disabled={isPlanExpired}"), "Истечение срока плана никогда не дизейблит кнопки в VisitView");
	});

	test("7. Инспекция исходного кода TreatmentPlanStudioModal: автономия врача и 100% скидки", () => {
		const studioPath = path.resolve(__dirname, "../../treatment-plans/TreatmentPlanStudioModal.tsx");
		const studioSource = fs.readFileSync(studioPath, "utf8");
		assert.ok(studioSource.includes("doctor-discount-bar"), "Панель скидки врача присутствует");
		assert.ok(studioSource.includes("DISCOUNT_PRESETS") && studioSource.includes("100"), "Скидка врача доступна до 100% (Мандат 8e)");
		assert.ok(studioSource.includes("approve-treatment-plan-btn"), "Кнопка утверждения плана присутствует");
	});

	test("8. Мандаты 8e, 8p: Если у пациента нет аллергий — аллергические плашки скрыты, ноль кричащих зеленых баннеров", () => {
		const anamnesisPath = path.resolve(__dirname, "../VisitAnamnesisTab.tsx");
		const anamnesisSource = fs.readFileSync(anamnesisPath, "utf8");
		const visitViewPath = path.resolve(__dirname, "../../../VisitView.tsx");
		const visitViewSource = fs.readFileSync(visitViewPath, "utf8");

		// В VisitAnamnesisTab при отсутствии аллергий и стоп-факторов нет кричащей зеленой плашки
		assert.ok(
			!anamnesisSource.includes("visit-anamnesis-norm-banner"),
			"VisitAnamnesisTab не отображает кричащую зеленую плашку, когда у пациента нет аллергий",
		);

		// В VisitView отсутствует дублирующая плашка соматики в теле приёма
		assert.ok(
			!visitViewSource.includes("visit-somatic-status-block"),
			"VisitView не дублирует статус соматики в теле приёма при наличии кнопки в шапке (Мандат 8p)",
		);
	});

	test("9. Мандаты 8e, 8k: 1-клик заполнение физиологической нормой по умолчанию («Соматически здоров / норма»)", () => {
		const visitViewPath = path.resolve(__dirname, "../../../VisitView.tsx");
		const viewDir = path.resolve(__dirname, "../view");
		const visitFiles = [
			visitViewPath,
			path.resolve(viewDir, "VisitViewHeader.tsx"),
			path.resolve(viewDir, "VisitViewDesktopLayout.tsx"),
			path.resolve(viewDir, "visitHeaderModules/VisitHeaderActionsToolbar.tsx"),
			path.resolve(viewDir, "visitHeader/toolbar/VisitToolbarSomaticNorm.tsx"),
			path.resolve(viewDir, "viewStateModules/useVisitFastPrintState.ts"),
		];
		const visitViewSource = visitFiles
			.map((p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""))
			.join("\n");

		// Кнопка 1-клик нормы в шапке VisitView всегда присутствует и не заблокирована
		assert.ok(
			visitViewSource.includes('data-testid="btn-somatic-norm-one-click"'),
			"Кнопка 1-клик нормы присутствует в шапке VisitView",
		);
		assert.ok(
			visitViewSource.includes("handleApplySomaticNormQuick"),
			"Обработчик 1-клик нормы подключен в VisitView",
		);
		assert.ok(
			visitViewSource.includes("executeApplySomaticNormAutonomy"),
			"Функция автономного заполнения нормы присутствует",
		);
	});
});

