import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	BASELINE_804N_PRICELIST_SERVICES,
	type ServicePricelistItem,
} from "../components/catalog/pricelist/servicePricelistPresets";

const here = dirname(fileURLToPath(import.meta.url));

describe("Базовый рекомендованный прейскурант 804н (30 услуг) и 1-клик наполнение", () => {
	it("клиентский пресет содержит ровно 30 канонических услуг", () => {
		assert.equal(BASELINE_804N_PRICELIST_SERVICES.length, 30);
	});

	it("каждая услуга имеет валидный код номенклатуры 804н (класс A или B)", () => {
		const code804nRegex = /^A\d{2}\.\d{2}\.\d{3}(\.\d{3})?$|^B\d{2}\.\d{3}\.\d{3}(\.\d{3})?$/;
		for (const item of BASELINE_804N_PRICELIST_SERVICES) {
			assert.ok(
				code804nRegex.test(item.code804n),
				`Услуга ${item.id} («${item.commercialTitle}») имеет некорректный код 804н: «${item.code804n}»`,
			);
		}
	});

	it("цены в рублях и копейках строго согласованы (Мандат 8b: копейка в копейку)", () => {
		for (const item of BASELINE_804N_PRICELIST_SERVICES) {
			assert.ok(item.basePriceRub > 0, `Услуга ${item.code804n} имеет нулевую или отрицательную цену`);
			assert.equal(
				item.basePriceKopecks,
				Math.round(item.basePriceRub * 100),
				`Услуга ${item.code804n} имеет расхождение между basePriceRub (${item.basePriceRub}) и basePriceKopecks (${item.basePriceKopecks})`,
			);
		}
	});

	it("все услуги содержат официальное наименование Минздрава 804н и понятное коммерческое наименование", () => {
		for (const item of BASELINE_804N_PRICELIST_SERVICES) {
			assert.ok(item.statutoryTitle804n.trim().length > 5, `Пустое номенклатурное название у ${item.code804n}`);
			assert.ok(item.commercialTitle.trim().length > 5, `Пустое коммерческое название у ${item.code804n}`);
		}
	});

	it("НДС равен 0% с указанием ссылки на пп. 2 п. 2 ст. 149 НК РФ", () => {
		for (const item of BASELINE_804N_PRICELIST_SERVICES) {
			assert.equal(item.vatRate, 0);
			assert.ok(
				item.vatExemptionArticle.includes("149"),
				`Услуга ${item.code804n} не содержит ссылки на статью 149 НК РФ`,
			);
		}
	});

	it("пресет покрывает ключевые клинические направления: терапия, хирургия, ортопедия, гигиена, консультация, радиовизиография", () => {
		const categories = new Set(BASELINE_804N_PRICELIST_SERVICES.map((s) => s.category));
		assert.ok(categories.has("therapy"), "Отсутствует категория терапия");
		assert.ok(categories.has("surgery"), "Отсутствует категория хирургия");
		assert.ok(categories.has("orthopedics"), "Отсутствует категория ортопедия");
		assert.ok(categories.has("hygiene"), "Отсутствует категория гигиена");
		assert.ok(categories.has("consultation"), "Отсутствует категория консультация");
		assert.ok(categories.has("radiology"), "Отсутствует категория радиовизиография");
	});

	it("SettingsPricesTab.tsx содержит кнопку быстрого заполнения с data-testid='pricelist-seed-baseline-804n-btn' и в пустом каталоге, и в меню 804н", () => {
		const tabPath = join(here, "..", "components", "settings", "SettingsPricesTab.tsx");
		const tabContent = readFileSync(tabPath, "utf8");

		const testIdMatches = tabContent.match(/data-testid="pricelist-seed-baseline-804n-btn"/g);
		assert.ok(testIdMatches, "В SettingsPricesTab.tsx отсутствует data-testid='pricelist-seed-baseline-804n-btn'");
		assert.ok(
			testIdMatches.length >= 2,
			`Ожидалось как минимум 2 точки вызова (пустой каталог и меню 804н), найдено: ${testIdMatches.length}`,
		);

		assert.ok(
			tabContent.includes("/api/pricelist/seed-baseline-804n"),
			"SettingsPricesTab.tsx должен вызывать серверный маршрут /api/pricelist/seed-baseline-804n",
		);
		assert.ok(
			tabContent.includes("Заполнить рекомендованный прейскурант 804н (30 базовых услуг)"),
			"В пустом состоянии каталога должна быть карточка с текстом о заполнении 30 базовых услуг",
		);
	});
});
