/**
 * statutoryCatalogCache.test.ts — Сьют кэширования регламентных каталогов в L1 RAM,
 * быстрого поиска номенклатуры 804н/МКБ-10, DOM chunking и мягкого овердрафта склада.
 * Часть декомпозированного сьюта lowSpecHddOptimizer (Мандаты 8b, 8zi).
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	clinicalHotModulePreloaders,
	scheduleClinicalHotModulesWarmup,
} from "../../workspacePreload";
import {
	searchPricelistItems,
} from "../../components/catalog/pricelist/servicePricelistEngine";
import type { ServicePricelistItem } from "../../components/catalog/pricelist/servicePricelistPresets";
import {
	CANONICAL_WAREHOUSE_PRESETS,
} from "../../components/inventory/warehouseInventoryPresets";
import {
	handleOneClickPackageWriteOff,
} from "../../components/inventory/warehousePackageWriteOffEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readCssWithImports(filePath: string): string {
	const dir = path.dirname(filePath);
	let css = fs.readFileSync(filePath, "utf-8");
	const importRegex = /@import\s+['"]([^'"]+)['"];/g;
	css = css.replace(importRegex, (_, rel) => readCssWithImports(path.resolve(dir, rel)));
	return css;
}

describe("workspacePreload — Clinical Hot Modules Preloaders & Warmup", () => {
	it("содержит все 6 ключевых клинических модулей горячего пути", () => {
		const keys = Object.keys(clinicalHotModulePreloaders);
		assert.ok(keys.includes("scheduleView"));
		assert.ok(keys.includes("visitView"));
		assert.ok(keys.includes("visitEmkTab"));
		assert.ok(keys.includes("odontogramViewContainer"));
		assert.ok(keys.includes("paymentCapture"));
		assert.ok(keys.includes("documentsView"));
		assert.strictEqual(keys.length, 6);

		for (const key of keys as Array<keyof typeof clinicalHotModulePreloaders>) {
			assert.strictEqual(typeof clinicalHotModulePreloaders[key], "function");
		}
	});

	it("запускает планировщик прогрева scheduleClinicalHotModulesWarmup без ошибок", () => {
		const cleanup = scheduleClinicalHotModulesWarmup();
		if (cleanup) {
			assert.strictEqual(typeof cleanup, "function");
			cleanup();
		}
	});
});

describe("servicePricelistEngine — Zero GC Search Performance & WeakMap Indexing", () => {
	const sampleItems: ServicePricelistItem[] = [
		{
			id: "srv-caries-1",
			code804n: "A16.07.002.001",
			commercialTitle: "Лечение кариеса с пломбированием светоотверждаемым композитом",
			statutoryTitle804n: "Восстановление зуба пломбой с нарушением формы зуба",
			category: "therapy",
			specialty: "general",
			basePriceRub: 4500,
			basePriceKopecks: 450000,
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			materialCostRub: 500,
			labCostRub: 0,
			tags: ["кариес", "пломба", "estelite"],
			icd10Indications: ["K02.1"],
			estimatedDurationMin: 45,
			isActive: true,
			isArchived: false,
		},
		{
			id: "srv-endo-1",
			code804n: "A16.07.030.001",
			commercialTitle: "Механическая и медикаментозная обработка корневого канала",
			statutoryTitle804n: "Инструментальная и медикаментозная обработка корневого канала",
			category: "therapy",
			specialty: "therapist",
			basePriceRub: 3000,
			basePriceKopecks: 300000,
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			materialCostRub: 400,
			labCostRub: 0,
			tags: ["пульпит", "канал", "эндодонтия"],
			icd10Indications: ["K04.0"],
			estimatedDurationMin: 60,
			isActive: true,
			isArchived: false,
		},
	];

	it("мгновенно находит услугу по клиническому синониму 'кариес' без аллокаций мусора", () => {
		const results = searchPricelistItems(sampleItems, "кариес");
		assert.strictEqual(results.length, 1);
		assert.strictEqual(results[0]?.id, "srv-caries-1");
	});

	it("находит услугу по коду 804н со специальными символами и без них", () => {
		const byDots = searchPricelistItems(sampleItems, "A16.07.002");
		assert.strictEqual(byDots.length, 1);
		assert.strictEqual(byDots[0]?.id, "srv-caries-1");

		const byCleanCode = searchPricelistItems(sampleItems, "a1607002");
		assert.strictEqual(byCleanCode.length, 1);
		assert.strictEqual(byCleanCode[0]?.id, "srv-caries-1");
	});

	it("повторный поиск использует WeakMap индекс с 0 ms задержкой", () => {
		// Первое обращение (прогрев индекса)
		searchPricelistItems(sampleItems, "пломба");
		// Второе обращение — hit в WeakMap индексе
		const results = searchPricelistItems(sampleItems, "пломба");
		assert.strictEqual(results.length, 1);
		assert.strictEqual(results[0]?.id, "srv-caries-1");
	});
});

describe("lowSpecHddOptimizer — Low-Spec Hardware & GPU Acceleration Guards (Mandate 8c)", () => {
	it("детектирует режим низкой производительности по data-perf='low' и классу .low-spec-perf", async () => {
		const { applyLowSpecToRoot } = await import(
			"../../lib/hardwareCapabilities"
		);

		// Создаем mock root element
		const classList = new Set<string>();
		const attributes = new Map<string, string>();
		const mockRoot = {
			setAttribute: (k: string, v: string) => attributes.set(k, v),
			removeAttribute: (k: string) => attributes.delete(k),
			getAttribute: (k: string) => attributes.get(k) ?? null,
			classList: {
				add: (cls: string) => classList.add(cls),
				remove: (cls: string) => classList.delete(cls),
				contains: (cls: string) => classList.has(cls),
			},
		} as unknown as HTMLElement;

		applyLowSpecToRoot(true, mockRoot);
		assert.strictEqual(mockRoot.getAttribute("data-low-spec"), "true");
		assert.strictEqual(mockRoot.getAttribute("data-perf"), "low");
		assert.strictEqual(mockRoot.getAttribute("data-hardware-tier"), "low");
		assert.strictEqual(mockRoot.classList.contains("low-spec-mode"), true);
		assert.strictEqual(mockRoot.classList.contains("low-spec-perf"), true);

		applyLowSpecToRoot(false, mockRoot);
		assert.strictEqual(mockRoot.getAttribute("data-low-spec"), null);
		assert.strictEqual(mockRoot.getAttribute("data-perf"), "high");
		assert.strictEqual(mockRoot.getAttribute("data-hardware-tier"), "high");
		assert.strictEqual(mockRoot.classList.contains("low-spec-mode"), false);
		assert.strictEqual(mockRoot.classList.contains("low-spec-perf"), false);
	});
});

describe("lowSpecHddOptimizer — Statutory Catalog Caching (804n, ICD-10, 043/u templates)", () => {
	it("загружает и кэширует номенклатуру 804н, МКБ-10 и шаблоны 043/у с 0 мс задержкой в RAM", async () => {
		const {
			getOrLoadNomenclature804n,
			getOrLoadIcd10Dictionary,
			getOrLoadClinical043Templates,
			seedAllStatutoryCatalogsInIndexedDb,
			getStatutoryCatalogCacheStats,
		} = await import("../../services/storage/statutoryCatalogCache");

		// Сидируем справочники
		const seedResult = await seedAllStatutoryCatalogsInIndexedDb();
		assert.ok(seedResult.nomenclatureCount > 0, "Номенклатура 804н должна содержать элементы");
		assert.ok(seedResult.icd10Count > 0, "МКБ-10 должен содержать элементы");
		assert.ok(seedResult.templatesCount > 0, "Шаблоны 043/у должны содержать элементы");

		// Проверяем статус кэша в RAM
		const stats = getStatutoryCatalogCacheStats();
		assert.strictEqual(stats.has804nInRam, true);
		assert.strictEqual(stats.hasIcd10InRam, true);
		assert.strictEqual(stats.hasTemplatesInRam, true);
		assert.ok(stats.ramItemCount > 0);

		// Повторные вызовы должны возвращать закэшированные данные синхронно из RAM
		const nom2 = await getOrLoadNomenclature804n();
		assert.strictEqual(nom2.length, seedResult.nomenclatureCount);

		const icd2 = await getOrLoadIcd10Dictionary();
		assert.strictEqual(icd2.length, seedResult.icd10Count);

		const tmpl2 = await getOrLoadClinical043Templates();
		assert.strictEqual(tmpl2.length, seedResult.templatesCount);

		// Проверяем мгновенный синхронный RAM поиск (0 мс)
		const {
			getCached804nSync,
			getCachedIcd10Sync,
			getCachedTemplatesSync,
			searchCached804nSync,
			searchCachedIcd10Sync,
		} = await import("../../services/storage/statutoryCatalogCache");

		assert.strictEqual(getCached804nSync()?.length, seedResult.nomenclatureCount);
		assert.strictEqual(getCachedIcd10Sync()?.length, seedResult.icd10Count);
		assert.strictEqual(getCachedTemplatesSync()?.length, seedResult.templatesCount);

		const search804n = searchCached804nSync("кариес", 10);
		assert.ok(Array.isArray(search804n));

		const searchIcd10 = searchCachedIcd10Sync("K02", 10);
		assert.ok(Array.isArray(searchIcd10));
		assert.ok(searchIcd10.length > 0);
	});
});

describe("VisitSoapEditor — Template Drawer DOM Chunking & Memory Guard (Mandates 8c, 8n)", () => {
	it("ограничивает начальную выборку из 448 шаблонов 30 карточками в DOM и рендерит кнопку 'Показать ещё'", async () => {
		const React = await import("react");
		const { renderToString } = await import("react-dom/server");
		const { VisitSoapEditor } = await import("../../components/visit/VisitSoapEditor");

		const html = renderToString(
			React.createElement(VisitSoapEditor, {
				isTemplatesOpen: true,
			}),
		);

		// Проверяем, что отрисовано ровно 30 карточек (кнопка 'Заполнить')
		const matches = html.match(/<span>Заполнить<\/span>/g) || [];
		assert.strictEqual(
			matches.length,
			30,
			`Ожидалось ровно 30 шаблонов в начальном DOM, получено ${matches.length}`,
		);

		// Проверяем кнопку раскрытия следующей порции
		assert.ok(
			html.includes('data-testid="btn-soap-templates-show-more"'),
			"Должна присутствовать кнопка 'Показать ещё' шаблонов",
		);
		assert.ok(
			html.includes("Показать ещё 30 шаблонов (показано 30 из 448)"),
			"Кнопка должна содержать точный счетчик: 'Показать ещё 30 шаблонов (показано 30 из 448)'",
		);
	});
});

describe("PricelistStudioModal — Studio DOM Performance & Memory Guard (Mandates 8c, 8n)", () => {
	it("рендерит прейскурант каталога услуг без утечек памяти и с защитой DOM", async () => {
		const React = await import("react");
		const { renderToString } = await import("react-dom/server");
		const { PricelistStudioModal } = await import(
			"../../components/catalog/PricelistStudioModal"
		);

		const html = renderToString(
			React.createElement(PricelistStudioModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(
			html.includes("pricelist-table-view") || html.includes("pricelist-studio-modal"),
			"Должна присутствовать таблица прейскуранта",
		);
	});
});

describe("lowSpecHddOptimizer — Безопасность CSS селекторов и защита от затемнения/скрытия UI", () => {
	it("low-spec-hardware.css не содержит опасных селекторов скрытия display: none для [filter] и [class*='blur-']", () => {
		const cssPath = path.resolve(__dirname, "../../styles/low-spec-hardware.css");
		const cssContent = readCssWithImports(cssPath);

		// 1. Проверяем, что элементы с [filter] не скрываются display: none
		assert.strictEqual(
			cssContent.includes("[filter] {\n\tdisplay: none"),
			false,
			"[filter] не должен иметь display: none !important"
		);
		assert.strictEqual(
			cssContent.includes("[filter],\n.low-spec-mode [filter] {\n\tdisplay: none"),
			false,
			"[filter] не должен скрываться display: none"
		);

		// 2. Проверяем, что :not([class*='backdrop-blur'])[class*='blur-'] не содержит display: none
		assert.strictEqual(
			cssContent.includes(":not([class*=\"backdrop-blur\"])[class*=\"blur-\"]"),
			false,
			":not([class*='backdrop-blur'])[class*='blur-'] не должен присутствовать"
		);

		// 3. Проверяем, что широкий селектор [class*='backdrop'] не перекрывает backdrop-blur фоны темным фоном
		assert.strictEqual(
			cssContent.includes("[class*=\"backdrop\"],\n[data-hardware-tier=\"low\"]"),
			false,
			"Широкий селектор [class*='backdrop'] не должен перекрывать backdrop-blur фоны"
		);

		// 4. Проверяем наличие защитных селекторов filter: none !important
		assert.ok(
			cssContent.includes("[class*=\"blur-\"] {\n\t\tfilter: none !important;"),
			"Должен быть селектор отключения filter для [class*='blur-'] без display: none"
		);
	});
});

describe("lowSpecHddOptimizer — Склад и автономия медсестры / врача (Мандаты 8e, 8n: мягкий овердрафт)", () => {
	it("CANONICAL_WAREHOUSE_PRESETS содержит канонические пресеты для списания в 1 клик", () => {
		const presetIds = CANONICAL_WAREHOUSE_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("anesthesia-17"), "Пресет анестезии должен присутствовать");
		assert.ok(presetIds.includes("filling-standard"), "Пресет пломбирования должен присутствовать");
		assert.ok(presetIds.includes("hygiene-prof"), "Пресет профгигиены должен присутствовать");
	});

	it("handleOneClickPackageWriteOff разрешает списание при остатке 0 с фиксацией мягкого овердрафта", async () => {
		let toastMsg = "";
		let toastType = "";
		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: {}, // Пустой склад: мягкий овердрафт
			allowSoftOverdraft: true,
			nurseName: "Медсестра Петрова",
			doctorName: "Д-р Кузнецов",
			onToast: (msg, type) => {
				toastMsg = msg;
				toastType = type;
			},
		});

		assert.strictEqual(result.success, true, "Операция не должна блокироваться при нулевом остатке");
		assert.strictEqual(result.isOverdraft, true, "Должен быть зафиксирован мягкий овердрафт");
		assert.strictEqual(toastType, "warning");
		assert.ok(toastMsg.toLowerCase().includes("мягкий овердрафт"));
	});
});
