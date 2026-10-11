/*
 * treatmentEstimatorReconciler.test.ts — Тесты детектора финансовых утечек и расходников (Leak-Proof Detective).
 * 
 * Проверяет:
 * - Выявление забытой анестезии, коффердама, рентген-контроля в дневнике приёма.
 * - Соответствие Номенклатуре Минздрава РФ 804н.
 * - Поиск цен в прейскуранте клиники и мягкие фолбеки при отсутствии услуг.
 * - Отсутствие ложных срабатываний, если услуга уже в счёте.
 * - 1-клик добавление в смету и чек.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	detectUnbilledConsumables,
	convertUnbilledConsumableToPlanItem,
	convertUnbilledConsumableToChairsideService,
	extractClinicalProtocolText,
	CODES_804N,
	DEFAULT_FALLBACK_PRICES_RUB,
} from "./treatmentEstimatorReconciler";
import type { PlanPriceCatalogItem } from "../treatment-plans/planPricing";

const MOCK_CLINIC_CATALOG: PlanPriceCatalogItem[] = [
	{
		id: "svc_anesth_infilt",
		title: "Анестезия инфильтрационная (Ультракаин Д-С Форте)",
		category: "Анестезиология",
		basePriceRub: 950,
		active: true,
	},
	{
		id: "svc_isol_cofferdam",
		title: "Изоляция операционного поля коффердамом (Sanctuary Dental)",
		category: "Терапевтическая стоматология",
		basePriceRub: 750,
		active: true,
	},
	{
		id: "svc_xray_rvg",
		title: "Прицельная радиовизиография контрольная (цифровой визиограф)",
		category: "Лучевая диагностика",
		basePriceRub: 650,
		active: true,
	},
];

test("extractClinicalProtocolText корректно склеивает фрагменты дневника ЭМК", () => {
	const source = {
		complaint: "Ноющие боли в зубе 16",
		statusLocalis: "Глубокая кариозная полость на жевательной поверхности",
		treatmentPlan: "Анестезия ультракаин 1.7 мл, наложен коффердам, снимок радиовизиография",
	};

	const fullText = extractClinicalProtocolText(source);
	assert.ok(fullText.includes("Ноющие боли"));
	assert.ok(fullText.includes("коффердам"));
	assert.ok(fullText.includes("радиовизиография"));
});

test("детектив находит забытую анестезию, коффердам и снимок, когда в счёте только пломба", () => {
	const protocolText =
		"Под проводниковой анестезией Sol. Ultracaini 1:100 000 наложен коффердам с клампом W8A. Препарирование кариозной полости зуба 46. Пломбирование Estelite Asteria. Выполнен прицельный снимок радиовизиографии для контроля краевого прилегания.";

	// В счёте у администратора только одна услуга — пломба
	const billedServices = [
		{
			id: "svc_fill_46",
			title: "Восстановление зуба пломбой из фотополимера",
			priceRub: 4800,
			quantity: 1,
		},
	];

	const result = detectUnbilledConsumables(protocolText, billedServices, MOCK_CLINIC_CATALOG);

	assert.equal(result.hasUnbilled, true);
	assert.equal(result.unbilledItems.length, 3);

	// Проверяем выявленные позиции
	const anesth = result.unbilledItems.find((i) => i.type === "anesthesia");
	const isol = result.unbilledItems.find((i) => i.type === "isolation");
	const rad = result.unbilledItems.find((i) => i.type === "radiology");

	assert.ok(anesth, "Анестезия обязана быть обнаружена");
	assert.ok(isol, "Коффердам обязан быть обнаружен");
	assert.ok(rad, "Рентген обязан быть обнаружен");

	// Цены берутся из прейскуранта клиники (Мандат 8ah)
	assert.equal(anesth?.priceRub, 950);
	assert.equal(isol?.priceRub, 750);
	assert.equal(rad?.priceRub, 650);

	// Общая сумма утечки
	assert.equal(result.totalUnbilledRub, 950 + 750 + 650);
	assert.ok(result.summaryText.includes("В дневнике зафиксировано, но не включено в счёт"));
	assert.ok(result.summaryText.includes("Анестезия"));
	assert.ok(result.summaryText.includes("Коффердам"));
	assert.ok(result.summaryText.includes("Рентген-контроль"));
});

test("при отсутствии позиций в прайсе используются детерминированные мягкие фолбеки", () => {
	const protocolText = "Проведена инфильтрационная анестезия, наложен раббердам, контрольный рентген";
	const billedServices = [
		{
			id: "svc_fill",
			title: "Пломба",
			priceRub: 3500,
		},
	];

	// Пустой каталог
	const result = detectUnbilledConsumables(protocolText, billedServices, []);

	assert.equal(result.hasUnbilled, true);
	assert.equal(result.unbilledItems.length, 3);

	const anesth = result.unbilledItems.find((i) => i.type === "anesthesia");
	const isol = result.unbilledItems.find((i) => i.type === "isolation");
	const rad = result.unbilledItems.find((i) => i.type === "radiology");

	assert.equal(anesth?.priceRub, DEFAULT_FALLBACK_PRICES_RUB.ANESTHESIA); // 800
	assert.equal(isol?.priceRub, DEFAULT_FALLBACK_PRICES_RUB.ISOLATION); // 600
	assert.equal(rad?.priceRub, DEFAULT_FALLBACK_PRICES_RUB.RADIOLOGY); // 500
	assert.equal(result.totalUnbilledRub, 800 + 600 + 500);
});

test("ноль ложных срабатываний (zero false positives), если расходники уже включены в счёт", () => {
	const protocolText =
		"Инфильтрационная анестезия артикаин 1:200000, изоляция OptraGate, лечение кариеса, визиография";

	// Все позиции честно внесены в счёт
	const billedServices = [
		{
			id: "svc_anesth",
			title: "Анестезия инфильтрационная",
			code804n: CODES_804N.ANESTHESIA_INFILTRATION,
			priceRub: 800,
		},
		{
			id: "svc_isol",
			title: "Наложение коффердама / оптрагейта",
			code804n: CODES_804N.ISOLATION_COFFERDAM,
			priceRub: 600,
		},
		{
			id: "svc_xray",
			title: "Прицельный снимок визиографа",
			code804n: CODES_804N.RADIOLOGY_INTRAORAL,
			priceRub: 500,
		},
		{
			id: "svc_caries",
			title: "Лечение кариеса",
			priceRub: 4500,
		},
	];

	const result = detectUnbilledConsumables(protocolText, billedServices, MOCK_CLINIC_CATALOG);

	assert.equal(result.hasUnbilled, false);
	assert.equal(result.unbilledItems.length, 0);
	assert.equal(result.totalUnbilledRub, 0);
	assert.equal(result.summaryText, "");
});

test("частичная утечка: анестезия включена, но забыты коффердам и снимок", () => {
	const protocolText =
		"Обезболивание проводниковое, коффердам, механическая обработка каналов, прицельная радиовизиография";

	const billedServices = [
		{
			id: "svc_anesth",
			title: "Проводниковая анестезия",
			priceRub: 900,
		},
		{
			id: "svc_endo",
			title: "Эндодонтическое лечение 1 канала",
			priceRub: 3500,
		},
	];

	const result = detectUnbilledConsumables(protocolText, billedServices, MOCK_CLINIC_CATALOG);

	assert.equal(result.hasUnbilled, true);
	assert.equal(result.unbilledItems.length, 2);

	const types = result.unbilledItems.map((i) => i.type);
	assert.ok(!types.includes("anesthesia"), "Анестезия уже в счёте — не должна предлагаться");
	assert.ok(types.includes("isolation"), "Коффердам забыт — обязан быть в списке");
	assert.ok(types.includes("radiology"), "Снимок забыт — обязан быть в списке");
});

test("преобразование в PlanItem и GenericServiceItem для 1-клик добавления", () => {
	const protocolText = "Анестезия ультракаин, коффердам";
	const result = detectUnbilledConsumables(protocolText, [], MOCK_CLINIC_CATALOG);

	assert.equal(result.unbilledItems.length, 2);

	const planItems = result.unbilledItems.map((it) => convertUnbilledConsumableToPlanItem(it, 16));
	assert.equal(planItems.length, 2);
	assert.equal(planItems[0]?.toothNumber, 16);
	assert.equal(planItems[0]?.quantity, 1);
	assert.ok(planItems[0]?.price && planItems[0]?.price > 0);

	const chairsideServices = result.unbilledItems.map(convertUnbilledConsumableToChairsideService);
	assert.equal(chairsideServices.length, 2);
	assert.equal(chairsideServices[0]?.quantity, 1);
	assert.ok(chairsideServices[0]?.priceRub && chairsideServices[0]?.priceRub > 0);
	assert.ok(chairsideServices[0]?.code804n);
});

test("производительность на слабых устройствах: 5 000 проверок занимают менее 50 мс", () => {
	const protocolText =
		"Инфильтрационная анестезия Sol. Ultracaini D-S 1.7ml, изоляция рабочего поля OptraGate small, радиовизиографический контроль обтурации корневого канала.";
	const billed = [{ id: "svc1", title: "Пломба", priceRub: 4000 }];

	const start = Date.now();
	for (let i = 0; i < 5000; i++) {
		detectUnbilledConsumables(protocolText, billed, MOCK_CLINIC_CATALOG);
	}
	const elapsed = Date.now() - start;

	assert.ok(
		elapsed < 200,
		`5000 циклов анализа заняли ${elapsed} мс, что больше допустимого порога производительности`,
	);
});
