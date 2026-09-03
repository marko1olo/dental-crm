/**
 * wave11ScheduleLeadsAndCommunicationsPrivacyAttack.test.ts
 *
 * ВОЛНА 11 АТАК: ЭНДПОИНТЫ РАСПИСАНИЯ, СВОДКИ, ЛИДОВ И ВХОДЯЩИХ ЧАТОВ/КОММУНИКАЦИЙ (152-ФЗ / 323-ФЗ ст. 13)
 *
 * Цель атаки:
 * 1. GET /api/dashboard — проверка усечения диагнозов, жалоб, резюме врача и формул зубов для неклинических ролей (маркетолог, регистратор);
 * 2. GET /api/leads — пентест утечек диагнозов и номеров зубов в примечаниях к лидам;
 * 3. GET /api/communications/inbox — изоляция неклинических сотрудников (маркетолог) от общего ящика входящих;
 * 4. GET /api/communications/inbox/:patientId — изоляция маркетологов, защита архивированных карт и маскирование клинических терминов для регистратора;
 * 5. POST /api/communications/inbox/:patientId/send — запрет отправки сообщений маркетологами и на архивированные карты.
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { FastifyInstance } from "fastify";
import {
	appointments,
	clinics,
	communicationEvents,
	crmLeads,
	organizations,
	patients,
	users,
	visits,
} from "../db/schema.js";
import { registerCommunicationRoutes } from "../routes/communications.js";
import { registerDashboardRoutes } from "../routes/dashboard.js";
import { registerLeadsRoutes } from "../routes/leads.js";
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

const NAMESPACE = "wave11-secrecy-attack-test";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 4);
const RECEPTIONIST_USER_ID = fixtureUuid(NAMESPACE, 5);

const ACTIVE_PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const ARCHIVED_PATIENT_ID = fixtureUuid(NAMESPACE, 11);

const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 20);
const VISIT_ID = fixtureUuid(NAMESPACE, 21);
const LEAD_ID = fixtureUuid(NAMESPACE, 22);
const COMM_EVENT_ID = fixtureUuid(NAMESPACE, 23);

test("RED-TEAM HAMMER: WAVE 11 — Schedule, Leads & Communications Inbox Privacy Penetration", async (suite) => {
	let app: FastifyInstance;
	let doctorToken: string;
	let marketerToken: string;
	let receptionistToken: string;
	let clinicToken: string;
	let databaseReady = false;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 11 Before] Purge warning:", e);
		}

		app = await createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);
		await registerPatientRoutes(app);
		await registerDashboardRoutes(app);
		await registerLeadsRoutes(app);
		await registerCommunicationRoutes(app);
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
				type: "clinic",
			},
			secret,
		);

		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Волна 11 Врачебная Тайна",
					inn: "7709999993",
					kpp: "770901001",
					ogrn: "1237700999993",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Отделение Волны 11",
					address: "г. Москва, ул. Конфиденциальности, д. 11",
					phone: "+74959990011",
				}).onConflictDoNothing();

				await tx.insert(users).values([
					{
						id: DOCTOR_USER_ID,
						organizationId: ORG_ID,
						role: "doctor",
						canSignMedicalRecords: true,
						fullName: "Д-р Кузнецов Сергей",
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
				]).onConflictDoNothing();

				await tx.insert(patients).values([
					{
						id: ACTIVE_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Активный Секретный",
						birthDate: "1988-03-12",
						phone: "+79998881122",
						status: "active",
						notes: "Особое внимание: аллергия на лидокаин",
					},
					{
						id: ARCHIVED_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Списанный В Архив 11",
						birthDate: "1975-11-20",
						phone: "+79998883344",
						status: "archived",
						notes: "Списан в архив",
					},
				]).onConflictDoNothing();

				await tx.insert(appointments).values({
					id: APPOINTMENT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					doctorUserId: DOCTOR_USER_ID,
					startsAt: new Date("2026-09-15T12:00:00.000Z"),
					endsAt: new Date("2026-09-15T13:00:00.000Z"),
					status: "confirmed",
					reason: "Острый пульпит K04.0, зуб 46",
					comment: "Жалобы на ночные боли в зубе 46",
				}).onConflictDoNothing();

				await tx.insert(visits).values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					appointmentId: APPOINTMENT_ID,
					status: "draft",
					diagnosis: "K04.0 Острый серозный пульпит",
					complaint: "Острая самопроизвольная боль в зубе 46",
					anamnesis: "Боли начались 2 дня назад",
					doctorSummary: "Выполнена экстирпация пульпы зуба 46",
				}).onConflictDoNothing();

				await tx.insert(crmLeads).values({
					id: LEAD_ID,
					organizationId: ORG_ID,
					name: "Лид С Клиническими Жалобами",
					phone: "+79998885566",
					source: "yandex_direct",
					status: "new",
					notes: "Заявка: сильная боль в зубе 46, подозрение на пульпит K04.0",
				}).onConflictDoNothing();

				await tx.insert(communicationEvents).values({
					id: COMM_EVENT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					channel: "whatsapp",
					direction: "inbound",
					status: "delivered",
					message: "Доктор, у меня пульпит K04.0 на зубе 46, щека опухла, что делать?",
				}).onConflictDoNothing();
			});
			databaseReady = true;
		} catch (e) {
			console.error("[Wave 11 Seed Failed]:", e);
		}
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 11 Cleanup] Purge warning:", e);
		}
	});

	// =========================================================================
	// АТАКА 1: GET /api/dashboard — ПРОВЕРКА УСЕЧЕНИЯ ДИАГНОЗОВ И ФОРМУЛ ЗУБОВ
	// =========================================================================
	await suite.test("ATTACK 1: Dashboard schedule & active visit secrecy stripping for non-clinical roles", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Запрос от маркетолога
		const marketerRes = await app.inject({
			method: "GET",
			url: "/api/dashboard",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1.1: GET /api/dashboard by Marketer]\nStatus:",
			marketerRes.statusCode,
		);

		assert.equal(marketerRes.statusCode, 200);
		const marketerBody = JSON.parse(marketerRes.body);

		// Проверяем, что в теле ответа для маркетолога НЕТ полей diagnosis, complaint, anamnesis, doctorSummary
		const jsonString = JSON.stringify(marketerBody);
		assert.ok(!jsonString.includes("K04.0"), "МКБ-10 код K04.0 не должен присутствовать в сводке маркетолога!");
		assert.ok(!jsonString.includes("зуб 46"), "Номер зуба 46 не должен присутствовать в сводке маркетолога!");
		assert.ok(!jsonString.includes("пульпит"), "Термин «пульпит» не должен присутствовать в открытом виде!");

		if (marketerBody.activeVisit) {
			assert.equal(marketerBody.activeVisit.diagnosis, undefined, "Поле diagnosis обязано быть исключено!");
			assert.equal(marketerBody.activeVisit.complaint, undefined, "Поле complaint обязано быть исключено!");
			assert.equal(marketerBody.activeVisit.anamnesis, undefined, "Поле anamnesis обязано быть исключено!");
			assert.equal(marketerBody.activeVisit.doctorSummary, undefined, "Поле doctorSummary обязано быть исключено!");
		}

		// 2. Запрос от врача — легитимный доступ к клиническим данным
		const doctorRes = await app.inject({
			method: "GET",
			url: "/api/dashboard",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(doctorRes.statusCode, 200);
		const doctorBody = JSON.parse(doctorRes.body);
		if (doctorBody.activeVisit) {
			assert.ok(doctorBody.activeVisit.diagnosis, "Врачу доступен диагноз пациента");
			assert.ok(doctorBody.activeVisit.complaint, "Врачу доступны жалобы пациента");
		}

		console.log("✔ АТАКА 1 ОТБИТА: Расписание и сводка /api/dashboard аппаратно очищены от врачебной тайны для неклинических сотрудников.");
	});

	// =========================================================================
	// АТАКА 2: GET /api/leads — ПЕНТЕСТ УТЕЧЕК В ЛИДАХ
	// =========================================================================
	await suite.test("ATTACK 2: Leads notes clinical data masking for non-clinical roles", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/leads",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: GET /api/leads by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(res.statusCode, 200);
		const leads = JSON.parse(res.body);
		assert.ok(Array.isArray(leads));

		const targetLead = leads.find((l: any) => l.id === LEAD_ID);
		assert.ok(targetLead, "Лид должен присутствовать в выдаче");

		// Проверяем, что в примечаниях к лиду клинические термины замаскированы
		assert.ok(!targetLead.notes.includes("K04.0"), "Код K04.0 обязан быть замаскирован!");
		assert.ok(!targetLead.notes.includes("зубе 46"), "Номер зуба 46 обязан быть замаскирован!");
		assert.ok(!targetLead.notes.includes("пульпит"), "Диагноз «пульпит» обязан быть замаскирован!");
		assert.ok(targetLead.notes.includes("[Сведения защищены 152-ФЗ]"), "В тексте должен быть маркер защиты 152-ФЗ");

		console.log("✔ АТАКА 2 ОТБИТА: Клинические термины в примечаниях к лидам аппаратно замаскированы по 152-ФЗ.");
	});

	// =========================================================================
	// АТАКА 3: GET /api/communications/inbox — ИЗОЛЯЦИЯ МАРКЕТОЛОГА ОТ ЯЩИКА
	// =========================================================================
	await suite.test("ATTACK 3: Marketer blocked from general communications inbox list", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/communications/inbox",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3: GET /api/communications/inbox by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(
			res.statusCode,
			403,
			"Маркетолог должен получить 403 Forbidden при попытке доступа к общему ящику переписки пациентов!",
		);
		const body = JSON.parse(res.body);
		assert.equal(body.permission, "communications.inbox.read");

		console.log("✔ АТАКА 3 ОТБИТА: Маркетолог аппаратно изолирован от списка переписки пациентов.");
	});

	// =========================================================================
	// АТАКА 4: GET /api/communications/inbox/:patientId — ПЕНТЕСТ ДИАЛОГА
	// =========================================================================
	await suite.test("ATTACK 4: Communications thread security: marketer blocked, archived guarded, receptionist sanitized", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог пытается прочитать диалог пациента
		const marketerRes = await app.inject({
			method: "GET",
			url: `/api/communications/inbox/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4.1: GET /api/communications/inbox/:id by Marketer]\nStatus:",
			marketerRes.statusCode,
			"\nPayload:",
			marketerRes.body,
		);

		assert.equal(marketerRes.statusCode, 403, "Маркетолог не имеет права читать диалог пациента");

		// 2. Регистратор пытается прочитать переписку архивированного пациента
		const archivedRes = await app.inject({
			method: "GET",
			url: `/api/communications/inbox/${ARCHIVED_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4.2: GET /api/communications/inbox/:id for Archived Patient]\nStatus:",
			archivedRes.statusCode,
			"\nPayload:",
			archivedRes.body,
		);

		assert.equal(archivedRes.statusCode, 403, "Переписка архивированного пациента закрыта для регистратора");
		const archivedBody = JSON.parse(archivedRes.body);
		assert.equal(archivedBody.permission, "patients.archived.communications");

		// 3. Регистратор читает переписку активного пациента (клинические данные должны быть замаскированы)
		const receptionistRes = await app.inject({
			method: "GET",
			url: `/api/communications/inbox/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4.3: GET /api/communications/inbox/:id by Receptionist]\nStatus:",
			receptionistRes.statusCode,
			"\nPayload:",
			receptionistRes.body,
		);

		assert.equal(receptionistRes.statusCode, 200, "Регистратор получает доступ к диалогу для координации");
		const receptionistEvents = JSON.parse(receptionistRes.body);
		assert.ok(receptionistEvents.length > 0);

		const msgText = receptionistEvents[0].message;
		assert.ok(!msgText.includes("K04.0"), "Код K04.0 обязан быть скрыт для регистратора!");
		assert.ok(!msgText.includes("зубе 46"), "Номер зуба 46 обязан быть скрыт для регистратора!");
		assert.ok(!msgText.includes("пульпит"), "Термин «пульпит» обязан быть скрыт для регистратора!");
		assert.ok(msgText.includes("[Сведения защищены 152-ФЗ]"), "Должен присутствовать маркер защиты 152-ФЗ!");

		// 4. Лечащий врач читает переписку — получает оригинальные медицинские сведения
		const docRes = await app.inject({
			method: "GET",
			url: `/api/communications/inbox/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(docRes.statusCode, 200);
		const docEvents = JSON.parse(docRes.body);
		assert.ok(docEvents[0].message.includes("пульпит"), "Врач видит исходные жалобы пациента");

		console.log("✔ АТАКА 4 ОТБИТА: Переписка пациентов строго разграничена по ролям, а медицинские сведения усекаются для регистратора.");
	});

	// =========================================================================
	// АТАКА 5: POST /api/communications/inbox/:patientId/send — ЗАПРЕТЫ ОТПРАВКИ
	// =========================================================================
	await suite.test("ATTACK 5: Communications send route blocks marketers and archived patients", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог пытается отправить сообщение в диалог
		const marketerSendRes = await app.inject({
			method: "POST",
			url: `/api/communications/inbox/${ACTIVE_PATIENT_ID}/send`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
			payload: {
				message: "Здравствуйте! У нас скидка 20% на профгигиену.",
				channel: "whatsapp",
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5.1: Send by Marketer]\nStatus:",
			marketerSendRes.statusCode,
			"\nPayload:",
			marketerSendRes.body,
		);

		assert.equal(marketerSendRes.statusCode, 403, "Маркетологу запрещено писать в личный диалог пациента!");
		const marketerSendBody = JSON.parse(marketerSendRes.body);
		assert.equal(marketerSendBody.permission, "communications.inbox.send");

		// 2. Регистратор пытается отправить сообщение архивированному пациенту
		const archivedSendRes = await app.inject({
			method: "POST",
			url: `/api/communications/inbox/${ARCHIVED_PATIENT_ID}/send`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
			},
			payload: {
				message: "Здравствуйте! Мы рады пригласить вас на прием.",
				channel: "whatsapp",
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5.2: Send to Archived Patient]\nStatus:",
			archivedSendRes.statusCode,
			"\nPayload:",
			archivedSendRes.body,
		);

		assert.equal(archivedSendRes.statusCode, 403, "Отправка сообщений в архив запрещена!");
		const archivedSendBody = JSON.parse(archivedSendRes.body);
		assert.equal(archivedSendBody.permission, "patients.archived.communications");

		console.log("✔ АТАКА 5 ОТБИТА: Отправка сообщений защищена от маркетологов и заблокирована для архивированных пациентов.");
	});
});
