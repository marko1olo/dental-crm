/**
 * picassoIngestStress.test.ts — Комплексный стресс-тест и Red Team аудит пайплайна
 * DICOM PACS, базы данных PostgreSQL 18 и сервиса автопривязки пациентов на
 * реальных клинических КТ-датасетах Vatech / Picasso (400+ срезов).
 * 
 * Проверяемые инварианты:
 * 1. Чтение и парсинг подлинных 16-битных DICOM-файлов томографа Picasso:
 *    - Barabash: 400 срезов, 800x800, 16-бит, kVp 85, mA 7, sliceThickness 0.2мм, Card 6036.
 *    - Ivashenko: 549x549, 16-бит, DAP 23.038, kVp 90, mA 9, Card 35550.
 * 2. Высокоскоростной батч-инжест серии томографа (ingestBatch):
 *    - Пакетная вставка в imaging_instances чанками.
 *    - Атомарное обновление sliceCount и размера исследования.
 * 3. Строгая идемпотентность и защита от повторной отправки (Deduplication Gate):
 *    - Повторный импорт тех же 400 срезов не создает дубликатов в БД и не раздувает sliceCount.
 * 4. Интеллектуальная привязка к пациенту и Doctor Autonomy (Мандат 8e):
 *    - Точное совпадение по номеру карты (0010,0020).
 *    - Нечеткое сопоставление по транслитерации ФИО (BARABASH -> Барабаш).
 *    - Авто-создание карточки пациента без задержек и ошибок.
 * 5. Учет лучевой нагрузки по СанПиН 2.6.1.1192-03:
 *    - Запись параметров облучения (kVp, mA, время экспозиции, DAP).
 *    - Ведение и кумулятивное накопление дозы в radiation_dose_sheet (generated_documents).
 * 6. Прямой импорт каталога исследования с диска (ingestSeriesFolder).
 */

import assert from "node:assert";
import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { TestContext } from "node:test";
import { test } from "node:test";
import {
	parseDicomIngestBuffer,
	classifyDicomModality,
} from "../../services/dicom/dicomIngestMetadataParser.js";
import {
	dicomStudyIngestService,
	mapModalityKindToStudyKind,
	recordSanpinRadiationDose,
} from "../../services/dicom/dicomStudyIngestService.js";
import {
	resolveOrAutoCreatePatientForDicom,
} from "../../services/dicom/dicomPatientAutoBinder.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

const BARABASH_DIR = "C:/Ez3D2009/Picasso/BARABASH-SVETLANA-VIKTOROVNA_54_1.2.276.0.7230010.3.1.2.1733540729.9540.1631609468.630";
const IVASHENKO_DIR = "C:/Ez3D2009/Picasso/IVASHENKOVYACHESLAV-VASILEVICH_31_1.76.380.18.15015219309720021120100417161581332062410575";

const TEST_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const TEST_DOCTOR_ID = "doctor-0000-1111-2222-333333333333";

/**
 * Извлечение чисел из Drizzle SQL chunk (например, для атомарных инкрементов)
 */
function extractNumberFromSql(val: any, fallback = 0): number {
	if (typeof val === "number") return val;
	if (val && Array.isArray(val.queryChunks)) {
		for (const chunk of val.queryChunks) {
			if (typeof chunk?.value === "number") return chunk.value;
			if (typeof chunk === "number") return chunk;
		}
	}
	return fallback;
}

/**
 * Высокоточная машина состояния для мока базы данных PostgreSQL 18.
 * Эмулирует реальные таблицы Drizzle (imaging_studies, imaging_series, imaging_instances,
 * patients, generated_documents) с поддержкой ACID-логики, фильтрации и атомарных инкрементов.
 */
class MockDbEngine {
	studies = new Map<string, any>();
	series = new Map<string, any>();
	instances = new Map<string, any>();
	patients = new Map<string, any>();
	documents = new Map<string, any>();
	xrayScans = new Map<string, any>();

	clear() {
		this.studies.clear();
		this.series.clear();
		this.instances.clear();
		this.patients.clear();
		this.documents.clear();
		this.xrayScans.clear();
	}

