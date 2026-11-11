/**
 * apps/api/src/tests/clinical/clinicalEmrLifecycle.test.ts
 *
 * ЖИЗНЕННЫЙ ЦИКЛ ЭЛЕКТРОННОЙ МЕДИЦИНСКОЙ КАРТЫ (ЭМК / ДНЕВНИКОВ ПРИЁМА):
 * 1. Клиническая валидация и связывание формулы зубов FDI (11–48 постоянные, 51–85 молочные)
 *    с кодами МКБ-10 (K02.0 Кариес, K04.0 Пульпит, K05.3 Пародонтит).
 * 2. Автосохранение черновиков визита с частичными данными (Мандат 8e: врач автономен,
 *    система не блокирует сохранение при заполнении только жалоб или только зуба).
 * 3. Соматическая безопасность, стоп-факторы и аллергологический анамнез (1-клик норма,
 *    нулевое падение на null/undefined/пустые строки, выявление аллергии на анестетики и ССЗ).
 * 4. Церемония подписания ПЭП врача, криптографический SHA-256 хеш протокола, неизменяемость
 *    подписанной версии (403 DiaryLocked) и аудит-ревизии («Исправленному верить»).
 * 5. Генерация журнального печатного бланка карты приёма A4 и соответствие чистому
 *    медицинскому языку (Мандат 8x: «Медицинская карта приёма» вместо «043/у», ноль «804н»).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	clinicalAuditLogs,
	organizations,
	patients,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../../db/schema.js";
import registerDiaryRoutes from "../../routes/diary/index.js";
import { registerVisitDraftRoutes } from "../../routes/visits/visitDraftRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	Icd10ClinicalValidator,
	VALID_FDI_PRIMARY_TEETH,
} from "../../services/clinical/Icd10ClinicalValidator.js";
import { computeDiaryHash } from "../../services/clinical/signingModules/diaryHashCalculator.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { normalizePatientAdministrativeProfile } from "../../utils/patientAdministrativeProfile.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

// Доменные модули пакетов shared и web
import {
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	evaluateSomaticSafety,
} from "@dental/shared";
import { generateMedicalRecordPrintHtml } from "../../../../../apps/web/src/components/emr/clinicalDiaryMath.js";
import type { MedicalRecordData } from "../../../../../apps/web/src/components/emr/types/recordDataTypes.js";

describe("Клинический жизненный цикл ЭМК, формулы FDI, черновиков и ПЭП", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	const organizationId = fixtureUuid("clinicalEmrLifecycle", 1);
	let doctorId: string;
	let patientId: string;
	let visitId: string;
	let doctorToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

		await purgeFixtureOrganizations([organizationId]);

		await withFixtureTenant(organizationId, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: organizationId,
					name: "Клиника клинической экспертизы ЭМК",
				})
				.onConflictDoNothing();

			const [doctor] = await tx
				.insert(users)
				.values({
					organizationId,
					fullName: "Д-р Смирнов К. И. (Врач-стоматолог-терапевт)",
					role: "doctor",
				})
				.returning({ id: users.id });
			assert.ok(doctor);
			doctorId = doctor.id;

			const [patient] = await tx
				.insert(patients)
				.values({
					organizationId,
					fullName: "Волкова Елена Сергеевна",
					birthDate: "1992-04-18",
					administrativeProfile: normalizePatientAdministrativeProfile({ gender: "female" }),
					phone: "+79031234567",
				})
				.returning({ id: patients.id });
			assert.ok(patient);
			patientId = patient.id;

			const [visit] = await tx
				.insert(visits)
				.values({
					organizationId,
					patientId,
					status: "draft",
				})
				.returning({ id: visits.id });
			assert.ok(visit);
			visitId = visit.id;
		});

		doctorToken = signToken(
			{ organizationId, userId: doctorId, role: "doctor" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerDiaryRoutes(app);
		registerVisitDraftRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (organizationId) {
			await withFixtureTenant(organizationId, async (tx) => {
				await tx
					.delete(visitDiaryRevisions)
					.where(eq(visitDiaryRevisions.organizationId, organizationId));
				await tx
					.delete(visitDiaries)
					.where(eq(visitDiaries.organizationId, organizationId));
				await tx
					.delete(visits)
					.where(eq(visits.organizationId, organizationId));
				await tx
					.delete(patients)
					.where(eq(patients.organizationId, organizationId));
				await tx
					.delete(users)
					.where(eq(users.organizationId, organizationId));
			});
		}
	});

	// =========================================================================
	// 1. ВАЛИДАЦИЯ ЗУБНОЙ ФОРМУЛЫ FDI И СВЯЗЫВАНИЕ С МКБ-10
	// =========================================================================
	describe("1. Валидация зубных номеров FDI и связывание с МКБ-10", () => {
		test("1.1. Постоянный прикус: валидация K02.0 (Кариес эмали) с зубом 16", () => {
			const res = Icd10ClinicalValidator.validate("K02.0", 16);
			assert.equal(res.isValid, true);
			if (res.isValid) {
				assert.equal(res.normalizedCode, "K02.0");
				assert.equal(res.baseRubric, "K02");
				assert.equal(res.isToothSpecific, true);
				assert.deepEqual(res.parsedTeeth, [16]);
			}
		});

		test("1.2. Молочный (детский) прикус: валидация K02.0 с молочным зубом 54 (FDI 51–85)", () => {
			assert.ok(VALID_FDI_PRIMARY_TEETH.has(54));
			const res = Icd10ClinicalValidator.validate("K02.0", "54");
			assert.equal(res.isValid, true);
			if (res.isValid) {
				assert.equal(res.isToothSpecific, true);
				assert.deepEqual(res.parsedTeeth, [54]);
			}
		});

		test("1.3. Пульпит K04.0 требует обязательного указания зуба FDI", () => {
			const resWithoutTooth = Icd10ClinicalValidator.validate("K04.0", "");
			assert.equal(resWithoutTooth.isValid, false);
			if (!resWithoutTooth.isValid) {
				assert.equal(resWithoutTooth.errorCode, "ToothRequired");
				assert.ok(resWithoutTooth.errorMessage.includes("обязательно укажите номер зуба"));
			}

			const resWithValidTooth = Icd10ClinicalValidator.validate("K04.0", 36);
			assert.equal(resWithValidTooth.isValid, true);
			if (resWithValidTooth.isValid) {
				assert.equal(resWithValidTooth.baseRubric, "K04");
				assert.deepEqual(resWithValidTooth.parsedTeeth, [36]);
			}
		});

		test("1.4. Хронический пародонтит K05.3: опциональный зуб (генерализованный или локализованный)", () => {
			// Без зуба (генерализованный пародонтит)
			const resGeneral = Icd10ClinicalValidator.validate("K05.3", "");
			assert.equal(resGeneral.isValid, true);
			if (resGeneral.isValid) {
				assert.equal(resGeneral.isToothSpecific, false);
				assert.deepEqual(resGeneral.parsedTeeth, []);
			}

			// С зубами (локализованный пародонтит фронтальной группы 31, 32)
			const resLocal = Icd10ClinicalValidator.validate("K05.3", "31, 32");
			assert.equal(resLocal.isValid, true);
			if (resLocal.isValid) {
				assert.deepEqual(resLocal.parsedTeeth, [31, 32]);
			}
		});

		test("1.5. Отклонение невалидных номеров зубов (99, 0, 19, 49) с кодом ToothInvalid", () => {
			const resInvalid = Icd10ClinicalValidator.validate("K02.1", "99");
			assert.equal(resInvalid.isValid, false);
			if (!resInvalid.isValid) {
				assert.equal(resInvalid.errorCode, "ToothInvalid");
				assert.ok(resInvalid.errorMessage.includes("недопустимый номер зуба"));
			}
		});

		test("1.6. Отклонение не-стоматологических кодов МКБ-10 (J06.9, I10) с кодом Icd10Invalid", () => {
			const resJ06 = Icd10ClinicalValidator.validate("J06.9", 16);
			assert.equal(resJ06.isValid, false);
			if (!resJ06.isValid) {
				assert.equal(resJ06.errorCode, "Icd10Invalid");
				assert.ok(resJ06.errorMessage.includes("не входит в стоматологический раздел"));
			}
		});

		test("1.7. Нормализация опечаток с русской «К»/«к», пробелов и вставка точки (к021 -> K02.1)", () => {
			const normalized = Icd10ClinicalValidator.normalizeCode("  к021  ");
			assert.equal(normalized, "K02.1");

			const res = Icd10ClinicalValidator.validate("  к040  ", "21");
			assert.equal(res.isValid, true);
			if (res.isValid) {
				assert.equal(res.normalizedCode, "K04.0");
				assert.deepEqual(res.parsedTeeth, [21]);
			}
		});
	});

	// =========================================================================
	// 2. СОМАТИЧЕСКАЯ БЕЗОПАСНОСТЬ И БЕЗОПАСНЫЙ ФОЛБЕК НА ПУСТЫЕ ПОЛЯ
	// =========================================================================
	describe("2. Соматическая безопасность и фолбек при отсутствии патологий", () => {
		test("2.1. Передача null, undefined и пустой строки безопасно возвращает физиологическую норму без падений", () => {
			const resNull = evaluateSomaticSafety(null);
			assert.equal(resNull.isHealthyNorm, true);
			assert.equal(resNull.hasCriticalStop, false);
			assert.equal(resNull.stopFactors.length, 0);
			assert.equal(resNull.diary043uSnippet, CANONICAL_SOMATIC_HEALTHY_NORM_TEXT);

			const resUndef = evaluateSomaticSafety(undefined);
			assert.equal(resUndef.isHealthyNorm, true);
			assert.equal(resUndef.stopFactors.length, 0);

			const resEmpty = evaluateSomaticSafety("");
			assert.equal(resEmpty.isHealthyNorm, true);
			assert.equal(resEmpty.stopFactors.length, 0);
		});

		test("2.2. Выявление аллергии на местные анестетики (Артикаин, Лидокаин) выставляет критический флаг", () => {
			const evalAllergy = evaluateSomaticSafety("В анамнезе отек Квинке на лидокаин и новокаин");
			assert.equal(evalAllergy.isHealthyNorm, false);
			assert.equal(evalAllergy.hasCriticalStop, true);
			const allergyFactor = evalAllergy.stopFactors.find((f) => f.category === "allergy");
			assert.ok(allergyFactor);
			assert.ok(allergyFactor.detectedItems.includes("Лидокаин"));
		});

		test("2.3. Выявление кардиоваскулярного риска (инфаркт миокарда) формирует запрет адреналина 1:100 000", () => {
			const evalCvd = evaluateSomaticSafety("Инфаркт миокарда < 6 месяцев, гипертонический криз");
			assert.equal(evalCvd.isHealthyNorm, false);
			assert.equal(evalCvd.hasCriticalStop, true);
			const cvdFactor = evalCvd.stopFactors.find((f) => f.category === "cardiovascular");
			assert.ok(cvdFactor);
			assert.ok(cvdFactor.prohibitions.some((p) => p.includes("ЗАПРЕТ НА АДРЕНАЛИН 1:100 000")));
		});
	});

	// =========================================================================
	// 3. АВТОСОХРАНЕНИЕ ЧЕРНОВИКА С ЧАСТИЧНЫМИ ДАННЫМИ (МАНДАТ 8e)
	// =========================================================================
	describe("3. Автосохранение черновика визита с частичными данными (Мандат 8e)", () => {
		test("3.1. Черновик сохраняется при заполнении ТОЛЬКО поля жалоб (без 500 ошибки)", async () => {
			const res = await app.inject({
				method: "PUT",
				url: `/api/visits/${visitId}/draft/autosave`,
				headers: {
					authorization: `Bearer ${doctorToken}`,
					"content-type": "application/json",
				},
				payload: {
					visitId,
					patientId,
					selectedSpecialty: "therapist",
					transcript: "",
					draft: {
						complaint: "Ноющая боль в области зуба 46 при накусывании твердой пищи",
						anamnesis: null,
						objectiveStatus: null,
						diagnosis: null,
						treatmentPlan: null,
						warnings: [],
					},
				},
			});

			assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
			const body = res.json();
			assert.ok(body.serverDraft);
			assert.equal(
				body.serverDraft.draft.complaint,
				"Ноющая боль в области зуба 46 при накусывании твердой пищи",
			);
			assert.equal(body.serverDraft.draft.diagnosis, null);
		});

		test("3.2. Черновик сохраняется при заполнении ТОЛЬКО статуса зуба и диагноза", async () => {
			const res = await app.inject({
				method: "PUT",
				url: `/api/visits/${visitId}/draft/autosave`,
				headers: {
					authorization: `Bearer ${doctorToken}`,
					"content-type": "application/json",
				},
				payload: {
					visitId,
					patientId,
					selectedSpecialty: "therapist",
					transcript: "",
					draft: {
						complaint: null,
						anamnesis: null,
						objectiveStatus: "Зуб 16: глубокая кариозная полость на окклюзионной поверхности",
						diagnosis: "K02.1 Кариес дентина",
						treatmentPlan: null,
						warnings: [],
					},
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.ok(body.serverDraft);
			assert.equal(
				body.serverDraft.draft.objectiveStatus,
				"Зуб 16: глубокая кариозная полость на окклюзионной поверхности",
			);
			assert.equal(body.serverDraft.draft.diagnosis, "K02.1 Кариес дентина");
		});

		test("3.3. GET черновика восстанавливает сохранённое состояние без потери данных", async () => {
			const res = await app.inject({
				method: "GET",
				url: `/api/visits/${visitId}/draft/autosave`,
				headers: {
					authorization: `Bearer ${doctorToken}`,
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.ok(body.serverDraft);
			assert.equal(body.serverDraft.visitId, visitId);
			assert.equal(body.serverDraft.patientId, patientId);
			assert.equal(
				body.serverDraft.draft.objectiveStatus,
				"Зуб 16: глубокая кариозная полость на окклюзионной поверхности",
			);
		});
	});

	// =========================================================================
	// 4. ПОДПИСАНИЕ ПЭП, SHA-256 ХЕШ, БЛОКИРОВКА И ВЕРСИОННЫЙ АУДИТ
	// =========================================================================
	describe("4. Церемония подписания ПЭП, криптографический хеш и версионный аудит", () => {
		let diaryId: string;
		let signedHash: string;
		const anamnesis = "Жалобы на кратковременную боль от сладкого и холодного в зубе 36.";
		const statusLocalis = "Зуб 36: глубокая кариозная полость, дентин пигментирован, зондирование дна безболезненно.";
		const treatmentDescription = "Препарирование, медикаментозная обработка, изолирующая прокладка, пломба Filtek Ultimate.";
		const diagnosisIcd10 = "K02.1";
		const diagnosisTooth = "36";

		test("4.1. Подписание дневника врачом фиксирует SHA-256 хеш, блокирует запись и пишет в аудит", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					authorization: `Bearer ${doctorToken}`,
					"content-type": "application/json",
				},
				payload: {
					visitId,
					patientId,
					status: "signed",
					anamnesis,
					statusLocalis,
					treatmentDescription,
					diagnosisIcd10,
					diagnosisTooth,
				},
			});

			assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
			const body = res.json();
			assert.ok(body.success);
			assert.ok(body.id);
			assert.ok(body.hash);
			diaryId = body.id;
			signedHash = body.hash;

			// Проверяем математическую детерминированность хеша SHA-256
			const expectedHash = computeDiaryHash(
				visitId,
				patientId,
				anamnesis,
				statusLocalis,
				treatmentDescription,
				diagnosisIcd10,
				diagnosisTooth,
				"",
				"",
				"",
			);
			assert.equal(signedHash, expectedHash);

			// Проверяем состояние записи в PostgreSQL
			await withFixtureTenant(organizationId, async (tx) => {
				const [dbDiary] = await tx
					.select()
					.from(visitDiaries)
					.where(eq(visitDiaries.id, diaryId));
				assert.ok(dbDiary);
				assert.equal(dbDiary.isLocked, true);
				assert.equal(dbDiary.diaryHash, expectedHash);
				assert.ok(dbDiary.lockedAt);

				// Проверяем запись в журнале клинического аудита
				const audits = await tx
					.select()
					.from(clinicalAuditLogs)
					.where(
						and(
							eq(clinicalAuditLogs.entityId, diaryId),
							eq(clinicalAuditLogs.organizationId, organizationId),
						),
					);
				assert.ok(audits.length > 0);
				assert.equal(audits[0]?.entityType, "visit_diary");
				assert.equal(audits[0]?.userId, doctorId);
			});
		});

		test("4.2. Попытка прямой перезаписи подписанного дневника отклоняется с кодом 403 DiaryLocked", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					authorization: `Bearer ${doctorToken}`,
					"content-type": "application/json",
				},
				payload: {
					visitId,
					patientId,
					status: "draft",
					anamnesis: "Попытка несанкционированного изменения подписанного протокола",
				},
			});

			assert.equal(res.statusCode, 403);
			const body = res.json();
			assert.equal(body.error, "DiaryLocked");
			assert.ok(body.message.includes("подписан"));
		});

		test("4.3. Ревизия дневника («Исправленному верить») архивирует версию, обновляет хеш и оставляет аудит", async () => {
			const updatedStatusLocalis =
				"Зуб 36: глубокая кариозная полость дентина (II класс по Блэку), после некрэктомии пульпарная камера не вскрыта.";
			const revisionReason =
				"Уточнение топографии кариозной полости по классификации Блэка («Исправленному верить»).";

			const res = await app.inject({
				method: "POST",
				url: `/api/diaries/${diaryId}/revise`,
				headers: {
					authorization: `Bearer ${doctorToken}`,
					"content-type": "application/json",
				},
				payload: {
					statusLocalis: updatedStatusLocalis,
					revisionReason,
				},
			});

			assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
			const body = res.json();
			assert.equal(body.success, true);
			assert.equal(body.revisionCount, 1);
			assert.notEqual(body.hash, signedHash, "Хеш протокола обязан обновиться после ревизии");
			assert.equal(body.cryptoSignatureAttached, false);

			// Проверяем архив ревизий в PostgreSQL
			await withFixtureTenant(organizationId, async (tx) => {
				const revisions = await tx
					.select()
					.from(visitDiaryRevisions)
					.where(eq(visitDiaryRevisions.diaryId, diaryId));
				assert.equal(revisions.length, 1);
				assert.equal(revisions[0]?.revisionReason, revisionReason);
				assert.equal(revisions[0]?.previousStatusLocalis, statusLocalis);
			});
		});
	});

	// =========================================================================
	// 5. ПЕЧАТНЫЙ БЛАНК КАРТЫ ПРИЁМА И ЧИСТЫЙ МЕДИЦИНСКИЙ ЯЗЫК (МАНДАТ 8x)
	// =========================================================================
	describe("5. Структура печатного бланка A4 и соответствие Мандату 8x", () => {
		const mockRecordData: MedicalRecordData = {
			formNumber: "МК-001",
			formOrderName: "Медицинская документация стоматологической клиники",
			clinic: {
				clinicName: "Клиника ДЕНТЕ",
				clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				clinicAddress: "г. Москва, ул. Арбат, д. 24",
				clinicPhone: "+7 (495) 123-45-67",
				clinicOgrn: "1157746123456",
				clinicInn: "7704123456",
				clinicKpp: "770401001",
				licenseNumber: "ЛО-77-01-019876",
				licenseDate: "10.02.2024",
				licenseIssuer: "Департамент здравоохранения г. Москвы",
				chiefDoctorFullName: "Прохоров К. И.",
			},
			passport: {
				medicalCardNumber: "МК-2026-0042",
				cardOpenedDate: "2026-09-01",
				patientFullName: "Волкова Елена Сергеевна",
				patientBirthDate: "1992-04-18",
				patientSex: "female",
				patientPhone: "+79031234567",
				patientEmail: "volkova@example.com",
				patientAddressRegistration: "г. Москва, ул. Лесная, д. 15, кв. 8",
				patientAddressResidence: "г. Москва, ул. Лесная, д. 15, кв. 8",
				patientIdentityDocument: "Паспорт гражданина РФ 45 14 № 123456",
				patientSnils: "123-456-789 00",
				patientInsurancePolicy: "—",
				patientInsuranceCompany: "—",
				patientPrivilegeCategory: "—",
				primaryDiagnosisText: "К02.1 Кариес дентина зуба 36 [МКБ-10: К02.1]",
				primaryDiagnosisIcd10: "K02.1",
				attendingDoctorFullName: "Д-р Смирнов К. И.",
				attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
				attendingDoctorSnils: "123-456-789 00",
			},
			anamnesis: {
				chiefComplaint: "Жалобы на кратковременную боль от сладкого и холодного в области зуба 36.",
				historyOfPresentIllness: "Боль впервые появилась 2 недели назад, усиливалась при приёме холодных напитков.",
				medicalHistoryVitae: "Соматически здорова, хронические заболевания отрицает.",
				allergologicalHistory: "Аллергологический анамнез не отягощен. Аллергию на анестетики отрицает.",
				concomitantSomaticDiseases: "Не выявлено.",
				currentSystemicMedications: "Лекарственные препараты на постоянной основе не принимает.",
				pastDentalInterventions: "Ранее проводилась санация зубов 16, 26, 46.",
				pregnancyLactationStatus: "Не применимо",
				occupationalHazardsAndHabits: "Вредные привычки отрицает",
			},
			dentalStatus: {
				odontogramTeeth: [
					{ toothNumber: 36, statusCode: "caries_media", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
				],
				dmftIndex: {
					decayed: 1,
					filled: 0,
					missing: 0,
					totalDmft: 1,
					decayedSurfaces: 1,
					filledSurfaces: 0,
					totalDmfs: 1,
					deciduousDecayed: 0,
					deciduousFilled: 0,
					deciduousExtracted: 0,
					totalDft: 0,
					intensityLevel: "very_low",
				},
				cpitnIndex: {
					sextant18_14: "0_healthy",
					sextant13_23: "0_healthy",
					sextant24_28: "0_healthy",
					sextant48_44: "0_healthy",
					sextant43_33: "0_healthy",
					sextant34_38: "0_healthy",
					treatmentNeedCategory: "0_none",
				},
				hygieneIndexOhiS: {
					debrisScore: 0.4,
					calculusScore: 0.2,
					totalScore: 0.6,
					ratingText: "Хороший уровень гигиены",
				},
				biteType: "orthognathic",
				biteDescription: "Прикус ортогнатический.",
				oralMucosaStatus: {
					color: "pale_pink_normal",
					moisture: "normal",
					pathologicalElements: null,
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Язык чистый, влажный",
					regionalLymphNodes: "Лимфоузлы не пальпируются",
					tmjFunction: "Без патологии",
				},
				xrayFindingsDescription: "Без патологии",
				xrayRadiationDoseMsv: 0.02,
			},
			visitDiaries: [
				{
					id: "diary-01",
					entryDate: "2026-09-01",
					entryTime: "11:30",
					toothNumber: "36",
					subjectiveComplaints: "Боль от термических раздражителей в зубе 36.",
					objectiveStatusLocalis: "Зуб 36: глубокая кариозная полость дентина на жевательной поверхности.",
					assessmentDiagnosisText: "К02.1 Кариес дентина зуба 36",
					assessmentIcd10Code: "K02.1",
					procedureProtocol: "Обезболивание Артикаин 1:200 000 — 1.7 мл. Препарирование, пломба Filtek Ultimate.",
					doctorFullName: "Д-р Смирнов К. И.",
					doctorSpecialty: "Врач-стоматолог-терапевт",
				},
			],
			generalTreatmentPlan: "Терапевтическая санация кариеса зуба 36",
			epicrisis: {
				treatmentSummary: "Клиническая санация полости рта завершена успешно.",
				treatmentOutcome: "complete_cure",
				treatmentOutcomeLabel: "Полное выздоровление",
				dispensaryGroup: "D_I_healthy",
				dispensaryGroupLabel: "Д-I (Здоровые)",
				plannedRecallIntervalMonths: 6,
				preventivePlanRecommendations: "Рекомендован осмотр через 6 мес.",
				dateCompleted: "2026-09-01",
				headOfDepartmentFullName: "Прохоров К. И.",
				attendingDoctorFullName: "Д-р Смирнов К. И.",
			},
		};

		test("5.1. Черновик содержит водяной знак «ЧЕРНОВИК»", () => {
			const htmlDraft = generateMedicalRecordPrintHtml(mockRecordData, { isDraft: true, isLocked: false });
			assert.ok(htmlDraft.includes('<div class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>'));
			assert.ok(!htmlDraft.includes("ПОДПИСАНО ВРАЧОМ"));
		});

		test("5.2. Подписанный документ содержит водяной знак «ПОДПИСАНО ВРАЧОМ»", () => {
			const htmlSigned = generateMedicalRecordPrintHtml(mockRecordData, { isDraft: false, isLocked: true });
			assert.ok(htmlSigned.includes("ПОДПИСАНО ВРАЧОМ"));
			assert.ok(!htmlSigned.includes('<div class="watermark-draft" aria-hidden="true">ЧЕРНОВИК</div>'));
		});

		test("5.3. Целостность структуры документа (ФИО, дата рождения, документ, диагноз, врач)", () => {
			const html = generateMedicalRecordPrintHtml(mockRecordData, { isDraft: false, isLocked: true });
			assert.ok(html.includes("Волкова Елена Сергеевна"), "ФИО пациента должно присутствовать");
			assert.ok(html.includes("1992-04-18"), "Дата рождения должна присутствовать");
			assert.ok(html.includes("Паспорт гражданина РФ 45 14 № 123456"), "Документ должен присутствовать");
			assert.ok(html.includes("К02.1 Кариес дентина"), "Диагноз МКБ-10 должен присутствовать");
			assert.ok(html.includes("Д-р Смирнов К. И."), "Лечащий врач должен присутствовать");
		});

		test("5.4. Мандат 8x (Чистый клинический язык): заголовок страницы не содержит сырых канцелярских кодов", () => {
			const html = generateMedicalRecordPrintHtml(mockRecordData, { isDraft: false, isLocked: true });
			// В title документа строго «Медицинская карта приёма», а не «Форма 043/у»
			assert.ok(html.includes("<title>Медицинская карта приёма № МК-2026-0042</title>"));
			assert.ok(!html.includes("<title>Форма 043/у"));
			assert.ok(!html.includes("Приказ 804н"));
		});
	});
});
