import { readFileSync } from "node:fs";
import ts from "typescript";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";
import {
	eachNode,
	findLazyMountErrorBoundary,
	jsxTagName,
} from "./lib/source-tree.mjs";

const appSource = [
	readFileSync("apps/web/src/App.tsx", "utf8"),
	readAppLogicSourceSync(),
].join("\n");
const browserContinuitySource = readFileSync(
	"apps/web/src/browserContinuity.ts",
	"utf8",
);
const bootSource = readFileSync("apps/web/src/AppBootState.tsx", "utf8");
const shellFile = "apps/web/src/AppShell.tsx";
const runtimeSource = `${appSource}\n${browserContinuitySource}`;

const missing = [];

function requireIn(source, snippet, message) {
	if (!source.includes(snippet)) missing.push(message);
}

function forbidIn(source, snippet, message) {
	if (source.includes(snippet)) missing.push(message);
}

/*
 * ГРАНИЦА ОТКАЗА ЗАГРУЗКИ ИЩЕТСЯ РАЗБОРОМ ДЕРЕВА, А НЕ ПОДСТРОКОЙ В AppShell.tsx.
 *
 * Здесь стояли три проверки по тексту файла apps/web/src/AppShell.tsx:
 *   requireIn(appShellSource, "if (!import.meta.env.PROD)", ...)
 *   forbidIn(appShellSource, "errorStack", ...)
 *   forbidIn(appShellSource, "<pre", ...)
 * Класс границы вынесен из AppShell.tsx в bootErrorBoundary.tsx (одна граница на
 * оба контура main.tsx). Первая проверка покраснела, а ОБЕ запрещающие стали
 * тавтологиями: они продолжали «проходить» на файле, где искомого кода больше нет
 * в принципе. Пройденная тавтология опаснее упавшей проверки — она молчит.
 *
 * ОТДЕЛЬНО ПРО `if (!import.meta.env.PROD)`. Эту строку сняли сознательно
 * (bootErrorBoundary.tsx:106-119): под ней падение в production не оставляло следа
 * НИГДЕ. React в production-сборке не всплывает пойманную границей ошибку до
 * window, значит ни window.onerror, ни addEventListener("error") её уже не видят, а
 * сборщика ошибок в apps/web нет ни одного. Гейт требовал «логировать только вне
 * production», то есть требовал вернуть дефект. Требование заменено на СТРОГО
 * БОЛЕЕ СИЛЬНОЕ: падение при загрузке логируется БЕЗУСЛОВНО, на каждом вызове
 * componentDidCatch, и в сток передаётся сама пойманная ошибка.
 *
 * Граница находится так же, как в scripts/smoke-web-code-split-source.mjs: от
 * ленивого монтажа рабочего места вверх по предкам JSX, каждый предок разрешается
 * через таблицу импортов AppShell.tsx в реальный файл, и в файле ищется класс с
 * ОБОИМИ обработчиками React. Ни имя класса, ни имя модуля в проверку не входят.
 * getDerivedStateFromError и componentDidCatch — не наши идентификаторы, а ключи,
 * по которым сам React решает, является ли класс границей, и потому переживают и
 * переименование, и минификацию.
 *
 * Сам обход живёт одним экземпляром в scripts/lib/source-tree.mjs: здесь у него
 * была вторая из трёх копий, и копии уже расходились.
 */

/** Метод класса по имени, со снятой статичностью. */
function classMethod(classNode, sourceFile, methodName, wantStatic) {
	for (const member of classNode.members) {
		if (!ts.isMethodDeclaration(member) || !member.name) continue;
		if (member.name.getText(sourceFile) !== methodName) continue;
		const isStatic =
			(ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) !== 0;
		if (isStatic === wantStatic) return member;
	}
	return null;
}

/** Снимает обёртки `void expr` / `await expr`, мешающие узнать вызов. */
function unwrapExpression(expression) {
	let current = expression;
	while (
		ts.isVoidExpression(current) ||
		ts.isAwaitExpression(current) ||
		ts.isParenthesizedExpression(current)
	) {
		current = current.expression;
	}
	return current;
}

/** Читается ли где-то внутри узла флаг режима сборки. */
function buildModeFlagText(node, sourceFile) {
	let found = null;
	eachNode(node, (inner) => {
		if (found) return;
		if (!ts.isPropertyAccessExpression(inner)) return;
		const text = inner.getText(sourceFile);
		if (/^import\.meta\.env\.(PROD|DEV|MODE)$/.test(text)) found = text;
		if (/^process\.env\.NODE_ENV$/.test(text)) found = text;
	});
	return found;
}