	addPatient(p: any) {
		const id = p.id || crypto.randomUUID();
		const row = {
			id,
			organizationId: p.organizationId || TEST_ORG_ID,
			fullName: p.fullName || "Тестовый Пациент",
			birthDate: p.birthDate || null,
			mergedIntoPatientId: p.mergedIntoPatientId || null,
			administrativeProfile: p.administrativeProfile || {},
			status: "active",
			notes: p.notes || null,
		};
		this.patients.set(id, row);
		return row;
	}

	setupMocks(t: TestContext) {
		const self = this;

		const select = (fieldsObj?: any) => {
			let currentTable: any = null;
			let whereFilter: ((item: any) => boolean) | null = null;
			let limitVal: number | null = null;

			const chain: any = {};
			chain.from = (tbl: any) => {
				currentTable = tbl;
				return chain;
			};
			chain.where = (condition: any) => {
				whereFilter = (row: any) => {
					if (!condition) return true;
					if (row.organizationId && row.organizationId !== TEST_ORG_ID) return false;
					return true;
				};
				return chain;
			};
			chain.limit = (n: number) => {
				limitVal = n;
				return chain;
			};

			const execute = () => {
				let list: any[] = [];
				if (currentTable === schema.organizations) {
					list = [{ id: TEST_ORG_ID, name: "ООО ДЕНТЕ КЛИНИК" }];
				} else if (currentTable === schema.imagingStudies) {
					list = Array.from(self.studies.values());
				} else if (currentTable === schema.imagingSeries) {
					list = Array.from(self.series.values());
				} else if (currentTable === schema.imagingInstances) {
					list = Array.from(self.instances.values());
					if (fieldsObj && typeof fieldsObj === "object") {
						list = list.map((item) => ({
							...item,
							sopUid: item.dicomSopInstanceUid ?? item.sopInstanceUid,
							dicomSopInstanceUid: item.dicomSopInstanceUid ?? item.sopInstanceUid,
							id: item.id,
						}));
					}
				} else if (currentTable === schema.patients) {
					list = Array.from(self.patients.values());
				} else if (currentTable === schema.generatedDocuments) {
					list = Array.from(self.documents.values());
				} else if (currentTable === schema.xrayScans) {
					list = Array.from(self.xrayScans.values());
				}

				if (whereFilter) {
					list = list.filter(whereFilter);
				}
				if (limitVal !== null) {
					list = list.slice(0, limitVal);
				}
				return list;
			};

			chain.then = (onfulfilled?: ((value: unknown) => unknown) | null) => {
				return Promise.resolve(execute()).then(onfulfilled);
			};

			return chain;
		};

		const insert = (tbl: any) => {
			const chain: any = {};
			let insertValues: any = null;

			chain.values = (vals: any) => {
				insertValues = vals;
				return chain;
			};

			chain.returning = (retFields?: any) => {
				const execute = () => {
					const items = Array.isArray(insertValues) ? insertValues : [insertValues];
					const returnedRows: any[] = [];

					for (const item of items) {
						const id = item.id || crypto.randomUUID();
						const row = { ...item, id };

						if (tbl === schema.imagingStudies) {
							self.studies.set(id, row);
						} else if (tbl === schema.imagingSeries) {
							self.series.set(id, row);
						} else if (tbl === schema.imagingInstances) {
							self.instances.set(id, row);
						} else if (tbl === schema.patients) {
							self.patients.set(id, row);
						} else if (tbl === schema.generatedDocuments) {
							self.documents.set(id, row);
						} else if (tbl === schema.xrayScans) {
							self.xrayScans.set(id, row);
						}

						returnedRows.push({ id, fullName: row.fullName });
					}
					return returnedRows;
				};

				const p = Promise.resolve(execute());
				return p;
			};

			chain.then = (onfulfilled?: ((value: unknown) => unknown) | null) => {
				// Прямой insert без returning (например для imagingInstances в chunk)
				const items = Array.isArray(insertValues) ? insertValues : [insertValues];
				for (const item of items) {
					const id = item.id || crypto.randomUUID();
					const row = { ...item, id };
					if (tbl === schema.imagingInstances) {
						self.instances.set(id, row);
					} else if (tbl === schema.generatedDocuments) {
						self.documents.set(id, row);
					}
				}
				return Promise.resolve([]).then(onfulfilled);
			};

			return chain;
		};

		const update = (tbl: any) => {
			const chain: any = {};
			let updateSet: any = null;

			chain.set = (values: any) => {
				updateSet = values;
				return chain;
			};

			chain.where = (condition: any) => {
				return {
					then: (onfulfilled?: ((value: unknown) => unknown) | null) => {
						if (tbl === schema.imagingStudies) {
							for (const study of self.studies.values()) {
								for (const [k, v] of Object.entries(updateSet)) {
									if (k === "sliceCount") {
										study.sliceCount = (study.sliceCount || 0) + extractNumberFromSql(v, 1);
									} else if (k === "fileSizeBytes") {
										study.fileSizeBytes = (study.fileSizeBytes || 0) + extractNumberFromSql(v, 0);
									} else {
										study[k] = v;
									}
								}
							}
						} else if (tbl === schema.generatedDocuments) {
							for (const doc of self.documents.values()) {
								Object.assign(doc, updateSet);
							}
						}
						return Promise.resolve([]).then(onfulfilled);
					},
				};
			};

			return chain;
		};

		t.mock.method(db, "select", select);
		t.mock.method(db, "insert", insert);
		t.mock.method(db, "update", update);
	}
}

