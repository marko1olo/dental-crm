/**
 * workstationFileSearchAndSetup.test.ts — Тестирование инструментов автономного управления станцией и клиникой:
 * 1. search_workstation_files: рекурсивный поиск файлов на ПК врача, фильтры по маске, расширениям, датам, детекция модальностей.
 * 2. replace_file_content: точечный патчинг файлов на ПК, диапазон строк, защита от неоднозначности, executable drop guard.
 * 3. configure_clinic_setup: автономная экспресс-настройка клиники под ключ (кресла, врачи, смены, прейскурант, касса).
 * 4. import_clinic_data_file: пакетный импорт прейскурантов и картотеки пациентов из CSV/JSON, автодетект разделителей, dryRun.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { afterEach, beforeEach, describe } from "node:test";
import {
	configureClinicSetupTool,
	executeDentalTool,
	handleConfigureClinicSetup,
	handleImportClinicDataFile,
	handleReplaceFileContent,
	handleSearchWorkstationFiles,
	importClinicDataFileTool,
	replaceFileContentTool,
	searchWorkstationFilesTool,
} from "./dentalTools/index.js";
import type { DentalToolContext } from "./dentalTools/types.js";

const TEST_ORG_ID = "00000000-1111-2222-3333-444444444444";
const SCRATCH_SEARCH_DIR = path.join(process.cwd(), "scratch", "test_search_setup");

const DESKTOP_CTX: DentalToolContext = {
	organizationId: TEST_ORG_ID,
	runtimeMode: "desktop_native",
	allowLocalExecution: true,
};

const WEB_CTX: DentalToolContext = {
	organizationId: TEST_ORG_ID,
	runtimeMode: "web_browser",
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
		services: [] as any[],
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
				else if (tableName === "services") store.services.push(...inserted);
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
// 1. ТЕСТЫ: search_workstation_files
// ============================================================================

describe("Инструмент search_workstation_files — Рекурсивный поиск файлов на ПК врача", () => {
	beforeEach(async () => {
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
		}
		await fs.promises.mkdir(SCRATCH_SEARCH_DIR, { recursive: true });

		// Создаем тестовую файловую структуру
		const xrayDir = path.join(SCRATCH_SEARCH_DIR, "xrays");
		const docsDir = path.join(SCRATCH_SEARCH_DIR, "docs");
		const subNestedDir = path.join(docsDir, "archive");
		await fs.promises.mkdir(xrayDir, { recursive: true });
		await fs.promises.mkdir(docsDir, { recursive: true });
		await fs.promises.mkdir(subNestedDir, { recursive: true });

		await fs.promises.writeFile(path.join(xrayDir, "tooth_16.dcm"), "DICM TEST DATA 1");
		await fs.promises.writeFile(path.join(xrayDir, "panoramic_study.rvg"), "RVG SENSOR CAPTURE");
		await fs.promises.writeFile(path.join(docsDir, "clinic_pricelist_2026.csv"), "code,title,price\nA16.07.002,Пломба,3500");
		await fs.promises.writeFile(path.join(docsDir, "patients_export.json"), '[{"fullName": "Иванов Иван", "phone": "+79991112233"}]');
		await fs.promises.writeFile(path.join(subNestedDir, "old_contracts.txt"), "Архив договоров");
	});

	afterEach(async () => {
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
		}
	});

	test("Находит все файлы в указанной директории рекурсивно", async () => {
		const res = (await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				category: "all",
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.ok(res.totalFound >= 5);
		assert.strictEqual(res.timedOut, false);
		const fileNames = res.files.map((f) => f.fileName);
		assert.ok(fileNames.includes("tooth_16.dcm"));
		assert.ok(fileNames.includes("panoramic_study.rvg"));
		assert.ok(fileNames.includes("clinic_pricelist_2026.csv"));
		assert.ok(fileNames.includes("patients_export.json"));
		assert.ok(fileNames.includes("old_contracts.txt"));
	});

	test("Фильтрует по расширению файла (extensions: ['dcm', 'rvg'])", async () => {
		const res = (await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				extensions: ["dcm", "rvg"],
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.totalFound, 2);
		const fileNames = res.files.map((f: any) => f.fileName);
		assert.ok(fileNames.includes("tooth_16.dcm"));
		assert.ok(fileNames.includes("panoramic_study.rvg"));
		assert.ok(!fileNames.includes("clinic_pricelist_2026.csv"));
	});

	test("Фильтрует по текстовому запросу query ('*price*')", async () => {
		const res = (await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				query: "*price*",
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.totalFound, 1);
		assert.strictEqual(res.files[0].fileName, "clinic_pricelist_2026.csv");
		assert.strictEqual(res.files[0].category, "pricelist");
		assert.strictEqual(res.files[0].detectedModality, "spreadsheet");
	});

	test("Определяет категорию и модальность файлов (xray_study vs pricelist vs patient_database)", async () => {
		const res = (await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				category: "xray_study",
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.totalFound, 2);
		assert.ok(res.files.every((f) => f.category === "xray_study"));
	});

	test("Ограничивает глубину сканирования (maxDepth: 1)", async () => {
		const res = (await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				maxDepth: 1,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		const fileNames = res.files.map((f: any) => f.fileName);
		// old_contracts.txt находится на глубине 2 (docs/archive/old_contracts.txt)
		assert.ok(!fileNames.includes("old_contracts.txt"));
	});

	test("Учитывает ограничение maxResults", async () => {
		const res = (await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				maxResults: 2,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.totalFound, 2);
		assert.strictEqual(res.files.length, 2);
	});

	test("Блокирует выполнение в режиме web_browser (Security Guard)", async () => {
		const res = (await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
			},
			WEB_CTX,
		)) as any;

		assert.strictEqual(res.success, false);
		assert.ok(res.error.includes("только в режиме локальной станции врача"));
	});

	test("Корректно вызывается через центральный диспетчер executeDentalTool", async () => {
		const res = (await executeDentalTool(
			"search_workstation_files",
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				extensions: ["csv"],
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.totalFound, 1);
		assert.strictEqual(res.files[0].fileName, "clinic_pricelist_2026.csv");
	});
});

// ============================================================================
// 2. ТЕСТЫ: replace_file_content
// ============================================================================

describe("Инструмент replace_file_content — Точечное редактирование файлов на ПК врача", () => {
	const patchFile = path.join(SCRATCH_SEARCH_DIR, "patch_target.txt");

	beforeEach(async () => {
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
		}
		await fs.promises.mkdir(SCRATCH_SEARCH_DIR, { recursive: true });

		const initialContent = [
			"Линия 1: Заголовок отчета",
			"Линия 2: Врач терапевт Сидоров",
			"Линия 3: Стоимость приема 3000 руб.",
			"Линия 4: Врач терапевт Сидоров",
			"Линия 5: Завершение протокола",
		].join("\n");

		await fs.promises.writeFile(patchFile, initialContent, "utf8");
	});

	afterEach(async () => {
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
		}
	});

	test("Успешно заменяет одиночный уникальный фрагмент текста", async () => {
		const res = (await handleReplaceFileContent(
			{
				targetFile: patchFile,
				targetContent: "Стоимость приема 3000 руб.",
				replacementContent: "Стоимость приема 4500 руб.",
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.replacementsCount, 1);

		const updated = await fs.promises.readFile(patchFile, "utf8");
		assert.ok(updated.includes("Стоимость приема 4500 руб."));
		assert.ok(!updated.includes("Стоимость приема 3000 руб."));
	});

	test("Ограничивает область замены диапазоном строк (startLine, endLine)", async () => {
		// "Врач терапевт Сидоров" встречается на линиях 2 и 4
		const res = (await handleReplaceFileContent(
			{
				targetFile: patchFile,
				targetContent: "Врач терапевт Сидоров",
				replacementContent: "Врач терапевт Иванов",
				startLine: 1,
				endLine: 3,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.replacementsCount, 1);

		const updated = await fs.promises.readFile(patchFile, "utf8");
		const lines = updated.split("\n");
		assert.strictEqual(lines[1], "Линия 2: Врач терапевт Иванов");
		// Линия 4 осталась прежней
		assert.strictEqual(lines[3], "Линия 4: Врач терапевт Сидоров");
	});

	test("Отказывает при наличии нескольких вхождений без allowMultiple", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchFile,
				targetContent: "Врач терапевт Сидоров",
				replacementContent: "Новый врач",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("Обнаружено 2 вхождений") || res.error?.includes("2 вхождений"));
	});

	test("Успешно заменяет все вхождения при allowMultiple: true", async () => {
		const res = (await handleReplaceFileContent(
			{
				targetFile: patchFile,
				targetContent: "Врач терапевт Сидоров",
				replacementContent: "Врач терапевт Петров",
				allowMultiple: true,
			},
			DESKTOP_CTX,
		)) as any;

		assert.strictEqual(res.success, true);
		assert.strictEqual(res.replacementsCount, 2);

		const updated = await fs.promises.readFile(patchFile, "utf8");
		assert.ok(!updated.includes("Сидоров"));
		assert.strictEqual(updated.split("Петров").length - 1, 2);
	});

	test("Возвращает ошибку, если целевой фрагмент не найден", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchFile,
				targetContent: "Несуществующий текст в документе",
				replacementContent: "Замена",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("не найден"));
	});

	test("Блокирует модификацию защищенных системных файлов (Red Team Path Guard)", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: "C:\\Windows\\System32\\drivers\\etc\\hosts",
				targetContent: "127.0.0.1",
				replacementContent: "10.0.0.1",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("Отказ безопасности"));
	});

	test("Блокирует модификацию исполняемых файлов (Executable Drop Guard)", async () => {
		const exeFile = path.join(SCRATCH_SEARCH_DIR, "trojan.exe");
		await fs.promises.writeFile(exeFile, "MZ binary dummy");

		const res = await handleReplaceFileContent(
			{
				targetFile: exeFile,
				targetContent: "MZ",
				replacementContent: "XX",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("исполняемых файлов"));
	});

	test("Блокирует выполнение в web_browser режиме", async () => {
		const res = (await handleReplaceFileContent(
			{
				targetFile: patchFile,
				targetContent: "Линия 1",
				replacementContent: "Линия X",
			},
			WEB_CTX,
		)) as any;

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("только в режиме локальной станции врача"));
	});
});

// ============================================================================
// 3. ТЕСТЫ: configure_clinic_setup
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
// 4. ТЕСТЫ: import_clinic_data_file
// ============================================================================

describe("Инструмент import_clinic_data_file — Пакетный импорт данных клиники из файлов", () => {
	const csvPricelistComma = path.join(SCRATCH_SEARCH_DIR, "import_pricelist_comma.csv");
	const csvPricelistSemi = path.join(SCRATCH_SEARCH_DIR, "import_pricelist_semi.csv");
	const jsonPricelist = path.join(SCRATCH_SEARCH_DIR, "import_pricelist.json");
	const csvPatients = path.join(SCRATCH_SEARCH_DIR, "import_patients.csv");
	const jsonPatients = path.join(SCRATCH_SEARCH_DIR, "import_patients.json");

	beforeEach(async () => {
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
		}
		await fs.promises.mkdir(SCRATCH_SEARCH_DIR, { recursive: true });

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
				"ERR-1;;500;терапия", // без названия — должна быть пропущена
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
				",+79000000000,1990-01-01,Без ФИО", // должна быть пропущена
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
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
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
		assert.strictEqual(mockDb.store.services.length, 3);
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
		assert.strictEqual(res.skippedCount, 1); // 1 строка без наименования пропущена
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
		assert.strictEqual(res.skippedCount, 1); // строка без ФИО пропущена
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
		// В базу данных ничего не записано
		assert.strictEqual(mockDb.store.serviceCatalogItems.length, 0);
		assert.strictEqual(mockDb.store.services.length, 0);
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
				filePath: path.join(SCRATCH_SEARCH_DIR, "non_existent_file.csv"),
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
