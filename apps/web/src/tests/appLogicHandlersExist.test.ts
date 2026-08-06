import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { parse } from "@babel/parser";
import { webSrcRoot } from "./utils/componentReachability";

/**
 * Страж: обработчик, которого нет в объекте общей логики, — это мёртвая кнопка.
 *
 * ЧТО СЛУЧИЛОСЬ. Последняя кнопка мастера первого запуска, «Начать работу»,
 * звала `handleFinishOnboarding(newStaffName, newChairName)`. Такого имени нет
 * НИ В ОДНОМ файле репозитория: ни в useAppLogic, ни в двух подмешанных к её
 * результату модулях, ни в хранилище настроек. Имя приходило из
 * деструктуризации `appLogicValue` и равнялось undefined, то есть нажатие
 * роняло `TypeError: handleFinishOnboarding is not a function`, ничего не
 * сохраняло и мастер не закрывало.
 *
 * ПОЧЕМУ ЭТО НЕ ПОЙМАЛ КОМПИЛЯТОР. `export function useAppLogic(): any`
 * (useAppLogic.tsx). Из объекта типа `any` достаётся любое имя, и проверка типов
 * проходит. Поэтому `npm run typecheck` здесь бесполезен по построению, и нужен
 * именно этот страж, а не более строгий tsconfig: пока возвращаемый тип `any`,
 * ловить рассинхронизацию нечем.
 *
 * ЧТО ПРОВЕРЯЕТСЯ. Множество имён, которые App.tsx достаёт из appLogicValue,
 * сверяется с множеством имён, которые её объект РЕАЛЬНО отдаёт. Второе
 * собирается по разбору, а не по вере:
 *   1. ключи объекта в `return { ... }` самой useAppLogic;
 *   2. ключи объектов, которые она подмешивает через `...` — на сегодня это
 *      useTelegramSettings и useAuthLogic;
 *   3. useTelegramSettings подмешивает целиком хранилище настроек, поэтому в
 *      набор входят и ключи settingsStore (состояние + действия). Именно этот
 *      путь делает работоспособным `setOnboardingDismissed`, которого в return
 *      useAppLogic нет вовсе, — без разбора подмешивания страж объявил бы
 *      живое имя мёртвым.
 * Список подмешиваний проверяется отдельно: если в дереве появится новый `...`,
 * страж упадёт и потребует разобрать его источник, а не молча расширит набор.
 *
 * ПОЧЕМУ У СТРАЖА ЕСТЬ СПИСОК ДОЛГА. На день постановки таких имён восемь, и они
 * лежат на разных экранах. Починить их одной правкой нельзя: половина требует
 * правки useAppLogic.tsx, а сравнение множеств без явного списка либо было бы
 * красным с первого дня (и его отключили бы), либо не ловило бы ничего.
 * Поэтому храповик: набор мёртвых имён обязан совпадать со списком ТОЧНО, в обе
 * стороны. Новое мёртвое имя — падение. Починенное и не вычеркнутое — тоже
 * падение, чтобы список не превратился в кладбище.
 */

const APP_PATH = join(webSrcRoot, "App.tsx");
const LOGIC_PATH = join(webSrcRoot, "useAppLogic.tsx");
const TELEGRAM_PATH = join(webSrcRoot, "hooks", "useTelegramSettings.ts");
const AUTH_PATH = join(webSrcRoot, "hooks", "domains", "useAuthLogic.ts");
const SETTINGS_STORE_PATH = join(webSrcRoot, "store", "settingsStore.ts");

/**
 * Мёртвые имена, известные на день постановки стража, с причиной по каждому.
 * Вычеркивать по мере починки; добавлять — только вместе с причиной.
 */
