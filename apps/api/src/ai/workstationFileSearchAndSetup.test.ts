/**
 * workstationFileSearchAndSetup.test.ts — Тестирование файлового поиска и патчинга на ПК врача:
 * 1. search_workstation_files: рекурсивный поиск файлов на ПК врача, фильтры по маске, расширениям, датам, детекция модальностей.
 * 2. replace_file_content: точечный патчинг файлов на ПК, диапазон строк, защита от неоднозначности, executable drop guard.
 *
 * Sweet Spot 200-300 строк (Мандат 8b / 8zi).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { afterEach, beforeEach, describe } from "node:test";
import {
	executeDentalTool,
	handleReplaceFileContent,
	handleSearchWorkstationFiles,
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

