/**
 * apps/web/src/tests/sterilizationBatchingAndErgonomicsInquisitor.test.ts
 *
 * SUPREME RED TEAM INQUISITOR SUITE:
 * Стерилизация, пакетное автоклавирование и автономия врача (Мандаты 8e, 8n, 8x, 8ap, 8b, 8am).
 *
 * 1. Отсечение микро-трекинга из приёма врача:
 *    - Хук useVisitDiaryTrayHandlers не блокирует подписание карты при отсутствии лотка.
 *    - Тихое фоновое связывание без назойливых предупреждений и всплывающего спама.
 * 2. Пакетное автоклавирование в 1 клик:
 *    - Выбор программ: 134°C 5 мин, 121°C 20 мин, Прион 134°C 18 мин.
 *    - Автоматическое списание индикаторов и пакетов со склада (Soft Negative Stock).
 *    - Печать журнала контроля стерилизации в 1 клик.
 *    - Ровно 1 Primary CTA кнопка «✓ Запустить цикл стерилизации».
 * 3. Чистота от советского канцелярита и номеров приказов (Мандат 8x & 8ap).
 * 4. Архитектурная чистота и Sweet Spot (Мандат 8b/8zi).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
	AUTOCLAVE_PROGRAMS,
	validateSterilizationCycleParameters,
	createOneClickShiftBatch,
	generateSanpinPrintHtml,
	type AutoclaveRegimeId,
} from "../components/sanpin/sanpinCatalogData";
import { CLINICAL_BATCH_TEMPLATES } from "../components/sanpin/SterilizationBatchCycleModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../../");

describe("Red Team Inquisitor: Стерилизация и пакетное автоклавирование (Мандаты 8e, 8n, 8x, 8ap)", () => {
	describe("1. Отсечение микро-трекинга из приёма врача (Мандаты 8e, 8n)", () => {
		it("проверяет отсутствие назойливых спам-тостов и блокировок в useVisitDiaryTrayHandlers.ts", () => {
			const filePath = path.resolve(
				REPO_ROOT,
				"apps/web/src/components/visit/diaryLogic/useVisitDiaryTrayHandlers.ts",
			);
			assert.ok(fs.existsSync(filePath), "useVisitDiaryTrayHandlers.ts должен существовать");
			const content = fs.readFileSync(filePath, "utf-8");

			// Проверяем, что в linkSterilizationTray нет назойливых тостов при сетевой ошибке или 400
			const linkFnMatch = content.match(/const linkSterilizationTray = async[\s\S]*?^(\t|\s{2})\};/m);
			assert.ok(linkFnMatch, "Функция linkSterilizationTray должна присутствовать");
			const linkFnBody = linkFnMatch[0];

			// Не должно быть showToast внутри linkSterilizationTray
			assert.ok(
				!linkFnBody.includes("showToast"),
				"linkSterilizationTray обязан быть тихим в фоне без всплывающего спама (Мандат 8e/8n)",
			);

			// Логирование в logger.warn сохранено для системного аудита
			assert.ok(linkFnBody.includes("logger.warn"), "Фоновое предупреждение должно логироваться");

			// При отсутствии штрихкода или ошибке возвращается успех ({ ok: true })
			assert.ok(linkFnBody.includes("return { ok: true"), "Подписание карты никогда не блокируется");
		});

		it("проверяет наличие канонического фасада useVisitDiaryTrayHandlers в директории hooks", () => {
			const facadePath = path.resolve(
				REPO_ROOT,
				"apps/web/src/components/visit/hooks/useVisitDiaryTrayHandlers.ts",
			);
			assert.ok(fs.existsSync(facadePath), "Фасад hooks/useVisitDiaryTrayHandlers.ts обязан существовать");
			const content = fs.readFileSync(facadePath, "utf-8");
			assert.ok(content.includes("export * from \"../diaryLogic/useVisitDiaryTrayHandlers\""));
		});
	});

	describe("2. Пакетное автоклавирование в 1 клик (Batch Cycles & Soft Negative Stock)", () => {
		it("проверяет наличие программ 134°C 5 мин, 121°C 20 мин и Прион 134°C 18 мин", () => {
			const prog134 = AUTOCLAVE_PROGRAMS.find((p) => p.id === "standard_134");
			const prog121 = AUTOCLAVE_PROGRAMS.find((p) => p.id === "delicate_121");
			const progPrion = AUTOCLAVE_PROGRAMS.find((p) => p.id === "prion_134");

			assert.ok(prog134, "Программа 134°C 5 мин обязана присутствовать");
			assert.equal(prog134.temperatureCelsius, 134);
			assert.equal(prog134.exposureMinutes, 5);
			assert.equal(prog134.pressureBar, 2.1);

			assert.ok(prog121, "Программа 121°C 20 мин обязана присутствовать");
			assert.equal(prog121.temperatureCelsius, 121);
			assert.equal(prog121.exposureMinutes, 20);
			assert.equal(prog121.pressureBar, 1.15);

			assert.ok(progPrion, "Антиприонная программа 134°C 18 мин обязана присутствовать");
			assert.equal(progPrion.temperatureCelsius, 134);
			assert.equal(progPrion.exposureMinutes, 18);
			assert.equal(progPrion.pressureBar, 2.1);
		});

		it("валидирует физические параметры антиприонного цикла 134°C 18 мин", () => {
			const validPrion = validateSterilizationCycleParameters("prion_134", 134.0, 2.1, 18.0);
			assert.equal(validPrion.valid, true);

			const lowTempPrion = validateSterilizationCycleParameters("prion_134", 130.0, 2.1, 18.0);
			assert.equal(lowTempPrion.valid, false);

			const shortTimePrion = validateSterilizationCycleParameters("prion_134", 134.0, 2.1, 15.0);
			assert.equal(shortTimePrion.valid, false);
		});

		it("проверяет автоматическое фоновое списание индикаторов и пакетов (Soft Negative Stock, Мандат 8n)", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 16 });
			assert.ok(batch.deductedStock.length >= 2, "Должно списываться не менее 2 позиций расходников");

			const kraftPacks = batch.deductedStock.find((s) => s.sku.includes("kraft") || s.title.includes("Крафт"));
			const indicator = batch.deductedStock.find((s) => s.sku.includes("indicator") || s.title.includes("индикатор"));

			assert.ok(kraftPacks, "Крафт-пакеты должны быть в списке списания");
			assert.equal(kraftPacks.quantity, 16);

			assert.ok(indicator, "Химический индикатор 5 класса должен быть в списке списания");
			assert.ok(indicator.quantity >= 1, "Количество индикаторов должно быть >= 1");
		});

		it("генерирует печатную форму журнала контроля стерилизации в 1 клик", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 12 });
			const html = generateSanpinPrintHtml([batch.sterilizationCycle]);

			assert.ok(html.includes("Журнал контроля стерилизации"));
			assert.ok(html.includes("№1"));
			assert.ok(html.includes("12 шт"));
			assert.ok(html.includes("ПРОЙДЕН"));
		});

		it("проверяет разметку и кнопки в SterilizationBatchCycleModal.tsx", () => {
			const modalPath = path.resolve(
				REPO_ROOT,
				"apps/web/src/components/sanpin/SterilizationBatchCycleModal.tsx",
			);
			const content = fs.readFileSync(modalPath, "utf-8");

			// Кнопка запуска цикла
			assert.ok(
				content.includes("✓ Запустить цикл стерилизации"),
				"Кнопка запуска должна называться «✓ Запустить цикл стерилизации»",
			);
			assert.ok(content.includes("data-testid=\"confirm-sterilization-cycle-btn\""));

			// Кнопка печати журнала в 1 клик
			assert.ok(
				content.includes("data-testid=\"sterilization-print-journal-btn\""),
				"Кнопка быстрой печати журнала должна присутствовать",
			);

			// Выбор антиприонного режима
			assert.ok(content.includes("drawer-preset-btn-prion_134_18"), "Кнопка выбора прионного режима");
			assert.ok(content.includes("drawer-preset-btn-standard_134_5"), "Кнопка выбора стандартного режима");
			assert.ok(content.includes("drawer-preset-btn-delicate_121_20"), "Кнопка выбора бережного режима");

			// Отсутствие disabled на кнопках
			assert.ok(!content.includes("disabled={"), "Никаких заблокированных кнопок (Мандат 8e)");
		});

		it("проверяет фасад SterilizationBatchCycleModal в директории components/sterilization", () => {
			const facadePath = path.resolve(
				REPO_ROOT,
				"apps/web/src/components/sterilization/SterilizationBatchCycleModal.tsx",
			);
			assert.ok(fs.existsSync(facadePath), "Фасад components/sterilization/SterilizationBatchCycleModal.tsx обязан существовать");
			const content = fs.readFileSync(facadePath, "utf-8");
			assert.ok(content.includes("export * from \"../sanpin/SterilizationBatchCycleModal\""));
		});
	});

	describe("3. Ликвидация советского канцелярита и номеров приказов в UI (Мандаты 8x & 8ap)", () => {
		it("проверяет отсутствие номеров приказов в кнопках и заголовках SterilizationBatchCycleModal.tsx", () => {
			const modalPath = path.resolve(
				REPO_ROOT,
				"apps/web/src/components/sanpin/SterilizationBatchCycleModal.tsx",
			);
			const content = fs.readFileSync(modalPath, "utf-8");

			// Не должно быть номеров СанПиН в заголовках и кнопках
			const forbiddenStrings = ["СанПиН 3.3686-21", "МУ 287-113", "Форма 257/у", "Форма 366/у"];
			for (const forbidden of forbiddenStrings) {
				assert.ok(
					!content.includes(`>${forbidden}<`) && !content.includes(`"${forbidden}"`),
					`Интерфейс не должен содержать канцелярит: ${forbidden}`,
				);
			}

			// Должен быть чистый клинический язык
			assert.ok(content.includes("Журнал стерилизации"));
			assert.ok(content.includes("Запуск автоклава"));
			assert.ok(content.includes("Крафт-пакеты") || content.includes("крафт-пакетов"));
			assert.ok(content.includes("Тест Бови-Дика / Индикаторы"));
		});
	});

	describe("4. Архитектурный Sweet Spot (Мандаты 8b & 8zi)", () => {
		it("проверяет размер ключевых компонентов (Sweet Spot: до 400 строк)", () => {
			const files = [
				"apps/web/src/components/sanpin/SterilizationBatchCycleModal.tsx",
				"apps/web/src/components/visit/diaryLogic/useVisitDiaryTrayHandlers.ts",
				"apps/web/src/components/sanpin/sanpinCatalogData.ts",
			];

			for (const relPath of files) {
				const fullPath = path.resolve(REPO_ROOT, relPath);
				const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
				assert.ok(
					lineCount <= 420,
					`Файл ${relPath} имеет ${lineCount} строк (норма <= 420 строк по Мандату 8b/8zi)`,
				);
			}
		});
	});
});
