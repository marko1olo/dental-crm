import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_FDI_TEETH,
	CHAIRSIDE_EXPRESS_SERVICES,
	FDI_LOWER_TEETH,
	FDI_UPPER_TEETH,
	PRICE_UNKNOWN_TEXT,
	calculateCompletedServicesSummary,
	filterServiceCatalog,
	formatCompletedServiceLine,
	parseCompletedServiceLine,
	parseRubAmount,
	planLineQuantity,
	planLineTotalRub,
	stripEmojis,
	visitOwnedPlanItems,
} from "./completedServicesPlan";
import { NIL_UUID, realVisitFieldId } from "./visitIdentity";
import { money } from "../../utils/financeUtils";

/**
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Список «Отметка выполненного по плану лечения» внутри
 * приёма показывал план лечения ДРУГОГО пациента — того, кто остался выбранным в
 * разделе «Пациенты». Галочка дописывала «Выполнено: <чужая услуга> — <чужая
 * цена>» в поле «План» текущего приёма, откуда строка уходила в ЭМК и в кассу.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/components/visit/completedServicesPlan.test.ts
 */

const item = (patientId: string, name: string, status = "planned") => ({
	id: `${patientId}-${name}`,
	patientId,
	snapshotServiceName: name,
	status,
	unitPriceRub: "1500.00",
	quantity: 1,
	discountRub: "0",
});

describe("позиции плана для отметки выполненного", () => {
	it("чужие позиции не попадают в список приёма", () => {
		const items = [
			item("пациент-А", "Лечение кариеса 26"),
			item("пациент-Б", "Удаление 48"),
			item("пациент-Б", "Имплантация 46"),
		];

		const forA = visitOwnedPlanItems(items, "пациент-А");
		assert.deepEqual(
			forA.map((entry) => entry.snapshotServiceName),
			["Лечение кариеса 26"],
		);
		// И наоборот: приём пациента Б не видит позиций пациента А.
		assert.deepEqual(
			visitOwnedPlanItems(items, "пациент-Б").map(
				(entry) => entry.snapshotServiceName,
			),
			["Удаление 48", "Имплантация 46"],
		);
	});

	it("без пациента открытого приёма отмечать нечего", () => {
		const items = [item("пациент-А", "Лечение кариеса 26")];
		assert.deepEqual(visitOwnedPlanItems(items, null), []);
		// Заготовка приёма из гидратации базы приёмом не считается.
		assert.deepEqual(
			visitOwnedPlanItems(items, realVisitFieldId(NIL_UUID)),
			[],
		);
		assert.deepEqual(visitOwnedPlanItems(items, realVisitFieldId("   ")), []);
	});

	it("отменённые позиции не отмечают: их не делают", () => {
		const items = [
			item("пациент-А", "Лечение кариеса 26"),
			item("пациент-А", "Отменённая коронка", "cancelled"),
		];
		assert.deepEqual(
			visitOwnedPlanItems(items, "пациент-А").map(
				(entry) => entry.snapshotServiceName,
			),
			["Лечение кариеса 26"],
		);
	});

	it("отсутствующий или неожиданный ответ сервера не роняет список", () => {
		assert.deepEqual(visitOwnedPlanItems(undefined, "пациент-А"), []);
		assert.deepEqual(visitOwnedPlanItems(null, "пациент-А"), []);
		assert.deepEqual(visitOwnedPlanItems("план", "пациент-А"), []);
		assert.deepEqual(
			visitOwnedPlanItems([null, undefined, {}], "пациент-А"),
			[],
		);
	});
});

/**
 * ДЕНЬГИ. Непрочитанная цена печаталась как «0 ₽»: услуга с неизвестной ценой
 * выглядела бесплатной, и её ноль складывался в итог «К оплате по отмеченному».
 * Врач называл пациенту сумму, в которой не хватало позиций, и отличить это по
 * экрану было нельзя.
 */
