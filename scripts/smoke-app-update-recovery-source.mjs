import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
	callsLocationReload,
	eachNode,
	findLazyMountErrorBoundary,
	parseTypeScriptFile,
	resolveFunctionBinding,
	resolveRelativeModule,
	valueImportsByLocalName,
} from "./lib/source-tree.mjs";

/*
 * ДВЕ ПРИЧИНЫ, ПО КОТОРЫМ ЭТОТ СТОРОЖ БЫЛ КРАСНЫМ, И ОБЕ — «ПРОВЕРЯЛОСЬ НАПИСАНИЕ».
 *
 * 1. НЕ НАША. Коммит bf6750c9d от 2026-07-30 («fix(web): route SW reload
 *    sessionStorage through safe helpers») заменил в apps/web/src/main.tsx прямой
 *    `window.sessionStorage.setItem(...)` на safeSessionStorageSetItem() из
 *    lib/safeLocalStorage.ts. Обёртка нужна: в приватном режиме и при запрете
 *    хранения sessionStorage бросает DOMException, и вкладка падала белым экраном
 *    ещё до AppShell. Сторож же требовал ИМЕННО небезопасный прямой вызов, то есть
 *    требовал вернуть дефект, и краснел с 30 июля — незамеченным, потому что он не
 *    входит ни в `npm run lint`, ни в CI. Теперь проверяется свойство: обработчик
 *    controllerchange ЗАПИСЫВАЕТ маркер восстановления В sessionStorage — сам или
 *    через разрешённую по импортам функцию-обёртку. Синтаксис вызова не важен,
 *    важно, что запись есть и что она именно в sessionStorage (не в localStorage:
 *    маркер обязан умирать вместе со вкладкой, иначе однократная перезагрузка
 *    после смены service worker больше никогда не произойдёт).
 *
 * 2. НАША. Четыре маркера ждались в apps/web/src/AppShell.tsx:
 *      "function requestDenteStaleAppRefresh"
 *      'postMessage({ type: "DENTE_CLEAR_SHELL_CACHE" })'
 *      "window.setTimeout(() => window.location.reload(), 50)"
 *      "onClick={requestDenteStaleAppRefresh}"
 *    Класс границы отказа вынесен из AppShell.tsx в bootErrorBoundary.tsx (одна
 *    граница на оба контура main.tsx), а функция по дороге переименована в
 *    requestBootRefresh. Пятым молча протух запрет `onClick={() =>
 *    window.location.reload()}` на файле AppShell.tsx: кнопки там больше нет
 *    вообще, и запрет стал тавтологией — проходил, ничего не проверяя.
 *    Теперь граница НАХОДИТСЯ разбором дерева (как в
 *    scripts/smoke-web-code-split-source.mjs): от ленивого монтажа рабочего места
 *    вверх по предкам JSX, каждый предок разрешается через таблицу импортов
 *    AppShell.tsx в реальный файл, в файле ищется класс с ОБОИМИ обработчиками
 *    React. Дальше проверяется свойство действия восстановления: обработчик
 *    onClick сбрасывает кэш оболочки сообщением DENTE_CLEAR_SHELL_CACHE и
 *    перезагружает страницу ОТЛОЖЕННО, дав сообщению уйти. Ни имя функции, ни имя
 *    файла в проверку не входят.
 *
 * 3. НАША, ОСТАВЛЕННАЯ НА ПОТОМ И ДОДЕЛАННАЯ ЗДЕСЬ. После первой правки в файле
 *    остались ЗЕЛЁНЫЕ, но зависящие от имён маркеры, то есть та же мина с
 *    отложенным взрывом:
 *      "function requestDenteServiceWorkerActivation"
 *      'worker?.postMessage({ type: "DENTE_SKIP_WAITING" })'
 *      "function reloadOnceAfterServiceWorkerControllerChange"
 *      'navigator.serviceWorker.addEventListener("controllerchange", reloadOnce…)'
 *      четыре маркера и один запрет, прибитые к файлу
 *      apps/web/src/workspaceRouteErrorBoundary.tsx
 *    Первые два доказывали ровно одно: в main.tsx есть функция с таким именем и в
 *    ней есть такая строка. Мёртвая функция с правильным именем прошла бы обе.
 *    Вторые два дублировали имя обработчика, который сторож и так НАХОДИТ по
 *    регистрации слушателя. Последний блок прибивал целую границу отказа к пути
 *    файла — ровно то, из-за чего сторож и краснел 30 июля.
 *    Теперь по каждому доказывается свойство, см. комментарии на местах.
 *
 * Что осталось подстрокой намеренно: строковые контракты, пересекающие границу
 * процесса, — типы сообщений service worker, имя кэша, ключ sessionStorage. Это
 * не идентификаторы, а данные протокола: их переименование обязано ломать сторож.
 *
 * Общие для трёх сторожей функции разбора живут одним экземпляром в
 * scripts/lib/source-tree.mjs: здесь у них была третья копия, и копии уже
 * расходились (эта, например, единственная умела `import { a as b }`).
 */