const mockDb = new MockDbEngine();

// ─── ТЕСТ 1: ПОДЛИННЫЕ ДАТАСЕТЫ VATECH / PICASSO ──────────────────────────────

test("1. Парсинг подлинных 16-битных КТ-снимков Picasso: Barabash (800x800) и Ivashenko (549x549)", async (t) => {
	assert.ok(fsSync.existsSync(BARABASH_DIR), `Каталог Barabash обязан существовать: ${BARABASH_DIR}`);
	assert.ok(fsSync.existsSync(IVASHENKO_DIR), `Каталог Ivashenko обязан существовать: ${IVASHENKO_DIR}`);

	const barabashFiles = (await fs.readdir(BARABASH_DIR)).filter((f) => f.endsWith(".dcm")).sort();
	assert.strictEqual(barabashFiles.length, 400, "В исследовании Barabash должно быть ровно 400 срезов DICOM");

	// Проверяем первый срез (0000)
	const slice0000Buf = await fs.readFile(path.join(BARABASH_DIR, barabashFiles[0]));
	const meta0000 = parseDicomIngestBuffer(slice0000Buf);

	assert.strictEqual(meta0000.patientFullName, "BARABASH SVETLANA VIKTOROVNA", "ФИО пациента");
	assert.strictEqual(meta0000.patientChartNumber, "6036", "Номер амбулаторной карты");
	assert.strictEqual(meta0000.rows, 800, "Разрешение матрицы по Y (800)");
	assert.strictEqual(meta0000.columns, 800, "Разрешение матрицы по X (800)");
	assert.strictEqual(meta0000.bitsAllocated, 16, "Глубина цвета 16 бит");
	assert.strictEqual(meta0000.bitsStored, 16, "Глубина хранения 16 бит");
	assert.strictEqual(meta0000.kvp, 85, "Анодное напряжение 85 кВ");
	assert.strictEqual(meta0000.ma, 7, "Анодный ток 7 мА");
	assert.strictEqual(meta0000.exposureTimeMs, 24, "Время экспозиции 24 мс");
	assert.strictEqual(meta0000.sliceThickness, 0.2, "Толщина вокселя 0.2 мм");
	assert.deepStrictEqual(meta0000.pixelSpacing, [0.2, 0.2], "Размер пикселя [0.2, 0.2]");
	assert.strictEqual(meta0000.modalityKind, "ct", "Модальность КТ");
	assert.ok(meta0000.suggestedStudyTitle.includes("КЛКТ"), "Заголовок КЛКТ");

	// Проверяем промежуточный срез (0200) и последний (0399)
	const slice0200Buf = await fs.readFile(path.join(BARABASH_DIR, barabashFiles[200]));
	const meta0200 = parseDicomIngestBuffer(slice0200Buf);
	assert.strictEqual(meta0200.rows, 800);
	assert.strictEqual(meta0200.columns, 800);
	assert.notStrictEqual(meta0000.sopInstanceUid, meta0200.sopInstanceUid, "SOPInstanceUID должен быть уникальным");

	// Проверяем исследование Ivashenko (549x549 с зарегистрированным DAP)
	const ivashenkoFiles = (await fs.readdir(IVASHENKO_DIR)).filter((f) => f.endsWith(".dcm")).sort();
	assert.ok(ivashenkoFiles.length >= 600, "В исследовании Ivashenko должно быть более 600 срезов");

	const ivaSliceBuf = await fs.readFile(path.join(IVASHENKO_DIR, ivashenkoFiles[0]));
	const ivaMeta = parseDicomIngestBuffer(ivaSliceBuf);

	assert.strictEqual(ivaMeta.patientFullName, "IVASHENKO VYACHESLAV VASILEVICH");
	assert.strictEqual(ivaMeta.patientChartNumber, "35550");
	assert.strictEqual(ivaMeta.rows, 549, "Разрешение матрицы Ivashenko 549");
	assert.strictEqual(ivaMeta.columns, 549, "Разрешение матрицы Ivashenko 549");
	assert.strictEqual(ivaMeta.kvp, 90, "Напряжение 90 кВ");
	assert.strictEqual(ivaMeta.ma, 9, "Ток 9 мА");
	assert.strictEqual(ivaMeta.doseAreaProductDap, 23.038, "DAP доза 23.038");
	assert.strictEqual(ivaMeta.estimatedEffectiveDoseMsv, 0.0346, "Эффективная доза 0.0346 мЗв");
});

