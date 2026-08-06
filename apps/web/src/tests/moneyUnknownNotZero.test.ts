import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * НЕИЗВЕСТНУЮ СУММУ НЕЛЬЗЯ ГАСИТЬ НУЛЁМ ДО money().
 *
 * Общая money() (AppHelpers) печатает «не определено» вместо «0 ₽» для значения,
 * которого программа не знает, и это закреплено прямыми вызовами в
 * moneyFormat.test.ts. Но у той правки есть слепое место: если вызывающее место
 * пишет `money(x ?? 0)`, подмена происходит РАНЬШЕ форматирования, и до money()
 * неизвестное просто не доезжает. Экран снова показывает «0 ₽», а проверка
 * функции остаётся зелёной — поэтому одного набора на функцию мало.
 *
 * Что здесь охраняется. Два экрана, где такое `?? 0` стояло на деньгах пациента
 * и было снято:
 *
 *   • ShiftView.tsx — плитка «Оплаты» на главном экране смены. `dashboard` по
 *     типу `Dashboard | null | undefined`, поэтому до загрузки данных плитка
 *     печатала «0 ₽ · долг 0 ₽», и врач читал это как «пациент рассчитался».
 *   • FinancePlanning.tsx — четыре плитки финансовой сводки: план лечения,
 *     оплачено, остаток, вычет.
 *
 * ОХРАНА ЛОВИЛА ОДНУ ФОРМУ ИЗ СЕМИ, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. Прежняя
 * редакция искала подстроку регулярным выражением `money\([^()]*\?\?\s*0`.
 * Мутации в копию ShiftView.tsx, по одной на форму (правится одна строка,
 * :760 — плитка «Оплаты»), копия набора нацелена на копию файла. Код выхода
 * набора у прежней охраны и у этой:
 *
 *   money(x ?? 0)              1 / 1
 *   money(x || 0)              0 / 1
 *   money((x) ?? 0)            0 / 1
 *   money(Number(x ?? 0))      0 / 1
 *   money(x ? x : 0)           0 / 1
 *   money((x) ?? 0 as number)  0 / 1
 *   money((x) ?? 0!)           0 / 1
 *   без мутации                0 / 0
 *
 * Последние две формы прошли мимо и ПЕРВОЙ редакции этого разбора (тоже
 * измерено): переход на компилятор закрыл обёртки вокруг значения и оставил
 * такую же щель вокруг нуля. Разбор дерева сам по себе ничего не гарантирует —
 * гарантирует прогон по каждой форме, поэтому таблица выше и живёт в файле.
 *
 * `|| 0` ХУЖЕ ИСХОДНОГО ДЕФЕКТА, и именно его охрана пропускала. `?? 0` гасит
 * только `null` и `undefined`; `|| 0` гасит ЕЩЁ и настоящий ноль, и пустую
 * строку, и `NaN`. То есть сторож молчал на форме, которая наносит больше
 * вреда, чем та, которую он сторожил, — а следующий автор, увидев зелёный
 * набор, считал файл проверенным.
 *
 * ПОЧЕМУ КОМПИЛЯТОР, А НЕ ПОДСТРОЙКА РЕГУЛЯРНОГО ВЫРАЖЕНИЯ. Дыру дал не плохой
 * шаблон, а сам способ: текстовое совпадение сравнивает написание, а дефект
 * живёт в СМЫСЛЕ выражения. Форм записи одного и того же «подставь ноль»
 * бесконечно много — скобки, пробелы, перевод строки между `??` и `0`,
 * обёртка `Number()`, `Math.round()`, тройная запись `?:`, — и каждая
 * добавленная альтернатива в шаблоне порождает следующую щель. Разбор дерева
 * компилятором снимает вопрос целиком: `money(x ?? 0)` и
 * `money(\n  Number(\n    x\n    ??\n    0\n  )\n)` — это один и тот же узел
 * `BinaryExpression(??)` с нулём справа внутри аргумента вызова `money`.
 *
 * Тот же ход и по той же причине уже сделан в проекте: apps/api/src/tests/
 * webCallsExistingRoutes.test.ts перевёл разбор серверных маршрутов с
 * регулярного выражения на `ts.createSourceFile`, потому что текст не отличал
 * живой код от закомментированного и терял шаблонные строки. Здесь
 * дополнительная выгода в том же: комментарий — это тривия, в дереве вызовов
 * его нет по построению, поэтому ВЫРЕЗАНИЕ КОММЕНТАРИЕВ БОЛЬШЕ НЕ НУЖНО. У
 * прежней редакции оно было обязательным костылём — сторож краснел на
 * собственном объяснении и на объяснениях в ShiftView.tsx:752 и
 * FinancePlanning.tsx:50, где снятый вызов приведён дословно. Сторож,
 * требующий стереть документацию, будет выключен, и тогда он не поймает ни
 * одного настоящего дефекта.
 *
 * ЧТО ПОТЕРЯНО ПРИ ПЕРЕХОДЕ, НАЗЫВАЮ ЧЕСТНО. Прежняя редакция намеренно
 * оставляла в области поиска строчные `//`: закомментированный вызов денег с
 * нулём — нежелательный образец для следующего автора. Дерево комментариев не
 * видит вовсе, и этот класс замечаний ушёл. Он и не был предметом: охрана
 * стоит против «0 ₽» на экране, а закомментированный код на экран ничего не
 * печатает.
 *
 * ОСТАЛЬНЫЕ ТАКИЕ ЖЕ МЕСТА СЮДА НЕ ВКЛЮЧЕНЫ НАМЕРЕННО, чтобы охрана не была
 * зелёной по недосмотру. Обход всех 325 неtestовых файлов apps/web/src этим же
 * разбором (0 ошибок разбора) даёт РОВНО ТРИ места гашения нуля внутри money(),
 * и оба класса разобраны:
 *   • components/settings/SettingsPricesTab.tsx:376 —
 *     `money(item.basePriceRub ?? item.priceRub ?? 0)`. Живой дефект, ничем не
 *     прикрыт; файл держит другой пакет, поэтому здесь он назван, а не спрятан.
 *   • components/reports/ManagerReportsPanel.tsx:1031 и :1034 —
 *     `money(summary.receivables.totalPrepaidRub ?? 0)`. Проверено по коду:
 *     весь блок стоит под условием `(summary.receivables.totalPrepaidRub ?? 0) > 0`
 *     (там же, :997), то есть до вызова доезжает только настоящее число больше
 *     нуля, и снимать `?? 0` нечего.
 *
 * Разбор экспортирован (`zeroFallbacksInMoneyCalls`), чтобы самопроверки ниже
 * гоняли ТОТ ЖЕ код, что и дерево, а не проверяли шаблон пересказом. Довести
 * охрану до обхода всего дерева храповиком (как в webCallsExistingRoutes) —
 * отдельная работа: она красная, пока жив SettingsPricesTab.tsx:376, и правка
 * того файла лежит за границей этого пакета.
 */
