/**
 * ChiefPhysicianAuditService.test.ts — Честные тесты экспертизы качества медпомощи по Приказу 203н.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import Fastify from "fastify";
import { db, pool } from "../../db/client.js";
import registerDiaryRoutes from "../../routes/diary.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	ChiefPhysicianAuditError,
	ChiefPhysicianAuditService,
	calculateComplianceScore,
	evaluateOrder203nCriteria,
	generateQualityActText,
	isAuthorizedReviewerRole,
	isChiefDoctorVerdict,
} from "./ChiefPhysicianAuditService.js";


describe("ChiefPhysicianAuditService — Domain & Regulatory 203н Logic", () => {
	it("isChiefDoctorVerdict correctly validates allowed verdicts", () => {
		assert.equal(isChiefDoctorVerdict("approved"), true);
		assert.equal(isChiefDoctorVerdict("deficiencies_found"), true);
		assert.equal(isChiefDoctorVerdict("critical_violation"), true);

		assert.equal(isChiefDoctorVerdict("pending"), false);
		assert.equal(isChiefDoctorVerdict("rejected"), false);
		assert.equal(isChiefDoctorVerdict(""), false);
		assert.equal(isChiefDoctorVerdict(null), false);
		assert.equal(isChiefDoctorVerdict(undefined), false);
	});

	it("isAuthorizedReviewerRole allows only chief_doctor, owner, and admin", () => {
		assert.equal(isAuthorizedReviewerRole("chief_doctor"), true);
		assert.equal(isAuthorizedReviewerRole("CHIEF_DOCTOR"), true);
		assert.equal(isAuthorizedReviewerRole("owner"), true);
		assert.equal(isAuthorizedReviewerRole("admin"), true);

		assert.equal(isAuthorizedReviewerRole("doctor"), false);
		assert.equal(isAuthorizedReviewerRole("assistant"), false);
		assert.equal(isAuthorizedReviewerRole("administrator"), false);
		assert.equal(isAuthorizedReviewerRole("manager"), false);
		assert.equal(isAuthorizedReviewerRole(""), false);
		assert.equal(isAuthorizedReviewerRole(null), false);
		assert.equal(isAuthorizedReviewerRole(undefined), false);
	});

	it("evaluateOrder203nCriteria correctly detects compliant diary with valid IDS override", () => {
		const diary = {
			anamnesis: "Жалобы на боли в области 46 зуба от сладкого и холодного.",
			statusLocalis: "46 зуб — глубокая кариозная полость на жевательной поверхности.",
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "46",
			treatmentDescription: "Препарирование, медобработка, пломбирование Estelite Asteria.",
			instrumentTrayBarcode: "TRAY-2026-OK",
			isLocked: true,
		};

		const evalResult = evaluateOrder203nCriteria(diary, null, { informedConsentPresent: true });
		assert.equal(evalResult.informedConsentPresent, true);
		assert.equal(evalResult.anamnesisComplete, true);
		assert.equal(evalResult.statusLocalisComplete, true);
		assert.equal(evalResult.icd10DiagnosisValid, true);
		assert.equal(evalResult.treatmentPlanAdequate, true);
		assert.equal(evalResult.instrumentTraceabilityValid, true);
	});

	it("evaluateOrder203nCriteria catches deficiencies when fields are missing or invalid", () => {
		const deficientDiary = {
			anamnesis: " ", // Missing anamnesis
			statusLocalis: "36", // Too short
			diagnosisIcd10: "J00", // Non-dental diagnosis
			diagnosisTooth: null,
			treatmentDescription: "", // Missing treatment
			instrumentTrayBarcode: null, // Missing tray barcode
			isLocked: false,
		};

		const evalResult = evaluateOrder203nCriteria(deficientDiary);
		assert.equal(evalResult.informedConsentPresent, false);
		assert.equal(evalResult.anamnesisComplete, false);
		assert.equal(evalResult.statusLocalisComplete, false);
		assert.equal(evalResult.icd10DiagnosisValid, false);
		assert.equal(evalResult.treatmentPlanAdequate, false);
		assert.equal(evalResult.instrumentTraceabilityValid, false);
	});

	it("calculateComplianceScore honestly calculates percentage without artificial inflation", () => {
		const fullCriteria = {
			informedConsentPresent: true,
			anamnesisComplete: true,
			statusLocalisComplete: true,
			icd10DiagnosisValid: true,
			treatmentPlanAdequate: true,
			instrumentTraceabilityValid: true,
		};

		const approvedScore = calculateComplianceScore(fullCriteria, "approved");
		assert.equal(approvedScore, 100);

		const partialCriteria = {
			informedConsentPresent: true,
			anamnesisComplete: true,
			statusLocalisComplete: true,
			icd10DiagnosisValid: true,
			treatmentPlanAdequate: false,
			instrumentTraceabilityValid: false,
		};

		const defScore = calculateComplianceScore(
			partialCriteria,
			"deficiencies_found",
		);
		assert.ok(defScore >= 50 && defScore <= 85);

		const critScore = calculateComplianceScore(
			fullCriteria,
			"critical_violation",
		);
		assert.equal(critScore, 35);
	});

	it("generateQualityActText produces legal Russian КЭК/ВК act", () => {
		const act = generateQualityActText({
			actNumber: "АКТ-ВК-2026-0001",
			protocolNumber: "ВК-2026/01",
			reviewedAt: new Date("2026-08-16T12:00:00Z"),
			patientFullName: "Иванов Иван Иванович",
			attendingDoctorFullName: "Петров Петр Петрович",
			reviewerDoctorFullName: "Сидоров Сергей Сергеевич",
			reviewerRole: "Главный врач",
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "46",
			verdict: "approved",
			complianceScorePct: 100,
			criteria: {
				informedConsentPresent: true,
				anamnesisComplete: true,
				statusLocalisComplete: true,
				icd10DiagnosisValid: true,
				treatmentPlanAdequate: true,
				instrumentTraceabilityValid: true,
			},
			notes: "Замечаний нет. Карта образцовая.",
		});

		assert.ok(act.expertSummary.includes("АКТ ЭКСПЕРТИЗЫ КАЧЕСТВА МЕДИЦИНСКОЙ ПОМОЩИ (ВК / КЭК) № АКТ-ВК-2026-0001"));
		assert.ok(act.expertSummary.includes("Приказу Минздрава России от 10.05.2017 № 203н"));
		assert.ok(act.expertSummary.includes("Иванов Иван Иванович"));
		assert.ok(act.expertSummary.includes("Сидоров Сергей Сергеевич"));
		assert.ok(act.expertSummary.includes("Главный врач"));
		assert.ok(act.expertSummary.includes("K02.1 | Зуб 46"));
		assert.ok(act.expertSummary.includes("100%"));
		assert.ok(act.expertSummary.includes("Замечаний нет. Карта образцовая."));
		assert.ok(act.recommendations.includes("утверждена"));
	});

	it("ChiefPhysicianAuditError sets proper error codes and messages", () => {
		const err = new ChiefPhysicianAuditError("PermissionDenied", "Доступ запрещен");
		assert.equal(err.name, "ChiefPhysicianAuditError");
		assert.equal(err.code, "PermissionDenied");
		assert.equal(err.message, "Доступ запрещен");
		assert.ok(err instanceof Error);
	});
});

describe("ChiefPhysicianAuditService — Database Integration & Transaction Safety", () => {
	let testOrgId: string | null = null;
	let testPatientId: string | null = null;
	let testVisitId: string | null = null;
	let testDiaryId: string | null = null;
	let chiefDoctorId: string | null = null;
	let regularDoctorId: string | null = null;

	const createdAuditIds: string[] = [];
	const createdAuditLogIds: string[] = [];
	const createdUserIds: string[] = [];
	const createdVisitIds: string[] = [];
	const createdDiaryIds: string[] = [];

	before(async () => {
		try {
			// Ищем существующую организацию и пациента или создаем фикстуру
			const orgRes = await db.execute(
				sql`SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`,
			);
			const orgRow = (orgRes.rows ?? [])[0] as { id: string } | undefined;
			if (!orgRow) return;
			testOrgId = String(orgRow.id);

			// Создаем проверяющего главного врача
			const chiefInsert = await db.execute(sql`
				INSERT INTO users (organization_id, full_name, email, role, is_active)
				VALUES (${testOrgId}::uuid, 'Тестовый Главврач', ${`chief-${Date.now()}@test.local`}, 'chief_doctor', true)
				RETURNING id
			`);
			chiefDoctorId = String((chiefInsert.rows ?? [])[0]?.id);
			if (chiefDoctorId) createdUserIds.push(chiefDoctorId);

			// Создаем обычного врача без прав главврача
			const docInsert = await db.execute(sql`
				INSERT INTO users (organization_id, full_name, email, role, is_active)
				VALUES (${testOrgId}::uuid, 'Тестовый Обычный Врач', ${`doc-${Date.now()}@test.local`}, 'doctor', true)
				RETURNING id
			`);
			regularDoctorId = String((docInsert.rows ?? [])[0]?.id);
			if (regularDoctorId) createdUserIds.push(regularDoctorId);

			// Создаем пациента
			const patientInsert = await db.execute(sql`
				INSERT INTO patients (organization_id, full_name, birth_date, gender)
				VALUES (${testOrgId}::uuid, 'Тестовый Пациент 203н', '1985-05-15', 'male')
				RETURNING id
			`);
			testPatientId = String((patientInsert.rows ?? [])[0]?.id);

			// Создаем приём
			const visitInsert = await db.execute(sql`
				INSERT INTO visits (organization_id, patient_id, doctor_id, date, status, quality_control_status, diagnosis)
				VALUES (
					${testOrgId}::uuid,
					${testPatientId}::uuid,
					${chiefDoctorId ? sql`${chiefDoctorId}::uuid` : sql`NULL`},
					NOW(),
					'completed',
					'pending',
					'K02.1 Кариес дентина'
				)
				RETURNING id
			`);
			testVisitId = String((visitInsert.rows ?? [])[0]?.id);
			if (testVisitId) createdVisitIds.push(testVisitId);

			// Создаем дневник 043/у
			const diaryInsert = await db.execute(sql`
				INSERT INTO visit_diaries (
					organization_id, visit_id, doctor_id, diagnosis_icd10, diagnosis_tooth,
					anamnesis, status_localis, treatment_description, instrument_tray_barcode, is_locked
				)
				VALUES (
					${testOrgId}::uuid,
					${testVisitId}::uuid,
					${chiefDoctorId ? sql`${chiefDoctorId}::uuid` : sql`NULL`},
					'K02.1', '46',
					'Жалобы на боли от термических раздражителей в 46 зубе.',
					'46 зуб — глубокая кариозная полость I класса по Блэку, зондирование болезненно по дну.',
					'Препарирование, медикаментозная обработка, изолирующая прокладка, пломба SDR + Estelite.',
					'TRAY-STERILE-100', true
				)
				RETURNING id
			`);
			testDiaryId = String((diaryInsert.rows ?? [])[0]?.id);
			if (testDiaryId) createdDiaryIds.push(testDiaryId);
		} catch {
			testOrgId = null;
		}
	});

	after(async () => {
		try {
			if (createdAuditIds.length > 0) {
				const idList = sql.join(createdAuditIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM clinical_quality_audits WHERE id IN (${idList})`);
			}
			if (createdDiaryIds.length > 0) {
				const idList = sql.join(createdDiaryIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM visit_diaries WHERE id IN (${idList})`);
			}
			if (createdVisitIds.length > 0) {
				const idList = sql.join(createdVisitIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM visits WHERE id IN (${idList})`);
			}
			if (createdUserIds.length > 0) {
				const idList = sql.join(createdUserIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM users WHERE id IN (${idList})`);
			}
		} catch {
			// Ignore cleanup errors
		}
	});


	it("reviewDiary executes full audit with approval and writes clinical_quality_audits, audit logs, and visit status", async (t) => {
		if (!testOrgId || !chiefDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры БД");
			return;
		}

		const result = await ChiefPhysicianAuditService.reviewDiary(
			testOrgId,
			chiefDoctorId,
			testVisitId,
			"approved",
			"Экспертиза пройдена успешно. Качество лечения и оформления соответствует Приказу 203н.",
			{ criteriaEvaluation: { informedConsentPresent: true } },
		);

		assert.ok(result.auditId, "Обязан вернуть ID аудита");
		createdAuditIds.push(result.auditId);
		if (result.auditLogId) createdAuditLogIds.push(result.auditLogId);

		assert.equal(result.verdict, "approved");
		assert.equal(result.qualityControlStatus, "approved");
		assert.equal(result.visitId, testVisitId);
		assert.ok(result.complianceScorePct >= 90);
		assert.ok(result.act.expertSummary.includes("Приказу Минздрава России от 10.05.2017 № 203н"));

		// Проверяем запись в clinical_quality_audits
		const auditDb = await db.execute(
			sql`SELECT * FROM clinical_quality_audits WHERE id = ${result.auditId}::uuid`,
		);
		const auditRow = (auditDb.rows ?? [])[0] as Record<string, unknown> | undefined;
		assert.ok(auditRow, "Запись обязана присутствовать в clinical_quality_audits");
		assert.equal(String(auditRow.verdict), "approved");
		assert.equal(String(auditRow.organization_id), testOrgId);

		// Проверяем обновление visits.quality_control_status
		const visitDb = await db.execute(
			sql`SELECT quality_control_status FROM visits WHERE id = ${testVisitId}::uuid`,
		);
		const visitRow = (visitDb.rows ?? [])[0] as { quality_control_status: string } | undefined;
		assert.equal(visitRow?.quality_control_status, "approved");

		// Проверяем чтение истории экспертиз через getDiaryReviews
		const reviews = await ChiefPhysicianAuditService.getDiaryReviews(testOrgId, testVisitId);
		assert.ok(reviews.length >= 1, "getDiaryReviews обязан вернуть проведённую экспертизу");
		const found = reviews.find((r) => r.id === result.auditId);
		assert.ok(found);
		assert.equal(found?.reviewerDoctorFullName, "Тестовый Главврач");
		assert.equal(found?.reviewerRole, "Главный врач");
	});

	it("reviewDiary rejects 'approved' verdict when mandatory IDS or anamnesis is missing", async (t) => {
		if (!testOrgId || !chiefDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры БД");
			return;
		}

		await assert.rejects(
			async () => {
				await ChiefPhysicianAuditService.reviewDiary(
					testOrgId!,
					chiefDoctorId!,
					testVisitId!,
					"approved",
					"Попытка утвердить карту без ИДС",
					{ criteriaEvaluation: { informedConsentPresent: false } },
				);
			},
			(err: unknown) => {
				return (
					err instanceof ChiefPhysicianAuditError &&
					err.code === "ValidationError" &&
					err.message.includes("критические дефекты")
				);
			},
		);
	});

	it("reviewDiary rejects execution when reviewer role is not chief_doctor/owner/admin", async (t) => {
		if (!testOrgId || !regularDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры БД");
			return;
		}

		await assert.rejects(
			async () => {
				await ChiefPhysicianAuditService.reviewDiary(
					testOrgId!,
					regularDoctorId!,
					testVisitId!,
					"approved",
				);
			},
			(err: unknown) => {
				return (
					err instanceof ChiefPhysicianAuditError &&
					err.code === "PermissionDenied"
				);
			},
		);
	});

	it("reviewDiary sets deficiencies_found and updates status accordingly", async (t) => {
		if (!testOrgId || !chiefDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры БД");
			return;
		}

		const result = await ChiefPhysicianAuditService.reviewDiary(
			testOrgId,
			chiefDoctorId,
			testVisitId,
			"deficiencies_found",
			"Устранить неточности в описании локального статуса.",
		);

		createdAuditIds.push(result.auditId);
		if (result.auditLogId) createdAuditLogIds.push(result.auditLogId);

		assert.equal(result.verdict, "deficiencies_found");
		assert.equal(result.qualityControlStatus, "deficiencies_found");

		const visitDb = await db.execute(
			sql`SELECT quality_control_status FROM visits WHERE id = ${testVisitId}::uuid`,
		);
		const visitRow = (visitDb.rows ?? [])[0] as { quality_control_status: string } | undefined;
		assert.equal(visitRow?.quality_control_status, "deficiencies_found");
	});

	it("reviewDiary sets critical_violation and updates status accordingly", async (t) => {
		if (!testOrgId || !chiefDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры БД");
			return;
		}

		const result = await ChiefPhysicianAuditService.reviewDiary(
			testOrgId,
			chiefDoctorId,
			testVisitId,
			"critical_violation",
			"Грубое нарушение протокола препарирования без анестезии.",
		);

		createdAuditIds.push(result.auditId);
		if (result.auditLogId) createdAuditLogIds.push(result.auditLogId);

		assert.equal(result.verdict, "critical_violation");
		assert.equal(result.qualityControlStatus, "critical_violation");
		assert.equal(result.complianceScorePct, 35);

		const visitDb = await db.execute(
			sql`SELECT quality_control_status FROM visits WHERE id = ${testVisitId}::uuid`,
		);
		const visitRow = (visitDb.rows ?? [])[0] as { quality_control_status: string } | undefined;
		assert.equal(visitRow?.quality_control_status, "critical_violation");
	});

	it("reviewDiary rejects invalid verdict", async (t) => {
		if (!testOrgId || !chiefDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры БД");
			return;
		}

		await assert.rejects(
			async () => {
				await ChiefPhysicianAuditService.reviewDiary(
					testOrgId!,
					chiefDoctorId!,
					testVisitId!,
					// @ts-expect-error test invalid verdict
					"some_unknown_verdict",
				);
			},
			(err: unknown) => {
				return (
					err instanceof ChiefPhysicianAuditError &&
					err.code === "InvalidVerdict"
				);
			},
		);
	});
});

describe("ChiefPhysicianAuditService — Fastify HTTP Endpoints", () => {
	let app: ReturnType<typeof Fastify>;
	let testOrgId: string | null = null;
	let testVisitId: string | null = null;
	let chiefDoctorId: string | null = null;
	let regularDoctorId: string | null = null;
	let clinicHeaders: Record<string, string>;

	const createdAuditIds: string[] = [];
	const createdAuditLogIds: string[] = [];
	const createdUserIds: string[] = [];
	const createdVisitIds: string[] = [];
	const createdDiaryIds: string[] = [];

	before(async () => {
		try {
			process.env.NODE_ENV = "test";
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

			const orgRes = await db.execute(
				sql`SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`,
			);
			const orgRow = (orgRes.rows ?? [])[0] as { id: string } | undefined;
			if (!orgRow) return;
			testOrgId = String(orgRow.id);

			clinicHeaders = {
				"x-dente-clinic-token": signToken(
					{ organizationId: testOrgId },
					TOKEN_SECRET(),
				),
			};
			if (process.env.DENTE_CLINICAL_ADMIN_SECRET) {
				clinicHeaders["x-dente-admin-secret"] = process.env.DENTE_CLINICAL_ADMIN_SECRET;
			}

			// Главврач
			const chiefInsert = await db.execute(sql`
				INSERT INTO users (organization_id, full_name, email, role, is_active)
				VALUES (${testOrgId}::uuid, 'HTTP Главврач', ${`http-chief-${Date.now()}@test.local`}, 'chief_doctor', true)
				RETURNING id
			`);
			chiefDoctorId = String((chiefInsert.rows ?? [])[0]?.id);
			if (chiefDoctorId) createdUserIds.push(chiefDoctorId);

			// Обычный врач
			const docInsert = await db.execute(sql`
				INSERT INTO users (organization_id, full_name, email, role, is_active)
				VALUES (${testOrgId}::uuid, 'HTTP Доктор', ${`http-doc-${Date.now()}@test.local`}, 'doctor', true)
				RETURNING id
			`);
			regularDoctorId = String((docInsert.rows ?? [])[0]?.id);
			if (regularDoctorId) createdUserIds.push(regularDoctorId);

			// Пациент
			let patId: string;
			const patRes = await db.execute(
				sql`SELECT id FROM patients WHERE organization_id = ${testOrgId}::uuid LIMIT 1`,
			);
			const patRow = (patRes.rows ?? [])[0] as { id: string } | undefined;
			if (patRow) {
				patId = String(patRow.id);
			} else {
				const patInsert = await db.execute(sql`
					INSERT INTO patients (organization_id, full_name, birth_date, phone)
					VALUES (${testOrgId}::uuid, 'Пациент HTTP', '1995-05-05', '+79998887766')
					RETURNING id
				`);
				patId = String((patInsert.rows ?? [])[0]?.id);
			}

			// Приём
			const visitInsert = await db.execute(sql`
				INSERT INTO visits (organization_id, patient_id, quality_control_status, status)
				VALUES (${testOrgId}::uuid, ${patId}::uuid, 'pending', 'signed')
				RETURNING id
			`);
			testVisitId = String((visitInsert.rows ?? [])[0]?.id);
			if (testVisitId) createdVisitIds.push(testVisitId);

			// Дневник
			const diaryInsert = await db.execute(sql`
				INSERT INTO visit_diaries (
					organization_id, visit_id, patient_id, doctor_id,
					anamnesis, status_localis, diagnosis_icd10, diagnosis_tooth,
					treatment_description, instrument_tray_barcode, is_locked
				) VALUES (
					${testOrgId}::uuid, ${testVisitId}::uuid, ${patId}::uuid, ${regularDoctorId}::uuid,
					'Жалобы на скол пломбы 11 зуба.',
					'11 зуб: дефект реставрации, перкуссия безболезненна.',
					'K02.1', '11',
					'Реставрация композитом Ceram.x SphereTEC.',
					'TRAY-STERILE-HTTP', true
				)
				RETURNING id
			`);
			const testDiaryId = String((diaryInsert.rows ?? [])[0]?.id);
			if (testDiaryId) createdDiaryIds.push(testDiaryId);

			app = Fastify();
			await app.register(registerDiaryRoutes);
		} catch {
			testOrgId = null;
		}
	});

	after(async () => {
		try {
			if (app) await app.close();
			if (createdAuditIds.length > 0) {
				const idList = sql.join(createdAuditIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM clinical_quality_audits WHERE id IN (${idList})`);
			}
			if (createdDiaryIds.length > 0) {
				const idList = sql.join(createdDiaryIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM visit_diaries WHERE id IN (${idList})`);
			}
			if (createdVisitIds.length > 0) {
				const idList = sql.join(createdVisitIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM visits WHERE id IN (${idList})`);
			}
			if (createdUserIds.length > 0) {
				const idList = sql.join(createdUserIds.map((id) => sql`${id}::uuid`), sql`, `);
				await db.execute(sql`DELETE FROM users WHERE id IN (${idList})`);
			}
		} catch {
			// Ignore cleanup errors
		}
	});


	it("POST /api/diary/:id/chief-review succeeds when chief doctor submits review", async (t) => {
		if (!testOrgId || !chiefDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры");
			return;
		}

		const chiefStaffToken = signToken(
			{
				userId: chiefDoctorId,
				organizationId: testOrgId,
				role: "chief_doctor",
				fullName: "HTTP Главврач",
			},
			TOKEN_SECRET(),
		);

		const res = await app.inject({
			method: "POST",
			url: `/api/diary/${testVisitId}/chief-review`,
			headers: {
				...clinicHeaders,
				"x-dente-staff-token": chiefStaffToken,
			},
			payload: {
				verdict: "approved",
				notes: "Клинический протокол выполнен идеально.",
			},
		});

		assert.equal(res.statusCode, 200);

		const json = res.json();
		assert.equal(json.success, true);
		assert.equal(json.verdict, "approved");
		assert.equal(json.qualityControlStatus, "approved");
		assert.ok(json.auditId);
		createdAuditIds.push(json.auditId);
		if (json.auditLogId) createdAuditLogIds.push(json.auditLogId);

		// GET /api/diary/:id/chief-reviews
		const getRes = await app.inject({
			method: "GET",
			url: `/api/diary/${testVisitId}/chief-reviews`,
			headers: clinicHeaders,
		});

		assert.equal(getRes.statusCode, 200);
		const getJson = getRes.json();
		assert.ok(Array.isArray(getJson.reviews));
		assert.ok(getJson.reviews.length >= 1);
		assert.equal(getJson.reviews[0].verdict, "approved");
	});

	it("POST /api/diary/:id/chief-review rejects unauthorized role (doctor)", async (t) => {
		if (!testOrgId || !regularDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры");
			return;
		}

		const doctorStaffToken = signToken(
			{
				userId: regularDoctorId,
				organizationId: testOrgId,
				role: "doctor",
				fullName: "HTTP Доктор",
			},
			TOKEN_SECRET(),
		);

		const res = await app.inject({
			method: "POST",
			url: `/api/diary/${testVisitId}/chief-review`,
			headers: {
				...clinicHeaders,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				verdict: "approved",
			},
		});

		assert.equal(res.statusCode, 403);
		const json = res.json();
		assert.equal(json.error, "OnlyChiefDoctorCanReview");
	});

	it("POST /api/diary/:id/chief-review rejects invalid verdict", async (t) => {
		if (!testOrgId || !chiefDoctorId || !testVisitId) {
			t.skip("Отсутствуют фикстуры");
			return;
		}

		const chiefStaffToken = signToken(
			{
				userId: chiefDoctorId,
				organizationId: testOrgId,
				role: "chief_doctor",
				fullName: "HTTP Главврач",
			},
			TOKEN_SECRET(),
		);

		const res = await app.inject({
			method: "POST",
			url: `/api/diary/${testVisitId}/chief-review`,
			headers: {
				...clinicHeaders,
				"x-dente-staff-token": chiefStaffToken,
			},
			payload: {
				verdict: "invalid_verdict_string",
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");
	});
});


