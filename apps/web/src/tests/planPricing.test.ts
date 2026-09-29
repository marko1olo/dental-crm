import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	auditTreatmentPlanDrift,
	basisPointsFromPercent,
	calculateInstallmentScheduleKopecks,
	calculateStagedPaymentScheduleKopecks,
	detectPriceDrift,
	formatPlanPriceRub,
	insuranceCoverageKopecks,
	isPlanPriceImmutable,
	type PlanPriceCatalogItem,
	planLineTotalKopecks,
	planPriceIssueMessages,
	planTotalKopecks,
	resolveArchivedPlanItem,
	resolvePlanSuggestions,
	validateDraftPlanRows,
} from "../components/treatment-plans/planPricing.js";

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
		assert.equal(rows[0]?.serviceId, "svc-caries");
		assert.equal(rows[0]?.serviceTitle, "Лечение кариеса");
		assert.equal(rows[0]?.priceRub, 3450.5);
		assert.equal(rows[0]?.issue, null);
	});

	it("пустой прайс не даёт ни цены, ни нуля", () => {
		const rows = resolvePlanSuggestions(
			[{ toothNumber: 16, state: "Caries" }],
			[],
		);
		assert.equal(rows[0]?.priceRub, null);
		assert.notEqual(rows[0]?.priceRub, 0);
		assert.equal(rows[0]?.issue?.kind, "catalog_empty");
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
		assert.equal(rows[0]?.serviceId, null);
		assert.equal(rows[0]?.priceRub, null);
		assert.equal(rows[0]?.issue?.kind, "not_in_catalog");
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
		assert.equal(rows[0]?.priceRub, null);
		assert.equal(rows[0]?.issue?.kind, "ambiguous");
		assert.equal(rows[0]?.issue?.matches, 2);
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
		assert.equal(rows[0]?.priceRub, null);
		assert.equal(rows[0]?.issue?.kind, "catalog_empty");
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
		assert.equal(rows[0]?.priceRub, 9000);
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
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		assert.match(messages[0]!, /«лечение кариеса»/);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		assert.match(messages[0]!, /зубы 16, 26/);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
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
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		assert.match(messages[0]!, /прайс-лист пуст/i);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		assert.match(messages[0]!, /Заполните прайс/);
		// Ни одной латинской буквы: ошибка пишется человеческими словами.
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
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
		assert.equal(
			planLineTotalKopecks({ price: "нет цены", quantity: 1 }),
			null,
		);
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
			insuranceCoverageKopecks(
				[{ lineKopecks: 1000000, category: null }],
				contract,
			),
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
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		assert.match(result.problems[0]!, /Лечение кариеса/);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		assert.match(result.problems[0]!, /цену больше нуля/);
	});

	it("строка без позиции прайса отклоняется до запроса, а не через 400", () => {
		const result = validateDraftPlanRows([
			{ name: "Своя услуга", price: "1500", quantity: "1" },
		]);
		assert.equal(result.ok, false);
		if (result.ok) return;
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
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
		assert.equal(result.items[0]?.price, 1500.5);
		assert.equal(result.items[0]?.toothNumber, 16);
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
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		assert.match(result.problems[0]!, /нет ни одной услуги/);
	});
});

describe("isPlanPriceImmutable — неизменность утвержденных и активных планов (Мандат 8e, 8n)", () => {
	it("утвержденные, активные, согласованные и подписанные планы признаются неизменными", () => {
		assert.equal(isPlanPriceImmutable("approved"), true);
		assert.equal(isPlanPriceImmutable("in_progress"), true);
		assert.equal(isPlanPriceImmutable("active"), true);
		assert.equal(isPlanPriceImmutable("agreed"), true);
		assert.equal(isPlanPriceImmutable("accepted"), true);
		assert.equal(isPlanPriceImmutable("signed"), true);
		assert.equal(isPlanPriceImmutable("completed"), true);
		assert.equal(isPlanPriceImmutable("APPROVED"), true);
		assert.equal(isPlanPriceImmutable("In_Progress"), true);
	});

	it("черновики, архивные и пустые статусы не являются неизменными", () => {
		assert.equal(isPlanPriceImmutable("draft"), false);
		assert.equal(isPlanPriceImmutable("archived"), false);
		assert.equal(isPlanPriceImmutable("cancelled"), false);
		assert.equal(isPlanPriceImmutable(undefined), false);
		assert.equal(isPlanPriceImmutable(null), false);
		assert.equal(isPlanPriceImmutable(""), false);
	});
});

