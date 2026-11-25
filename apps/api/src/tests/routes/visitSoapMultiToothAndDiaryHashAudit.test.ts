import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	users,
	visitDiaries,
	visitDiaryRevisions,
	visits,
} from "../../db/schema.js";
import { computeDiaryHash } from "../../services/clinical/signingModules/diaryHashCalculator.js";
import { acceptVisitDraftInDb } from "../../db/visitsQueryModules/protocol/visitProtocolRevisions.js";
import { upsertVisitDraftAutosaveInDb } from "../../db/visitsQueryModules/protocol/visitSoapQueries.js";
import { executeDiaryReviseTx } from "../../routes/diary/revisions/diaryReviseTransaction.js";
import { Icd10ClinicalValidator } from "../../services/clinical/Icd10ClinicalValidator.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

describe("EMR / SOAP Multi-Tooth Autosave, complaint Column & diaryHash Audit (Mandates 8e, 8y, 8bf)", () => {
	let organizationId: string;
	let doctorUserId: string;
	let patientId: string;
	let visitId: string;

	before(async () => {
		organizationId = fixtureUuid("soap-surgeon", 1);
		doctorUserId = fixtureUuid("soap-surgeon", 2);
		patientId = fixtureUuid("soap-surgeon", 3);
		visitId = fixtureUuid("soap-surgeon", 4);

		await purgeFixtureOrganizations([organizationId]);

		await withFixtureTenant(organizationId, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: organizationId,
					name: "Surgeon Clinical Audit Clinic",
				})
				.onConflictDoNothing();

			await tx.delete(visitDiaryRevisions).where(eq(visitDiaryRevisions.organizationId, organizationId));
			await tx.delete(visitDiaries).where(eq(visitDiaries.organizationId, organizationId));
			await tx.delete(visits).where(eq(visits.organizationId, organizationId));

			await tx
				.insert(users)
				.values({
					id: doctorUserId,
					organizationId,
					role: "doctor",
					email: "surgeon@audit.test",
					fullName: "Доктор Хирургов",
				})
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values({
					id: patientId,
					organizationId,
					fullName: "Пациент Мультизубов",
				})
				.onConflictDoNothing();

			await tx
				.insert(visits)
				.values({
					id: visitId,
					organizationId,
					patientId,
					status: "draft",
				})
				.onConflictDoNothing();
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([organizationId]);
	});

	test("ДЕФЕКТ 1 & 3: upsertVisitDraftAutosaveInDb сохраняет complaint раздельно и не затирает multi-tooth дневники", async () => {
		// 1. Автосейв зуба 16
		await upsertVisitDraftAutosaveInDb(organizationId, {
			visitId,
			patientId,
			selectedSpecialty: "therapist",
			transcript: "Жалобы на зуб 16",
			draft: {
				complaint: "Острая реакция на холодное в зубе 16",
				anamnesis: "Ранее не лечен, появилось 3 дня назад",
				objectiveStatus: "Кариозная полость на окклюзии зуба 16",
				diagnosis: "K02.1",
				diagnosisTooth: "16",
				treatmentPlan: "Препарирование и пломба 16",
				warnings: [],
			},
		});

		// 2. Автосейв зуба 26 для ТОГО ЖЕ визита
		await upsertVisitDraftAutosaveInDb(organizationId, {
			visitId,
			patientId,
			selectedSpecialty: "therapist",
			transcript: "Жалобы на зуб 26",
			draft: {
				complaint: "Ноющая боль в зубе 26",
				anamnesis: "Зуб 26 беспокоит неделю",
				objectiveStatus: "Глубокая кариозная полость в зубе 26",
				diagnosis: "K04.0",
				diagnosisTooth: "26",
				treatmentPlan: "Эндодонтическое лечение 26",
				warnings: [],
			},
		});

		// Проверяем физические строки в visit_diaries
		const diaries = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, organizationId),
				),
			);

		assert.equal(
			diaries.length,
			2,
			"Второй зуб НЕ должен затирать первый: должно быть ровно 2 дневника!",
		);

		const diary16 = diaries.find((d) => d.diagnosisTooth === "16");
		const diary26 = diaries.find((d) => d.diagnosisTooth === "26");

		assert.ok(diary16, "Дневник зуба 16 должен существовать");
		assert.ok(diary26, "Дневник зуба 26 должен существовать");

		// Проверяем ДЕФЕКТ 3: колонка complaint НЕ должна быть пустой!
		assert.equal(diary16.complaint, "Острая реакция на холодное в зубе 16");
		assert.equal(diary16.anamnesis, "Ранее не лечен, появилось 3 дня назад");

		assert.equal(diary26.complaint, "Ноющая боль в зубе 26");
		assert.equal(diary26.anamnesis, "Зуб 26 беспокоит неделю");
	});

	test("ДЕФЕКТ 2: acceptVisitDraftInDb пересчитывает diaryHash при правках закрытого визита («Исправленному верить»)", async () => {
		// Первичное подписание визита
		const acceptOutcome = await acceptVisitDraftInDb(organizationId, {
			visitId,
			clientMutationId: "mut-initial-1",
			draft: {
				complaint: "Боль в зубе 16",
				anamnesis: "Анамнез 16",
				objectiveStatus: "Кариес 16",
				diagnosis: "K02.1",
				diagnosisTooth: "16",
				treatmentPlan: "Пломба 16",
				warnings: [],
			},
		});

		assert.equal(acceptOutcome.visit.status, "signed");
		assert.equal(acceptOutcome.visit.revision, 2, "При первичном подписании черновика ревизия визита инкрементируется до 2");

		// Вносим ревизию в подписанный визит («Исправленному верить»)
		const amendedTreatment = "Пломба 16 светоотверждаемым нанокомпозитом и шлифовка";
		const amendOutcome = await acceptVisitDraftInDb(organizationId, {
			visitId,
			clientMutationId: "mut-amend-2",
			doctorSummary: "Уточнено описание лечения зуба 16",
			draft: {
				complaint: "Боль в зубе 16",
				anamnesis: "Анамнез 16",
				objectiveStatus: "Кариес 16",
				diagnosis: "K02.1",
				diagnosisTooth: "16",
				treatmentPlan: amendedTreatment,
				warnings: [],
			},
		});

		assert.equal(amendOutcome.visit.revision, 3, "При внесении ревизии в подписанный визит ревизия инкрементируется до 3");

		// Проверяем обновленный дневник в БД
		const [amendedDiary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, organizationId),
					eq(visitDiaries.diagnosisTooth, "16"),
				),
			)
			.limit(1);

		assert.ok(amendedDiary, "Обновленный дневник зуба 16 найден");
		assert.equal(amendedDiary.treatmentDescription, amendedTreatment);
		assert.equal(amendedDiary.version, 3, "Версия дневника инкрементирована до 3");

		// Вычисляем ожидаемый хеш через канонический алгоритм computeDiaryHash
		const expectedHash = computeDiaryHash(
			visitId,
			patientId,
			amendedDiary.complaint,
			"Анамнез 16",
			"Кариес 16",
			amendedTreatment,
			"K02.1",
			"16",
			amendedDiary.complications,
			amendedDiary.comorbidities,
		);

		// ДЕФЕКТ 2: diaryHash обязан совпадать с реальным новым текстом!
		assert.equal(
			amendedDiary.diaryHash,
			expectedHash,
			"diaryHash обязан быть пересчитан и соответствовать новому тексту!",
		);

		// Проверяем audit trail: запись в visit_diary_revisions
		const revisions = await db
			.select()
			.from(visitDiaryRevisions)
			.where(
				and(
					eq(visitDiaryRevisions.diaryId, amendedDiary.id),
					eq(visitDiaryRevisions.organizationId, organizationId),
				),
			);

		assert.ok(revisions.length >= 1, "Ревизия «Исправленному верить» должна быть сохранена");
		assert.equal(revisions[0]?.revisionReason, "Исправленному верить");
		assert.equal(revisions[0]?.previousTreatmentDescription, "Пломба 16");
	});

	test("ДЕФЕКТ 4: Icd10ClinicalValidator автоподставляет Z01.2 при отсутствии диагноза (Мандат 8e)", () => {
		const emptyRes = Icd10ClinicalValidator.validate("");
		assert.equal(emptyRes.isValid, true);
		if (emptyRes.isValid) {
			assert.equal(emptyRes.normalizedCode, "Z01.2");
			assert.equal(emptyRes.isToothSpecific, false);
		}

		const nullRes = Icd10ClinicalValidator.validate(null);
		assert.equal(nullRes.isValid, true);
		if (nullRes.isValid) {
			assert.equal(nullRes.normalizedCode, "Z01.2");
		}
	});

	test("ДЕФЕКТ 5: upsertVisitDraftAutosaveInDb разрешает сохранение черновика при закрытом/подписанном визите (Мандат 8e)", async () => {
		// Визит уже имеет статус 'signed' из теста acceptVisitDraftInDb
		const [currentVisit] = await db
			.select()
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, organizationId)))
			.limit(1);

		assert.equal(currentVisit?.status, "signed", "Визит должен быть подписан");

		// Врач начинает вносить ревизию («Исправленному верить») в подписанный визит:
		// Раньше код выбрасывал Error('Прием уже закрыт или аннулирован') и отдавал 409
		const draftResult = await upsertVisitDraftAutosaveInDb(organizationId, {
			visitId,
			patientId,
			selectedSpecialty: "therapist",
			transcript: "Уточнение протокола лечения зуба 16",
			draft: {
				complaint: "Жалоб нет, контрольный осмотр",
				anamnesis: "Ранее проведено пломбирование 16",
				objectiveStatus: "Пломба в прикусе, краевое прилегание идеальное",
				diagnosis: "K02.1",
				diagnosisTooth: "16",
				treatmentPlan: "Полировка и покрытие фторлаком",
				warnings: [],
			},
		});

		assert.ok(draftResult, "Черновик должен успешно сохраниться");
		assert.equal(draftResult.draft.complaint, "Жалоб нет, контрольный осмотр");
		assert.equal(draftResult.draft.treatmentPlan, "Полировка и покрытие фторлаком");

		// Проверяем, что draftAutosave в таблице visits обновился без порчи статуса signed
		const [updatedVisit] = await db
			.select()
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, organizationId)))
			.limit(1);

		assert.equal(updatedVisit?.status, "signed", "Статус визита остается signed");
		assert.ok(updatedVisit?.draftAutosave, "draftAutosave в БД заполнен");
		const savedAutosave = updatedVisit.draftAutosave as { draft?: { treatmentPlan?: string } };
		assert.equal(savedAutosave?.draft?.treatmentPlan, "Полировка и покрытие фторлаком");
	});

	test("ДЕФЕКТ 6: executeDiaryReviseTx успешно выполняет каноническую ревизию закрытого дневника", async () => {
		// Берем дневник зуба 16
		const [diary16] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, organizationId),
					eq(visitDiaries.diagnosisTooth, "16"),
				),
			)
			.limit(1);

		assert.ok(diary16, "Дневник зуба 16 должен существовать");

		// Убедимся, что он заблокирован для ревизии (isLocked = true)
		if (!diary16.isLocked) {
			await db
				.update(visitDiaries)
				.set({ isLocked: true })
				.where(eq(visitDiaries.id, diary16.id));
		}

		const reviseResult = await executeDiaryReviseTx({
			id: diary16.id,
			orgId: organizationId,
			userId: doctorUserId,
			role: "doctor",
			body: {
				complaint: "Жалобы отсутствуют после полировки",
				treatmentDescription: "Окончательная полировка насадками Enhance и покрытие Bifluorid 12",
				revisionReason: "Исправленному верить",
			},
		});

		assert.equal(reviseResult.kind, "ok", "executeDiaryReviseTx должен вернуть kind: ok");
		assert.ok(reviseResult.hash, "Новый diaryHash должен быть сформирован");

		// Проверяем в БД
		const [revisedDiary] = await db
			.select()
			.from(visitDiaries)
			.where(eq(visitDiaries.id, diary16.id))
			.limit(1);

		assert.equal(revisedDiary?.treatmentDescription, "Окончательная полировка насадками Enhance и покрытие Bifluorid 12");
		assert.equal(revisedDiary?.complaint, "Жалобы отсутствуют после полировки");
		assert.equal(revisedDiary?.diaryHash, reviseResult.hash);
	});
});
