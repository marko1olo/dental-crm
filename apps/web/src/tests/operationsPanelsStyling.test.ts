import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Страж оформления рабочих панелей.
 *
 * ЧТО БЫЛО. Панели обзвона, отправки сообщений, рассылок и отчётов появились
 * вместе с их серверной частью и рисовались голыми <table> и <ul> с оформлением
 * прямо в атрибуте style. Глобальных стилей таблиц в проекте нет вовсе, поэтому
 * выглядели они как необработанная разметка, а зашитые в код цвета ломались в
 * тёмной и ночной темах — ровно тот дефект, который в этом же проекте уже
 * чинили в других местах, каждый раз вручную.
 *
 * Проверки ниже дешёвые и текстовые: полноценного рендера в проекте нет, но и
 * возврат к зашитым цветам они ловят.
 */

const projectRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const OPERATIONS_PANELS = [
	"components/schedule/DayConfirmationsPanel.tsx",
	"components/communications/MessageDeliveryConsole.tsx",
	"components/communications/CampaignPanel.tsx",
	"components/reports/ManagerReportsPanel.tsx",
];

/**
 * Вложенные блоки рабочих панелей: своей рамки `panel ops-panel` у них нет —
 * они рисуются ВНУТРИ панели из списка выше, и вторая рамка дала бы панель в
 * панели. Всё остальное к ним применяется ровно так же: зашитый цвет ломает
 * тёмную тему независимо от того, кто отрисовал обёртку.
 *
 * Таблица выплат врачам живёт внутри «Отчётов руководителю» и раньше рисовалась
 * Tailwind-утилитами с подстановками вида `text-[var(--danger,#e11d48)]` — то
 * есть с зашитым цветом, который этот страж и должен ловить.
 */
const NESTED_OPERATIONS_BLOCKS = ["pages/DoctorPayoutDashboard.tsx"];

const STYLESHEET = "styles/dente-operations.css";