const webSrcDir = fileURLToPath(new URL("..", import.meta.url));

/** Имена, которыми в дереве зовут форматирование денег. */
const MONEY_CALLEES = new Set(["money"]);

/**
 * Обёртки, которые ничего не меняют в значении: скобки, приведение типа,
 * `satisfies`, утверждение non-null, угловое приведение.
 *
 * Снимаются, потому что искать дефект надо в ЗНАЧЕНИИ, а не в записи. Замер по
 * первой редакции этого разбора: `money(x ?? 0 as number)`,
 * `money(x ?? (0 as number))`, `money(x ?? 0!)` и `money(x ?? 0 satisfies number)`
 * давали ноль совпадений — то есть переход на компилятор закрыл обёртки на
 * стороне ЗНАЧЕНИЯ (`Number(x ?? 0)`), но оставил ровно ту же щель на стороне
 * НУЛЯ. Дописать `as number` проще, чем `Number(...)`, и в TypeScript-файле это
 * первое, что напишет автор, которому мешает тип.
 *
 * Угловое приведение `<number>0` живёт только в `.ts`: в `.tsx` угловая скобка —
 * это разметка, и такой записи там не бывает по построению языка.
 */
function unwrapValue(node: ts.Expression): ts.Expression {
	if (
		ts.isParenthesizedExpression(node) ||
		ts.isAsExpression(node) ||
		ts.isSatisfiesExpression(node) ||
		ts.isNonNullExpression(node) ||
		ts.isTypeAssertionExpression(node)
	) {
		return unwrapValue(node.expression);
	}
	return node;
}

