import assert from "node:assert";
import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	createPatientInDb,
	getPatientsFromDb,
	rowToPatient,
	updatePatientAdministrativeProfileInDb,
	updatePatientInDb,
} from "../../db/patientsQuery.js";
import * as schema from "../../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

/**
 * Сбой базы не должен выглядеть как успешная работа.
 *
 * Раньше все четыре функции ловили любую ошибку и молча возвращали данные
 * из массива-образца в оперативной памяти.
 *
 * Тесты фиксируют обратное поведение: ошибка базы доходит до вызывающего
 * кода, чтобы маршрут ответил честно.
 *
 * Для тестов 1-4 (сбои базы) используются разрешения R1 на фаулт-инжекшн.
 * Для контрольных тестов 5-7 создаются реальные записи в PostgreSQL 18.
 */

const ORG = fixtureUuid("m2.patientsQuery.test", 1);
const ORG_2 = fixtureUuid("m2.patientsQuery.test", 2);
const PATIENT = fixtureUuid("m2.patientsQuery.test", 10);
const DB_DOWN = new Error("сбой соединения с базой");

let savedPersistence: string | undefined;

describe("patientsQuery: сбой базы не подменяется памятью", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG, ORG_2]);
		await withFixtureTenant(ORG, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG,
				name: "Test Patients Org 1",
			});
		});
		await withFixtureTenant(ORG_2, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG_2,
				name: "Test Patients Org 2",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG, ORG_2]);
	});

	beforeEach(async () => {
		savedPersistence = process.env.DENTAL_STATE_PERSISTENCE;
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		test.mock.restoreAll();
	});

	afterEach(() => {
		test.mock.restoreAll();
		if (savedPersistence === undefined)
			delete process.env.DENTAL_STATE_PERSISTENCE;
		else process.env.DENTAL_STATE_PERSISTENCE = savedPersistence;
	});

	test("getPatientsFromDb передаёт ошибку наружу при сбое базы (ошибка синтаксиса UUID)", async () => {
		await assert.rejects(
			() => getPatientsFromDb("not-a-uuid"),
			(err: any) => /invalid input syntax|неверный синтаксис.*uuid/i.test(`${err?.message || ""} ${err?.cause?.message || ""}`)
		);
	});

	test("createPatientInDb передаёт ошибку наружу при невалидных данных (ошибка синтаксиса UUID)", async () => {
		await assert.rejects(
			() => createPatientInDb("not-a-uuid", { fullName: "Проба Проверочная" } as never),
			(err: any) => /invalid input syntax|неверный синтаксис.*uuid/i.test(`${err?.message || ""} ${err?.cause?.message || ""}`)
		);
	});

	test("updatePatientInDb передаёт ошибку наружу при невалидных данных", async () => {
		await assert.rejects(
			() =>
				updatePatientInDb("not-a-uuid", PATIENT, {
					fullName: "Проба Проверочная",
				} as never),
			(err: any) => /invalid input syntax|неверный синтаксис.*uuid/i.test(`${err?.message || ""} ${err?.cause?.message || ""}`)
		);
	});

	test("updatePatientAdministrativeProfileInDb передаёт ошибку наружу при невалидных данных", async () => {
		await assert.rejects(
			() =>
				updatePatientAdministrativeProfileInDb("not-a-uuid", PATIENT, {
					vipStatus: true,
				} as never),
			(err: any) => /invalid input syntax|неверный синтаксис.*uuid/i.test(`${err?.message || ""} ${err?.cause?.message || ""}`)
		);
	});

	test("контроль: при исправной базе список пациентов возвращается как есть", async () => {
		await withFixtureTenant(ORG, async (tx) => {
			await tx
				.delete(schema.patients)
				.where(eq(schema.patients.id, PATIENT));
			await tx.insert(schema.patients).values({
				id: PATIENT,
				organizationId: ORG,
				fullName: "Иванов Иван Иванович",
				status: "active",
			});
		});

		const patientsList = await withFixtureTenant(ORG, async () => {
			return getPatientsFromDb(ORG);
		});

		const found = patientsList.find((p) => p.id === PATIENT);
		assert.ok(found);
		assert.equal(found.fullName, "Иванов Иван Иванович");
	});

	test("контроль: обновление возвращает изменённую строку, когда база отвечает", async () => {
		await withFixtureTenant(ORG, async (tx) => {
			await tx
				.delete(schema.patients)
				.where(eq(schema.patients.id, PATIENT));
			await tx.insert(schema.patients).values({
				id: PATIENT,
				organizationId: ORG,
				fullName: "Иванов Иван Иванович",
				status: "active",
			});
		});

		const patient = await withFixtureTenant(ORG, async () => {
			return updatePatientInDb(ORG, PATIENT, {
				fullName: "Петров Пётр Петрович",
			} as never);
		});

		assert.ok(patient);
		assert.equal(patient.fullName, "Петров Пётр Петрович");

		// Проверяем физическое изменение в PostgreSQL 18
		const [dbRow] = await withFixtureTenant(ORG, async (tx) => {
			return tx
				.select()
				.from(schema.patients)
				.where(eq(schema.patients.id, PATIENT));
		});
		assert.ok(dbRow);
		assert.equal(dbRow.fullName, "Петров Пётр Петрович");
	});

	test("обновление чужой карточки возвращает null: строка не найдена в своей организации", async () => {
		await withFixtureTenant(ORG, async (tx) => {
			await tx
				.delete(schema.patients)
				.where(eq(schema.patients.id, PATIENT));
			await tx.insert(schema.patients).values({
				id: PATIENT,
				organizationId: ORG,
				fullName: "Иванов Иван Иванович",
				status: "active",
			});
		});

		const patient = await withFixtureTenant(ORG_2, async () => {
			return updatePatientInDb(ORG_2, PATIENT, {
				fullName: "Чужой",
			} as never);
		});

		assert.equal(patient, null);

		// Убеждаемся в БД, что карточка клиники 1 не была изменена чужим запросом
		const [dbRow] = await withFixtureTenant(ORG, async (tx) => {
			return tx
				.select()
				.from(schema.patients)
				.where(eq(schema.patients.id, PATIENT));
		});
		assert.ok(dbRow);
		assert.equal(dbRow.fullName, "Иванов Иван Иванович");
	});
});

