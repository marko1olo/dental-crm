import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

/**
 * СТРОКА ДЕЙСТВИЙ ШАПКИ: СОСТАВ, ПОДПИСИ И ПОРЯДОК.
 *
 * ЧТО ЗДЕСЬ ОХРАНЯЕТСЯ И ПОЧЕМУ ЭТО НЕЛЬЗЯ ПРОВЕРИТЬ ГЛАЗАМИ ОДИН РАЗ.
 * В правом углу шапки стояло восемь действий в шести элементах строки. Строка
 * имеет право на перенос, а перенос всегда сбрасывает вниз ПОСЛЕДНИЕ элементы —
 * и последними стояли «Запись», главное действие продукта, и красный замок без
 * подписи. Запись пациента уезжала на отдельную вторую строку, а место в первой
 * занимали значки, которыми пользуются раз в смену.
 *
 * Исправление держится не на стилях, а на СОСТАВЕ И ПОРЯДОК разметки, поэтому
 * сломать его может обычная правка JSX, которая соберётся и пройдёт typecheck.
 * Отсюда проверка именно здесь.
 *
 * ПОЧЕМУ РАЗБОР, А НЕ ПОИСК ПО ТЕКСТУ. Вопрос «есть ли у кнопки видимая подпись»
 * — про детей узла, а не про подстроку в файле. Поиск по тексту не отличает
 * подпись от значения `title`, не видит порядок элементов внутри контейнера и
 * считает совпадением любое упоминание в комментарии — а комментариев в этом
 * файле больше, чем разметки. Берётся дерево разбора @babel/parser: тот же
 * инструмент, которым в этом дереве уже сделана перепись компонентов
 * (`tests/utils/componentReachability.ts`).
 *
 * ЧЕГО ЭТА ПРОВЕРКА НЕ ДЕЛАЕТ. Она не измеряет пиксели и не открывает браузер:
 * jsdom в проекте нет. Она проверяет то, из чего высота следует — сколько
 * элементов в строке, у всех ли есть слова и кто стоит последним.
 */

const shellPath = fileURLToPath(
	new URL("../workspaceShell.tsx", import.meta.url),
);
const labelsPath = fileURLToPath(
	new URL("../workspaceUiLabels.ts", import.meta.url),
);
const redesignCssPath = fileURLToPath(
	new URL("../styles/dente-redesign.css", import.meta.url),
);

type AstNode = { type: string; [key: string]: unknown };