/** Содержит ли узел выход из функции — тогда следующий за ним код условен. */
function containsEarlyExit(node) {
	let found = false;
	eachNode(node, (inner) => {
		if (ts.isReturnStatement(inner) || ts.isThrowStatement(inner)) found = true;
	});
	return found;
}

/** Читается ли `.stack` / `.componentStack` внутри узла. */
function readsStackTrace(node, sourceFile) {
	let found = null;
	eachNode(node, (inner) => {
		if (found) return;
		if (!ts.isPropertyAccessExpression(inner)) return;
		const memberName = inner.name.text;
		if (memberName === "stack" || memberName === "componentStack") {
			found = inner.getText(sourceFile);
		}
	});
	return found;
}

requireIn(
	appSource,
	'from "./AppBootState"',
	"App.tsx must import boot state boundaries",
);
requireIn(
	appSource,
	'from "./browserContinuity"',
	"App.tsx must import browser continuity helpers instead of owning browser probes inline",
);
requireIn(
	appSource,
	"<AppUnlockState",
	"App.tsx must delegate clinical unlock UI",
);
requireIn(
	appSource,
	"<AppLoadingState\n        message={`Рабочий сервер недоступен: ${error}`}",
	"App.tsx must delegate server error boot UI without API jargon",
);
requireIn(
	appSource,
	'actionLabel="Повторить загрузку"',
	"App boot server-error state must offer an explicit retry action",
);
requireIn(
	appSource,
	"setError(null);\n          void loadDashboard().catch",
	"App boot retry must clear stale error and retry dashboard loading",
);
requireIn(
	appSource,
	'operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", loadError)',
	"App boot retry failure must stay operator-readable",
);
requireIn(
	appSource,
	'<AppLoadingState message="Загрузка рабочей смены" />',
	"App.tsx must delegate dashboard loading UI",
);
forbidIn(
	appSource,
	'loadDashboard().catch((loadError: unknown) => {\n      setError(operatorWorkflowFailureMessage("Не удалось загрузить данные", loadError));',
	"useAppLogic must not load the dashboard before auth resolves.",
);
forbidIn(
	appSource,
	"return () => {\n        if (typeof useAppStore.getState().reset",
	"App must not reset global workspace state on React StrictMode remount.",
);
forbidIn(
	appSource,
	"return () => {\n        if (typeof (useDocumentStore.getState() as any).reset",
	"App must not reset document state on React StrictMode remount.",
);
requireIn(
	browserContinuitySource,
	"export async function inspectBrowserContinuity",
	"Browser continuity probes must stay in a dedicated helper chunk.",
);
requireIn(
	browserContinuitySource,
	"Браузер не дает сохранить экран для работы без сети",
	"App browser continuity warnings must explain offline screen storage without cache jargon.",
);
requireIn(
	browserContinuitySource,
	"Браузер не дает сохранить аудио для отправки позже",
	"App browser continuity warnings must explain offline audio storage without IndexedDB jargon.",
);
requireIn(
	browserContinuitySource,
	"Место для локальных черновиков почти заполнено",
	"App browser continuity warnings must explain storage pressure without quota jargon.",
);
requireIn(
	appSource,
	"очистить локальное хранилище",
	"App storage persistence failure must describe the operator-visible effect.",
);
requireIn(
	browserContinuitySource,
	"browserContinuityRegistrationLabels",
	"App continuity status card must map service worker states to readable labels.",
);
requireIn(
	appSource,
	'label: "Работа без сети"',
	"App continuity status card must avoid PWA jargon.",
);
requireIn(
	appSource,
	'label: "Память для офлайна"',
	"App continuity storage card must avoid cache jargon.",
);
requireIn(
	appSource,
	'label: "Место"',
	"App continuity storage usage card must avoid quota jargon.",
);
forbidIn(
	runtimeSource,
	"API недоступен",
	"App boot failure copy must not expose API jargon.",
);
forbidIn(
	runtimeSource,
	"Очередь аудио в IndexedDB недоступна",
	"App browser continuity warnings must not expose IndexedDB jargon.",
);
forbidIn(
	runtimeSource,
	"IndexedDB недоступен",
	"App audio queue errors must not expose IndexedDB jargon.",
);
forbidIn(
	runtimeSource,
	"Запись в IndexedDB",
	"App audio queue errors must not expose IndexedDB jargon.",
);
forbidIn(
	runtimeSource,
	"Обновление IndexedDB",
	"App audio queue errors must not expose IndexedDB jargon.",
);
forbidIn(
	runtimeSource,
	"Удаление из IndexedDB",
	"App audio queue errors must not expose IndexedDB jargon.",
);
forbidIn(
	runtimeSource,
	"Транзакция IndexedDB",
	"App audio queue errors must not expose IndexedDB jargon.",
);
forbidIn(
	runtimeSource,
	"Статус service worker недоступен",
	"App browser continuity warnings must not expose service worker jargon.",
);
forbidIn(
	runtimeSource,
	"Квота хранилища браузера почти заполнена",
	"App browser continuity warnings must not expose quota jargon.",
);
forbidIn(
	runtimeSource,
	"Офлайн-кэш оболочки",
	"App browser continuity warnings must not expose cache jargon.",
);
forbidIn(
	runtimeSource,
	"очистить кэш",
	"App storage persistence failure must not expose cache jargon.",
);
forbidIn(
	appSource,
	'label: "Кэш"',
	"App continuity status card must not expose cache jargon.",
);
forbidIn(
	appSource,
	'label: "PWA-оболочка"',
	"App continuity status card must not expose PWA jargon.",
);
forbidIn(
	appSource,
	'label: "Квота"',
	"App continuity status card must not expose quota jargon.",
);
forbidIn(
	appSource,
	"очередь IndexedDB",
	"App continuity status card must not expose IndexedDB jargon.",
);
forbidIn(
	appSource,
	"async function inspectBrowserContinuity",
	"App.tsx must not inline browser continuity probes in the workspace chunk.",
);
forbidIn(
	appSource,
	"function browserLocalStorageWritable",
	"App.tsx must not inline localStorage probe implementation.",
);
forbidIn(
	appSource,
	'className="boot-state boot-unlock-state"',
	"App.tsx must not inline unlock boot markup",
);
forbidIn(
	appSource,
	'className="boot-unlock-form"',
	"App.tsx must not inline unlock form markup",
);
forbidIn(
	appSource,
	'<main className="boot-state">',
	"App.tsx must not inline generic boot markup",
);