/**
 * Ноль как значение по умолчанию.
 *
 * `0.0`, `0e0`, `0_0`, `-0`, `+0` — записи одного и того же нуля, и `Number()`
 * по тексту литерала сводит их все. Строковый `"0"` тоже гасит неизвестное:
 * money() принимает строку и печатает по ней «0 ₽».
 *
 * ПУСТАЯ СТРОКА ЗДЕСЬ НЕ НОЛЬ, и это не упущение: `money(x ?? "")` печатает
 * «не определено» — money() относит пустую строку к неизвестному специально
 * (её докстринг объясняет, почему: `Number("")` в JavaScript равен нулю).
 * Считать `?? ""` дефектом значило бы краснеть на верном коде. По той же
 * причине не дефект и `money(x ?? Number.NaN)`.
 */
function isZeroDefault(node: ts.Expression): boolean {
	const inner = unwrapValue(node);
	if (ts.isNumericLiteral(inner)) return Number(inner.text) === 0;
	if (
		ts.isPrefixUnaryExpression(inner) &&
		(inner.operator === ts.SyntaxKind.MinusToken ||
			inner.operator === ts.SyntaxKind.PlusToken)
	) {
		return isZeroDefault(inner.operand);
	}
	if (ts.isStringLiteralLike(inner))
		return inner.text.trim() !== "" && Number(inner.text) === 0;
	return false;
}

/** Имя вызываемого: `money(x)` и `helpers.money(x)` — одно и то же. */
function calleeName(callee: ts.Expression): string | null {
	if (ts.isIdentifier(callee)) return callee.text;
	if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
	return null;
}

/** Одно место гашения: строка файла и само выражение, как оно написано. */
export type ZeroFallback = { line: number; text: string };

/**
 * ГАШЕНИЕ НЕИЗВЕСТНОГО НУЛЁМ ВНУТРИ ВЫЗОВА money() — ОБХОДОМ ДЕРЕВА.
 *
 * Ищутся три оператора со нулём в ветке «значения нет»: `??`, `||` и тройной
 * `?:`. Все три отвечают на один вопрос одинаково вредно — «не знаю сколько,
 * напишу ноль».
 *
 * ИЩЕТСЯ ВО ВСЁМ ПОДДЕРЕВЕ АРГУМЕНТА, А НЕ ТОЛЬКО НА ВЕРХНЕМ УРОВНЕ. Иначе
 * достаточно обёртки, чтобы пройти мимо: `money(Number(x ?? 0))` — ровно та
 * форма, которую прежняя охрана не видела, и класс `[^()]*` в её шаблоне не
 * заходил за вложенную скобку именно по этой причине. Обёрток сколько угодно
 * (`Number`, `Math.round`, приведение, арифметика), и перечислять их — снова
 * гонка за формами записи.
 *
 * Следствие названо прямо: `money(total - (discount ?? 0))` тоже краснеет, хотя
 * «скидки нет» действительно значит «минус ноль рублей». Правило строгое
 * сознательно — внутри вызова money() «не знаю → ноль» неотличимо от дефекта,
 * ради которого вся охрана. Кому нужен настоящий ноль, считает его ДО вызова, в
 * именованной переменной, где намерение видно ревьюеру. Замер цены этой
 * строгости на дереве: 325 файлов, три совпадения, все три — настоящие `?? 0` на
 * деньгах, ложных ни одного.
 *
 * Настоящий ноль АРГУМЕНТОМ не трогаем: `money(0)` — это «0 ₽», законная сумма
 * (так сказано в докстринге money()), и краснеть на ней значило бы требовать
 * переписать верный код.
 *
 * Экспортируется для самопроверок: разбор, проверенный пересказом, а не
 * прогоном, отличается от отсутствующего только тем, что в него верят.
 */
export function zeroFallbacksInMoneyCalls(
	fileName: string,
	source: string,
): ZeroFallback[] {
	const parsed = parseSource(fileName, source);
	const found: ZeroFallback[] = [];
	const starts = new Set<number>();

	const collect = (node: ts.Node): void => {
		const isZeroFallback =
			(ts.isBinaryExpression(node) &&
				(node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
					node.operatorToken.kind === ts.SyntaxKind.BarBarToken) &&
				isZeroDefault(node.right)) ||
			(ts.isConditionalExpression(node) && isZeroDefault(node.whenFalse));
		if (isZeroFallback) {
			// Файл передаётся явно: узлы разобраны без родителей
			// (`setParentNodes: false`), и без него позицию посчитать не от чего.
			// `node.pos` напрямую не годится — он указывает на начало тривии, то
			// есть на конец предыдущего комментария, и в сообщении об ошибке
			// поехала бы и строка, и текст выражения.
			const start = node.getStart(parsed);
			if (!starts.has(start)) {
				starts.add(start);
				found.push({
					line: parsed.getLineAndCharacterOfPosition(start).line + 1,
					text: source.slice(start, node.end).replace(/\s+/g, " "),
				});
			}
		}
		ts.forEachChild(node, collect);
	};

	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			const name = calleeName(node.expression);
			if (name !== null && MONEY_CALLEES.has(name)) {
				for (const argument of node.arguments) collect(argument);
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);
	return found.sort((left, right) => left.line - right.line);
}

