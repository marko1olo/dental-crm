import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DentalPricelistAnalysisResponse } from "@dental/shared";
import { pricelistItemMaterialText } from "../pricelistUiMeta.js";

/**
 * НА ЭКРАНЕ РУССКОЙ КЛИНИКИ НЕ ДОЛЖНО БЫТЬ АНГЛИЙСКОГО МАШИННОГО ТОКЕНА.
 *
 * `crownType` объявлен в контракте как `z.string().nullable()`
 * (`packages/shared/src/index.ts`), а НЕ перечислением, и системный промпт Groq
 * прямо разрешает «If a material/brand/crown type is uncertain, use unknown or
 * null». Поэтому в это поле законно приезжает свободный текст, а
 * `pricelistItemMaterialText` печатает его администратору как есть — измерено
 * исполнением функции на HEAD до правки: «unknown», «zirconia crown»,
 * «full ceramic · Керамика · Коронка».
 *
 * Проверка построена так, чтобы КРАСНЕТЬ от возврата ровно того дефекта:
 * достаточно вернуть `pricelistCrownTypeLabels[value] ?? value`, и падают
 * разделы «неопознанное значение» и «регистр и разделители».
 *
 * Детерминированный путь проверяется отдельным разделом и служит защитой от
 * пере-починки: `detectCrownType` (`apps/api/src/pricelist/analyzer.ts:320-329`)
 * отдаёт ровно семь значений, и все семь обязаны остаться подписанными
 * по-русски. Список продублирован здесь намеренно — это тест интерфейса, ему
 * нельзя тянуть модуль API, а расхождение с analyzer.ts должно быть видно.
 */

type PricelistItem = DentalPricelistAnalysisResponse["items"][number];

function item(fields: {
	crownType: string | null;
	materialKind?: PricelistItem["materialKind"];
	restorationType?: PricelistItem["restorationType"];
	brand?: string | null;
}): PricelistItem {
	return {
		id: "00000000-0000-4000-8000-000000000001",
		sourceLine: 1,
		sourceText: "Коронка 35 000 руб",
		title: "Коронка",
		normalizedTitle: "коронка",
		category: "prosthetics",
		specialty: "orthopedist",
		treatmentKind: "crown",
		materialKind: fields.materialKind ?? "unknown",
		restorationType: fields.restorationType ?? "none",
		crownType: fields.crownType,
		brand: fields.brand ?? null,
		toothScope: null,
		unit: "service",
		priceRub: 35000,
		priceMaxRub: null,
		durationMinutes: null,
		confidence: 0.5,
		warnings: [],
		matchedServiceId: null,
	};
}

/** То, что модель реально присылает в crownType помимо семи ожидаемых значений. */
const UNRECOGNIZED_CROWN_TYPES = [
	"unknown",
	"none",
	"null",
	"n/a",
	"zirconia crown, cad/cam, monolithic",
	"unknown crown type",
	"couronne céramique",
	"unspecified",
	"?",
];

describe("pricelistItemMaterialText: неопознанный тип коронки", () => {
	it("не печатает сырое значение с нейро-пути", () => {
		for (const crownType of UNRECOGNIZED_CROWN_TYPES) {
			const text = pricelistItemMaterialText(item({ crownType }));
			assert.ok(
				!text.includes(crownType),
				`сырое значение «${crownType}» попало на экран: «${text}»`,
			);
		}
	});

	it("вырождается в русскую фразу, когда не распознано ничего", () => {
		for (const crownType of UNRECOGNIZED_CROWN_TYPES) {
			assert.equal(
				pricelistItemMaterialText(item({ crownType })),
				"материал не распознан",
				`crownType «${crownType}»`,
			);
		}
	});

	/*
	 * До правки эта фраза была НЕДОСТИЖИМА при ответе модели «всё unknown»:
	 * метка коронки печаталась как «unknown», список получался непустым, и
	 * `|| "материал не распознан"` не срабатывал никогда.
	 */
	it("вырождается в русскую фразу при ответе «всё unknown»", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "unknown",
					materialKind: "unknown",
					restorationType: "unknown",
				}),
			),
			"материал не распознан",
		);
	});

	it("не глотает остальные метки строки", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "unknown crown type",
					materialKind: "ceramic",
					restorationType: "crown",
					brand: "Katana",
				}),
			),
			"Katana · Керамика · Коронка",
		);
	});
});

