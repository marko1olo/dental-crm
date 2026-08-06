import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Ручной ввод цены услуги обязан держать копейки.
 *
 * ЧТО БЫЛО СЛОМАНО. В форме «Добавить/Редактировать услугу» цена читалась
 * выражением `parseInt(e.target.value) || 0` из поля
 * `<input type="number" min="0" step="100">`. Три разных способа потерять
 * деньги в одном месте:
 *  - `parseInt` читает до первого нецифрового знака, поэтому «1500,50»
 *    сохранялось как 1500;
 *  - `|| 0` превращал NaN и пустую строку в ноль, и услуга сохранялась
 *    бесплатной молча;
 *  - числовое поле в русском браузере не считает «1500,50» числом и отдаёт
 *    пустую строку, а `step="100"` делал недействительным любое значение, не
 *    кратное сотне — форма без noValidate вообще не отправлялась.
 *
 * Разборщик прайса, схема nonNegativeMoneyRubSchema и колонка numeric(12,2)
 * копейки держат. Терялись они в последней точке — там, где сумму вводит
 * человек.
 *
 * ПОЧЕМУ ПРОВЕРКА СТАТИЧЕСКАЯ. Условие живёт в разметке (`type`, `step`) и в
 * одном выражении onChange. Поднимать браузер, чтобы увидеть, что числовое
 * поле съело запятую, дороже и менее надёжно, чем прочитать исходник: поведение
 * `type="number"` зависит от локали браузера, а запрет на него — нет.
 * Тот же приём уже используют moneyFieldsStartEmpty и ещё двадцать проверок.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
	join(here, "..", "components", "settings", "SettingsPricesTab.tsx"),
	"utf8",
);

/**
 * Комментарии убираются перед проверкой.
 *
 * В этом проекте принято приводить в комментарии сломанный код дословно, и
 * рядом с исправлением лежит цитата `parseInt(e.target.value) || 0` вместе с
 * `step="100"`. Без вычистки комментариев проверка ловила бы собственное
 * объяснение вместо кода.
 */
function withoutComments(code: string): string {
	return code
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^[\t ]*\/\/.*$/gm, "");
}

/** Разметка одной группы формы: от её подписи до подписи следующей. */
function formGroupAfterLabel(label: string): string {
	const start = source.indexOf(`<label>${label}</label>`);
	assert.notEqual(start, -1, `в форме услуги нет поля «${label}»`);
	const rest = source.slice(start + label.length);
	const next = rest.indexOf("<label>");
	return withoutComments(next === -1 ? rest : rest.slice(0, next));
}

describe("ручной ввод цены услуги держит копейки", () => {
	const priceField = formGroupAfterLabel("Цена (₽)");
	const code = withoutComments(source);

	it("поле цены не числовое: русская запятая не должна исчезать под рукой", () => {
		assert.ok(
			!/type="number"/.test(priceField),
			'поле цены снова type="number": в русском браузере «1500,50» там не число и приходит пустая строка',
		);
		assert.ok(
			/type="text"/.test(priceField),
			"поле цены должно быть текстовым",
		);
		assert.ok(
			/inputMode="decimal"/.test(priceField),
			'без inputMode="decimal" на телефоне откроется буквенная клавиатура',
		);
	});

	it("шаг ввода не запрещает цены, не кратные сотне", () => {
		assert.ok(
			!/\bstep=/.test(priceField),
			"у поля цены снова есть step: форма без noValidate не отправится ни с 6850 ₽, ни с 1500,50",
		);
	});

	it("цена не разбирается parseInt и не подменяется нулём", () => {
		assert.ok(
			!/parseInt/.test(priceField),
			"цена снова читается parseInt — копейки срезаются",
		);
		assert.ok(
			!/basePriceRub:\s*parseInt/.test(code),
			"цена снова читается parseInt — копейки срезаются",
		);
		assert.ok(
			!/basePriceRub:[^,\n]*\|\|\s*0/.test(code),
			"цена снова падает в ноль через `|| 0`: непонятый ввод не должен становиться бесплатной услугой",
		);
	});

	it("сумма разбирается общей normalizeRubAmountInput при сохранении", () => {
		assert.ok(
			/import \{ normalizeRubAmountInput \} from "\.\.\/\.\.\/rubAmountInput"/.test(
				source,
			),
			"разбор суммы должен быть общим для всего приложения",
		);
		assert.ok(
			/normalizeRubAmountInput\(priceRubInput\)/.test(code),
			"цена обязана разбираться один раз при сохранении, а не на каждом нажатии клавиши",
		);
	});

	it("поле цены новой услуги начинается пустым", () => {
		assert.ok(
			/useState\(""\);/.test(
				/const \[priceRubInput[^;]*;/.exec(code)?.[0] ?? "",
			),
			"в поле цены не должно быть подставленного значения: цену вводит человек",
		);
	});

	it("деньги на экране печатаются общим money, а не своим toLocaleString", () => {
		assert.ok(
			/import \{ money \} from "\.\.\/\.\.\/AppHelpers"/.test(source),
			"формат денег в приложении один",
		);
		assert.ok(
			!/toLocaleString\("ru-RU"\)[^\n]{0,24}₽/.test(code),
			"снова свой формат денег: у русской локали по умолчанию до трёх знаков, и 1500,50 печатается как «1 500,5»",
		);
		assert.ok(
			!/(priceRub|basePriceRub|amountRub)[^\n]{0,16}\.toLocaleString\(/.test(
				code,
			),
			"сумма печатается мимо money: полтинник прочитается как пять копеек",
		);
	});
});
