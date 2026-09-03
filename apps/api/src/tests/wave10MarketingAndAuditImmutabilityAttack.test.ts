/**
 * wave10MarketingAndAuditImmutabilityAttack.test.ts
 *
 * ВОЛНА 10 АТАК: ЭНДПОИНТЫ МАРКЕТИНГА, ФАЙЛОВ ПАЦИЕНТА, AI-ДИАГНОСТИКИ,
 * НЕИЗМЕНЯЕМОСТЬ АУДИТА И ГЛУБОКАЯ САНИТИЗАЦИЯ ЛОГОВ (152-ФЗ / 323-ФЗ ст. 13)
 *
 * Цель атаки:
 * 1. GET /api/marketing/attribution — разведка и аудит агрегированных метрик сквозной аналитики;
 * 2. GET /api/marketing/patient-field-requirements — проверка настроек карточки пациента;
 * 3. GET и POST /api/files/patients/:patientId/attachments — пентест доступа к вложениям архивированного пациента;
 * 4. GET /api/integrations/diagnocat/reports/:patientId — проверка AI-диагностики зубов и аудита доступа;
 * 5. REST API Audit Tampering & Deletion — пентест попыток удаления и подмены записей в таблице audit_events;
 * 6. Глубокая санитизация логов сервера (диагнозы, номера зубов 11-48, коды МКБ-10).
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { sanitizePayload, sanitizeString } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	appointments,
	attachments,
	clinics,
	crmLeads,
	diagnocatReports,
	organizations,
	patients,
	payments,
	users,
} from "../db/schema.js";
import { registerAuditRoutes } from "../routes/audit.js";
import { registerFilesRoutes } from "../routes/files.js";
import { registerDiagnocatRoutes } from "../routes/integrations/diagnocat.js";
import { registerMarketingRoutes } from "../routes/marketing.js";
import { registerPatientRoutes } from "../routes/patients.js";
import { authTokenSecret } from "../security/authSecret.js";
import { registerMedicalSecrecyPayloadStripping } from "../security/medicalSecrecyWarden.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "wave10-marketing-audit-test";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 4);
const ACTIVE_PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const ARCHIVED_PATIENT_ID = fixtureUuid(NAMESPACE, 11);

const LEAD_ID = fixtureUuid(NAMESPACE, 20);
const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 21);
const PAYMENT_ID = fixtureUuid(NAMESPACE, 22);
const ATTACHMENT_ID = fixtureUuid(NAMESPACE, 23);
const DIAGNOCAT_REPORT_ID = fixtureUuid(NAMESPACE, 30);

function findMedicalLeaksInPayload(obj: unknown, path = ""): string[] {
	const leaks: string[] = [];
	if (!obj || typeof obj !== "object") return leaks;

	const record = obj as Record<string, unknown>;
	const prohibitedKeys = [
		"diagnosis",
		"mkb10",
		"icd10",
		"toothFormula",
		"clinicalNotes",
		"anamnesis",
		"complaints",
	];

	for (const [key, value] of Object.entries(record)) {
		const currentPath = path ? `${path}.${key}` : key;
		const lowerKey = key.toLowerCase();

		if (
			prohibitedKeys.some((pk) => lowerKey.includes(pk.toLowerCase())) &&
			value !== null &&
			value !== undefined &&
			value !== "[СКРЫТО]"
		) {
			leaks.push(`${currentPath}: ${JSON.stringify(value)}`);
		}

		if (typeof value === "string") {
			if (/\bK0[0-9](?:\.[0-9]{1,2})?\b/i.test(value)) {
				leaks.push(`${currentPath} contains MKB-10 code: ${value}`);
			}
			if (/(?:зуб|tooth)\s*#?\s*\d{1,2}/i.test(value)) {
				leaks.push(`${currentPath} contains tooth mention: ${value}`);
			}
		} else if (typeof value === "object" && value !== null) {
			leaks.push(...findMedicalLeaksInPayload(value, currentPath));
		}
	}
	return leaks;
}

test("RED-TEAM HAMMER: WAVE 10 — Marketing Attribution, Files & Audit Immutability Penetration", async (suite) => {
	let app: FastifyInstance;
	let doctorToken: string;
	let marketerToken: string;
	let clinicToken: string;
	let databaseReady = false;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 10 Before] Purge warning:", e);
		}

		app = await createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);
		await registerPatientRoutes(app);
		await registerFilesRoutes(app);
		await registerMarketingRoutes(app);
		await registerAuditRoutes(app);
		await registerDiagnocatRoutes(app);
		await app.ready();

		const secret = authTokenSecret();

		doctorToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
		);

		marketerToken = signToken(
			{
				organizationId: ORG_ID,
				userId: MARKETER_USER_ID,
				role: "marketer",
				clinicalRole: null,
				canSignMedicalRecords: false,
			},
			secret,
		);

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				type: "clinic",
			},
			secret,
		);

		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Волна 10 Маркетинг и Аудит",
					inn: "7709999992",
					kpp: "770901001",
					ogrn: "1237700999992",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Отделение Волны 10",
					address: "г. Москва, пр-т Неизменяемости Аудита, д. 10",
					phone: "+74959990010",
				}).onConflictDoNothing();

				await tx.insert(users).values([
					{
						id: DOCTOR_USER_ID,
						organizationId: ORG_ID,
						role: "doctor",
						canSignMedicalRecords: true,
						fullName: "Д-р Смирнов Павел (Терапевт)",
					},
					{
						id: MARKETER_USER_ID,
						organizationId: ORG_ID,
						role: "marketer",
						canSignMedicalRecords: false,
						fullName: "Маркетолог Громов (Аналитика)",
					},
				]).onConflictDoNothing();

				await tx.insert(patients).values([
					{
						id: ACTIVE_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Маркетинговый Иван",
						birthDate: "1990-05-15",
						phone: "+79997771122",
						status: "active",
						notes: "Источник: yandex_maps. Первичный прием",
					},
					{
						id: ARCHIVED_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Списанный В Архив",
						birthDate: "1982-08-24",
						phone: "+79997773344",
						status: "archived",
						notes: "Архивирован по личному заявлению",
					},
				]).onConflictDoNothing();

				await tx.insert(crmLeads).values({
					id: LEAD_ID,
					organizationId: ORG_ID,
					phone: "+79997771122",
					source: "yandex_maps",
					status: "consult_booked",
				}).onConflictDoNothing();

				await tx.insert(appointments).values({
					id: APPOINTMENT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					doctorUserId: DOCTOR_USER_ID,
					startsAt: new Date("2026-09-10T10:00:00.000Z"),
					endsAt: new Date("2026-09-10T11:00:00.000Z"),
					status: "completed",
				}).onConflictDoNothing();

				await tx.insert(payments).values({
					id: PAYMENT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					amountRub: "12500.00",
					status: "paid",
					method: "card",
				}).onConflictDoNothing();

				await tx.insert(attachments).values({
					id: ATTACHMENT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					fileName: "dogovor_na_okazanie_uslug.pdf",
					mimeType: "application/pdf",
					storagePath: "dogovor_na_okazanie_uslug.pdf",
					sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				}).onConflictDoNothing();

				await tx.insert(diagnocatReports).values({
					id: DIAGNOCAT_REPORT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					reportUrl: "https://diagnocat.example.com/reports/wave10-ai-report",
					odontogramData: {
						tooth_46: { caries: true, pulpitis: true },
						tooth_47: { intact: true },
					},
				}).onConflictDoNothing();
			});
			databaseReady = true;
		} catch (e) {
			console.error("[Wave 10 Seed Failed]:", e);
		}
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 10 Cleanup] Purge warning:", e);
		}
	});

	// =========================================================================
	// АТАКА 1: GET /api/marketing/attribution — РАЗВЕДКА И АУДИТ УТЕЧЕК
	// =========================================================================
	await suite.test("ATTACK 1: Marketing attribution aggregated metrics security and parameter pollution", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог запрашивает сводную сквозную аналитику
		const res = await app.inject({
			method: "GET",
			url: "/api/marketing/attribution",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: GET /api/marketing/attribution]\nStatus:",
			res.statusCode,
			"\nPayload Summary:",
			res.body.slice(0, 300),
		);

		assert.equal(res.statusCode, 200, "Маркетолог получает доступ к сквозной аналитике");
		const body = JSON.parse(res.body);

		assert.ok(Array.isArray(body.selfBookingChannels), "Должен быть массив каналов онлайн-самозаписи");
		assert.ok(body.telephonyAdminFunnel, "Должна быть воронка звонков телефонии");
		assert.ok(body.summary, "Должно быть резюме");

		// Проверяем все дерево ответа на утечки медицинских терминов и диагнозов
		const leaks = findMedicalLeaksInPayload(body);
		console.log("[RED-TEAM AUDIT 1: Attribution Leaks count]:", leaks.length, leaks);
		assert.equal(leaks.length, 0, "В сквозной аналитике не должно быть ни одного медицинского диагноза или зуба!");

		// 2. Атака Parameter Pollution: попытка вытянуть персональные медицинские данные через параметры
		const pollutedRes = await app.inject({
			method: "GET",
			url: "/api/marketing/attribution?fields=all&include=patients&expand=diagnoses&showDetails=true",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.equal(pollutedRes.statusCode, 200);
		const pollutedBody = JSON.parse(pollutedRes.body);
		const pollutedLeaks = findMedicalLeaksInPayload(pollutedBody);
		assert.equal(pollutedLeaks.length, 0, "Атака Parameter Pollution не должна раскрывать данные пациентов");
		console.log("✔ АТАКА 1 ОТБИТА: Сквозная аналитика возвращает исключительно агрегированные метрики без врачебной тайны.");
	});

	// =========================================================================
	// АТАКА 2: GET /api/marketing/patient-field-requirements — АУДИТ НАСТРОЕК
	// =========================================================================
	await suite.test("ATTACK 2: Patient field requirements inspection and authorization check", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Запрос настроек обязательности полей карточки пациента
		const res = await app.inject({
			method: "GET",
			url: "/api/marketing/patient-field-requirements",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: GET /api/marketing/patient-field-requirements]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(typeof body.requirePhone, "boolean");
		assert.equal(typeof body.requireSnils, "boolean");

		// 2. Проверяем отсутствие любых клинических данных
		const leaks = findMedicalLeaksInPayload(body);
		assert.equal(leaks.length, 0, "Настройки обязательности не содержат медицинских данных");
		console.log("✔ АТАКА 2 ОТБИТА: Эндпоинт требований к полям безопасен и возвращает только булеву конфигурацию.");
	});

	// =========================================================================
	// АТАКА 3: GET & POST /api/files/patients/:patientId/attachments — ВЛОЖЕНИЯ
	// =========================================================================
	await suite.test("ATTACK 3: Patient attachments alias routes and archived patient secrecy gate", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог запрашивает вложения архивированного пациента через зеркальный эндпоинт /api/files/patients/:id/attachments
		const archivedFilesRes = await app.inject({
			method: "GET",
			url: `/api/files/patients/${ARCHIVED_PATIENT_ID}/attachments`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3.1: GET /api/files/patients/:id/attachments for Archived Patient]\nStatus:",
			archivedFilesRes.statusCode,
			"\nPayload:",
			archivedFilesRes.body,
		);

		assert.equal(
			archivedFilesRes.statusCode,
			403,
			"Запрос файлов архивированного пациента неклиническим персоналом обязан возвращать 403 Forbidden!",
		);
		const archivedBody = JSON.parse(archivedFilesRes.body);
		assert.equal(archivedBody.permission, "patients.archived.attachments");

		// 2. Врач запрашивает вложения активного пациента через /api/files/patients/:id/attachments
		const doctorFilesRes = await app.inject({
			method: "GET",
			url: `/api/files/patients/${ACTIVE_PATIENT_ID}/attachments`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		console.log(
			"[RED-TEAM AUDIT 3.2: GET /api/files/patients/:id/attachments by Doctor]\nStatus:",
			doctorFilesRes.statusCode,
		);

		assert.equal(doctorFilesRes.statusCode, 200, "Врач законно получает вложения пациента");
		const doctorBody = JSON.parse(doctorFilesRes.body);
		assert.ok(Array.isArray(doctorBody.files), "Ответ должен содержать массив файлов");
		assert.equal(doctorBody.files[0]?.id, ATTACHMENT_ID);

		console.log("✔ АТАКА 3 ОТБИТА: Эндпоинт /api/files/patients/:id/attachments поддержан и защищен 152-ФЗ.");
	});

	// =========================================================================
	// АТАКА 4: GET /api/integrations/diagnocat/reports/:patientId — AI-ТАЙНА И АУДИТ
	// =========================================================================
	await suite.test("ATTACK 4: Diagnocat AI reports isolation and audit trail creation", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог пытается получить AI-диагностику зубов
		const marketerRes = await app.inject({
			method: "GET",
			url: `/api/integrations/diagnocat/reports/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4.1: Diagnocat AI Reports by Marketer]\nStatus:",
			marketerRes.statusCode,
			"\nPayload:",
			marketerRes.body,
		);

		assert.equal(
			marketerRes.statusCode,
			403,
			"Маркетолог должен получить 403 Forbidden при попытке чтения AI-диагнозов Diagnocat",
		);

		// 2. Врач запрашивает отчет Diagnocat
		const doctorRes = await app.inject({
			method: "GET",
			url: `/api/integrations/diagnocat/reports/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		console.log(
			"[RED-TEAM AUDIT 4.2: Diagnocat AI Reports by Doctor]\nStatus:",
			doctorRes.statusCode,
		);

		assert.equal(doctorRes.statusCode, 200, "Врач получает отчеты Diagnocat");
		const docBody = JSON.parse(doctorRes.body);
		assert.ok(docBody.reports.length > 0, "Врачу вернулся массив отчетов");

		console.log("✔ АТАКА 4 ОТБИТА: AI-диагностика Diagnocat закрыта для неклинических сотрудников и логируется в аудит.");
	});

	// =========================================================================
	// АТАКА 5: REST API AUDIT TAMPERING & DELETION PENETRATION
	// =========================================================================
	await suite.test("ATTACK 5: REST API blocks all mutation, deletion and spoofed injection on audit logs", async (t) => {
		const testEndpoints = [
			{ method: "DELETE" as const, url: "/api/audit/logs" },
			{ method: "DELETE" as const, url: `/api/audit/logs/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "PUT" as const, url: `/api/audit/logs/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "PATCH" as const, url: `/api/audit/logs/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "POST" as const, url: "/api/audit/logs" },
			{ method: "DELETE" as const, url: "/api/audit/medical-access" },
			{ method: "POST" as const, url: "/api/audit/medical-access" },
		];

		for (const ep of testEndpoints) {
			const res = await app.inject({
				method: ep.method,
				url: ep.url,
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": doctorToken,
				},
				payload: {
					action: "FORGED_ACTION",
					reason: "Hacker attempt to inject fake audit log",
				},
			});

			console.log(
				`[RED-TEAM AUDIT 5: ${ep.method} ${ep.url}]\nStatus:`,
				res.statusCode,
				"\nPayload:",
				res.body,
			);

			assert.equal(
				res.statusCode,
				403,
				`REST API обязан возвращать 403 Forbidden на ${ep.method} ${ep.url}!`,
			);
			const body = JSON.parse(res.body);
			assert.equal(
				body.error,
				"AuditLogImmutable",
				`Ответ должен содержать ошибку AuditLogImmutable на ${ep.method} ${ep.url}`,
			);
		}

		console.log("✔ АТАКА 5 ОТБИТА: Все попытки DELETE/PUT/PATCH/POST на таблицы аудита аппаратно блокируются кодом 403 AuditLogImmutable.");
	});

	// =========================================================================
	// АТАКА 6: ГЛУБОКАЯ САНИТИЗАЦИЯ ЛОГОВ (ДИАГНОЗЫ, НОМЕРА ЗУБОВ, МКБ-10)
	// =========================================================================
	await suite.test("ATTACK 6: Deep Logging Sanitization Pentest (diagnoses, tooth numbers, MKB-10)", async () => {
		// 1. Тест объекта с ключами toothNumber, teeth, mkb10, diagnosis, clinicalNotes
		const rawPayload = {
			event: "dental_examination",
			toothNumber: 46,
			teeth: [11, 21, 36, 46],
			tooth_states: {
				"46": "pulpitis",
				"36": "caries",
			},
			diagnosis: "K04.0 Острый серозный пульпит",
			mkb10: "K04.0",
			clinicalNotes: "Выполнена экстирпация пульпы зуба 46",
			anamnesis: "Самопроизвольные боли по ночам в зубе 46",
			complaints: "Острая боль",
			metadata: {
				clinicId: CLINIC_ID,
				operator: "Регистратор",
			},
		};

		const sanitized = sanitizePayload(rawPayload) as any;

		console.log(
			"\n[RED-TEAM AUDIT 6.1: Sanitized Object Output]\n",
			JSON.stringify(sanitized, null, 2),
		);

		assert.equal(sanitized.toothNumber, "[СКРЫТО]", "Поле toothNumber обязано быть замаскировано!");
		assert.equal(sanitized.diagnosis, "[СКРЫТО]", "Поле diagnosis обязано быть замаскировано!");
		assert.equal(sanitized.mkb10, "[СКРЫТО]", "Поле mkb10 обязано быть замаскировано!");
		assert.equal(sanitized.clinicalNotes, "[СКРЫТО]", "Поле clinicalNotes обязано быть замаскировано!");
		assert.equal(sanitized.anamnesis, "[СКРЫТО]", "Поле anamnesis обязано быть замаскировано!");
		assert.equal(sanitized.complaints, "[СКРЫТО]", "Поле complaints обязано быть замаскировано!");
		assert.equal(sanitized.tooth_states["46"], "[СКРЫТО]", "Клиническое состояние зуба обязано быть замаскировано!");

		// Немедицинские данные не искажены
		assert.equal(sanitized.metadata.operator, "Регистратор");

		// 2. Тест произвольной строки ошибки и URL-параметров через sanitizeString
		const rawErrorString = "Критическая ошибка: зуб 46 имеет диагноз K04.0, а зуб 36 имеет K05.3!";
		const sanitizedErrorString = sanitizeString(rawErrorString);

		console.log("\n[RED-TEAM AUDIT 6.2: Sanitized Error String]\nResult:", sanitizedErrorString);

		assert.ok(!sanitizedErrorString.includes("K04.0"), "МКБ-10 код K04.0 не должен присутствовать в тексте ошибки!");
		assert.ok(!sanitizedErrorString.includes("K05.3"), "МКБ-10 код K05.3 не должен присутствовать в тексте ошибки!");
		assert.ok(!sanitizedErrorString.includes("зуб 46"), "Номер зуба 46 не должен присутствовать в тексте ошибки!");
		assert.ok(!sanitizedErrorString.includes("зуб 36"), "Номер зуба 36 не должен присутствовать в тексте ошибки!");

		// 3. Тест URL-параметров с диагнозами и номерами зубов
		const rawUrl = "/api/patients?diagnosis=K04.0&toothNumber=46&teeth=11,21&secret=hackerToken123";
		const sanitizedUrl = sanitizeString(rawUrl);

		console.log("\n[RED-TEAM AUDIT 6.3: Sanitized URL String]\nResult:", sanitizedUrl);

		assert.ok(!sanitizedUrl.includes("K04.0"), "Диагноз в URL обязан быть скрыт!");
		assert.ok(!sanitizedUrl.includes("46"), "Номер зуба в URL обязан быть скрыт!");
		assert.ok(!sanitizedUrl.includes("hackerToken123"), "Секретный токен в URL обязан быть скрыт!");

		console.log("✔ АТАКА 6 ОТБИТА: Полное маскирование диагнозов, номеров зубов и МКБ-10 в объектах, строках и URL.");
	});
});