/**
 * Разбор одного файла.
 *
 * `ScriptKind` по расширению ОБЯЗАТЕЛЕН. Разметку `.tsx`, прочитанную как `.ts`,
 * компилятор понимает как утверждения типа: на этой паре файлов замер даёт 11
 * ошибок разбора вместо нуля, дерево получается мусорным, а охрана —
 * молчаливо зелёной. Ровно тот способ сломать сторожа, который не видно.
 */
function parseSource(fileName: string, source: string): ts.SourceFile {
	return ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ false,
		fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
}

/**
 * Сколько ошибок разбора в файле.
 *
 * `parseDiagnostics` компилятор заполняет всегда, но в публичных типах его нет,
 * поэтому доступ через приведение. Нужен он затем, что `createSourceFile` на
 * непонятном тексте НЕ БРОСАЕТ ИСКЛЮЧЕНИЕ: он восстанавливается и отдаёт
 * обрывок дерева. Молчаливо обрезанное дерево — это зелёная охрана без
 * предмета, то есть худший из возможных отказов сторожа.
 */
function parseErrorCount(file: ts.SourceFile): number {
	return (
		(file as unknown as { parseDiagnostics?: readonly unknown[] })
			.parseDiagnostics?.length ?? 0
	);
}

/** Сколько вызовов money() в файле — предмет охраны. */
function moneyCallCount(fileName: string, source: string): number {
	const parsed = parseSource(fileName, source);
	let count = 0;
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			const name = calleeName(node.expression);
			if (name !== null && MONEY_CALLEES.has(name)) count += 1;
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);
	return count;
}

const guardedFiles = ["ShiftView.tsx", "FinancePlanning.tsx"];

const readSource = (relativePath: string) =>
	readFileSync(join(webSrcDir, relativePath), "utf8");