function isNode(value: unknown): value is AstNode {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

/** Обход дерева сверху вниз в порядке появления в исходнике. */
function walk(node: unknown, visit: (node: AstNode) => void): void {
	if (Array.isArray(node)) {
		for (const item of node) walk(item, visit);
		return;
	}
	if (!isNode(node)) return;
	visit(node);
	for (const key of Object.keys(node)) {
		if (
			key === "loc" ||
			key === "leadingComments" ||
			key === "trailingComments"
		)
			continue;
		walk(node[key], visit);
	}
}

const shellSource = readFileSync(shellPath, "utf8");
const shellAst = parse(shellSource, {
	sourceType: "module",
	plugins: ["typescript", "jsx"],
});

/** Строковое значение атрибута, если оно записано литералом. */
function literalAttribute(element: AstNode, name: string): string | null {
	const attributes = (element["attributes"] ?? []) as AstNode[];
	for (const attribute of attributes) {
		if (attribute.type !== "JSXAttribute") continue;
		const attributeName = attribute["name"] as AstNode | undefined;
		if (!attributeName || attributeName["name"] !== name) continue;
		const value = attribute["value"] as AstNode | undefined;
		if (value?.type === "StringLiteral") return String(value["value"]);
		return null;
	}
	return null;
}

function elementName(element: AstNode): string {
	const name = element["name"] as AstNode | undefined;
	return name && typeof name["name"] === "string" ? name["name"] : "";
}

/**
 * Есть ли у элемента видимый текст. Считается ровно то, что человек прочтёт на
 * кнопке: непустой текстовый узел или подстановка из словаря подписей. Значок с
 * `aria-hidden` текстом не является, `title` — тем более: подсказки при
 * наведении на касании не существует.
 */
function visibleLabelSource(element: AstNode): string | null {
	const children = (element["children"] ?? []) as AstNode[];
	for (const child of children) {
		if (child.type === "JSXText" && String(child["value"]).trim().length > 0) {
			return String(child["value"]).trim();
		}
		if (child.type === "JSXExpressionContainer") {
			const expression = child["expression"] as AstNode | undefined;
			if (!expression) continue;
			const text = shellSource.slice(
				Number(expression["start"]),
				Number(expression["end"]),
			);
			if (text.includes("Labels.")) return text;
		}
	}
	return null;
}

/** Кнопки и ссылки внутри контейнера, в порядке появления в разметке. */
interface TopbarControl {
	readonly tag: string;
	readonly className: string | null;
	readonly label: string | null;
	readonly start: number;
}

function collectTopActions(): {
	container: AstNode;
	controls: TopbarControl[];
} {
	let container: AstNode | null = null;
	walk(shellAst.program, (node) => {
		if (container) return;
		if (node.type !== "JSXOpeningElement") return;
		if (literalAttribute(node, "className") !== "top-actions") return;
		container = node;
	});
	assert.ok(
		container,
		'в workspaceShell.tsx не найден контейнер className="top-actions" — переписан не тот файл',
	);

	// Контейнер найден как ОТКРЫВАЮЩИЙ тег; сам элемент со детьми — его родитель.
	let element: AstNode | null = null;
	walk(shellAst.program, (node) => {
		if (element) return;
		if (node.type !== "JSXElement") return;
		if ((node["openingElement"] as AstNode | undefined) !== container) return;
		element = node;
	});
	assert.ok(element, "у контейнера top-actions не найдено тело элемента");

	const controls: TopbarControl[] = [];
	walk(element, (node) => {
		if (node.type !== "JSXOpeningElement") return;
		const tag = elementName(node);
		if (tag !== "button" && tag !== "a") return;
		controls.push({
			tag,
			className: literalAttribute(node, "className"),
			label: visibleLabelSource(
				// Подписи лежат в детях элемента, а не открывающего тега.
				(() => {
					let owner: AstNode = node;
					walk(element as unknown as AstNode, (candidate) => {
						if (candidate.type !== "JSXElement") return;
						if ((candidate["openingElement"] as AstNode | undefined) !== node)
							return;
						owner = candidate;
					});
					return owner;
				})(),
			),
			start: Number(node["start"]),
		});
	});
	return { container: element as unknown as AstNode, controls };
}

const { controls } = collectTopActions();

test("в строке действий шапки не осталось кнопок-значков без подписи", () => {
	const unlabelled = controls.filter((control) => control.label === null);
	assert.deepEqual(
		unlabelled.map((control) => `${control.tag}.${control.className}`),
		[],
		"кнопка без видимой подписи вернулась в строку действий: значок с aria-label читает только программа чтения с экрана, а подсказки при наведении на касании нет",
	);
	assert.ok(
		controls.length > 0,
		"разбор не нашёл ни одной кнопки — проверка перестала что-либо охранять",
	);
});

test("класс icon-button из строки действий убран вместе со значками", () => {
	const iconButtons = controls.filter((control) =>
		(control.className ?? "").split(/\s+/).includes("icon-button"),
	);
	assert.deepEqual(
		iconButtons.map((control) => control.className),
		[],
		".icon-button — это квадрат 36x36 без места под слова (dente-redesign.css:266-273). Появился снова — значит вернулась кнопка без подписи",
	);
});

test("два безымянных дубля не вернулись: значок базы данных и микрофон", () => {
	const classes = controls.flatMap((control) =>
		(control.className ?? "").split(/\s+/),
	);
	assert.ok(
		!classes.includes("top-dictation-button"),
		"безымянный микрофон вернулся. Он рисовался тем же глифом Mic, что и подписанный «Голос», но ничего не записывал: goToVisitDictation лишь ставил хеш visit и звал scrollToVisitArea. Для администратора, управляющего и ассистента это была мёртвая кнопка — getFilteredAppViews не содержит visit, и охранник маршрута возвращал их на «Смену»",
	);
	assert.ok(
		!classes.includes("top-lock-button"),
		"класс top-lock-button вернулся, а с ним аварийный красный из dente-redesign.css:274 (color: var(--bad-fg) !important). Красный означает опасность; запереть рабочее место в конце смены — обычное безопасное действие, и этот цвет отбирал внимание у «Записи» рядом",
	);
	assert.ok(
		!shellSource.includes("Настройки импорта и экспорта"),
		"вернулась ссылка-значок с именем «Настройки импорта и экспорта»: она вела на общий хеш #settings, который вкладку импорта не открывает, то есть обещала то, чего не делала",
	);
});

test("«Запись» стоит раньше кнопок, которые забирает перенос", () => {
	const primary = controls.find((control) =>
		(control.className ?? "").split(/\s+/).includes("primary-button"),
	);
	assert.ok(
		primary,
		"главное действие «Запись» (.primary-button) исчезло из строки действий",
	);
	const expendable = controls.filter((control) =>
		(control.className ?? "").split(/\s+/).includes("compact-top-button"),
	);
	assert.ok(
		expendable.length > 0,
		"необязательных кнопок больше нет — если состав строки изменился, гарантию порядка нужно перепроверить, а не удалять",
	);
	for (const control of expendable) {
		assert.ok(
			primary.start < control.start,
			`«Запись» снова стоит после ${control.className}. Перенос сбрасывает вниз последние элементы, поэтому главное действие обязано стоять раньше всего необязательного`,
		);
	}
});

test("главное действие в строке ровно одно", () => {
	const primaries = controls.filter((control) =>
		(control.className ?? "").split(/\s+/).includes("primary-button"),
	);
	assert.equal(
		primaries.length,
		1,
		"два главных действия в одной строке означают, что главного нет ни одного",
	);
});

test("необязательные кнопки действительно скрыты до 1140px", () => {
	/*
	 * ЭТО ПРЕМИССА ГАРАНТИИ ПОРЯДКА, А НЕ УКРАШЕНИЕ. Утверждение «до 1140px вниз
	 * может уехать только необязательное» верно ровно потому, что
	 * .compact-top-button скрыт в узком медиавыражении. Уберут правило — премисса
	 * станет ложной молча, поэтому она проверяется здесь, а не остаётся в
	 * комментарии.
	 *
	 * Чего эта проверка НЕ утверждает: что перенос невозможен. Строка flex всегда
	 * кладёт на себя хотя бы один элемент, а группа помощника не сжимается
	 * (flex: 0 0 auto, workspaceActions.css:24), поэтому при очень длинном
	 * названии клиники на 841-1140px группа способна занять строку одна. Точная
	 * граница разобрана в комментарии к строке действий в workspaceShell.tsx;
	 * здесь охраняется только состав, подписи и порядок.
	 */
	const css = readFileSync(redesignCssPath, "utf8");
	const narrowBlocks = [
		...css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)\s*\{/g),
	];
	const hidesCompact = narrowBlocks.some((match) => {
		const width = Number(match[1]);
		if (width > 1140) return false;
		const from = Number(match.index) + match[0].length;
		const block = css.slice(from, from + 2000);
		const end = block.indexOf("\n}");
		return (end === -1 ? block : block.slice(0, end)).includes(
			".compact-top-button",
		);
	});
	assert.ok(
		hidesCompact,
		"в dente-redesign.css больше нет медиавыражения до 1140px, скрывающего .compact-top-button. Без него строка действий на ноутбуке снова содержит все кнопки и может перенести «Запись»",
	);
});

