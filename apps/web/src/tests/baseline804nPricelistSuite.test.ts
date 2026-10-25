/**
 * apps/web/src/tests/baseline804nPricelistSuite.test.ts
 *
 * Семантический тест базового прейскуранта услуг клиники (30 услуг) и 1-клик наполнения.
 * Соответствует Мандатам 8b (копейка в копейку), 8e (автономия врача), 8x (живой язык без канцелярита).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	BASELINE_PRICELIST_SERVICES,
	type ServicePricelistItem,
} from "../components/catalog/pricelist/servicePricelistPresets";

const here = dirname(fileURLToPath(import.meta.url));

describe("Базовый рекомендованный прейскурант клиники (30 услуг) и быстрое наполнение каталога", () => {
	it("клиентский пресет содержит ровно 30 канонических клинических услуг", () => {
		assert.equal(BASELINE_PRICELIST_SERVICES.length, 30);
	});

	it("каждая услуга имеет валидный код медицинской номенклатуры (класс A или B)", () => {
		const statutoryCodeRegex = /^[ABАВ]\d{2}\.\d{2,3}\.\d{3}(\.\d{3})?$/i;
		for (const item of BASELINE_PRICELIST_SERVICES) {
			const code = item.statutoryCode || item.code804n;
			assert.ok(
				statutoryCodeRegex.test(code),
				`Услуга ${item.id} («${item.commercialTitle}») имеет некорректный номенклатурный код: «${code}»`,
			);
		}
	});

	it("цены в рублях и копейках строго согласованы (Мандат 8b: копейка в копейку)", () => {
		for (const item of BASELINE_PRICELIST_SERVICES) {
			const code = item.statutoryCode || item.code804n;
			assert.ok(item.basePriceRub > 0, `Услуга ${code} имеет нулевую или отрицательную цену`);
			assert.equal(
				item.basePriceKopecks,
				Math.round(item.basePriceRub * 100),
				`Услуга ${code} имеет расхождение между basePriceRub (${item.basePriceRub}) и basePriceKopecks (${item.basePriceKopecks})`,
			);
		}
	});

	it("все услуги содержат официальное наименование номенклатуры и понятное коммерческое наименование", () => {
		for (const item of BASELINE_PRICELIST_SERVICES) {
			const code = item.statutoryCode || item.code804n;
			const statTitle = item.statutoryTitle || item.statutoryTitle804n;
			assert.ok(statTitle.trim().length > 5, `Пустое номенклатурное название у ${code}`);
			assert.ok(item.commercialTitle.trim().length > 5, `Пустое коммерческое название у ${code}`);
		}
	});

	it("НДС равен 0% с указанием ссылки на пп. 2 п. 2 ст. 149 НК РФ", () => {
		for (const item of BASELINE_PRICELIST_SERVICES) {
			const code = item.statutoryCode || item.code804n;
			assert.equal(item.vatRate, 0);
			assert.ok(
				item.vatExemptionArticle.includes("149"),
				`Услуга ${code} не содержит ссылки на статью 149 НК РФ`,
			);
		}
	});

	it("пресет покрывает ключевые клинические направления: терапия, хирургия, ортопедия, гигиена, консультация, радиовизиография", () => {
		const categories = new Set(BASELINE_PRICELIST_SERVICES.map((s) => s.category));
		assert.ok(categories.has("therapy"), "Отсутствует категория терапия");
		assert.ok(categories.has("surgery"), "Отсутствует категория хирургия");
		assert.ok(categories.has("orthopedics"), "Отсутствует категория ортопедия");
		assert.ok(categories.has("hygiene"), "Отсутствует категория гигиена");
		assert.ok(categories.has("consultation"), "Отсутствует категория консультация");
		assert.ok(categories.has("radiology"), "Отсутствует категория радиовизиография");
	});

	it("SettingsPricesTab и его подмодули содержат кнопку быстрого заполнения с data-testid='pricelist-seed-standard-catalog-btn' и в пустом каталоге, и в меню справочника", () => {
		const settingsDir = join(here, "..", "components", "settings");
		const tabContent = [
			readFileSync(join(settingsDir, "SettingsPricesTab.tsx"), "utf8"),
			readFileSync(join(settingsDir, "pricesTab", "PricesFilterToolbar.tsx"), "utf8"),
			readFileSync(join(settingsDir, "pricesTab", "PricesCatalogTable.tsx"), "utf8"),
			readFileSync(join(settingsDir, "pricesTab", "useSettingsPricesLogic.ts"), "utf8"),
		].join("\n");

		const testIdMatches = tabContent.match(
			/data-testid="(?:pricelist-seed-baseline-804n-btn|pricelist-seed-standard-catalog-btn)"/g,
		);
		assert.ok(
			testIdMatches,
			"В модуле SettingsPricesTab отсутствует data-testid='pricelist-seed-standard-catalog-btn' / 'pricelist-seed-baseline-804n-btn'",
		);
		assert.ok(
			testIdMatches.length >= 2,
			`Ожидалось как минимум 2 точки вызова (пустой каталог и меню справочника), найдено: ${testIdMatches.length}`,
		);

		assert.ok(
			tabContent.includes("/api/pricelist/seed-baseline-804n") ||
				tabContent.includes("/api/pricelist/seed-standard-catalog"),
			"Модуль SettingsPricesTab должен вызывать серверный маршрут заполнения прейскуранта",
		);
		assert.ok(
			tabContent.includes("Заполнить базовый прейскурант (30 услуг)") ||
				tabContent.includes("Заполнить рекомендованный прейскурант"),
			"В пустом состоянии каталога должна быть карточка с текстом о заполнении 30 базовых услуг",
		);
	});
});
