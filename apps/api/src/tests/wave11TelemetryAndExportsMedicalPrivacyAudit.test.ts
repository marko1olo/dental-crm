import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	auditEvents,
	clinicalAuditLogs,
	clinics,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { registerAnalyticsRoutes } from "../routes/analytics.js";
import { registerCommerceMlRoutes } from "../routes/commerceMl.js";
import { registerPatientRoutes } from "../routes/patients.js";
import { telephonyRoutes } from "../routes/telephony.js";
import { registerWebsocketRoutes } from "../routes/websocket.js";
import { authTokenSecret } from "../security/authSecret.js";
import { registerMedicalSecrecyPayloadStripping } from "../security/medicalSecrecyWarden.js";
import { wsBroker } from "../services/websocketBroker.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "wave11-telemetry-audit";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 4);
const RECEPTIONIST_USER_ID = fixtureUuid(NAMESPACE, 5);

const PATIENT_ID = fixtureUuid(NAMESPACE, 10);

test("RED-TEAM HAMMER: WAVE 11 — Telemetry, Exports & Medical Secrecy 152-FZ / 323-FZ Audit", async (suite) => {
	let app: FastifyInstance;
	let doctorToken: string;
	let marketerToken: string;
	let receptionistToken: string;
	let clinicToken: string;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 11 Before] Purge warning:", e);
		}

		app = await createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);

		// Тестовый маршрут для прямой проверки экспорта CSV и буферов
		app.get("/api/test/export/patients-csv", async (req, reply) => {
			const csvText = [
				"Пациент;Диагноз_МКБ10;Зубная_формула;Примечания_врача",
				'Иванов Иван;K02.1;Зуб 16 MOD;Острый пульпит 26 зуба, депульпация, анестезия артикаин',
			].join("\r\n");

			return reply
				.header("Content-Type", "text/csv; charset=utf-8")
				.header("Content-Disposition", 'attachment; filename="patients_export.csv"')
				.send(csvText);
		});

		app.get("/api/test/export/buffer-csv", async (req, reply) => {
			const csvText = [
				"Номер;Диагноз;Жалобы",
				'1;K04.0;Острая боль, кариес дентина',
			].join("\r\n");

			return reply
				.header("Content-Type", "text/csv; charset=utf-8")
				.send(Buffer.from(csvText, "utf-8"));
		});

		await registerPatientRoutes(app);
		await registerAnalyticsRoutes(app);
		await registerCommerceMlRoutes(app);
		await app.register(telephonyRoutes, { prefix: "/api/telephony" });
		await registerWebsocketRoutes(app);
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

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				type: "clinic_session",
			},
			secret,
		);

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Wave 11 Telemetry & Privacy Audit Clinic",
				})
				.onConflictDoUpdate({
					target: organizations.id,
					set: { name: "Wave 11 Telemetry & Privacy Audit Clinic" },
				});

			await tx
				.insert(clinics)
				.values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Wave 11 Main Branch",
					address: "Москва, пер. Медицинской Тайны, 11",
				})
				.onConflictDoUpdate({
					target: clinics.id,
					set: { name: "Wave 11 Main Branch" },
				});

			await tx
				.insert(users)
				.values({
					id: DOCTOR_USER_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Сеченов И.М.",
					email: "sechenov@dente.ru",
					role: "doctor",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: MARKETER_USER_ID,
					organizationId: ORG_ID,
					fullName: "Маркетолог Воронкин А.В.",
					email: "marketing@dente.ru",
					role: "marketer",
				})
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Алексей Петрович",
				phone: "+79991112233",
				email: "smirnov@dente.ru",
				birthDate: "1988-04-12",
				notes: "Пациент жалуется на острый пульпит 26 зуба, кариес дентина 16. Проведена депульпация под артикаином.",
				status: "active",
			})
			.onConflictDoUpdate({
				target: patients.id,
				set: {
					fullName: "Смирнов Алексей Петрович",
					notes: "Пациент жалуется на острый пульпит 26 зуба, кариес дентина 16. Проведена депульпация под артикаином.",
				},
			});
		});
	});

	await suite.test("1. GET /api/patients — маркетолог получает данные без диагнозов и врачебной тайны (152-ФЗ)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/patients",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.ok(Array.isArray(body), "Ожидается массив пациентов");
		const found = body.find((p: any) => p.id === PATIENT_ID);
		assert.ok(found, "Пациент должен присутствовать в выдаче");

		// Проверяем аппаратную санитизацию заметок (notes)
		assert.ok(
			!found.notes.includes("пульпит"),
			"Диагноз «пульпит» обязан быть вырезан для маркетолога",
		);
		assert.ok(
			!found.notes.includes("кариес"),
			"Диагноз «кариес» обязан быть вырезан для маркетолога",
		);
		assert.ok(
			!found.notes.includes("депульпация"),
			"Клиническая манипуляция «депульпация» обязана быть вырезана",
		);
		assert.ok(
			found.notes.includes("[Сведения защищены 152-ФЗ]"),
			"Заметка обязана содержать метку защиты 152-ФЗ",
		);
	});

	await suite.test("2. GET /api/patients — лечащий врач получает полные клинические примечания", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/patients",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		const found = body.find((p: any) => p.id === PATIENT_ID);
		assert.ok(found, "Пациент должен присутствовать в выдаче");
		assert.ok(
			found.notes.includes("пульпит"),
			"Врач обязан видеть полный диагноз «пульпит»",
		);
		assert.ok(
			found.notes.includes("артикаином"),
			"Врач обязан видеть препарат анестезии",
		);
	});

	await suite.test("3. GET /api/patients — факт чтения реестра пациентов врачом фиксируется в аудит-логе", async () => {
		const auditRows = await db
			.select()
			.from(clinicalAuditLogs)
			.where(
				and(
					eq(clinicalAuditLogs.organizationId, ORG_ID),
					eq(clinicalAuditLogs.action, "VIEW_PATIENT_LIST"),
				),
			);

		assert.ok(
			auditRows.length > 0,
			"В clinical_audit_logs обязана появиться запись VIEW_PATIENT_LIST",
		);

		const sysEvents = await db
			.select()
			.from(auditEvents)
			.where(
				and(
					eq(auditEvents.organizationId, ORG_ID),
					eq(auditEvents.action, "VIEW_PATIENT_LIST"),
				),
			);

		assert.ok(
			sysEvents.length > 0,
			"В audit_events обязана появиться запись VIEW_PATIENT_LIST",
		);
	});

	await suite.test("4. GET /api/patients?search=K02.1 — поиск маркетологом по коду диагноза пресекается с 403", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/patients?search=K02.1",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Поиск по МКБ-10 должен быть заблокирован кодом 403",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "MedicalSearchForbidden");
	});

	await suite.test("5. GET /api/test/export/patients-csv — CSV-выгрузка для маркетолога маскирует диагнозы и формулы зубов", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/test/export/patients-csv",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const csvOutput = res.payload;

		// Проверяем, что в CSV нет открытых диагнозов и формул зубов
		assert.ok(!csvOutput.includes("K02.1"), "МКБ-10 K02.1 не должен присутствовать в CSV маркетолога");
		assert.ok(!csvOutput.includes("Зуб 16"), "Номер зуба не должен присутствовать в CSV маркетолога");
		assert.ok(!csvOutput.includes("пульпит"), "Диагноз «пульпит» не должен присутствовать в CSV маркетолога");
		assert.ok(!csvOutput.includes("артикаин"), "Анестетик «артикаин» не должен присутствовать в CSV маркетолога");
		assert.ok(
			csvOutput.includes("[Сведения защищены 152-ФЗ]"),
			"Вместо медицинских терминов должна стоять плашка защиты 152-ФЗ",
		);
	});

	await suite.test("6. GET /api/test/export/patients-csv — CSV-выгрузка для врача содержит исходные медицинские данные", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/test/export/patients-csv",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const csvOutput = res.payload;
		assert.ok(csvOutput.includes("K02.1"), "Врач обязан получать точный код МКБ-10 в CSV");
		assert.ok(csvOutput.includes("пульпит"), "Врач обязан получать диагноз «пульпит» в CSV");
	});

	await suite.test("7. GET /api/test/export/buffer-csv — Buffer CSV-выгрузка для маркетолога санитизируется без порчи UTF-8", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/test/export/buffer-csv",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const output = res.payload;
		assert.ok(!output.includes("K04.0"), "Код K04.0 должен быть замаскирован в Buffer CSV");
		assert.ok(!output.includes("кариес"), "Диагноз «кариес» должен быть замаскирован в Buffer CSV");
		assert.ok(output.includes("[Сведения защищены 152-ФЗ]"), "Плашка защиты должна быть в Buffer CSV");
	});

	await suite.test("8. GET /api/v1/integrations/1c/commerceml/export — экспорт 1C JSON для маркетолога усекает клинические диагнозы", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/export?format=json",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.ok(body.success, "CommerceML экспорт должен сформироваться успешно");
		const rawString = JSON.stringify(body);
		assert.ok(
			!rawString.includes("odontogram"),
			"Поле одонтограммы не должно присутствовать для неклинического сотрудника",
		);
		assert.ok(
			!rawString.includes("clinicalNotes"),
			"Поле clinicalNotes не должно присутствовать для неклинического сотрудника",
		);
	});

	await suite.test("9. WebSocket /api/ws/telephony и /api/ws/schedule зарегистрированы и доступны", async () => {
		const wsTelephony = await (app as any).injectWS("/api/ws/telephony");
		assert.ok(wsTelephony, "/api/ws/telephony обязан принимать WebSocket-соединение");
		wsTelephony.terminate();

		const wsSchedule = await (app as any).injectWS("/api/ws/schedule");
		assert.ok(wsSchedule, "/api/ws/schedule обязан принимать WebSocket-соединение");
		wsSchedule.terminate();
	});

	await suite.test("10. WebSocket Broker — клинические события расписания не доставляются неклиническим слушателям", async () => {
		const nonClinicalMessages: string[] = [];
		const clinicalMessages: string[] = [];

		const mockNonClinicalWs: any = {
			readyState: 1,
			send: (data: string) => nonClinicalMessages.push(data),
			on: (_event: string, _cb: any) => {},
		};

		const mockClinicalWs: any = {
			readyState: 1,
			send: (data: string) => clinicalMessages.push(data),
			on: (_event: string, _cb: any) => {},
		};

		wsBroker.addClient(mockNonClinicalWs, ORG_ID, undefined, false);
		wsBroker.addClient(mockClinicalWs, ORG_ID, undefined, true);

		// Рассылаем клиническое событие расписания (содержит формулу зубов и диагноз)
		wsBroker.broadcastToOrganization(ORG_ID, {
			type: "APPOINTMENT_UPDATED",
			payload: {
				appointmentId: "apt-101",
				toothFormula: "16-MOD",
				diagnosis: "K02.1 Глубокий кариес",
			},
		});

		assert.strictEqual(
			nonClinicalMessages.length,
			0,
			"Неклинический сокет НЕ должен получить событие с клиническими данными расписания",
		);
		assert.strictEqual(
			clinicalMessages.length,
			1,
			"Клинический сокет врача ОБЯЗАН получить событие расписания",
		);
	});

	await suite.test("11. WebSocket Broker — события телефонии маскируют открытые диагнозы для неклинических слушателей", async () => {
		const nonClinicalMessages: string[] = [];

		const mockNonClinicalWs: any = {
			readyState: 1,
			send: (data: string) => nonClinicalMessages.push(data),
			on: (_event: string, _cb: any) => {},
		};

		wsBroker.addClient(mockNonClinicalWs, ORG_ID, undefined, false);

		// Рассылаем входящий звонок с примечанием от телефонии
		wsBroker.broadcastToOrganization(ORG_ID, {
			type: "TELEPHONY_INCOMING_CALL",
			payload: {
				phone: "+79991112233",
				patientName: "Смирнов А.П.",
				notes: "Пациент жалуется на острый пульпит 16 зуба",
			},
		});

		assert.strictEqual(
			nonClinicalMessages.length,
			1,
			"Неклинический сокет должен получить событие входящего звонка",
		);
		const receivedMsg = nonClinicalMessages[0] ?? "";
		assert.ok(
			!receivedMsg.includes("пульпит"),
			"Диагноз «пульпит» обязан быть замаскирован в WebSocket-событии звонка",
		);
		assert.ok(
			receivedMsg.includes("[Сведения защищены 152-ФЗ]"),
			"Вместо диагноза должна быть вставлена защитная плашка 152-ФЗ",
		);
	});

	await suite.test("12. Фиксация фактов доступа к медданным в audit_events и clinical_audit_logs", async () => {
		// 1. Проверяем записи в clinical_audit_logs
		const clinicalLogs = await db
			.select()
			.from(clinicalAuditLogs)
			.where(eq(clinicalAuditLogs.organizationId, ORG_ID));

		assert.ok(clinicalLogs.length > 0, "В clinical_audit_logs обязаны быть записи доступа");
		const viewLog = clinicalLogs.find((l) => l.action === "VIEW_PATIENT_LIST");
		assert.ok(viewLog, "Обязана присутствовать запись VIEW_PATIENT_LIST");
		assert.strictEqual(viewLog.organizationId, ORG_ID);
		assert.strictEqual(viewLog.actorUserId, DOCTOR_USER_ID);

		// 2. Проверяем записи в системном audit_events
		const sysLogs = await db
			.select()
			.from(auditEvents)
			.where(eq(auditEvents.organizationId, ORG_ID));

		assert.ok(sysLogs.length > 0, "В audit_events обязаны быть записи доступа");
		const viewSysLog = sysLogs.find((l) => l.action === "VIEW_PATIENT_LIST");
		assert.ok(viewSysLog, "Обязана присутствовать системная запись VIEW_PATIENT_LIST");
		assert.strictEqual(viewSysLog.organizationId, ORG_ID);
		assert.strictEqual(viewSysLog.actorUserId, DOCTOR_USER_ID);
		assert.strictEqual(viewSysLog.entityType, "patient_diagnosis");
		assert.ok(viewSysLog.createdAt instanceof Date, "createdAt должен быть валидной датой");
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});
});
