/**
 * apps/web/src/components/catalog/__tests__/pricelistStudioSSOT.test.tsx
 *
 * Исчерпывающий Red Team аудит и верификация канонического SSOT прейскуранта.
 * Проверяет: 0 float-ошибок, 6 клинических категорий, автономию врача (Мандат 8e),
 * отсутствие канцелярита (Мандат 8x), поиск за 1 клик, Apple HIG и Direct Launchers.
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import {
	CANONICAL_CLINICAL_BUNDLES,
	CANONICAL_CLINICAL_CATEGORIES,
	CANONICAL_PRICELIST_PRESETS,
	calculateMarginKopecks,
	calculateMarginPercent,
	calculatePricelistStats,
	filterPricelist,
	formatKopecksToRubles,
	parseRublesToKopecks,
	loadCanonicalPricelist,
} from "../pricelistCatalogData";
import { ServicePriceListStudioModal, PricelistStudioModal } from "../ServicePriceListStudioModal";
import { PricelistItemDrawer } from "../PricelistItemDrawer";
import { DirectPricelistLauncher } from "../DirectPricelistLauncher";

describe("Канонический SSOT прейскуранта DENTE CRM", () => {
	describe("1. Финансовая целочисленная математика (0 float-ошибок)", () => {
		it("форматирует копейки в человекочитаемые рубли", () => {
			assert.equal(formatKopecksToRubles(0), "0\u00A0₽");
			assert.equal(formatKopecksToRubles(50000), "500\u00A0₽");
			assert.equal(formatKopecksToRubles(450000), "4\u00A0500\u00A0₽");
			assert.equal(formatKopecksToRubles(3500000), "35\u00A0000\u00A0₽");
		});

		it("надежно парсит строки цен в копейки без искажений", () => {
			assert.equal(parseRublesToKopecks("4 500 ₽"), 450000);
			assert.equal(parseRublesToKopecks("35000"), 3500000);
			assert.equal(parseRublesToKopecks("4500,50"), 450050);
			assert.equal(parseRublesToKopecks("1 200.00 руб"), 120000);
			assert.equal(parseRublesToKopecks("мусор"), 0);
		});

		it("вычисляет маржинальность в копейках и процентах", () => {
			const marginKop = calculateMarginKopecks(450000, 70000);
			assert.equal(marginKop, 380000);
			const marginPct = calculateMarginPercent(450000, 70000);
			assert.equal(marginPct, 84); // (3800/4500)*100 = 84%
		});
	});

	describe("2. Клиническая полнота РФ (Мандаты 8x, 8n)", () => {
		it("содержит ровно 8 канонических категорий частной стоматологии", () => {
			assert.equal(CANONICAL_CLINICAL_CATEGORIES.length, 8);
			const keys = CANONICAL_CLINICAL_CATEGORIES.map((c) => c.key);
			assert.deepEqual(keys, [
				"therapy",
				"surgery",
				"orthopedics",
				"orthodontics",
				"implantology",
				"pediatric",
				"hygiene",
				"diagnostics",
			]);
		});

		it("использует живой русский язык без советских приказов 804н", () => {
			for (const cat of CANONICAL_CLINICAL_CATEGORIES) {
				assert.ok(!cat.title.includes("804н"), "Заголовок не должен содержать 804н");
				assert.ok(!cat.title.includes("номенклатура Минздрава"), "Без канцелярита");
				assert.ok(cat.description.length > 10, "Категория должна иметь клиническое описание");
			}
		});

		it("базовый пресет включает все 10 золотых позиций частной клиники", () => {
			const titles = CANONICAL_PRICELIST_PRESETS.map((p) => p.title);
			assert.ok(titles.includes("Консультация стоматолога (первичная)"));
			assert.ok(titles.includes("Прицельный снимок / Визиография"));
			assert.ok(titles.includes("Лечение кариеса (световая пломба)"));
			assert.ok(titles.includes("Эндодонтическое лечение (1 канал)"));
			assert.ok(titles.includes("Профессиональная гигиена полости рта (Air-Flow + УЗ)"));
			assert.ok(titles.includes("Удаление зуба (простое)"));
			assert.ok(titles.includes("Удаление зуба мудрости (сложное)"));
			assert.ok(titles.includes("Металлокерамическая коронка"));
			assert.ok(titles.includes("Коронка из диоксида циркония"));
			assert.ok(titles.includes("Имплантат под ключ"));
		});

		it("содержит готовые клинические пакеты «Под ключ» в 1 клик (Мандаты 8e, 8n)", () => {
			assert.ok(CANONICAL_CLINICAL_BUNDLES.length >= 4);
			const bundleTitles = CANONICAL_CLINICAL_BUNDLES.map((b) => b.shortTitle);
			assert.ok(bundleTitles.includes("Кариес под ключ"));
			assert.ok(bundleTitles.includes("Профгигиена под ключ"));
			assert.ok(bundleTitles.includes("Удаление простое под ключ"));
			assert.ok(bundleTitles.includes("Сложное удаление под ключ"));

			for (const b of CANONICAL_CLINICAL_BUNDLES) {
				assert.ok(b.priceKopecks > 0, "Цена пакета должна быть положительной");
				assert.ok(b.items.length >= 3, "Пакет должен содержать минимум 3 манипуляции");
			}
		});

		it("считает сводную статистику прейскуранта", () => {
			const stats = calculatePricelistStats(CANONICAL_PRICELIST_PRESETS);
			assert.ok(stats.totalItems >= 14);
			assert.equal(stats.activeItems, stats.totalItems);
			assert.ok(stats.avgMarginPercent > 60);
			assert.ok(stats.totalRevenuePotentialKopecks > 10000000);
		});
	});

	describe("3. Быстрый поиск и фильтрация за 1 клик", () => {
		it("фильтрует по выбранной категории", () => {
			const surgeryItems = filterPricelist(
				CANONICAL_PRICELIST_PRESETS,
				"surgery",
				"",
			);
			assert.ok(surgeryItems.length >= 3);
			assert.ok(surgeryItems.every((i) => i.category === "surgery"));
		});

		it("выполняет регистронезависимый поиск по названию", () => {
			const found = filterPricelist(CANONICAL_PRICELIST_PRESETS, "all", "кариес");
			assert.ok(found.length >= 1);
			assert.ok(found[0]?.title.includes("кариеса"));
		});

		it("выполняет поиск по коду артикула", () => {
			const found = filterPricelist(CANONICAL_PRICELIST_PRESETS, "all", "ИМПЛ-01");
			assert.equal(found.length, 1);
			assert.equal(found[0]?.title, "Имплантат под ключ");

			const foundSurg = filterPricelist(CANONICAL_PRICELIST_PRESETS, "all", "ХИР-03");
			assert.equal(foundSurg.length, 1);
			assert.equal(foundSurg[0]?.title, "Резекция верхушки корня зуба");
		});
	});

	describe("4. Компонент PricelistStudioModal (Мандат 8e, Apple HIG)", () => {
		it("не рендерится в DOM при isOpen=false", () => {
			const html = renderToString(
				<PricelistStudioModal isOpen={false} onClose={() => {}} />,
			);
			assert.equal(html, "");
		});

		it("рендерит прейскурант при isOpen=true со всеми позициями и категориями", () => {
			const html = renderToString(
				<PricelistStudioModal isOpen={true} onClose={() => {}} />,
			);
			assert.ok(html.includes("Прейскурант услуг"));
			assert.ok(html.includes("Поиск по названию, коду или процедуре..."));
			assert.ok(html.includes("Добавить услугу"));
			assert.ok(html.includes("Все категории"));
			assert.ok(html.includes("Печать A4"));
			assert.ok(html.includes("Экспорт"));
			assert.ok(html.includes("Лечение кариеса (световая пломба)"));
			assert.ok(html.includes("Имплантат под ключ"));
		});

		it("рендерит нативный Bottom Sheet формы добавления (Apple HIG, Мандат 8e)", () => {
			const html = renderToString(
				<PricelistItemDrawer
					isOpen={true}
					editingItem={null}
					formCode="ТЕР-99"
					formTitle="Новая услуга"
					formCategory="therapy"
					formPriceRub="4200"
					formCostRub="800"
					formDuration="45"
					onCodeChange={() => {}}
					onTitleChange={() => {}}
					onCategoryChange={() => {}}
					onPriceChange={() => {}}
					onCostChange={() => {}}
					onDurationChange={() => {}}
					onClose={() => {}}
					onSubmit={() => {}}
				/>,
			);
			assert.ok(html.includes("pricelist-drag-handle"), "Должен быть тактильный Drag Handle");
			assert.ok(html.includes("Новая услуга клиники"), "Заголовок новой услуги");
			assert.ok(html.includes("✓ Добавить услугу"), "Кнопка сохранения");
			assert.ok(!html.includes("disabled"), "Кнопка НИКОГДА не заблокирована (Мандат 8e)");
		});
	});

	describe("5. DirectPricelistLauncher (Маршрутизация и Deep Links)", () => {
		it("не рендерит модалку если URL не содержит прейскурантных токенов", () => {
			const html = renderToString(<DirectPricelistLauncher />);
			assert.equal(html, "");
		});
	});
});
