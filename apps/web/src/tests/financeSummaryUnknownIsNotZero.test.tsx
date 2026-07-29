import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { Dashboard } from "@dental/shared";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { money, moneyUnknownLabel } from "../AppHelpers";
import {
	FinancePlanningOverview,
	financeSummaryUnknownLabel,
} from "../FinancePlanning";

/**
 * НЕПОСЧИТАННЫЙ ФИНАНСОВЫЙ ИТОГ НЕ ИМЕЕТ ПРАВА ВЫГЛЯДЕТЬ КАК НУЛЕВОЙ ДОЛГ.
 *
 * Запуск: из apps/web
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     "src/tests/financeSummary*.test.tsx"
 * (рабочий каталог важен — tsx берёт настройку jsx из apps/web/tsconfig.json;
 * заглушка стилей нужна потому, что по цепочке импортов подтягивается AppHelpers
 * со своими .css.)
 *
 * ЧТО БЫЛО СЛОМАНО. Общая money() (AppHelpers.tsx) уже печатала «не определено»
 * вместо «0 ₽» для суммы, которой программа не знает. Но до плиток финансовой
 * сводки эта правка не доставала: useAppLogic.tsx при `!dashboard ||
 * !documentPatient` возвращал объект из восьми НАСТОЯЩИХ нулей, и money(0)
 * честно печатала «0 ₽». Экран заявлял «План лечения 0 ₽ · Оплачено 0 ₽ ·
 * Остаток 0 ₽», хотя утверждение программы было «дашборд не загружен» либо
 * «пациент не выбран». Администратор читает такой экран как «пациент
 * рассчитался» — и не берёт денег, которые пациент должен.
 *
 * ПОЧЕМУ ОБЕ СТОРОНЫ ОБЯЗАТЕЛЬНЫ. Проверка «на экране нет 0 ₽» в одиночку
 * зелёная и у сломанного продукта, который спрятал ЛЮБОЙ ноль, включая
 * настоящий. «Пациент ничего не должен» — законное и важное утверждение, его
 * прятать нельзя. Поэтому здесь два прогона одной разметки: без сводки — «не
 * определено», со сводкой из настоящих нулей — «0 ₽».
 *
 * ПОЧЕМУ ОТРИСОВКА, А НЕ ПОИСК ПО ТЕКСТУ. Соседний страж
 * (tests/moneyUnknownNotZero.test.ts) сознательно читает исходники: он охраняет
 * отсутствие образца `money(поле ?? 0)`. Здесь вопрос другой — что именно видит
 * человек на экране, — и на него отвечает только разметка. Текстом же
 * проверяется единственное, что отрисовкой этого компонента не достаётся: сама
 * дверь в useAppLogic.tsx, поднять которую в node:test нельзя (God-хук на 14 700
 * строк с провайдерами и сетью).
 */

type BillingSummary = Dashboard["billingSummary"];
type TreatmentPlanScenario = Dashboard["treatmentPlanScenarios"][number];

/** Record с обязательными ключами пустым объектом не описывается. */
const noLabels = <Key extends string>(): Record<Key, string> =>
	({}) as Record<Key, string>;

/**
 * Сводка из НАСТОЯЩИХ нулей: пациент есть, дашборд загружен, плана и оплат нет.
 * insuranceCoverageRub опционально в схеме и намеренно не задано.
 */
const zeroSummary: BillingSummary = {
	totalPlannedRub: 0,
	totalDiscountRub: 0,
	totalPaidRub: 0,
	totalDueRub: 0,
	taxDeductionEligibleRub: 0,
	draftDocumentAmountRub: 0,
	openTreatmentItems: 0,
	unpaidDocuments: 0,
};

/**
 * Живая сводка с долгом. Суммы до 1000 намеренно: выше toLocaleString("ru-RU")
 * вставляет разделитель разрядов неразрывным пробелом, и проверка начала бы
 * ловить особенности ICU вместо поведения экрана.
 */
