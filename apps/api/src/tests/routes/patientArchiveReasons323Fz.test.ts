import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { createAppointmentInDb } from "../../db/appointmentsQuery.js";
import {
	checkPatientBookingBlockDetails,
	inMemoryBlacklist,
} from "../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import { getPatientsFromDb } from "../../db/patientsQuery.js";
import {
	organizations,
	patientArchiveReasons,
	patientArchiveReasonsAndBlacklists,
	patients,
	users,
} from "../../db/schema.js";
import {
	DEFAULT_323_FZ_ARCHIVE_REASONS,
	PatientArchiveReasonService,
} from "../../services/patients/PatientArchiveReasonService.js";
import { mergePatients } from "../../services/patients/patientMerge.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "patientArchive323Fz";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_A_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_B_ID = fixtureUuid(NAMESPACE, 11);
const DUPLICATE_PATIENT_ID = fixtureUuid(NAMESPACE, 12);

describe("Patient Archive Reasons & Booking Prohibition (323-ФЗ)", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника 323-ФЗ Аудит Архива",
			});

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "doctor.archive323@dente.pro",
				role: "doctor",
				fullName: "Доктор Стоматологов-Хирург",
			});

			await tx.insert(patients).values([
				{
					id: PATIENT_A_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович",
					phone: "+79991112233",
					status: "active",
				},
				{
					id: PATIENT_B_ID,
					organizationId: ORG_ID,
					fullName: "Петров Петр Петрович",
					phone: "+79992223344",
					status: "active",
				},
				{
					id: DUPLICATE_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Дубль",
					phone: "+79991112233",
					status: "active",
				},
			]);
		});
	});

	after(async () => {
		inMemoryBlacklist.clear();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("1. Автоматически инициализирует нормативный справочник причин списания в архив по 323-ФЗ", async () => {
		const reasons = await PatientArchiveReasonService.listReasons(ORG_ID);
		assert.ok(
			reasons.length >= DEFAULT_323_FZ_ARCHIVE_REASONS.length,
			"Должны быть заполнены все стандартные причины архивации",
		);

		const relocation = reasons.find((r) => r.code === "RELOCATION");
		assert.ok(relocation, "Причина RELOCATION должна присутствовать");
		assert.match(
			relocation.legalBasis,
			/323-ФЗ/,
			"Правовое основание должно ссылаться на 323-ФЗ",
		);
		assert.equal(
			relocation.isBookingBlocked,
			true,
			"Смена места жительства должна блокировать запись",
		);

		const deceased = reasons.find((r) => r.code === "DECEASED");
		assert.ok(deceased, "Причина DECEASED должна присутствовать");
		assert.match(
			deceased.legalBasis,
			/834н/,
			"Причина смерти должна ссылаться на приказ Минздрава 834н",
		);
		assert.equal(
			deceased.requiresDocumentation,
			true,
			"Смерть требует подтверждающего документа",
		);
	});

	it("2. Списание карты в архив по 323-ФЗ фиксирует правовое основание и запрещает запись на приём", async () => {
		// Списываем пациента А в архив в связи с переездом (ст. 21 323-ФЗ)
		const archiveResult = await PatientArchiveReasonService.archivePatient(
			ORG_ID,
			{
				patientId: PATIENT_A_ID,
				reasonCode: "RELOCATION",
				actorUserId: DOCTOR_ID,
			},
		);

		assert.equal(archiveResult.success, true);
		assert.equal(archiveResult.isBookingBlocked, true);
		assert.match(archiveResult.legalBasis, /323-ФЗ, ст\. 21/);

		// Проверяем статус в БД
		const [patientInDb] = await db
			.select()
			.from(patients)
			.where(
				and(eq(patients.id, PATIENT_A_ID), eq(patients.organizationId, ORG_ID)),
			);
		assert.ok(patientInDb, "Пациент должен существовать в БД");
		assert.equal(patientInDb.status, "archived");

		// Проверяем запись в таблице patient_archive_reasons_and_blacklists
		const [archiveLog] = await db
			.select()
			.from(patientArchiveReasonsAndBlacklists)
			.where(
				and(
					eq(patientArchiveReasonsAndBlacklists.patientId, PATIENT_A_ID),
					eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
				),
			);
		assert.ok(archiveLog, "Запись в журнале архивации должна существовать");
		assert.equal(archiveLog.reasonCode, "RELOCATION");
		assert.match(archiveLog.legalBasis ?? "", /323-ФЗ/);

		// Проверяем проверку блокировки записи
		const blockDetails = await checkPatientBookingBlockDetails(
			ORG_ID,
			PATIENT_A_ID,
		);
		assert.equal(blockDetails.isBlocked, true);
		assert.match(blockDetails.legalBasis ?? "", /323-ФЗ/);

		// Попытка создать приём на архивного пациента должна выбросить Error с указанием 323-ФЗ
		await assert.rejects(
			async () => {
				await createAppointmentInDb(ORG_ID, {
					patientId: PATIENT_A_ID,
					doctorId: DOCTOR_ID,
					startsAt: new Date(Date.now() + 3600000).toISOString(),
					endsAt: new Date(Date.now() + 7200000).toISOString(),
					status: "planned",
					type: "consultation",
				});
			},
			(err: Error) => {
				assert.match(
					err.message,
					/Пациент находится в архиве.*Запись заблокирована/,
				);
				assert.match(err.message, /323-ФЗ/);
				return true;
			},
		);
	});

	it("3. Разархивация восстанавливает статус 'active' и разблокирует создание приемов", async () => {
		const unarchiveResult = await PatientArchiveReasonService.unarchivePatient(
			ORG_ID,
			PATIENT_A_ID,
		);
		assert.equal(unarchiveResult.success, true);

		const [patientInDb] = await db
			.select()
			.from(patients)
			.where(
				and(eq(patients.id, PATIENT_A_ID), eq(patients.organizationId, ORG_ID)),
			);
		assert.ok(patientInDb, "Пациент должен существовать в БД");
		assert.equal(patientInDb.status, "active");

		const blockDetails = await checkPatientBookingBlockDetails(
			ORG_ID,
			PATIENT_A_ID,
		);
		assert.equal(blockDetails.isBlocked, false);
	});

	it("4. При слиянии (merge) двух карт дубль помечается как merged_into_patient_id, скрывается из поиска и блокирует запись", async () => {
		// Сливаем DUPLICATE_PATIENT_ID в PATIENT_B_ID
		const mergeRes = await mergePatients({
			organizationId: ORG_ID,
			primaryPatientId: PATIENT_B_ID,
			duplicatePatientId: DUPLICATE_PATIENT_ID,
			performedByUserId: DOCTOR_ID,
			reason: "Объединение дублирующей карты",
		});

		assert.equal(mergeRes.ok, true, "Слияние должно пройти успешно");

		// Проверяем, что дубль НЕ удален физически, а помечен как архивный и объединенный
		const [duplicateInDb] = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.id, DUPLICATE_PATIENT_ID),
					eq(patients.organizationId, ORG_ID),
				),
			);

		assert.ok(
			duplicateInDb,
			"Вторичная карта НЕ должна удаляться из базы данных",
		);
		assert.equal(duplicateInDb.status, "archived");
		assert.equal(duplicateInDb.mergedIntoPatientId, PATIENT_B_ID);

		// Проверяем, что getPatientsFromDb по умолчанию скрывает объединенные карты
		const visiblePatients = await getPatientsFromDb(ORG_ID);
		const foundMerged = visiblePatients.find(
			(p) => p.id === DUPLICATE_PATIENT_ID,
		);
		assert.equal(
			foundMerged,
			undefined,
			"Объединенная карточка должна скрываться из общего списка",
		);

		// А с флагом includeMerged: true карточка доступна
		const allPatients = await getPatientsFromDb(ORG_ID, {
			includeMerged: true,
		});
		const foundAll = allPatients.find((p) => p.id === DUPLICATE_PATIENT_ID);
		assert.ok(foundAll, "С includeMerged: true карточка должна быть видна");

		// Запись на прием на объединенную карточку дубля заблокирована
		await assert.rejects(
			async () => {
				await createAppointmentInDb(ORG_ID, {
					patientId: DUPLICATE_PATIENT_ID,
					doctorId: DOCTOR_ID,
					startsAt: new Date(Date.now() + 3600000).toISOString(),
					endsAt: new Date(Date.now() + 7200000).toISOString(),
					status: "planned",
					type: "consultation",
				});
			},
			(err: Error) => {
				assert.match(
					err.message,
					/Пациент находится в архиве|Пациент внесен в черный список/,
				);
				return true;
			},
		);
	});
});
