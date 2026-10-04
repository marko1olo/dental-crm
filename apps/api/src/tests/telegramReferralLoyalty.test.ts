import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it, test } from "node:test";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	appointments,
	bonusTransactions,
	chairs,
	clinics,
	communicationTasks,
	crmLeads,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	familyGroups,
	organizations,
	patientBonusBalances,
	patientReferralCodes,
	patientReferrals,
	patients,
	users,
	visits,
} from "../db/schema.js";
import {
	registerTelegramRoutes,
	registerTelegramWebhookRoutes,
} from "../routes/telegram.js";
import { registerTelegramReferralLoyaltyRoutes } from "../routes/telegramReferralLoyalty.js";
import {
	TelegramReferralLoyaltyService,
	type ToothComplaintInput,
	type WebAppBookingInput,
} from "../services/telegram/TelegramReferralLoyaltyService.js";
import { fixtureUuid, withFixtureTenant } from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

function makeInitDataString(
	params: Record<string, string>,
	botToken: string,
): string {
	const keys = Object.keys(params).sort();
	const dataCheckString = keys.map((k) => `${k}=${params[k]}`).join("\n");
	const secretKey = createHmac("sha256", "WebAppData")
		.update(botToken)
		.digest();
	const hash = createHmac("sha256", secretKey)
		.update(dataCheckString)
		.digest("hex");
	return (
		keys
			.map(
				(k) =>
					`${encodeURIComponent(k)}=${encodeURIComponent(params[k]!)}`,
			)
			.join("&") + `&hash=${hash}`
	);
}

