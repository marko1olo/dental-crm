/**
 * workstationFileSearchAndSetup.test.ts — Тестирование файлового поиска и патчинга на ПК врача (6G Live SUT)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { afterEach, beforeEach, describe } from "node:test";
import {
	executeDentalTool,
	handleReadClinicalFile,
	handleReplaceFileContent,
	handleSearchWorkstationFiles,
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

describe("Инструмент search_workstation_files — Рекурсивный поиск файлов на ПК врача", () => {
	beforeEach(async () => {
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
		}
		await fs.promises.mkdir(SCRATCH_SEARCH_DIR, { recursive: true });

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
		const res = await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				category: "all",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("files" in res)) assert.fail("Expected files in search result");
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
		const res = await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				extensions: ["dcm", "rvg"],
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("files" in res)) assert.fail("Expected files in search result");
		assert.strictEqual(res.totalFound, 2);
		const fileNames = res.files.map((f) => f.fileName);
		assert.ok(fileNames.includes("tooth_16.dcm"));
		assert.ok(fileNames.includes("panoramic_study.rvg"));
		assert.strictEqual(fileNames.includes("clinic_pricelist_2026.csv"), false);
	});

	test("Фильтрует по текстовому запросу query ('*price*')", async () => {
		const res = await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				query: "*price*",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("files" in res)) assert.fail("Expected files in search result");
		assert.strictEqual(res.totalFound, 1);
		assert.strictEqual(res.files[0]?.fileName, "clinic_pricelist_2026.csv");
		assert.strictEqual(res.files[0]?.category, "pricelist");
		assert.strictEqual(res.files[0]?.detectedModality, "spreadsheet");
	});

	test("Определяет категорию и модальность файлов (xray_study vs pricelist vs patient_database)", async () => {
		const res = await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				category: "xray_study",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("files" in res)) assert.fail("Expected files in search result");
		assert.strictEqual(res.totalFound, 2);
		assert.strictEqual(res.files.every((f) => f.category === "xray_study"), true);
	});

	test("Ограничивает глубину сканирования (maxDepth: 1)", async () => {
		const res = await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				maxDepth: 1,
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("files" in res)) assert.fail("Expected files in search result");
		const fileNames = res.files.map((f) => f.fileName);
		assert.strictEqual(fileNames.includes("old_contracts.txt"), false);
	});

	test("Учитывает ограничение maxResults", async () => {
		const res = await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				maxResults: 2,
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("files" in res)) assert.fail("Expected files in search result");
		assert.strictEqual(res.totalFound, 2);
		assert.strictEqual(res.files.length, 2);
	});

	test("Блокирует выполнение в режиме web_browser (Security Guard)", async () => {
		const res = await handleSearchWorkstationFiles(
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
			},
			WEB_CTX,
		);

		assert.strictEqual(res.success, false);
		if (!("error" in res)) assert.fail("Expected security guard error");
		assert.strictEqual(res.error.includes("только в режиме локальной станции врача"), true);
	});

	test("Корректно вызывается через центральный диспетчер executeDentalTool", async () => {
		const raw = await executeDentalTool(
			"search_workstation_files",
			{
				searchRoots: [SCRATCH_SEARCH_DIR],
				extensions: ["csv"],
			},
			DESKTOP_CTX,
		);
		const res = raw as { success: boolean; totalFound?: number; files?: Array<{ fileName: string }> };
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.totalFound, 1);
		assert.strictEqual(res.files?.[0]?.fileName, "clinic_pricelist_2026.csv");
	});
});

describe("Инструмент replace_file_content — Точечное редактирование файлов на ПК врача", () => {
	const patchTarget = path.join(SCRATCH_SEARCH_DIR, "patch_target.txt");
	let prevDesktopExe: string | undefined;

	beforeEach(async () => {
		prevDesktopExe = process.env.IS_DESKTOP_EXE;
		process.env.IS_DESKTOP_EXE = "true";
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

		await fs.promises.writeFile(patchTarget, initialContent, "utf8");
	});

	afterEach(async () => {
		if (prevDesktopExe !== undefined) process.env.IS_DESKTOP_EXE = prevDesktopExe;
		else delete process.env.IS_DESKTOP_EXE;
		if (fs.existsSync(SCRATCH_SEARCH_DIR)) {
			await fs.promises.rm(SCRATCH_SEARCH_DIR, { recursive: true, force: true });
		}
	});

	test("Успешно заменяет одиночный уникальный фрагмент текста", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchTarget,
				targetContent: "Стоимость приема 3000 руб.",
				replacementContent: "Стоимость приема 4500 руб.",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("replacementsCount" in res)) assert.fail("Expected replacementsCount");
		assert.strictEqual(res.replacementsCount, 1);

		const readRes = await handleReadClinicalFile({ filePath: patchTarget, maxBytes: 10000 }, DESKTOP_CTX);
		assert.strictEqual(readRes.success, true);
		if (!("content" in readRes) || typeof readRes.content !== "string") assert.fail("Expected content");
		assert.strictEqual(
			readRes.content,
			[
				"Линия 1: Заголовок отчета",
				"Линия 2: Врач терапевт Сидоров",
				"Линия 3: Стоимость приема 4500 руб.",
				"Линия 4: Врач терапевт Сидоров",
				"Линия 5: Завершение протокола",
			].join("\n"),
		);
	});

	test("Ограничивает область замены диапазоном строк (startLine, endLine)", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchTarget,
				targetContent: "Врач терапевт Сидоров",
				replacementContent: "Врач терапевт Иванов",
				startLine: 1,
				endLine: 3,
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("replacementsCount" in res)) assert.fail("Expected replacementsCount");
		assert.strictEqual(res.replacementsCount, 1);

		const readRes = await handleReadClinicalFile({ filePath: patchTarget, maxBytes: 10000 }, DESKTOP_CTX);
		assert.strictEqual(readRes.success, true);
		if (!("content" in readRes) || typeof readRes.content !== "string") assert.fail("Expected content");
		const updatedRows = readRes.content.split("\n");
		assert.strictEqual(updatedRows[1], "Линия 2: Врач терапевт Иванов");
		assert.strictEqual(updatedRows[3], "Линия 4: Врач терапевт Сидоров");
	});

	test("Отказывает при наличии нескольких вхождений без allowMultiple", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchTarget,
				targetContent: "Врач терапевт Сидоров",
				replacementContent: "Новый врач",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("Обнаружено 2 вхождений") || res.error?.includes("2 вхождений"));
	});

	test("Успешно заменяет все вхождения при allowMultiple: true", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchTarget,
				targetContent: "Врач терапевт Сидоров",
				replacementContent: "Врач терапевт Петров",
				allowMultiple: true,
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, true);
		if (!("replacementsCount" in res)) assert.fail("Expected replacementsCount");
		assert.strictEqual(res.replacementsCount, 2);

		const readRes = await handleReadClinicalFile({ filePath: patchTarget, maxBytes: 10000 }, DESKTOP_CTX);
		assert.strictEqual(readRes.success, true);
		if (!("content" in readRes) || typeof readRes.content !== "string") assert.fail("Expected content");
		const updatedRows = readRes.content.split("\n");
		assert.strictEqual(updatedRows[1], "Линия 2: Врач терапевт Петров");
		assert.strictEqual(updatedRows[3], "Линия 4: Врач терапевт Петров");
	});

	test("Возвращает ошибку, если целевой фрагмент не найден", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchTarget,
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
		const exeLocation = path.join(SCRATCH_SEARCH_DIR, "trojan.exe");
		await fs.promises.writeFile(exeLocation, "MZ binary dummy");

		const res = await handleReplaceFileContent(
			{
				targetFile: exeLocation,
				targetContent: "MZ",
				replacementContent: "XX",
			},
			DESKTOP_CTX,
		);

		assert.strictEqual(res.success, false);
		assert.ok(res.error?.includes("исполняемых файлов"));
	});

	test("Блокирует выполнение в web_browser режиме", async () => {
		const res = await handleReplaceFileContent(
			{
				targetFile: patchTarget,
				targetContent: "Линия 1",
				replacementContent: "Линия X",
			},
			WEB_CTX,
		);

		assert.strictEqual(res.success, false);
		if (!("error" in res)) assert.fail("Expected web block error");
		assert.strictEqual(res.error.includes("только в режиме локальной станции врача"), true);
	});
});