requireIn(
	bootSource,
	"export function AppLoadingState",
	"AppBootState must export loading state",
);
requireIn(
	bootSource,
	"type AppLoadingStateProps",
	"AppBootState loading state must type optional recovery actions",
);
requireIn(
	bootSource,
	'aria-busy={onAction ? undefined : "true"}',
	"AppBootState must expose busy state only for non-recoverable loading",
);
requireIn(
	bootSource,
	'className="secondary-button boot-retry-button"',
	"AppBootState retry action must use the shared button styling",
);
requireIn(
	bootSource,
	'actionLabel ?? "Повторить"',
	"AppBootState retry action must have a safe default label",
);
requireIn(
	bootSource,
	"export function AppUnlockState",
	"AppBootState must export unlock state",
);
requireIn(
	bootSource,
	'className="boot-state boot-unlock-state"',
	"AppBootState must own unlock layout class",
);
requireIn(
	bootSource,
	'className="boot-unlock-form"',
	"AppBootState must own unlock form class",
);
requireIn(
	bootSource,
	"onAdminSecretChange(event.target.value)",
	"AppBootState must keep secret input controlled by props",
);
requireIn(
	bootSource,
	"const secretReady = adminSecretDraft.trim().length > 0;",
	"AppBootState must use a named unlock readiness guard",
);
requireIn(
	bootSource,
	"if (!secretReady) return;",
	"AppBootState form submit must not call unlock with an empty secret",
);
requireIn(
	bootSource,
	"onUnlock();",
	"AppBootState must submit through callback, not own API state",
);
requireIn(
	bootSource,
	'aria-describedby={!secretReady ? "boot-unlock-guidance" : undefined}',
	"AppBootState secret input must point to empty-secret guidance",
);
requireIn(
	bootSource,
	"Введите секрет администратора для этой сессии.",
	"AppBootState fallback copy must avoid raw header names.",
);
requireIn(
	bootSource,
	'placeholder="введите секрет администратора"',
	"AppBootState placeholder must avoid raw header names.",
);
forbidIn(
	bootSource,
	"x-dente-admin-secret",
	"AppBootState must not expose the raw header name to operators.",
);
requireIn(
	bootSource,
	'id="boot-unlock-guidance"',
	"AppBootState must render empty-secret guidance",
);
requireIn(
	bootSource,
	"Введите секрет доступа, который выдал администратор клиники.",
	"AppBootState must explain where the secret comes from",
);
requireIn(
	bootSource,
	"disabled={!secretReady}",
	"AppBootState unlock button must use the readiness guard",
);
requireIn(
	bootSource,
	"Секрет хранится только в памяти вкладки",
	"AppBootState must show session-only secret warning",
);
const bootMount = findLazyMountErrorBoundary(shellFile, { specifier: "./App" });
const boundary = bootMount.boundary;
const halfBuilt = bootMount.halfBuilt;
const lazyWorkspaceName = bootMount.lazyBindingName;

