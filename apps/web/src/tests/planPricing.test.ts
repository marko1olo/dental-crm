import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	basisPointsFromPercent,
	insuranceCoverageKopecks,
	type PlanPriceCatalogItem,
	planLineTotalKopecks,
	planPriceIssueMessages,
	planTotalKopecks,
	resolvePlanSuggestions,
	validateDraftPlanRows,
} from "../components/plan/planPricing.js";

/*
 * Цены сметы обязаны приходить из прайса клиники.
 *
 * До правки импорт предложений из зубной формулы подставлял свои пять цен
 * (4000, 8000, 35000, 15000, 35000 ₽) и, если услуга в прайсе всё-таки была,
 * читал у неё несуществующее поле `priceRub` вместо `basePriceRub` — то есть
 * цена превращалась в строку "0". Проверки ниже закрепляют, что цена берётся из
 * прайса, а неизвестная цена остаётся ПУСТОЙ и названа человеку словами.
 */

function service(
	partial: Partial<PlanPriceCatalogItem> & { title: string; category: string },
): PlanPriceCatalogItem {
	return {
		id: partial.id ?? `svc-${partial.title}`,
		title: partial.title,
		category: partial.category,
		basePriceRub: partial.basePriceRub ?? 0,
		active: partial.active ?? true,
	};
}

describe("resolvePlanSuggestions — цена только из прайса", () => {
	it("берёт цену клиники из basePriceRub, а не из выдуманного priceRub", () => {
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Caries" }],
			[
				service({
					id: "svc-caries",
					title: "Лечение кариеса",
					category: "therapy",
					basePriceRub: 3450.5,
				}),
			],
		);
		assert.equal(rows.length, 1);
		assert.equal(rows[0]!.serviceId, "svc-caries");
		assert.equal(rows[0]!.serviceTitle, "Лечение кариеса");
		assert.equal(rows[0]!.priceRub, 3450.5);
		assert.equal(rows[0]!.issue, null);
	});

	it("пустой прайс не даёт ни цены, ни нуля", () => {
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Caries" }],
			[],
		);
		assert.equal(rows[0]!.priceRub, null);
		assert.notEqual(rows[0]!.priceRub, 0);
		assert.equal(rows[0]!.issue?.kind, "catalog_empty");
	});

	it("ни одна из пяти прежних выдуманных цен не появляется", () => {
		const invented = [4000, 8000, 35000, 15000];
		const rows = resolvePlanSuggestions(
			[
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 26, state: "Pulpitis" },
				{ toothNumber: 36, state: "Planned_Implant" },
				{ toothNumber: 46, state: "Crown" },
				{ toothNumber: 11, state: "Missing" },
			],
			[service({ title: "Консультация", category: "consultation" })],
		);
		assert.equal(rows.length, 5);
		for (const row of rows) {
			assert.equal(row.priceRub, null);
			assert.ok(!invented.includes(row.priceRub as unknown as number));
			assert.equal(row.serviceId, null);
		}
	});

	it("не подставляет случайную услугу из раздела", () => {
		// Прежний код брал candidates[0] — например «Консультация» за 500 ₽ —
		// и назначал её лечением кариеса.
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Caries" }],
			[
				service({
					title: "Осмотр терапевта",
					category: "therapy",
					basePriceRub: 500,
				}),
			],
		);
		assert.equal(rows[0]!.serviceId, null);
		assert.equal(rows[0]!.priceRub, null);
		assert.equal(rows[0]!.issue?.kind, "not_in_catalog");
	});

	it("несколько подходящих услуг — выбирает врач, а не программа", () => {
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Caries" }],
			[
				service({
					title: "Лечение кариеса, 1 поверхность",
					category: "therapy",
					basePriceRub: 3500,
				}),
				service({
					title: "Лечение кариеса, 2 поверхности",
					category: "therapy",
					basePriceRub: 4200,
				}),
			],
		);
		assert.equal(rows[0]!.priceRub, null);
		assert.equal(rows[0]!.issue?.kind, "ambiguous");
		assert.equal(rows[0]!.issue?.matches, 2);
	});

	it("выключенная позиция прайса не попадает в смету", () => {
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Caries" }],
			[
				service({
					title: "Лечение кариеса",
					category: "therapy",
					basePriceRub: 3500,
					active: false,
				}),
			],
		);
		assert.equal(rows[0]!.priceRub, null);
		assert.equal(rows[0]!.issue?.kind, "catalog_empty");
	});

	it("«ё» в названии услуги не мешает совпадению", () => {
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Crown" }],
			[
				service({
					title: "Коронка цельнолитая",
					category: "prosthetics",
					basePriceRub: 9000,
				}),
			],
		);
		assert.equal(rows[0]!.priceRub, 9000);
	});
});

