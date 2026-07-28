import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Страж числа колонок в группе виджетов под карточкой пациента.
 *
 * ЧТО ЛОВИТ. На снимке 720x1100 (.dente-ops-shots/narrow_full.png) справа от
 * «Дублей карточек пациентов» стояла пустая белая панель с рамкой во всю высоту
 * экрана — 44 % ширины окна ничем. Причина не в самой панели: группа шести
 * виджетов раскладывалась сеткой с минимумом дорожки 280px, на 720 ей достаётся
 * около 639px, две дорожки по 280px туда влезают — и получались две колонки по
 * ~311px. Высота ряда сетки равна высоте самой высокой карточки, а разбор дублей
 * в узкой дорожке перестраивается в стопку подпись/значение и вырастает на
 * тысячи пикселей. Соседняя короткая карточка растягивалась до его высоты.
 *
 * ПОЧЕМУ ПРОВЕРКА ТЕКСТОВАЯ. Полноценного рендера в проекте нет (браузерных
 * тестов нет вовсе), поэтому проверяется то, что проверить можно без браузера:
 * правило в поставляемом CSS и разрешение auto-fit по этому правилу. Это не
 * доказательство отрисовки — снимок делает ведущий. Но возврат минимума к 280px
 * тест ловит, и именно этот возврат вернул бы пустую панель.
 *
 * Разрешение auto-fit по спецификации CSS Grid: дорожек столько, сколько
 * умещается целиком, то есть максимальное n при n*min + (n-1)*gap <= W.
 */

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
	return readFileSync(path.join(webSrc, relativePath), "utf8");
}

/**
 * Обязательное совпадение: отсутствие — это провал проверки с внятным текстом, а
 * не падение по undefined через две строки.
 */
function requireMatch(pattern: RegExp, source: string, message: string): RegExpExecArray {
	const found = pattern.exec(source);
	if (found === null) throw new assert.AssertionError({ message });
	return found;
}

/** Обязательная группа совпадения. */
function requireGroup(match: RegExpExecArray, index: number, message: string): string {
	const value = match[index];
	if (typeof value !== "string") throw new assert.AssertionError({ message });
	return value;
}

/**
 * Корневой размер шрифта — браузерное значение по умолчанию: ни одно правило
 * html/:root в проекте не задаёт font-size. Проверено поиском
 * `rg --multiline "(html|:root)\s*\{[^}]*font-size" apps/web/src/styles/*.css`
 * — совпадений нет. Если такое правило появится, число здесь станет ложным, и
 * менять надо будет его вместе с правилом.
 */
const ROOT_FONT_PX = 16;

type WidgetsGrid = {
	/** Минимальная ширина дорожки, px. */
	trackMinPx: number;
	/** Просвет между дорожками, px. */
	gapPx: number;
};

/**
 * Читает правило .patients-widgets-grid из поставляемой таблицы стилей.
 * Не «примерно как в CSS», а ровно то, что уедет в сборку.
 */
function readWidgetsGrid(): WidgetsGrid {
	const css = read("styles/patients-redesign.css");
	const block = requireMatch(
		/\.patients-widgets-grid\s*\{([^}]*)\}/,
		css,
		"правило .patients-widgets-grid не найдено в patients-redesign.css"
	);
	const body = requireGroup(block, 1, "правило .patients-widgets-grid пустое");

	assert.match(body, /display:\s*grid/, "группа виджетов перестала быть сеткой");

	const template = requireMatch(
		/grid-template-columns:\s*repeat\(\s*auto-fit\s*,\s*minmax\(\s*min\(\s*([\d.]+)rem\s*,\s*100%\s*\)\s*,\s*1fr\s*\)\s*\)/,
		body,
		"ожидалось grid-template-columns: repeat(auto-fit, minmax(min(<N>rem, 100%), 1fr)) — без min(...,100%) колонка не ужимается ниже минимума и карточки срезаются"
	);
	const gap = requireMatch(
		/(?:^|[\s;])gap:\s*([\d.]+)rem/,
		body,
		"просвет между дорожками задан не в rem — пересчёт числа колонок станет неверным"
	);

	return {
		trackMinPx: Number(requireGroup(template, 1, "минимум дорожки не прочитан")) * ROOT_FONT_PX,
		gapPx: Number(requireGroup(gap, 1, "просвет не прочитан")) * ROOT_FONT_PX
	};
}

