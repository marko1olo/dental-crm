import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MessageTemplateEngine } from "../services/communications/MessageTemplateEngine.js";
import {
	BANK_PROVIDERS,
	TelegramTreatmentPlanCloserService,
} from "../services/telegram/TelegramTreatmentPlanCloserService.js";
import { fixtureUuid } from "./support/fixtureOrganizations.js";

describe("Telegram Treatment Plan Closer: Installment Calculator & Patient Screens", () => {
	const TEST_ORG_ID = fixtureUuid("tg-plan-closer-calc", 1);
	const PLAN_ID = fixtureUuid("tg-plan-closer-calc", 4);
	const samplePlan = TelegramTreatmentPlanCloserService.getSyntheticFallbackPlan(PLAN_ID, TEST_ORG_ID);

	// ========================================================================
	// 1. ФИНАНСОВЫЙ КАЛЬКУЛЯТОР БАНКОВСКИХ РАССРОЧЕК 0%
	// ========================================================================
	describe("1. Bank Installment Calculator Engine (0-0-12, 0-0-24, 0-0-6)", () => {
		it("calculates exact 0% installment for 207 000 ₽ on 12 months (17 250 ₽/mo)", () => {
			const option = TelegramTreatmentPlanCloserService.calculateInstallmentOption(207000, 12);

			assert.strictEqual(option.months, 12);
			assert.strictEqual(option.totalAmountRub, 207000);
			assert.strictEqual(option.downPaymentRub, 0);
			assert.strictEqual(option.financedAmountRub, 207000);
			assert.strictEqual(option.monthlyPaymentRub, 17250);
			assert.strictEqual(option.overpaymentRub, 0);
			assert.strictEqual(option.interestRatePercent, 0);
			assert.strictEqual(option.partsRub.length, 12);

			// Проверка копеечно-точной суммы всех частей
			const sumParts = option.partsRub.reduce((acc, p) => acc + p, 0);
			assert.strictEqual(sumParts, 207000);
		});

		it("calculates 24 months installment (8 625 ₽/mo) with zero overpayment", () => {
			const option = TelegramTreatmentPlanCloserService.calculateInstallmentOption(207000, 24);

			assert.strictEqual(option.months, 24);
			assert.strictEqual(option.monthlyPaymentRub, 8625);
			assert.strictEqual(option.overpaymentRub, 0);
			const sumParts = option.partsRub.reduce((acc, p) => acc + p, 0);
			assert.strictEqual(sumParts, 207000);
		});

		it("calculates 6 months installment (34 500 ₽/mo)", () => {
			const option = TelegramTreatmentPlanCloserService.calculateInstallmentOption(207000, 6);

			assert.strictEqual(option.months, 6);
			assert.strictEqual(option.monthlyPaymentRub, 34500);
			assert.strictEqual(option.overpaymentRub, 0);
		});

		it("correctly handles down payment subtraction (207 000 - 27 000 = 180 000 / 12 = 15 000 ₽/mo)", () => {
			const option = TelegramTreatmentPlanCloserService.calculateInstallmentOption(207000, 12, 27000);

			assert.strictEqual(option.totalAmountRub, 207000);
			assert.strictEqual(option.downPaymentRub, 27000);
			assert.strictEqual(option.financedAmountRub, 180000);
			assert.strictEqual(option.monthlyPaymentRub, 15000);
			assert.strictEqual(option.overpaymentRub, 0);
		});

		it("computes 13% NDFL tax deduction refund (207 000 * 0.13 = 26 910 ₽)", () => {
			const option = TelegramTreatmentPlanCloserService.calculateInstallmentOption(207000, 12);

			assert.strictEqual(option.ndflRefundRub, 26910);
		});

		it("provides supported Russian banking partners (Т-Банк, Сбербанк, ОТП)", () => {
			assert.ok(BANK_PROVIDERS.tinkoff.nameRu.includes("Т-Банк"));
			assert.ok(BANK_PROVIDERS.sberbank.nameRu.includes("Сбербанк"));
			assert.ok(BANK_PROVIDERS.otp.nameRu.includes("ОТП"));
			assert.ok(BANK_PROVIDERS.clinic_internal.nameRu.includes("DENTE"));
		});

		it("calculates all terms concurrently (3, 6, 12, 24 months)", () => {
			const all = TelegramTreatmentPlanCloserService.calculateAllInstallmentOptions(207000);

			assert.strictEqual(all[3].monthlyPaymentRub, 69000);
			assert.strictEqual(all[6].monthlyPaymentRub, 34500);
			assert.strictEqual(all[12].monthlyPaymentRub, 17250);
			assert.strictEqual(all[24].monthlyPaymentRub, 8625);
		});
	});

	// ========================================================================
	// 2. КЛИНИЧЕСКИЕ ЭТАПЫ И ИЗВЛЕЧЕНИЕ ЗУБОВ
	// ========================================================================
	describe("2. Clinical Stages & Teeth Extraction", () => {
		it("breaks down total amount into 3 realistic clinical stages summing to total", () => {
			const stages = TelegramTreatmentPlanCloserService.buildDefaultStages(207000);

			assert.strictEqual(stages.length, 3);
			const s0 = stages[0];
			const s1 = stages[1];
			const s2 = stages[2];
			assert.ok(s0 && s1 && s2);
			assert.strictEqual(s0.stageIndex, 1);
			assert.ok(s0.name.includes("Снятие воспаления и гигиена"));
			assert.strictEqual(s1.stageIndex, 2);
			assert.ok(s1.name.includes("Терапия и подготовка"));
			assert.strictEqual(s2.stageIndex, 3);
			assert.ok(s2.name.includes("Имплантация и коронки"));

			const sum = stages.reduce((acc, s) => acc + s.priceRub, 0);
			assert.strictEqual(sum, 207000, "Stages prices must sum exactly to 207 000 ₽");
		});

		it("extracts teeth numbers from items array or string title", () => {
			const fromItems = TelegramTreatmentPlanCloserService.parseTeethNumbers([
				{ toothNumber: 16 },
				{ toothNumber: 26 },
				{ toothNumber: 46 },
			]);
			assert.deepStrictEqual(fromItems, [16, 26, 46]);

			const fromString = TelegramTreatmentPlanCloserService.parseTeethNumbers(
				"Лечение зубов 16, 26 и 46 с имплантацией",
			);
			assert.deepStrictEqual(fromString, [16, 26, 46]);

			const fallback = TelegramTreatmentPlanCloserService.parseTeethNumbers(null);
			assert.deepStrictEqual(fallback, [16, 26, 46]);
		});
	});

	// ========================================================================
	// 3. ЭКРАНЫ TELEGRAM IN-PLACE UI
	// ========================================================================
	describe("3. Telegram In-Place UI Screens & Zero Chat Landfill", () => {
		it("generates root follow-up screen with personalized greeting, doctor and teeth", () => {
			const screen = TelegramTreatmentPlanCloserService.getPlanCloserRootScreen(samplePlan);

			assert.ok(screen.text.includes("Иван Иванович"));
			assert.ok(screen.text.includes("Смирнова Анна Павловна"));
			assert.ok(screen.text.includes("16, 26, 46"));
			assert.ok(screen.text.includes("207 000 ₽"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			assert.ok(buttons.some((b) => b.callback_data === `closer:stages:${PLAN_ID}`));
			assert.ok(buttons.some((b) => b.callback_data === `closer:calc:${PLAN_ID}:12`));
			assert.ok(buttons.some((b) => b.callback_data === `closer:objections:${PLAN_ID}`));
			assert.ok(buttons.some((b) => b.callback_data === `closer:call_curator:${PLAN_ID}`));
		});

		it("generates stages screen listing all 3 stages and totals", () => {
			const screen = TelegramTreatmentPlanCloserService.getPlanStagesScreen(samplePlan);

			assert.ok(screen.text.includes("Поэтапный план лечения под ключ"));
			assert.ok(screen.text.includes("Этап 1: Снятие воспаления и гигиена"));
			assert.ok(screen.text.includes("Этап 2: Терапия и подготовка"));
			assert.ok(screen.text.includes("Этап 3: Имплантация и коронки"));
			assert.ok(screen.text.includes("207 000 ₽"));
			assert.ok(screen.text.includes("Поэтапная оплата"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			assert.ok(buttons.some((b) => b.callback_data === `closer:calc:${PLAN_ID}:12`));
			assert.ok(buttons.some((b) => b.callback_data === `closer:root:${PLAN_ID}`));
		});

		it("generates installment calculator screen with real-time term buttons", () => {
			const screen = TelegramTreatmentPlanCloserService.getInstallmentCalcScreen(samplePlan, 12);

			assert.ok(screen.text.includes("Беспроцентная рассрочка 0%"));
			assert.ok(screen.text.includes("17 250 ₽/мес без переплат на 12 месяцев"));
			assert.ok(screen.text.includes("Переплата банку: <b>0 ₽ (0%)</b>"));
			assert.ok(screen.text.includes("Налоговый вычет 13%: государство вернет вам <b>до 26 910 ₽</b>"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			// Кнопка подачи заявки
			assert.ok(buttons.some((b) => b.callback_data === `closer:apply_installment:${PLAN_ID}:12`));
			// Кнопки переключения сроков
			assert.ok(buttons.some((b) => b.callback_data === `closer:calc:${PLAN_ID}:6`));
			assert.ok(buttons.some((b) => b.callback_data === `closer:calc:${PLAN_ID}:12`));
			assert.ok(buttons.some((b) => b.callback_data === `closer:calc:${PLAN_ID}:24`));
		});

		it("generates installment submitted confirmation screen", () => {
			const screen = TelegramTreatmentPlanCloserService.getInstallmentSubmittedScreen(samplePlan, 12, "lead-123");

			assert.ok(screen.text.includes("Заявка на рассрочку успешно принята!"));
			assert.ok(screen.text.includes("207 000 ₽"));
			assert.ok(screen.text.includes("12 месяцев"));
			assert.ok(screen.text.includes("17 250 ₽/мес"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			assert.ok(buttons.some((b) => b.callback_data === `closer:call_curator:${PLAN_ID}`));
			assert.ok(buttons.some((b) => b.callback_data === "dente:start"));
		});

		it("generates objections menu and clinical objection screens", () => {
			const root = TelegramTreatmentPlanCloserService.getObjectionsRootScreen(samplePlan);
			assert.ok(root.text.includes("Вопросы и сомнения перед началом лечения"));

			const fear = TelegramTreatmentPlanCloserService.getObjectionFearScreen(samplePlan);
			assert.ok(fear.text.includes("Компьютерная анестезия STA"));
			assert.ok(fear.text.includes("микроскоп Karl Kaps"));
			assert.ok(fear.text.includes("dente.clinic/video/safe-care"));

			const cost = TelegramTreatmentPlanCloserService.getObjectionCostScreen(samplePlan);
			assert.ok(cost.text.includes("Поэтапная оплата"));
			assert.ok(cost.text.includes("Беспроцентная рассрочка 0%"));
			assert.ok(cost.text.includes("Налоговый вычет 13%"));

			const family = TelegramTreatmentPlanCloserService.getObjectionFamilyScreen(samplePlan);
			assert.ok(family.text.includes("Интерактивная презентация плана"));
			assert.ok(family.text.includes("Семейный баланс DENTE"));

			const delay = TelegramTreatmentPlanCloserService.getObjectionDelayScreen(samplePlan);
			assert.ok(delay.text.includes("Коварство зубов"));
			assert.ok(delay.text.includes("сохраняет собственный живой зуб на 15–20 лет"));

			const curator = TelegramTreatmentPlanCloserService.getCuratorCallBookedScreen(samplePlan);
			assert.ok(curator.text.includes("Звонок куратора заботы забронирован!"));
		});
	});

	// ========================================================================
	// 4. ЗАЩИТА ВРАЧЕБНОЙ ТАЙНЫ (152-ФЗ / 323-ФЗ ст. 13)
	// ========================================================================
	describe("4. Medical Secrecy Compliance (152-ФЗ / 323-ФЗ ст. 13)", () => {
		it("verifies zero medical secrecy leaks across all plan closer screens", () => {
			const screens = [
				TelegramTreatmentPlanCloserService.getPlanCloserRootScreen(samplePlan),
				TelegramTreatmentPlanCloserService.getPlanStagesScreen(samplePlan),
				TelegramTreatmentPlanCloserService.getInstallmentCalcScreen(samplePlan, 12),
				TelegramTreatmentPlanCloserService.getInstallmentSubmittedScreen(samplePlan, 12, "lead-1"),
				TelegramTreatmentPlanCloserService.getObjectionsRootScreen(samplePlan),
				TelegramTreatmentPlanCloserService.getObjectionFearScreen(samplePlan),
				TelegramTreatmentPlanCloserService.getObjectionCostScreen(samplePlan),
				TelegramTreatmentPlanCloserService.getObjectionFamilyScreen(samplePlan),
				TelegramTreatmentPlanCloserService.getObjectionDelayScreen(samplePlan),
				TelegramTreatmentPlanCloserService.getCuratorCallBookedScreen(samplePlan),
			];

			for (const scr of screens) {
				const leakCheck = MessageTemplateEngine.detectMedicalSecrecyLeaks(scr.text);
				assert.strictEqual(
					leakCheck.hasLeak,
					false,
					`Screen text must not leak medical secrecy terms: ${leakCheck.detectedTerms.join(", ")}`,
				);
			}
		});
	});
});