describe("цена позиции плана", () => {
	it("рубли читаются из строки, как их отдаёт база", () => {
		// numeric из drizzle приходит СТРОКОЙ с точкой.
		assert.equal(parseRubAmount("1500.50"), 1500.5);
		assert.equal(parseRubAmount("0"), 0);
		assert.equal(parseRubAmount(1500.5), 1500.5);
	});

	it("запятая принимается, разделители тысяч убираются", () => {
		assert.equal(parseRubAmount("1500,50"), 1500.5);
		assert.equal(parseRubAmount("1 500,50"), 1500.5);
		assert.equal(parseRubAmount("1 500.50"), 1500.5);
		assert.equal(parseRubAmount("1 500,50"), 1500.5);
	});

	it("непрочитанная цена возвращает null, а не ноль", () => {
		assert.equal(parseRubAmount(null), null);
		assert.equal(parseRubAmount(undefined), null);
		assert.equal(parseRubAmount(""), null);
		assert.equal(parseRubAmount("   "), null);
		assert.equal(parseRubAmount("бесплатно"), null);
		assert.equal(parseRubAmount("1500 ₽"), null);
		assert.equal(parseRubAmount(Number.NaN), null);
		// Две разные разделительные пары — угадывать в деньгах нельзя.
		assert.equal(parseRubAmount("1,500.50"), null);
		assert.equal(parseRubAmount("1.500,50"), null);
	});

	it("итог строки — цена × количество − скидка, не ниже нуля", () => {
		assert.equal(
			planLineTotalRub({
				unitPriceRub: "1500.50",
				quantity: 2,
				discountRub: "1.00",
			}),
			3000,
		);
		// Количества нет — это одна единица, как и в смете.
		assert.equal(planLineTotalRub({ unitPriceRub: "990" }), 990);
		// Скидка больше цены не превращается в долг пациента.
		assert.equal(
			planLineTotalRub({ unitPriceRub: "500", discountRub: "900" }),
			0,
		);
		// Копейки не уплывают на третий знак.
		assert.equal(
			planLineTotalRub({ unitPriceRub: "0.505", quantity: 1 }),
			0.51,
		);
	});

	it("итог не выдумывается там, где цену прочитать нельзя", () => {
		assert.equal(planLineTotalRub({ quantity: 1 }), null);
		assert.equal(planLineTotalRub({ unitPriceRub: null }), null);
		assert.equal(planLineTotalRub({ unitPriceRub: "договорная" }), null);
		assert.equal(planLineTotalRub({ unitPriceRub: "1500", quantity: 0 }), null);
		assert.equal(
			planLineTotalRub({ unitPriceRub: "1500", quantity: -2 }),
			null,
		);
		assert.equal(
			planLineTotalRub({ unitPriceRub: "1500", quantity: "две" }),
			null,
		);
		assert.equal(
			planLineTotalRub({ unitPriceRub: "1500", discountRub: "скидка" }),
			null,
		);
		assert.equal(planLineTotalRub(null), null);
	});

	it("количество: пусто — одна единица, ноль и мусор — не количество", () => {
		assert.equal(planLineQuantity({}), 1);
		assert.equal(planLineQuantity({ quantity: null }), 1);
		assert.equal(planLineQuantity({ quantity: "" }), 1);
		assert.equal(planLineQuantity({ quantity: 3 }), 3);
		assert.equal(planLineQuantity({ quantity: "3" }), 3);
		assert.equal(planLineQuantity({ quantity: 0 }), null);
		assert.equal(planLineQuantity({ quantity: "две" }), null);
	});
});

describe("Wave 47: 9 экспресс-услуг у кресла (Номенклатура 804н)", () => {
	it("содержит ровно 9 утвержденных экспресс-услуг 804н", () => {
		assert.equal(CHAIRSIDE_EXPRESS_SERVICES.length, 9);
	});

	it("содержит точные номенклатурные коды 804н и тарифы в рублях", () => {
		const byCode = new Map(CHAIRSIDE_EXPRESS_SERVICES.map((s) => [s.code804n, s]));

		// 1. Прицельный рентгеновский снимок (A06.07.001) — 450 ₽
		const xray = byCode.get("A06.07.001");
		assert.ok(xray, "A06.07.001 должен присутствовать");
		assert.equal(xray.title, "Прицельный рентгеновский снимок");
		assert.equal(xray.priceRub, 450);

		// 2. Местная анестезия (Артикаин) (A25.07.001) — 800 ₽
		const localAnesth = byCode.get("A25.07.001");
		assert.ok(localAnesth, "A25.07.001 должен присутствовать");
		assert.equal(localAnesth.title, "Местная анестезия (Артикаин)");
		assert.equal(localAnesth.priceRub, 800);

		// 3. Проводниковая анестезия (A25.07.002) — 950 ₽
		const condAnesth = byCode.get("A25.07.002");
		assert.ok(condAnesth, "A25.07.002 должен присутствовать");
		assert.equal(condAnesth.title, "Проводниковая анестезия");
		assert.equal(condAnesth.priceRub, 950);

		// 4. Осмотр и консультация (A01.07.001) — 1 000 ₽
		const consult = byCode.get("A01.07.001");
		assert.ok(consult, "A01.07.001 должен присутствовать");
		assert.equal(consult.title, "Осмотр и консультация");
		assert.equal(consult.priceRub, 1000);

		// 5. Изоляция коффердамом (A16.07.051) — 800 ₽
		const cofferdam = byCode.get("A16.07.051");
		assert.ok(cofferdam, "A16.07.051 должен присутствовать");
		assert.equal(cofferdam.title, "Изоляция коффердамом");
		assert.equal(cofferdam.priceRub, 800);

		// 6. Снятие швов (A16.07.097) — 600 ₽
		const suture = byCode.get("A16.07.097");
		assert.ok(suture, "A16.07.097 должен присутствовать");
		assert.equal(suture.title, "Снятие швов");
		assert.equal(suture.priceRub, 600);

		// 7. Временная пломба (A16.07.002.099) — 700 ₽
		const tempFill = byCode.get("A16.07.002.099");
		assert.ok(tempFill, "A16.07.002.099 должен присутствовать");
		assert.equal(tempFill.title, "Временная пломба");
		assert.equal(tempFill.priceRub, 700);

		// 8. Снятие назубных отложений (1 зуб) (A16.07.050.001) — 350 ₽
		const deposits = byCode.get("A16.07.050.001");
		assert.ok(deposits, "A16.07.050.001 должен присутствовать");
		assert.equal(deposits.title, "Снятие назубных отложений (1 зуб)");
		assert.equal(deposits.priceRub, 350);

		// 9. ОПТГ / Панорамный снимок (A06.07.002) — 1 200 ₽
		const optg = byCode.get("A06.07.002");
		assert.ok(optg, "A06.07.002 должен присутствовать");
		assert.equal(optg.title, "ОПТГ / Панорамный снимок");
		assert.equal(optg.priceRub, 1200);
	});

	it("гарантирует ноль мультяшных эмодзи в названиях услуг", () => {
		for (const s of CHAIRSIDE_EXPRESS_SERVICES) {
			assert.equal(stripEmojis(s.title), s.title, `Услуга ${s.code804n} не должна содержать эмодзи`);
		}
	});
});

