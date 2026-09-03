/**
 * wave14ExportAndSearchSecrecyAttack.test.ts
 *
 * ВОЛНА 14 АТАК: ЭКСПОРТ ДАННЫХ И ПОИСК ПАЦИЕНТОВ (152-ФЗ / 323-ФЗ ст. 13)
 *
 * Цель атаки:
 * 1. GET /api/export/patients — пентест попытки маркетолога выгрузить базу пациентов (403 Forbidden);
 * 2. GET /api/export/patients — аудит тела выгрузки администратора: отсутствие диагнозов, формул зубов и анамнеза;
 * 3. GET /api/export/leads — пентест выгрузки лидов маркетологом: аппаратное маскирование клинических жалоб и номеров зубов;
 * 4. GET /api/marketing/reports — аудит сводных отчетов маркетинга на отсутствие врачебной тайны;
 * 5. GET /api/patients?search=K02 — блокировка inference-атак неклинического персонала (поиск по МКБ-10 и диагнозам);
 * 6. GET /api/patients?search=Иванов — легитимный административный поиск для регистратуры;
 * 7. GET /api/patients?search=K04.0 — легитимный клинический поиск для врача.
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { FastifyInstance } from "fastify";
import {
	clinics,
	crmLeads,
	organizations,
	patients,
	payments,
	users,
} from "../db/schema.js";
import { registerExportRoutes } from "../routes/export.js";
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

const NAMESPACE = "wave14-export-search-test";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 4);
const RECEPTIONIST_USER_ID = fixtureUuid(NAMESPACE, 5);
const ADMIN_USER_ID = fixtureUuid(NAMESPACE, 6);

const PATIENT_K02_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_IVANOV_ID = fixtureUuid(NAMESPACE, 11);
const LEAD_WITH_DIAGNOSIS_ID = fixtureUuid(NAMESPACE, 20);
const PAYMENT_ID = fixtureUuid(NAMESPACE, 30);

test("RED-TEAM HAMMER: WAVE 14 — Export Endpoints & Medical Search Penetration", async (suite) => {
	let app: FastifyInstance;
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
			console.warn("[Wave 14 Before] Purge warning:", e);
		}

		app = await createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);
		await registerPatientRoutes(app);
		await registerExportRoutes(app);
		await registerMarketingRoutes(app);
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
					name: "Клиника Волна 14 Экспорт и Поиск",
					inn: "7709999994",
					kpp: "770901001",
					ogrn: "1237700999994",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Отделение Волны 14",
					address: "г. Москва, ул. Экспортная, д. 14",
					phone: "+74959990014",
				}).onConflictDoNothing();

				await tx.insert(users).values([
					{
						id: DOCTOR_USER_ID,
						organizationId: ORG_ID,
						role: "doctor",
						canSignMedicalRecords: true,
						fullName: "Д-р Сеченов Иван",
					},
					{
						id: MARKETER_USER_ID,
						organizationId: ORG_ID,
						role: "marketer",
						canSignMedicalRecords: false,
						fullName: "Маркетолог Громова",
					},
					{
						id: RECEPTIONIST_USER_ID,
						organizationId: ORG_ID,
						role: "receptionist",
						canSignMedicalRecords: false,
						fullName: "Регистратор Орлова",
					},
					{
						id: ADMIN_USER_ID,
						organizationId: ORG_ID,
						role: "admin",
						canSignMedicalRecords: false,
						fullName: "Администратор Клиники",
					},
				]).onConflictDoNothing();

				await tx.insert(patients).values([
					{
						id: PATIENT_K02_ID,
						organizationId: ORG_ID,
						fullName: "Смирнов Алексей Кариесный",
						birthDate: "1990-05-15",
						phone: "+79991112233",
						status: "active",
						notes: "Диагноз при поступлении: K02.1 кариес дентина зуба 16, острая боль",
					},
					{
						id: PATIENT_IVANOV_ID,
						organizationId: ORG_ID,
						fullName: "Иванов Петр Сергеевич",
						birthDate: "1985-10-20",
						phone: "+79992223344",
						status: "active",
						notes: "Плановый осмотр раз в 6 месяцев",
					},
				]).onConflictDoNothing();

				await tx.insert(crmLeads).values({
					id: LEAD_WITH_DIAGNOSIS_ID,
					organizationId: ORG_ID,
					name: "Лид с острой патологией",
					phone: "+79993334455",
					source: "yandex_direct",
					status: "new",
					notes: "Заявка: сильная боль в зубе 46, подозрение на пульпит K04.0, аллергия на лидокаин",
					expectedRevenue: "15000.00",
				}).onConflictDoNothing();

				await tx.insert(payments).values({
					id: PAYMENT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_IVANOV_ID,
					amountRub: "5000.00",
					status: "paid",
					paidAt: new Date("2026-09-01T10:00:00.000Z"),
				}).onConflictDoNothing();
			});
			databaseReady = true;
		} catch (e) {
			console.error("[Wave 14 Seed Failed]:", e);
		}
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 14 Cleanup] Purge warning:", e);
		}
	});

	// =========================================================================
	// АТАКА 1: GET /api/export/patients — МАРКЕТОЛОГ ПЫТАЕТСЯ ВЫГРУЗИТЬ ПАЦИЕНТОВ
	// =========================================================================
	await suite.test("ATTACK 1: Marketer patient database export blocked (403 Forbidden)", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/export/patients",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: GET /api/export/patients by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(res.statusCode, 403, "Маркетолог должен получить 403 Forbidden при попытке экспорта базы пациентов!");
		const body = JSON.parse(res.body);
		assert.equal(body.permission, "patients.export");

		console.log("✔ АТАКА 1 ОТБИТА: Выгрузка базы пациентов маркетологам категорически запрещена.");
	});

	// =========================================================================
	// АТАКА 2: GET /api/export/patients — АУДИТ ВЫГРУЗКИ АДМИНИСТРАТОРА (CSV/JSON)
	// =========================================================================
	await suite.test("ATTACK 2: Admin patient export has zero clinical diagnoses or tooth formulas", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// CSV формат
		const csvRes = await app.inject({
			method: "GET",
			url: "/api/export/patients?format=csv",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2.1: GET /api/export/patients?format=csv by Admin]\nStatus:",
			csvRes.statusCode,
			"\nContent-Type:",
			csvRes.headers["content-type"],
			"\nCSV Snippet:",
			csvRes.body.slice(0, 300),
		);

		assert.equal(csvRes.statusCode, 200);
		assert.ok(csvRes.headers["content-type"]?.toString().includes("text/csv"));
		// Проверяем, что в CSV нет незамаскированных диагнозов и зубов
		assert.ok(!csvRes.body.includes("K02"), "Код K02 не должен фигурировать в открытом виде!");
		assert.ok(!csvRes.body.includes("зуба 16"), "Номер зуба 16 не должен фигурировать в открытом виде!");
		assert.ok(!csvRes.body.includes("кариес"), "Термин кариес должен быть замаскирован!");
		assert.ok(csvRes.body.includes("[Сведения защищены 152-ФЗ]"));

		// JSON формат
		const jsonRes = await app.inject({
			method: "GET",
			url: "/api/export/patients?format=json",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
		});

		assert.equal(jsonRes.statusCode, 200);
		const jsonPatients = JSON.parse(jsonRes.body);
		const targetPatient = jsonPatients.find((p: any) => p.id === PATIENT_K02_ID);
		assert.ok(targetPatient);
		assert.equal(targetPatient.diagnosis, undefined, "Поле diagnosis не должно существовать в экспорте!");
		assert.equal(targetPatient.toothFormula, undefined, "Поле toothFormula не должно существовать в экспорте!");
		assert.equal(targetPatient.complaints, undefined, "Поле complaints не должно существовать в экспорте!");

		console.log("✔ АТАКА 2 ОТБИТА: Экспорт картотеки очищен от врачебной тайны.");
	});

	// =========================================================================
	// АТАКА 3: GET /api/export/leads — ПЕНТЕСТ ВЫГРУЗКИ ЛИДОВ МАРКЕТОЛОГОМ
	// =========================================================================
	await suite.test("ATTACK 3: Leads export clinical data masking for marketer", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// CSV формат
		const csvRes = await app.inject({
			method: "GET",
			url: "/api/export/leads?format=csv",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3.1: GET /api/export/leads?format=csv by Marketer]\nStatus:",
			csvRes.statusCode,
			"\nCSV Payload:",
			csvRes.body,
		);

		assert.equal(csvRes.statusCode, 200);
		assert.ok(!csvRes.body.includes("K04.0"), "Код K04.0 обязан быть скрыт!");
		assert.ok(!csvRes.body.includes("зубе 46"), "Номер зуба 46 обязан быть скрыт!");
		assert.ok(!csvRes.body.includes("пульпит"), "Диагноз пульпит обязан быть скрыт!");
		assert.ok(!csvRes.body.includes("лидокаин"), "Медикамент лидокаин обязан быть скрыт!");
		assert.ok(csvRes.body.includes("[Сведения защищены 152-ФЗ]"));

		// JSON формат
		const jsonRes = await app.inject({
			method: "GET",
			url: "/api/export/leads?format=json",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.equal(jsonRes.statusCode, 200);
		const jsonLeads = JSON.parse(jsonRes.body);
		const targetLead = jsonLeads.find((l: any) => l.id === LEAD_WITH_DIAGNOSIS_ID);
		assert.ok(targetLead);
		assert.ok(targetLead.notes.includes("[Сведения защищены 152-ФЗ]"));

		console.log("✔ АТАКА 3 ОТБИТА: Выгрузка лидов защищена от утечек диагнозов и формул зубов.");
	});

	// =========================================================================
	// АТАКА 4: GET /api/marketing/reports — АУДИТ СВОДНЫХ ОТЧЕТОВ МАРКЕТИНГА
	// =========================================================================
	await suite.test("ATTACK 4: Marketing aggregated reports contain zero medical secrecy", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/marketing/reports",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4: GET /api/marketing/reports by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(res.statusCode, 200);
		const report = JSON.parse(res.body);

		assert.ok(report.totalLeads >= 1);
		assert.equal(typeof report.totalRevenueKopecks, "number");
		assert.ok(!res.body.includes("K02"), "В сводном маркетинговом отчете нет МКБ-кодов!");
		assert.ok(!res.body.includes("K04"), "В сводном маркетинговом отчете нет МКБ-кодов!");
		assert.ok(!res.body.includes("пульпит"), "В маркетинговом отчете нет диагнозов!");
		assert.ok(!res.body.includes("зуб"), "В маркетинговом отчете нет формулы зубов!");

		console.log("✔ АТАКА 4 ОТБИТА: Сводные маркетинговые отчеты агрегированы и безопасны.");
	});

	// =========================================================================
	// АТАКА 5: GET /api/patients?search=K02 — БЛОКИРОВКА INFERENCE-АТАКИ
	// =========================================================================
	await suite.test("ATTACK 5: Medical search by non-clinical staff blocked (403 MedicalSearchForbidden)", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог ищет по МКБ-10 коду
		const searchK02Res = await app.inject({
			method: "GET",
			url: "/api/patients?search=K02",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5.1: GET /api/patients?search=K02 by Marketer]\nStatus:",
			searchK02Res.statusCode,
			"\nPayload:",
			searchK02Res.body,
		);

		assert.equal(
			searchK02Res.statusCode,
			403,
			"Поиск по МКБ коду K02 маркетологом обязан быть заблокирован кодом 403!",
		);
		const k02Body = JSON.parse(searchK02Res.body);
		assert.equal(k02Body.error, "MedicalSearchForbidden");
		assert.equal(k02Body.permission, "patients.search.clinical");

		// 2. Регистратор ищет по названию болезни «пульпит»
		const searchPulpitisRes = await app.inject({
			method: "GET",
			url: "/api/patients?search=пульпит",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5.2: GET /api/patients?search=пульпит by Receptionist]\nStatus:",
			searchPulpitisRes.statusCode,
			"\nPayload:",
			searchPulpitisRes.body,
		);

		assert.equal(
			searchPulpitisRes.statusCode,
			403,
			"Поиск по диагнозу «пульпит» регистратором обязан быть заблокирован кодом 403!",
		);
		const pulpitisBody = JSON.parse(searchPulpitisRes.body);
		assert.equal(pulpitisBody.error, "MedicalSearchForbidden");

		console.log("✔ АТАКА 5 ОТБИТА: Поиск пациентов по МКБ-10 и диагнозам неклиническим персоналом аппаратно заблокирован (403).");
	});

	// =========================================================================
	// АТАКА 6: GET /api/patients?search=Иванов — АДМИНИСТРАТИВНЫЙ ПОИСК
	// =========================================================================
	await suite.test("ATTACK 6: Administrative search by patient name allowed for receptionist", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/patients?search=Иванов",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 6: GET /api/patients?search=Иванов by Receptionist]\nStatus:",
			res.statusCode,
		);

		assert.equal(res.statusCode, 200, "Административный поиск по ФИО разрешен регистратуре");
		const found = JSON.parse(res.body);
		assert.ok(Array.isArray(found));
		assert.equal(found.length, 1);
		assert.equal(found[0].id, PATIENT_IVANOV_ID);

		console.log("✔ АТАКА 6 ОТБИТА: Административный поиск по ФИО работает штатно.");
	});

	// =========================================================================
	// АТАКА 7: GET /api/patients?search=K04.0 — КЛИНИЧЕСКИЙ ПОИСК ВРАЧА
	// =========================================================================
	await suite.test("ATTACK 7: Clinical search by ICD-10 allowed for certified doctor", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/patients?search=K04.0",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 7: GET /api/patients?search=K04.0 by Doctor]\nStatus:",
			res.statusCode,
		);

		assert.equal(res.statusCode, 200, "Врачу разрешен поиск с клиническими параметрами");

		console.log("✔ АТАКА 7 ОТБИТА: Врач имеет законный доступ к клиническому поиску.");
	});
});