test("каждая подпись шапки лежит в словаре и не пуста", () => {
	/*
	 * Русский текст в JSX не пишется (UI_STANDARDS, «Decouple Strings»), а
	 * словарь без подписи возвращает нас к значку без слов. Проверяется само
	 * содержимое словаря: у каждого действия обязаны быть и подпись, и
	 * объяснение.
	 */
	const labelsSource = readFileSync(labelsPath, "utf8");
	const dictionary = labelsSource.slice(
		labelsSource.indexOf("export const workspaceTopbarLabels"),
	);
	assert.ok(
		dictionary.length > 0,
		"словарь workspaceTopbarLabels исчез из workspaceUiLabels.ts",
	);
	for (const action of ["book", "visit", "setup", "lock"]) {
		const entry = new RegExp(`${action}:\\s*\\{[^}]*\\}`, "s").exec(dictionary);
		assert.ok(entry, `в словаре подписей шапки нет действия «${action}»`);
		assert.match(
			entry[0],
			/label:\s*"[^"]+"/,
			`у действия «${action}» нет непустой видимой подписи label`,
		);
		assert.match(
			entry[0],
			/title:\s*"[^"]+"/,
			`у действия «${action}» нет объяснения title`,
		);
	}
	for (const control of controls) {
		if (control.label === null) continue;
		if (control.label.startsWith("workspaceTopbarLabels.")) continue;
		assert.fail(
			`подпись «${control.label}» написана прямо в разметке, а не взята из словаря workspaceTopbarLabels`,
		);
	}
});

test("в шапку не вернулась плавающая фурнитура", () => {
	/*
	 * Предыдущая версия этих действий висела в правом нижнем углу на
	 * position: fixed и накрывала страницу; механизм «уступи кнопке под собой»
	 * был арифметически неисполним и удалён целиком. Возврат к нему через шапку
	 * запрещён так же, как через собственный файл группы.
	 */
	assert.ok(
		!/position:\s*["']?fixed/.test(shellSource),
		"в workspaceShell.tsx появился position: fixed — плавающая фурнитура уже была удалена один раз",
	);
	assert.ok(
		!/zIndex|z-index/.test(shellSource),
		"в workspaceShell.tsx появился z-index: слои в шапке не назначаются поэлементно",
	);
});
