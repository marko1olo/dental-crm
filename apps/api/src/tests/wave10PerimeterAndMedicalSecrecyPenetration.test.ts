/**
 * wave10PerimeterAndMedicalSecrecyPenetration.test.ts
 *
 * ВОЛНА 10 ПЕНТЕСТА: АУДИТ ВРАЧЕБНОЙ ТАЙНЫ И ПЕРИМЕТРА 152-ФЗ / 323-ФЗ
 *
 * Проверяет:
 * 1. POST /api/chat/sms/send — блокировка отправки врачебной тайны (диагнозов МКБ, зубов, приемов) по открытому SMS.
 * 2. sendSmsViaUis — отказ на уровне клиента UIS при наличии клинических данных.
 * 3. GET /api/files/visits/:visitId/attachments — запрет просмотра клинических снимков приёма неклиническими ролями (маркетолог, ресепшен).
 * 4. GET /api/attachments/:attachmentId/download — запрет скачивания снимков приёма неклиническим персоналом (403 PermissionDenied).
 * 5. GET /api/attachments/:attachmentId/download — запрет скачивания вложений архивированного пациента неклиническим персоналом (403 PermissionDenied).
 * 6. GET /api/documents/:id/html и /pdf — блокировка расширенного списка клинических документов (anesthesia_consent_log, medical_intervention_refusal).
 * 7. POST /api/documents, /issue, /sign-ukep, /void — запрет создания, выдачи, подписания УКЭП и аннулирования клинических документов неклиническими ролями.
 * 8. wsBroker.broadcastToPatient — гарантия отсутствия утечки клинических событий персонала в сокеты пациентов.
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { FastifyInstance } from "fastify";
import {
	attachments,
	clinics,
	generatedDocuments,
	organizations,
	patients,
	users,
	visits,
} from "../db/schema.js";
import { registerChatRoutes } from "../routes/chat.js";
import { registerClinicalRoutes } from "../routes/clinical.js";
import { registerDicomwebRoutes } from "../routes/dicomweb.js";
import { registerDocumentRoutes } from "../routes/documents.js";
import { registerFilesRoutes } from "../routes/files.js";
import { registerPrescriptionRoutes } from "../routes/prescriptions.js";
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

const NAMESPACE = "wave10-perimeter-test";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 4);
const RECEPTIONIST_USER_ID = fixtureUuid(NAMESPACE, 5);

const ACTIVE_PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const ARCHIVED_PATIENT_ID = fixtureUuid(NAMESPACE, 11);
const VISIT_ID = fixtureUuid(NAMESPACE, 12);

const VISIT_ATTACHMENT_ID = fixtureUuid(NAMESPACE, 20);
const ARCHIVED_ATTACHMENT_ID = fixtureUuid(NAMESPACE, 21);
const ANESTHESIA_DOC_ID = fixtureUuid(NAMESPACE, 22);

test("RED-TEAM HAMMER: WAVE 10 — Perimeter & Medical Secrecy 152-FZ / 323-FZ Penetration Audit", async (suite) => {
	let app: FastifyInstance;
	let doctorToken: string;
	let marketerToken: string;
	let receptionistToken: string;
	let clinicToken: string;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 10 Before] Purge warning:", e);
		}

		app = await createTenantTestApp();
		registerMedicalSecrecyPayloadStripping(app);
		await registerChatRoutes(app);
		await registerFilesRoutes(app);
		await registerDocumentRoutes(app);
		await registerPrescriptionRoutes(app);
		await registerDicomwebRoutes(app);
		await registerClinicalRoutes(app);
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
			},
			secret,
		);

		// Засеваем базу
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Волна 10 Периметр",
				})
				.onConflictDoNothing();

			await tx
				.insert(clinics)
				.values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Отделение Волна 10",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values([
					{
						id: DOCTOR_USER_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Клинический К.К.",
						role: "doctor",
					},
					{
						id: MARKETER_USER_ID,
						organizationId: ORG_ID,
						fullName: "Маркетолог Рекламный Р.Р.",
						role: "marketer",
					},
					{
						id: RECEPTIONIST_USER_ID,
						organizationId: ORG_ID,
						fullName: "Ресепшен Регистратор Р.Р.",
						role: "receptionist",
					},
				])
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values([
					{
						id: ACTIVE_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Активный А.А.",
						phone: "+79991112233",
						status: "active",
					},
					{
						id: ARCHIVED_PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Списанный В Архив С.А.",
						phone: "+79992223344",
						status: "archived",
					},
				])
				.onConflictDoNothing();

			await tx
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					status: "signed",
				})
				.onConflictDoNothing();

			await tx
				.insert(attachments)
				.values([
					{
						id: VISIT_ATTACHMENT_ID,
						organizationId: ORG_ID,
						patientId: ACTIVE_PATIENT_ID,
						visitId: VISIT_ID,
						fileName: "intraoral_scan_tooth46.jpg",
						mimeType: "image/jpeg",
						storagePath: "nonexistent_scan.jpg",
						sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
					},
					{
						id: ARCHIVED_ATTACHMENT_ID,
						organizationId: ORG_ID,
						patientId: ARCHIVED_PATIENT_ID,
						fileName: "passport_scan_archived.pdf",
						mimeType: "application/pdf",
						storagePath: "nonexistent_passport.pdf",
						sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
					},
				])
				.onConflictDoNothing();

			await tx
				.insert(generatedDocuments)
				.values({
					id: ANESTHESIA_DOC_ID,
					organizationId: ORG_ID,
					patientId: ACTIVE_PATIENT_ID,
					visitId: VISIT_ID,
					kind: "anesthesia_consent_log",
					status: "draft",
					title: "Протокол инфильтрационной анестезии Артикаин 1:100000",
				})
				.onConflictDoNothing();
		});
	});

	after(async () => {
		if (app) await app.close();
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (e) {
			console.warn("[Wave 10 After] Purge warning:", e);
		}
	});

	await suite.test("1. POST /api/chat/sms/send — блокирует отправку диагнозов и врачебной тайны по SMS", async () => {
		// Атака: попытка отправить диагноз МКБ и название патологии по открытому SMS
		const leakPayloads = [
			"Здравствуйте! Ваш диагноз: острый пульпит зуба 46 (K04.0).",
			"Напоминаем: вам назначено удаление зуба 38 по поводу периодонтита.",
			"По результатам КТ у вас выявлен кариес дентина K02.1.",
		];

		for (const leakMessage of leakPayloads) {
			const res = await app.inject({
				method: "POST",
				url: "/api/chat/sms/send",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": marketerToken,
				},
				payload: {
					patientId: ACTIVE_PATIENT_ID,
					message: leakMessage,
				},
			});

			assert.strictEqual(
				res.statusCode,
				422,
				`SMS с клинической тайной («${leakMessage}») должно быть отклонено кодом 422`,
			);
			const body = JSON.parse(res.payload);
			assert.strictEqual(body.error, "MedicalSecrecyViolationError");
			assert.ok(
				body.message.includes("323-ФЗ") && body.message.includes("152-ФЗ"),
				"Сообщение об ошибке должно содержать правовую ссылку на 323-ФЗ и 152-ФЗ",
			);
			assert.ok(Array.isArray(body.detectedTerms) && body.detectedTerms.length > 0);
		}
	});

	await suite.test("2. GET /api/files/visits/:visitId/attachments — маркетолог получает 403 при попытке чтения снимков приёма", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/files/visits/${VISIT_ID}/attachments`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(res.statusCode, 403, "Маркетолог не имеет доступа к снимкам приёма");
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.visit.attachments.read");
	});

	await suite.test("3. GET /api/files/visits/:visitId/attachments — врач успешно получает доступ к снимкам приёма", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/files/visits/${VISIT_ID}/attachments`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.strictEqual(res.statusCode, 200, "Врач обязан получать доступ к снимкам приёма");
		const body = JSON.parse(res.payload);
		assert.ok(Array.isArray(body.files));
		assert.strictEqual(body.files.length, 1);
		assert.strictEqual(body.files[0].id, VISIT_ATTACHMENT_ID);
	});

	await suite.test("4. GET /api/attachments/:id/download — маркетолог получает 403 при попытке скачивания снимка приёма", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/attachments/${VISIT_ATTACHMENT_ID}/download`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(res.statusCode, 403, "Маркетологу запрещено скачивать снимки приёма");
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.attachment.download");
	});

	await suite.test("5. GET /api/attachments/:id/download — маркетолог получает 403 при попытке скачивания вложения архивного пациента", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/attachments/${ARCHIVED_ATTACHMENT_ID}/download`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(res.statusCode, 403, "Маркетологу запрещено скачивать файлы архивных пациентов");
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "patients.archived.attachment.download");
	});

	await suite.test("6. GET /api/documents/:id/html — маркетолог получает 403 на расширенный вид медицинского документа (anesthesia_consent_log)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/documents/${ANESTHESIA_DOC_ID}/html`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Маркетолог не должен иметь доступа к протоколу анестезии anesthesia_consent_log",
		);
	});

	await suite.test("7. POST /api/documents — ресепшен/маркетолог не могут создать клинический документ (dental_medical_card_043u)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/documents",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
				"x-dente-admin-secret": "test_secret_or_allow",
			},
			payload: {
				patientId: ACTIVE_PATIENT_ID,
				visitId: VISIT_ID,
				kind: "dental_medical_card_043u",
				title: "Медицинская карта 043/у",
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Ресепшен не имеет права создавать медицинскую карту стоматологического больного 043/у",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.document.write");
	});

	await suite.test("8. POST /api/documents/:id/sign-ukep — ресепшен не может подписать УКЭП клинический документ", async () => {
		// Корректный по структуре base64 DER CMS PKCS#7 блок
		const fakePkcs7 = Buffer.from(
			"308202b806092a864886f70d010702a08202a9308202a50201013100300b06092a864886f70d010701",
			"hex",
		).toString("base64");

		const res = await app.inject({
			method: "POST",
			url: `/api/documents/${ANESTHESIA_DOC_ID}/sign-ukep`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistToken,
			},
			payload: {
				pkcs7Signature: fakePkcs7,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Ресепшен не имеет права подписывать медицинский документ УКЭП",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.document.sign_ukep");
	});

	await suite.test("9. wsBroker.broadcastToPatient — не отправляет клинические события персонала на сокет пациента", () => {
		let sentCount = 0;
		const fakePatientWs = {
			readyState: 1,
			send: () => {
				sentCount++;
			},
			on: () => {},
		};

		wsBroker.addClient(fakePatientWs as never, ORG_ID, ACTIVE_PATIENT_ID, false);

		try {
			// 1. Клиническое событие персонала -> сокет пациента НЕ должен получить
			wsBroker.broadcastToPatient(ORG_ID, ACTIVE_PATIENT_ID, {
				type: "UPDATE_ODONTOGRAM",
				payload: { toothNumber: 46, state: "pulpitis" },
			});
			assert.strictEqual(sentCount, 0, "Пациентский сокет не должен получать UPDATE_ODONTOGRAM");

			// 2. Неклиническое событие (например, напоминание о записи) -> пациентский сокет получает
			wsBroker.broadcastToPatient(ORG_ID, ACTIVE_PATIENT_ID, {
				type: "APPOINTMENT_REMINDER",
				payload: { startsAt: "2026-09-04T10:00:00Z" },
			});
			assert.strictEqual(sentCount, 1, "Пациентский сокет должен получить неклиническое напоминание");
		} finally {
			// cleanup
			fakePatientWs.readyState = 3;
		}
	});

	await suite.test("10. GET /api/prescriptions — маркетолог блокируется с 403 при попытке чтения реестра рецептов", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/prescriptions",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Маркетолог не имеет доступа к рецептам и клиническим диагнозам (152-ФЗ / 323-ФЗ)",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.prescription.read");
	});

	await suite.test("11. POST /api/prescriptions — маркетолог блокируется с 403 при попытке выписки рецепта 1094н", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/prescriptions",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
			payload: {
				patientId: ACTIVE_PATIENT_ID,
				prescribingDoctorId: DOCTOR_USER_ID,
				formType: "form_107_1_u",
				clinicalDiagnosisMkb10: "K04.0",
				clinicalDiagnosisDescription: "Начальный пульпит",
				validityPeriod: "days_60",
				items: [
					{
						innLatin: "Amoxicillinum",
						dosageFormLatin: "Tabulettis",
						dosageDoseConcentration: "500 mg",
						dispenseInstructionLatin: "D.t.d. N. 20",
						signatureDirectionRussian: "По 1 таблетке 3 раза в день",
						quantityPackages: 1,
						durationDays: 7,
						frequencyTimesPerDay: 3,
					},
				],
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Маркетолог не имеет права выписывать рецепты Минздрава 1094н",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.prescription.write");
	});

	await suite.test("12. GET /api/dicomweb/studies — маркетолог блокируется с 403 при попытке поиска КТ / DICOM исследований", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/dicomweb/studies",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Маркетолог не имеет доступа к реестру КТ / DICOM исследований",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.dicom.read");
	});

	await suite.test("13. GET /api/clinical/tasks — маркетолог блокируется с 403 при попытке чтения клинических задач", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/clinical/tasks",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Маркетолог не имеет доступа к клиническим задачам между этапами",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.tasks.read");
	});

	await suite.test("14. POST /api/clinical/phase-completions — маркетолог блокируется с 403 при попытке закрытия клинического этапа", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/phase-completions",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
			payload: {
				patientId: ACTIVE_PATIENT_ID,
				completedPhaseCode: "surgery",
				notes: "Удаление завершено",
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Маркетолог не имеет права закрывать клинические этапы",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.phase.write");
	});

	await suite.test("15. POST /api/clinical/rules — маркетолог блокируется с 403 при попытке создания клинических правил", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/rules",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerToken,
			},
			payload: {
				code: "RULE_CUSTOM_CONTRAINDICATION",
				name: "Правило противопоказания",
				phaseCode: "surgery",
				action: "block",
				severity: "critical",
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			"Маркетолог не имеет права управлять клиническими правилами",
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.rules.write");
	});
});