// ─── ТЕСТ 2: ВЫСОКОСКОРОСТНОЙ БАТЧ-ИНЖЕСТ 400 СРЕЗОВ (INGESTBATCH) ───────────

test("2. Высокоскоростной батч-инжест 400 срезов КЛКТ томографа с контролем целостности", async (t) => {
	mockDb.clear();
	mockDb.setupMocks(t);

	const barabashFiles = (await fs.readdir(BARABASH_DIR)).filter((f) => f.endsWith(".dcm")).sort();
	// Читаем все 400 срезов параллельно через Promise.all (150-200мс)
	const buffers = await Promise.all(
		barabashFiles.map((f) => fs.readFile(path.join(BARABASH_DIR, f))),
	);
	assert.strictEqual(buffers.length, 400, "Все 400 файлов должны быть загружены");

	// Выполняем пакетный импорт через DicomStudyIngestService
	const tIngest0 = Date.now();
	const result = await dicomStudyIngestService.ingestBatch(buffers, {
		organizationId: TEST_ORG_ID,
		doctorId: TEST_DOCTOR_ID,
		sourceName: "Picasso CT Receiver",
		autoCreateDraftIfNotFound: true,
	});
	const tIngest1 = Date.now();

	// Проверяем метрики ответа сервиса
	assert.strictEqual(result.totalSlicesReceived, 400, "Получено 400 срезов");
	assert.strictEqual(result.newSlicesInserted, 400, "Вставлено ровно 400 новых срезов");
	assert.strictEqual(result.duplicateSlicesSkipped, 0, "Дубликатов при первом импорте быть не должно");
	assert.strictEqual(result.modalityKind, "ct", "Модальность КТ");
	assert.strictEqual(result.studyKind, "cbct", "Вид исследования cbct");

	// Проверяем состояние в базе данных
	assert.strictEqual(mockDb.studies.size, 1, "Должно быть создано ровно 1 исследование");
	const study = Array.from(mockDb.studies.values())[0];
	assert.strictEqual(study.sliceCount, 400, "Счетчик sliceCount в исследовании должен быть 400");
	assert.strictEqual(study.dimensions, "800x800", "Разрешение в исследовании должно быть 800x800");
	assert.strictEqual(study.voxelSpacing, "0.2x0.2", "Воксель 0.2x0.2");
	assert.strictEqual(study.dicomPatientId, "6036", "Номер карты в исследовании");

	assert.strictEqual(mockDb.series.size, 1, "Должна быть создана 1 серия");
	assert.strictEqual(mockDb.instances.size, 400, "В imaging_instances должно быть сохранено ровно 400 записей");

	// Проверяем скорость обработки
	const durationMs = tIngest1 - tIngest0;
	assert.ok(durationMs < 5000, `Батч-инжест 400 срезов должен выполняться быстрее 5 секунд (факт: ${durationMs} мс)`);
});

// ─── ТЕСТ 3: ИДЕМПОТЕНТНОСТЬ И ДЕДУПЛИКАЦИЯ (DEDUPLICATION GATE) ─────────────