const DANGLING_BACKLOG: ReadonlyArray<{
	readonly name: string;
	readonly reason: string;
}> = [
	{
		name: "setSelectedPatientId",
		reason:
			"App.tsx:4925 — выбор пациента в палитре команд (Ctrl/Cmd+K) и проп на :3591. " +
			"Живёт в patientStore, но useAppLogic его не переотдаёт: починка правит useAppLogic.tsx",
	},
	{
		name: "setScheduleDateFilter",
		reason:
			"App.tsx:4918 — смена дня расписания голосовым помощником (onDateChange). " +
			"Живёт в scheduleStore, наружу не переотдан: починка правит useAppLogic.tsx",
	},
	{
		name: "scheduleDateFilter",
		reason:
			"деструктурируется и не используется в App.tsx ни разу — мёртвая строка деструктуризации",
	},
	{
		name: "applyProtocolTemplateDirectly",
		reason:
			"деструктурируется и не используется в App.tsx ни разу — мёртвая строка деструктуризации",
	},
	{
		name: "speechLiveRms",
		reason:
			"деструктурируется и не используется в App.tsx ни разу — мёртвая строка деструктуризации",
	},
	{
		name: "polishingField",
		reason:
			"App.tsx:3938 — проп дочернего компонента, уходит undefined: починка правит useAppLogic.tsx",
	},
	{
		name: "polishSingleField",
		reason:
			"App.tsx:3939 — проп дочернего компонента, уходит undefined: починка правит useAppLogic.tsx",
	},
	{
		name: "speechTranscriptionBusy",
		reason:
			"App.tsx:3957 — проп дочернего компонента, уходит undefined и читается как «не занято»: " +
			"починка правит useAppLogic.tsx",
	},
];

/** Подмешивания в `return` useAppLogic, источники которых страж разбирает сам. */
const RESOLVED_SPREADS = ["telegramSettingsModule", "auth"] as const;

/** Подмешивания внутри useTelegramSettings, источники которых страж разбирает сам. */
const RESOLVED_TELEGRAM_SPREADS = ["settingsStore"] as const;

type BabelNode = { readonly type: string; readonly [key: string]: unknown };

function parseFile(filePath: string): BabelNode {
	return parse(readFileSync(filePath, "utf8"), {
		sourceType: "module",
		plugins: ["typescript", "jsx"],
	}) as unknown as BabelNode;
}

/** Обойти дерево разбора целиком: узлы здесь — объекты и массивы объектов. */
function walk(node: unknown, visit: (node: BabelNode) => void): void {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const item of node) walk(item, visit);
		return;
	}
	const candidate = node as BabelNode;
	if (typeof candidate.type === "string") visit(candidate);
	for (const value of Object.values(candidate)) {
		if (value && typeof value === "object") walk(value, visit);
	}
}

function propertyName(property: BabelNode): string | null {
	const key = property.key as BabelNode | undefined;
	if (!key) return null;
	if (key.type === "Identifier" && typeof key.name === "string")
		return key.name;
	if (key.type === "StringLiteral" && typeof key.value === "string")
		return key.value;
	return null;
}

interface ObjectShape {
	readonly keys: ReadonlySet<string>;
	readonly spreads: readonly string[];
}

/** Ключи и подмешивания одного объектного литерала. */
function shapeOfObjectExpression(objectExpression: BabelNode): ObjectShape {
	const keys = new Set<string>();
	const spreads: string[] = [];
	for (const property of (objectExpression.properties as
		| BabelNode[]
		| undefined) ?? []) {
		if (property.type === "SpreadElement") {
			const argument = property.argument as BabelNode | undefined;
			if (
				argument?.type === "Identifier" &&
				typeof argument.name === "string"
			) {
				spreads.push(argument.name);
			} else {
				spreads.push("<не идентификатор>");
			}
			continue;
		}
		const name = propertyName(property);
		if (name) keys.add(name);
	}
	return { keys, spreads };
}

/**
 * Объект из `return { ... }` названной функции верхнего уровня. Берётся только
 * возврат самой функции: вложенные функции обходятся, но их возвраты в набор не
 * попадают, иначе внутренний хелпер подарил бы наружу чужие имена.
 */