describe("detectPriceDrift — отслеживание дрейфа цен каталога без ломки сметы (Мандат 8e, 8n)", () => {
	const catalogItem: PlanPriceCatalogItem = {
		id: "srv-implant",
		title: "Установка имплантата",
		category: "surgery",
		basePriceRub: 55000,
		active: true,
	};

	it("совпадающая цена — дрейф отсутствует", () => {
		const drift = detectPriceDrift(55000, catalogItem, true);
		assert.equal(drift.isDrifted, false);
		assert.equal(drift.driftRub, 0);
		assert.equal(drift.isArchived, false);
		assert.equal(drift.isNotFound, false);
		assert.equal(drift.badgeText, "Цена актуальна");
	});

	it("цена каталога выросла — фиксируется дрейф с понятным информативным бейджем", () => {
		const drift = detectPriceDrift(50000, catalogItem, true);
		assert.equal(drift.isDrifted, true);
		assert.equal(drift.driftRub, 5000);
		assert.equal(drift.currentCatalogPriceRub, 55000);
		assert.equal(drift.snapshotPriceRub, 50000);
		assert.equal(
			drift.badgeText,
			"В прайсе: 55 000 ₽ · В плане зафиксировано: 50 000 ₽",
		);
	});

	it("цена каталога снизилась — фиксируется отрицательный дрейф", () => {
		const cheaperItem: PlanPriceCatalogItem = {
			...catalogItem,
			basePriceRub: 45000,
		};
		const drift = detectPriceDrift(50000, cheaperItem, true);
		assert.equal(drift.isDrifted, true);
		assert.equal(drift.driftRub, -5000);
		assert.equal(
			drift.badgeText,
			"В прайсе: 45 000 ₽ · В плане зафиксировано: 50 000 ₽",
		);
	});

	it("услуга архивирована в каталоге — флаг isArchived и понятное предупреждение", () => {
		const archivedItem: PlanPriceCatalogItem = {
			...catalogItem,
			active: false,
		};
		const drift = detectPriceDrift(50000, archivedItem, true);
		assert.equal(drift.isArchived, true);
		assert.equal(drift.badgeText, "Услуга архивирована в каталоге");
	});

	it("позиция не найдена в каталоге — безопасный результат без краша", () => {
		const drift = detectPriceDrift(50000, null, true);
		assert.equal(drift.isNotFound, true);
		assert.equal(drift.isDrifted, false);
		assert.equal(drift.currentCatalogPriceRub, null);
		assert.equal(drift.badgeText, "Позиция не найдена в текущем прайс-листе");
	});
});

describe("calculateInstallmentScheduleKopecks — 0% рассрочка точная до копейки (kopeck-exact money)", () => {
	it("сумма долей рассрочки строго равна итогу сметы с распределением нечетных копеек", () => {
		// 1 000 руб 01 коп = 100 001 копейка на 3 месяца
		const res3 = calculateInstallmentScheduleKopecks(100001, 3);
		assert.equal(res3.totalKopecks, 100001);
		assert.equal(res3.months, 3);
		assert.equal(res3.remainderKopecks, 2);
		// Первые 2 месяца получают по 33334 коп, третий 33333 коп
		assert.deepEqual(res3.partsKopecks, [33334, 33334, 33333]);
		const sum3 = res3.partsKopecks.reduce((acc, cur) => acc + cur, 0);
		assert.equal(sum3, 100001);
	});

	it("для 6, 12 и 24 месяцев сумма долей всегда строго равна итогу", () => {
		for (const months of [3, 6, 12, 24] as const) {
			const totalKopecks = 2500007; // 25 000.07 ₽
			const schedule = calculateInstallmentScheduleKopecks(totalKopecks, months);
			assert.equal(schedule.months, months);
			assert.equal(schedule.totalKopecks, totalKopecks);
			assert.equal(schedule.partsKopecks.length, months);
			const sum = schedule.partsKopecks.reduce((a, b) => a + b, 0);
			assert.equal(sum, totalKopecks);
		}
	});

	it("некорректная сумма или 0 дает безопасный нулевой график без исключений", () => {
		const zeroSchedule = calculateInstallmentScheduleKopecks(0, 6);
		assert.equal(zeroSchedule.totalKopecks, 0);
		assert.equal(zeroSchedule.monthlyPaymentKopecks, 0);
		assert.equal(zeroSchedule.monthlyPaymentRub, 0);
		assert.deepEqual(zeroSchedule.partsKopecks, [0, 0, 0, 0, 0, 0]);
	});
});

describe("calculateStagedPaymentScheduleKopecks — копеечный расчет этапов лечения 30/40/30", () => {
	it("сумма этапов строго совпадает с итогом сметы без копеечных потерь", () => {
		const totalKopecks = 100001; // 1 000.01 ₽
		const staged = calculateStagedPaymentScheduleKopecks(totalKopecks);
		assert.equal(staged.totalKopecks, totalKopecks);
		assert.equal(
			staged.stage1Kopecks + staged.stage2Kopecks + staged.stage3Kopecks,
			totalKopecks,
		);
	});

	it("крупный план лечения 350 000 руб точно делится на этапы", () => {
		const totalKopecks = 35000000; // 350 000.00 ₽
		const staged = calculateStagedPaymentScheduleKopecks(totalKopecks);
		assert.equal(staged.stage1Rub, 105000); // 30%
		assert.equal(staged.stage2Rub, 140000); // 40%
		assert.equal(staged.stage3Rub, 105000); // 30%
		assert.equal(
			staged.stage1Kopecks + staged.stage2Kopecks + staged.stage3Kopecks,
			totalKopecks,
		);
	});
});