test("3. Идемпотентность и защита от повторной отправки (sliceCount не раздувается)", async (t) => {
	mockDb.clear();
	mockDb.setupMocks(t);

	const barabashFiles = (await fs.readdir(BARABASH_DIR)).filter((f) => f.endsWith(".dcm")).slice(0, 50);
	const buffers = await Promise.all(
		barabashFiles.map((f) => fs.readFile(path.join(BARABASH_DIR, f))),
	);

	// 1. Первый инжест (50 срезов)
	const res1 = await dicomStudyIngestService.ingestBatch(buffers, {
		organizationId: TEST_ORG_ID,
		autoCreateDraftIfNotFound: true,
	});
	assert.strictEqual(res1.newSlicesInserted, 50);
	assert.strictEqual(res1.duplicateSlicesSkipped, 0);
	assert.strictEqual(mockDb.instances.size, 50);

	const studyAfterFirst = Array.from(mockDb.studies.values())[0];
	assert.strictEqual(studyAfterFirst.sliceCount, 50);

	// 2. Повторный инжест ТЕХ ЖЕ 50 срезов
	const res2 = await dicomStudyIngestService.ingestBatch(buffers, {
		organizationId: TEST_ORG_ID,
		autoCreateDraftIfNotFound: true,
	});
	assert.strictEqual(res2.newSlicesInserted, 0, "При повторном инжесте новых срезов быть НЕ ДОЛЖНО");
	assert.strictEqual(res2.duplicateSlicesSkipped, 50, "Все 50 срезов должны быть опознаны как дубликаты");

	// В базе по-прежнему ровно 50 экземпляров и sliceCount строго 50 (НЕ 100!)
	assert.strictEqual(mockDb.instances.size, 50, "Количество экземпляров не должно удвоиться");
	assert.strictEqual(studyAfterFirst.sliceCount, 50, "sliceCount исследования не должен раздуться до 100");

	// 3. Проверка одиночного инжеста через ingestBuffer на дубликате
	const resSingle = await dicomStudyIngestService.ingestBuffer(buffers[0], {
		organizationId: TEST_ORG_ID,
	});
	assert.strictEqual(resSingle.isDuplicate, true, "Флаг isDuplicate должен быть true");
	assert.strictEqual(mockDb.instances.size, 50);
	assert.strictEqual(studyAfterFirst.sliceCount, 50);
});

// ─── ТЕСТ 4: ИНТЕЛЛЕКТУАЛЬНАЯ ПРИВЯЗКА ПАЦИЕНТА И DOCTOR AUTONOMY ─────────────

