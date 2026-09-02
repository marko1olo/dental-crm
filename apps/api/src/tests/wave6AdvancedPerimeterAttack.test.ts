/**
 * RED-TEAM HAMMER INQUISITION: WAVE 6 — ADVANCED CLINICAL PERIMETER ATTACK
 * PROSECUTOR 1: THE 152-FZ STRIPPER
 *
 * Hostile Penetration Testing targeting:
 * 1. Endodontic canal charts & tooth status:
 *    - GET /api/patients/:patientId/tooth-states/:toothNumber/endo
 *    - POST /api/patients/:patientId/tooth-states/:toothNumber/endo
 * 2. Medical Record / EMR Export (CDA R2 / EGISZ):
 *    - GET /api/egisz/visits/:visitId/cda
 * 3. Clinical Protocol Templates:
 *    - GET /api/templates
 * 4. Chief Physician Quality Audit:
 *    - GET /api/diaries/:id/chief-reviews
 *
 * Targets & Personas:
 * - Marketer (token with role: "marketer")
 * - Receptionist (token with role: "receptionist")
 * - Anonymous client (bare x-dente-clinic-token without staff token)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { patientAdministrativeProfileSchema } from "@dental/shared";
import { db } from "../db/client.js";
import {
	egiszLogs,
	organizations,
	patients,
	toothStates,
	users,
	visitDiaries,
	visits,
	visitTemplates,
} from "../db/schema.js";
import registerDiaryRoutes from "../routes/diary.js";
import registerEgiszRoutes from "../routes/egisz.js";
import { registerOdontogramRoutes } from "../routes/odontogram.js";
import { registerPatientRoutes } from "../routes/patients.js";
import registerTemplateRoutes from "../routes/templates.js";
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

const NAMESPACE = "wave6Attack";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 2);
const RECEPTIONIST_USER_ID = fixtureUuid(NAMESPACE, 3);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 4);
const PATIENT_ID = fixtureUuid(NAMESPACE, 5);
const VISIT_ID = fixtureUuid(NAMESPACE, 6);
const DIARY_ID = fixtureUuid(NAMESPACE, 7);
const TOOTH_STATE_ID = fixtureUuid(NAMESPACE, 8);
const TEMPLATE_ID = fixtureUuid(NAMESPACE, 9);

describe("RED-TEAM HAMMER: WAVE 6 — Clinical Protocol & Endodontic Perimeter Attack", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let marketerStaffToken = "";
	let receptionistStaffToken = "";
	let doctorStaffToken = "";
	let databaseReady = true;

	const CLINICAL_DIAGNOSTIC_TERMS = [
		/K0[0-9]\.\d+/i,
		/пульпит/i,
		/кариес/i,
		/периодонтит/i,
		/пародонтит/i,
		/экстирпаци/i,
		/препарировани/i,
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
		process.env.EGISZ_CLINIC_OID = "1.2.643.5.1.13.13.12.2.77.9999";
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
					name: "Клиника Аудита Периметра Wave 6",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values([
					{
						id: MARKETER_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Маркетолог Взломщик Периметра",
						role: "marketer",
						isActive: true,
					},
					{
						id: RECEPTIONIST_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Регистратор Ресепшена",
						role: "receptionist",
						isActive: true,
					},
					{
						id: DOCTOR_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Врач Эндодонтист-Хирург",
						role: "doctor",
						isActive: true,
					},
				])
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Пациент Эндодонтический 152-ФЗ",
					phone: "+79997776655",
					birthDate: "1988-03-20",
					administrativeProfile: patientAdministrativeProfileSchema.parse({
						snils: "112-233-445 95",
					}),
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					status: "signed",
					diagnosis: "Острый пульпит K04.0 зуба 36",
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
					lockedByUserId: DOCTOR_USER_ID,
					diagnosisIcd10: "K04.0",
					diagnosisTooth: "36",
					anamnesis: "Ранее лечен по поводу глубокого кариеса",
					statusLocalis: "Глубокая кариозная полость на жевательной поверхности зуба 36",
					treatmentDescription: "Витальная экстирпация пульпы, пломбирование каналов",
					isLocked: true,
				})
				.onConflictDoNothing();

			const endoClinicalNotes = JSON.stringify({
				canals: [
					{ name: "МВ", lengthMm: 21.5, masterCone: "25/.04", sealer: "AH Plus" },
					{ name: "МЯ", lengthMm: 21.0, masterCone: "25/.04", sealer: "AH Plus" },
					{ name: "Д", lengthMm: 22.0, masterCone: "30/.04", sealer: "AH Plus" },
				],
				diagnosis: "Пульпит K04.0",
				irrigation: "Гипохлорит натрия 3% + ЭДТА 17%",
				radiologyControl: "Верхушечный периодонтит не обнаружен",
			});

			await db
				.insert(toothStates)
				.values({
					id: TOOTH_STATE_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					toothNumber: 36,
					state: "caries",
					surfaces: ["MOD"],
					notes: endoClinicalNotes,
				})
				.onConflictDoNothing();

			await db
				.insert(visitTemplates)
				.values({
					id: TEMPLATE_ID,
					organizationId: ORGANIZATION_ID,
					title: "Эндодонтическое лечение пульпита (K04.0)",
					category: "Терапия",
					specialty: "Терапевт-эндодонтист",
					prefilledAnamnesis: "Боли самопроизвольного характера, усиливающиеся ночью",
					prefilledObjective: "Зондирование дна полости резко болезненно в одной точке",
					prefilledTreatment: "Анестезия, коффердам, механическая и медикаментозная обработка каналов",
					defaultIcd10: "K04.0",
					defaultIcd10Label: "Острый пульпит",
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
				fullName: "Маркетолог Взломщик М.В.",
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
		doctorStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				fullName: "Врач Стоматолог В.С.",
			},
			secret,
		);

		app = createTenantTestApp();
		registerRouteNotFoundHandler(app);
		registerMedicalSecrecyPayloadStripping(app);
		await registerPatientRoutes(app);
		await registerOdontogramRoutes(app);
		await registerDiaryRoutes(app);
		await registerTemplateRoutes(app);
		await registerEgiszRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	// =========================================================================
	// АТАКА 1: ЭНДОДОНТИЯ ЗУБА — GET /api/patients/:patientId/tooth-states/:toothNumber/endo ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 1: Endodontic Secrecy — Marketer querying GET /api/patients/:patientId/tooth-states/36/endo", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/tooth-states/36/endo`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: GET /api/.../tooth-states/36/endo under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Эндодонтия успешно заблокирована для маркетолога (403 Forbidden)");
			return;
		}

		if (res.statusCode === 200) {
			const body = JSON.parse(res.payload);
			const leaks = detectLeaks(body);
			console.log("[RED-TEAM AUDIT 1: Endo Leaks count]:", leaks.length, leaks.slice(0, 5));

			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN ENDO TOOTH STATE]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Маркетолог получил доступ к эндодонтической карте корневых каналов зуба и диагнозам (HTTP 200 OK)!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 2: АНОНИМНЫЙ ДОСТУП К ЭНДОДОНТИИ (ТОЛЬКО ТОКЕН КЛИНИКИ БЕЗ СОТРУДНИКА)
	// =========================================================================
	test("ATTACK 2: Anonymous Endo Bypass — Querying tooth endo without staff token", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/tooth-states/36/endo`,
			headers: {
				"x-dente-clinic-token": clinicToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: Bare Clinic Token to tooth endo]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Анонимный доступ отбит fail-closed (403)");
			return;
		}

		if (res.statusCode === 200) {
			console.error("\n[CRITICAL VULNERABILITY]: Анонимный клиент без токена сотрудника прочитал эндодонтию!");
			assert.fail(
				"КРИТИЧЕСКИЙ БРАК: Запрос без токена сотрудника получил эндодонтическую карту зуба пациента!",
			);
		}
	});

	// =========================================================================
	// АТАКА 3: МОДИФИКАЦИЯ ЭНДОДОНТИИ МАРКЕТОЛОГОМ — POST /api/patients/:patientId/tooth-states/:toothNumber/endo
	// =========================================================================
	test("ATTACK 3: Hostile Endo Tampering — Marketer attempting to overwrite endo canals", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/tooth-states/36/endo`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
			payload: {
				canals: [
					{ canalName: "МВ_ВЗЛОМ", workingLengthMm: 99.9, sealer: "Spoofed" },
				],
				irrigation: "Взлом периметра маркетологом",
				radiologyControl: "Фальсификация",
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3: POST tooth endo under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Перезапись эндодонтии маркетологом заблокирована (403)");
			return;
		}

		if (res.statusCode === 200 || res.statusCode === 201) {
			console.error("\n[CRITICAL VULNERABILITY]: Немедицинский маркетолог перезаписал клинические каналы зуба!");
			assert.fail(
				`КРИТИЧЕСКИЙ БРАК: Маркетолог смог изменить клинические данные корневых каналов зуба (HTTP ${res.statusCode})! Доступ на запись обязан быть закрыт для неклинических ролей!`,
			);
		}
	});

	// =========================================================================
	// АТАКА 4: ВЫГРУЗКА СЭМД CDA R2 — GET /api/egisz/visits/:visitId/cda ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 4: CDA R2 Medical Record Export — Marketer requesting CDA XML", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/egisz/visits/${VISIT_ID}/cda`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4: GET /api/egisz/visits/:visitId/cda under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload snippet:",
			res.payload.slice(0, 300),
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Выгрузка СЭМД CDA заблокирована для маркетолога (403)");
			return;
		}

		if (res.statusCode === 200) {
			const leaks = detectLeaks(res.payload);
			console.log("[RED-TEAM AUDIT 4: CDA Leaks count]:", leaks.length, leaks.slice(0, 5));

			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN CDA EXPORT]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Маркетолог получил доступ к медицинской карте СЭМД CDA R2 с диагнозами!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 5: ШАБЛОНЫ КЛИНИЧЕСКИХ ПРОТОКОЛОВ — GET /api/templates ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 5: Clinical Protocol Templates — Marketer querying GET /api/templates", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/templates`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5: GET /api/templates under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload snippet:",
			res.payload.slice(0, 300),
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Шаблоны клинических протоколов заблокированы (403)");
			return;
		}

		if (res.statusCode === 200) {
			const body = JSON.parse(res.payload);
			const leaks = detectLeaks(body);
			console.log("[RED-TEAM AUDIT 5: Templates Leaks count]:", leaks.length, leaks.slice(0, 5));

			// Проверяем, не утекли ли диагнозы в шаблонах
			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN CLINICAL TEMPLATES]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Маркетолог получил доступ к клиническим протоколам с предзаполненными диагнозами и анамнезом!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 6: ЭКСПЕРТИЗА КАЧЕСТВА ГЛАВВРАЧА — GET /api/diaries/:id/chief-reviews ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 6: Chief Physician Quality Reviews — Marketer querying chief-reviews", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/${DIARY_ID}/chief-reviews`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 6: GET /api/diaries/:id/chief-reviews under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.payload,
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Экспертиза качества заблокирована для неклинического персонала (403)");
			return;
		}

		if (res.statusCode === 200) {
			console.error("\n[CRITICAL VULNERABILITY]: Немедицинский маркетолог получил доступ к протоколам экспертизы качества лечения главврача!");
			assert.fail(
				"КРИТИЧЕСКИЙ БРАК: Экспертиза качества медпомощи доступна маркетологу (HTTP 200 OK)!",
			);
		}
	});
});