describe("неизвестная сумма не гасится нулём до money()", () => {
	for (const relativePath of guardedFiles) {
		it(`${relativePath}: внутри money() ноль не подставляется`, () => {
			const found = zeroFallbacksInMoneyCalls(
				relativePath,
				readSource(relativePath),
			);
			assert.deepEqual(
				found.map((entry) => `${relativePath}:${entry.line} ${entry.text}`),
				[],
				`${relativePath}: неизвестная сумма снова превращается в ноль до форматирования. ` +
					"На экране это «0 ₽», не отличимое от настоящего нуля: «пациент не должен ничего» и " +
					"«сколько должен, не посчитано» — разные утверждения о деньгах. Считайте ноль до вызова " +
					"в именованной переменной, если он настоящий.",
			);
		});
	}

	it("охраняемые файлы разобраны целиком и печатают деньги", () => {
		// Без этого охрана останется зелёной, если money() из файла уедет (в пустом
		// файле гашения нуля тоже нет) или если разбор сломается и дерево окажется
		// обрывком.
		for (const relativePath of guardedFiles) {
			const source = readSource(relativePath);
			assert.equal(
				parseErrorCount(parseSource(relativePath, source)),
				0,
				`${relativePath}: компилятор не разобрал файл — охрана смотрит на обрывок дерева`,
			);
			assert.ok(
				moneyCallCount(relativePath, source) > 0,
				`${relativePath}: вызовов money() не осталось — охрана потеряла предмет`,
			);
		}
	});

	/*
	 * САМОПРОВЕРКА РАЗБОРА: ВСЕ ФОРМЫ ГАШЕНИЯ, НА КОТОРЫХ ПРЕЖНЯЯ ОХРАНА МОЛЧАЛА.
	 *
	 * Каждая строка фикстуры — измеренный пропуск, а не выдумка: коды выхода по
	 * формам приведены в докстринге файла. Здесь они закреплены разом, потому что
	 * охрана, проверенная на одной форме, ровно это и означала — зелёный набор
	 * при живом дефекте.
	 */
	it("разбор видит гашение нуля во всех формах записи", () => {
		const cases: [string, string, string?][] = [
			["одиночный ??", "money(dashboard?.billingSummary?.totalDueRub ?? 0)"],
			["|| вместо ??", "money(dashboard?.billingSummary?.totalDueRub || 0)"],
			[
				"скобки вокруг значения",
				"money((dashboard?.billingSummary?.totalDueRub) ?? 0)",
			],
			[
				"обёртка Number()",
				"money(Number(dashboard?.billingSummary?.totalDueRub ?? 0))",
			],
			["тройная запись", "money(due ? due : 0)"],
			["пробелы и перевод строки", "money(\n\tdue\n\t\t??\n\t\t0,\n)"],
			["ноль записан иначе", "money(due ?? 0.0)"],
			["ноль со знаком", "money(due ?? -0)"],
			["ноль строкой", 'money(due ?? "0")'],
			["обёртка Math.round()", "money(Math.round(due ?? 0))"],
			["арифметика внутри вызова", "money(total - (discount ?? 0))"],
			["цепочка из двух ??", "money(item.basePriceRub ?? item.priceRub ?? 0)"],
			[
				"разметка вокруг вызова",
				'const tile = <p className="tile">{money(due || 0)}</p>;',
			],
			// Обёртки на стороне НУЛЯ. Все четыре давали ноль совпадений у первой
			// редакции этого разбора: компилятор снял обёртки вокруг значения, а
			// вокруг нуля осталась та же щель.
			["приведение типа на нуле", "money(due ?? 0 as number)"],
			["приведение в скобках", "money(due ?? (0 as number))"],
			["утверждение non-null на нуле", "money(due ?? 0!)"],
			["satisfies на нуле", "money(due ?? 0 satisfies number)"],
			// Угловое приведение бывает только в .ts: в .tsx угловая скобка — разметка.
			["угловое приведение", "money(due ?? <number>0)", "fixture.ts"],
		];
		for (const [label, sample, fileName] of cases) {
			assert.equal(
				zeroFallbacksInMoneyCalls(fileName ?? "fixture.tsx", sample).length,
				1,
				`${label}: разбор не увидел гашение нуля в «${sample}» — эта форма снова проходит мимо охраны`,
			);
		}
	});

	/*
	 * САМОПРОВЕРКА НА ВЕРНОМ КОДЕ. Ложная тревога здесь дороже пропуска: сторож,
	 * требующий переписать работающий вызов или стереть объяснение, будет
	 * выключен — и тогда он не поймает ни одной настоящей подстановки нуля. Оба
	 * случая в этом дереве уже были: прежняя редакция краснела на комментариях,
	 * которые сама же и описывает, и держала для этого вырезание комментариев.
	 */
	it("разбор молчит там, где кода дефекта нет", () => {
		const silent: [string, string][] = [
			["настоящий ноль аргументом", "money(0)"],
			["без подстановки", "money(dashboard?.billingSummary?.totalDueRub)"],
			["округление без нуля", "money(Math.round(remainingDebt))"],
			[
				"пустая строка — это неизвестное, money() печатает «не определено»",
				'money(due ?? "")',
			],
			["гашение вне вызова денег", "const total = due ?? 0;"],
			[
				"условие показа блока, а не сумма",
				"if ((summary.totalPrepaidRub ?? 0) > 0) show();",
			],
			["чужой формат", "percent(share ?? 0)"],
			[
				"блочный комментарий с дефектом дословно",
				"/* Здесь стояло money(поле ?? 0) и снято. */\nmoney(поле);",
			],
			[
				"строчный комментарий с дефектом дословно",
				"// было money(x || 0)\nmoney(x);",
			],
			["дефект внутри строкового литерала", 'const doc = "money(x ?? 0)";'],
			["не ноль по умолчанию", "money(due ?? fallbackRub)"],
			[
				"ноль справа, но не по умолчанию",
				"money(due === 0 ? unknownRub : due)",
			],
			// NaN money() относит к неизвестному и печатает «не определено» — это
			// честный ответ, а не гашение.
			["NaN по умолчанию", "money(due ?? Number.NaN)"],
			["приведение типа на НЕ нуле", "money(due ?? fallbackRub as number)"],
		];
		for (const [label, sample] of silent) {
			assert.deepEqual(
				zeroFallbacksInMoneyCalls("fixture.tsx", sample).map(
					(entry) => entry.text,
				),
				[],
				`${label}: ложная тревога на «${sample}» — на охрану, краснеющую на верном коде, перестанут смотреть`,
			);
		}
	});
});
