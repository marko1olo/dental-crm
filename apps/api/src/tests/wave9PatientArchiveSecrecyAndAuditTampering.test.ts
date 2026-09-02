/**
 * RED-TEAM HAMMER INQUISITION: WAVE 9 — ARCHIVED PATIENT SECRECY & AUDIT LOG TAMPERING
 * PROSECUTOR 1: THE 152-FZ STRIPPER
 *
 * Attack targets:
 * 1. GET /api/patients/:patientId (Archived patient medical card extraction by non-clinical staff)
 * 2. GET /api/patients/:patientId/attachments (Archived patient files & radiological exams)
 * 3. GET /api/patients/:patientId/reclamations (Archived patient clinical complications & complaints)
 * 4. GET /api/diaries/visit/:visitId (Archived patient Form 043/у visit diary access)
 * 5. DELETE / PUT / PATCH /api/audit/* (HTTP audit log tampering attempts)
 * 6. Direct SQL DML Tampering on audit_events & clinical_audit_logs (PostgreSQL 18 immutability gate)
 *
 * Compliance invariants under attack:
 * - 152-ФЗ ст. 7, 10 (Защита специальных категорий ПДн, запрет нецелевой обработки архивных данных)
 * - 323-ФЗ ст. 13 (Врачебная тайна: доступ только лечащему врачу и консилиуму)
 * - ФСТЭК России Приказ № 21 (мера РСБ.7: защита сведений о событиях безопасности от уничтожения и модификации)
 * - Приказ Роскомнадзора № 179 от 28.10.2022 (неизменность электронных журналов аудита)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	appointments,
	attachments,
	auditEvents,
	clinicalAuditLogs,
	organizations,
	patientArchiveReasonsAndBlacklists,
	patientReclamations,
	patients,
	users,
	visitDiaries,
	visits,
} from "../db/schema.js";
import { registerAuditRoutes } from "../routes/audit.js";
import registerDiaryRoutes from "../routes/diary.js";
import { registerFilesRoutes } from "../routes/files.js";
import { registerPatientRoutes } from "../routes/patients.js";
import { authTokenSecret } from "../security/authSecret.js";
import { registerMedicalSecrecyPayloadStripping } from "../security/medicalSecrecyWarden.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "wave9ArchiveAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 2);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 3);
const INTERN_USER_ID = fixtureUuid(NAMESPACE, 4);

const ACTIVE_PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const ARCHIVED_PATIENT_ID = fixtureUuid(NAMESPACE, 11);
const ATTACHMENT_ID = fixtureUuid(NAMESPACE, 20);
const RECLAMATION_ID = fixtureUuid(NAMESPACE, 30);
const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 40);
const VISIT_ID = fixtureUuid(NAMESPACE, 50);
const DIARY_ID = fixtureUuid(NAMESPACE, 60);

describe("RED-TEAM HAMMER: WAVE 9 — Archived Patient Secrecy & Audit Log Tampering", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorToken: string;
	let marketerToken: string;
	let internToken: string;
	let databaseReady = true;

	before(async () => {
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);

		await registerPatientRoutes(app);
		await registerFilesRoutes(app);
		await registerDiaryRoutes(app);
		await registerAuditRoutes(app);

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		doctorToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				clinicalRole: "doctor",
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
		internToken = signToken(
			{
				organizationId: ORG_ID,
				userId: INTERN_USER_ID,
				role: "intern",
				clinicalRole: null,
				canSignMedicalRecords: false,
			},
			secret,
		);

		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				// Clean prior data if any
				await tx.delete(visitDiaries).where(eq(visitDiaries.organizationId, ORG_ID));
				await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
				await tx.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
				await tx.delete(attachments).where(eq(attachments.organizationId, ORG_ID));
				await tx.delete(patientReclamations).where(eq(patientReclamations.organizationId, ORG_ID));
				await tx.delete(patientArchiveReasonsAndBlacklists).where(eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID));
				await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));

				// Seed organization
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Безопасности Волна 9",
				}).onConflictDoNothing();

				// Seed users
				await tx.insert(users).values([
					{
						id: DOCTOR_USER_ID,
						organizationId: ORG_ID,
						email: "doctor.wave9@dente.pro",
						role: "doctor",
						fullName: "Д-р Айболит Клинический",
					},
					{
						id: MARKETER_USER_ID,
						organizationId: ORG_ID,
						email: "marketer.wave9@dente.pro",
						role: "marketer",
						fullName: "Спамер Маркетолог Рекламович",
					},
					{
						id: INTERN_USER_ID,
						organizationId: ORG_ID,
						email: "intern.wave9@dente.pro",
						role: "intern",
						fullName: "Стажер Ресепшенов Бездипломный",
					},
				]).onConflictDoNothing();

				// Seed active patient
				await tx.insert(patients).values({
					id: ACTIVE_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Живой Активный",
					phone: "+79991112233",
					status: "active",
					notes: "K02.1 Глубокий кариес дентина. Назначено терапевтическое лечение",
				});

				// Seed archived patient
				await tx.insert(patients).values({
					id: ARCHIVED_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Списанный В Архив",
					phone: "+79994445566",
					status: "archived",
					notes: "B20 ВИЧ-инфекция, K05.3 Хронический генерализованный пародонтит. Списан в архив в связи со сменой места жительства",
				});

				// Seed archive reason
				await tx.insert(patientArchiveReasonsAndBlacklists).values({
					organizationId: ORG_ID,
					patientId: ARCHIVED_PATIENT_ID,
					patientName: "Пациент Списанный В Архив",
					archiveReason: "Переезд в другой город, отказ от продолжения лечения",
					isBlacklisted: false,
					warningBadge: "📁 АРХИВ",
					archivedBy: DOCTOR_USER_ID,
				});

				// Seed attachment for archived patient
				await tx.insert(attachments).values({
					id: ATTACHMENT_ID,
					organizationId: ORG_ID,
					patientId: ARCHIVED_PATIENT_ID,
					fileName: "ct_scan_archived_patient_3d.dcm",
					mimeType: "application/dicom",
					storagePath: "mock/storage/path/ct_scan_archived_patient_3d.dcm",
					sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				});

				// Seed reclamation for archived patient
				await tx.insert(patientReclamations).values({
					id: RECLAMATION_ID,
					organizationId: ORG_ID,
					patientId: ARCHIVED_PATIENT_ID,
					doctorId: DOCTOR_USER_ID,
					complicationDetails: "Перфорация дна полости зуба при эндодонтическом лечении",
					proposedAction: "Закрытие перфорации ProRoot MTA и наблюдение",
					status: "resolved",
				});

				// Seed visit & Form 043/у diary for archived patient
				await tx.insert(visits).values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: ARCHIVED_PATIENT_ID,
					status: "signed",
					complaint: "Острая ноющая боль",
					objectiveStatus: "Зуб 36 глубокая кариозная полость",
					diagnosis: "K04.0 Острый пульпит",
					treatmentPlan: "Экстирпация пульпы, пломбирование каналов",
				});

				await tx.insert(visitDiaries).values({
					id: DIARY_ID,
					organizationId: ORG_ID,
					visitId: VISIT_ID,
					anamnesis: "Боли в течение трех дней",
					statusLocalis: "Полость зуба вскрыта, зондирование резко болезненно",
					diagnosisIcd10: "K04.0",
					treatmentDescription: "Депульпирование зуба 36",
				});
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				databaseReady = false;
				console.warn("[WAVE 9 WARN]: PostgreSQL 18 недоступен, тесты базы будут пропущены.");
			} else {
				throw err;
			}
		}
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {
				// Append-only tables cannot be fully deleted, ignored
			}
		}
	});

	// =========================================================================
	// АТАКА 1: МАРКЕТОЛОГ ПЫТАЕТСЯ ИЗВЛЕЧЬ МЕДКАРТУ АРХИВИРОВАННОГО ПАЦИЕНТА
	// =========================================================================
	test("ATTACK 1: Non-clinical marketer blocked from reading archived patient card", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Маркетолог читает АКТИВНОГО пациента -> 200 OK (с усечением диагнозов 152-ФЗ)
		const activeRes = await app.inject({
			method: "GET",
			url: `/api/patients/${ACTIVE_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});
		assert.equal(activeRes.statusCode, 200, "Активный пациент доступен маркетологу с усечением данных");
		const activeBody = JSON.parse(activeRes.body);
		assert.ok(
			activeBody.diagnosis === undefined || activeBody.diagnosis === null,
			"Диагноз активного пациента должен быть усечен для маркетолога",
		);

		// 2. Маркетолог читает АРХИВИРОВАННОГО пациента -> 403 Forbidden!
		const archivedRes = await app.inject({
			method: "GET",
			url: `/api/patients/${ARCHIVED_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 1: Archived Patient Card by Marketer]\nStatus:",
			archivedRes.statusCode,
			"\nPayload:",
			archivedRes.body,
		);

		assert.equal(
			archivedRes.statusCode,
			403,
			"Извлечение медицинской карты архивированного пациента неклиническим маркетологом должно блокироваться кодом 403",
		);
		const errPayload = JSON.parse(archivedRes.body);
		assert.equal(errPayload.error, "PermissionDenied");
		assert.equal(errPayload.permission, "patients.archived.read");

		// 3. Проверка: легитимный врач имеет доступ к архивному пациенту
		const doctorRes = await app.inject({
			method: "GET",
			url: `/api/patients/${ARCHIVED_PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});
		assert.equal(doctorRes.statusCode, 200, "Лечащий врач имеет законный доступ к архивной карте");
		console.log("✔ АТАКА 1 ОТБИТА: Маркетолог получил 403 Forbidden при попытке извлечь карту архивного пациента.");
	});

	// =========================================================================
	// АТАКА 2: СТАЖЕР / МАРКЕТОЛОГ ПЫТАЕТСЯ СКАЧАТЬ ВЛОЖЕНИЯ АРХИВНОГО ПАЦИЕНТА
	// =========================================================================
	test("ATTACK 2: Non-clinical staff blocked from retrieving archived patient attachments", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// 1. Стажер без клинической роли пытается получить список файлов
		const internRes = await app.inject({
			method: "GET",
			url: `/api/patients/${ARCHIVED_PATIENT_ID}/attachments`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": internToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 2: Archived Patient Attachments by Intern]\nStatus:",
			internRes.statusCode,
			"\nPayload:",
			internRes.body,
		);

		assert.equal(
			internRes.statusCode,
			403,
			"Доступ к вложениям архивированного пациента неклиническим стажером должен блокироваться с кодом 403",
		);
		const errPayload = JSON.parse(internRes.body);
		assert.equal(errPayload.error, "PermissionDenied");
		assert.equal(errPayload.permission, "patients.archived.attachments");

		// 2. Проверка: лечащий врач получает файлы
		const doctorRes = await app.inject({
			method: "GET",
			url: `/api/patients/${ARCHIVED_PATIENT_ID}/attachments`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});
		assert.equal(doctorRes.statusCode, 200);
		const doctorBody = JSON.parse(doctorRes.body);
		assert.equal(doctorBody.files.length, 1);
		console.log("✔ АТАКА 2 ОТБИТА: Неклинический персонал заблокирован (403) от доступа к рентген-снимкам архивного пациента.");
	});

	// =========================================================================
	// АТАКА 3: МАРКЕТОЛОГ ПЫТАЕТСЯ ИЗВЛЕЧЬ РЕКЛАМАЦИИ И ДЕФЕКТЫ ЛЕЧЕНИЯ
	// =========================================================================
	test("ATTACK 3: Non-clinical marketer blocked from reading archived patient reclamations", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${ARCHIVED_PATIENT_ID}/reclamations`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 3: Archived Patient Reclamations by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(
			res.statusCode,
			403,
			"Чтение рекламаций и осложнений архивированного пациента маркетологом должно блокироваться кодом 403",
		);
		const errPayload = JSON.parse(res.body);
		assert.equal(errPayload.error, "PermissionDenied");
		assert.equal(errPayload.permission, "patients.archived.reclamations");

		// Врач получает рекламации
		const doctorRes = await app.inject({
			method: "GET",
			url: `/api/patients/${ARCHIVED_PATIENT_ID}/reclamations`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});
		assert.equal(doctorRes.statusCode, 200);
		console.log("✔ АТАКА 3 ОТБИТА: Маркетолог получил 403 Forbidden при попытке извлечь рекламации и осложнения.");
	});

	// =========================================================================
	// АТАКА 4: НЕКЛИНИЧЕСКИЙ СОТРУДНИК ПЫТАЕТСЯ ОТКРЫТЬ ДНЕВНИК 043/У АРХИВНОГО ПРИЕМА
	// =========================================================================
	test("ATTACK 4: Non-clinical staff blocked from reading Form 043/у visit diary", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/visit/${VISIT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		console.log(
			"\n[RED-TEAM AUDIT 4: Form 043/у Visit Diary by Marketer]\nStatus:",
			res.statusCode,
			"\nPayload:",
			res.body,
		);

		assert.equal(
			res.statusCode,
			403,
			"Доступ к дневнику 043/у неклиническим персоналом должен блокироваться кодом 403",
		);
		const errPayload = JSON.parse(res.body);
		assert.equal(errPayload.error, "PermissionDenied");
		assert.equal(errPayload.permission, "clinical.diary.read");

		// Врач имеет доступ к дневнику 043/у
		const doctorRes = await app.inject({
			method: "GET",
			url: `/api/diaries/visit/${VISIT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});
		assert.equal(doctorRes.statusCode, 200);
		console.log("✔ АТАКА 4 ОТБИТА: Доступ к дневнику 043/у архивного приема аппаратно заблокирован кодом 403.");
	});

	// =========================================================================
	// АТАКА 5: ПОПЫТКА УДАЛЕНИЯ ИЛИ ПОДДЕЛКИ ЖУРНАЛОВ АУДИТА ЧЕРЕЗ HTTP API
	// =========================================================================
	test("ATTACK 5: HTTP API blocks all mutation and deletion attempts on audit logs", async (t) => {
		const mutationEndpoints = [
			{ method: "DELETE" as const, url: "/api/audit/logs" },
			{ method: "DELETE" as const, url: `/api/audit/logs/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "PUT" as const, url: `/api/audit/logs/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "PATCH" as const, url: `/api/audit/logs/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "DELETE" as const, url: "/api/audit/medical-access" },
			{ method: "DELETE" as const, url: `/api/audit/medical-access/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "PUT" as const, url: `/api/audit/medical-access/${fixtureUuid(NAMESPACE, 99)}` },
			{ method: "PATCH" as const, url: `/api/audit/medical-access/${fixtureUuid(NAMESPACE, 99)}` },
		];

		for (const target of mutationEndpoints) {
			const res = await app.inject({
				method: target.method,
				url: target.url,
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": doctorToken,
				},
				payload: { reason: "TAMPERED_BY_ATTACKER" },
			});

			console.log(`[RED-TEAM AUDIT 5: ${target.method} ${target.url}] Status:`, res.statusCode);
			assert.equal(
				res.statusCode,
				403,
				`Эндпоинт ${target.method} ${target.url} обязан вернуть 403 Forbidden (AuditLogImmutable)`,
			);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "AuditLogImmutable");
		}
		console.log("✔ АТАКА 5 ОТБИТА: Все 8 векторов модификации/удаления журналов аудита через HTTP заблокированы кодом 403.");
	});

	// =========================================================================
	// АТАКА 6: ПРЯМАЯ ПОПЫТКА DML-СТИРАНИЯ И ПОДДЕЛКИ В БАЗЕ ДАННЫХ (POSTGRESQL 18)
	// =========================================================================
	test("ATTACK 6: PostgreSQL 18 append-only gate strictly rejects DELETE and UPDATE on audit tables", async (t) => {
		if (!databaseReady) return t.skip("БД недоступна");

		// Вставляем проверочную запись в audit_events
		let insertedEventId: string;
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [insertedEvent] = await tx
				.insert(auditEvents)
				.values({
					organizationId: ORG_ID,
					actorUserId: DOCTOR_USER_ID,
					entityType: "patient",
					entityId: ARCHIVED_PATIENT_ID,
					action: "TEST_SECURITY_INTEGRITY",
					reason: "Original Untampered Audit Event",
				})
				.returning();
			assert.ok(insertedEvent?.id, "Событие аудита должно успешно записаться");
			insertedEventId = insertedEvent.id;
		});

		// Попытка 1: Прямой DELETE из audit_events
		await assert.rejects(
			async () => {
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx.execute(
						sql`DELETE FROM audit_events WHERE id = ${insertedEventId}::uuid`,
					);
				});
			},
			(err: any) => {
				const code = err.code || err.cause?.code;
				const message = err.message || "";
				console.log("\n[RED-TEAM AUDIT 6.1: Direct DELETE audit_events] Rejected with code:", code);
				// 42501 — insufficient privilege / trigger rejection
				return code === "42501" || message.includes("42501") || message.includes("AUDIT_APPEND_ONLY");
			},
			"PostgreSQL 18 обязан отвергнуть DELETE из audit_events кодом 42501!",
		);

		// Попытка 2: Прямой UPDATE reason в audit_events
		await assert.rejects(
			async () => {
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx.execute(
						sql`UPDATE audit_events SET reason = 'TAMPERED' WHERE id = ${insertedEventId}::uuid`,
					);
				});
			},
			(err: any) => {
				const code = err.code || err.cause?.code;
				const message = err.message || "";
				console.log("[RED-TEAM AUDIT 6.2: Direct UPDATE audit_events] Rejected with code:", code);
				return code === "42501" || message.includes("42501") || message.includes("AUDIT_APPEND_ONLY");
			},
			"PostgreSQL 18 обязан отвергнуть UPDATE audit_events кодом 42501!",
		);

		// Попытка 3: Вставка и проверка clinical_audit_logs
		let insertedClinicalId: string;
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [insertedClinical] = await tx
				.insert(clinicalAuditLogs)
				.values({
					organizationId: ORG_ID,
					userId: DOCTOR_USER_ID,
					patientId: ARCHIVED_PATIENT_ID,
					action: "VIEW_ARCHIVED_PATIENT_EMR",
					entityType: "emr_archive",
					entityId: ARCHIVED_PATIENT_ID,
				})
				.returning();
			assert.ok(insertedClinical?.id, "Событие clinical_audit_logs должно успешно записаться");
			insertedClinicalId = insertedClinical.id;
		});

		// Попытка 4: Прямой DELETE из clinical_audit_logs
		await assert.rejects(
			async () => {
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx.execute(
						sql`DELETE FROM clinical_audit_logs WHERE id = ${insertedClinicalId}::uuid`,
					);
				});
			},
			(err: any) => {
				const code = err.code || err.cause?.code;
				const message = err.message || "";
				console.log("[RED-TEAM AUDIT 6.3: Direct DELETE clinical_audit_logs] Rejected with code:", code);
				return code === "42501" || message.includes("42501") || message.includes("AUDIT_APPEND_ONLY");
			},
			"PostgreSQL 18 обязан отвергнуть DELETE из clinical_audit_logs кодом 42501!",
		);

		// Попытка 5: Прямой UPDATE action в clinical_audit_logs
		await assert.rejects(
			async () => {
				await withFixtureTenant(ORG_ID, async (tx) => {
					await tx.execute(
						sql`UPDATE clinical_audit_logs SET action = 'ALTERED_ACTION' WHERE id = ${insertedClinicalId}::uuid`,
					);
				});
			},
			(err: any) => {
				const code = err.code || err.cause?.code;
				const message = err.message || "";
				console.log("[RED-TEAM AUDIT 6.4: Direct UPDATE clinical_audit_logs] Rejected with code:", code);
				return code === "42501" || message.includes("42501") || message.includes("AUDIT_APPEND_ONLY");
			},
			"PostgreSQL 18 обязан отвергнуть UPDATE action в clinical_audit_logs кодом 42501!",
		);

		console.log("✔ АТАКА 6 ОТБИТА: Ядро PostgreSQL 18 гарантирует неизменность (append-only) журналов на аппаратном уровне СУБД (код 42501).");
	});
});