const swSource = await readFile("apps/web/public/sw.js", "utf8");
const mainFile = "apps/web/src/main.tsx";
const shellFile = "apps/web/src/AppShell.tsx";
const mainSource = await readFile(mainFile, "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

/** Ключ маркера однократной перезагрузки: контракт, а не идентификатор. */
const RELOAD_MARKER_KEY = "dente:sw-controller-reload";
/** Тип сообщения к service worker: тоже контракт между двумя процессами. */
const CLEAR_SHELL_CACHE_MESSAGE = "DENTE_CLEAR_SHELL_CACHE";
/** Второй такой же контракт: просьба к новому worker активироваться немедленно. */
const SKIP_WAITING_MESSAGE = "DENTE_SKIP_WAITING";
/**
 * Потолок задержки перед перезагрузкой в действии восстановления. Задержка нужна
 * ОДНА — уступить очередь событий, чтобы postMessage успел уйти к service worker
 * до того, как страница начнёт умирать. Всё, что человек успевает заметить как
 * ожидание, — уже не уступка очереди, а сломанная кнопка: нажал и ничего.
 */
const MAX_RECOVERY_DEFER_MS = 100;

const failures = [];
/** Где именно нашлась запись маркера: печатается в итоге, а не константой. */
let reloadMarkerWriteSite = null;
/** Где нашлась просьба активировать нового worker. Тоже печатается. */
let skipWaitingRequestSite = null;

function requireIn(source, marker, label) {
	if (!source.includes(marker))
		failures.push(`${label} missing marker: ${marker}`);
}

/* ------------------------------------------------------------------ *
 * Разбор дерева. Компилятор TypeScript, а не регулярка: текстовый поиск
 * не отличает код от комментария и рассыпается при переносе кода в
 * соседний файл — ровно то, что и случилось с этим сторожем. Общий обход
 * лежит в scripts/lib/source-tree.mjs; здесь — только то, что нужно
 * именно про восстановление после протухшей оболочки.
 * ------------------------------------------------------------------ */

/** Пишет ли узел в web storage указанного вида. Возвращает место записи. */
function storageWriteSite(node, sourceFile, storageName) {
	let found = null;
	eachNode(node, (inner) => {
		if (found) return;
		if (!ts.isCallExpression(inner)) return;
		if (!ts.isPropertyAccessExpression(inner.expression)) return;
		if (inner.expression.name.text !== "setItem") return;
		const target = inner.expression.expression.getText(sourceFile);
		if (new RegExp(`(^|\\.)${storageName}$`).test(target)) {
			found = inner.expression.getText(sourceFile);
		}
	});
	return found;
}

/**
 * Тела, достижимые из узла: он сам плюс объявления функций, которые он зовёт по
 * имени и которые разрешаются в этом же модуле или по его таблице импортов.
 * Глубина ограничена: разбор — не интерпретатор, раскрутить граф вызовов целиком
 * ему нечем, и притворяться, что может, он не будет.
 */
function reachableBodies(startNode, sourceFile, filePath, imports) {
	const bodies = [startNode];
	const seen = new Set();
	for (let depth = 0; depth < 4; depth += 1) {
		const frontier = [...bodies];
		for (const body of frontier) {
			eachNode(body, (node) => {
				if (!ts.isCallExpression(node)) return;
				if (!ts.isIdentifier(node.expression)) return;
				const name = node.expression.text;
				if (seen.has(name)) return;
				seen.add(name);
				const target = resolveFunctionBinding(
					sourceFile,
					filePath,
					imports,
					name,
				);
				if (target) bodies.push(target.node);
			});
		}
	}
	return bodies;
}

/**
 * Место, где одно из тел шлёт service worker сообщение указанного типа.
 * `null` — не шлёт ни одно. Получатель намеренно не проверяется: `worker`,
 * `registration.waiting`, `navigator.serviceWorker.controller` — всё это одно и
 * то же обращение к соседнему процессу, а имя переменной к делу не относится.
 */
function messagePostSite(bodies, messageType) {
	for (const body of bodies) {
		let found = null;
		eachNode(body, (node) => {
			if (found) return;
			if (!ts.isCallExpression(node)) return;
			const callee = node.expression;
			if (!ts.isPropertyAccessExpression(callee)) return;
			if (callee.name.text !== "postMessage") return;
			const [payload] = node.arguments;
			if (!payload || !ts.isObjectLiteralExpression(payload)) return;
			for (const property of payload.properties) {
				if (!ts.isPropertyAssignment(property) || !property.name) continue;
				if (property.name.getText() !== "type") continue;
				if (
					ts.isStringLiteral(property.initializer) &&
					property.initializer.text === messageType
				) {
					found = callee.getText();
				}
			}
		});
		if (found) return found;
	}
	return null;
}

/* ------------------------------------------------------------------ *
 * Контракт service worker: обновление и вычистка протухшей оболочки.
 * ------------------------------------------------------------------ */

[
	'const SHELL_CACHE = "dental-crm-shell-v4"',
	"function isForbiddenRuntimeResponse(url)",
	'url.pathname.startsWith("/api/")',
	"medical-documents",
	"dcm|dicom|stl|obj|ply|glb|gltf|nii|nrrd|mhd|raw",
	"function isNetworkFirstShellAsset(url)",
	`event.data?.type === "${SKIP_WAITING_MESSAGE}"`,
	`event.data?.type === "${CLEAR_SHELL_CACHE_MESSAGE}"`,
	'event.source?.postMessage?.({ type: "DENTE_SHELL_CACHE_CLEARED" })',
].forEach((marker) =>
	requireIn(swSource, marker, "Service worker update/stale recovery contract"),
);

/*
 * Что здесь ОСТАЛОСЬ подстрокой и почему. Ключ маркера — контракт хранилища;
 * остальные четыре описывают опрос обновлений (`updatefound`, `statechange`,
 * `installed`, получасовой интервал) и к трём разобранным маркерам отношения не
 * имеют: они прибиты к именам локальных переменных `registration` и
 * `installingWorker` и переименование их сломает. Это известно и названо, а не
 * не замечено; чинить их — отдельная работа с отдельным отрицательным контролем.
 */
[
	`const DENTE_SW_RELOAD_MARKER = "${RELOAD_MARKER_KEY}"`,
	'registration.addEventListener("updatefound"',
	'installingWorker.addEventListener("statechange"',
	'installingWorker.state === "installed"',
	"void registration.update().catch",
	"30 * 60 * 1000",
].forEach((marker) =>
	requireIn(mainSource, marker, "Main service worker update recovery contract"),
);

/*
 * ПРИЧИНА 1. Свойство: обработчик controllerchange записывает маркер однократной
 * перезагрузки в sessionStorage. Раньше здесь стоял маркер
 * `window.sessionStorage.setItem(DENTE_SW_RELOAD_MARKER, "1")` — то есть
 * требование конкретного, причём небезопасного, синтаксиса вызова.
 */
const mainAst = parseTypeScriptFile(mainFile);
const mainImports = valueImportsByLocalName(mainAst);

/** Имя константы, в которой лежит ключ маркера. Ищется по ЗНАЧЕНИЮ ключа. */
let reloadMarkerBinding = null;
eachNode(mainAst, (node) => {
	if (reloadMarkerBinding) return;
	if (!ts.isVariableDeclaration(node) || !node.initializer) return;
	if (!ts.isIdentifier(node.name)) return;
	if (!ts.isStringLiteral(node.initializer)) return;
	if (node.initializer.text === RELOAD_MARKER_KEY)
		reloadMarkerBinding = node.name.text;
});

/**
 * Слушатель controllerchange: имя берётся из самой регистрации слушателя.
 *
 * Здесь стоял маркер по написанию
 * `navigator.serviceWorker.addEventListener("controllerchange", reloadOnce…)` —
 * то есть и получатель, и имя обработчика прибитые к тексту. Получатель теперь
 * проверяется свойством: слушателя обязан вешать КОНТЕЙНЕР service worker, а не
 * произвольный объект, у которого случайно нашлось событие с таким именем.
 */
let controllerChangeHandlerName = null;
eachNode(mainAst, (node) => {
	if (controllerChangeHandlerName) return;
	if (!ts.isCallExpression(node)) return;
	if (!ts.isPropertyAccessExpression(node.expression)) return;
	if (node.expression.name.text !== "addEventListener") return;
	if (!/(^|\.)serviceWorker$/.test(node.expression.expression.getText(mainAst)))
		return;
	const [eventName, handler] = node.arguments;
	if (!eventName || !ts.isStringLiteral(eventName)) return;
	if (eventName.text !== "controllerchange") return;
	if (handler && ts.isIdentifier(handler))
		controllerChangeHandlerName = handler.text;
});

if (!reloadMarkerBinding) {
	failures.push(
		`Service worker reload marker key "${RELOAD_MARKER_KEY}" must be bound to a constant in ${mainFile}`,
	);
} else if (!controllerChangeHandlerName) {
	failures.push(
		`${mainFile} must register a named handler on the service worker container for the "controllerchange" event`,
	);
} else {
	const handler = resolveFunctionBinding(
		mainAst,
		mainFile,
		mainImports,
		controllerChangeHandlerName,
	);
	if (!handler) {
		failures.push(
			`${mainFile} controllerchange handler ${controllerChangeHandlerName} has no resolvable declaration`,
		);
	} else {
		/*
		 * Запись ищется по СВОЙСТВУ: вызов, которому передан и ключ маркера, и
		 * значение "1". Куда именно он ведёт — прямо в sessionStorage.setItem или в
		 * функцию-обёртку из соседнего модуля — решает разрешение импортов ниже.
		 */
		let writeCall = null;
		eachNode(handler.node, (node) => {
			if (writeCall) return;
			if (!ts.isCallExpression(node)) return;
			const passesKey = node.arguments.some(
				(argument) =>
					(ts.isIdentifier(argument) &&
						argument.text === reloadMarkerBinding) ||
					(ts.isStringLiteral(argument) && argument.text === RELOAD_MARKER_KEY),
			);
			const passesFlag = node.arguments.some(
				(argument) => ts.isStringLiteral(argument) && argument.text === "1",
			);
			if (passesKey && passesFlag) writeCall = node;
		});

		if (!writeCall) {
			failures.push(
				`${mainFile}:${controllerChangeHandlerName} must persist the one-shot reload marker (no call receives both ${reloadMarkerBinding} and "1")`,
			);
		} else {
			const directWrite = storageWriteSite(
				writeCall.expression,
				handler.sourceFile,
				"sessionStorage",
			);
			let resolvedWrite = directWrite;
			let resolvedVia = directWrite ? handler.file : null;

			if (!resolvedWrite && ts.isIdentifier(writeCall.expression)) {
				const wrapper = resolveFunctionBinding(
					handler.sourceFile,
					handler.file,
					valueImportsByLocalName(handler.sourceFile),
					writeCall.expression.text,
				);
				if (wrapper) {
					resolvedWrite = storageWriteSite(
						wrapper.node,
						wrapper.sourceFile,
						"sessionStorage",
					);
					resolvedVia = wrapper.file;
					if (
						!resolvedWrite &&
						storageWriteSite(wrapper.node, wrapper.sourceFile, "localStorage")
					) {
						failures.push(
							`${wrapper.file} writes the reload marker to localStorage; the one-shot marker must die with the tab, so it belongs in sessionStorage`,
						);
					}
				}
			}

			if (!resolvedWrite) {
				failures.push(
					`${mainFile}:${controllerChangeHandlerName} must write the reload marker into sessionStorage (call ${writeCall.expression.getText(handler.sourceFile)} resolves to no sessionStorage.setItem)`,
				);
			} else {
				reloadMarkerWriteSite = `${resolvedVia}: ${resolvedWrite}`;
			}
		}

		/*
		 * СВОЙСТВО «ОДНОКРАТНО», из-за которого обработчик и назывался
		 * reloadOnceAfterServiceWorkerControllerChange. Имя доказывало только само
		 * себя: функция с этим именем могла перезагружать вкладку по кругу, и
		 * сторож бы молчал. А круг здесь настоящий — смена контроллера случается и
		 * ПОСЛЕ перезагрузки, так что без выхода по уже стоящему маркеру вкладка
		 * уходит в бесконечную перезагрузку прямо на рабочем месте клиники.
		 * Доказывается разбором: в обработчике есть `if`, чьё условие читает тот
		 * самый ключ маркера, и чья ветка выходит из функции.
		 */
		let oneShotGuard = null;
		eachNode(handler.node, (node) => {
			if (oneShotGuard) return;
			if (!ts.isIfStatement(node)) return;
			let mentionsMarker = false;
			eachNode(node.expression, (inner) => {
				if (ts.isIdentifier(inner) && inner.text === reloadMarkerBinding)
					mentionsMarker = true;
				if (ts.isStringLiteral(inner) && inner.text === RELOAD_MARKER_KEY)
					mentionsMarker = true;
			});
			if (!mentionsMarker) return;
			let exits = false;
			eachNode(node.thenStatement, (inner) => {
				if (ts.isReturnStatement(inner)) exits = true;
			});
			if (exits) oneShotGuard = node.expression.getText(handler.sourceFile);
		});

		if (!oneShotGuard) {
			failures.push(
				`${mainFile}:${controllerChangeHandlerName} must reload only once per tab (no guard reads ${reloadMarkerBinding} and returns before the reload)`,
			);
		}

		/*
		 * И собственно перезагрузка. Обработчик, который ставит маркер и не
		 * перезагружает страницу, оставляет клинику на старой оболочке НАВСЕГДА:
		 * маркер уже стоит, значит и следующая смена контроллера ничего не сделает.
		 */
		if (!callsLocationReload(handler.node, handler.sourceFile)) {
			failures.push(
				`${mainFile}:${controllerChangeHandlerName} must reload the tab after the service worker controller changes (no location.reload() call)`,
			);
		}
	}
}

/* ------------------------------------------------------------------ *
 * ПРОСЬБА К НОВОМУ SERVICE WORKER АКТИВИРОВАТЬСЯ НЕМЕДЛЕННО.
 *
 * Здесь стояли два маркера по написанию: `function
 * requestDenteServiceWorkerActivation` и `worker?.postMessage({ type:
 * "DENTE_SKIP_WAITING" })`. Вместе они доказывали, что в файле объявлена функция
 * с таким именем и что в нём есть такая строка. Ни один из двух не доказывал
 * главного — что эту просьбу кто-нибудь отправляет: функция, которую никто не
 * зовёт, прошла бы оба маркера, а клиника осталась бы на протухшей оболочке до
 * закрытия последней вкладки.
 *
 * СВОЙСТВО. От обработчика события "statechange", зарегистрированного в main.tsx
 * (его вешают на устанавливающийся worker), по вызовам вниз обязан достигаться
 * postMessage с типом DENTE_SKIP_WAITING. Имя функции-посредника, имя параметра
 * и получатель значения не имеют. Сам тип сообщения остаётся строкой: это
 * контракт между двумя процессами, и его переименование обязано ломать сторож.
 * ------------------------------------------------------------------ */

let stateChangeHandler = null;
eachNode(mainAst, (node) => {
	if (stateChangeHandler) return;
	if (!ts.isCallExpression(node)) return;
	if (!ts.isPropertyAccessExpression(node.expression)) return;
	if (node.expression.name.text !== "addEventListener") return;
	const [eventName, handler] = node.arguments;
	if (!eventName || !ts.isStringLiteral(eventName)) return;
	if (eventName.text !== "statechange") return;
	if (handler) stateChangeHandler = handler;
});

if (!stateChangeHandler) {
	failures.push(
		`${mainFile} must watch the installing service worker for its "statechange" event`,
	);
} else {
	const activationSite = messagePostSite(
		reachableBodies(stateChangeHandler, mainAst, mainFile, mainImports),
		SKIP_WAITING_MESSAGE,
	);
	if (!activationSite) {
		failures.push(
			`${mainFile} must ask the installed service worker to activate at once (no { type: "${SKIP_WAITING_MESSAGE}" } postMessage is reachable from the "statechange" handler)`,
		);
	} else {
		skipWaitingRequestSite = `${mainFile}: ${activationSite}`;
	}
}

/* ------------------------------------------------------------------ *
 * ПРИЧИНА 2. Действие восстановления на границах отказа.
 *
 * Один и тот же разбор гоняется по ДВУМ границам: над ленивым рабочим местом
 * (её хозяин — AppShell.tsx) и над ленивыми разделами внутри рабочего места.
 * Вторую раньше проверяли четырьмя подстроками по файлу
 * apps/web/src/workspaceRouteErrorBoundary.tsx; теперь она находится тем же
 * ходом, что и первая, и проверяется тем же кодом.
 * ------------------------------------------------------------------ */

/**
 * Свойство действия восстановления: у границы есть кликабельное действие, чей
 * обработчик сбрасывает кэш оболочки сообщением к service worker и перезагружает
 * страницу ОТЛОЖЕННО — иначе сообщение не успевает уйти. Ни одно кликабельное
 * действие границы при этом не сводится к голой перезагрузке: она вернула бы ту
 * же протухшую оболочку из кэша, то есть кнопка была бы обманом.
 */
function auditStaleRecoveryAffordance(boundary, label) {
	const boundaryImports = valueImportsByLocalName(boundary.ast);

	const bodiesOf = (handlerNode) =>
		reachableBodies(handlerNode, boundary.ast, boundary.file, boundaryImports);

	function defersReload(bodies) {
		for (const body of bodies) {
			let found = false;
			eachNode(body, (node) => {
				if (found) return;
				if (!ts.isCallExpression(node)) return;
				const callee = node.expression;
				const isTimer =
					(ts.isPropertyAccessExpression(callee) &&
						callee.name.text === "setTimeout") ||
					(ts.isIdentifier(callee) && callee.text === "setTimeout");
				if (!isTimer) return;
				const [task, delay] = node.arguments;
				if (!task || !callsLocationReload(task, boundary.ast)) return;
				if (!delay || !ts.isNumericLiteral(delay)) return;
				const milliseconds = Number(delay.text);
				if (milliseconds > 0 && milliseconds <= MAX_RECOVERY_DEFER_MS)
					found = true;
			});
			if (found) return true;
		}
		return false;
	}

	/** Голая перезагрузка: всё тело обработчика — один вызов location.reload(). */
	function isBareReloadHandler(handlerNode) {
		let body = handlerNode;
		if (
			ts.isArrowFunction(handlerNode) ||
			ts.isFunctionExpression(handlerNode) ||
			ts.isFunctionDeclaration(handlerNode) ||
			ts.isMethodDeclaration(handlerNode)
		)
			body = handlerNode.body;
		if (!body) return false;
		if (ts.isBlock(body)) {
			if (body.statements.length !== 1) return false;
			const [only] = body.statements;
			if (!ts.isExpressionStatement(only)) return false;
			body = only.expression;
		}
		if (!ts.isCallExpression(body)) return false;
		return callsLocationReload(body, boundary.ast);
	}

	const clickHandlers = [];
	eachNode(boundary.ast, (node) => {
		if (!ts.isJsxAttribute(node) || !node.initializer) return;
		if (node.name.getText(boundary.ast) !== "onClick") return;
		if (!ts.isJsxExpression(node.initializer) || !node.initializer.expression)
			return;
		const expression = node.initializer.expression;
		const resolved = ts.isIdentifier(expression)
			? (resolveFunctionBinding(
					boundary.ast,
					boundary.file,
					boundaryImports,
					expression.text,
				)?.node ?? expression)
			: expression;
		clickHandlers.push({ expression, resolved });
	});

	if (clickHandlers.length === 0) {
		failures.push(
			`${boundary.file}:${boundary.className} must offer a clickable stale-chunk recovery action`,
		);
	}

	let recoveryHandler = null;
	for (const handler of clickHandlers) {
		const bodies = bodiesOf(handler.resolved);
		if (
			messagePostSite(bodies, CLEAR_SHELL_CACHE_MESSAGE) &&
			defersReload(bodies)
		) {
			recoveryHandler ??= handler;
		}
		if (isBareReloadHandler(handler.resolved)) {
			failures.push(
				`${boundary.file} must clear the shell cache before a manual stale refresh (onClick handler ${handler.expression.getText(boundary.ast).split("\n")[0]} only reloads)`,
			);
		}
	}

	if (clickHandlers.length > 0 && !recoveryHandler) {
		const bodies = clickHandlers.flatMap((handler) =>
			bodiesOf(handler.resolved),
		);
		const detail = messagePostSite(bodies, CLEAR_SHELL_CACHE_MESSAGE)
			? `cache is cleared but the reload is not deferred by 1..${MAX_RECOVERY_DEFER_MS}ms, so ${CLEAR_SHELL_CACHE_MESSAGE} can be cut off before the service worker receives it`
			: `no handler posts { type: "${CLEAR_SHELL_CACHE_MESSAGE}" } to the service worker`;
		failures.push(
			`${label} stale chunk recovery affordance is broken in ${boundary.file}: ${detail}`,
		);
	}
}

const bootMount = findLazyMountErrorBoundary(shellFile, { specifier: "./App" });
const bootBoundary = bootMount.boundary;

if (!bootBoundary) {
	failures.push(
		`Stale-chunk recovery affordance has no host: no JSX ancestor of <${bootMount.lazyBindingName ?? "?"}> in ${shellFile} resolves to a boot error boundary class`,
	);
} else {
	auditStaleRecoveryAffordance(bootBoundary, "App shell");
}

/* ------------------------------------------------------------------ *
 * Граница разделов рабочего места.
 *
 * Здесь стояли четыре маркера и один запрет по тексту файла
 * apps/web/src/workspaceRouteErrorBoundary.tsx: имя функции обновления, имя той
 * же функции в onClick, точная запись postMessage и точная запись
 * `window.setTimeout(() => window.location.reload(), 50)`. Все пять проверяли
 * НАПИСАНИЕ в НАЗВАННОМ файле — то есть ровно ту конструкцию, из-за которой этот
 * сторож уже краснел 30 июля, когда соседняя граница переехала в другой модуль.
 * Хуже: подстрока проходит и на мёртвом коде, и на строке в комментарии, а запрет
 * голой перезагрузки был прибит к одному написанию `onClick={() =>
 * window.location.reload()}` — любое другое написание того же дефекта проходило.
 *
 * Теперь граница НАХОДИТСЯ разбором, и ни одного имени в этом пути нет: от
 * ленивого рабочего места в AppShell.tsx берётся сам модуль рабочего места, в нём
 * — ЛЮБАЯ ленивая привязка раздела, от её монтажа вверх по предкам JSX ищется
 * класс с обоими обработчиками React. Проверяется он тем же кодом, что и граница
 * загрузки: разные границы одного продукта обязаны доказывать одно и то же.
 * ------------------------------------------------------------------ */

const workspaceFile = resolveRelativeModule(shellFile, "./App");
let routeBoundary = null;

if (!workspaceFile) {
	failures.push(
		`${shellFile} must lazy-load a workspace module for the route error boundary to live in`,
	);
} else {
	const routeMount = findLazyMountErrorBoundary(workspaceFile);
	routeBoundary = routeMount.boundary;
	if (!routeBoundary) {
		failures.push(
			`Workspace route stale-chunk recovery affordance has no host: no JSX ancestor of a lazily imported section in ${workspaceFile} resolves to an error boundary class`,
		);
	} else {
		auditStaleRecoveryAffordance(routeBoundary, "Workspace route");
	}
}

if (
	packageJson.scripts?.["smoke:app-update-recovery-source"] !==
	"node scripts/smoke-app-update-recovery-source.mjs"
) {
	failures.push("package.json missing smoke:app-update-recovery-source");
}

if (
	packageJson.scripts?.["smoke:web-service-worker-runtime"] !==
	"node scripts/smoke-web-service-worker-runtime.mjs"
) {
	failures.push("package.json missing smoke:web-service-worker-runtime");
}

/*
 * Сторож копит отказы и печатает их все. Раньше он бросал на первом же, и потому
 * 30 июля показал ровно одну из пяти сломанных проверок: остальные четыре стали
 * видны только после починки первой. Для сторожа, который не входит ни в lint, ни
 * в CI, это означало ещё один заход вслепую на каждый скрытый отказ.
 */
if (failures.length > 0) {
	console.error("App update recovery source smoke failed:");
	for (const item of failures) console.error(`- ${item}`);
	process.exit(1);
}

console.log({
	ok: true,
	serviceWorkerContract: true,
	// Не константы: печатается то, что сторож реально разрешил по дереву и импортам.
	// Переезд записи маркера или границы отказа будет виден прямо в логе гейта.
	reloadMarkerPersistedAt: reloadMarkerWriteSite,
	skipWaitingRequestedAt: skipWaitingRequestSite,
	bootStaleRecoveryHost: `${bootBoundary.file}:${bootBoundary.className}`,
	workspaceRouteStaleRecoveryHost: `${routeBoundary.file}:${routeBoundary.className}`,
});
