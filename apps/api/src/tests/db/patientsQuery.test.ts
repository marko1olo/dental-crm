import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import {
	createPatientInDb,
	getPatientsFromDb,
	updatePatientInDb,
	updatePatientAdministrativeProfileInDb,
} from "../../db/patientsQuery.js";
import { db } from "../../db/client.js";

/**
 * Сбой базы не должен выглядеть как успешная работа.
 *
 * Раньше все четыре функции ловили любую ошибку и молча возвращали данные
 * из массива-образца в оперативной памяти. Наблюдаемые последствия,
 * замеренные на живом API:
 *   создание пациента при неудачной вставке -> HTTP 201 и идентификатор,
 *     которому в таблице patients соответствует ноль строк;
 *   обновление при неудачной записи -> HTTP 200, в базе без изменений;
 *   чтение списка при сбое -> отдавался глобальный образец, не
 *     отфильтрованный по организации.
 *
 * Тесты фиксируют обратное поведение: ошибка базы доходит до вызывающего
 * кода, чтобы маршрут ответил честно.
 */

const ORG = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const PATIENT = "5755a8aa-73e3-40ce-9faf-e7bebe399cd4";
const DB_DOWN = new Error("сбой соединения с базой");

// Функции уходят в память при DENTAL_STATE_PERSISTENCE=off, поэтому для
// этих тестов режим без базы должен быть выключен.
let savedPersistence: string | undefined;

describe("patientsQuery: сбой базы не подменяется памятью", () => {
	beforeEach(() => {
		savedPersistence = process.env.DENTAL_STATE_PERSISTENCE;
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		test.mock.restoreAll();
	});

	afterEach(() => {
		test.mock.restoreAll();
		if (savedPersistence === undefined) delete process.env.DENTAL_STATE_PERSISTENCE;
		else process.env.DENTAL_STATE_PERSISTENCE = savedPersistence;
	});

	test("getPatientsFromDb передаёт ошибку наружу, а не отдаёт массив-образец", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: async () => {
					throw DB_DOWN;
				},
			}),
		}));

		await assert.rejects(() => getPatientsFromDb(ORG), /сбой соединения с базой/);
	});

	test("createPatientInDb передаёт ошибку наружу, а не выдаёт несуществующий идентификатор", async (t) => {
		t.mock.method(db, "insert", () => ({
			values: () => ({
				returning: async () => {
					throw DB_DOWN;
				},
			}),
		}));

		await assert.rejects(() => createPatientInDb(ORG, { fullName: "Проба Проверочная" } as never), /сбой соединения с базой/);
	});

	test("updatePatientInDb передаёт ошибку наружу, а не отвечает успехом", async (t) => {
		t.mock.method(db, "update", () => ({
			set: () => ({
				where: () => ({
					returning: async () => {
						throw DB_DOWN;
					},
				}),
			}),
		}));

		await assert.rejects(
			() => updatePatientInDb(ORG, PATIENT, { fullName: "Проба Проверочная" } as never),
			/сбой соединения с базой/,
		);
	});

	test("updatePatientAdministrativeProfileInDb передаёт ошибку наружу", async (t) => {
		t.mock.method(db, "update", () => ({
			set: () => ({
				where: () => ({
					returning: async () => {
						throw DB_DOWN;
					},
				}),
			}),
		}));

		await assert.rejects(
			() => updatePatientAdministrativeProfileInDb(ORG, PATIENT, { vipStatus: true } as never),
			/сбой соединения с базой/,
		);
	});

	test("контроль: при исправной базе список пациентов возвращается как есть", async (t) => {
		t.mock.method(db, "select", () => ({
			from: () => ({
				where: async () => [
					{
						id: PATIENT,
						organizationId: ORG,
						fullName: "Иванов Иван Иванович",
						birthDate: null,
						phone: null,
						email: null,
						notes: null,
						administrativeProfile: null,
						status: "active",
						createdAt: new Date("2026-01-01T00:00:00.000Z"),
						updatedAt: new Date("2026-01-02T00:00:00.000Z"),
					},
				],
			}),
		}));

		const patients = await getPatientsFromDb(ORG);
		assert.equal(patients.length, 1);
		assert.equal(patients[0]?.fullName, "Иванов Иван Иванович");
		assert.equal(patients[0]?.id, PATIENT);
	});

	test("контроль: обновление возвращает изменённую строку, когда база отвечает", async (t) => {
		t.mock.method(db, "update", () => ({
			set: () => ({
				where: () => ({
					returning: async () => [
						{
							id: PATIENT,
							organizationId: ORG,
							fullName: "Петров Пётр Петрович",
							birthDate: null,
							phone: null,
							email: null,
							notes: null,
							administrativeProfile: null,
							status: "active",
							createdAt: new Date("2026-01-01T00:00:00.000Z"),
							updatedAt: new Date("2026-01-02T00:00:00.000Z"),
						},
					],
				}),
			}),
		}));

		const patient = await updatePatientInDb(ORG, PATIENT, { fullName: "Петров Пётр Петрович" } as never);
		assert.equal(patient?.fullName, "Петров Пётр Петрович");
	});

	test("обновление чужой карточки возвращает null: строка не найдена в своей организации", async (t) => {
		// Условие WHERE теперь содержит organizationId, поэтому чужая строка
		// не попадает под обновление и returning() пуст.
		t.mock.method(db, "update", () => ({
			set: () => ({
				where: () => ({
					returning: async () => [],
				}),
			}),
		}));

		const patient = await updatePatientInDb(ORG, PATIENT, { fullName: "Чужой" } as never);
		assert.equal(patient, null);
	});
});
