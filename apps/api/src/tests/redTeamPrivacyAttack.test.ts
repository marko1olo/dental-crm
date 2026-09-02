/**
 * RED-TEAM HAMMER INQUISITION: AGGRESSIVE MEDICAL PRIVACY PEN-TEST
 * PROSECUTOR 1: THE 152-FZ STRIPPER
 *
 * Hostile Penetration Testing targeting Medical Confidentiality & Clinical Secrecy:
 * (152-FZ "On Personal Data", 323-FZ Art. 13 "Medical Secrecy")
 *
 * Attack Vectors:
 * 1. Header Spoofing & Role Escalation:
 *    - x-user-role: doctor
 *    - x-staff-role: doctor
 *    - x-forwarded-role: doctor
 *    - x-clinical-role: doctor
 *    - x-can-sign-medical-records: true
 * 2. Authorization Bypass / Bare Clinic Session:
 *    - Probing clinical endpoints with bare x-dente-clinic-token (omitting staff token).
 * 3. Parameter Pollution & Expansion:
 *    - ?fields=all
 *    - ?include=diagnosis
 *    - ?expand=odontogram
 * 4. Cross-Domain Lateral Reconnaissance:
 *    - GET /api/dashboard (activeVisit diagnosis & complaints)
 *    - GET /api/invoices (billing & treatment items)
 *    - GET /api/patients/:patientId
 *    - GET /api/patients/:patientId/tooth-states
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	organizations,
	patients,
	toothStates,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
	visitDiaries,
	visits,
} from "../db/schema.js";
import { registerDashboardRoutes } from "../routes/dashboard.js";
import { registerInvoiceRoutes } from "../routes/invoices.js";
import { registerOdontogramRoutes } from "../routes/odontogram.js";
import { registerPatientRoutes } from "../routes/patients.js";
import { registerVisitRoutes } from "../routes/visits.js";
import { authTokenSecret } from "../security/authSecret.js";
import { registerMedicalSecrecyPayloadStripping } from "../security/medicalSecrecyWarden.js";
import { wsBroker } from "../services/websocketBroker.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerRouteNotFoundHandler } from "../utils/routeNotFound.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "redTeamAttack";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 2);
const RECEPTIONIST_USER_ID = fixtureUuid(NAMESPACE, 3);
const ADMIN_USER_ID = fixtureUuid(NAMESPACE, 4);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 5);
const PATIENT_ID = fixtureUuid(NAMESPACE, 6);
const VISIT_ID = fixtureUuid(NAMESPACE, 7);
const DIARY_ID = fixtureUuid(NAMESPACE, 8);
const TOOTH_STATE_ID = fixtureUuid(NAMESPACE, 9);
const PLAN_ID = fixtureUuid(NAMESPACE, 10);

describe("RED-TEAM HAMMER: 152-FZ / 323-ФЗ Aggressive Attack Suite", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let marketerStaffToken = "";
	let receptionistStaffToken = "";
	let adminStaffToken = "";
	let doctorStaffToken = "";
	let databaseReady = true;

	const FORBIDDEN_KEYS = [
		"diagnosis",
		"diagnoses",
		"mkb10",
		"mkb_10",
		"icd10",
		"icd_10",
		"diagnosisIcd10",
		"diagnosis_icd10",
		"diagnosisMkb",
		"diagnosis_mkb",
		"emr_records",
		"emrRecords",
		"emk",
		"emkRecords",
		"toothFormula",
		"tooth_formula",
		"toothStates",
		"clinicalNotes",
		"clinical_notes",
		"anamnesis",
		"statusLocalis",
		"status_localis",
		"treatmentDescription",
		"treatment_description",
		"clinicalData",
	];

	const CLINICAL_LEAK_PATTERNS = [
		/K02\.\d/i,
		/K04\.\d/i,
		/пульпит/i,
		/кариес/i,
		/экстирпация/i,
		/препарирование/i,
	];

	function detectLeaks(obj: unknown, path = ""): string[] {
		const leaks: string[] = [];
		if (!obj || typeof obj !== "object") return leaks;

		if (Array.isArray(obj)) {
			obj.forEach((item, index) => {
				leaks.push(...detectLeaks(item, `${path}[${index}]`));
			});
			return leaks;
		}

		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			const currentPath = path ? `${path}.${key}` : key;
			if (FORBIDDEN_KEYS.some((fk) => fk.toLowerCase() === key.toLowerCase())) {
				if (value !== undefined && value !== null) {
					leaks.push(`[FORBIDDEN_KEY] ${currentPath} = ${JSON.stringify(value)}`);
				}
			}
			if (typeof value === "string") {
				for (const pattern of CLINICAL_LEAK_PATTERNS) {
					if (pattern.test(value)) {
						leaks.push(`[CLINICAL_TEXT_LEAK] ${currentPath} matched ${pattern}: "${value}"`);
					}
				}
			}
			if (value && typeof value === "object") {
				leaks.push(...detectLeaks(value, currentPath));
			}
		}
		return leaks;
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";

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
					name: "Клиника Ред-Тим Инквизиции 152-ФЗ",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values([
					{
						id: MARKETER_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Маркетолог Атакующий М.А.",
						role: "marketer",
					},
					{
						id: RECEPTIONIST_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Регистратор Ресепшена Р.Р.",
						role: "receptionist",
					},
					{
						id: ADMIN_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Системный Администратор С.А.",
						role: "admin",
					},
					{
						id: DOCTOR_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Лечащий Врач Стоматолог В.С.",
						role: "doctor",
					},
				])
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Михайлов Сергей Петрович",
					birthDate: "1990-03-12",
					phone: "+79998887766",
					email: "mikhaylov@example.com",
					notes: "VIP пациент. Пожелание: не звонить утром.",
					administrativeProfile: {
						snils: "111-222-333 44",
						identityDocument: "Паспорт РФ 46 12 123456",
						taxpayerInn: "770987654321",
						registrationAddress: "г. Москва, Красная площадь, д. 1",
						residentialAddress: "г. Москва, Красная площадь, д. 1",
						insurancePolicyNumber: "9999888877776666",
						legalRepresentativeFullName: null,
						legalRepresentativeRelationship: null,
						legalRepresentativeIdentityDocument: null,
						legalRepresentativePhone: null,
						preferredDocumentRecipient: null,
						preferredAppointmentWeekdays: [1, 2, 3, 4, 5],
						preferredAppointmentStart: "10:00",
						preferredAppointmentEnd: "19:00",
						preferredAppointmentNote: null,
						dataProcessingBasisNote: "Согласие 152-ФЗ от 01.01.2025",
						orthodonticProgress: null,
						loyaltyTier: "platinum",
						curatorId: null,
						curatorFullName: null,
						curatorAssignedAt: null,
						curatorFunnelStage: null,
						curatorCommissionPercent: null,
						curatorNotes: null,
						curatorNextContactDate: null,
					},
					status: "active",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					status: "signed",
					diagnosis: "K04.0 Острый очаговый пульпит зуба 36",
					complaint: "Пульсирующая острая ночная боль",
					anamnesis: "Ранее лечен по поводу кариеса",
					objectiveStatus: "Зуб 36: глубокая кариозная полость",
					treatmentPlan: "Эндодонтическое лечение корневых каналов",
				})
				.onConflictDoNothing();

			await db
				.insert(visitDiaries)
				.values({
					id: DIARY_ID,
					organizationId: ORGANIZATION_ID,
					visitId: VISIT_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_USER_ID,
					authorId: DOCTOR_USER_ID,
					anamnesis: "Острая боль",
					statusLocalis: "Кариес дентина, вскрыт рог пульпы",
					diagnosisIcd10: "K04.0",
					diagnosisTooth: "36",
					treatmentDescription: "Витальная экстирпация пульпы",
					content: "Дневник 043/у",
					isLocked: true,
				})
				.onConflictDoNothing();

			await db
				.insert(toothStates)
				.values({
					id: TOOTH_STATE_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					toothNumber: 36,
					state: "caries",
					surfaces: ["MOD"],
					notes: "Глубокий кариес дентина, пульпит K04.0",
				})
				.onConflictDoNothing();

			await db
				.insert(treatmentPlans)
				.values({
					id: PLAN_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					name: "Комплексный план: лечение глубокого кариеса зуба 36",
					status: "Draft",
					totalPriceRub: "12500.00",
					totalPrice: "12500.00",
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORGANIZATION_ID }, secret);
		marketerStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: MARKETER_USER_ID,
				role: "marketer",
				fullName: "Маркетолог Атакующий М.А.",
			},
			secret,
		);
		receptionistStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: RECEPTIONIST_USER_ID,
				role: "receptionist",
				fullName: "Регистратор Ресепшена Р.Р.",
			},
			secret,
		);
		adminStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: ADMIN_USER_ID,
				role: "admin",
				fullName: "Системный Администратор С.А.",
			},
			secret,
		);
		doctorStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				fullName: "Лечащий Врач Стоматолог В.С.",
			},
			secret,
		);

		app = createTenantTestApp();
		registerRouteNotFoundHandler(app);
		registerMedicalSecrecyPayloadStripping(app);
		await registerPatientRoutes(app);
		await registerOdontogramRoutes(app);
		await registerInvoiceRoutes(app);
		await registerDashboardRoutes(app);
		await registerVisitRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	// =========================================================================
	// АТАКА 1: ПОДМЕНА РОЛИ В ЗАГОЛОВКАХ (X-User-Role / X-Staff-Role / X-Forwarded-Role)
	// Маркетолог шлет свой токен, но добавляет заголовок x-user-role: doctor
	// =========================================================================
	test("ATTACK 1: Header Spoofing — Marketer sending X-User-Role: doctor", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/tooth-states`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
				"x-user-role": "doctor",
				"x-staff-role": "doctor",
				"x-forwarded-role": "doctor",
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: Header Spoofing (x-user-role: doctor)]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		// Сервер ОБЯЗАН игнорировать заголовок и верить только подписанному токену (403 Forbidden)
		assert.strictEqual(
			res.statusCode,
			403,
			`[DEFECT] Сервер поверил заголовку x-user-role и пропустил маркетолога! Получено: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.role, "marketer", "Роль должна браться из подписанного токена, а не из заголовка");
	});

	// =========================================================================
	// АТАКА 2: АВТОРИЗАЦИОННЫЙ ОБХОД (BARE CLINIC TOKEN — НЕТ ТОКЕНА СОТРУДНИКА)
	// Атакующий отправляет валидный x-dente-clinic-token, но НЕ передает staff-токен
	// и пытается прочитать зубную формулу с диагнозами
	// =========================================================================
	test("ATTACK 2: Authorization Bypass — Bare clinic token without staff token to /tooth-states", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/tooth-states`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				// x-dente-staff-token намеренно опущен
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: Bare Clinic Token Bypass]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		const leaks = detectLeaks(JSON.parse(res.payload));
		if (res.statusCode === 200 && leaks.length > 0) {
			console.error("\n[CRITICAL VULNERABILITY DETECTED]: Bare clinic token bypassed clinical RBAC!\n", leaks);
			assert.fail(
				`КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Запрос без токена сотрудника (только с токеном клиники) получил зубную формулу с диагнозами!\n${leaks.join("\n")}`,
			);
		}

		assert.strictEqual(
			res.statusCode,
			403,
			`Запрос без клинического сотрудника обязан отклоняться 403 Forbidden. Получено: ${res.statusCode}`,
		);
	});

	// =========================================================================
	// АТАКА 3: ЭСКАЛАЦИЯ АДМИНИСТРАТОРА (X-Clinical-Role / X-Can-Sign-Medical-Records)
	// Немедицинский админ шлет токен admin и добавляет заголовок x-can-sign-medical-records: true
	// =========================================================================
	test("ATTACK 3: Admin Escalation — Non-clinical admin spoofing x-can-sign-medical-records: true", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/tooth-states`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminStaffToken,
				"x-can-sign-medical-records": "true",
				"x-clinical-role": "doctor",
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3: Admin Header Escalation]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		const leaks = detectLeaks(JSON.parse(res.payload));
		if (res.statusCode === 200 && leaks.length > 0) {
			console.error("\n[CRITICAL VULNERABILITY DETECTED]: Untrusted headers escalated admin to clinical role!\n", leaks);
			assert.fail(
				`КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Недоверенные заголовки x-can-sign-medical-records / x-clinical-role дали неклиническому админу доступ к диагнозам!\n${leaks.join("\n")}`,
			);
		}

		assert.strictEqual(
			res.statusCode,
			403,
			`Недоверенные заголовки не должны эскалировать права админа без врача. Получено: ${res.statusCode}`,
		);
	});

	// =========================================================================
	// АТАКА 4: PARAMETER POLLUTION & EXPANSION НА КАРТОТЕКУ ПАЦИЕНТОВ
	// GET /api/patients?fields=all&include=diagnosis&expand=odontogram
	// =========================================================================
	test("ATTACK 4: Parameter Pollution — GET /api/patients with ?fields=all&include=diagnosis&expand=odontogram", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/patients?fields=all&include=diagnosis&expand=odontogram&select=*&withClinical=true",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const payload = JSON.parse(res.payload);
		const leaks = detectLeaks(payload);

		console.log(
			"\n[RED-TEAM AUDIT 4: Parameter Pollution on /api/patients]\nStatus:",
			res.statusCode,
			"\nLeaks Found:",
			leaks.length,
		);

		assert.strictEqual(
			leaks.length,
			0,
			`[DEFECT] Внедрение параметров ?fields=all/include=diagnosis привело к утечке диагнозов:\n${leaks.join("\n")}`,
		);
	});

	// =========================================================================
	// АТАКА 5: СМЕЖНЫЙ ЭНДПОИНТ — GET /api/dashboard ПОД МАРКЕТОЛОГОМ И РЕГИСТРАТОРОМ
	// Проверка: утекает ли activeVisit.diagnosis, complaint, anamnesis в дашборде
	// =========================================================================
	test("ATTACK 5: Dashboard Reconnaissance — Marketer querying GET /api/dashboard", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/dashboard",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5: GET /api/dashboard under Marketer]\nStatus:",
			res.statusCode,
		);

		assert.strictEqual(
			res.statusCode,
			200,
			`Дашборд должен отвечать маркетологу: ${res.statusCode} ${res.payload}`,
		);

		const body = JSON.parse(res.payload);
		const leaks = detectLeaks(body);

		console.log(
			"[RED-TEAM AUDIT 5: Dashboard Leaks count]:",
			leaks.length,
			leaks.slice(0, 5),
		);

		if (leaks.length > 0) {
			console.error("\n[CRITICAL VULNERABILITY IN DASHBOARD]:", leaks);
			assert.fail(
				`КРИТИЧЕСКИЙ БРАК: В дашборде клиники обнаружена утечка медицинской тайны для маркетолога:\n${leaks.join("\n")}`,
			);
		}
	});

	// =========================================================================
	// АТАКА 6: СМЕЖНЫЙ ЭНДПОИНТ — GET /api/invoices ПОД РЕГИСТРАТОРОМ И МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 6: Invoices Reconnaissance — Receptionist querying GET /api/invoices", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/invoices?patientId=${PATIENT_ID}&fields=all&include=diagnosis`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 6: GET /api/invoices under Receptionist]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		// Если доступ разрешен, в ответе не должно быть диагнозов
		if (res.statusCode === 200) {
			const body = JSON.parse(res.payload);
			const leaks = detectLeaks(body);
			assert.strictEqual(
				leaks.length,
				0,
				`В счетах обнаружена утечка клинических диагнозов:\n${leaks.join("\n")}`,
			);
		}
	});

	// =========================================================================
	// АТАКА 7: РАЗВЕДКА ВИЗИТОВ — GET /api/visits ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 7: Visits Reconnaissance — Marketer querying GET /api/visits", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/visits?patientId=${PATIENT_ID}&fields=all&include=diagnosis`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 7: GET /api/visits under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		// Маршрут /api/visits не должен существовать как открытый список всех приёмов
		// Должен отвечать 404 RouteNotFound, либо 403 Forbidden
		assert.ok(
			[404, 403, 401].includes(res.statusCode),
			`GET /api/visits не должен отдавать 200 OK маркетологу: статус ${res.statusCode}`,
		);

		const body = JSON.parse(res.payload);
		const leaks = detectLeaks(body);
		assert.strictEqual(
			leaks.length,
			0,
			`В ответе /api/visits обнаружена утечка медицинской тайны:\n${leaks.join("\n")}`,
		);
	});

	// =========================================================================
	// АТАКА 8: АВТОСОХРАНЕНИЕ ПРИЕМА — GET /api/visits/:visitId/draft/autosave ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 8: Visit Draft Autosave — Marketer querying GET /api/visits/:visitId/draft/autosave", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/visits/${VISIT_ID}/draft/autosave`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 8: GET /api/visits/:visitId/draft/autosave under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		// Маркетолог не имеет прав клинического чтения -> обязан получить 403, либо 404
		assert.ok(
			[403, 404].includes(res.statusCode),
			`Маркетолог не должен получать 200 с черновиком приёма: ${res.statusCode}`,
		);

		const body = JSON.parse(res.payload);
		const leaks = detectLeaks(body);
		assert.strictEqual(
			leaks.length,
			0,
			`В ответе черновика обнаружена утечка медицинской тайны:\n${leaks.join("\n")}`,
		);
	});

	// =========================================================================
	// АТАКА 9: РАЗВЕДКА ПЛАНОВ ЛЕЧЕНИЯ — GET /api/treatment-plans ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 9: Treatment Plans Reconnaissance — Marketer querying GET /api/treatment-plans", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/treatment-plans?patientId=${PATIENT_ID}&fields=all&include=diagnosis`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 9: GET /api/treatment-plans under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		assert.ok(
			[404, 403, 401].includes(res.statusCode),
			`GET /api/treatment-plans не должен отдавать 200 OK маркетологу: статус ${res.statusCode}`,
		);

		const body = JSON.parse(res.payload);
		const leaks = detectLeaks(body);
		assert.strictEqual(
			leaks.length,
			0,
			`В ответе /api/treatment-plans обнаружена утечка медицинской тайны:\n${leaks.join("\n")}`,
		);
	});

	// =========================================================================
	// АТАКА 10: ПЛАНЫ ЛЕЧЕНИЯ ПАЦИЕНТА — GET /api/patients/:patientId/treatment-plans ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 10: Patient Treatment Plans — Marketer querying GET /api/patients/:patientId/treatment-plans", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 10: GET /api/patients/:patientId/treatment-plans under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		// Если эндпоинт отдает 200 OK или 403 Forbidden, проверяем на утечки диагнозов
		const body = JSON.parse(res.payload);
		const leaks = detectLeaks(body);

		console.log(
			"[RED-TEAM AUDIT 10: Treatment Plans Leaks count]:",
			leaks.length,
			leaks.slice(0, 5),
		);

		if (leaks.length > 0) {
			console.error("\n[CRITICAL VULNERABILITY IN TREATMENT PLANS]:", leaks);
			assert.fail(
				`КРИТИЧЕСКИЙ БРАК: В планах лечения обнаружена утечка диагнозов для маркетолога:\n${leaks.join("\n")}`,
			);
		}
	});

	// =========================================================================
	// АТАКА 11: WEBSOCKET БРОКЕР — АУДИТ ТРАНСЛЯЦИИ ВРАЧЕБНОЙ ТАЙНЫ КЛИЕНТАМ
	// =========================================================================
	test("ATTACK 11: WebSocket Broker Broadcast — Auditing clinical secrecy in organization broadcast", async () => {
		// Создаем симуляцию подключенного сокета маркетолога
		const receivedMessages: string[] = [];
		const fakeWs = {
			readyState: 1,
			send(data: string) {
				receivedMessages.push(data);
			},
			on() {},
		} as unknown as import("ws").WebSocket;

		wsBroker.addClient(fakeWs, ORGANIZATION_ID);

		// Имитируем широковещательное событие с клиническими диагнозами
		const clinicalEvent = {
			type: "UPDATE_ODONTOGRAM",
			payload: {
				patientId: PATIENT_ID,
				states: [
					{
						toothNumber: 36,
						state: "caries",
						surfaces: ["MOD"],
						notes: "Острый пульпит K04.0",
					},
				],
			},
		};

		wsBroker.broadcastToOrganization(ORGANIZATION_ID, clinicalEvent);

		console.log(
			"\n[RED-TEAM AUDIT 11: WebSocket Broadcast Received Count]:",
			receivedMessages.length,
		);

		assert.strictEqual(
			receivedMessages.length,
			1,
			"WebSocket клиент должен получить широковещательное сообщение",
		);

		const firstMsg = receivedMessages[0];
		assert.ok(firstMsg, "Message must not be empty");
		const parsed = JSON.parse(firstMsg!);
		const leaks = detectLeaks(parsed);

		console.log(
			"[RED-TEAM AUDIT 11: WebSocket Broadcast Leaks count]:",
			leaks.length,
			leaks.slice(0, 5),
		);

		if (leaks.length > 0) {
			console.error(
				"\n[CRITICAL VULNERABILITY IN WEBSOCKET BROKER]: Клиническая тайна транслируется без фильтрации ролей!\n",
				leaks,
			);
			assert.fail(
				`КРИТИЧЕСКИЙ БРАК: WebSocket-брокер транслирует медицинскую тайну (диагнозы) неклиническим слушателям:\n${leaks.join("\n")}`,
			);
		}
	});
});
