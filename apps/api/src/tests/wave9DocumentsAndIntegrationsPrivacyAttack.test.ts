/**
 * wave9DocumentsAndIntegrationsPrivacyAttack.test.ts
 *
 * ВОЛНА 9 АТАК: ЭНДПОИНТЫ ДОКУМЕНТОВ, ПЕЧАТНЫЕ ФОРМЫ, AI-ИНТЕГРАЦИИ И ЛОГИРОВАНИЕ
 * ПЕНТЕСТ ВРАЧЕБНОЙ ТАЙНЫ (152-ФЗ / 323-ФЗ ст. 13) ПОД ТОКЕНАМИ НЕКЛИНИЧЕСКИХ СОТРУДНИКОВ
 *
 * Цель атаки:
 * 1. GET /api/documents (список документов) — попытка неклинического маркетолога получить медкарты и планы лечения;
 * 2. GET /api/documents/:id — попытка извлечь клинические данные (план лечения, 043/у) маркетологом;
 * 3. GET /api/documents/:id/treatment-plan-pdf и /html — попытка выгрузки печатной формы с диагнозами и зубами;
 * 4. GET /api/documents/templates и /templates/:kind — аудит каталога шаблонов под неклиническим профилем;
 * 5. GET /api/integrations/diagnocat/reports/:patientId — попытка утечки AI-одонтограммы и диагнозов каждого зуба;
 * 6. sanitizePayload (152-ФЗ / 323-ФЗ) — аудит маскирования диагнозов и врачебной тайны в логах сервера.
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { sanitizePayload } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	clinics,
	diagnocatReports,
	generatedDocuments,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { registerDiagnocatRoutes } from "../routes/integrations/diagnocat.js";
import { registerDocumentRoutes } from "../routes/documents.js";
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

const NAMESPACE = "wave9-docs-privacy-test";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 4);
const ACTIVE_PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const ARCHIVED_PATIENT_ID = fixtureUuid(NAMESPACE, 11);

const CLINICAL_DOC_ID = fixtureUuid(NAMESPACE, 20);
const ADMIN_DOC_ID = fixtureUuid(NAMESPACE, 21);
const DIAGNOCAT_REPORT_ID = fixtureUuid(NAMESPACE, 30);

test("RED-TEAM HAMMER: WAVE 9 — Documents & Integrations Medical Privacy Penetration", async (suite) => {
	let app: FastifyInstance;
	let doctorToken: string;
	let marketerToken: string;
	let clinicToken: string;
	let databaseReady = false;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 9 Before] Purge warning:", e);
		}

		app = await createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);
		await registerPatientRoutes(app);
		await registerDocumentRoutes(app);
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
					name: "Клиника Волна 9 Секретность",
					inn: "7709999991",
					kpp: "770901001",
					ogrn: "1237700999991",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главное отделение Волны 9",
					address: "г. Москва, ул. Медицинской Тайны, д. 9",
					phone: "+74959990009",
				}).onConflictDoNothing();

				await tx.insert(users).values([
					{
						id: DOCTOR_USER_ID,
						organizationId: ORG_ID,
						role: "doctor",
						canSignMedicalRecords: true,
						fullName: "Д-р Белов Сергей (Хирург)",
					},
					{
						id: MARKETER_USER_ID,
						organizationId: ORG_ID,
						role: "marketer",
						canSignMedicalRecords: false,
						fullName: "Маркетолог Власов (Трафик)",
					},
				]).onConflictDoNothing();

				await tx.insert(patients).values([
					{
						id: ACTIVE_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Активный Михайлович",
						birthDate: "1988-04-12",
						phone: "+79998881122",
						status: "active",
					},
					{
						id: ARCHIVED_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Архивный Сергеевич",
						birthDate: "1975-11-20",
						phone: "+79998883344",
						status: "archived",
					},
				]).onConflictDoNothing();

				// Сеем клинический документ (план лечения с патологиями и зубами)
				await tx.insert(generatedDocuments).values([
					{
						id: CLINICAL_DOC_ID,
						organizationId: ORG_ID,
						patientId: ACTIVE_PATIENT_ID,
						kind: "treatment_plan",
						status: "issued",
						title: "Комплексный план лечения: Пульпит 46, Имплантация 36",
						payloadJson: JSON.stringify({
							diagnosis: "K04.0 Пульпит",
							teeth: [46, 36],
							stages: [
								{ title: "Эндодонтия зуба 46", cost: 18000 },
								{ title: "Установка имплантата 36", cost: 45000 },
							],
						}),
						totalAmountRub: 63000,
					},
					{
						id: ADMIN_DOC_ID,
						organizationId: ORG_ID,
						patientId: ACTIVE_PATIENT_ID,
						kind: "completed_works_act",
						status: "issued",
						title: "Акт выполненных работ № 901",
						payloadJson: JSON.stringify({
							actNumber: "901",
							totalRub: 15000,
						}),
						totalAmountRub: 15000,
					},
				]).onConflictDoNothing();

				// Сеем отчет Diagnocat (AI диагностика зубов)
				await tx.insert(diagnocatReports).values({
					id: DIAGNOCAT_REPORT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					reportUrl: "https://diagnocat.example.com/reports/dce70000-ai-report",
					odontogramData: {
						tooth_46: { caries: true, periapical_lesion: true },
						tooth_36: { missing: true, bone_loss_percent: 35 },
					},
				}).onConflictDoNothing();
			});
			databaseReady = true;
		} catch (e) {
			console.error("[Wave 9 Seed Failed]:", e);
		}
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 9 Cleanup] Purge warning:", e);
		}
	});

	// =========================================================================
	// АТАКА 1: GET /api/documents — ФИЛЬТРАЦИЯ И ЗАЩИТА СПИСКА ДОКУМЕНТОВ
	// =========================================================================
	await suite.test("ATTACK 1: Marketer blocked from clinical document list leaks", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог запрашивает общий список документов
		const res = await app.inject({
			method: "GET",
			url: "/api/documents",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.equal(res.statusCode, 200, "Маркетолог получает доступ к списку документов");
		const body = JSON.parse(res.body);
		assert.ok(Array.isArray(body.documents), "Ответ должен содержать массив документов");

		// Проверяем: клинический документ treatment_plan ОБЯЗАН отсутствовать в выдаче для маркетолога!
		const foundClinical = body.documents.find((d: any) => d.id === CLINICAL_DOC_ID);
		assert.equal(
			foundClinical,
			undefined,
			"ВРАЧЕБНАЯ ТАЙНА: План лечения с диагнозами не должен отдаваться маркетологу!",
		);

		// Немедицинский документ (акт) отдается
		const foundAdmin = body.documents.find((d: any) => d.id === ADMIN_DOC_ID);
		assert.ok(foundAdmin, "Административный документ (акт) доступен в общем списке");

		// 2. Маркетолог пытается явно запросить список медицинских карт/планов лечения (?kind=treatment_plan)
		const leakAttempt = await app.inject({
			method: "GET",
			url: "/api/documents?kind=treatment_plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: GET /api/documents?kind=treatment_plan by Marketer]\nStatus:",
			leakAttempt.statusCode,
			"\nPayload:",
			leakAttempt.body,
		);

		assert.equal(
			leakAttempt.statusCode,
			403,
			"Попытка извлечения медицинских планов лечения неклиническим персоналом должна возвращать 403 Forbidden",
		);
		const leakBody = JSON.parse(leakAttempt.body);
		assert.equal(leakBody.permission, "clinical.document.read");
		console.log("✔ АТАКА 1 ОТБИТА: Маркетолог изолирован от списка клинических документов (403 Forbidden).");
	});

	// =========================================================================
	// АТАКА 2: GET /api/documents/:id — ПРЯМОЙ ДОСТУП К КЛИНИЧЕСКОМУ ДОКУМЕНТУ
	// =========================================================================
	await suite.test("ATTACK 2: Marketer blocked from reading clinical document by ID", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// Маркетолог пытается прочитать план лечения по ID
		const res = await app.inject({
			method: "GET",
			url: `/api/documents/${CLINICAL_DOC_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: GET /api/documents/:id by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(
			res.statusCode,
			403,
			"Маркетолог обязан получить 403 Forbidden при попытке чтения медицинского документа",
		);
		const body = JSON.parse(res.body);
		assert.equal(body.permission, "clinical.document.read");

		// Врач читает тот же документ -> 200 OK
		const docRes = await app.inject({
			method: "GET",
			url: `/api/documents/${CLINICAL_DOC_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});
		assert.equal(docRes.statusCode, 200, "Врач имеет законный доступ к плану лечения");
		console.log("✔ АТАКА 2 ОТБИТА: Прямой доступ к плану лечения аппаратно заблокирован кодом 403.");
	});

	// =========================================================================
	// АТАКА 3: GET /api/documents/:id/treatment-plan-pdf & /html — ПЕЧАТНЫЕ ФОРМЫ
	// =========================================================================
	await suite.test("ATTACK 3: Print form PDF and HTML exfiltration blocked for non-clinical staff", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог пытается выгрузить PDF плана лечения
		const pdfRes = await app.inject({
			method: "GET",
			url: `/api/documents/${CLINICAL_DOC_ID}/treatment-plan-pdf`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3.1: GET /api/documents/:id/treatment-plan-pdf by Marketer]\nStatus:",
			pdfRes.statusCode,
			"\nPayload:",
			pdfRes.body,
		);

		assert.equal(
			pdfRes.statusCode,
			403,
			"Печать плана лечения в PDF неклиническим сотрудником должна блокироваться кодом 403",
		);

		// 2. Маркетолог пытается запросить HTML предпросмотр плана лечения
		const htmlRes = await app.inject({
			method: "GET",
			url: `/api/documents/${CLINICAL_DOC_ID}/html`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"[RED-TEAM AUDIT 3.2: GET /api/documents/:id/html by Marketer]\nStatus:",
			htmlRes.statusCode,
			"\nPayload:",
			htmlRes.body,
		);

		assert.equal(
			htmlRes.statusCode,
			403,
			"HTML-предпросмотр медицинского документа неклиническим сотрудником блокируется кодом 403",
		);

		console.log("✔ АТАКА 3 ОТБИТА: Все печатные формы и рендеры плана лечения защищены кодом 403.");
	});

	// =========================================================================
	// АТАКА 4: GET /api/documents/templates — КАТАЛОГ ШАБЛОНОВ ДОКУМЕНТОВ
	// =========================================================================
	await suite.test("ATTACK 4: Document templates catalog filtered for non-clinical personnel", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог запрашивает список шаблонов
		const res = await app.inject({
			method: "GET",
			url: "/api/documents/templates",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.ok(Array.isArray(body.templates), "Должен вернуться список шаблонов");

		// Проверяем, что клинические шаблоны (медкарта 043/у, план лечения) отфильтрованы
		const clinicalTemplate = body.templates.find(
			(tmpl: any) => tmpl.kind === "dental_medical_card_043u" || tmpl.kind === "treatment_plan",
		);
		assert.equal(
			clinicalTemplate,
			undefined,
			"Клинические медицинские шаблоны не должны отображаться маркетологу",
		);

		// 2. Маркетолог пытается напрямую запросить медицинский шаблон по типу
		const templateLeak = await app.inject({
			method: "GET",
			url: "/api/documents/templates/dental_medical_card_043u",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4: GET /api/documents/templates/dental_medical_card_043u by Marketer]\nStatus:",
			templateLeak.statusCode,
			"\nPayload:",
			templateLeak.body,
		);

		assert.equal(
			templateLeak.statusCode,
			403,
			"Прямой запрос клинического шаблона неклиническим персоналом блокируется 403 Forbidden",
		);
		const templateLeakBody = JSON.parse(templateLeak.body);
		assert.equal(templateLeakBody.permission, "clinical.document.template.read");

		// Врач получает медицинский шаблон -> 200 OK
		const docTmpl = await app.inject({
			method: "GET",
			url: "/api/documents/templates/dental_medical_card_043u",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});
		assert.equal(docTmpl.statusCode, 200, "Врач имеет доступ к шаблону 043/у");
		console.log("✔ АТАКА 4 ОТБИТА: Каталог медицинских шаблонов закрыт для неклинических ролей (403).");
	});

	// =========================================================================
	// АТАКА 5: DIAGNOCAT AI ODONTOGRAM & DIAGNOSIS LEAK ATTACK
	// =========================================================================
	await suite.test("ATTACK 5: Diagnocat AI radiologic reports blocked for non-clinical staff and archived patients", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог пытается получить AI отчет Diagnocat с диагнозами зубов
		const res = await app.inject({
			method: "GET",
			url: `/api/integrations/diagnocat/reports/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5.1: Diagnocat AI reports by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(
			res.statusCode,
			403,
			"Маркетолог обязан получить 403 Forbidden при попытке чтения AI-диагностики Diagnocat",
		);
		const body = JSON.parse(res.body);
		assert.equal(body.permission, "integrations.diagnocat.read");

		// 2. Попытка запросить отчет для архивированного пациента неклиническим персоналом
		const archivedReportRes = await app.inject({
			method: "GET",
			url: `/api/integrations/diagnocat/reports/${ARCHIVED_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"[RED-TEAM AUDIT 5.2: Diagnocat AI reports for Archived Patient by Marketer]\nStatus:",
			archivedReportRes.statusCode,
			"\nPayload:",
			archivedReportRes.body,
		);

		assert.equal(archivedReportRes.statusCode, 403);

		// 3. Врач законно получает отчет Diagnocat -> 200 OK
		const doctorRes = await app.inject({
			method: "GET",
			url: `/api/integrations/diagnocat/reports/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});
		assert.equal(doctorRes.statusCode, 200, "Врач имеет доступ к AI-диагностике Diagnocat");
		const doctorBody = JSON.parse(doctorRes.body);
		assert.ok(doctorBody.reports.length > 0, "Отчеты Diagnocat возвращены врачу");
		console.log("✔ АТАКА 5 ОТБИТА: AI-одонтограмма Diagnocat аппаратно защищена (403 Forbidden).");
	});

	// =========================================================================
	// АТАКА 6: 152-ФЗ / 323-ФЗ САНИТИЗАЦИЯ ВРАЧЕБНОЙ ТАЙНЫ В ЛОГАХ СЕРВЕРА
	// =========================================================================
	await suite.test("ATTACK 6: 152-FZ / 323-FZ Diagnosis Sanitizer Audit in Logs & Webhook Ingestion", async () => {
		// Создаем симуляцию полезной нагрузки с глубоко вложенной врачебной тайной
		const maliciousLogData = {
			timestamp: "2026-09-02T18:00:00.000Z",
			correlationId: "req-attack-wave9-audit-leak",
			user: {
				id: "user-123",
				name: "Оператор Колл-Центра",
			},
			patientData: {
				patientId: "patient-789",
				diagnosis: "K04.0 Острый серозный пульпит зуба 46",
				mkb10: "K04.0",
				clinicalNotes: "Выполнена трепанация коронки зуба 46, экстирпация пульпы под Sol. Articaini 4%",
				toothFormula: "11-48, дефект зубного ряда",
				treatmentPlan: "Имплантация Nobel Biocare 36, металлокерамика 46",
				complaints: "Острая ночная самопроизвольная пульсирующая боль",
				anamnesis: "Болеет 3 дня, принимал Нимесил без эффекта",
				odontogramData: {
					tooth_46: "Pulpitis",
				},
			},
			billing: {
				totalRub: 25000,
				currency: "RUB",
			},
		};

		const sanitized = sanitizePayload(maliciousLogData);

		console.log(
			"\n[RED-TEAM AUDIT 6: Sanitizer Masking Output]\nSanitized Object:",
			JSON.stringify(sanitized, null, 2),
		);

		// Проверяем, что все медицинские поля замаскированы
		assert.equal(
			(sanitized.patientData as any).diagnosis,
			"[СКРЫТО]",
			"Поле diagnosis обязано быть замаскировано!",
		);
		assert.equal(
			(sanitized.patientData as any).mkb10,
			"[СКРЫТО]",
			"Поле mkb10 обязано быть замаскировано!",
		);
		assert.equal(
			(sanitized.patientData as any).clinicalNotes,
			"[СКРЫТО]",
			"Поле clinicalNotes обязано быть замаскировано!",
		);
		assert.equal(
			(sanitized.patientData as any).toothFormula,
			"[СКРЫТО]",
			"Поле toothFormula обязано быть замаскировано!",
		);
		assert.equal(
			(sanitized.patientData as any).treatmentPlan,
			"[СКРЫТО]",
			"Поле treatmentPlan обязано быть замаскировано!",
		);
		assert.equal(
			(sanitized.patientData as any).complaints,
			"[СКРЫТО]",
			"Поле complaints обязано быть замаскировано!",
		);
		assert.equal(
			(sanitized.patientData as any).anamnesis,
			"[СКРЫТО]",
			"Поле anamnesis обязано быть замаскировано!",
		);
		assert.equal(
			(sanitized.patientData as any).odontogramData.tooth_46,
			"[СКРЫТО]",
			"Поле odontogramData.tooth_46 обязано быть замаскировано!",
		);

		// Немедицинские поля сохранены
		assert.equal((sanitized.billing as any).totalRub, 25000, "Финансовые суммы не искажаются");
		assert.equal((sanitized.user as any).name, "Оператор Колл-Центра");

		console.log("✔ АТАКА 6 ОТБИТА: Все диагнозы, МКБ-10, жалобы и одонтограммы в логах аппаратно замаскированы.");
	});
});