if (!boundary && halfBuilt) {
	missing.push(
		`Boot error boundary above the lazy workspace is only half built (${halfBuilt} implements one of static getDerivedStateFromError / componentDidCatch, not both).`,
	);
} else if (!boundary) {
	missing.push(
		`AppShell must mount the lazy workspace inside a boot error boundary (no JSX ancestor of <${lazyWorkspaceName ?? "?"}> in ${shellFile} resolves to a class with static getDerivedStateFromError and componentDidCatch).`,
	);
}

if (boundary) {
	const catchMethod = classMethod(
		boundary.classNode,
		boundary.ast,
		"componentDidCatch",
		false,
	);
	const catchBody = catchMethod?.body;

	/*
	 * 1. ПАДЕНИЕ ПРИ ЗАГРУЗКЕ ЛОГИРУЕТСЯ БЕЗУСЛОВНО. Доказывается по дереву, а не по
	 *    наличию строки: в теле componentDidCatch обязан быть вызов-ОТДЕЛЬНАЯ
	 *    ИНСТРУКЦИЯ (не внутри if/тернарника/&&/цикла/колбэка), которому передана та
	 *    самая пойманная ошибка — первый параметр метода, — и до этой инструкции не
	 *    должно быть ни одного return/throw, иначе она достижима не всегда. Сток
	 *    намеренно не назван: сегодня это console.error, завтра может быть внешний
	 *    сборщик ошибок; свойство «ошибка всегда куда-то уходит» от этого не зависит.
	 */
	if (!catchBody) {
		missing.push(
			`Boot error boundary must implement componentDidCatch with a body (${boundary.file}:${boundary.className}).`,
		);
	} else {
		const errorParameter = catchMethod.parameters[0];
		const errorParameterName =
			errorParameter && ts.isIdentifier(errorParameter.name)
				? errorParameter.name.text
				: null;

		let unconditionalReport = null;
		let guardedReport = null;
		let reportWithoutError = null;
		let sawEarlyExit = false;
		/** Вызовы, стоящие ОТДЕЛЬНОЙ инструкцией прямо в теле метода. */
		const statementLevelCalls = new Set();

		for (const statement of catchBody.statements) {
			if (!ts.isExpressionStatement(statement)) {
				if (containsEarlyExit(statement)) sawEarlyExit = true;
				continue;
			}
			const call = unwrapExpression(statement.expression);
			if (!ts.isCallExpression(call)) continue;
			statementLevelCalls.add(call);
			const receivesCaughtError =
				errorParameterName !== null &&
				call.arguments.some(
					(argument) =>
						ts.isIdentifier(argument) && argument.text === errorParameterName,
				);
			const calleeText = call.expression.getText(boundary.ast);
			if (!receivesCaughtError) {
				reportWithoutError ??= calleeText;
				continue;
			}
			if (sawEarlyExit) {
				guardedReport ??= `${calleeText} достижим только при отсутствии раннего return/throw выше`;
				continue;
			}
			unconditionalReport ??= calleeText;
		}

		if (!unconditionalReport) {
			// Отдельные сообщения: «сток спрятан под условие» и «сток есть, но ошибку
			// в него не передают» — разные дефекты и чинятся по-разному.
			const guardedElsewhere = (() => {
				let found = null;
				eachNode(catchBody, (node) => {
					if (found) return;
					if (!ts.isCallExpression(node)) return;
					// Интересны именно вызовы, НЕ стоящие отдельной инструкцией в теле
					// метода: они спрятаны под условием, в цикле или в чужом колбэке.
					if (statementLevelCalls.has(node)) return;
					if (
						errorParameterName !== null &&
						node.arguments.some(
							(argument) =>
								ts.isIdentifier(argument) &&
								argument.text === errorParameterName,
						)
					) {
						found = node.getText(boundary.ast).split("\n")[0];
					}
				});
				return found;
			})();

			const detail =
				guardedReport ??
				(guardedElsewhere
					? `сток стоит под условием: ${guardedElsewhere}`
					: reportWithoutError
						? `вызов ${reportWithoutError} не получает пойманную ошибку`
						: "в теле componentDidCatch нет ни одного вызова-инструкции");
			missing.push(
				`Boot failure must be reported unconditionally, production included (${boundary.file}:${boundary.className}.componentDidCatch: ${detail}).`,
			);
		}

		/*
		 * 2. ЖУРНАЛ НЕ ЗАВИСИТ ОТ РЕЖИМА СБОРКИ. Именно эта зависимость и была
		 *    дефектом: `if (!import.meta.env.PROD)` гасил единственную улику ровно
		 *    там, где она нужна. Флаг режима внутри componentDidCatch не может
		 *    служить ничему другому, кроме подавления, поэтому запрещён целиком.
		 */
		const buildModeFlag = buildModeFlagText(catchBody, boundary.ast);
		if (buildModeFlag) {
			missing.push(
				`Boot failure reporting must not depend on the build mode (${boundary.file}:${boundary.className}.componentDidCatch reads ${buildModeFlag}).`,
			);
		}
	}

	/*
	 * 3. СТЕК НЕ ХРАНИТСЯ И НЕ ПОКАЗЫВАЕТСЯ. Проверялось запретом подстрок
	 *    "errorStack" и "<pre" в AppShell.tsx — то есть одного написания поля и
	 *    одного написания тега в файле, где UI отказа больше не живёт. Теперь
	 *    запрещено само чтение `.stack` / `.componentStack` в двух местах, где оно
	 *    означает утечку на экран: в разметке и в сохраняемом состоянии границы.
	 *    Передача стека в журнал при этом разрешена и нужна — это диагностика,
	 *    которую видит инженер, а не сотрудник клиники.
	 */
	const derivedStateMethod = classMethod(
		boundary.classNode,
		boundary.ast,
		"getDerivedStateFromError",
		true,
	);
	if (derivedStateMethod) {
		const storedStack = readsStackTrace(derivedStateMethod, boundary.ast);
		if (storedStack) {
			missing.push(
				`Boot error boundary must not store stack traces in its state (${boundary.file}:${boundary.className}.getDerivedStateFromError reads ${storedStack}).`,
			);
		}
	}

	eachNode(boundary.ast, (node) => {
		if (!ts.isCallExpression(node)) return;
		if (!ts.isPropertyAccessExpression(node.expression)) return;
		if (node.expression.name.text !== "setState") return;
		for (const argument of node.arguments) {
			const storedStack = readsStackTrace(argument, boundary.ast);
			if (storedStack) {
				missing.push(
					`Boot error boundary must not store stack traces in its state (${boundary.file}: setState receives ${storedStack}).`,
				);
			}
		}
	});

	eachNode(boundary.ast, (node) => {
		if (!ts.isJsxExpression(node) || !node.expression) return;
		const renderedStack = readsStackTrace(node.expression, boundary.ast);
		if (renderedStack) {
			missing.push(
				`Boot failure UI must not render stack traces (${boundary.file} renders ${renderedStack}).`,
			);
		}
	});

	eachNode(boundary.ast, (node) => {
		if (!ts.isJsxSelfClosingElement(node) && !ts.isJsxOpeningElement(node))
			return;
		if (jsxTagName(node) === "pre") {
			missing.push(
				`Boot failure UI must not dump preformatted diagnostics (${boundary.file} renders <pre>).`,
			);
		}
	});
}

if (missing.length > 0) {
	console.error("App boot state source smoke failed:");
	for (const item of missing) console.error(`- ${item}`);
	process.exit(1);
}

console.log({
	ok: true,
	unlockDelegated: true,
	loadingDelegated: true,
	bootUiStateless: true,
	// Не константа: печатается граница, которую сторож реально прошёл по дереву от
	// ленивого монтажа рабочего места. Её переезд будет виден в логе гейта.
	bootFailureAlwaysReported: `${boundary.file}:${boundary.className}`,
});
