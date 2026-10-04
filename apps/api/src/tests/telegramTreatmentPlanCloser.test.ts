import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	crmLeads,
	denteTelegramChatLinks,
	organizations,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../db/schema.js";
import {
	registerTelegramRoutes,
	registerTelegramWebhookRoutes,
} from "../routes/telegram.js";
import { registerTelegramTreatmentPlanCloserRoutes } from "../routes/telegramTreatmentPlanCloser.js";
import { MessageTemplateEngine } from "../services/communications/MessageTemplateEngine.js";
import {
	BANK_PROVIDERS,
	TelegramTreatmentPlanCloserService,
} from "../services/telegram/TelegramTreatmentPlanCloserService.js";
import { encryptTelegramChatId } from "../utils/telegramChatRef.js";
import { fixtureUuid, withFixtureTenant } from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

describe("Telegram Treatment Plan Closer & Installment Calculator Suite", () => {
	const TEST_ORG_ID = fixtureUuid("tg-plan-closer-test", 1);
	const DOCTOR_ID = fixtureUuid("tg-plan-closer-test", 2);
	const PATIENT_ID = fixtureUuid("tg-plan-closer-test", 3);
	const PLAN_ID = fixtureUuid("tg-plan-closer-test", 4);

	const BOT_TOKEN = "123456789:AAFakeTokenForPlanCloserTesting";
	const TG_CHAT_ID = "987654321";
	let app: FastifyInstance;
	let isDbAvailable = false;
	const originalFetch = globalThis.fetch;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
		process.env.DENTE_TELEGRAM_BOT_TOKEN = BOT_TOKEN;
		process.env.DENTE_TELEGRAM_BOT_USERNAME = "dente_closer_bot";
		process.env.DENTE_TELEGRAM_ORGANIZATION_ID = TEST_ORG_ID;
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY =
			"1234567890123456789012345678901234567890123456789012345678901234";

		// Мокаем fetch для ответов Telegram Bot API
		globalThis.fetch = (async () => ({
			ok: true,
			status: 200,
			json: async () => ({ ok: true, result: { message_id: 88801 } }),
		})) as unknown as typeof fetch;

		app = createTenantTestApp();
		await registerTelegramRoutes(app);
		await registerTelegramWebhookRoutes(app);
		await app.ready();

		try {
			await db.execute(sql`SELECT 1`);
			isDbAvailable = true;
		} catch {
			isDbAvailable = false;
		}

		if (isDbAvailable) {
			await withFixtureTenant(TEST_ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: TEST_ORG_ID,
						name: "Клиника DENTE Дожим Планов",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values({
						id: DOCTOR_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Смирнова Анна Павловна",
						email: "smirnova.closer@dente.local",
						role: "doctor",
					})
					.onConflictDoNothing();

				await tx
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Иван Иванович Иванов",
						phone: "+7 999 111-22-33",
					})
					.onConflictDoNothing();

				const encChatRef = encryptTelegramChatId(TG_CHAT_ID) || "test_ref";
				await tx
					.insert(denteTelegramChatLinks)
					.values({
						id: fixtureUuid("tg-plan-closer-test", 10),
						organizationId: TEST_ORG_ID,
						subjectType: "patient",
						subjectId: PATIENT_ID,
						chatFingerprint: "fp_closer_patient_1",
						chatTransportRef: encChatRef,
						chatIdLast4: "4321",
						status: "active",
					})
					.onConflictDoNothing();

				// Создаем открытый план лечения 49 часов назад
				const twoDaysAgo = new Date(Date.now() - 49 * 3600 * 1000);
				await tx
					.insert(treatmentPlans)
					.values({
						id: PLAN_ID,
						organizationId: TEST_ORG_ID,
						patientId: PATIENT_ID,
						doctorId: DOCTOR_ID,
						title: "Комплексная реабилитация (позиции 16, 26, 46)",
						name: "Комплексная реабилитация (позиции 16, 26, 46)",
						status: "Draft",
						totalPrice: "207000.00",
						totalPriceRub: "207000.00",
						createdAt: twoDaysAgo,
						updatedAt: twoDaysAgo,
					})
					.onConflictDoNothing();

				// Добавляем позиции с зубами 16, 26, 46
				await tx
					.insert(treatmentPlanItemsNew)
					.values([
						{
							id: fixtureUuid("tg-plan-closer-test", 21),
							organizationId: TEST_ORG_ID,
							planId: PLAN_ID,
							toothNumber: 16,
							priceId: "P-16",
							quantity: 1,
							price: "69000.00",
							phase: 1,
						},
						{
							id: fixtureUuid("tg-plan-closer-test", 22),
							organizationId: TEST_ORG_ID,
							planId: PLAN_ID,
							toothNumber: 26,
							priceId: "P-26",
							quantity: 1,
							price: "69000.00",
							phase: 2,
						},
						{
							id: fixtureUuid("tg-plan-closer-test", 23),
							organizationId: TEST_ORG_ID,
							planId: PLAN_ID,
							toothNumber: 46,
							priceId: "P-46",
							quantity: 1,
							price: "69000.00",
							phase: 3,
						},
					])
					.onConflictDoNothing();
			});
		}
	});

	after(async () => {
		globalThis.fetch = originalFetch;
		mock.restoreAll();
		if (app) {
			await app.close();
		}
	});

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
		const samplePlan = TelegramTreatmentPlanCloserService.getSyntheticFallbackPlan(PLAN_ID, TEST_ORG_ID);

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
		const samplePlan = TelegramTreatmentPlanCloserService.getSyntheticFallbackPlan(PLAN_ID, TEST_ORG_ID);

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

	// ========================================================================
	// 5. ИНТЕГРАЦИЯ С БАЗОЙ И ЛИДАМИ CRM (POSTGRESQL 18)
	// ========================================================================
	describe("5. Database Domain Integration & Lead Creation", () => {
		it("finds pending plans for patient with calculated stages and installments", async () => {
			const plans = await TelegramTreatmentPlanCloserService.getPendingTreatmentPlansForPatient(
				PATIENT_ID,
				TEST_ORG_ID,
			);

			assert.ok(Array.isArray(plans));
			if (isDbAvailable) {
				assert.ok(plans.length >= 1, "Should find at least 1 plan in DB");
				const p = plans[0];
				assert.ok(p);
				assert.strictEqual(p.planId, PLAN_ID);
				assert.strictEqual(p.patientName, "Иван Иванович Иванов");
				assert.strictEqual(p.doctorName, "Смирнова Анна Павловна");
				assert.strictEqual(p.totalPriceRub, 207000);
				assert.deepStrictEqual(p.teeth, [16, 26, 46]);
				assert.strictEqual(p.followUpEligible, true, "Plan is 49 hours old, eligible for follow-up");
				assert.strictEqual(p.installments[12].monthlyPaymentRub, 17250);
			}
		});

		it("creates CRM lead on 1-click installment application (status INSTALLMENT_REQUEST)", async () => {
			const res = await TelegramTreatmentPlanCloserService.createInstallmentLead({
				planId: PLAN_ID,
				monthsCount: 12,
				organizationId: TEST_ORG_ID,
				notes: "Тестовая подача через Telegram",
			});

			assert.strictEqual(res.ok, true);
			assert.ok(res.leadId);
			assert.strictEqual(res.plan.planId, PLAN_ID);

			if (isDbAvailable) {
				const [lead] = await withFixtureTenant(TEST_ORG_ID, async (tx) =>
					tx
						.select()
						.from(crmLeads)
						.where(sql`${crmLeads.id} = ${res.leadId}`)
						.limit(1),
				);

				assert.ok(lead);
				assert.strictEqual(lead.status, "INSTALLMENT_REQUEST");
				assert.strictEqual(lead.source, "telegram_plan_closer");
				assert.ok(lead.notes?.includes("12 месяцев"));
				assert.ok(lead.notes?.includes("17 250 ₽/мес"));
			}
		});

		it("creates curator call request lead (status CURATOR_CALL_REQUEST)", async () => {
			const res = await TelegramTreatmentPlanCloserService.createCuratorCallRequest({
				planId: PLAN_ID,
				organizationId: TEST_ORG_ID,
				notes: "Пациент просит перезвонить по этапам лечения",
			});

			assert.strictEqual(res.ok, true);
			assert.ok(res.leadId);

			if (isDbAvailable) {
				const [lead] = await withFixtureTenant(TEST_ORG_ID, async (tx) =>
					tx
						.select()
						.from(crmLeads)
						.where(sql`${crmLeads.id} = ${res.leadId}`)
						.limit(1),
				);

				assert.ok(lead);
				assert.strictEqual(lead.status, "CURATOR_CALL_REQUEST");
				assert.strictEqual(lead.source, "telegram_plan_closer");
			}
		});

		it("finds follow-up candidates that are >= 48 hours old and linked to Telegram", async () => {
			const candidates = await TelegramTreatmentPlanCloserService.findFollowUpCandidates(TEST_ORG_ID, 48);

			assert.ok(Array.isArray(candidates));
			if (isDbAvailable) {
				assert.ok(candidates.some((c) => c.planId === PLAN_ID));
			}
		});

		it("sends follow-up message via Telegram Bot API", async () => {
			const sendRes = await TelegramTreatmentPlanCloserService.sendPlanFollowUpMessage({
				planId: PLAN_ID,
				botToken: BOT_TOKEN,
				organizationId: TEST_ORG_ID,
				force: true,
			});

			assert.strictEqual(sendRes.ok, true);
			assert.strictEqual(sendRes.messageId, 88801);
		});
	});

	// ========================================================================
	// 6. ОБРАБОТЧИК CALLBACK_QUERY (IN-PLACE UI РОУТИНГ)
	// ========================================================================
	describe("6. In-Place UI Callback Query Dispatcher", () => {
		it("handles closer:stages callback and returns stages screen", async () => {
			const res = await TelegramTreatmentPlanCloserService.handleCallbackQuery({
				callbackData: `closer:stages:${PLAN_ID}`,
				callbackQueryId: "cq_1",
				chatFingerprint: "fp_test_1",
				chatId: TG_CHAT_ID,
				messageId: 88801,
				botToken: BOT_TOKEN,
				organizationId: TEST_ORG_ID,
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.action, "closer_stages");
			assert.ok(res.screen?.text.includes("Поэтапный план лечения под ключ"));
		});

		it("handles closer:calc:12 callback and returns 12-month calculator", async () => {
			const res = await TelegramTreatmentPlanCloserService.handleCallbackQuery({
				callbackData: `closer:calc:${PLAN_ID}:12`,
				callbackQueryId: "cq_2",
				chatFingerprint: "fp_test_1",
				chatId: TG_CHAT_ID,
				messageId: 88801,
				botToken: BOT_TOKEN,
				organizationId: TEST_ORG_ID,
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.action, "closer_calc");
			assert.ok(res.screen?.text.includes("17 250 ₽/мес"));
		});

		it("handles closer:calc:24 callback with dynamic recalculation to 8 625 ₽/mo", async () => {
			const res = await TelegramTreatmentPlanCloserService.handleCallbackQuery({
				callbackData: `closer:calc:${PLAN_ID}:24`,
				callbackQueryId: "cq_3",
				chatFingerprint: "fp_test_1",
				chatId: TG_CHAT_ID,
				messageId: 88801,
				botToken: BOT_TOKEN,
				organizationId: TEST_ORG_ID,
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.action, "closer_calc");
			assert.ok(res.screen?.text.includes("8 625 ₽/мес"));
		});

		it("handles closer:apply_installment:12 and submits lead in 1-click", async () => {
			const res = await TelegramTreatmentPlanCloserService.handleCallbackQuery({
				callbackData: `closer:apply_installment:${PLAN_ID}:12`,
				callbackQueryId: "cq_4",
				chatFingerprint: "fp_test_1",
				chatId: TG_CHAT_ID,
				messageId: 88801,
				botToken: BOT_TOKEN,
				organizationId: TEST_ORG_ID,
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.action, "closer_apply_installment");
			assert.ok(res.screen?.text.includes("Заявка на рассрочку успешно принята!"));
		});

		it("handles closer:obj_fear and delivers reassuring clinical pain-free protocol", async () => {
			const res = await TelegramTreatmentPlanCloserService.handleCallbackQuery({
				callbackData: `closer:obj_fear:${PLAN_ID}`,
				callbackQueryId: "cq_5",
				chatFingerprint: "fp_test_1",
				chatId: TG_CHAT_ID,
				messageId: 88801,
				botToken: BOT_TOKEN,
				organizationId: TEST_ORG_ID,
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.action, "closer_obj_fear");
			assert.ok(res.screen?.text.includes("Компьютерная анестезия STA"));
		});

		it("handles closer:call_curator and schedules care coordinator call", async () => {
			const res = await TelegramTreatmentPlanCloserService.handleCallbackQuery({
				callbackData: `closer:call_curator:${PLAN_ID}`,
				callbackQueryId: "cq_6",
				chatFingerprint: "fp_test_1",
				chatId: TG_CHAT_ID,
				messageId: 88801,
				botToken: BOT_TOKEN,
				organizationId: TEST_ORG_ID,
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.action, "closer_call_curator");
			assert.ok(res.screen?.text.includes("Звонок куратора заботы забронирован!"));
		});
	});

	// ========================================================================
	// 7. FASTIFY REST РОУТЫ
	// ========================================================================
	describe("7. Fastify REST Endpoints", () => {
		it("GET /api/telegram/treatment-plans/pending/:patientId returns pending plans", async () => {
			const response = await app.inject({
				method: "GET",
				url: `/api/telegram/treatment-plans/pending/${PATIENT_ID}?organizationId=${TEST_ORG_ID}`,
				headers: {
					"x-organization-id": TEST_ORG_ID,
				},
			});

			assert.strictEqual(response.statusCode, 200);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.ok, true);
			assert.strictEqual(body.patientId, PATIENT_ID);
			assert.ok(Array.isArray(body.plans));

			if (isDbAvailable) {
				assert.ok(body.plans.length >= 1);
				assert.strictEqual(body.plans[0].planId, PLAN_ID);
				assert.strictEqual(body.plans[0].totalPriceRub, 207000);
				assert.strictEqual(body.plans[0].installments[12].monthlyPaymentRub, 17250);
			}
		});

		it("POST /api/telegram/treatment-plans/:planId/installment-calc computes installment schedule", async () => {
			const response = await app.inject({
				method: "POST",
				url: `/api/telegram/treatment-plans/${PLAN_ID}/installment-calc`,
				headers: {
					"x-organization-id": TEST_ORG_ID,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					monthsCount: 12,
					downPaymentRub: 0,
					bankProvider: "tinkoff",
				}),
			});

			assert.strictEqual(response.statusCode, 200);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.ok, true);
			assert.strictEqual(body.planId, PLAN_ID);
			assert.strictEqual(body.monthsCount, 12);
			assert.strictEqual(body.monthlyPaymentRub, 17250);
			assert.strictEqual(body.totalOverpaymentRub, 0);
			assert.strictEqual(body.ndflRefundAmountRub, 26910);
			assert.ok(body.monthlyPaymentFormatted.includes("17 250 ₽/мес"));
			assert.strictEqual(body.partsRub.length, 12);
		});

		it("POST /api/telegram/treatment-plans/:planId/send-followup sends message", async () => {
			const response = await app.inject({
				method: "POST",
				url: `/api/telegram/treatment-plans/${PLAN_ID}/send-followup`,
				headers: {
					"x-organization-id": TEST_ORG_ID,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					force: true,
					botToken: BOT_TOKEN,
				}),
			});

			assert.strictEqual(response.statusCode, 200);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.ok, true);
			assert.strictEqual(body.messageId, 88801);
		});

		it("validates bad requests on invalid parameters", async () => {
			const invalidCalc = await app.inject({
				method: "POST",
				url: `/api/telegram/treatment-plans/${PLAN_ID}/installment-calc`,
				headers: {
					"x-organization-id": TEST_ORG_ID,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					monthsCount: 99, // недопустимый срок
				}),
			});

			assert.strictEqual(invalidCalc.statusCode, 400);
			const errBody = JSON.parse(invalidCalc.body);
			assert.strictEqual(errBody.error, "ValidationError");
		});
	});
});