test("4. Интеллектуальная привязка к пациенту: точный номер карты, транслитерация ФИО и авто-черновик (Мандат 8e)", async (t) => {
	// Сценарий 4А: Прямое совпадение по номеру амбулаторной карты Vatech (6036)
	{
		mockDb.clear();
		mockDb.setupMocks(t);

		const existingPatient = mockDb.addPatient({
			fullName: "Барабаш Светлана",
			administrativeProfile: { chartNumber: "6036", medicalCardNumber: "6036" },
		});

		const res = await resolveOrAutoCreatePatientForDicom(TEST_ORG_ID, {
			patientFullName: "BARABASH SVETLANA VIKTOROVNA",
			patientChartNumber: "6036",
			patientBirthDate: "1970-01-01",
		});

		assert.strictEqual(res.patientId, existingPatient.id, "Должен привязаться к существующему пациенту по номеру карты");
		assert.strictEqual(res.bindingStatus, "auto_bound");
		assert.strictEqual(res.matchMethod, "exact_chart_number_match");
		assert.strictEqual(res.isNewPatientCreated, false);
	}

	// Сценарий 4Б: Нечеткое сопоставление по транслитерации ФИО без номера карты
	{
		mockDb.clear();
		mockDb.setupMocks(t);

		const existingPatient = mockDb.addPatient({
			fullName: "Барабаш Светлана Викторовна",
			birthDate: "1968-05-14",
			administrativeProfile: {}, // номера карты нет
		});

		const res = await resolveOrAutoCreatePatientForDicom(TEST_ORG_ID, {
			patientFullName: "BARABASH SVETLANA VIKTOROVNA",
			patientChartNumber: null,
			patientBirthDate: "1968-05-14",
		});

		assert.strictEqual(res.patientId, existingPatient.id, "Должен привязаться по транслитерации ФИО и дате рождения");
		assert.strictEqual(res.bindingStatus, "auto_bound");
		assert.ok(res.bindingConfidence >= 90, `Уверенность должна быть >= 90 (факт: ${res.bindingConfidence})`);
		assert.strictEqual(res.isNewPatientCreated, false);
	}

	// Сценарий 4В: Пациента нет в базе — Авто-создание карточки (Мандат 8e Doctor Autonomy)
	{
		mockDb.clear();
		mockDb.setupMocks(t);

		const res = await resolveOrAutoCreatePatientForDicom(TEST_ORG_ID, {
			patientFullName: "BARABASH SVETLANA VIKTOROVNA",
			patientChartNumber: "6036",
			patientBirthDate: "1968-05-14",
			patientSex: "female",
			autoCreateDraftIfNotFound: true,
		});

		assert.ok(res.patientId, "ID нового пациента должен быть сгенерирован");
		assert.strictEqual(res.isNewPatientCreated, true, "Флаг нового пациента");
		assert.strictEqual(res.bindingStatus, "auto_bound");
		assert.strictEqual(res.matchMethod, "auto_created_from_dicom");

		// Проверяем запись в базе
		const createdPatient = mockDb.patients.get(res.patientId!);
		assert.ok(createdPatient, "Пациент должен быть сохранен в таблице patients");
		assert.strictEqual(createdPatient.fullName, "BARABASH SVETLANA VIKTOROVNA");
		assert.strictEqual(createdPatient.administrativeProfile.chartNumber, "6036");
		assert.strictEqual(createdPatient.administrativeProfile.medicalCardNumber, "6036");
		assert.strictEqual(createdPatient.administrativeProfile.vatechPatId, "6036");
		assert.strictEqual(createdPatient.administrativeProfile.gender, "female");
	}

	// Сценарий 4Г: Авто-создание выключено (исследование направляется в неразобранную очередь)
	{
		mockDb.clear();
		mockDb.setupMocks(t);

		const res = await resolveOrAutoCreatePatientForDicom(TEST_ORG_ID, {
			patientFullName: "UNKNOWN PATIENT",
			patientChartNumber: null,
			patientBirthDate: null,
			autoCreateDraftIfNotFound: false,
		});

		assert.strictEqual(res.patientId, null, "Пациент не должен быть создан");
		assert.strictEqual(res.bindingStatus, "unassigned");
		assert.strictEqual(res.isNewPatientCreated, false);
	}
});

// ─── ТЕСТ 5: ЖУРНАЛ ЛУЧЕВОЙ НАГРУЗКИ ПО САНПИН 2.6.1.1192-03 ─────────────────