/** Сколько дорожек даст auto-fit в контейнере ширины containerPx. */
function columnCount(containerPx: number, grid: WidgetsGrid): number {
	// min(<N>rem, 100%): в контейнере уже минимума побеждает сам контейнер.
	const trackMin = Math.min(grid.trackMinPx, containerPx);
	return Math.max(1, Math.floor((containerPx + grid.gapPx) / (trackMin + grid.gapPx)));
}

/** Ширина одной дорожки при таком числе колонок. */
function trackWidth(containerPx: number, grid: WidgetsGrid): number {
	const columns = columnCount(containerPx, grid);
	return (containerPx - grid.gapPx * (columns - 1)) / columns;
}

/*
 * Отступы, определяющие ширину группы. Взяты из опубликованных правил, а не
 * измерены в браузере:
 *   dente-redesign.css:843  .app-shell.dente-redesign .workspace padding-inline: 24px
 *   dente-redesign.css:1061 то же правило при @media (max-width: 840px) -> 12px
 *   dente-redesign.css:1030 .patients-panel padding: 20px, border: 1px
 *   main.css:187            * { box-sizing: border-box }
 */
const NARROW_WORKSPACE_INLINE_PX = 2 * 12;
const PATIENTS_PANEL_CHROME_PX = 2 * 20 + 2 * 1;

/**
 * Диапазон ширин, достижимых для группы, с запасом в обе стороны.
 *
 * Нижняя граница: при окне >840px группа третьим ребёнком .patients-main-grid
 * попадает в его первую дорожку minmax(260px, 320px) — это 260..320px. Верхняя:
 * при окне <=840px .patients-main-grid принудительно одна колонка
 * (dente-redesign.css:1067), и группе достаётся вся ширина панели, максимум
 * 840 - 24 - 42 = 774px. Запас 240..800 закрывает и ширину вертикальной полосы
 * прокрутки, которую по CSS не узнать.
 */
const REACHABLE_MIN_PX = 240;
const REACHABLE_MAX_PX = 800;

test("группа виджетов пациента идёт одной колонкой на всех достижимых ширинах", () => {
	const grid = readWidgetsGrid();

	for (let width = REACHABLE_MIN_PX; width <= REACHABLE_MAX_PX; width += 1) {
		const columns = columnCount(width, grid);
		assert.equal(
			columns,
			1,
			`при ширине группы ${width}px получается ${columns} колонок: вторая дорожка растянется до высоты разбора дублей и станет пустой панелью`
		);
		// Одна колонка и есть отсутствие мёртвой ширины: дорожка равна контейнеру.
		assert.equal(trackWidth(width, grid), width, `при ${width}px дорожка не занимает всю ширину группы`);
	}
});

test("три судимые ширины окна дают одну колонку", () => {
	const grid = readWidgetsGrid();

	// 390 (телефон) и 720 (планшет в портрете): группа во всю ширину панели.
	for (const viewport of [390, 720]) {
		const available = viewport - NARROW_WORKSPACE_INLINE_PX - PATIENTS_PANEL_CHROME_PX;
		assert.equal(columnCount(available, grid), 1, `окно ${viewport}px: группе ${available}px, колонок больше одной`);
	}

	// 1440 (рабочий стол): группа сидит в дорожке minmax(260px, 320px)
	// .patients-main-grid, поэтому ширина окна на неё не влияет.
	for (const trackPx of [260, 320]) {
		assert.equal(columnCount(trackPx, grid), 1, `дорожка карточки пациента ${trackPx}px: колонок больше одной`);
	}
});

