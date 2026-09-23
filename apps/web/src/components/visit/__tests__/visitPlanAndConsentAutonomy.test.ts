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
import test, { describe } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TreatmentPlanPriceValidatorModal as VisitValidatorModal } from "../TreatmentPlanPriceValidatorModal";
import { TreatmentPlanPriceValidatorModal as CanonicalValidatorModal } from "../../treatment-plans/validation/TreatmentPlanPriceValidatorModal";
import { validateTreatmentPlanPrices } from "../../treatment-plans/validation/planPriceValidationEngine";
import {
	PLAN_PRICE_POLICY_PRESETS,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
} from "../../treatment-plans/validation/planPriceValidationPresets";
import { generateInformedConsent1051nHtml } from "../../../lib/clinicalProtocols043";
import { renderForm043uHtml } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("АРМ Врача: Автономия смет, согласий и Формы 043/у (Мандаты 8d, 8e, 8k, 8n)", () => {
	test("1. Фасад-делегат visit/TreatmentPlanPriceValidatorModal идентичен каноническому компоненту", () => {
		assert.ok(VisitValidatorModal, "Visit-фасад модального окна должен существовать");
		assert.strictEqual(
			VisitValidatorModal,
			CanonicalValidatorModal,
			"Фасад должен напрямую реэкспортировать канонический компонент без дублирования",
		);
	});

	test("2. Мандат 8e: Срок плана > 30 дней НЕ БЛОКИРУЕТ создание нарядов ЗТЛ или оплату", () => {
		const expiredDateIso = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
		const expiredPlan = {
			...SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
			createdAtIso: expiredDateIso,
			items: SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items.slice(0, 3),
		};

		const report = validateTreatmentPlanPrices(
			expiredPlan,
			SAMPLE_CURRENT_PRICELIST,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
		);

		assert.strictEqual(report.isPlanExpired, true, "План старше 30 дней помечается как expired");
		assert.ok(report.planAgeDays >= 40, "Возраст плана корректно рассчитан");
		assert.strictEqual(report.canGenerateWorkOrder, true, "Создание нарядов ЗТЛ разрешено (true)");
		assert.strictEqual(report.canGenerateCompletedAct, true, "Формирование акта выполненных работ разрешено (true)");
		assert.strictEqual(report.overallStatus, "APPROVED_PRICE_LOCKED", "Статус сметы зафиксирован по гарантии");
		assert.ok(
			report.validationMessages.some((msg) => msg.includes("не блокируются")),
			"Информационное сообщение подтверждает отсутствие блокировок для врача",
		);
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
		const visitViewSource = fs.readFileSync(visitViewPath, "utf8");

		// Проверка кнопок быстрого доступа к согласиям и 043/у
		assert.ok(visitViewSource.includes("btn-visit-fast-print-043u"), "Кнопка быстрой печати 043/у присутствует в шапке");
		assert.ok(visitViewSource.includes("btn-visit-fast-print-consent-1051n"), "Кнопка печати ИДС присутствует в панели согласий");
		assert.ok(visitViewSource.includes("visit-more-action-print-consent"), "Пункт печати ИДС присутствует в меню дополнительных действий");
		assert.ok(visitViewSource.includes("visit-plan-expired-soft-notice"), "Мягкое предупреждение о плане > 30 дней присутствует");

		// Проверка отсутствия необоснованных disabled кнопок
		assert.ok(!visitViewSource.includes("disabled={isPlanExpired}"), "Истечение срока плана никогда не дизейблит кнопки в VisitView");
	});

	test("7. Инспекция исходного кода TreatmentPlanPriceValidatorModal: мягкое предупреждение и автономия врача", () => {
		const validatorPath = path.resolve(
			__dirname,
			"../../treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx",
		);
		const validatorSource = fs.readFileSync(validatorPath, "utf8");

		assert.ok(validatorSource.includes("validator-expired-unblocked-badge"), "Бейдж истечения плана присутствует");
		assert.ok(validatorSource.includes("validator-plan-expired-soft-banner"), "Мягкий баннер без блокировок присутствует");
		assert.ok(validatorSource.includes("btn-doctor-autonomy-approve"), "Кнопка автономии врача в 1 клик присутствует");
		assert.ok(validatorSource.includes("btn-generate-lab-work-order"), "Кнопка создания наряда ЗТЛ присутствует");
		assert.ok(validatorSource.includes("btn-generate-completed-act"), "Кнопка формирования акта присутствует");
	});
});