describe("resolveArchivedPlanItem — действия в 1 клик для архивной номенклатуры (Zero Dead-Ends)", () => {
	const baseItem = {
		id: "item-101",
		name: "Старая металлокерамика",
		priceId: "srv-old-crown",
		priceRub: 12000,
		unitPriceRub: 12000,
		quantity: 1,
		code804n: "A16.07.004",
		isArchivedInCatalog: true,
		category: "orthopedics",
		discountRub: 0,
		stageKind: "stage_3_orthopedics" as const,
	};

	it("действие 'keep_agreed_price' фиксирует согласованную цену плана", () => {
		const resolved = resolveArchivedPlanItem(baseItem, "keep_agreed_price");
		assert.equal(resolved.isPriceLocked, true);
		assert.equal(resolved.isArchivedInCatalog, true);
		assert.equal(resolved.archivedResolution, "keep_agreed_price");
		assert.equal(resolved.priceRub, 12000);
		assert.equal(resolved.requiresManualPricing, false);
	});

	it("действие 'replace_from_catalog' заменяет услугу на актуальную из прайса", () => {
		const replacement: PlanPriceCatalogItem = {
			id: "srv-new-zirconia",
			title: "Коронка из диоксида циркония",
			category: "orthopedics",
			basePriceRub: 22000,
			active: true,
		};
		const resolved = resolveArchivedPlanItem(
			baseItem,
			"replace_from_catalog",
			replacement,
		);
		assert.equal(resolved.priceId, "srv-new-zirconia");
		assert.equal(resolved.name, "Коронка из диоксида циркония");
		assert.equal(resolved.priceRub, 22000);
		assert.equal(resolved.unitPriceRub, 22000);
		assert.equal(resolved.isArchivedInCatalog, false);
		assert.equal(resolved.archivedResolution, "replace_from_catalog");
	});
});

describe("formatPlanPriceRub — чистое русское отображение без NaN и NULL", () => {
	it("форматирует целые рубли с пробелами", () => {
		assert.equal(formatPlanPriceRub(5000), "5 000 ₽");
		assert.equal(formatPlanPriceRub(1250000), "1 250 000 ₽");
		assert.equal(formatPlanPriceRub(0), "0 ₽");
	});

	it("корректно парсит строковые суммы", () => {
		assert.equal(formatPlanPriceRub("15000"), "15 000 ₽");
		assert.equal(formatPlanPriceRub("15 000"), "15 000 ₽");
	});

	it("никогда не выводит 'NaN ₽', 'null ₽' или 'NULL' при испорченных данных", () => {
		assert.equal(formatPlanPriceRub(Number.NaN), "Цена не указана");
		assert.equal(formatPlanPriceRub(null), "Цена не указана");
		assert.equal(formatPlanPriceRub(undefined), "Цена не указана");
		assert.equal(formatPlanPriceRub(""), "Цена не указана");
		assert.equal(formatPlanPriceRub(Number.NaN, "—"), "—");
	});
});

describe("auditTreatmentPlanDrift — сквозной аудит сметы на расхождение с каталогом", () => {
	it("выявляет дрейфующие и архивные позиции плана, считая суммарный дрейф", () => {
		const catalog: PlanPriceCatalogItem[] = [
			{ id: "s1", title: "Терапия 1", category: "therapy", basePriceRub: 5000, active: true },
			{ id: "s2", title: "Терапия 2", category: "therapy", basePriceRub: 8000, active: true },
			{ id: "s3", title: "Архивная", category: "therapy", basePriceRub: 4000, active: false },
		];

		const items = [
			{ id: "i1", name: "Терапия 1", priceId: "s1", priceRub: 5000, unitPriceRub: 5000, quantity: 1, code804n: "A16.07.002", category: "therapy", discountRub: 0, stageKind: "stage_1_therapy" as const },
			{ id: "i2", name: "Терапия 2", priceId: "s2", priceRub: 7000, unitPriceRub: 7000, quantity: 1, code804n: "A16.07.002", category: "therapy", discountRub: 0, stageKind: "stage_1_therapy" as const },
			{ id: "i3", name: "Архивная", priceId: "s3", priceRub: 4000, unitPriceRub: 4000, quantity: 1, code804n: "A16.07.002", category: "therapy", discountRub: 0, stageKind: "stage_1_therapy" as const },
		];

		const audit = auditTreatmentPlanDrift(items, catalog, "approved");
		assert.equal(audit.isImmutable, true);
		assert.equal(audit.totalSnapshotKopecks, 1600000);
		assert.equal(audit.totalCatalogKopecks, 1700000);
		assert.equal(audit.totalDriftKopecks, 100000);
		assert.equal(audit.hasDrift, true);
		assert.equal(audit.driftedItemsCount, 1);
		assert.equal(audit.archivedItemsCount, 1);
		assert.equal(audit.items.length, 3);
	});
});

