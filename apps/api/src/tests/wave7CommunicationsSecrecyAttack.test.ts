/**
 * RED-TEAM HAMMER INQUISITION: WAVE 7 — OMNICHANNEL COMMUNICATIONS & 152-FZ PERIMETER ATTACK
 * PROSECUTOR 1: THE 152-FZ STRIPPER
 *
 * Attack targets:
 * - POST /api/communications/outbox (SMS, WhatsApp, Telegram)
 * - POST /api/communications/outbox/dispatch (External gateway transmission)
 * - POST /api/communications/templates/preview (PHI leak via template renderer)
 * - POST /api/communications/templates (Hardcoded clinical diagnoses in templates)
 *
 * Compliance invariants under attack:
 * - 152-ФЗ ст. 7 (Конфиденциальность персональных данных)
 * - 152-ФЗ ст. 10 (Специальные категории ПДн: состояние здоровья, диагнозы)
 * - 323-ФЗ ст. 13 (Врачебная тайна: запрет передачи третьим лицам и операторам связи без согласия)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	communicationOutbox,
	communicationTemplates,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { registerCommunicationOutboxRoutes } from "../routes/communicationsOutbox.js";
import { authTokenSecret } from "../security/authSecret.js";
import { registerMedicalSecrecyPayloadStripping } from "../security/medicalSecrecyWarden.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerRouteNotFoundHandler } from "../utils/routeNotFound.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "wave7CommAttack";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const ADMIN_USER_ID = fixtureUuid(NAMESPACE, 2);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);

describe("RED-TEAM HAMMER: WAVE 7 — Omnichannel Communications Medical Secrecy Attack", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let adminStaffToken = "";
	let marketerStaffToken = "";
	let databaseReady = true;

	const CLINICAL_DIAGNOSTIC_TERMS = [
		/K0[0-9]\.\d+/i,
		/B2[0-4]/i, // ВИЧ
		/B18/i, // Гепатит
		/пульпит/i,
		/кариес/i,
		/периодонтит/i,
		/пародонтит/i,
		/ВИЧ/i,
		/гепатит/i,
		/экстирпаци/i,
	];

	function detectLeaks(payload: unknown, currentPath = ""): string[] {
		const leaks: string[] = [];
		if (payload === null || payload === undefined) return leaks;

		if (typeof payload === "string") {
			for (const pattern of CLINICAL_DIAGNOSTIC_TERMS) {
				if (pattern.test(payload)) {
					leaks.push(`[CLINICAL_TEXT_LEAK] ${currentPath || "root"} matched ${pattern}: "${payload.slice(0, 120)}"`);
					break;
				}
			}
			return leaks;
		}

		if (Array.isArray(payload)) {
			payload.forEach((item, index) => {
				leaks.push(...detectLeaks(item, `${currentPath}[${index}]`));
			});
			return leaks;
		}

		if (typeof payload === "object") {
			for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
				const path = currentPath ? `${currentPath}.${key}` : key;
				leaks.push(...detectLeaks(value, path));
			}
		}

		return leaks;
	}

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORGANIZATION_ID,
					name: "Клиника Аудита Связи Wave 7",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values([
					{
						id: ADMIN_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Главный Администратор Смены",
						role: "administrator",
						isActive: true,
					},
					{
						id: MARKETER_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Маркетолог Взломщик Рассылок",
						role: "marketer",
						isActive: true,
					},
				])
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Пациент Для Рассылок 152-ФЗ",
					phone: "+79998881122",
					birthDate: "1990-05-15",
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORGANIZATION_ID }, secret);
		adminStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: ADMIN_USER_ID,
				role: "administrator",
				fullName: "Главный Администратор",
			},
			secret,
		);
		marketerStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: MARKETER_USER_ID,
				role: "marketer",
				fullName: "Маркетолог Взломщик",
			},
			secret,
		);

		app = createTenantTestApp();
		registerRouteNotFoundHandler(app);
		registerMedicalSecrecyPayloadStripping(app);
		await registerCommunicationOutboxRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	// =========================================================================
	// АТАКА 1: ПРЯМОЙ ДИАГНОЗ В SMS-СООБЩЕНИИ ЧЕРЕЗ OUTBOX
	// =========================================================================
	test("ATTACK 1: Direct Medical Diagnosis Injection into SMS Outbox", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const maliciousSmsText = "Уважаемый пациент! У вас острый пульпит K04.0 зуба 46, срочно придите на удаление нерва.";

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/outbox",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				channel: "sms",
				recipientAddress: "+79998881122",
				patientId: PATIENT_ID,
				intent: "general",
				body: maliciousSmsText,
				dedupeKey: `attack-sms-1-${Date.now()}`,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: POST /api/communications/outbox (SMS)]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		// Проверяем статус ответа и БД
		if (res.statusCode === 422 || res.statusCode === 400) {
			console.log("✔ Запрос на отправку SMS с диагнозом успешно отклонён с кодом:", res.statusCode);
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				const [outboxRow] = await db
					.select()
					.from(communicationOutbox)
					.where(eq(communicationOutbox.recipientAddress, "+79998881122"))
					.limit(1);

				assert.equal(outboxRow, undefined, "В БД не должно быть сохранено несанкционированное сообщение");
			});
		} else {
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				const [outboxRow] = await db
					.select()
					.from(communicationOutbox)
					.where(eq(communicationOutbox.recipientAddress, "+79998881122"))
					.limit(1);

				assert.ok(outboxRow, "Запись должна существовать в БД");
				console.log("[RED-TEAM AUDIT 1: Stored Body in DB]:", outboxRow.body);
				const leaks = detectLeaks(outboxRow.body);
				if (leaks.length > 0) {
					console.error("\n[CRITICAL VULNERABILITY]: Диагноз сохранён в очереди SMS без санитайзера 152-ФЗ!", leaks);
					assert.fail(
						`КРИТИЧЕСКИЙ БРАК: Прямой клинический диагноз («K04.0 пульпит») поставлен в очередь отправки SMS третьим лицам / операторам связи!\nТекст в БД: "${outboxRow.body}"`,
					);
				}
			});
		}
	});

	// =========================================================================
	// АТАКА 2: ДИАГНОЗЫ СПЕЦИАЛЬНОЙ КАТЕГОРИИ (ВИЧ/ГЕПАТИТ) В WHATSAPP OUTBOX
	// =========================================================================
	test("ATTACK 2: Special Category Diagnoses (HIV/Hepatitis) in WhatsApp Outbox", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const maliciousWaText = "Результаты анализов: выявлена ВИЧ-инфекция (код B20) и хронический вирусный гепатит C (B18.2).";

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/outbox",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				channel: "whatsapp",
				recipientAddress: "+79998881122",
				patientId: PATIENT_ID,
				intent: "general",
				body: maliciousWaText,
				dedupeKey: `attack-wa-2-${Date.now()}`,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: POST /api/communications/outbox (WhatsApp)]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 422 || res.statusCode === 400) {
			console.log("✔ Запрос на отправку WhatsApp с ВИЧ/Гепатитом успешно отклонён с кодом:", res.statusCode);
		} else {
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				const rows = await db
					.select()
					.from(communicationOutbox)
					.where(eq(communicationOutbox.channel, "whatsapp"));

				for (const row of rows) {
					const leaks = detectLeaks(row.body);
					if (leaks.length > 0) {
						console.error("\n[CRITICAL VULNERABILITY]: Специальная категория ПДн (ВИЧ/Гепатит) в очереди WhatsApp!", leaks);
						assert.fail(
							`КАТАСТРОФИЧЕСКИЙ БРАК: Сведения о ВИЧ и Гепатите поставлены в очередь WhatsApp без защиты врачебной тайны!\nТекст: "${row.body}"`,
						);
					}
				}
			});
		}
	});

	// =========================================================================
	// АТАКА 3: ЗУБНАЯ ФОРМУЛА И ПЕРИОДОНТИТ В TELEGRAM OUTBOX
	// =========================================================================
	test("ATTACK 3: Tooth Formula & Periodontitis in Telegram Outbox", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const maliciousTgText = "Клинический статус: зуб 46 — хронический периодонтит K04.5, зуб 47 — пародонтит K05.3. Назначена операция.";

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/outbox",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				channel: "telegram",
				recipientAddress: "123456789",
				patientId: PATIENT_ID,
				intent: "general",
				body: maliciousTgText,
				dedupeKey: `attack-tg-3-${Date.now()}`,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3: POST /api/communications/outbox (Telegram)]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 422 || res.statusCode === 400) {
			console.log("✔ Запрос на отправку Telegram с периодонтитом успешно отклонён с кодом:", res.statusCode);
		} else {
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				const rows = await db
					.select()
					.from(communicationOutbox)
					.where(eq(communicationOutbox.channel, "telegram"));

				for (const row of rows) {
					const leaks = detectLeaks(row.body);
					if (leaks.length > 0) {
						console.error("\n[CRITICAL VULNERABILITY]: Зубная формула и диагнозы периодонтита в Telegram outbox!", leaks);
						assert.fail(
							`КРИТИЧЕСКИЙ БРАК: Зубная формула и периодонтит в очереди Telegram!\nТекст: "${row.body}"`,
						);
					}
				}
			});
		}
	});

	// =========================================================================
	// АТАКА 4: УТЕЧКА PHI ПРИ ПРЕДПРОСМОТРЕ ШАБЛОНА (/api/communications/templates/preview)
	// =========================================================================
	test("ATTACK 4: PHI Leakage via Template Preview Endpoint", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/templates/preview",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				channel: "sms",
				body: "Здравствуйте, {patient}! Ваш диагноз: {diagnosis}, зуб: {tooth}.",
				values: {
					patient: "Иван Иванов",
					diagnosis: "Острый пульпит K04.0",
					tooth: "46",
				},
				allowPhi: true, // ХАК: клиент сам выставляет allowPhi: true
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4: POST /api/communications/templates/preview]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 403) {
			console.log("✔ Запрос preview с allowPhi: true отклонён для неклинической роли (403 Forbidden)");
			const body = JSON.parse(res.payload);
			assert.equal(body.error, "PermissionDenied");
		} else if (res.statusCode === 200) {
			const body = JSON.parse(res.payload);
			const leaks = detectLeaks(body);
			console.log("[RED-TEAM AUDIT 4: Preview Leaks count]:", leaks.length, leaks);

			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN TEMPLATE PREVIEW]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Эндпоинт preview отрендерил и вернул клинический диагноз в открытом виде!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 5: СОХРАНЕНИЕ ШАБЛОНА С ЗАШИТЫМ ДИАГНОЗОМ В ТЕЛЕ
	// =========================================================================
	test("ATTACK 5: Template Creation with Hardcoded Clinical Diagnosis in Body", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				title: "Шаблон оповещения о пульпите",
				channel: "sms",
				intent: "recall",
				audienceRole: "patient",
				body: "У вас диагностирован острый пульпит K04.0. Срочно явитесь к терапевту.",
				isActive: true,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5: POST /api/communications/templates]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 422 || res.statusCode === 400) {
			console.log("✔ Создание шаблона с открытым диагнозом отклонено валидатором с кодом:", res.statusCode);
			const body = JSON.parse(res.payload);
			assert.equal(body.error, "MedicalSecrecyViolation");
		} else {
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				const [templateRow] = await db
					.select()
					.from(communicationTemplates)
					.where(eq(communicationTemplates.title, "Шаблон оповещения о пульпите"))
					.limit(1);

				if (templateRow) {
					console.log("[RED-TEAM AUDIT 5: Stored Template in DB]:", templateRow.body);
					const leaks = detectLeaks(templateRow.body);
					if (leaks.length > 0) {
						console.error("\n[CRITICAL VULNERABILITY]: Шаблон с зашитым диагнозом сохранён в БД!", leaks);
						assert.fail(
							`КРИТИЧЕСКИЙ БРАК: В справочник шаблонов сохранён шаблон с открытым медицинским диагнозом без проверки 152-ФЗ!\nТекст: "${templateRow.body}"`,
						);
					}
				}
			});
		}
	});

	// =========================================================================
	// АТАКА 6: ВЫГРУЗКА И ДИСПЕТЧЕРИЗАЦИЯ ОЧЕРЕДИ С ДИАГНОЗАМИ ВО ВНЕШНИЕ ШЛЮЗЫ
	// =========================================================================
	test("ATTACK 6: Dispatching Outbox Messages with Medical Diagnoses", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Внедряем тестовую запись напрямую в БД, симулируя обход
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.insert(communicationOutbox).values({
				organizationId: ORGANIZATION_ID,
				channel: "sms",
				intent: "general",
				recipientAddress: "+79997776655",
				body: "У вас острый пульпит K04.0 зуба 46, операция назначена на завтра.",
				status: "queued",
				dedupeKey: `attack-bypass-${Date.now()}`,
				scheduledAt: new Date(),
			});
		});

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/outbox/dispatch",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
			},
			payload: {
				batchSize: 10,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 6: POST /api/communications/outbox/dispatch]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		await withFixtureTenant(ORGANIZATION_ID, async () => {
			const rows = await db
				.select()
				.from(communicationOutbox)
				.where(eq(communicationOutbox.recipientAddress, "+79997776655"));

			for (const row of rows) {
				console.log(`[RED-TEAM AUDIT 6: Direct injection status: ${row.status}]:`, row.body);
				assert.equal(
					row.status,
					"suppressed",
					`КРИТИЧЕСКИЙ БРАК: Сообщение с медицинским диагнозом не было подавлено диспетчером! Статус: ${row.status}`,
				);
			}
		});
	});
});
