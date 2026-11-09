/**
 * workstationClinicSetupAndImport.test.ts — Автономная настройка клиники и пакетный импорт:
 * 1. configure_clinic_setup: экспресс-настройка клиники под ключ (кресла, врачи, смены, касса, прейскурант).
 * 2. import_clinic_data_file: пакетный импорт прейскурантов и картотеки пациентов из CSV/JSON, dryRun, автодетект разделителей.
 *
 * Sweet Spot 200-350 строк (Мандат 8b / 8zi).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { afterEach, beforeEach, describe } from "node:test";
import {
	configureClinicSetupTool,
	handleConfigureClinicSetup,
	handleImportClinicDataFile,
	importClinicDataFileTool,
} from "./dentalTools/index.js";
import type { DentalToolContext } from "./dentalTools/types.js";

const TEST_ORG_ID = "00000000-1111-2222-3333-444444444444";
const SCRATCH_IMPORT_DIR = path.join(process.cwd(), "scratch", "test_clinic_import");

const DESKTOP_CTX: DentalToolContext = {
	organizationId: TEST_ORG_ID,
	runtimeMode: "desktop_native",
	allowLocalExecution: true,
};

/**
 * Вспомогательный мок-генератор базы данных PostgreSQL Drizzle ORM для тестов configure_clinic_setup и import_clinic_data_file
 */