test("проверка отличает починку от дефекта: прежний минимум 280px давал две колонки", () => {
	const grid = readWidgetsGrid();
	const before: WidgetsGrid = { trackMinPx: 280, gapPx: grid.gapPx };

	// Ширина группы на окне 720px по опубликованным отступам: 654px. Вертикальная
	// полоса прокрутки, если она классическая, отнимает ещё ~15px и даёт 639px —
	// на число колонок это не влияет, поэтому в расчёте её нет.
	const availableAt720 = 720 - NARROW_WORKSPACE_INLINE_PX - PATIENTS_PANEL_CHROME_PX;
	assert.equal(columnCount(availableAt720, before), 2, "прежнее правило не воспроизводит дефект — проверка ничего не стоит");

	const beforeTrack = trackWidth(availableAt720, before);
	// Дорожка уже 320px — та самая узкая колонка, из-за которой разбор дублей
	// перестраивается в высокую стопку (dente-operations.css, @container opsPanel).
	assert.ok(beforeTrack < 320, `прежняя дорожка ${beforeTrack}px — ожидалась узкая, меньше 320px`);

	// И доля окна, которую занимала пустая дорожка: ведущий увидел «около 45 %».
	const deadShare = beforeTrack / 720;
	assert.ok(
		deadShare > 0.4 && deadShare < 0.5,
		`пустая дорожка занимала ${(deadShare * 100).toFixed(1)} % окна — расчёт расходится с осмотром снимка`
	);

	// И та же ширина по новому правилу — одна колонка.
	assert.equal(columnCount(availableAt720, grid), 1);
});

test("auto-fit не мёртвая форма: получив ширину секции, группа вернёт колонки", () => {
	const grid = readWidgetsGrid();
	// .workspace ограничен max-width: 1560px (dente-redesign.css:846), минус
	// отступы 2x24px и обвязка панели 42px — 1470px.
	const fullSectionPx = 1560 - 2 * 24 - PATIENTS_PANEL_CHROME_PX;
	const columns = columnCount(fullSectionPx, grid);
	assert.ok(
		columns >= 2,
		`на полной ширине секции (${fullSectionPx}px) группа осталась бы ${columns} колонкой — правило превратилось в жёсткую одну`
	);
	// Дорожка при этом не уходит обратно в узкую: смысл минимума именно в этом.
	assert.ok(trackWidth(fullSectionPx, grid) >= grid.trackMinPx, "дорожка на полной ширине уже объявленного минимума");
});

test("перестроение таблицы дублей в карточки сохранено", () => {
	// Ведущий признал стопку подпись/значение верным поведением на узком экране.
	// Порог задан container-запросом по ширине ПАНЕЛИ, а не окна, поэтому
	// расширение группы могло его перескочить.
	const operationsCss = read("styles/dente-operations.css");
	const threshold = requireMatch(
		/@container\s+opsPanel\s*\(max-width:\s*(\d+)px\)/,
		operationsCss,
		"container-запрос перестроения таблицы в карточки не найден"
	);
	const thresholdPx = Number(requireGroup(threshold, 1, "порог перестроения не прочитан"));

	const availableAt720 = 720 - NARROW_WORKSPACE_INLINE_PX - PATIENTS_PANEL_CHROME_PX;
	assert.ok(
		availableAt720 <= thresholdPx,
		`на окне 720px панели достаётся ${availableAt720}px при пороге ${thresholdPx}px — таблица перестанет быть карточками`
	);
});

test("раскладка группы задана классом, а не атрибутом style", () => {
	// Инлайн нельзя переопределить ни media-, ни container-запросом без
	// !important: именно поэтому инлайн у .patients-main-grid приходится глушить
	// через display: flex !important в dente-redesign.css:1067.
	const view = read("PatientsView.tsx");
	assert.ok(view.includes('className="patients-widgets-grid"'), "группа виджетов не помечена классом");
	assert.ok(
		!view.includes("minmax(min(280px, 100%), 1fr)"),
		"в PatientsView вернулась инлайновая сетка с минимумом 280px"
	);

	// Ширина дорожки карточки пациента — источник числа 260..320 в проверках выше.
	assert.ok(
		view.includes("minmax(260px, 320px) 1fr"),
		"дорожка .patients-main-grid изменилась: пересчитайте достижимые ширины группы"
	);
});
