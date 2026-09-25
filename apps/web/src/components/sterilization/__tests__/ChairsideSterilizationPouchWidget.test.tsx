/**
 * ============================================================================
 * TEST: CHAIRSIDE STERILIZATION POUCH WIDGET ELIMINATION & DOCTOR PURITY
 * Проверка физической ликвидации ChairsideSterilizationPouchWidget (Мандаты 8e, 8v, 8s),
 * чистоты экрана врача (VisitView.tsx, VisitSoapEditor.tsx свободны от карго-культа)
 * и отсутствия экспорта в components/sterilization/index.ts.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	insertPouchIntoDiaryText,
	formatPouch043StatutorySnippet,
} from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("ChairsideSterilizationPouchWidget Elimination & Doctor Screen Purity (СанПиН 3.3686-21, Мандаты 8e, 8v, 8s)", () => {
	it("1. подтверждает физическую ликвидацию ChairsideSterilizationPouchWidget.tsx из компонентов стерилизации", () => {
		const widgetPath = path.join(
			webSrcRoot,
			"components/sterilization/ChairsideSterilizationPouchWidget.tsx",
		);
		assert.equal(
			fs.existsSync(widgetPath),
			false,
			"ChairsideSterilizationPouchWidget.tsx обязан быть физически удален (Мандаты 8v, 8s, 8e)",
		);
	});

	it("2. подтверждает отсутствие экспорта ChairsideSterilizationPouchWidget в components/sterilization/index.ts", () => {
		const indexPath = path.join(
			webSrcRoot,
			"components/sterilization/index.ts",
		);
		assert.ok(fs.existsSync(indexPath), "components/sterilization/index.ts должен существовать");
		const indexContent = fs.readFileSync(indexPath, "utf8");

		assert.ok(
			!indexContent.includes("ChairsideSterilizationPouchWidget"),
			"components/sterilization/index.ts не должен экспортировать удаленный ChairsideSterilizationPouchWidget",
		);
	});

	it("3. вставляет регламентную запись в дневник без дублирования при повторном вызове (дедупликация SSOT)", () => {
		const snippet = formatPouch043StatutorySnippet({ pouchCode: "КП-0925-14" });
		const existingDiary = "Анестезия Убистезин 1.7 мл. Препарирование полости.";

		const updated = insertPouchIntoDiaryText(existingDiary, snippet, "КП-0925-14");
		assert.ok(updated.includes(snippet));
		assert.ok(updated.includes(existingDiary));

		// Повторная вставка того же крафт-пакета не должна дублировать запись
		const deduplicated = insertPouchIntoDiaryText(updated, snippet, "КП-0925-14");
		assert.equal(deduplicated, updated, "Не должно быть дублирования записи в дневнике");
	});

	it("4. подтверждает отсутствие ChairsideSterilizationPouchWidget на экранах врача (VisitView.tsx и VisitSoapEditor.tsx чисты, Мандаты 8e, 8n, 8v)", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		const visitSoapPath = path.join(webSrcRoot, "components/visit/VisitSoapEditor.tsx");

		assert.ok(fs.existsSync(visitViewPath), "VisitView.tsx должен существовать");
		assert.ok(fs.existsSync(visitSoapPath), "VisitSoapEditor.tsx должен существовать");

		const visitViewContent = fs.readFileSync(visitViewPath, "utf8");
		const visitSoapContent = fs.readFileSync(visitSoapPath, "utf8");

		// VisitView.tsx не должен импортировать или монтировать виджет стерилизации в тулбаре врача
		assert.ok(
			!visitViewContent.includes("ChairsideSterilizationPouchWidget"),
			"VisitView.tsx не должен содержать импорт или использование ChairsideSterilizationPouchWidget (экран врача чист, Мандат 8e/8v)",
		);
		assert.ok(
			!visitViewContent.includes("<ChairsideSterilizationPouchWidget"),
			"VisitView.tsx не должен монтировать ChairsideSterilizationPouchWidget",
		);

		// VisitSoapEditor.tsx не должен содержать виджет стерилизации в тулбаре дневника лечения
		assert.ok(
			!visitSoapContent.includes("ChairsideSterilizationPouchWidget"),
			"VisitSoapEditor.tsx не должен содержать ChairsideSterilizationPouchWidget (экран врача чист, Мандат 8e/8v)",
		);
		assert.ok(
			!visitSoapContent.includes("<ChairsideSterilizationPouchWidget"),
			"VisitSoapEditor.tsx не должен монтировать ChairsideSterilizationPouchWidget",
		);

		// OdontogramModule.tsx не должен содержать виджет стерилизации (зубная формула чиста)
		const odontogramPath = path.join(
			webSrcRoot,
			"components/odontogram/OdontogramModule.tsx",
		);
		if (fs.existsSync(odontogramPath)) {
			const odontogramContent = fs.readFileSync(odontogramPath, "utf8");
			assert.ok(
				!odontogramContent.includes("ChairsideSterilizationPouchWidget"),
				"OdontogramModule.tsx не должен содержать ChairsideSterilizationPouchWidget (зубная формула чиста, Мандат 8e/8v)",
			);
		}
	});

	it("5. проверяет ликвидацию зеркального файла apps/web/.../sterilizationPouchEngine.ts (SSOT в @dental/shared)", () => {
		const duplicatePath = path.join(
			webSrcRoot,
			"components/sterilization/sterilizationPouchEngine.ts",
		);
		assert.equal(
			fs.existsSync(duplicatePath),
			false,
			"Зеркальный дубликат apps/web/.../sterilizationPouchEngine.ts должен быть физически снесен",
		);

		// Единая точка истины (SSOT) должна существовать в shared
		const sharedEnginePath = path.resolve(
			webSrcRoot,
			"../../../packages/shared/src/sanpin/sterilizationPouchEngine.ts",
		);
		assert.ok(
			fs.existsSync(sharedEnginePath),
			"packages/shared/src/sanpin/sterilizationPouchEngine.ts является единой точкой истины",
		);
	});

	it("6. подтверждает отсутствие обязательного сканирования лотков врачом у кресла (Мандат 8v)", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		const visitViewContent = fs.readFileSync(visitViewPath, "utf8");

		assert.ok(
			!visitViewContent.toLowerCase().includes("сканировать лоток"),
			"Экран визита врача не должен требовать обязательного сканирования лотков",
		);
		assert.ok(
			!visitViewContent.toLowerCase().includes("сканировать крафт"),
			"Экран визита врача не должен требовать обязательного сканирования крафт-пакетов",
		);
	});
});
