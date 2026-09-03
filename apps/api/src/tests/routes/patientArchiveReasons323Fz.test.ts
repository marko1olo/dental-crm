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
	familyGroups,
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
import { findDuplicateCandidates } from "../../services/patients/duplicateDetection.js";
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
const FAMILY_GROUP_ID = fixtureUuid(NAMESPACE, 13);
const PATIENT_SNILS_1_ID = fixtureUuid(NAMESPACE, 20);
const PATIENT_SNILS_2_ID = fixtureUuid(NAMESPACE, 21);

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

			await tx.insert(familyGroups).values({
				id: FAMILY_GROUP_ID,
				organizationId: ORG_ID,
				name: "Семья Ивановых",
				balance: "5000.00",
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
					// Основная карточка имеет заполненный ИНН, но нет СНИЛС, паспорта и веса
					administrativeProfile: {
						taxpayerInn: "770123456789",
					},
				},
				{
					id: DUPLICATE_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Дубль",
					phone: "+79991112233",
					status: "active",
					weightKg: "78.50",
					familyGroupId: FAMILY_GROUP_ID,
					// Дубль имеет СНИЛС, паспорт, полис ОМС и другой ИНН (который не должен перетереть основной)
					administrativeProfile: {
						snils: "123-456-789 00",
						identityDocument: "Паспорт РФ 4510 123456",
						insurancePolicyNumber: "1234567890123456",
						taxpayerInn: "999999999999",
						residentialAddress: "г. Москва, ул. Ленина, д. 10",
					},
				},
				// Пациенты для теста обнаружения дублей по СНИЛС
				{
					id: PATIENT_SNILS_1_ID,
					organizationId: ORG_ID,
					fullName: "Сидорова Анна Павловна",
					phone: "+79995556677",
					status: "active",
					administrativeProfile: {
						snils: "987-654-321 00",
					},
				},
				{
					id: PATIENT_SNILS_2_ID,
					organizationId: ORG_ID,
					fullName: "Кузнецова Анна Павловна", // Сменила фамилию, телефон другой, но СНИЛС тот же!
					phone: "+79998889900",
					status: "active",
					administrativeProfile: {
						snils: "987-654-321 00",
					},
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

	it("5. При слиянии карт переносятся СНИЛС, паспорт, полис ОМС, вес и семейная группа, не затирая существующие данные", async () => {
		const [primaryInDb] = await db
			.select()
			.from(patients)
			.where(
				and(eq(patients.id, PATIENT_B_ID), eq(patients.organizationId, ORG_ID)),
			);
		assert.ok(primaryInDb, "Основной пациент должен существовать");

		// Проверяем перенос веса и семейной группы
		assert.equal(Number(primaryInDb.weightKg), 78.5, "Вес должен перенестись из дубля");
		assert.equal(
			primaryInDb.familyGroupId,
			FAMILY_GROUP_ID,
			"Семейная группа должна перенестись из дубля",
		);

		// Проверяем слияние административного профиля
		const admin = primaryInDb.administrativeProfile as Record<string, unknown>;
		assert.ok(admin, "Профиль должен существовать");
		assert.equal(admin.snils, "123-456-789 00", "СНИЛС должен перенестись из дубля");
		assert.equal(
			admin.identityDocument,
			"Паспорт РФ 4510 123456",
			"Паспорт должен перенестись",
		);
		assert.equal(
			admin.insurancePolicyNumber,
			"1234567890123456",
			"Полис ОМС/ДМС должен перенестись",
		);
		assert.equal(
			admin.residentialAddress,
			"г. Москва, ул. Ленина, д. 10",
			"Адрес должен перенестись",
		);
		// ИНН был в основной карточке изначально ("770123456789") и НЕ должен быть затерт ИНН дубля ("999999999999")
		assert.equal(
			admin.taxpayerInn,
			"770123456789",
			"Существующий ИНН основной карточки не должен перезаписываться",
		);

		// Проверяем запись причины архивации дубля по 323-ФЗ
		const [duplicateArchive] = await db
			.select()
			.from(patientArchiveReasonsAndBlacklists)
			.where(
				and(
					eq(patientArchiveReasonsAndBlacklists.patientId, DUPLICATE_PATIENT_ID),
					eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
				),
			);
		assert.ok(duplicateArchive, "В журнале архивации должна быть запись о дубле");
		assert.equal(duplicateArchive.reasonCode, "DUPLICATE_CARD_MERGED");
		assert.match(duplicateArchive.legalBasis ?? "", /834н/);
	});

	it("6. Поиск дублей через findDuplicateCandidates обнаруживает пациентов с одинаковым СНИЛС (same_snils, confidence 0.98)", async () => {
		const report = await findDuplicateCandidates(ORG_ID);
		const snilsCandidate = report.candidates.find(
			(c) =>
				(c.leftPatientId === PATIENT_SNILS_1_ID &&
					c.rightPatientId === PATIENT_SNILS_2_ID) ||
				(c.leftPatientId === PATIENT_SNILS_2_ID &&
					c.rightPatientId === PATIENT_SNILS_1_ID),
		);

		assert.ok(
			snilsCandidate,
			"Кандидат с одинаковым СНИЛС должен быть найден в очереди дублей",
		);
		assert.equal(snilsCandidate.reason, "same_snils");
		assert.equal(snilsCandidate.confidence, 0.98);
		assert.match(snilsCandidate.explanation, /СНИЛС/);
	});
});