test("строка без отметок времени называет пациента и поле, а не роняет map", () => {
	const brokenRow = {
		id: "123e4567-e89b-12d3-a456-426614174000",
		organizationId: "123e4567-e89b-12d3-a456-4266141740ff",
		status: "active",
		fullName: "Тестов Тест",
		birthDate: null,
		phone: null,
		email: null,
		notes: null,
		administrativeProfile: null,
		familyGroupId: null,
		isSynced: false,
		version: 1,
		updatedAt: new Date("2026-01-02T00:00:00.000Z"),
	} as unknown as Parameters<typeof rowToPatient>[0];

	assert.throws(
		() => rowToPatient(brokenRow),
		(error: unknown) =>
			error instanceof Error &&
			error.message.includes("123e4567-e89b-12d3-a456-426614174000") &&
			error.message.includes("created_at"),
	);
});

test("отметку времени принимает и строкой, и объектом Date", () => {
	const asDate = rowToPatient({
		id: "123e4567-e89b-12d3-a456-426614174001",
		organizationId: "123e4567-e89b-12d3-a456-4266141740ff",
		status: "active",
		fullName: "Тестов Тест",
		birthDate: null,
		phone: null,
		email: null,
		notes: null,
		administrativeProfile: null,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-02T00:00:00.000Z"),
	} as never);
	assert.equal(asDate.createdAt, "2026-01-01T00:00:00.000Z");

	const asString = rowToPatient({
		id: "123e4567-e89b-12d3-a456-426614174002",
		organizationId: "123e4567-e89b-12d3-a456-4266141740ff",
		status: "active",
		fullName: "Тестов Тест",
		birthDate: null,
		phone: null,
		email: null,
		notes: null,
		administrativeProfile: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-02T00:00:00.000Z",
	} as never);
	assert.equal(asString.updatedAt, "2026-01-02T00:00:00.000Z");
});
