/**
 * websocketMedicalSecrecyAudit.test.ts
 *
 * ТЕСТОВЫЙ КОМПЛАЕНС-СЬЮТ: АУДИТ WEBSOCKET-БРОКЕРА И ЖУРНАЛА ДОСТУПА (152-ФЗ / 323-ФЗ ст. 13)
 *
 * Проверяет:
 * 1. Фильтрацию клинических событий WebSocket (одонтограмма, импланты, протоколы 043/у):
 *    - Врач ("doctor") и ассистент ("assistant") получают клинические события.
 *    - Маркетолог ("marketer"), администратор ресепшена ("receptionist") и
 *      системный администратор ("admin" без врачебной роли) КАТЕГОРИЧЕСКИ НЕ ПОЛУЧАЮТ
 *      клинические события (сообщения не отправляются на сокет).
 * 2. Фильтрацию событий с диагнозами МКБ-10 в полезной нагрузке:
 *    - События с полями диагнозов блокируются для неклинических сокетов.
 *    - Обычные события расписания/кассы доставляются маркетологу.
 * 3. Аудит-лог (audit_logs):
 *    - Логирование фактов доступа к диагнозам и картам через recordMedicalRecordAccessAudit
 *    - Чтение через getMedicalAccessAuditTrailFromDb и GET /api/audit/medical-access.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { wsBroker, isClinicalWsEvent } from "../services/websocketBroker.js";
import {
	recordMedicalRecordAccessAudit,
	getMedicalAccessAuditTrailFromDb,
} from "../security/medicalAuditTrail.js";
import { fixtureUuid, withFixtureTenant } from "./support/fixtureOrganizations.js";
import { db } from "../db/client.js";
import { organizations, users, patients } from "../db/schema.js";
import Fastify from "fastify";
import { registerAuditRoutes } from "../routes/audit.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

const ORG_ID = fixtureUuid("wsSecOrg", 1);
const PATIENT_ID = fixtureUuid("wsSecPatient", 2);
const DOCTOR_ID = fixtureUuid("wsSecDoctor", 3);
const MARKETER_ID = fixtureUuid("wsSecMarketer", 4);
const ADMIN_ID = fixtureUuid("wsSecAdmin", 5);

type FakeWs = {
	readyState: number;
	sent: string[];
	on: (event: string, cb: () => void) => void;
	send: (data: string) => void;
	close: () => void;
};

function createFakeWs(): FakeWs {
	const handlers: Record<string, Array<() => void>> = {};
	return {
		readyState: 1,
		sent: [],
		on(event, cb) {
			handlers[event] ??= [];
			handlers[event].push(cb);
		},
		send(data) {
			this.sent.push(data);
		},
		close() {
			this.readyState = 3;
			for (const cb of handlers.close ?? []) cb();
		},
	};
}

test("152-ФЗ / 323-ФЗ: Аудит WebSocket-брокера и журнала доступа к врачебной тайне", async (suite) => {
	// Инициализируем тестовые сущности в БД с поддержкой RLS
	await withFixtureTenant(ORG_ID, async () => {
		await db
			.insert(organizations)
			.values({
				id: ORG_ID,
				name: "Клиника Аудита Безопасности 152-ФЗ",
			})
			.onConflictDoNothing();

		await db
			.insert(users)
			.values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Тестов Т.Т.",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Администратор Системы С.С.",
					role: "admin",
				},
			])
			.onConflictDoNothing();

		await db
			.insert(patients)
			.values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Безопасный П.П.",
				birthDate: "1990-01-01",
				phone: "+79001112233",
			})
			.onConflictDoNothing();
	});

	await suite.test("1. isClinicalWsEvent: точно определяет клинические типы событий и полезную нагрузку", () => {
		assert.strictEqual(isClinicalWsEvent({ type: "UPDATE_ODONTOGRAM" }), true);
		assert.strictEqual(isClinicalWsEvent({ type: "UPDATE_IMPLANT_RECORD" }), true);
		assert.strictEqual(isClinicalWsEvent({ type: "CLINICAL_PROTOCOL_UPDATED" }), true);
		assert.strictEqual(isClinicalWsEvent({ type: "EMR_RECORD_CREATED" }), true);
		assert.strictEqual(isClinicalWsEvent({ type: "DIAGNOSIS_RECORDED" }), true);
		assert.strictEqual(
			isClinicalWsEvent({
				type: "CUSTOM_EVENT",
				payload: { odontogram: { tooth46: "caries" } },
			}),
			true,
		);
		assert.strictEqual(
			isClinicalWsEvent({
				type: "CUSTOM_EVENT",
				payload: { mkb10: "K02.1" },
			}),
			true,
		);

		// Неклинические события
		assert.strictEqual(isClinicalWsEvent({ type: "FAMILY_BALANCE_UPDATED" }), false);
		assert.strictEqual(isClinicalWsEvent({ type: "LEAD_CREATED" }), false);
		assert.strictEqual(isClinicalWsEvent({ type: "TELEPHONY_CALL_RECEIVED" }), false);
		assert.strictEqual(isClinicalWsEvent({ type: "APPOINTMENT_SCHEDULED" }), false);
	});

	await suite.test("2. Блокировка отправки UPDATE_ODONTOGRAM на неклинические сокеты (маркетолог, админ)", () => {
		const doctorWs = createFakeWs();
		const marketerWs = createFakeWs();
		const adminWs = createFakeWs();

		wsBroker.addClient(doctorWs as never, ORG_ID, undefined, "doctor");
		wsBroker.addClient(marketerWs as never, ORG_ID, undefined, "marketer");
		wsBroker.addClient(adminWs as never, ORG_ID, undefined, "admin");

		try {
			wsBroker.broadcastToOrganization(ORG_ID, {
				type: "UPDATE_ODONTOGRAM",
				payload: {
					patientId: PATIENT_ID,
					states: [
						{ toothNumber: 46, state: "pulpitis", surfaces: ["MOD"], notes: "Острый пульпит K04.0" },
					],
				},
			});

			// Врач обязан получить одонтограмму
			assert.strictEqual(doctorWs.sent.length, 1, "Врач должен получить UPDATE_ODONTOGRAM");
			const docParsed = JSON.parse(doctorWs.sent[0]!);
			assert.strictEqual(docParsed.type, "UPDATE_ODONTOGRAM");
			assert.strictEqual(docParsed.payload.states[0].state, "pulpitis");

			// Маркетолог и админ БЕЗ клинической роли КАТЕГОРИЧЕСКИ НЕ ДОЛЖНЫ получить одонтограмму
			assert.strictEqual(
				marketerWs.sent.length,
				0,
				"Маркетолог не должен получить клиническое событие UPDATE_ODONTOGRAM",
			);
			assert.strictEqual(
				adminWs.sent.length,
				0,
				"Администратор без врачебной роли не должен получить UPDATE_ODONTOGRAM",
			);
		} finally {
			doctorWs.close();
			marketerWs.close();
			adminWs.close();
		}
	});

	await suite.test("3. Блокировка отправки UPDATE_IMPLANT_RECORD и CLINICAL_PROTOCOL_UPDATED на неклинические сокеты", () => {
		const assistantWs = createFakeWs();
		const receptionistWs = createFakeWs();

		wsBroker.addClient(assistantWs as never, ORG_ID, undefined, "assistant");
		wsBroker.addClient(receptionistWs as never, ORG_ID, undefined, "receptionist");

		try {
			wsBroker.broadcastToOrganization(ORG_ID, {
				type: "UPDATE_IMPLANT_RECORD",
				payload: {
					patientId: PATIENT_ID,
					implantSystem: "Straumann BLX",
					toothNumber: 36,
				},
			});

			wsBroker.broadcastToOrganization(ORG_ID, {
				type: "CLINICAL_PROTOCOL_UPDATED",
				payload: {
					patientId: PATIENT_ID,
					protocol043: "Первичный протокол лечения пульпита",
				},
			});

			// Ассистент получает оба клинических события
			assert.strictEqual(assistantWs.sent.length, 2, "Ассистент должен получить оба клинических события");

			// Ресепшен не получает ни одного
			assert.strictEqual(
				receptionistWs.sent.length,
				0,
				"Ресепшен не должен получить ни импланты, ни протоколы приемов",
			);
		} finally {
			assistantWs.close();
			receptionistWs.close();
		}
	});

	await suite.test("4. Фильтрация диагнозов в полезной нагрузке событий (152-ФЗ)", () => {
		const doctorWs = createFakeWs();
		const marketerWs = createFakeWs();

		wsBroker.addClient(doctorWs as never, ORG_ID, undefined, "doctor");
		wsBroker.addClient(marketerWs as never, ORG_ID, undefined, "marketer");

		try {
			// 1. Событие с клиническими данными (содержит diagnosis) -> маркетолог НЕ получает (фильтруется полностью)
			wsBroker.broadcastToOrganization(ORG_ID, {
				type: "APPOINTMENT_UPDATED",
				payload: {
					appointmentId: "apt-123",
					patientName: "Сидоров С.С.",
					diagnosis: "K02.1 Глубокий кариес",
				},
			});

			assert.strictEqual(doctorWs.sent.length, 1, "Врач получает событие с диагнозом");
			assert.strictEqual(
				marketerWs.sent.length,
				0,
				"Маркетолог НЕ получает событие с диагнозом (152-ФЗ фильтрация)",
			);

			// 2. Общее неклиническое событие расписания -> маркетолог получает его
			wsBroker.broadcastToOrganization(ORG_ID, {
				type: "APPOINTMENT_SCHEDULED",
				payload: {
					appointmentId: "apt-124",
					patientName: "Сидоров С.С.",
					scheduledAt: "2026-09-03T10:00:00Z",
					notes: "Пациент попросил напомнить за 2 часа",
				},
			});

			assert.strictEqual(doctorWs.sent.length, 2);
			assert.strictEqual(marketerWs.sent.length, 1, "Маркетолог получает неклиническое событие расписания");
			const marketerMsg = JSON.parse(marketerWs.sent[0]!);
			assert.strictEqual(marketerMsg.type, "APPOINTMENT_SCHEDULED");
			assert.strictEqual(marketerMsg.payload.appointmentId, "apt-124");
			assert.strictEqual(marketerMsg.payload.notes, "Пациент попросил напомнить за 2 часа");
		} finally {
			doctorWs.close();
			marketerWs.close();
		}
	});

	await suite.test("5. Аудит-лог (audit_logs): запись и чтение фактов доступа к диагнозам и картам", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			// Записываем факт доступа к диагнозу в клинический журнал аудита
			await recordMedicalRecordAccessAudit({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				actorUserId: DOCTOR_ID,
				actorLogin: "Доктор Тестов Т.Т.",
				actorRole: "doctor",
				diagnosis: "K04.0 Пульпит зуба 46",
				action: "VIEW_DIAGNOSIS",
				eventType: "DIAGNOSIS_ACCESS",
				ipAddress: "127.0.0.1",
				userAgent: "DentalCRM-AuditTest/1.0",
				metadata: { source: "test_suite" },
			});

			// Извлекаем журнал аудита из БД
			const auditLogs = await getMedicalAccessAuditTrailFromDb(ORG_ID, {
				patientId: PATIENT_ID,
				limit: 10,
			});

			assert.ok(auditLogs.length > 0, "Журнал аудита должен содержать запись");
			const entry = auditLogs[0];
			assert.ok(entry);
			assert.strictEqual(entry.organizationId, ORG_ID);
			assert.strictEqual(entry.patientId, PATIENT_ID);
			assert.strictEqual(entry.actorUserId, DOCTOR_ID);
			assert.strictEqual(entry.action, "VIEW_DIAGNOSIS");
			assert.strictEqual(entry.diagnosis, "K04.0 Пульпит зуба 46");
		});
	});

	await suite.test("6. HTTP API: GET /api/audit/medical-access отдает журнал доступа сотруднику с правами", async () => {
		const app = Fastify({ logger: false });
		await registerAuditRoutes(app);
		await app.ready();

		try {
			await withFixtureTenant(ORG_ID, async () => {
				const secret = authTokenSecret();
				const staffToken = signToken(
					{ organizationId: ORG_ID, role: "admin", userId: ADMIN_ID },
					secret,
				);

				const response = await app.inject({
					method: "GET",
					url: `/api/audit/medical-access?patientId=${PATIENT_ID}&limit=5`,
					headers: {
						"x-dente-staff-token": staffToken,
					},
				});

				assert.strictEqual(response.statusCode, 200, "Маршрут аудита должен вернуть 200 OK");
				const body = JSON.parse(response.payload);
				assert.ok(Array.isArray(body.logs), "Ответ должен содержать массив logs");
				assert.ok(body.logs.length > 0, "В массиве logs должна быть минимум 1 запись");
				assert.strictEqual(body.logs[0].patientId, PATIENT_ID);
			});
		} finally {
			await app.close();
		}
	});
});
