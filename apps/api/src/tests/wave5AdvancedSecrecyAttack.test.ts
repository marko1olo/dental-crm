/**
 * RED-TEAM HAMMER INQUISITION: WAVE 5 — ADVANCED SECRECY INFILTRATION
 * PROSECUTOR 1: THE 152-FZ STRIPPER
 *
 * Hostile Penetration Testing targeting Document Printing/Export & Radiological Imaging:
 * (152-FZ "On Personal Data", 323-FZ Art. 13 "Medical Secrecy")
 *
 * Attack Targets:
 * 1. Document Printing & Export Lifecycle:
 *    - GET /api/documents/:id/html (Form 043/u, IDS, Treatment Plan)
 *    - GET /api/documents/:id/pdf
 *    - Cross-role probing: marketer & call-center / receptionist vs doctor.
 * 2. Radiological Imaging & AI Visio Scans:
 *    - GET /api/xray/scans?patientId=... (aiReport, aiToothStates, notes)
 *    - GET /api/xray/scans/:id (imageDataUri raw radiograph, aiReport)
 *    - GET /api/imaging/studies?patientId=... (DICOM / CT series)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { writeIssuedDocumentSnapshot } from "../db/documentQuery.js";
import {
	generatedDocuments,
	imagingStudies,
	organizations,
	patients,
	users,
	visits,
	xrayScans,
} from "../db/schema.js";
import { registerDocumentRoutes } from "../routes/documents.js";
import { registerImagingRoutes } from "../routes/imaging.js";
import { registerPatientRoutes } from "../routes/patients.js";
import { registerXrayRoutes } from "../routes/xray.js";
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

const NAMESPACE = "wave5Attack";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 2);
const CALL_CENTER_USER_ID = fixtureUuid(NAMESPACE, 3);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 4);
const PATIENT_ID = fixtureUuid(NAMESPACE, 5);
const VISIT_ID = fixtureUuid(NAMESPACE, 6);
const DOC_043U_ID = fixtureUuid(NAMESPACE, 7);
const DOC_CONSENT_ID = fixtureUuid(NAMESPACE, 8);
const XRAY_SCAN_ID = fixtureUuid(NAMESPACE, 9);
const IMAGING_STUDY_ID = fixtureUuid(NAMESPACE, 10);

describe("RED-TEAM HAMMER: WAVE 5 — Document Printing & Radiological Secrecy Infiltration", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let marketerStaffToken = "";
	let callCenterStaffToken = "";
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
		/043[\/-]?[уu]/i,
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
				const lowerKey = key.toLowerCase();
				if (
					lowerKey === "aireport" ||
					lowerKey === "aisummary" ||
					lowerKey === "aitoothstates" ||
					lowerKey === "imagedatauri"
				) {
					leaks.push(`[FORBIDDEN_RADIOLOGY_KEY] ${path} = ${JSON.stringify(value).slice(0, 100)}`);
				}
				leaks.push(...detectLeaks(value, path));
			}
		}

		return leaks;
	}

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				databaseReady = false;
				return;
			}
			throw error;
		}

		const htmlCard043 = `
			<!DOCTYPE html>
			<html>
			<head><title>Медицинская карта стоматологического больного 043/у</title></head>
			<body>
				<h1>МЕДИЦИНСКАЯ КАРТА № 043/у</h1>
				<p>Пациент: Тестовый Пациент Пентеста</p>
				<p>Клинический диагноз: Острый очаговый пульпит K04.0, глубокий кариес зуба 36</p>
				<p>Жалобы: Самопроизвольные приступообразные боли, усиливающиеся ночью</p>
				<p>План лечения: Витальная экстирпация пульпы, пломбирование каналов</p>
			</body>
			</html>
		`.trim();

		const snapshotInfo = writeIssuedDocumentSnapshot(DOC_043U_ID, htmlCard043);

		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORGANIZATION_ID,
					name: "Клиника Аудита Документов и Рентгена",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values([
					{
						id: MARKETER_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Маркетолог Взломщик Документов",
						role: "marketer",
						isActive: true,
					},
					{
						id: CALL_CENTER_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Оператор Колл-Центра Регистратуры",
						role: "receptionist",
						isActive: true,
					},
					{
						id: DOCTOR_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Врач Рентгенолог-Стоматолог",
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
					fullName: "Пациент Секретный 152-ФЗ",
					phone: "+79998887766",
					birthDate: "1990-05-15",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					status: "signed",
					diagnosis: "Пульпит K04.0",
				})
				.onConflictDoNothing();

			// 1. Выданная медицинская карта 043/у со слепком на диске
			await db
				.insert(generatedDocuments)
				.values({
					id: DOC_043U_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					kind: "dental_medical_card_043u",
					status: "issued",
					title: "Медицинская карта 043/у",
					storagePath: snapshotInfo.snapshotPath,
					issuedSnapshotSha256: snapshotInfo.sha256,
					issuedSnapshotCreatedAt: new Date(),
					issuedAt: new Date(),
					issuedByUserId: DOCTOR_USER_ID,
					payloadJson: JSON.stringify({
						diagnosis: "Острый очаговый пульпит K04.0",
						mkb10: "K04.0",
						toothNumber: 36,
						notes: "Глубокая кариозная полость MOD",
					}),
				})
				.onConflictDoNothing();

			// 2. Черновик информированного согласия на операцию
			await db
				.insert(generatedDocuments)
				.values({
					id: DOC_CONSENT_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					kind: "informed_consent",
					status: "draft",
					title: "Информированное добровольное согласие на эндодонтическое лечение",
					payloadJson: JSON.stringify({
						diagnosis: "Хронический пульпит зуба 36",
						complaints: "Боли от температурных раздражителей",
					}),
				})
				.onConflictDoNothing();

			// 3. Рентгеновский визиограф с AI-заключением и сырым снимком
			await db
				.insert(xrayScans)
				.values({
					id: XRAY_SCAN_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					kind: "periapical",
					toothCode: "36",
					status: "done",
					imageDataUri: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
					aiReport: "Прицельный снимок зуба 36: определяется деструкция костной ткани у верхушки мезиального корня. Диагноз: Хронический гранулирующий периодонтит K04.5, осложненный кариес.",
					aiSummary: "Периодонтит K04.5 зуба 36",
					aiToothStates: { "36": "periodontitis_apical" },
					notes: "Клинически: перкуссия болезненна, свищевой ход",
				})
				.onConflictDoNothing();

			// 4. КТ/DICOM исследование челюстей с AI-заключением
			await db
				.insert(imagingStudies)
				.values({
					id: IMAGING_STUDY_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					kind: "cbct",
					title: "КЛКТ челюстей: диагностика пульпита и периодонтита",
					toothCode: "36",
					region: "Моляр нижней челюсти слева",
					capturedAt: new Date(),
					sourceKind: "manual_upload",
					sourceName: "Planmeca ProMax 3D",
					status: "available",
					aiSummary: "Обнаружена кистогранулема и верхушечный периодонтит зуба 36",
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
		callCenterStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: CALL_CENTER_USER_ID,
				role: "receptionist",
				fullName: "Оператор Колл-Центра О.К.",
			},
			secret,
		);
		doctorStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				fullName: "Врач Стоматолог-Рентгенолог В.С.",
			},
			secret,
		);

		app = createTenantTestApp();
		registerRouteNotFoundHandler(app);
		registerMedicalSecrecyPayloadStripping(app);
		await registerPatientRoutes(app);
		await registerDocumentRoutes(app);
		await registerXrayRoutes(app);
		await registerImagingRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	// =========================================================================
	// АТАКА 1: ЭКСПОРТ HTML КАРТЫ 043/У — GET /api/documents/:id/html ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 1: Document HTML Leakage — Marketer requesting Form 043/u HTML", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/documents/${DOC_043U_ID}/html`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: GET /api/documents/:id/html under Marketer]\nStatus:",
			res.statusCode,
			"\nHeaders:",
			res.headers["content-type"],
		);

		// Если вернулся 403 Forbidden — атака отбита
		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Успешно заблокировано RBAC (403 Forbidden)");
			return;
		}

		// Если вернулся 200 OK — проверяем, утекли ли диагнозы в HTML
		console.log("\nPayload snippet:", res.payload.slice(0, 300));
		const leaks = detectLeaks(res.payload);
		console.log("[RED-TEAM AUDIT 1: HTML Leaks count]:", leaks.length, leaks.slice(0, 5));

		if (res.statusCode === 200) {
			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN DOCUMENT HTML]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Маркетолог получил доступ к медицинской карте 043/у (HTML) с диагнозами!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 2: ЭКСПОРТ PDF КАРТЫ 043/У — GET /api/documents/:id/pdf ПОД ОПЕРАТОРОМ
	// =========================================================================
	test("ATTACK 2: Document PDF Leakage — Call-Center Operator requesting Form 043/u PDF", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/documents/${DOC_043U_ID}/pdf`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": callCenterStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: GET /api/documents/:id/pdf under Call-Center Operator]\nStatus:",
			res.statusCode,
			"\nContent-Type:",
			res.headers["content-type"],
		);

		// Если вернулся 403 Forbidden — доступ закрыт
		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ PDF успешно заблокирован для неклинического персонала (403)");
			return;
		}

		// Если вернулся 200 OK — это критическая утечка PDF
		if (res.statusCode === 200) {
			console.error("\n[CRITICAL VULNERABILITY IN DOCUMENT PDF]: Сервер отдал PDF с медицинской тайной оператору колл-центра!");
			assert.fail(
				`КРИТИЧЕСКИЙ БРАК: Оператор колл-центра получил PDF медицинской карты 043/у (HTTP 200 OK)! Доступ обязан блокироваться 403 Forbidden!`,
			);
		}
	});

	// =========================================================================
	// АТАКА 3: ЧЕРНОВИК ИДС — GET /api/documents/:id/html ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 3: Consent HTML Draft — Marketer requesting draft Informed Consent", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/documents/${DOC_CONSENT_ID}/html`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3: GET /api/documents/:id/html (Consent) under Marketer]\nStatus:",
			res.statusCode,
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Доступ к ИДС заблокирован (403)");
			return;
		}

		if (res.statusCode === 200) {
			const leaks = detectLeaks(res.payload);
			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN CONSENT DRAFT]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Маркетолог получил доступ к информированному согласию с диагнозом!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 4: РЕНТГЕНОВСКИЕ СНИМКИ — GET /api/xray/scans?patientId=... ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 4: X-Ray Scans List — Marketer querying GET /api/xray/scans", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/xray/scans?patientId=${PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4: GET /api/xray/scans under Marketer]\nStatus:",
			res.statusCode,
			"\nPayload snippet:",
			res.payload.slice(0, 300),
		);

		// Если доступ заблокирован 403 Forbidden — атака отбита
		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Рентген-снимки заблокированы для маркетолога (403)");
			return;
		}

		// Если вернулся 200 OK — проверяем утечку aiReport и зубов
		if (res.statusCode === 200) {
			const body = JSON.parse(res.payload);
			const leaks = detectLeaks(body);
			console.log("[RED-TEAM AUDIT 4: X-Ray Leaks count]:", leaks.length, leaks.slice(0, 5));

			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN X-RAY SCANS]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Маркетолог получил список рентген-снимков с AI-заключением и диагнозами патологий!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 5: СЫРОЙ РЕНТГЕНОВСКИЙ СНИМОК — GET /api/xray/scans/:id ПОД ОПЕРАТОРОМ
	// =========================================================================
	test("ATTACK 5: X-Ray Raw Scan Detail — Call-Center Operator querying GET /api/xray/scans/:id", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/xray/scans/${XRAY_SCAN_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": callCenterStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 5: GET /api/xray/scans/:id under Call-Center Operator]\nStatus:",
			res.statusCode,
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Сырой рентген-снимок заблокирован для оператора (403)");
			return;
		}

		if (res.statusCode === 200) {
			const body = JSON.parse(res.payload);
			const leaks = detectLeaks(body);
			console.log("[RED-TEAM AUDIT 5: Raw X-Ray Leaks count]:", leaks.length, leaks.slice(0, 5));

			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN RAW X-RAY SCAN]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Оператор колл-центра получил сырой медицинский снимок зубов с патологиями!\n${leaks.join("\n")}`,
				);
			}
		}
	});

	// =========================================================================
	// АТАКА 6: DICOM / ИССЛЕДОВАНИЯ — GET /api/imaging/studies ПОД МАРКЕТОЛОГОМ
	// =========================================================================
	test("ATTACK 6: Imaging Studies Reconnaissance — Marketer querying GET /api/imaging/studies", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/imaging/studies?patientId=${PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 6: GET /api/imaging/studies under Marketer]\nStatus:",
			res.statusCode,
		);

		if (res.statusCode === 403 || res.statusCode === 401) {
			console.log("✔ Исследования КТ/DICOM заблокированы для маркетолога (403)");
			return;
		}

		if (res.statusCode === 200) {
			const body = JSON.parse(res.payload);
			const leaks = detectLeaks(body);
			console.log("[RED-TEAM AUDIT 6: Imaging Leaks count]:", leaks.length);

			if (leaks.length > 0) {
				console.error("\n[CRITICAL VULNERABILITY IN IMAGING STUDIES]:", leaks);
				assert.fail(
					`КРИТИЧЕСКИЙ БРАК: Маркетолог получил данные исследований КТ/DICOM с медицинскими записями!\n${leaks.join("\n")}`,
				);
			}
		}
	});
});