describe("pricelistItemMaterialText: детерминированный путь", () => {
	const deterministic: Array<[string, string]> = [
		["zirconia multilayer", "Цирконий MultiLayer"],
		["zirconia", "Цирконий"],
		["lithium disilicate", "E.max / дисиликат лития"],
		["metal ceramic", "Металлокерамика"],
		["temporary PMMA", "Временная PMMA"],
		["ceramic", "Керамика"],
		["crown", "Коронка"],
	];

	for (const [crownType, label] of deterministic) {
		it(`«${crownType}» подписан «${label}»`, () => {
			const text = pricelistItemMaterialText(item({ crownType }));
			assert.ok(
				text.includes(label),
				`ожидалась подпись «${label}», получено «${text}»`,
			);
			assert.ok(
				!text.includes(crownType),
				`сырой ключ «${crownType}» остался на экране: «${text}»`,
			);
		});
	}
});

describe("pricelistItemMaterialText: регистр и разделители", () => {
	const variants: Array<[string, string]> = [
		["Zirconia", "Цирконий"],
		["ZIRCONIA", "Цирконий"],
		["zirconia_multilayer", "Цирконий MultiLayer"],
		["metal-ceramic", "Металлокерамика"],
		["  temporary   pmma  ", "Временная PMMA"],
	];

	for (const [crownType, label] of variants) {
		it(`«${crownType}» опознан как «${label}»`, () => {
			assert.equal(pricelistItemMaterialText(item({ crownType })), label);
		});
	}
});

/*
 * ЗАИКАНИЕ НА ДЕТЕРМИНИРОВАННОМ ПУТИ, ИЗМЕРЕННОЕ, А НЕ ПРЕДПОЛОЖЕННОЕ.
 *
 * `detectCrownType` выводит тип коронки из materialKind, поэтому пять из семи
 * его значений печатали клинике одно и то же слово дважды: «Цирконий · Цирконий
 * · Коронка». Ожидания ниже — вывод после дедупликации; каждая строка падает,
 * если убрать дедупликацию.
 */
describe("pricelistItemMaterialText: повторяющаяся метка", () => {
	it("циркониевая коронка не заикается", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "zirconia",
					materialKind: "zirconia",
					restorationType: "crown",
				}),
			),
			"Цирконий · Коронка",
		);
	});

	it("MultiLayer оставляет более точную метку, а не общую", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "zirconia multilayer",
					materialKind: "zirconia",
					restorationType: "crown",
				}),
			),
			"Цирконий MultiLayer · Коронка",
		);
	});

	it("металлокерамика и керамика не заикаются", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "metal ceramic",
					materialKind: "metal_ceramic",
					restorationType: "crown",
				}),
			),
			"Металлокерамика · Коронка",
		);
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "ceramic",
					materialKind: "ceramic",
					restorationType: "crown",
				}),
			),
			"Керамика · Коронка",
		);
	});

	it("коронка без материала печатается один раз", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "crown",
					materialKind: "unknown",
					restorationType: "crown",
				}),
			),
			"Коронка",
		);
	});

	it("бренд из прайса клиники не съедается переводной меткой", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "lithium disilicate",
					materialKind: "lithium_disilicate",
					restorationType: "crown",
					brand: "IPS e.max",
				}),
			),
			"IPS e.max · E.max / дисиликат лития · Коронка",
		);
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "zirconia",
					materialKind: "zirconia",
					restorationType: "crown",
					brand: "Katana",
				}),
			),
			"Katana · Цирконий · Коронка",
		);
	});

	/*
	 * Пересечение по смыслу, но не по буквам, НЕ вычищается сознательно: метка
	 * «PMMA / временные» не содержится в «Временная PMMA» целиком, и склеивать их
	 * значило бы придумывать третью формулировку. Ожидание зафиксировано как
	 * измеренное, чтобы следующий читатель видел остаток долга, а не считал, что
	 * дедупликация покрывает всё.
	 */
	it("оставляет пересечение по смыслу, если это не то же слово", () => {
		assert.equal(
			pricelistItemMaterialText(
				item({
					crownType: "temporary PMMA",
					materialKind: "pmma",
					restorationType: "temporary_crown",
				}),
			),
			"Временная PMMA · PMMA / временные · Временная коронка",
		);
	});
});

describe("pricelistItemMaterialText: англоязычные синонимы", () => {
	const synonyms: Array<[string, string]> = [
		["full ceramic", "Керамика"],
		["all ceramic", "Керамика"],
		["porcelain", "Керамика"],
		["zirconia crown", "Цирконий"],
		["monolithic zirconia", "Цирконий"],
		["ZrO2", "Цирконий"],
		["multilayer zirconia", "Цирконий MultiLayer"],
		["e.max", "E.max / дисиликат лития"],
		["IPS e.max", "E.max / дисиликат лития"],
		["PFM", "Металлокерамика"],
		["porcelain fused to metal", "Металлокерамика"],
		["PMMA", "Временная PMMA"],
	];

	for (const [crownType, label] of synonyms) {
		it(`«${crownType}» переведён в «${label}»`, () => {
			assert.equal(pricelistItemMaterialText(item({ crownType })), label);
		});
	}
});