describe("Wave 47: Зубная формула FDI (11–48) для привязки услуг", () => {
	it("содержит 32 зуба взрослой формулы без пропусков", () => {
		assert.equal(ALL_FDI_TEETH.length, 32);
		assert.equal(FDI_UPPER_TEETH.length, 16);
		assert.equal(FDI_LOWER_TEETH.length, 16);
	});

	it("включает все 4 квадранта FDI", () => {
		// Квадрант 1 (11..18)
		for (let i = 11; i <= 18; i++) assert.ok(ALL_FDI_TEETH.includes(i as any));
		// Квадрант 2 (21..28)
		for (let i = 21; i <= 28; i++) assert.ok(ALL_FDI_TEETH.includes(i as any));
		// Квадрант 3 (31..38)
		for (let i = 31; i <= 38; i++) assert.ok(ALL_FDI_TEETH.includes(i as any));
		// Квадрант 4 (41..48)
		for (let i = 41; i <= 48; i++) assert.ok(ALL_FDI_TEETH.includes(i as any));
	});
});

describe("Wave 47: Форматирование и разбор строк выполненных услуг", () => {
	it("formatCompletedServiceLine формирует чистую строку 804н без зуба", () => {
		const line = formatCompletedServiceLine({
			code804n: "A06.07.001",
			title: "Прицельный рентгеновский снимок",
			priceRub: 450,
		});
		assert.equal(line, "Выполнено: [A06.07.001] Прицельный рентгеновский снимок — 450 ₽");
	});

	it("formatCompletedServiceLine привязывает номер зуба при наличии", () => {
		const line = formatCompletedServiceLine({
			code804n: "A25.07.001",
			title: "Местная анестезия (Артикаин)",
			priceRub: 800,
			toothCode: "26",
		});
		assert.equal(line, "Выполнено: [A25.07.001] Местная анестезия (Артикаин) (зуб 26) — 800 ₽");
	});

	it("formatCompletedServiceLine игнорирует 'none', '0' и 'Без зуба'", () => {
		assert.equal(
			formatCompletedServiceLine({
				code804n: "A01.07.001",
				title: "Осмотр и консультация",
				priceRub: 1000,
				toothCode: "Без зуба",
			}),
			`Выполнено: [A01.07.001] Осмотр и консультация — ${money(1000)}`,
		);
		assert.equal(
			formatCompletedServiceLine({
				code804n: "A01.07.001",
				title: "Осмотр и консультация",
				priceRub: 1000,
				toothCode: "none",
			}),
			`Выполнено: [A01.07.001] Осмотр и консультация — ${money(1000)}`,
		);
	});

	it("formatCompletedServiceLine удаляет любые эмодзи из переданных строк", () => {
		const line = formatCompletedServiceLine({
			code804n: "A06.07.001",
			title: "📸 Прицельный рентгеновский снимок",
			priceRub: 450,
		});
		assert.equal(line, "Выполнено: [A06.07.001] Прицельный рентгеновский снимок — 450 ₽");
		assert.ok(!line.includes("📸"));
	});

	it("formatCompletedServiceLine обрабатывает неизвестную цену", () => {
		const line = formatCompletedServiceLine({
			code804n: "A16.07.051",
			title: "Изоляция коффердамом",
			priceRub: null,
		});
		assert.equal(line, `Выполнено: [A16.07.051] Изоляция коффердамом — ${PRICE_UNKNOWN_TEXT}`);
	});

	it("parseCompletedServiceLine корректно разбирает строку с кодом, зубом и ценой", () => {
		const parsed = parseCompletedServiceLine(
			"Выполнено: [A25.07.001] Местная анестезия (Артикаин) (зуб 26) — 800 ₽",
		);
		assert.ok(parsed);
		assert.equal(parsed.code804n, "A25.07.001");
		assert.equal(parsed.title, "Местная анестезия (Артикаин)");
		assert.equal(parsed.toothCode, "26");
		assert.equal(parsed.quantity, 1);
		assert.equal(parsed.priceRub, 800);
	});

	it("parseCompletedServiceLine корректно разбирает количество", () => {
		const parsed = parseCompletedServiceLine(
			"Выполнено: [A25.07.001] Местная анестезия (Артикаин) (зуб 26), 2 шт. — 1 600 ₽",
		);
		assert.ok(parsed);
		assert.equal(parsed.quantity, 2);
		assert.equal(parsed.priceRub, 1600);
	});

	it("parseCompletedServiceLine возвращает null для строк не выполненного", () => {
		assert.equal(parseCompletedServiceLine("Рекомендован контрольный осмотр через полгода"), null);
		assert.equal(parseCompletedServiceLine(""), null);
	});
});

