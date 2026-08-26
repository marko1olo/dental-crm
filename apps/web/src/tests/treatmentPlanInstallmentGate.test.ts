/**
 * treatmentPlanInstallmentGate.test.ts — Unit-тесты финансового шлюза ЗТЛ и банковской рассрочки DENTE CRM.
 * 
 * ПРОВЕРЯЕМЫЕ НОРМАТИВНЫЕ И ФИНАНСОВЫЕ ИНВАРИАНТЫ:
 * • Финансовый шлюз нарядов ЗТЛ (50% аванс за этап):
 *   - Порог блокировки: оплачено < 50% этапа -> BLOCKED_REQUIRES_ADVANCE.
 *   - Полнота покрытия: сумма внесенного аванса + свободный депозит пациента.
 *   - Точный расчет недостающего аванса в целых копейках (Kopecks).
 *   - Авторизация оверрайда Главного врача -> CHIEF_DOCTOR_OVERRIDE.
 * • Банковская рассрочка (Сбер, Т-Банк, Подели BNPL, Яндекс Сплит):
 *   - Kopeck-exact деление на доли без потери остатка (sum(parts) === total).
 *   - Честная рассрочка 0% переплаты для пациента.
 *   - Корректность 4-этапного графика «Подели» (25% + 25% + 25% + 25%).
 *   - Валидация лимитов минимальной и максимальной суммы.
 *   - Генерация deep-link ссылок и QR-пейлоадов.
 *   - Имитация банковского скоринга и одобрения.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	percentageOfKopecks,
	rublesToKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	type DentalLabFinancialGateParams,
	type DentalLabFinancialGateResult,
	checkDentalLabFinancialGate,
	createChiefDoctorOverride,
} from "../components/lab/dentalLabFinancialGateEngine.js";
import {
	type BankInstallmentCalculationResult,
	type BankInstallmentProviderId,
	BANK_INSTALLMENT_PROVIDERS,
	calculateBankInstallment,
	generateBankInstallmentDeepLink,
	simulateBankApproval,
} from "../components/payments/bankInstallmentEngine.js";

describe("Dental Lab Financial Gate & Staged Installment Financing", () => {
	// ─── 1. DENTAL LAB FINANCIAL GATE TESTS ─────────────────────────────────────
	describe("1. DentalLabFinancialGate — 50% Stage Advance Control", () => {
		it("разрешает отправку наряда (CLEARED), если аванс за этап внесен >= 50%", () => {
			const stageTotal = rublesToKopecks(120000); // 120 000 руб
			const paid = rublesToKopecks(60000); // 60 000 руб (ровно 50%)

			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
			});

			assert.equal(result.isGatePassed, true);
			assert.equal(result.gateStatus, "CLEARED");
			assert.equal(result.paidPercent, 50);
			assert.equal(result.missingAdvanceKopecks, 0);
			assert.equal(result.missingAdvanceRub, 0);
			assert.ok(result.warningMessageRu.includes("пройден"));
		});

		it("разрешает отправку наряда, если сумма прямого аванса и депозита пациента >= 50%", () => {
			const stageTotal = rublesToKopecks(100000); // 100 000 руб
			const paid = rublesToKopecks(20000); // 20 000 руб (20%)
			const deposit = rublesToKopecks(35000); // 35 000 руб на депозите
			// Итого покрытие: 55 000 руб (55% >= 50%)

			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
				availableDepositKopecks: deposit,
			});

			assert.equal(result.isGatePassed, true);
			assert.equal(result.gateStatus, "CLEARED");
			assert.equal(result.totalPaidAndCoveredKopecks, rublesToKopecks(55000));
			assert.equal(result.paidPercent, 55);
			assert.equal(result.missingAdvanceKopecks, 0);
		});

		it("блокирует отправку наряда (BLOCKED_REQUIRES_ADVANCE), если оплачено < 50%", () => {
			const stageTotal = rublesToKopecks(150000); // 150 000 руб
			const paid = rublesToKopecks(30000); // 30 000 руб (20%)
			const requiredAdvance = rublesToKopecks(75000); // 50% = 75 000 руб
			const expectedMissing = rublesToKopecks(45000); // Не хватает 45 000 руб

			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
			});

			assert.equal(result.isGatePassed, false);
			assert.equal(result.gateStatus, "BLOCKED_REQUIRES_ADVANCE");
			assert.equal(result.paidPercent, 20);
			assert.equal(result.requiredAdvanceKopecks, requiredAdvance);
			assert.equal(result.missingAdvanceKopecks, expectedMissing);
			assert.equal(result.missingAdvanceRub, 45000);
			assert.ok(result.warningMessageRu.includes("Внимание: этап не оплачен"));
			assert.ok(result.warningMessageRu.includes("Отправить наряд под ответственность главврача?"));
		});

		it("разрешает отправку при авторизации Главным врачом (CHIEF_DOCTOR_OVERRIDE)", () => {
			const stageTotal = rublesToKopecks(200000); // 200 000 руб
			const paid = 0; // 0 руб оплачено

			const override = createChiefDoctorOverride(
				"Д-р Ковалев С. П.",
				"Срочная клиническая примерка перед отъездом пациента",
			);

			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
				chiefDoctorOverride: override,
			});

			assert.equal(result.isGatePassed, true);
			assert.equal(result.gateStatus, "CHIEF_DOCTOR_OVERRIDE");
			assert.equal(result.chiefDoctorOverrideAuthorized, true);
			assert.equal(result.overrideMeta?.doctorName, "Д-р Ковалев С. П.");
			assert.ok(result.warningMessageRu.includes("Главного врача"));
		});

		it("корректно обрабатывает кастомный процент минимального аванса (например, 30% или 70%)", () => {
			const stageTotal = rublesToKopecks(100000);
			const paid = rublesToKopecks(35000); // 35%

			// Порог 30% -> проходит
			const res30 = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
				minAdvancePercent: 30,
			});
			assert.equal(res30.isGatePassed, true);
			assert.equal(res30.gateStatus, "CLEARED");

			// Порог 70% -> блокируется
			const res70 = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
				minAdvancePercent: 70,
			});
			assert.equal(res70.isGatePassed, false);
			assert.equal(res70.gateStatus, "BLOCKED_REQUIRES_ADVANCE");
			assert.equal(res70.missingAdvanceRub, 35000); // 70 000 - 35 000
		});

		it("безопасно обрабатывает нулевую сумму этапа без деления на 0", () => {
			const result = checkDentalLabFinancialGate({
				stageTotalKopecks: 0,
				paidKopecks: 0,
			});
			assert.equal(result.isGatePassed, true);
			assert.equal(result.paidPercent, 100);
			assert.equal(result.missingAdvanceKopecks, 0);
		});
	});

	// ─── 2. BANK INSTALLMENT ENGINE TESTS ───────────────────────────────────────
	describe("2. BankInstallmentEngine — Sber, T-Bank & Podeli BNPL Math", () => {
		it("СберБанк: делит сумму на 12 месяцев без потери копеек (sum(parts) === total)", () => {
			const total = rublesToKopecks(125000); // 125 000 руб = 12 500 000 коп
			const calc = calculateBankInstallment(total, "sberbank", 12);

			assert.equal(calc.provider.id, "sberbank");
			assert.equal(calc.termMonths, 12);
			assert.equal(calc.overpaymentKopecks, 0);
			assert.equal(calc.isWithinLimits, true);

			// Проверка балансового инварианта копеек
			const sumParts = sumKopecks(calc.partsKopecks);
			assert.equal(sumParts, total);

			assert.equal(calc.schedule.length, 12);
			// 12 500 000 / 12 = 1 041 666.66... коп -> 1-й платеж 10 417 руб, остальные 10 416.66 руб
			assert.equal(calc.monthlyPaymentRub, 10417);
		});

		it("Т-Банк: рассчитывает рассрочку на 6 месяцев с нулевой переплатой", () => {
			const total = rublesToKopecks(60000); // 60 000 руб
			const calc = calculateBankInstallment(total, "tbank", 6);

			assert.equal(calc.provider.id, "tbank");
			assert.equal(calc.termMonths, 6);
			assert.equal(calc.monthlyPaymentRub, 10000);
			assert.equal(calc.schedule.length, 6);

			const sumParts = sumKopecks(calc.partsKopecks);
			assert.equal(sumParts, total);
		});

		it("Подели BNPL: формирует 4 равных платежа каждые 2 недели (25% каждый)", () => {
			const total = rublesToKopecks(28500); // 28 500 руб (терапевтический этап)
			const calc = calculateBankInstallment(total, "podeli");

			assert.equal(calc.provider.id, "podeli");
			assert.equal(calc.schedule.length, 4);

			// Сумма 4 частей строго равна 28 500 руб
			const sumParts = sumKopecks(calc.partsKopecks);
			assert.equal(sumParts, total);

			// Каждый платеж около 7 125 руб (25%)
			for (const item of calc.schedule) {
				assert.equal(item.percentShare, 25);
			}
			assert.ok(calc.schedule[0]?.dueDateText.includes("Сегодня"));
			assert.ok(calc.schedule[1]?.dueDateText.includes("Через 2 нед"));
		});

		it("валидирует минимальные и максимальные лимиты банковских программ", () => {
			// Меньше минимума (500 руб < 3 000 руб)
			const tooSmall = calculateBankInstallment(rublesToKopecks(500), "sberbank");
			assert.equal(tooSmall.isWithinLimits, false);
			assert.ok(tooSmall.validationErrorRu?.includes("Минимальная сумма"));

			// Больше максимума для Подели (150 000 руб > 100 000 руб)
			const tooBig = calculateBankInstallment(rublesToKopecks(150000), "podeli");
			assert.equal(tooBig.isWithinLimits, false);
			assert.ok(tooBig.validationErrorRu?.includes("Максимальный лимит"));
		});

		it("generateBankInstallmentDeepLink формирует валидные deep-link URL и текст для СМС", () => {
			const link = generateBankInstallmentDeepLink({
				providerId: "sberbank",
				amountRub: 120000,
				stageTitle: "Протезирование на диоксиде циркония",
				stageNumber: 3,
				patientId: "PAT-9912",
				patientPhone: "+79991234567",
				clinicInn: "7701234567",
				termMonths: 12,
			});

			assert.ok(link.deepLinkUrl.includes("sberpay/installment"));
			assert.ok(link.deepLinkUrl.includes("amount=120000"));
			assert.ok(link.deepLinkUrl.includes("term=12"));
			assert.ok(link.qrPayload.startsWith("https://"));
			assert.ok(link.formattedSmsText.replace(/[\s\u00A0\u202F]+/g, " ").includes("120 000"));
			assert.ok(link.formattedSmsText.includes("PAT-9912") || link.formattedSmsText.includes("ДЕНТЕ"));
		});

		it("simulateBankApproval моментально подтверждает одобрение кредитного скоринга", () => {
			const amount = rublesToKopecks(85000);
			const approval = simulateBankApproval(amount, "tbank", "Сидоров П. А.", 6);

			assert.equal(approval.isApproved, true);
			assert.equal(approval.approvedAmountKopecks, amount);
			assert.equal(approval.providerName, "Т-Банк");
			assert.ok(approval.approvalId.startsWith("APP-TBA-"));
			assert.ok(approval.confirmationMessageRu.includes("успешно одобрена"));
		});
	});

	// ─── 3. INTEGRATION GATE & INSTALLMENT WORKFLOW ─────────────────────────────
	describe("3. Integrated Gate & Financing Flow", () => {
		it("сценарий: заблокированный наряд ЗТЛ разблокируется после оформления рассрочки", () => {
			const stageTotal = rublesToKopecks(140000); // 140 000 руб
			let paid = 0; // Наряд заблокирован

			// 1. Проверяем первоначальное состояние — блокировка
			const gate1 = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
			});
			assert.equal(gate1.isGatePassed, false);
			assert.equal(gate1.gateStatus, "BLOCKED_REQUIRES_ADVANCE");

			// 2. Пациент оформляет рассрочку Сбера на 140 000 руб
			const approval = simulateBankApproval(stageTotal, "sberbank", "Иванов И. И.", 12);
			assert.equal(approval.isApproved, true);

			// 3. Средства зачисляются на депозит пациента
			const deposit = approval.approvedAmountKopecks;

			// 4. Повторная проверка финансового шлюза — шлюз открыт!
			const gate2 = checkDentalLabFinancialGate({
				stageTotalKopecks: stageTotal,
				paidKopecks: paid,
				availableDepositKopecks: deposit,
			});
			assert.equal(gate2.isGatePassed, true);
			assert.equal(gate2.gateStatus, "CLEARED");
			assert.equal(gate2.missingAdvanceKopecks, 0);
		});
	});
});
