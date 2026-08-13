import assert from "node:assert";
import { after, afterEach, before, describe, it, mock } from "node:test";
import type { ImagingSourceKind, Patient } from "@dental/shared";
import { db } from "../../db/client.js";
import { patients } from "../../sampleData.js";
import { commitImagingImport } from "../imaging.js";

/**
 * Импорт снимков давно пишет в базу через createImagingStudyInDb, а не в
 * массив imagingStudies в памяти.
 *
 * Тест ждал появления записи именно в массиве и звал commitImagingImport с
 * orgId "mock-org". Массив не пополнялся никогда, а запрос уходил в живую базу
 * и падал на «invalid input syntax for type uuid: "mock-org"». То есть
 * разбор манифеста тест не проверял вовсе.
 *
 * Сопоставление пациента по ФИО и телефону идёт по данным в памяти и базы не
 * требует, поэтому подменяется только db.insert — и проверяется то, что
 * действительно уходит в базу.
 */
const ORG_ID = "123e4567-e89b-12d3-a456-4266141740ff";

/**
 * Пациента тест заводит сам, а не берёт patients[0].
 *
 * Демонстрационные данные в памяти перетираются сохранённым состоянием: если
 * рядом с рабочим каталогом лежит .data/dental-crm-state.json (а он лежит в
 * репозитории и содержит пустые массивы), applyPersistentState очищает
 * patients при загрузке модуля. Из корня репозитория patients[0] оказывается
 * undefined, из apps/api — нет. Тест не должен зависеть от того, откуда его
 * запустили.
 */
const testPatient = {
	id: "123e4567-e89b-12d3-a456-4266141740aa",
	organizationId: ORG_ID,
	fullName: "Тестов Тест Тестович",
	phone: "+79990000000",
} as unknown as Patient;

/**
 * Строка ровно в том виде, в котором её отдаёт база.
 *
 * Подменённый db.select раньше возвращал testPatient — объект прикладной
 * формы Patient, без createdAt и updatedAt. getPatientsFromDb прогоняет
 * строки через rowToPatient, тот звал p.createdAt.toISOString() и падал.
 * Тест это не замечал, потому что getPatientsFromDb ловил любую ошибку и
 * молча отдавал массив patients из памяти, куда тест сам положил
 * testPatient. То есть проверялся путь через память, хотя в комментарии
 * заявлен путь через базу.
 *
 * Подмена памятью убрана как источник молчаливой потери данных, поэтому
 * фикстура теперь честно повторяет форму строки таблицы.
 */
const testPatientRow = {
	id: testPatient.id,
	organizationId: ORG_ID,
	status: "active",
	fullName: "Тестов Тест Тестович",
	birthDate: null,
	phone: "+79990000000",
	email: null,
	notes: null,
	administrativeProfile: null,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("commitImagingImport", () => {
	before(() => {
		patients.push(testPatient);
	});

	after(() => {
		const index = patients.indexOf(testPatient);
		if (index >= 0) patients.splice(index, 1);
	});

	afterEach(() => {
		mock.restoreAll();
	});

	it("processes valid records only and maps properties to the created study correctly", async () => {
		const patient = testPatient;

		// Сопоставление идёт через getPatientsFromDb, то есть по базе, а не по
		// массиву в памяти: подменяем и выборку пациентов. Возвращаем строку
		// таблицы, а не прикладной объект, — иначе rowToPatient не отработает.
		mock.method(db, "select", () => ({
			from: () => ({
				where: () => Object.assign(Promise.resolve([testPatientRow]), {
					limit: () => Promise.resolve([testPatientRow])
				})
			}),
		}));

		const insertedValues: Array<Record<string, unknown>> = [];
		mock.method(db, "insert", () => ({
			values: (values: Record<string, unknown>) => {
				insertedValues.push(values);
				return {
					// Ответ проходит через схему: идентификатор обязан быть UUID.
					returning: async () => [
						{
							id: `123e4567-e89b-12d3-a456-42661417${String(insertedValues.length).padStart(4, "0")}`,
							...values,
							createdAt: new Date(),
						},
					],
				};
			},
		}));

		const input = {
			sourceName: "test_import",
			sourceKind: "folder_watch" as ImagingSourceKind,
			rawText: [
				"fio|modality|filePath|title|phone|tooth|region|date",
				// Valid row
				`${patient.fullName}|opg|C:\\scans\\valid.dcm|Test OPG|${patient.phone}|12, 13|Maxilla|2023-10-27T10:00:00Z`,
				// Invalid row (missing patient name, won't match)
				`|opg|C:\\scans\\invalid.dcm|Invalid OPG||||`,
				// Invalid row (no filepath)
				`${patient.fullName}|opg||Missing Path|${patient.phone}|||`,
			].join("\n"),
		};

		const result = await commitImagingImport(ORG_ID, input);

		assert.strictEqual(result.preview.totalRows, 3);
		assert.strictEqual(result.importedCount, 1);
		assert.strictEqual(result.skippedCount, 2);
		assert.strictEqual(result.createdStudyIds.length, 1);

		// Ровно одна строка признана готовой — только она и уходит в базу.
		assert.strictEqual(insertedValues.length, 1);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const stored = insertedValues[0]!;
		assert.strictEqual(stored.organizationId, ORG_ID);
		assert.strictEqual(stored.patientId, patient.id);
		assert.strictEqual(stored.kind, "opg");
		assert.strictEqual(stored.title, "Test OPG");
		assert.strictEqual(stored.toothCode, "12, 13");
		assert.strictEqual(stored.region, "Maxilla");
		assert.strictEqual(stored.sourceKind, "dicom_file");
		assert.strictEqual(stored.sourceName, "test_import");
		assert.strictEqual(stored.storagePath, "C:\\scans\\valid.dcm");
		assert.strictEqual(
			(stored.capturedAt as Date).toISOString(),
			"2023-10-27T10:00:00.000Z",
		);
		/*
		 * Импорт больше не записывает заключение ИИ. Раньше сюда клали строку
		 * «Импортировано из …», а экран «Снимки» считает непустой aiSummary
		 * признаком состоявшегося разбора: у импортированного снимка загорался
		 * бейдж «AI» и раскрывалась панель «ShadowAnalyst · AI Expert» с этой
		 * служебной фразой в разделе «Заключение». Поле заполняет только
		 * настоящий разбор.
		 */
		assert.strictEqual(stored.aiSummary, null);
	});

	it("не пишет в базу, если готовых строк нет", async () => {
		let insertCalls = 0;
		mock.method(db, "insert", () => {
			insertCalls += 1;
			return { values: () => ({ returning: async () => [] }) };
		});

		const result = await commitImagingImport(ORG_ID, {
			sourceName: "test_import",
			sourceKind: "folder_watch" as ImagingSourceKind,
			rawText: [
				"fio|modality|filePath|title|phone|tooth|region|date",
				`|opg|||||`,
			].join("\n"),
		});

		assert.strictEqual(result.importedCount, 0);
		assert.strictEqual(insertCalls, 0);
	});
});