describe("planPriceIssueMessages — человеку сказано, что делать", () => {
	it("одна фраза на проблему со списком зубов", () => {
		const rows = resolvePlanSuggestions(
			[
				{ toothNumber: 26, state: "Caries" },
				{ toothNumber: 16, state: "Caries" },
			],
			[service({ title: "Осмотр", category: "therapy", basePriceRub: 500 })],
		);
		const messages = planPriceIssueMessages(rows);
		assert.equal(messages.length, 1);
		assert.match(messages[0]!, /«лечение кариеса»/);
		assert.match(messages[0]!, /зубы 16, 26/);
		assert.match(messages[0]!, /Добавьте её в прайс/);
	});

	it("пустой прайс объясняется один раз и по-русски", () => {
		const rows = resolvePlanSuggestions(
			[
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 26, state: "Caries" },
			],
			[],
		);
		const messages = planPriceIssueMessages(rows);
		assert.equal(messages.length, 1);
		assert.match(messages[0]!, /прайс-лист пуст/i);
		assert.match(messages[0]!, /Заполните прайс/);
		// Ни одной латинской буквы: ошибка пишется человеческими словами.
		assert.ok(!/[A-Za-z]/.test(messages[0]!));
	});

	it("нет сообщений, когда всё нашлось", () => {
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Caries" }],
			[
				service({
					title: "Лечение кариеса",
					category: "therapy",
					basePriceRub: 3500,
				}),
			],
		);
		assert.deepEqual(planPriceIssueMessages(rows), []);
	});
});

describe("planLineTotalKopecks — скидка в рублях, как в контракте", () => {
	it("скидка вычитается рублями, а не процентами", () => {
		// Прежняя формула price * qty * (1 - discount / 100) давала на этих
		// данных −40 000 ₽ на экране при 9 500 ₽ в базе.
		assert.equal(
			planLineTotalKopecks({ price: 10000, quantity: 1, discount: 500 }),
			950000,
		);
	});

	it("итог не уходит в минус, как и на сервере", () => {
		assert.equal(
			planLineTotalKopecks({ price: 1000, quantity: 1, discount: 5000 }),
			0,
		);
	});

	it("копейки не теряются при умножении", () => {
		assert.equal(
			planLineTotalKopecks({ price: 1500.1, quantity: 3, discount: 0 }),
			450030,
		);
		assert.equal(planLineTotalKopecks({ price: "0.01", quantity: 7 }), 7);
	});

	it("испорченная сумма даёт null, а не ноль и не исключение", () => {
		assert.equal(
			planLineTotalKopecks({ price: Number.NaN, quantity: 1 }),
			null,
		);
		assert.equal(planLineTotalKopecks({ price: "нет цены", quantity: 1 }), null);
		assert.equal(planLineTotalKopecks({ price: 100, quantity: 1.5 }), null);
	});
});

describe("planTotalKopecks — сумма строк равна итогу до копейки", () => {
	it("складывает целыми копейками без плавающей точки", () => {
		const total = planTotalKopecks([
			{ price: 0.1, quantity: 1 },
			{ price: 0.2, quantity: 1 },
		]);
		assert.equal(total.kopecks, 30);
		assert.equal(total.unreadableLines, 0);
	});

	it("сумма строк совпадает с итогом на плане из двадцати позиций", () => {
		const lines = Array.from({ length: 20 }, () => ({
			price: 1500.1,
			quantity: 3,
			discount: 0.05,
		}));
		const total = planTotalKopecks(lines);
		assert.equal(total.kopecks, 20 * (450030 - 5));
	});

	it("пустой список берёт сохранённый итог плана", () => {
		assert.equal(planTotalKopecks([], 1234.56).kopecks, 123456);
	});

	it("непрочитанная строка не превращается в ноль", () => {
		const total = planTotalKopecks([
			{ price: 1000, quantity: 1 },
			{ price: "мусор", quantity: 1 },
		]);
		assert.equal(total.kopecks, null);
		assert.equal(total.unreadableLines, 1);
	});
});

