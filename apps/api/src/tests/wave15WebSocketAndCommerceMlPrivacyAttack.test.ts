/**
 * wave15WebSocketAndCommerceMlPrivacyAttack.test.ts
 *
 * ВОЛНА 15 АТАК: WEBSOCKET КАНАЛЫ, РЕЧЕВАЯ ДИКТОВКА И ЭКСПОРТ 1C COMMERCEML
 *
 * Цель атаки:
 * 1. GET /api/ws/schedule — сокетный пентест маркетолога: блокировка клинических событий (SPEECH_TRANSCRIPT_FINAL,
 *    UPDATE_ODONTOGRAM) и маскирование персональных примечаний в общих событиях;
 * 2. GET /api/v1/speech/live — пентест живого речевого распознавания: неклинический персонал (маркетолог)
 *    получает ошибку MedicalSpeechDictationForbidden и разрыв соединения (4403);
 * 3. GET /api/v1/speech/lab-session — сокетный пентест лаборатории речи: неклинический персонал получает
 *    MedicalSpeechLabForbidden и разрыв соединения (4403);
 * 4. POST /api/v1/speech/lab-transcribe — REST-атака маркетолога на извлечение медицинских сущностей: 403 Forbidden;
 * 5. GET /api/v1/integrations/1c/commerceml/export — попытка маркетолога и регистратора выгрузить реестр
 *    медицинских актов, зарплат и номенклатуры 1С: 403 Forbidden;
 * 6. Легитимный доступ сертифицированного врача к диктовке и главного бухгалтера/администратора к 1С.
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import {
	clinics,
	organizations,
	users,
} from "../db/schema.js";
import { registerCommerceMlRoutes } from "../routes/commerceMl.js";
import { registerSpeechLaboratoryRoutes } from "../routes/speechLaboratory.js";
import { registerSpeechLiveRoutes } from "../routes/speechLive.js";
import { registerWebsocketRoutes } from "../routes/websocket.js";
import { authTokenSecret } from "../security/authSecret.js";
import { wsBroker } from "../services/websocketBroker.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "wave15-ws-commerceml-test";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 4);
const RECEPTIONIST_USER_ID = fixtureUuid(NAMESPACE, 5);
const ADMIN_USER_ID = fixtureUuid(NAMESPACE, 6);

test("RED-TEAM HAMMER: WAVE 15 — WebSocket Channels, Speech Dictation & CommerceML Pentest", async (suite) => {
	let app: FastifyInstance;
	let serverPort: number;
	let doctorToken: string;
	let marketerToken: string;
	let receptionistToken: string;
	let adminToken: string;
	let clinicToken: string;
	let databaseReady = false;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 15 Before] Purge warning:", e);
		}

		app = await createTenantTestApp();
		await registerWebsocketRoutes(app);
		await registerSpeechLiveRoutes(app);
		await registerSpeechLaboratoryRoutes(app);
		await registerCommerceMlRoutes(app);
		await app.ready();

		// Запуск сервера на случайном свободном порту для проверки реальных WebSocket-соединений
		await app.listen({ port: 0, host: "127.0.0.1" });
		const addr = app.server.address();
		serverPort = typeof addr === "object" && addr ? addr.port : 0;

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

		receptionistToken = signToken(
			{
				organizationId: ORG_ID,
				userId: RECEPTIONIST_USER_ID,
				role: "receptionist",
				clinicalRole: null,
				canSignMedicalRecords: false,
			},
			secret,
		);

		adminToken = signToken(
			{
				organizationId: ORG_ID,
				userId: ADMIN_USER_ID,
				role: "admin",
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
					name: "Клиника Волна 15 Сокеты и Экспорт",
					inn: "7709999995",
					kpp: "770901001",
					ogrn: "1237700999995",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Отделение Волны 15",
					address: "г. Москва, ул. Сокетная, д. 15",
					phone: "+74959990015",
				}).onConflictDoNothing();

				await tx.insert(users).values([
					{
						id: DOCTOR_USER_ID,
						organizationId: ORG_ID,
						role: "doctor",
						canSignMedicalRecords: true,
						fullName: "Д-р Пирогов Николай",
					},
					{
						id: MARKETER_USER_ID,
						organizationId: ORG_ID,
						role: "marketer",
						canSignMedicalRecords: false,
						fullName: "Маркетолог Ветрова",
					},
					{
						id: RECEPTIONIST_USER_ID,
						organizationId: ORG_ID,
						role: "receptionist",
						canSignMedicalRecords: false,
						fullName: "Регистратор Соколова",
					},
					{
						id: ADMIN_USER_ID,
						organizationId: ORG_ID,
						role: "admin",
						canSignMedicalRecords: false,
						fullName: "Администратор Волны 15",
					},
				]).onConflictDoNothing();
			});
			databaseReady = true;
		} catch (e) {
			console.error("[Wave 15 Seed Failed]:", e);
		}
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 15 Cleanup] Purge warning:", e);
		}
	});

	// =========================================================================
	// АТАКА 1: GET /api/ws/schedule — СОКЕТНЫЙ ПЕНТЕСТ МАРКЕТОЛОГА
	// =========================================================================
	await suite.test("ATTACK 1: WebSocket broadcast secrecy filtering for marketer", async (t) => {
		if (!databaseReady || !serverPort) return t.skip("Сервер или БД недоступны");

		const wsUrl = `ws://127.0.0.1:${serverPort}/api/ws/schedule`;
		const client = new WebSocket(wsUrl);

		const receivedMessages: any[] = [];
		let authResolved = false;

		await new Promise<void>((resolve, reject) => {
			client.on("open", () => {
				client.send(
					JSON.stringify({
						type: "AUTH",
						payload: {
							clinicToken,
							staffToken: marketerToken,
						},
					}),
				);
			});

			client.on("message", (raw) => {
				const msg = JSON.parse(raw.toString());
				if (msg.type === "AUTH_OK") {
					authResolved = true;
					resolve();
				} else {
					receivedMessages.push(msg);
				}
			});

			client.on("error", reject);
			setTimeout(() => {
				if (!authResolved) reject(new Error("Timeout waiting for WebSocket AUTH_OK"));
			}, 3000);
		});

		assert.ok(authResolved, "Маркетолог успешно авторизовался в сокете расписания");

		// 1. Брокер рассылает клиническое событие речи с диагнозом и одонтограммой
		wsBroker.broadcastToOrganization(ORG_ID, {
			type: "SPEECH_TRANSCRIPT_FINAL",
			payload: {
				patientId: "patient-15",
				text: "Острый пульпит K04.0 зуба 46, анестезия ультракаин",
				medicalEntities: [{ term: "K04.0" }, { term: "пульпит" }],
			},
		});

		// 2. Брокер рассылает клиническое событие одонтограммы
		wsBroker.broadcastToOrganization(ORG_ID, {
			type: "UPDATE_ODONTOGRAM",
			payload: {
				patientId: "patient-15",
				toothStates: { "46": "caries" },
			},
		});

		// 3. Брокер рассылает общее событие создания записи, но с примечанием врача
		wsBroker.broadcastToOrganization(ORG_ID, {
			type: "APPOINTMENT_SCHEDULED",
			payload: {
				appointmentId: "appt-15",
				doctorName: "Д-р Пирогов",
				patientNotes: "Острый пульпит зуба 46, код K04.0, аллергия на лидокаин",
			},
		});

		// Ожидаем доставки сообщений
		await new Promise((r) => setTimeout(r, 200));
		client.close();

		console.log(
			"\n[RED-TEAM AUDIT 1: Messages received by Marketer WebSocket]:",
			JSON.stringify(receivedMessages, null, 2),
		);

		// Проверяем:
		// 1. Клинические события (SPEECH_TRANSCRIPT_FINAL, UPDATE_ODONTOGRAM) должны быть ДРОПНУТЫ (не дойти)
		const clinicalEvents = receivedMessages.filter(
			(m) => m.type === "SPEECH_TRANSCRIPT_FINAL" || m.type === "UPDATE_ODONTOGRAM",
		);
		assert.equal(
			clinicalEvents.length,
			0,
			"Клинические события (речь, одонтограмма) НЕ должны поступать маркетологу по WebSocket!",
		);

		// 2. Общее событие APPOINTMENT_SCHEDULED должно быть САНИТИЗИРОВАНО
		const apptEvent = receivedMessages.find((m) => m.type === "APPOINTMENT_SCHEDULED");
		assert.ok(apptEvent, "Событие создания записи должно дойти до сотрудника");
		assert.ok(
			!JSON.stringify(apptEvent).includes("K04.0"),
			"Код диагноза K04.0 должен быть вырезан/замаскирован в примечаниях!",
		);
		assert.ok(
			!JSON.stringify(apptEvent).includes("пульпит"),
			"Диагноз «пульпит» должен быть замаскирован!",
		);
		assert.ok(
			!JSON.stringify(apptEvent).includes("зуба 46"),
			"Номер зуба должен быть замаскирован!",
		);
		assert.ok(
			JSON.stringify(apptEvent).includes("[Сведения защищены 152-ФЗ]"),
			"Должна присутствовать защитная маска 152-ФЗ!",
		);

		console.log("✔ АТАКА 1 ОТБИТА: Сокетные трансляции аппаратно изолированы от утечек врачебной тайны.");
	});

	// =========================================================================
	// АТАКА 2: GET /api/v1/speech/live — ПЕНТЕСТ ЖИВОГО РАСПОЗНАВАНИЯ РЕЧИ
	// =========================================================================
	await suite.test("ATTACK 2: Marketer blocked from live speech dictation WebSocket (4403 Forbidden)", async (t) => {
		if (!databaseReady || !serverPort) return t.skip("Сервер или БД недоступны");

		const wsUrl = `ws://127.0.0.1:${serverPort}/api/v1/speech/live`;

		// Маркетолог подключается к речевому сокету диктовки
		const marketerWs = new WebSocket(wsUrl, {
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		let closedWithCode = 0;
		let receivedError: any = null;

		await new Promise<void>((resolve) => {
			marketerWs.on("message", (raw) => {
				try {
					receivedError = JSON.parse(raw.toString());
				} catch {}
			});
			marketerWs.on("close", (code) => {
				closedWithCode = code;
				resolve();
			});
			setTimeout(resolve, 2000);
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: /api/v1/speech/live by Marketer]\nClosed code:",
			closedWithCode,
			"\nReceived error:",
			receivedError,
		);

		assert.equal(closedWithCode, 4403, "Сокет должен закрыться с кодом 4403 Forbidden!");
		assert.equal(receivedError?.error, "MedicalSpeechDictationForbidden");

		console.log("✔ АТАКА 2 ОТБИТА: Доступ маркетолога к живому речевому сокету диктовки заблокирован.");
	});

	// =========================================================================
	// АТАКА 3: GET /api/v1/speech/lab-session — ПЕНТЕСТ ЛАБОРАТОРИИ РЕЧИ
	// =========================================================================
	await suite.test("ATTACK 3: Marketer blocked from speech lab WebSocket (4403 Forbidden)", async (t) => {
		if (!databaseReady || !serverPort) return t.skip("Сервер или БД недоступны");

		const wsUrl = `ws://127.0.0.1:${serverPort}/api/v1/speech/lab-session`;

		// Маркетолог подключается к сокету лаборатории речи
		const marketerWs = new WebSocket(wsUrl, {
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		let closedWithCode = 0;
		let receivedError: any = null;

		await new Promise<void>((resolve) => {
			marketerWs.on("message", (raw) => {
				try {
					receivedError = JSON.parse(raw.toString());
				} catch {}
			});
			marketerWs.on("close", (code) => {
				closedWithCode = code;
				resolve();
			});
			setTimeout(resolve, 2000);
		});

		console.log(
			"\n[RED-TEAM AUDIT 3: /api/v1/speech/lab-session by Marketer]\nClosed code:",
			closedWithCode,
			"\nReceived error:",
			receivedError,
		);

		assert.equal(closedWithCode, 4403, "Сокет лаборатории речи должен закрыться с кодом 4403!");
		assert.equal(receivedError?.error, "MedicalSpeechLabForbidden");

		console.log("✔ АТАКА 3 ОТБИТА: Доступ маркетолога к лаборатории речевых сессий заблокирован.");
	});

	// =========================================================================
	// АТАКА 4: POST /api/v1/speech/lab-transcribe — REST-АТАКА НА ТРАНСКРИБАЦИЮ
	// =========================================================================
	await suite.test("ATTACK 4: Marketer blocked from REST speech lab transcription (403 Forbidden)", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/speech/lab-transcribe",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
			payload: {
				text: "Жалобы на острый пульпит зуба 46, показана депульпация",
				mode: "browser_speech",
				language: "ru",
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4: POST /api/v1/speech/lab-transcribe by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(res.statusCode, 403, "Маркетолог должен получить 403 Forbidden!");
		const body = JSON.parse(res.body);
		assert.equal(body.permission, "speech.lab.transcribe");

		console.log("✔ АТАКА 4 ОТБИТА: Расшифровка клинической речи для неклинического персонала заблокирована.");
	});

	// =========================================================================
	// АТАКА 5: GET /api/v1/integrations/1c/commerceml/export — ЭКСПОРТ 1C COMMERCEML
	// =========================================================================
	await suite.test("ATTACK 5: Marketer and receptionist blocked from CommerceML export (403 Forbidden)", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Попытка маркетолога скачать CommerceML
		const marketerRes = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/export",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5.1: GET CommerceML export by Marketer]\nStatus:",
			marketerRes.statusCode,
			"\nPayload:",
			marketerRes.body,
		);

		assert.equal(marketerRes.statusCode, 403, "Маркетолог должен получить 403 Forbidden!");
		const marketerBody = JSON.parse(marketerRes.body);
		assert.equal(marketerBody.permission, "integrations.commerceml.export");

		// 2. Попытка регистратора скачать CommerceML
		const receptionistRes = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/export",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5.2: GET CommerceML export by Receptionist]\nStatus:",
			receptionistRes.statusCode,
			"\nPayload:",
			receptionistRes.body,
		);

		assert.equal(receptionistRes.statusCode, 403, "Регистратор должен получить 403 Forbidden!");
		const receptionistBody = JSON.parse(receptionistRes.body);
		assert.equal(receptionistBody.permission, "integrations.commerceml.export");

		console.log("✔ АТАКА 5 ОТБИТА: Выгрузка реестров 1С, медицинских актов и зарплат защищена от нефинансовых сотрудников.");
	});

	// =========================================================================
	// АТАКА 6: ЛЕГИТИМНЫЙ ДОСТУП ВРАЧА И АДМИНИСТРАТОРА
	// =========================================================================
	await suite.test("ATTACK 6: Legitimate access for doctor and administrator", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// Врач вызывает REST транскрибацию
		const doctorTranscribeRes = await app.inject({
			method: "POST",
			url: "/api/v1/speech/lab-transcribe",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				text: "Диагноз кариес зуба 16 K02.1, анестезия ультракаин",
				mode: "browser_speech",
				language: "ru",
			},
		});

		assert.equal(doctorTranscribeRes.statusCode, 200, "Врач имеет законное право использовать STT");
		const doctorData = JSON.parse(doctorTranscribeRes.body);
		assert.equal(doctorData.success, true);
		assert.ok(doctorData.medicalEntities.length > 0, "Медицинские сущности корректно извлечены");

		// Администратор клиники формирует пакет CommerceML
		const adminCommerceRes = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/export?format=json",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
		});

		assert.equal(adminCommerceRes.statusCode, 200, "Администратор клиники имеет доступ к выгрузке 1С");
		const adminCommerceData = JSON.parse(adminCommerceRes.body);
		assert.equal(adminCommerceData.success, true);

		console.log("✔ АТАКА 6 ОТБИТА: Легитимные бизнес-процессы врача и администратора работают штатно.");
	});
});