function returnedObjectShape(
	filePath: string,
	functionName: string,
): ObjectShape {
	const ast = parseFile(filePath);
	let target: BabelNode | null = null;
	walk(ast, (node) => {
		if (node.type !== "FunctionDeclaration") return;
		const id = node.id as BabelNode | undefined;
		if (id?.type === "Identifier" && id.name === functionName) target = node;
	});
	assert.ok(
		target,
		`Функция ${functionName} не найдена в ${filePath} — страж потерял цель разбора`,
	);
	const body = (target as BabelNode).body as BabelNode;
	let shape: ObjectShape | null = null;
	for (const statement of (body.body as BabelNode[] | undefined) ?? []) {
		if (statement.type !== "ReturnStatement") continue;
		const argument = statement.argument as BabelNode | undefined;
		if (argument?.type === "ObjectExpression")
			shape = shapeOfObjectExpression(argument);
	}
	assert.ok(
		shape,
		`У ${functionName} в ${filePath} нет возврата объектным литералом`,
	);
	return shape as ObjectShape;
}

/** Ключи хранилища настроек: начальное состояние плюс действия из create(). */
function settingsStoreKeys(): ReadonlySet<string> {
	const ast = parseFile(SETTINGS_STORE_PATH);
	const keys = new Set<string>();
	let sawInitialState = false;
	let sawStoreFactory = false;
	walk(ast, (node) => {
		if (node.type !== "VariableDeclarator") return;
		const id = node.id as BabelNode | undefined;
		if (id?.type !== "Identifier") return;
		const init = node.init as BabelNode | undefined;
		if (
			id.name === "initialSettingsState" &&
			init?.type === "ObjectExpression"
		) {
			sawInitialState = true;
			for (const key of shapeOfObjectExpression(init).keys) keys.add(key);
			return;
		}
		if (id.name !== "useSettingsStore") return;
		walk(init, (inner) => {
			if (inner.type !== "ObjectExpression") return;
			const shape = shapeOfObjectExpression(inner);
			if (!shape.keys.size) return;
			sawStoreFactory = true;
			for (const key of shape.keys) keys.add(key);
		});
	});
	assert.ok(
		sawInitialState,
		"В settingsStore.ts не найдено initialSettingsState — страж потерял источник состояния",
	);
	assert.ok(
		sawStoreFactory,
		"В settingsStore.ts не найден объект действий create() — страж потерял источник действий",
	);
	return keys;
}

/** Имена, которые App.tsx достаёт из appLogicValue. */
function namesConsumedByApp(): ReadonlySet<string> {
	const ast = parseFile(APP_PATH);
	let pattern: BabelNode | null = null;
	walk(ast, (node) => {
		if (node.type !== "VariableDeclarator") return;
		const init = node.init as BabelNode | undefined;
		if (init?.type !== "Identifier" || init.name !== "appLogicValue") return;
		const id = node.id as BabelNode | undefined;
		if (id?.type === "ObjectPattern") pattern = id;
	});
	assert.ok(
		pattern,
		"В App.tsx не найдена деструктуризация appLogicValue — страж потерял цель разбора",
	);
	const names = new Set<string>();
	for (const property of ((pattern as BabelNode).properties as
		| BabelNode[]
		| undefined) ?? []) {
		if (property.type !== "ObjectProperty") continue;
		const name = propertyName(property);
		if (name) names.add(name);
	}
	return names;
}

function producedNames(): ReadonlySet<string> {
	const logic = returnedObjectShape(LOGIC_PATH, "useAppLogic");
	assert.deepEqual(
		[...logic.spreads].sort(),
		[...RESOLVED_SPREADS].sort(),
		"В return useAppLogic появилось новое подмешивание. Разберите его источник и добавьте в RESOLVED_SPREADS: " +
			"иначе страж считает мёртвыми имена, которые на самом деле приходят оттуда",
	);
	const telegram = returnedObjectShape(TELEGRAM_PATH, "useTelegramSettings");
	assert.deepEqual(
		[...telegram.spreads].sort(),
		[...RESOLVED_TELEGRAM_SPREADS].sort(),
		"В return useTelegramSettings появилось новое подмешивание. Разберите его источник и добавьте в " +
			"RESOLVED_TELEGRAM_SPREADS",
	);
	const auth = returnedObjectShape(AUTH_PATH, "useAuthLogic");
	assert.deepEqual(
		auth.spreads,
		[],
		"В return useAuthLogic появилось подмешивание — разберите его источник",
	);

	const produced = new Set<string>();
	for (const source of [
		logic.keys,
		telegram.keys,
		auth.keys,
		settingsStoreKeys(),
	]) {
		for (const key of source) produced.add(key);
	}
	return produced;
}

