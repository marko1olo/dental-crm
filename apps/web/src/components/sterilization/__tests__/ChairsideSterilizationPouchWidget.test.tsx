/**
 * ============================================================================
 * TEST: CHAIRSIDE STERILIZATION POUCH WIDGET & VISITVIEW INTEGRATION
 * Проверка эргономики виджета стерилизации у кресла (28-32px), 1-клик фиксации
 * крафт-пакета в карте 043/у, интеграции в VisitView.tsx и ликвидации дубликата.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ChairsideSterilizationPouchWidget,
} from "../ChairsideSterilizationPouchWidget.js";
import {
	generateChairsidePouchCode,
	insertPouchIntoDiaryText,
	formatPouch043StatutorySnippet,
} from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("ChairsideSterilizationPouchWidget & VisitView Integration (СанПиН 3.3686-21)", () => {
	it("1. рендерит компактный эргономичный виджет высотой 28-32px (Мандат 8e / HIG)", () => {
		const html = renderToString(
			<ChairsideSterilizationPouchWidget
				defaultPouchCode="КП-0925-14"
			/>,
		);

		assert.ok(html.includes("data-testid=\"btn-chairside-pouch-widget\""));
		assert.ok(html.includes("min-h-[28px]"));
		assert.ok(html.includes("h-7 sm:h-8"));
		assert.ok(html.includes("КП-0925-14"));
		assert.ok(html.includes("Стерильно"));
	});

	it("2. отображает бейдж «043/у», когда крафт-пакет зафиксирован в тексте дневника", () => {
		const code = "КП-0925-14";
		const diaryText = `Стерильный лоток №${code} вскрыт в присутствии пациента, индикатор 5 класса сработал.\n\nЛечение зуба 16.`;

		const html = renderToString(
			<ChairsideSterilizationPouchWidget
				defaultPouchCode={code}
				currentDiaryText={diaryText}
			/>,
		);

		assert.ok(html.includes("043/у"), "Должен отображать зеленый бейдж 043/у при привязке к дневнику");
		assert.ok(html.includes("bg-emerald-600"), "Бейдж 043/у должен иметь зеленый статус");
	});

	it("3. вставляет регламентную запись в дневник без дублирования при повторном вызове", () => {
		const snippet = formatPouch043StatutorySnippet({ pouchCode: "КП-0925-14" });
		const existingDiary = "Анестезия Убистезин 1.7 мл. Препарирование полости.";

		const updated = insertPouchIntoDiaryText(existingDiary, snippet, "КП-0925-14");
		assert.ok(updated.includes(snippet));
		assert.ok(updated.includes(existingDiary));

		// Повторная вставка того же крафт-пакета не должна дублировать запись
		const deduplicated = insertPouchIntoDiaryText(updated, snippet, "КП-0925-14");
		assert.equal(deduplicated, updated, "Не должно быть дублирования записи в дневнике");
	});

	it("4. подтверждает интеграцию ChairsideSterilizationPouchWidget в VisitView.tsx", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		assert.ok(fs.existsSync(visitViewPath), "VisitView.tsx должен существовать");
		const content = fs.readFileSync(visitViewPath, "utf8");

		// Проверяем импорт виджета
		assert.ok(
			content.includes("ChairsideSterilizationPouchWidget"),
			"VisitView.tsx обязан импортировать ChairsideSterilizationPouchWidget",
		);

		// Проверяем импорт функции insertPouchIntoDiaryText из @dental/shared
		assert.ok(
			content.includes("insertPouchIntoDiaryText"),
			"VisitView.tsx обязан импортировать insertPouchIntoDiaryText из @dental/shared",
		);

		// Проверяем монтирование виджета в шапке рядом с кнопкой нормы
		assert.ok(
			content.includes("<ChairsideSterilizationPouchWidget"),
			"VisitView.tsx обязан монтировать ChairsideSterilizationPouchWidget",
		);

		// Проверяем привязку к 043/у через updateVisitNoteField и toast
		assert.ok(
			content.includes("updateVisitNoteField(\"treatmentPlan\", updated)"),
			"VisitView.tsx обязан обновлять treatmentPlan при фиксации крафт-пакета",
		);
	});

	it("5. проверяет ликвидацию зеркального файла apps/web/.../sterilizationPouchEngine.ts", () => {
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

	it("6. проверяет нулевой уровень шума и отсутствие обязательного сканирования (Мандат 8v)", () => {
		const widgetPath = path.join(
			webSrcRoot,
			"components/sterilization/ChairsideSterilizationPouchWidget.tsx",
		);
		const widgetContent = fs.readFileSync(widgetPath, "utf8");

		assert.ok(
			!widgetContent.toLowerCase().includes("сканировать лоток"),
			"Виджет не должен требовать обязательного сканирования лотков",
		);
		assert.ok(
			!widgetContent.toLowerCase().includes("сканировать крафт"),
			"Виджет не должен требовать обязательного сканирования крафт-пакетов",
		);
	});
});