function createMockClinicDb(initialData: {
	clinics?: any[];
	cashBoxes?: any[];
	serviceCatalogItems?: any[];
} = {}) {
	const store = {
		organizationsUpdated: [] as any[],
		clinics: [...(initialData.clinics || [])],
		chairs: [] as any[],
		users: [] as any[],
		doctorShiftRosters: [] as any[],
		serviceCatalogItems: [...(initialData.serviceCatalogItems || [])],
		cashBoxes: [...(initialData.cashBoxes || [])],
		patients: [] as any[],
	};

	const getTableName = (table: any): string => {
		return table?.[Symbol.for("drizzle:Name")] || table?._?.name || "";
	};

	const db = {
		store,
		update: (table: any) => ({
			set: (values: any) => ({
				where: async () => {
					const tableName = getTableName(table);
					if (tableName === "organizations") {
						store.organizationsUpdated.push(values);
					} else if (tableName === "clinics" && store.clinics.length > 0) {
						Object.assign(store.clinics[0], values);
					} else if (tableName === "cash_boxes" && store.cashBoxes.length > 0) {
						Object.assign(store.cashBoxes[0], values);
					}
					return [values];
				},
			}),
		}),
		select: () => ({
			from: (table: any) => ({
				where: () => ({
					limit: async (lim: number) => {
						const tableName = getTableName(table);
						if (tableName === "clinics") return store.clinics.slice(0, lim);
						if (tableName === "cash_boxes") return store.cashBoxes.slice(0, lim);
						if (tableName === "service_catalog_items") return store.serviceCatalogItems.slice(0, lim);
						return [];
					},
				}),
			}),
		}),
		insert: (table: any) => ({
			values: (valOrVals: any) => {
				const items = Array.isArray(valOrVals) ? valOrVals : [valOrVals];
				const inserted = items.map((item, idx) => ({
					id: item.id || `mock-id-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
					...item,
				}));
				const tableName = getTableName(table);
				if (tableName === "clinics") store.clinics.push(...inserted);
				else if (tableName === "chairs") store.chairs.push(...inserted);
				else if (tableName === "users") store.users.push(...inserted);
				else if (tableName === "doctor_shift_rosters") store.doctorShiftRosters.push(...inserted);
				else if (tableName === "service_catalog_items") store.serviceCatalogItems.push(...inserted);
				else if (tableName === "cash_boxes") store.cashBoxes.push(...inserted);
				else if (tableName === "patients") store.patients.push(...inserted);

				const res = {
					returning: async () => inserted,
					then: (onfulfilled?: (val: any) => any) => Promise.resolve(inserted).then(onfulfilled),
				};
				return res;
			},
		}),
	};

	return db;
}

// ============================================================================
// 1. ТЕСТЫ: configure_clinic_setup
// ============================================================================

describe("Инструмент configure_clinic_setup — Автономная экспресс-настройка клиники под ключ", () => {
	test("Автономная настройка под ключ для соло-врача (solo_doctor)", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleConfigureClinicSetup(
			{
				clinicName: "Стоматология Доктора Смирнова",
				inn: "770123456789",
				legalAddress: "г. Москва, ул. Арбат, д. 10",
				chairsCount: 1,
				doctors: [
					{
						fullName: "Смирнов Алексей Викторович",
						specialty: "universal",
						phone: "+79031112233",
					},
				],
				schedule: {
					startHour: 10,
					endHour: 20,
					workDays: [1, 2, 3, 4, 5],
					timezone: "Europe/Moscow",
				},
				activateStandardPricelist: true,
				kkmSettings: {
					model: "ATOL 30F USB",
					kkmActive: true,
					defaultPort: "USB/COM2",
				},
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.clinicName, "Стоматология Доктора Смирнова");
		assert.strictEqual(res.clinicMode, "solo_doctor");
		assert.strictEqual(res.chairsConfigured, 1);
		assert.strictEqual(res.doctorsRegistered, 1);
		assert.strictEqual(res.shiftsScheduled, 5); // 5 рабочих дней смены соло-врача
		assert.ok(res.servicesActivated > 0);
		assert.strictEqual(res.cashRegisterConfigured.model, "ATOL 30F USB");

		// Проверка сохранения в хранилище mockDb
		assert.strictEqual(mockDb.store.organizationsUpdated.length, 1);
		assert.strictEqual(mockDb.store.organizationsUpdated[0].clinicMode, "solo_doctor");
		assert.strictEqual(mockDb.store.clinics.length, 1);
		assert.strictEqual(mockDb.store.chairs.length, 1);
		assert.strictEqual(mockDb.store.users.length, 1);
		assert.strictEqual(mockDb.store.users[0].fullName, "Смирнов Алексей Викторович");
		assert.strictEqual(mockDb.store.cashBoxes.length, 1);
		assert.strictEqual(mockDb.store.cashBoxes[0].kkmModel, "ATOL 30F USB");
	});

	test("Автономная настройка под ключ для клиники на 3 кресла (small_clinic)", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleConfigureClinicSetup(
			{
				clinicName: "Клиника Дента-Премиум",
				chairsCount: 3,
				chairNames: ["Кабинет 1 (Терапия)", "Кабинет 2 (Хирургия)", "Кабинет 3 (Ортодонтия)"],
				doctors: [
					{ fullName: "Иванова Ольга Сергеевна", specialty: "therapist" },
					{ fullName: "Петров Сергей Николаевич", specialty: "surgeon" },
					{ fullName: "Кузнецова Анна Дмитриевна", specialty: "orthodontist" },
				],
				schedule: {
					startHour: 9,
					endHour: 21,
					workDays: [1, 2, 3, 4, 5, 6],
					timezone: "Europe/Moscow",
				},
				activateStandardPricelist: true,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.clinicMode, "small_clinic");
		assert.strictEqual(res.chairsConfigured, 3);
		assert.strictEqual(res.doctorsRegistered, 3);
		// 6 рабочих дней * 3 доктора = 18 смен
		assert.strictEqual(res.shiftsScheduled, 18);
		assert.strictEqual(mockDb.store.chairs.length, 3);
		assert.strictEqual(mockDb.store.chairs[0].name, "Кабинет 1 (Терапия)");
		assert.strictEqual(mockDb.store.chairs[1].name, "Кабинет 2 (Хирургия)");
		assert.strictEqual(mockDb.store.chairs[2].name, "Кабинет 3 (Ортодонтия)");
	});

	test("Идемпотентность: корректно обновляет существующую клинику и кассу без дублирования", async () => {
		const existingClinic = { id: "clinic-existing-123", name: "Старая Клиника", organizationId: TEST_ORG_ID };
		const existingCashBox = { id: "cashbox-existing-999", name: "Касса 1", type: "main", organizationId: TEST_ORG_ID };
		const mockDb = createMockClinicDb({ clinics: [existingClinic], cashBoxes: [existingCashBox] });

		const res = await handleConfigureClinicSetup(
			{
				clinicName: "Обновленная Клиника Дент",
				chairsCount: 2,
				doctors: [{ fullName: "Врач Новый", specialty: "universal" }],
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		// Новая клиника не добавлялась, обновилась существующая
		assert.strictEqual(mockDb.store.clinics.length, 1);
		assert.strictEqual(mockDb.store.clinics[0].name, "Обновленная Клиника Дент");
		// Касса обновилась
		assert.strictEqual(mockDb.store.cashBoxes.length, 1);
	});

	test("Инструмент помечен как destructive: true для двухфазного подтверждения", () => {
		assert.strictEqual(configureClinicSetupTool.destructive, true);
	});

	test("Работает в обоих режимах: web_browser и desktop_native", () => {
		assert.ok(configureClinicSetupTool.supportedModes.includes("web_browser"));
		assert.ok(configureClinicSetupTool.supportedModes.includes("desktop_native"));
	});
});

// ============================================================================
// 2. ТЕСТЫ: import_clinic_data_file
// ============================================================================

describe("Инструмент import_clinic_data_file — Пакетный импорт данных клиники из файлов", () => {
	const csvPricelistComma = path.join(SCRATCH_IMPORT_DIR, "import_pricelist_comma.csv");
	const csvPricelistSemi = path.join(SCRATCH_IMPORT_DIR, "import_pricelist_semi.csv");
	const jsonPricelist = path.join(SCRATCH_IMPORT_DIR, "import_pricelist.json");
	const csvPatients = path.join(SCRATCH_IMPORT_DIR, "import_patients.csv");
	const jsonPatients = path.join(SCRATCH_IMPORT_DIR, "import_patients.json");

	beforeEach(async () => {
		if (fs.existsSync(SCRATCH_IMPORT_DIR)) {
			await fs.promises.rm(SCRATCH_IMPORT_DIR, { recursive: true, force: true });
		}
		await fs.promises.mkdir(SCRATCH_IMPORT_DIR, { recursive: true });

		// 1. CSV прейскурант с запятой
		await fs.promises.writeFile(
			csvPricelistComma,
			[
				"code,title,price,category",
				"A16.07.002,Лечение кариеса светоотверждаемым композитом,3800,терапия",
				"A16.07.001,Простое удаление зуба,2500,хирургия",
				"A16.07.020,Профессиональная гигиена Air-Flow,4000,гигиена",
			].join("\n"),
			"utf8",
		);

		// 2. CSV прейскурант с точкой с запятой и русскими заголовками
		await fs.promises.writeFile(
			csvPricelistSemi,
			[
				"код;наименование;цена;категория",
				"A16.07.004;Коронка из диоксида циркония;19500;ортопедия",
				"A16.07.047;Установка брекет-системы;35000;ортодонтия",
				";Пропущенная позиция без кода;1500;терапия",
				"ERR-1;;500;терапия",
			].join("\n"),
			"utf8",
		);

		// 3. JSON прейскурант
		await fs.promises.writeFile(
			jsonPricelist,
			JSON.stringify([
				{ code: "A16.07.006", title: "Установка дентального имплантата", price: 32000, category: "surgery" },
				{ code: "B01.065.001", title: "Консультация терапевта", price: 1000, category: "consultation" },
			]),
			"utf8",
		);

		// 4. CSV пациенты с русскими заголовками
		await fs.promises.writeFile(
			csvPatients,
			[
				"фио,телефон,дата_рождения,комментарий",
				"Алексеев Алексей Алексеевич,+79991112233,1985-04-12,Аллергия на пенициллин",
				"Борисова Елена Павловна,+79035556677,1992-09-20,Первичный прием",
				",+79000000000,1990-01-01,Без ФИО",
			].join("\n"),
			"utf8",
		);

		// 5. JSON пациенты
		await fs.promises.writeFile(
			jsonPatients,
			JSON.stringify([
				{ fullname: "Воронов Денис Игоревич", phone: "+79167778899", birthDate: "1978-11-05" },
				{ fullname: "Григорьева Светлана Юрьевна", phone: "+79263334455", birthDate: "1989-02-17" },
			]),
			"utf8",
		);
	});

	afterEach(async () => {
		if (fs.existsSync(SCRATCH_IMPORT_DIR)) {
			await fs.promises.rm(SCRATCH_IMPORT_DIR, { recursive: true, force: true });
		}
	});

	test("Пакетный импорт прейскуранта из CSV (запятая) с сохранением в БД", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleImportClinicDataFile(
			{
				filePath: csvPricelistComma,
				entityType: "pricelist",
				fileFormat: "csv",
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.importedCount, 3);
		assert.strictEqual(res.skippedCount, 0);
		assert.strictEqual(mockDb.store.serviceCatalogItems.length, 3);
		assert.strictEqual(mockDb.store.serviceCatalogItems[0].code, "A16.07.002");
		assert.strictEqual(mockDb.store.serviceCatalogItems[0].priceRub, 3800);
		assert.strictEqual(mockDb.store.serviceCatalogItems[0].category, "therapy");
	});

	test("Автоопределение точки с запятой и русских колонок в CSV прейскуранте", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleImportClinicDataFile(
			{
				filePath: csvPricelistSemi,
				entityType: "pricelist",
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.importedCount, 3);
		assert.strictEqual(res.skippedCount, 1);
		assert.strictEqual(res.errors.length, 1);
		assert.ok(res.errors[0]!.includes("отсутствует название услуги"));
		assert.strictEqual(mockDb.store.serviceCatalogItems.length, 3);
	});

	test("Импорт прейскуранта из JSON", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleImportClinicDataFile(
			{
				filePath: jsonPricelist,
				entityType: "pricelist",
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.importedCount, 2);
		assert.strictEqual(res.skippedCount, 0);
		assert.strictEqual(mockDb.store.serviceCatalogItems.length, 2);
		assert.strictEqual(mockDb.store.serviceCatalogItems[0].code, "A16.07.006");
		assert.strictEqual(mockDb.store.serviceCatalogItems[0].priceRub, 32000);
	});

	test("Импорт картотеки пациентов из CSV с русскими колонками", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleImportClinicDataFile(
			{
				filePath: csvPatients,
				entityType: "patients",
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.importedCount, 2);
		assert.strictEqual(res.skippedCount, 1);
		assert.strictEqual(mockDb.store.patients.length, 2);
		assert.strictEqual(mockDb.store.patients[0].fullName, "Алексеев Алексей Алексеевич");
		assert.strictEqual(mockDb.store.patients[0].phone, "+79991112233");
		assert.strictEqual(mockDb.store.patients[0].birthDate, "1985-04-12");
	});

	test("Импорт картотеки пациентов из JSON", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleImportClinicDataFile(
			{
				filePath: jsonPatients,
				entityType: "patients",
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.importedCount, 2);
		assert.strictEqual(mockDb.store.patients.length, 2);
		assert.strictEqual(mockDb.store.patients[0].fullName, "Воронов Денис Игоревич");
	});

	test("Режим dryRun: проверяет валидность строк без мутации базы данных", async () => {
		const mockDb = createMockClinicDb();

		const res = await handleImportClinicDataFile(
			{
				filePath: csvPricelistComma,
				entityType: "pricelist",
				dryRun: true,
			},
			{ organizationId: TEST_ORG_ID, db: mockDb as any },
		);

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.dryRun, true);
		assert.strictEqual(res.importedCount, 3);
		assert.strictEqual(mockDb.store.serviceCatalogItems.length, 0);
	});

	test("Блокирует попытку доступа к защищенным системным путям (Red Team Path Guard)", async () => {
		const res = await handleImportClinicDataFile(
			{
				filePath: "C:\\Windows\\System32\\config\\SAM",
				entityType: "pricelist",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("Отказ безопасности"));
	});

	test("Корректно обрабатывает несуществующий файл", async () => {
		const res = await handleImportClinicDataFile(
			{
				filePath: path.join(SCRATCH_IMPORT_DIR, "non_existent_file.csv"),
				entityType: "pricelist",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("не найден"));
	});

	test("Инструмент помечен как destructive: true", () => {
		assert.strictEqual(importClinicDataFileTool.destructive, true);
	});
});