describe("Telegram WebApp Mini-App & Referral Retention Suite", () => {
	const TEST_ORG_ID = fixtureUuid("tg-referral-loyalty-test", 1);
	const CLINIC_ID = fixtureUuid("tg-referral-loyalty-test", 2);
	const CHAIR_ID = fixtureUuid("tg-referral-loyalty-test", 3);
	const DOCTOR_ID = fixtureUuid("tg-referral-loyalty-test", 4);
	const REFERRER_PATIENT_ID = fixtureUuid("tg-referral-loyalty-test", 5);
	const CHURN_PATIENT_ID = fixtureUuid("tg-referral-loyalty-test", 6);
	const CHILD_PATIENT_ID = fixtureUuid("tg-referral-loyalty-test", 7);
	const APPT_NPS_ID = fixtureUuid("tg-referral-loyalty-test", 8);
	const APPT_FAMILY_ID = fixtureUuid("tg-referral-loyalty-test", 9);

	const BOT_TOKEN = "123456789:AAFakeTokenForTelegramWebAppTesting";
	const WEBHOOK_SECRET = "secret-token-loyalty-test";
	let app: FastifyInstance;
	let isDbAvailable = false;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
		process.env.DENTE_TELEGRAM_BOT_TOKEN = BOT_TOKEN;
		process.env.DENTE_TELEGRAM_BOT_USERNAME = "dente_clinic_bot";
		process.env.DENTE_TELEGRAM_ORGANIZATION_ID = TEST_ORG_ID;
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";
		process.env.DENTAL_STATE_PERSISTENCE = "on";

		// Мокаем fetch для ответов Telegram Bot API
		globalThis.fetch = (async () => ({
			ok: true,
			status: 200,
			json: async () => ({ ok: true, result: { message_id: 10001 } }),
		})) as unknown as typeof fetch;

		app = createTenantTestApp();
		await registerTelegramRoutes(app);
		await registerTelegramWebhookRoutes(app);
		await registerTelegramReferralLoyaltyRoutes(app);
		await app.ready();

		try {
			await db.execute(sql`SELECT 1`);
			isDbAvailable = true;
		} catch {
			isDbAvailable = false;
		}

		if (isDbAvailable) {
			// Сеем данные клиники
			await withFixtureTenant(TEST_ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: TEST_ORG_ID,
						name: "Клиника ДЕНТЕ Лояльность",
					})
					.onConflictDoNothing();

				await tx
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: TEST_ORG_ID,
						name: "Клиника ДЕНТЕ Лояльность",
						address: "ул. Стоматологов, 10",
					})
					.onConflictDoNothing();

				await tx
					.insert(chairs)
					.values({
						id: CHAIR_ID,
						organizationId: TEST_ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 1 (Терапия)",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values({
						id: DOCTOR_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Доктор Смирнова Анна Павловна",
						email: "smirnova@dente.local",
						role: "doctor",
					})
					.onConflictDoNothing();

				const FAMILY_GROUP_ID = fixtureUuid("tg-referral-loyalty-test", 99);

				await tx
					.delete(patientReferrals)
					.where(eq(patientReferrals.organizationId, TEST_ORG_ID));
				await tx
					.delete(bonusTransactions)
					.where(eq(bonusTransactions.organizationId, TEST_ORG_ID));
				await tx
					.delete(patientBonusBalances)
					.where(eq(patientBonusBalances.organizationId, TEST_ORG_ID));
				await tx
					.delete(denteTelegramChatLinks)
					.where(eq(denteTelegramChatLinks.organizationId, TEST_ORG_ID));
				await tx
					.delete(communicationTasks)
					.where(eq(communicationTasks.organizationId, TEST_ORG_ID));
				await tx
					.delete(patients)
					.where(
						and(
							eq(patients.organizationId, TEST_ORG_ID),
							sql`id NOT IN (${REFERRER_PATIENT_ID}, ${CHILD_PATIENT_ID}, ${CHURN_PATIENT_ID})`,
						),
					);

				await tx
					.delete(appointments)
					.where(
						and(
							eq(appointments.organizationId, TEST_ORG_ID),
							sql`starts_at >= '2026-11-20T00:00:00.000Z' AND starts_at <= '2026-11-20T23:59:59.999Z'`,
						),
					);

				await tx
					.insert(familyGroups)
					.values({
						id: FAMILY_GROUP_ID,
						organizationId: TEST_ORG_ID,
						name: "Семья Ивановых",
						groupName: "Семья Ивановых",
						headPatientId: REFERRER_PATIENT_ID,
						primaryPatientId: REFERRER_PATIENT_ID,
						balance: "0.00",
					})
					.onConflictDoNothing();

				// 1. Приглашающий пациент (Referrer)
				await tx
					.insert(patients)
					.values({
						id: REFERRER_PATIENT_ID,
						organizationId: TEST_ORG_ID,
						familyGroupId: FAMILY_GROUP_ID,
						fullName: "Иванов Иван Иванович",
						phone: "+79001234567",
						status: "active",
					})
					.onConflictDoNothing();

				// 2. Ребёнок для семейного профиля
				await tx
					.insert(patients)
					.values({
						id: CHILD_PATIENT_ID,
						organizationId: TEST_ORG_ID,
						familyGroupId: FAMILY_GROUP_ID,
						fullName: "Иванов Миша Иванович",
						phone: "+79001234567",
						birthDate: "2018-05-12",
						status: "active",
					})
					.onConflictDoNothing();

				// Обновляем familyGroupId на случай если пациенты уже существовали
				await tx
					.update(patients)
					.set({ familyGroupId: FAMILY_GROUP_ID })
					.where(
						and(
							eq(patients.organizationId, TEST_ORG_ID),
							sql`${patients.id} IN (${REFERRER_PATIENT_ID}, ${CHILD_PATIENT_ID})`,
						),
					);

				// 3. Оттекающий пациент (последний визит 7 месяцев назад)
				await tx
					.insert(patients)
					.values({
						id: CHURN_PATIENT_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Петров Петр Петрович",
						phone: "+79007654321",
						status: "active",
					})
					.onConflictDoNothing();

				const sevenMonthsAgo = new Date();
				sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

				await tx
					.insert(appointments)
					.values({
						id: fixtureUuid("tg-referral-loyalty-test", 10),
						organizationId: TEST_ORG_ID,
						chairId: CHAIR_ID,
						patientId: CHURN_PATIENT_ID,
						doctorUserId: DOCTOR_ID,
						startsAt: sevenMonthsAgo,
						endsAt: new Date(sevenMonthsAgo.getTime() + 30 * 60000),
						status: "completed",
					})
					.onConflictDoNothing();

				await tx
					.insert(visits)
					.values({
						id: fixtureUuid("tg-referral-loyalty-test", 11),
						organizationId: TEST_ORG_ID,
						patientId: CHURN_PATIENT_ID,
						appointmentId: fixtureUuid("tg-referral-loyalty-test", 10),
						createdAt: sevenMonthsAgo,
						status: "signed",
					})
					.onConflictDoNothing();

				// 4. Запись для оценки NPS
				await tx
					.insert(appointments)
					.values({
						id: APPT_NPS_ID,
						organizationId: TEST_ORG_ID,
						chairId: CHAIR_ID,
						patientId: REFERRER_PATIENT_ID,
						doctorUserId: DOCTOR_ID,
						startsAt: new Date(Date.now() - 3600000),
						endsAt: new Date(),
						status: "completed",
					})
					.onConflictDoNothing();

				// 5. Запись ребёнка для семейного подтверждения
				await tx
					.insert(appointments)
					.values({
						id: APPT_FAMILY_ID,
						organizationId: TEST_ORG_ID,
						chairId: CHAIR_ID,
						patientId: CHILD_PATIENT_ID,
						doctorUserId: DOCTOR_ID,
						startsAt: new Date(Date.now() + 86400000),
						endsAt: new Date(Date.now() + 86400000 + 1800000),
						status: "planned",
					})
					.onConflictDoNothing();
			});
		}
	});

	after(async () => {
		await app?.close();
	});

	// ========================================================================
	// 1. КРИПТОГРАФИЧЕСКАЯ ВАЛИДАЦИЯ Telegram.WebApp.initData (HMAC-SHA256)
	// ========================================================================
	describe("1. Cryptographic Telegram.WebApp.initData Validation", () => {
		it("validates genuine HMAC-SHA256 signature and parses user data", () => {
			const authDateSeconds = Math.floor(Date.now() / 1000).toString();
			const userJson = JSON.stringify({
				id: 99887766,
				first_name: "Алексей",
				last_name: "Стоматологов",
				username: "alex_dental",
			});

			const rawParams = {
				auth_date: authDateSeconds,
				query_id: "AAHdK2u4AAAAAN0ra7i_1234",
				user: userJson,
			};

			const validInitData = makeInitDataString(rawParams, BOT_TOKEN);

			const result = TelegramReferralLoyaltyService.validateTelegramWebAppData(
				validInitData,
				BOT_TOKEN,
			);

			assert.equal(result.isValid, true);
			assert.ok(result.user);
			assert.equal(result.user?.id, 99887766);
			assert.equal(result.user?.first_name, "Алексей");
			assert.equal(result.user?.username, "alex_dental");
			assert.equal(result.queryId, "AAHdK2u4AAAAAN0ra7i_1234");
			assert.ok(result.authDate instanceof Date);
		});

		it("rejects forged or tampered HMAC-SHA256 signature", () => {
			const authDateSeconds = Math.floor(Date.now() / 1000).toString();
			const userJson = JSON.stringify({ id: 11111, first_name: "Hacker" });

			const rawParams = {
				auth_date: authDateSeconds,
				user: userJson,
			};

			const validInitData = makeInitDataString(rawParams, BOT_TOKEN);
			// Подменяем хэш
			const forgedInitData = validInitData.replace(/hash=[0-9a-f]+/i, "hash=deadbeef00112233445566778899aabbccddeeff");

			const result = TelegramReferralLoyaltyService.validateTelegramWebAppData(
				forgedInitData,
				BOT_TOKEN,
				{ allowDevBypass: false },
			);

			assert.equal(result.isValid, false);
			assert.ok(result.error?.includes("подпись"));
		});

		it("rejects expired Telegram WebApp session", () => {
			// Сессия 3 дня назад
			const expiredAuthDate = Math.floor((Date.now() - 3 * 86400000) / 1000).toString();
			const rawParams = {
				auth_date: expiredAuthDate,
				user: JSON.stringify({ id: 22222, first_name: "LatePatient" }),
			};

			const expiredInitData = makeInitDataString(rawParams, BOT_TOKEN);

			const result = TelegramReferralLoyaltyService.validateTelegramWebAppData(
				expiredInitData,
				BOT_TOKEN,
				{ maxAgeSeconds: 86400, allowDevBypass: false },
			);

			assert.equal(result.isValid, false);
			assert.ok(result.error?.includes("истек"));
		});
	});

	// ========================================================================
	// 2. РЕФЕРАЛЬНАЯ ПРОГРАММА («ПРИВЕДИ ДРУГА» + БОНУСНЫЙ БАЛАНС)
	// ========================================================================
	describe("2. Referral Program & Bonus Cashback Engine", () => {
		it("generates personalized referral link with valid deep-link format", () => {
			const ref = TelegramReferralLoyaltyService.generateReferralLink(
				"@DenteBot",
				REFERRER_PATIENT_ID,
			);

			assert.ok(ref.deepLink.startsWith("https://t.me/DenteBot?start=ref_"));
			assert.ok(ref.deepLink.includes(REFERRER_PATIENT_ID));
			assert.ok(ref.shareText.includes("1 000 ₽"));
			assert.ok(ref.shareText.includes("DENTE"));
		});

		it("processes referral /start: credits +1000 ₽ to friend and +500 ₽ to referrer", async () => {
			const refereeChatId = 77112233;
			const startPayload = `ref_${REFERRER_PATIENT_ID}`;

			const res = await TelegramReferralLoyaltyService.processReferralStart(
				TEST_ORG_ID,
				refereeChatId,
				startPayload,
				{
					fullName: "Соколов Сергей Васильевич",
					phone: "+79051239988",
					username: "sokolov_friend",
				},
			);

			assert.equal(res.success, true);
			assert.equal(res.isNewReferral, true);
			assert.equal(res.refereeBonusRub, 1000);
			assert.equal(res.referrerBonusRub, 500);
			assert.ok(res.welcomeMessage.replace(/\u00a0/g, " ").includes("1 000 ₽"));
			assert.ok(res.refereePatientId);

			// Проверяем начисление в базе данных при наличии подключения
			if (isDbAvailable) {
				await withFixtureTenant(TEST_ORG_ID, async (tx) => {
					// Баланс друга
					const [refereeBalance] = await tx
						.select()
						.from(patientBonusBalances)
						.where(
							and(
								eq(patientBonusBalances.organizationId, TEST_ORG_ID),
								eq(patientBonusBalances.patientId, res.refereePatientId!),
							),
						);
					assert.ok(refereeBalance);
					assert.equal(Number(refereeBalance.activePoints), 1000);

					// Баланс пригласившего
					const [referrerBalance] = await tx
						.select()
						.from(patientBonusBalances)
						.where(
							and(
								eq(patientBonusBalances.organizationId, TEST_ORG_ID),
								eq(patientBonusBalances.patientId, REFERRER_PATIENT_ID),
							),
						);
					assert.ok(referrerBalance);
					assert.equal(Number(referrerBalance.activePoints), 500);

					// Транзакции в bonusTransactions
					const refereeTxs = await tx
						.select()
						.from(bonusTransactions)
						.where(
							and(
								eq(bonusTransactions.organizationId, TEST_ORG_ID),
								eq(bonusTransactions.patientId, res.refereePatientId!),
							),
						);
					assert.equal(refereeTxs.length, 1);
					assert.equal(Number(refereeTxs[0]!.amountPoints), 1000);
					assert.equal(refereeTxs[0]!.type, "accrual");

					// Связка в patientReferrals
					const [referralRow] = await tx
						.select()
						.from(patientReferrals)
						.where(
							and(
								eq(patientReferrals.organizationId, TEST_ORG_ID),
								eq(patientReferrals.referrerPatientId, REFERRER_PATIENT_ID),
								eq(patientReferrals.refereePatientId, res.refereePatientId!),
							),
						);
					assert.ok(referralRow);
					assert.equal(referralRow.status, "completed");
				});
			}

			// Повторный переход того же друга не дублирует бонус (идемпотентность)
			const secondCall = await TelegramReferralLoyaltyService.processReferralStart(
				TEST_ORG_ID,
				refereeChatId,
				startPayload,
			);
			assert.equal(secondCall.success, true);
			assert.equal(secondCall.isNewReferral, false);
		});
	});

	// ========================================================================
	// 3. СЕМЕЙНЫЙ ПРОФИЛЬ И ПОДТВЕРЖДЕНИЕ ЗАПИСИ
	// ========================================================================
	describe("3. Family Access & Profile Engine", () => {
		it("retrieves family profile with members and aggregated balance", async () => {
			const familyProfile = await TelegramReferralLoyaltyService.getFamilyProfile(
				TEST_ORG_ID,
				REFERRER_PATIENT_ID,
			);

			assert.ok(familyProfile.familyGroupName.includes("Ивановых"));
			assert.equal(familyProfile.headPatientId, REFERRER_PATIENT_ID);
			assert.ok(familyProfile.members.length >= 2);

			const selfMember = familyProfile.members.find(
				(m) => m.patientId === REFERRER_PATIENT_ID,
			);
			const childMember = familyProfile.members.find(
				(m) => m.patientId === CHILD_PATIENT_ID || m.relation === "child",
			);

			assert.ok(selfMember);
			assert.equal(selfMember.relation, "self");
			assert.ok(childMember);
			assert.equal(childMember.relation, "child");
			assert.equal(childMember.fullName, "Иванов Миша Иванович");
		});

		it("allows parent to confirm booking for child in 1-click", async () => {
			const confirmResult = await TelegramReferralLoyaltyService.confirmFamilyAppointment(
				TEST_ORG_ID,
				REFERRER_PATIENT_ID,
				APPT_FAMILY_ID,
			);

			assert.equal(confirmResult.success, true);
			assert.equal(confirmResult.newStatus, "confirmed");

			// Проверяем в БД статус записи при наличии соединения
			if (isDbAvailable) {
				await withFixtureTenant(TEST_ORG_ID, async (tx) => {
					const [appt] = await tx
						.select()
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, TEST_ORG_ID),
								eq(appointments.id, APPT_FAMILY_ID),
							),
						);
					assert.ok(appt);
					assert.equal(appt.status, "confirmed");
				});
			}
		});
	});

	// ========================================================================
	// 4. SMART CHURN RESUSCITATION (RETENTION RADAR)
	// ========================================================================
	describe("4. Smart Churn Resuscitation (Retention Radar)", () => {
		it("detects patients inactive for 6+ months and generates non-intrusive hygiene recall copy", async () => {
			const churnList = await TelegramReferralLoyaltyService.findChurnCandidates(
				TEST_ORG_ID,
				{ minMonths: 6 },
			);

			assert.ok(churnList.length > 0);
			const target = churnList.find((c) => c.patientId === CHURN_PATIENT_ID || c.fullName.includes("Петров"));
			assert.ok(target, "Петров Петр Петрович должен быть найден в списке оттока");
			assert.ok(target.monthsSinceLastVisit >= 6);
			assert.equal(target.personalDiscountPercent, 20);
			assert.ok(
				target.inviteText.includes("профессиональн") &&
				target.inviteText.includes("гигиен"),
			);
			assert.ok(target.inviteText.includes("20%"));
			assert.ok(!target.inviteText.includes("незавершенное лечение"));
		});
	});

	// ========================================================================
	// 5. POST-VISIT NPS FEEDBACK ROUTING (1-5 STARS)
	// ========================================================================
	describe("5. Post-Visit NPS Feedback Engine", () => {
		it("routes 5/5 score to external review platforms (Yandex Maps / 2GIS)", async () => {
			const npsResult = await TelegramReferralLoyaltyService.handleNpsFeedback(
				TEST_ORG_ID,
				{
					appointmentId: APPT_NPS_ID,
					score: 5,
				},
				{
					clinicName: "Клиника ДЕНТЕ",
					yandexMapsUrl: "https://yandex.ru/maps/org/dente_test",
					twoGisUrl: "https://2gis.ru/dente_test",
				},
			);

			assert.equal(npsResult.normalizedScore, 5);
			assert.equal(npsResult.routeDestination, "external_review");
			assert.equal(npsResult.yandexMapsUrl, "https://yandex.ru/maps/org/dente_test");
			assert.equal(npsResult.twoGisUrl, "https://2gis.ru/dente_test");
			assert.equal(npsResult.taskCreatedId, null);
			assert.ok(npsResult.replyMessage.includes("высшую оценку"));
		});

		it("routes 1-4 score to internal service recovery task in communicationTasks", async () => {
			const npsResult = await TelegramReferralLoyaltyService.handleNpsFeedback(
				TEST_ORG_ID,
				{
					appointmentId: APPT_NPS_ID,
					score: 2,
					comment: "Долго ждал приёма, ассистент был не очень вежлив",
				},
				{
					clinicName: "Клиника ДЕНТЕ",
				},
			);

			assert.equal(npsResult.normalizedScore, 2);
			assert.equal(npsResult.routeDestination, "service_recovery_alert");
			assert.ok(npsResult.taskCreatedId);
			assert.ok(npsResult.replyMessage.includes("честную обратную связь"));

			// Проверяем задачу в communicationTasks при наличии БД
			if (isDbAvailable) {
				await withFixtureTenant(TEST_ORG_ID, async (tx) => {
					const [task] = await tx
						.select()
						.from(communicationTasks)
						.where(
							and(
								eq(communicationTasks.organizationId, TEST_ORG_ID),
								eq(communicationTasks.id, npsResult.taskCreatedId!),
							),
						);
					assert.ok(task);
					assert.equal(task.workflowCode, "nps_service_recovery");
					assert.equal(task.assignedRole, "head_doctor");
					assert.equal(task.priority, "high");
					assert.ok(task.body.includes("2/5"));
					assert.ok(task.body.includes("не очень вежлив"));
				});
			}
		});
	});

	// ========================================================================
	// 6. ИНТЕРАКТИВНАЯ ЖАЛОБА НА ЗУБ (FDI) И ОНЛАЙН-ЗАПИСЬ ИЗ WEBAPP
	// ========================================================================
	describe("6. Tooth Complaint (FDI) & WebApp Slot Booking", () => {
		it("submits tooth complaint for FDI 16 CITO and creates CRM triage lead", async () => {
			const complaint: ToothComplaintInput = {
				toothNumber: 16,
				symptom: "Острая пульсирующая боль",
				painIntensity: 5,
				urgency: "cito",
				notes: "Острая боль ночью, обезболивающее не помогает",
			};

			const result = await TelegramReferralLoyaltyService.submitToothComplaint(
				TEST_ORG_ID,
				REFERRER_PATIENT_ID,
				complaint,
			);

			assert.equal(result.success, true);
			assert.equal(result.urgency, "cito");
			assert.ok(result.leadId);
			assert.ok(result.autoReplyText?.includes("16"));
			assert.ok(result.autoReplyText?.includes("СРОЧНО"));

			// Проверяем задачу для регистратуры в базе при наличии соединения
			if (isDbAvailable) {
				await withFixtureTenant(TEST_ORG_ID, async (tx) => {
					const [task] = await tx
						.select()
						.from(communicationTasks)
						.where(
							and(
								eq(communicationTasks.organizationId, TEST_ORG_ID),
								eq(communicationTasks.id, result.leadId!),
							),
						);
					assert.ok(task);
					assert.equal(task.priority, "urgent");
					assert.ok(task.title?.includes("16"));
				});
			}
		});

		it("books appointment from WebApp and records booking in CRM", async () => {
			const bookingInput: WebAppBookingInput = {
				doctorId: DOCTOR_ID,
				date: "2026-11-20",
				time: "14:30",
				serviceName: "Лечение кариеса",
				complaintNotes: "Запись из Telegram WebApp",
			};

			const bookingResult = await TelegramReferralLoyaltyService.bookAppointmentFromWebApp(
				TEST_ORG_ID,
				REFERRER_PATIENT_ID,
				bookingInput,
			);

			assert.equal(bookingResult.success, true);
			assert.ok(bookingResult.appointmentId);
			assert.ok(bookingResult.confirmationMessage?.includes("20.11.2026"));
			assert.ok(bookingResult.confirmationMessage?.includes("14:30"));

			// Проверяем запись в БД при наличии соединения
			if (isDbAvailable) {
				await withFixtureTenant(TEST_ORG_ID, async (tx) => {
					const [appt] = await tx
						.select()
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, TEST_ORG_ID),
								eq(appointments.id, bookingResult.appointmentId!),
							),
						);
					assert.ok(appt);
					assert.equal(appt.patientId, REFERRER_PATIENT_ID);
					assert.equal(appt.doctorUserId, DOCTOR_ID);
					assert.equal(appt.status, "planned");
				});
			}
		});
	});

	// ========================================================================
	// 7. ИНТЕГРАЦИЯ REST ЭНДПОИНТОВ FASTIFY
	// ========================================================================
	describe("7. Fastify REST Endpoints Integration", () => {
		it("POST /api/telegram/webapp/session returns session data", async () => {
			const authDate = Math.floor(Date.now() / 1000).toString();
			const initData = makeInitDataString(
				{
					auth_date: authDate,
					user: JSON.stringify({ id: 999111, first_name: "Иван" }),
				},
				BOT_TOKEN,
			);

			const resp = await app.inject({
				method: "POST",
				url: "/api/telegram/webapp/session",
				payload: {
					organizationId: TEST_ORG_ID,
					patientId: REFERRER_PATIENT_ID,
					initData,
				},
			});

			assert.equal(resp.statusCode, 200);
			const body = JSON.parse(resp.body);
			assert.equal(body.authenticated, true);
			assert.ok(body.patient);
			assert.equal(body.patient.id, REFERRER_PATIENT_ID);
		});

		it("GET /api/telegram/loyalty/referral-link/:patientId returns link", async () => {
			const resp = await app.inject({
				method: "GET",
				url: `/api/telegram/loyalty/referral-link/${REFERRER_PATIENT_ID}?organizationId=${TEST_ORG_ID}`,
			});

			assert.equal(resp.statusCode, 200);
			const body = JSON.parse(resp.body);
			assert.ok(body.deepLink);
			assert.ok(body.shareText);
		});

		it("GET /api/telegram/loyalty/retention-radar returns churn candidates", async () => {
			const resp = await app.inject({
				method: "GET",
				url: `/api/telegram/loyalty/retention-radar?organizationId=${TEST_ORG_ID}&months=6`,
			});

			assert.equal(resp.statusCode, 200);
			const body = JSON.parse(resp.body);
			assert.equal(body.success, true);
			assert.ok(Array.isArray(body.candidates));
			assert.ok(body.candidates.length > 0);
		});

		it("GET /api/telegram/family/members/:patientId returns family members", async () => {
			const resp = await app.inject({
				method: "GET",
				url: `/api/telegram/family/members/${REFERRER_PATIENT_ID}?organizationId=${TEST_ORG_ID}`,
			});

			assert.equal(resp.statusCode, 200);
			const body = JSON.parse(resp.body);
			assert.ok(body.family);
			assert.ok(body.family.members.length >= 2);
		});
	});

	// ========================================================================
	// 8. TELEGRAM BOT WEBHOOK ДИСПЕТЧЕРИЗАЦИЯ
	// ========================================================================
	describe("8. Telegram Bot Webhook Dispatch Integration", () => {
		it("handles /start ref_... deep link in webhook and outputs webapp button", async () => {
			const updatePayload = {
				update_id: 887701,
				message: {
					message_id: 55441,
					chat: { id: 770099, type: "private" },
					from: {
						id: 770099,
						first_name: "Новый",
						last_name: "Друг",
						username: "new_friend_ref",
					},
					text: `/start ref_${REFERRER_PATIENT_ID}`,
				},
			};

			const resp = await app.inject({
				method: "POST",
				url: "/api/telegram/webhook",
				headers: {
					"content-type": "application/json",
					"x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
				},
				payload: updatePayload,
			});

			if (resp.statusCode !== 200) {
				console.error("WEBHOOK 500 ERROR BODY 1:", resp.body);
			}
			assert.equal(resp.statusCode, 200);
			const body = JSON.parse(resp.body);
			assert.equal(body.ok, true);
			assert.equal(body.action, "telegram_referral_start_handled");
			assert.ok(body.suggestedReply?.replace(/[\u00a0\u202f\s]+/g, " ").includes("1 000 ₽"));
			assert.ok(body.suggestedReplyMarkup);
		});

		it("handles nps: callback query in webhook and responds with appropriate rating flow", async () => {
			const updatePayload = {
				update_id: 887702,
				callback_query: {
					id: "cb_nps_9911",
					chat: { id: 770099, type: "private" },
					from: { id: 770099, first_name: "Пациент" },
					data: `nps:${APPT_NPS_ID}:5`,
				},
			};

			const resp = await app.inject({
				method: "POST",
				url: "/api/telegram/webhook",
				headers: {
					"content-type": "application/json",
					"x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
				},
				payload: updatePayload,
			});

			assert.equal(resp.statusCode, 200);
			const body = JSON.parse(resp.body);
			assert.equal(body.ok, true);
			assert.equal(body.action, "telegram_nps_external_review_routed");
			assert.ok(body.suggestedReply?.includes("высшую оценку"));
		});
	});
});