test("общая логика отдаёт каждое имя, которое достаёт App.tsx", () => {
	const consumed = namesConsumedByApp();
	const produced = producedNames();
	assert.ok(
		consumed.size > 500,
		`Деструктуризация appLogicValue выродилась: имён ${consumed.size}`,
	);
	assert.ok(
		produced.size > 500,
		`Набор отдаваемых имён выродился: имён ${produced.size}`,
	);

	const dangling = [...consumed].filter((name) => !produced.has(name)).sort();
	const expected = DANGLING_BACKLOG.map((entry) => entry.name).sort();
	assert.deepEqual(
		dangling,
		expected,
		`Мёртвые имена в деструктуризации appLogicValue разошлись со списком долга.\n` +
			`Сейчас в дереве: ${dangling.join(", ") || "(нет)"}\n` +
			`В списке долга:  ${expected.join(", ") || "(нет)"}\n` +
			`Новое имя = кнопка, которая упадёт TypeError при нажатии. Починенное имя вычеркните из DANGLING_BACKLOG.`,
	);
	for (const entry of DANGLING_BACKLOG) {
		assert.ok(
			entry.reason.trim().length > 40,
			`Запись долга ${entry.name} без внятной причины`,
		);
	}
});

test("мастер первого запуска не зовёт ни одного мёртвого имени", () => {
	const source = readFileSync(APP_PATH, "utf8");
	const lines = source.split(/\r?\n/);
	const openIndex = lines.findIndex((line) =>
		line.includes("if (!onboardingDismissed && !isLocalOnboardingDismissed) {"),
	);
	const closeIndex = lines.findIndex(
		(line, index) =>
			index > openIndex &&
			line.includes("if (accessUnlockRequired && !dashboard) {"),
	);
	assert.ok(
		openIndex >= 0,
		"В App.tsx не найден гейт мастера первого запуска — страж потерял границу блока",
	);
	assert.ok(
		closeIndex > openIndex,
		"В App.tsx не найдена граница после мастера первого запуска",
	);

	const wizard = lines.slice(openIndex, closeIndex);
	const consumed = namesConsumedByApp();
	const produced = producedNames();
	const dangling = [...consumed].filter((name) => !produced.has(name));

	const hits: string[] = [];
	for (const name of dangling) {
		const called = new RegExp(`\\b${name}\\s*\\(`);
		const referenced = new RegExp(`\\b${name}\\b`);
		wizard.forEach((line, offset) => {
			if (line.trimStart().startsWith("*")) return; // строка комментария-разбора
			if (!referenced.test(line)) return;
			hits.push(
				`App.tsx:${openIndex + offset + 1} — ${name}${called.test(line) ? " (вызов)" : " (ссылка)"}: ${line.trim()}`,
			);
		});
	}
	assert.deepEqual(
		hits,
		[],
		"Первичная настройка — единственный экран, который новая клиника видит раньше всех остальных. " +
			"Мёртвое имя здесь запирает её на первом экране:\n" +
			hits.join("\n"),
	);

	for (const handler of [
		"continueOnboardingInDraftMode",
		"moveOnboardingTo",
		"addStaffMember",
		"addChair",
	]) {
		assert.ok(
			produced.has(handler),
			`Мастер первого запуска опирается на ${handler}, а общая логика его больше не отдаёт`,
		);
		assert.ok(
			wizard.some((line) => new RegExp(`\\b${handler}\\s*\\(`).test(line)),
			`${handler} больше не вызывается внутри мастера первого запуска — проверьте, чем его заменили`,
		);
	}
});