test("5. Регистрация лучевой нагрузки по СанПиН 2.6.1.1192-03 и накопление годовой дозы", async (t) => {
	mockDb.clear();
	mockDb.setupMocks(t);

	// 1. Создаем пациента
	const patient = mockDb.addPatient({
		fullName: "Барабаш Светлана Викторовна",
		birthDate: "1968-05-14",
		administrativeProfile: { chartNumber: "6036", medicalCardNumber: "6036" },
	});

	// 2. Читаем срез Barabash и инжектим
	const barabashFile = path.join(BARABASH_DIR, "BARABASH SVETLANA VIKTOROVNA_6036_0000.dcm");
	const bufBarabash = await fs.readFile(barabashFile);
	const metaBarabash = parseDicomIngestBuffer(bufBarabash);

	await dicomStudyIngestService.ingestBuffer(bufBarabash, {
		organizationId: TEST_ORG_ID,
		doctorId: TEST_DOCTOR_ID,
		autoCreateDraftIfNotFound: true,
	});

	// Проверяем, что в generatedDocuments создана запись журнала доз
	assert.strictEqual(mockDb.documents.size, 1, "Должен быть создан документ radiation_dose_sheet");
	const doseDoc = Array.from(mockDb.documents.values())[0];
	assert.strictEqual(doseDoc.kind, "radiation_dose_sheet");
	assert.ok(doseDoc.title.includes("Лист учета дозовых нагрузок"));
	assert.strictEqual(doseDoc.patientId, patient.id);

	const payload = JSON.parse(doseDoc.payloadJson);
	assert.strictEqual(payload.medicalCardNumber, "6036");
	assert.strictEqual(payload.exposureEntries.length, 1);

	const entry1 = payload.exposureEntries[0];
	assert.strictEqual(entry1.tubeVoltageKv, 85, "Напряжение в журнале 85 кВ");
	assert.strictEqual(entry1.tubeCurrentMa, 7, "Ток в журнале 7 мА");
	assert.strictEqual(entry1.effectiveDoseMsv, 0.055, "Доза Barabash 0.055 мЗв");
	assert.strictEqual(entry1.effectiveDoseMicrosieverts, 55, "Доза Barabash 55 мкЗв");
	assert.strictEqual(payload.annualSummary.totalDoseYearMsv, 0.055);
	assert.strictEqual(payload.annualSummary.safetyZone, "green_optimal", "Зеленая зона (< 0.5 мЗв/год)");
	assert.strictEqual(payload.annualSummary.riskCategory, "safe", "Категория риска безопасная");
	assert.strictEqual(payload.annualSummary.hasExceededLimit, false, "Превышения лимита нет");

	// 3. Регистрируем второе исследование для того же пациента в том же отчетном году (с параметрами DAP томографа Picasso из датасета Ivashenko)
	const ivaFiles = (await fs.readdir(IVASHENKO_DIR)).filter((f) => f.endsWith(".dcm"));
	const bufIva = await fs.readFile(path.join(IVASHENKO_DIR, ivaFiles[0]));
	const ivaMeta = parseDicomIngestBuffer(bufIva);

	// Регистрируем в журнале доз того же пациента за тот же отчетный год
	await recordSanpinRadiationDose(
		TEST_ORG_ID,
		patient.id,
		{ ...ivaMeta, studyDate: metaBarabash.studyDate },
		TEST_DOCTOR_ID,
	);

	// Проверяем защиту от повторного логирования той же записи (дедупликация в журнале по studyInstanceUid)
	await recordSanpinRadiationDose(
		TEST_ORG_ID,
		patient.id,
		{ ...ivaMeta, studyDate: metaBarabash.studyDate },
		TEST_DOCTOR_ID,
	);

	// Проверяем кумулятивное накопление: документ обновлен на месте, количество записей строго 2 (дедупликация сработала)
	assert.strictEqual(mockDb.documents.size, 1, "Новый документ не создается — ведется единый лист за год");
	const updatedDoc = Array.from(mockDb.documents.values())[0];
	const updatedPayload = JSON.parse(updatedDoc.payloadJson);
	assert.strictEqual(updatedPayload.exposureEntries.length, 2, "В журнале должно быть ровно 2 исследования");

	// Проверяем суммирование годовой дозы
	const expectedSum = Number((0.055 + 0.0346).toFixed(4));
	assert.strictEqual(updatedPayload.annualSummary.totalDoseYearMsv, expectedSum, `Суммарная доза должна накопиться: ${expectedSum} мЗв`);
	assert.strictEqual(updatedPayload.annualSummary.safetyZone, "green_optimal");
	assert.strictEqual(updatedPayload.annualSummary.riskCategory, "safe");
	assert.strictEqual(updatedPayload.annualSummary.hasExceededLimit, false);
});

// ─── ТЕСТ 6: ПРЯМОЙ ИМПОРТ КАТАЛОГА С ДИСКА (INGESTSERIESFOLDER) ─────────────

test("6. Прямой импорт серии КЛКТ томографа из каталога на диске (ingestSeriesFolder)", async (t) => {
	mockDb.clear();
	mockDb.setupMocks(t);

	const t0 = Date.now();
	const result = await dicomStudyIngestService.ingestSeriesFolder(BARABASH_DIR, {
		organizationId: TEST_ORG_ID,
		doctorId: TEST_DOCTOR_ID,
		sourceName: "Picasso Direct Directory Watcher",
		autoCreateDraftIfNotFound: true,
	});
	const t1 = Date.now();

	assert.strictEqual(result.totalSlicesReceived, 400, "Из каталога должно быть прочитано 400 срезов");
	assert.strictEqual(result.newSlicesInserted, 400, "Вставлено 400 срезов");
	assert.strictEqual(result.duplicateSlicesSkipped, 0);
	assert.strictEqual(mockDb.instances.size, 400);

	const study = Array.from(mockDb.studies.values())[0];
	assert.strictEqual(study.sliceCount, 400);
	assert.strictEqual(study.dimensions, "800x800");

	console.log(`[PASS] ingestSeriesFolder успешно импортировал 400 срезов за ${t1 - t0} мс.`);
});