const debtSummary: BillingSummary = {
	totalPlannedRub: 900,
	totalDiscountRub: 0,
	totalPaidRub: 200,
	totalDueRub: 700,
	taxDeductionEligibleRub: 900,
	draftDocumentAmountRub: 0,
	openTreatmentItems: 2,
	unpaidDocuments: 1,
};

const renderOverview = (
	billingSummary: BillingSummary | null,
	activePaymentsCount = 0,
) =>
	renderToStaticMarkup(
		createElement(FinancePlanningOverview, {
			activePaymentsCount,
			billingSummary,
			money,
			onGoToVisit: () => {},
			priorityLabels: noLabels<TreatmentPlanScenario["priority"]>(),
			scenarios: [],
			strategyLabels: noLabels<TreatmentPlanScenario["strategy"]>(),
		}),
	);

/**
 * Что напечатано крупным шрифтом в плитке с этой подписью.
 *
 * Проверять «строка есть где-то в разметке» здесь недостаточно: плиток четыре,
 * и подмена суммы одной плитки суммой другой такой проверкой не ловится.
 */
const tileValue = (markup: string, caption: string) => {
	const at = markup.indexOf(`<span>${caption}</span>`);
	assert.notEqual(at, -1, `плитка «${caption}» исчезла с экрана`);
	const value = /<strong>([^<]*)<\/strong>/.exec(markup.slice(at));
	assert.notEqual(value, null, `у плитки «${caption}» нет значения`);
	return value?.[1] ?? "";
};

/** Подпись под суммой в плитке с этой подписью. */
const tileNote = (markup: string, caption: string) => {
	const at = markup.indexOf(`<span>${caption}</span>`);
	assert.notEqual(at, -1, `плитка «${caption}» исчезла с экрана`);
	const note = /<p>([^<]*)<\/p>/.exec(markup.slice(at));
	return note?.[1] ?? "";
};

const moneyCaptions = ["План лечения", "Оплачено", "Остаток", "Вычет"];

describe("финансовая сводка: непосчитанное не равно нулю", () => {
	it("сводки нет — ни одна из четырёх плиток не печатает «0 ₽»", () => {
		const markup = renderOverview(null);

		for (const caption of moneyCaptions) {
			assert.equal(
				tileValue(markup, caption),
				moneyUnknownLabel,
				`плитка «${caption}» при отсутствии сводки печатает не «${moneyUnknownLabel}»`,
			);
		}
		assert.ok(
			!markup.includes("0 ₽"),
			`при отсутствии сводки на экране появился ноль рублей: ${markup}`,
		);
	});

	it("сводки нет — счётчики позиций и документов тоже не врут нулём", () => {
		const markup = renderOverview(null);

		assert.equal(tileNote(markup, "План лечения"), financeSummaryUnknownLabel);
		assert.equal(tileNote(markup, "Остаток"), financeSummaryUnknownLabel);
		assert.ok(
			!markup.includes("0 открыт"),
			"счётчик позиций заявил «0 открытых позиций» по непосчитанной сводке",
		);
		assert.ok(
			!markup.includes("0 документов"),
			"счётчик документов заявил «0 документов без оплаты» по непосчитанной сводке",
		);
	});

	it("сводки нет — остаток не подсвечивается как долг", () => {
		// finance-due красит плитку как «есть долг». Неизвестный остаток — не долг.
		assert.ok(!renderOverview(null).includes("finance-due"));
	});

	it("НАСТОЯЩИЙ ноль остаётся «0 ₽» и не прячется", () => {
		const markup = renderOverview(zeroSummary);

		for (const caption of moneyCaptions) {
			assert.equal(
				tileValue(markup, caption),
				"0 ₽",
				`плитка «${caption}» спрятала настоящий ноль`,
			);
		}
		assert.ok(
			!markup.includes(moneyUnknownLabel),
			`настоящая нулевая сводка выдана за непосчитанную: ${markup}`,
		);
		assert.equal(tileNote(markup, "План лечения"), "0 открытых позиций");
		assert.equal(tileNote(markup, "Остаток"), "0 документов без оплаты");
	});

	it("посчитанные суммы доезжают до своих плиток", () => {
		// Иначе проверка выше остаётся зелёной у экрана, который печатает ноль
		// всегда: «0 ₽» тогда стоит и там, где должно стоять 700 ₽.
		const markup = renderOverview(debtSummary, 1);

		assert.equal(tileValue(markup, "План лечения"), "900 ₽");
		assert.equal(tileValue(markup, "Оплачено"), "200 ₽");
		assert.equal(tileValue(markup, "Остаток"), "700 ₽");
		assert.equal(tileValue(markup, "Вычет"), "900 ₽");
		assert.equal(tileNote(markup, "План лечения"), "2 открытые позиции");
		assert.equal(tileNote(markup, "Остаток"), "1 документ без оплаты");
		assert.ok(
			markup.includes("finance-due"),
			"остаток 700 ₽ не подсвечен как долг",
		);
	});

	it("подпись непосчитанного счётчика дословно совпадает с подписью непосчитанной суммы", () => {
		// В одной плитке стоят сумма и счётчик. Два разных слова про одно и то же
		// состояние читаются как два разных состояния.
		assert.equal(financeSummaryUnknownLabel, moneyUnknownLabel);
	});
});