describe("покрытие ДМС — по разделам договора, без среднего арифметического", () => {
	const contract = {
		coverageTherapyPct: 80,
		coverageOrthoPct: 50,
		coverageHygienePct: 100,
		coverageSurgeryPct: 20,
	};

	it("каждая строка покрывается своим процентом", () => {
		const coverage = insuranceCoverageKopecks(
			[
				{ lineKopecks: 1000000, category: "therapy" },
				{ lineKopecks: 1000000, category: "surgery" },
			],
			contract,
		);
		// 80% и 20% от 10 000 ₽: 8 000 + 2 000 = 10 000 ₽.
		assert.equal(coverage, 1000000);
		// Среднее арифметическое (80+50+100+20)/4 = 62,5% дало бы 12 500 ₽.
		assert.notEqual(coverage, 1250000);
	});

	it("ортодонтия покрывается: раздел называется orthodontics, а не ortho", () => {
		assert.equal(
			insuranceCoverageKopecks(
				[{ lineKopecks: 1000000, category: "orthodontics" }],
				contract,
			),
			500000,
		);
	});

	it("услуга вне покрытия не покрывается вовсе", () => {
		assert.equal(
			insuranceCoverageKopecks(
				[{ lineKopecks: 1000000, category: "imaging" }],
				contract,
			),
			0,
		);
		assert.equal(
			insuranceCoverageKopecks([{ lineKopecks: 1000000, category: null }], contract),
			0,
		);
	});

	it("процент с более чем двумя знаками отвергается, а не округляется", () => {
		assert.equal(basisPointsFromPercent(12.5), 1250);
		assert.equal(basisPointsFromPercent(0), 0);
		assert.equal(basisPointsFromPercent(12.345), null);
		assert.equal(basisPointsFromPercent(101), null);
		assert.equal(basisPointsFromPercent(Number.NaN), null);
	});
});

describe("validateDraftPlanRows — заполненная строка не исчезает молча", () => {
	it("строка без цены не отбрасывается, а называется", () => {
		const result = validateDraftPlanRows([
			{ name: "Лечение кариеса", priceId: "svc-1", price: "", quantity: "1" },
		]);
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.equal(result.problems.length, 1);
		assert.match(result.problems[0]!, /Лечение кариеса/);
		assert.match(result.problems[0]!, /цену больше нуля/);
	});

	it("строка без позиции прайса отклоняется до запроса, а не через 400", () => {
		const result = validateDraftPlanRows([
			{ name: "Своя услуга", price: "1500", quantity: "1" },
		]);
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.match(result.problems[0]!, /выберите услугу из прайса/);
	});

	it("копейки доходят до тела запроса без потери", () => {
		const result = validateDraftPlanRows([
			{
				name: "Лечение кариеса",
				priceId: "svc-1",
				price: "1 500,50",
				quantity: "2",
				toothNumber: 16,
			},
		]);
		assert.equal(result.ok, true);
		if (!result.ok) return;
		assert.equal(result.items.length, 1);
		assert.equal(result.items[0]!.price, 1500.5);
		assert.equal(result.items[0]!.toothNumber, 16);
		assert.equal(result.totalKopecks, 300100);
	});

	it("три знака после запятой — отказ, а не тихое округление", () => {
		const result = validateDraftPlanRows([
			{ name: "Услуга", priceId: "svc-1", price: "10,005", quantity: "1" },
		]);
		assert.equal(result.ok, false);
	});

	it("пустые строки формы игнорируются, но пустой план не сохраняется", () => {
		const result = validateDraftPlanRows([
			{ name: "", price: "", quantity: "1" },
		]);
		assert.equal(result.ok, false);
		if (result.ok) return;
		assert.match(result.problems[0]!, /нет ни одной услуги/);
	});
});