function read(relativePath: string): string {
	return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

/** Шестнадцатеричный цвет. Комментарии до сравнения вырезаются — см. stripComments. */
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;

/**
 * Убрать комментарии перед поиском цветов.
 *
 * ЗАЧЕМ. У выражения выше стояла подпись «цвет ВНЕ комментария», но само оно
 * комментарии не исключало, и страж покраснел на объяснении в
 * styles/dente-operations.css: там комментарий рассказывает, как зашитый `#fbfefd`
 * заменили переменной темы, и перечисляет фактические значения переменной в трёх
 * темах (#ffffff / #101a19 / #1c1714). То есть страж наказывал за то, что правку
 * ДОКУМЕНТИРОВАЛИ, и требовал стереть объяснение — единственную часть файла,
 * которая рассказывает, почему литерала здесь быть не должно.
 *
 * Такой ложный сигнал опаснее пропуска: сторож, который краснеет на верном коде,
 * учит выключать сторожа. В этом проекте уже был случай, когда храповик адресов
 * трижды «кричал волки» из-за собственных ошибок разбора, и его чинили раньше,
 * чем начинали ему верить.
 *
 * `//` вырезается только когда перед ним НЕ двоеточие: иначе строка `https://…`
 * считалась бы комментарием, и настоящий зашитый цвет, стоящий после адреса в той
 * же строке, спрятался бы от проверки.
 */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/*
 * САМОПРОВЕРКА ВЫРЕЗАНИЯ. Без неё «цветов не найдено» означало бы что угодно, в
 * том числе что вырезание съело весь файл. Проверяется оба направления: цвет в
 * комментарии не считается нарушением, цвет в коде — считается, а адрес со
 * слэшами не превращает остаток строки в комментарий.
 */
test("вырезание комментариев не мешает ловить настоящий зашитый цвет", () => {
	const inComment = stripComments(
		"/* было #fbfefd, стало var(--paper) */\n.a { color: var(--ink); }",
	);
	assert.deepEqual(
		inComment.match(HEX_COLOR) ?? [],
		[],
		"цвет из комментария принят за нарушение",
	);

	const inCode = stripComments(
		"/* пояснение #ffffff */\n.a { color: #ff0000; }",
	);
	assert.deepEqual(
		inCode.match(HEX_COLOR) ?? [],
		["#ff0000"],
		"цвет в коде потерялся после вырезания",
	);

	const afterUrl = stripComments(
		'const doc = "https://example.ru/x"; const bad = "#00ff00";',
	);
	assert.deepEqual(
		afterUrl.match(HEX_COLOR) ?? [],
		["#00ff00"],
		"адрес со слэшами спрятал цвет за собой",
	);

	const lineComment = stripComments(
		"const a = 1; // тут был #123456\nconst b = '#654321';",
	);
	assert.deepEqual(
		lineComment.match(HEX_COLOR) ?? [],
		["#654321"],
		"строчный комментарий обработан неверно",
	);
});

test("в рабочих панелях нет зашитых цветов", () => {
	// Зашитый цвет — это сломанная тёмная тема. Все цвета берутся из переменных.
	for (const panel of [...OPERATIONS_PANELS, ...NESTED_OPERATIONS_BLOCKS]) {
		const source = stripComments(read(panel));
		const matches = source.match(HEX_COLOR) ?? [];
		assert.deepEqual(
			matches,
			[],
			`${panel}: найдены цвета ${matches.join(", ")}`,
		);
	}
});

test("во вложенных блоках оформление классами и таблица разворачивается в карточки", () => {
	for (const block of NESTED_OPERATIONS_BLOCKS) {
		const source = read(block);

		const inlineStyles = source.match(/style=\{\{/g) ?? [];
		assert.deepEqual(
			inlineStyles,
			[],
			`${block}: оформление в атрибуте style — перенесите в dente-operations.css`,
		);

		// Вложенный блок не заводит вторую рамку панели.
		assert.ok(
			!source.includes('className="panel ops-panel"'),
			`${block}: вложенный блок не должен объявлять свою панель — получится панель в панели`,
		);

		if (!source.includes("<table")) continue;
		// У стойки планшет чаще в портретной ориентации: без подписей колонок
		// таблица на узком экране теряет смысл (см. CSS-правило content: attr(data-label)).
		assert.ok(
			source.includes("data-label="),
			`${block}: у ячеек таблицы нет data-label`,
		);
		assert.ok(
			source.includes('className="ops-num"'),
			`${block}: числовые колонки не помечены ops-num`,
		);
	}
});

test("в таблице стилей панелей нет зашитых цветов", () => {
	const source = stripComments(read(STYLESHEET));
	const matches = source.match(HEX_COLOR) ?? [];
	assert.deepEqual(matches, [], `найдены цвета ${matches.join(", ")}`);
	// И она действительно опирается на переменные темы, а не на пустоту.
	assert.ok(
		source.split("var(--").length > 40,
		"таблица стилей почти не использует переменные темы",
	);
});

test("оформление задано классами, а не атрибутом style", () => {
	// Единственное исключение — ширина полосы в процентах: она вычисляется из
	// данных, и в CSS её вынести нельзя.
	for (const panel of OPERATIONS_PANELS) {
		const source = read(panel);
		const inlineStyles = source.match(/style=\{\{/g) ?? [];
		if (inlineStyles.length === 0) continue;

		assert.ok(
			panel.endsWith("ManagerReportsPanel.tsx"),
			`${panel}: оформление в атрибуте style (${inlineStyles.length} шт.) — перенесите в dente-operations.css`,
		);
		const widthOnly = source.match(/style=\{\{\s*\n?\s*width:/g) ?? [];
		assert.equal(
			inlineStyles.length,
			widthOnly.length,
			"в отчётах допустима только вычисляемая ширина полосы",
		);
	}
});

test("панели подключены к общей таблице стилей", () => {
	for (const panel of OPERATIONS_PANELS) {
		const source = read(panel);
		assert.ok(
			source.includes('className="panel ops-panel"'),
			`${panel}: не помечена классом ops-panel`,
		);
	}
	const main = read("main.tsx");
	assert.ok(
		main.includes("styles/dente-operations.css"),
		"таблица стилей не подключена в main.tsx",
	);
});

test("числовые колонки помечены для моноширинных цифр", () => {
	// Суммы и время в колонке должны стоять разряд под разрядом, иначе взгляд
	// не сравнивает строки, а спотыкается.
	const css = read(STYLESHEET);
	assert.ok(
		css.includes("font-variant-numeric: tabular-nums"),
		"нет правила для моноширинных цифр",
	);

	const reports = read("components/reports/ManagerReportsPanel.tsx");
	assert.ok(
		reports.includes('className="ops-num"'),
		"в отчётах числовые колонки не помечены",
	);
	const confirmations = read("components/schedule/DayConfirmationsPanel.tsx");
	assert.ok(
		confirmations.includes('className="ops-time"'),
		"в обзвоне колонка времени не помечена",
	);
});

test("на узком экране таблица превращается в карточки", () => {
	// У стойки регистратуры планшет чаще в портретной ориентации, и
	// горизонтальная прокрутка съедает колонку с телефоном.
	const css = read(STYLESHEET);
	assert.ok(
		css.includes("@media (max-width: 720px)"),
		"нет правил для узкого экрана",
	);
	assert.ok(
		css.includes("content: attr(data-label)"),
		"у ячеек не подставляются подписи колонок",
	);

	// А значит, у ячеек эти подписи должны быть проставлены.
	for (const panel of OPERATIONS_PANELS) {
		const source = read(panel);
		if (!source.includes("<table")) continue;
		assert.ok(
			source.includes("data-label="),
			`${panel}: у ячеек таблицы нет data-label`,
		);
	}
});

test("состояния читаются без цветовосприятия", () => {
	// Восемь процентов мужчин не различают красный и зелёный, а администратор
	// смотрит в эти экраны каждое утро. Значок дублирует цвет формой.
	const css = read(STYLESHEET);
	assert.ok(
		css.includes(".ops-state--ok::before"),
		"у состояния «успех» нет значка",
	);
	assert.ok(
		css.includes(".ops-state--bad::before"),
		"у состояния «отказ» нет значка",
	);
});

test("движение отключается по просьбе системы", () => {
	const css = read(STYLESHEET);
	assert.ok(
		css.includes("@media (prefers-reduced-motion: reduce)"),
		"не учтён запрет анимаций",
	);
});

test("класс sr-only определён — им пользуется разметка", () => {
	// В проекте нет Tailwind preflight, и без собственного определения подпись
	// таблицы просто отображалась бы на экране.
	const css = read(STYLESHEET);
	assert.ok(css.includes(".sr-only"), "sr-only не определён");
	const confirmations = read("components/schedule/DayConfirmationsPanel.tsx");
	assert.ok(
		confirmations.includes('className="sr-only"'),
		"разметка не пользуется sr-only",
	);
});