describe("Wave 47: Быстрый поиск по прейскуранту клиники (filterServiceCatalog)", () => {
	const mockCatalog = [
		{ id: "1", code: "A16.07.002.010", title: "Препарирование кариозной полости", basePriceRub: 1000, active: true },
		{ id: "2", code: "A16.07.002.011", title: "Восстановление пломбой светового отверждения", basePriceRub: 4000, active: true },
		{ id: "3", code: "A25.07.001", title: "Местная анестезия Ультракаин", basePriceRub: 850, active: true },
		{ id: "4", code: "A16.07.050.001", title: "Ультразвуковой скейлинг", basePriceRub: 2500, active: false }, // Неактивная!
	];

	it("находит услуги по названию без учета регистра", () => {
		const res = filterServiceCatalog(mockCatalog, "пломб");
		assert.equal(res.length, 1);
		assert.equal(res[0]?.id, "2");
		assert.equal(res[0]?.priceRub, 4000);
	});

	it("находит услуги по коду 804н", () => {
		const res = filterServiceCatalog(mockCatalog, "A25.07");
		assert.equal(res.length, 1);
		assert.equal(res[0]?.code, "A25.07.001");
	});

	it("пропускает неактивные позиции каталога", () => {
		const res = filterServiceCatalog(mockCatalog, "скейлинг");
		assert.equal(res.length, 0, "Неактивная услуга не должна выводиться в поиске");
	});

	it("безопасно возвращает пустой массив при пустом запросе или невалидном каталоге", () => {
		assert.deepEqual(filterServiceCatalog(mockCatalog, "   "), []);
		assert.deepEqual(filterServiceCatalog(null, "пломба"), []);
		assert.deepEqual(filterServiceCatalog(undefined, "пломба"), []);
	});
});

describe("Wave 47: Расчет сводки выполненного (calculateCompletedServicesSummary)", () => {
	it("суммирует услуги с копейками и формирует список для кассового счета", () => {
		const planText = [
			"Выполнено: [A06.07.001] Прицельный рентгеновский снимок — 450 ₽",
			"Выполнено: [A25.07.001] Местная анестезия (Артикаин) (зуб 26) — 800 ₽",
			"Выполнено: [A16.07.002.099] Временная пломба (зуб 26) — 700,50 ₽",
			"План на следующее посещение: постоянная обтурация каналов",
		].join("\n");

		const summary = calculateCompletedServicesSummary(planText);
		assert.equal(summary.count, 3);
		assert.equal(summary.unpricedCount, 0);
		assert.equal(summary.totalRub, 1950.5);
		assert.equal(summary.servicesForInvoice.length, 3);
		assert.equal(summary.servicesForInvoice[0]?.code, "A06.07.001");
		assert.equal(summary.servicesForInvoice[0]?.price, 450);
		assert.equal(summary.servicesForInvoice[1]?.toothCode, "26");
	});

	it("учитывает позиции без цены в unpricedCount", () => {
		const planText = [
			"Выполнено: [A06.07.001] Прицельный рентгеновский снимок — 450 ₽",
			"Выполнено: [A16.07.051] Изоляция коффердамом — цена не указана",
		].join("\n");

		const summary = calculateCompletedServicesSummary(planText);
		assert.equal(summary.count, 2);
		assert.equal(summary.unpricedCount, 1);
		assert.equal(summary.totalRub, 450);
	});
});