/*
 * ДВЕРЬ В ИСТОЧНИКЕ. Отрисовка выше доказывает, что компонент правильно рисует
 * null. Она НЕ доказывает, что null до него доезжает: пока useAppLogic отдаёт
 * объект из нулей, компонент честно печатает «0 ₽», и все проверки выше зелёные.
 * Поэтому дверь проверяется по исходнику — так же, как это делает
 * tests/moneyUnknownNotZero.test.ts для вызовов money().
 */
const webSrcDir = fileURLToPath(new URL("..", import.meta.url));
const memoAnchor = "const patientBillingSummary = useMemo";

/** Тело мемо от объявления и на 600 знаков вперёд: ранний возврат и его форма. */
const unknownTotalDoor = (source: string) => {
	const at = source.indexOf(memoAnchor);
	assert.notEqual(at, -1, "мемо patientBillingSummary исчезло из useAppLogic.tsx");
	return source.slice(at, at + 600);
};

const doorReportsUnknown = (door: string) =>
	/if \(!dashboard \|\| !documentPatient\) return null;/.test(door) &&
	!/totalDueRub:\s*0/.test(door);

describe("источник сводки: отсутствие данных возвращается как null", () => {
	it("useAppLogic.tsx не подставляет сводку из нулей", () => {
		const door = unknownTotalDoor(
			readFileSync(join(webSrcDir, "useAppLogic.tsx"), "utf8"),
		);
		assert.ok(
			doorReportsUnknown(door),
			`при отсутствии дашборда или пациента сводка снова собирается из нулей:\n${door}`,
		);
	});

	it("тип мемо допускает признак «не посчитано»", () => {
		const door = unknownTotalDoor(
			readFileSync(join(webSrcDir, "useAppLogic.tsx"), "utf8"),
		);
		assert.match(door, /useMemo<Dashboard\["billingSummary"\]\s*\|\s*null>/);
	});

	it("сама проверка видит дефект", () => {
		// Пустой результат поиска — обычный признак сломанного шаблона, а не
		// чистого кода. Образец — дословно то, что стояло в useAppLogic до правки.
		const before = [
			'const patientBillingSummary = useMemo<Dashboard["billingSummary"]>(() => {',
			"\t\tif (!dashboard || !documentPatient)",
			"\t\t\treturn {",
			"\t\t\t\ttotalPlannedRub: 0,",
			"\t\t\t\ttotalDueRub: 0,",
			"\t\t\t};",
		].join("\n");
		assert.equal(doorReportsUnknown(before), false);
	});
});
