import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DentalPricelistAnalysisResponse } from "@dental/shared";
import { SettingsPricesTabContent } from "../views/settingsView/tabRenderers/SettingsPricesTabContent.js";
import { AppLogicProvider } from "../contexts/AppLogicContext.js";

describe("вкладки настроек отрисовывают переданные пропсы анализа прайса", () => {
	it("SettingsPricesTabContent выводит warnings, summary материалов и note фото прайса без потерь", () => {
		const analysis: DentalPricelistAnalysisResponse = {
			mode: "ai",
			recognizedCount: 1,
			warnings: ["missing_duration"],
			summary: [
				{
					category: "Терапия",
					specialty: "therapist",
					count: 1,
					pricedCount: 1,
					minPriceRub: 4500,
					maxPriceRub: 4500,
					averagePriceRub: 4500,
					materials: ["Estelite"],
					brands: ["Tokuyama"],
					restorationTypes: ["Пломба"],
				},
			],
			items: [
				{
					title: "Лечение кариеса",
					category: "therapy",
					specialty: "therapist",
					basePriceRub: 4500,
					durationMinutes: 60,
					materials: ["Estelite"],
					brands: ["Tokuyama"],
					restorationTypes: [],
					warnings: ["missing_code"],
				},
			],
		};

		const html = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: { dashboard: null } },
				React.createElement(SettingsPricesTabContent, {
					pricelistAnalysis: analysis,
					pricelistImageNote: "Снимок прейскуранта проверен",
					pricelistWarningsText: (w) => `Предупреждение:${w.join(",")}`,
					pricelistItemMaterialText: () => "Материал:Estelite",
					pricelistMaterialSummaryText: () => "Сводка:Estelite",
				}),
			),
		);

		assert.ok(html.includes("Предупреждение:missing_duration"));
		assert.ok(html.includes("Фото прайса: Снимок прейскуранта проверен"));
		assert.ok(html.includes("Сводка:Estelite"));
		assert.ok(html.includes("Материал:Estelite") || html.includes("missing_code"));
	});
});
