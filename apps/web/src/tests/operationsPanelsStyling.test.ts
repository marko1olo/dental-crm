import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const OPERATIONS_PANELS = [
	"components/schedule/DayConfirmationsPanel.tsx",
	"components/communications/MessageDeliveryConsole.tsx",
	"components/communications/CampaignPanel.tsx",
	"components/reports/ManagerReportsPanel.tsx"
];

const STYLESHEET = "styles/dente-operations.css";

function read(relativePath: string): string {
	return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

/** Шестнадцатеричный цвет вне комментария. */
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;

test("в рабочих панелях нет зашитых цветов", () => {
	// Зашитый цвет — это сломанная тёмная тема. Все цвета берутся из переменных.
	for (const panel of OPERATIONS_PANELS) {
		const source = read(panel);
		const matches = source.match(HEX_COLOR) ?? [];
		assert.deepEqual(matches, [], `${panel}: найдены цвета ${matches.join(", ")}`);
	}
});

test("в таблице стилей панелей нет зашитых цветов", () => {
	const source = read(STYLESHEET);
	const matches = source.match(HEX_COLOR) ?? [];
	assert.deepEqual(matches, [], `найдены цвета ${matches.join(", ")}`);
	// И она действительно опирается на переменные темы, а не на пустоту.
	assert.ok(source.split("var(--").length > 40, "таблица стилей почти не использует переменные темы");
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
			`${panel}: оформление в атрибуте style (${inlineStyles.length} шт.) — перенесите в dente-operations.css`
		);
		const widthOnly = source.match(/style=\{\{\s*\n?\s*width:/g) ?? [];
		assert.equal(
			inlineStyles.length,
			widthOnly.length,
			"в отчётах допустима только вычисляемая ширина полосы"
		);
	}
});

test("панели подключены к общей таблице стилей", () => {
	for (const panel of OPERATIONS_PANELS) {
		const source = read(panel);
		assert.ok(source.includes('className="panel ops-panel"'), `${panel}: не помечена классом ops-panel`);
	}
	const main = read("main.tsx");
	assert.ok(main.includes("styles/dente-operations.css"), "таблица стилей не подключена в main.tsx");
});

test("числовые колонки помечены для моноширинных цифр", () => {
	// Суммы и время в колонке должны стоять разряд под разрядом, иначе взгляд
	// не сравнивает строки, а спотыкается.
	const css = read(STYLESHEET);
	assert.ok(css.includes("font-variant-numeric: tabular-nums"), "нет правила для моноширинных цифр");

	const reports = read("components/reports/ManagerReportsPanel.tsx");
	assert.ok(reports.includes('className="ops-num"'), "в отчётах числовые колонки не помечены");
	const confirmations = read("components/schedule/DayConfirmationsPanel.tsx");
	assert.ok(confirmations.includes('className="ops-time"'), "в обзвоне колонка времени не помечена");
});

test("на узком экране таблица превращается в карточки", () => {
	// У стойки регистратуры планшет чаще в портретной ориентации, и
	// горизонтальная прокрутка съедает колонку с телефоном.
	const css = read(STYLESHEET);
	assert.ok(css.includes("@media (max-width: 720px)"), "нет правил для узкого экрана");
	assert.ok(css.includes("content: attr(data-label)"), "у ячеек не подставляются подписи колонок");

	// А значит, у ячеек эти подписи должны быть проставлены.
	for (const panel of OPERATIONS_PANELS) {
		const source = read(panel);
		if (!source.includes("<table")) continue;
		assert.ok(source.includes("data-label="), `${panel}: у ячеек таблицы нет data-label`);
	}
});

test("состояния читаются без цветовосприятия", () => {
	// Восемь процентов мужчин не различают красный и зелёный, а администратор
	// смотрит в эти экраны каждое утро. Значок дублирует цвет формой.
	const css = read(STYLESHEET);
	assert.ok(css.includes(".ops-state--ok::before"), "у состояния «успех» нет значка");
	assert.ok(css.includes(".ops-state--bad::before"), "у состояния «отказ» нет значка");
});

test("движение отключается по просьбе системы", () => {
	const css = read(STYLESHEET);
	assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "не учтён запрет анимаций");
});

test("класс sr-only определён — им пользуется разметка", () => {
	// В проекте нет Tailwind preflight, и без собственного определения подпись
	// таблицы просто отображалась бы на экране.
	const css = read(STYLESHEET);
	assert.ok(css.includes(".sr-only"), "sr-only не определён");
	const confirmations = read("components/schedule/DayConfirmationsPanel.tsx");
	assert.ok(confirmations.includes('className="sr-only"'), "разметка не пользуется sr-only");
});
