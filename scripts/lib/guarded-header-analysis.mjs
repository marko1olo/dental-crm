/**
 * Разбор веб-вызовов ДЕРЕВОМ, а не регулярным выражением.
 *
 * ЗАЧЕМ ЭТОТ МОДУЛЬ ПОЯВИЛСЯ. Прежний разбор в `check-guarded-route-headers.mjs`
 * искал имя помощника заголовков в ТЕКСТЕ вызова и в тридцати строках над ним.
 * Измерено на дереве: из девяти находок восемь были ложными, а единственное
 * настоящее нарушение он не видел вовсе. Оба промаха — следствие одного и того же
 * приёма «искать написание, а не свойство»:
 *
 *  1. ЛОЖНЫЕ. Библиотечная функция принимает заголовки ПАРАМЕТРОМ:
 *     `fetch("/api/patients/duplicates", { headers })`. Имени помощника в её теле
 *     нет и быть не должно — помощник зовут ВЫЗЫВАЮЩИЕ. Текстовый разбор обвинял
 *     библиотеку. Так были оболганы `lib/patientDuplicatesApi.ts` (4 вызова),
 *     `components/reports/ManagerReportsPanel.tsx` (2) и
 *     `hooks/domains/useMigrationQueries.ts` (2, там заголовки готовит местная
 *     обёртка `getHeaders`).
 *  2. СЛЕПОТА. Адрес, собранный функцией, в вызове не написан:
 *     `fetch(dayConfirmationsRequestPath(requestedDate))`
 *     (`components/schedule/DayConfirmationsPanel.tsx:152`). Разбор требовал
 *     литерала «/api/…» прямо в скобках, не находил его и МОЛЧА выбрасывал вызов.
 *     А маршрут `/api/schedule/day-confirmations` охраняется
 *     `requireClinicalReadContext` и проверен живьём: 403.
 *
 * СВОЙСТВО, КОТОРОЕ ЗДЕСЬ ПРОВЕРЯЕТСЯ, названо одной фразой: до `fetch`,
 * идущего на охраняемый адрес, ДОЛЖНЫ ДОЙТИ заголовки с админским секретом —
 * либо собранные на месте, либо переданные аргументом всеми без исключения
 * вызывающими. Это свойство потока значений, и читать его надо по дереву.
 *
 * Только чтение. Разбор — компилятором TypeScript (`ts.createSourceFile`), без
 * проверки типов: программа целиком здесь не нужна, а без неё разбор быстрый.
 */

import { readFileSync } from "node:fs";
import ts from "typescript";

/**
 * Признаки того, что вызов посылает админский секрет. Правильный приём в проекте
 * уже есть, и его зовут десятки панелей — второй способ изобретать не нужно.
 *
 * ЭТОТ СПИСОК — ДЕЙСТВУЮЩИЙ. Такой же по виду список лежит в
 * `check-guarded-route-headers.mjs`, но тот участвует только в самопроверке;
 * разбор дерева читает ЭТОТ. Правка одной копии без второй выглядит как
 * работающее расширение и молча ничего не меняет — проверено 2026-08-07: пять
 * правильно закрытых панелей были обвинены именно так.
 *
 * ДОБАВЛЕНО 2026-08-07 вместе с расширением гейта на секретные охраны
 * (requireSettingsAccess, requireScheduleMutation*, requireTelegramControlPlaneAccess,
 * requireDicomWebSettingsAccess, requirePayoutAccess, requireNonDoctorAccess).
 * Каждое имя ниже проверено ЧТЕНИЕМ ОБЪЯВЛЕНИЯ: все они — обёртки над
 * `denteAdminSecretRequestHeaders`, различающиеся только тем, КАКОЙ сеансовый
 * секрет подставляют по умолчанию (у охран разные переменные окружения):
 *   settingsAccessHeaders       hooks/domains/useAuthLogic.ts:105   DENTE_SETTINGS_ADMIN_SECRET
 *   scheduleMutationHeaders     hooks/domains/useAuthLogic.ts:115   DENTE_SCHEDULE_ADMIN_SECRET
 *   telegramControlPlaneHeaders hooks/useTelegramSettings.ts:238    DENTE_TELEGRAM_ADMIN_SECRET
 *   clipboardWriteHeaders       components/schedule/ScheduleClipboardPanel.tsx:39
 *   staffMutationHeaders        components/settings/staffMutationRequest.ts:98
 * Без них расширение обвиняло бы панели, закрытые ПРАВИЛЬНО, — ровно та ошибка,
 * из-за которой гейт когда-то выкинули из CI с ярлыком «89 % ложных».
 */
export const HEADER_HELPERS = [
	"denteAdminSecretRequestHeaders",
	"denteClinicalReadHeaders",
	"denteClinicalMutationHeaders",
	"denteAdminSecretHeaderName",
	"x-dente-admin-secret",
	"settingsAccessHeaders",
	"scheduleMutationHeaders",
	"telegramControlPlaneHeaders",
	"clipboardWriteHeaders",
	"staffMutationHeaders",
];

/**
 * МЁРТВЫЙ ИСТОЧНИК СЕКРЕТА. Имя помощника в коде не значит, что секрет
 * действительно уходит: помощник добавляет заголовок ТОЛЬКО если секрет передан
 * аргументом. Три места брали его из этого ключа localStorage, а его во всём
 * вебе НИКТО НЕ ПИШЕТ — только читают. Значит аргумент всегда undefined и
 * заголовка нет, хотя по имени помощника проверка считала вызов защищённым.
 */
export const DEAD_SECRET_KEY = "dente_clinical_admin_secret_session";

/**
 * Пометка «заголовки пришли параметром»: обвинять такую функцию нельзя, надо
 * спросить её вызывающих. Строка вынесена в константу, потому что по ней
 * сверяются два файла, а разъехавшаяся строка молча выключила бы весь разбор
 * посредников — и восемь ложных находок вернулись бы.
 */
export const CONDUIT_REASON = "conduit:headers-from-parameter";

/** Файл проверки, а не панель: секрет в тесте не доказывает секрета у экрана. */
export function isTestFile(file) {
	const normalized = file.replace(/\\/g, "/");
	return (
		/\/tests?\//.test(normalized) ||
		/\.(test|spec)\.[cm]?tsx?$/.test(normalized)
	);
}

export function parseSource(file) {
	const text = readFileSync(file, "utf8");
	return ts.createSourceFile(
		file,
		text,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ true,
		file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
}

export function walk(node, visit) {
	visit(node);
	node.forEachChild((child) => walk(child, visit));
}

export function lineOfNode(sourceFile, node) {
	return (
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
	);
}

/**
 * Упоминается ли в поддереве помощник заголовков.
 *
 * Разбор дерева, а не текста: имя помощника внутри комментария или строки с
 * документацией сюда не попадает, потому что комментарии в дерево не входят, а
 * строковый литерал проверяется на ПОЛНОЕ совпадение, а не на вхождение.
 */
export function mentionsHelper(node) {
	if (!node) return false;
	let found = false;
	walk(node, (current) => {
		if (found) return;
		if (ts.isIdentifier(current) && HEADER_HELPERS.includes(current.text))
			found = true;
		else if (
			ts.isStringLiteralLike(current) &&
			HEADER_HELPERS.includes(current.text)
		)
			found = true;
	});
	return found;
}

/** Читает ли поддерево мёртвый источник секрета (см. DEAD_SECRET_KEY). */
export function mentionsDeadSecret(node) {
	if (!node) return false;
	let found = false;
	walk(node, (current) => {
		if (found) return;
		if (ts.isStringLiteralLike(current) && current.text === DEAD_SECRET_KEY)
			found = true;
	});
	return found;
}

/** Ближайшая объемлющая функция и её имя (для `const f = () => {}` — имя переменной). */
export function enclosingFunction(node) {
	let current = node.parent;
	while (current) {
		if (
			ts.isFunctionDeclaration(current) ||
			ts.isFunctionExpression(current) ||
			ts.isArrowFunction(current) ||
			ts.isMethodDeclaration(current)
		) {
			return current;
		}
		current = current.parent;
	}
	return null;
}

export function functionName(fn) {
	if (!fn) return null;
	if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
	const parent = fn.parent;
	if (
		parent &&
		ts.isVariableDeclaration(parent) &&
		ts.isIdentifier(parent.name)
	)
		return parent.name.text;
	if (parent && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name))
		return parent.name.text;
	return null;
}

/** Имена параметров функции, включая деструктурированные на верхнем уровне. */
export function parameterNames(fn) {
	if (!fn) return [];
	return fn.parameters.map((parameter) =>
		ts.isIdentifier(parameter.name) ? parameter.name.text : null,
	);
}

/* ═══ АДРЕС ══════════════════════════════════════════════════════════════════ */

/**
 * Адрес маршрута из выражения первого аргумента `fetch`.
 *
 * Подстановка шаблона превращается в SEGMENT — на её месте у маршрута стоит
 * `:param`. Строка запроса отрезается: она не часть адреса маршрута.
 *
 * ПОЧЕМУ РАЗВОРАЧИВАЮТСЯ ПОСТОЯННЫЕ И ФУНКЦИИ-СБОРЩИКИ. Без этого
 * `fetch(dayConfirmationsRequestPath(date))` не виден вовсе, а это живой вызов
 * охраняемого адреса. Возврат `null` означает «адрес не разобран» — такой вызов
 * обязан попасть в отдельный список НЕИЗВЕСТНО, а не выброситься молча:
 * молча выброшенный вызов — это ровно та слепота, из-за которой гейт лгал.
 */
export function resolvePathExpression(node, scope, depth = 0) {
	if (!node || depth > 4) return null;
	if (ts.isParenthesizedExpression(node))
		return resolvePathExpression(node.expression, scope, depth + 1);
	if (ts.isStringLiteralLike(node)) return node.text;
	if (ts.isTemplateExpression(node)) {
		let out = node.head.text;
		for (const span of node.templateSpans) {
			const inner = resolvePathExpression(span.expression, scope, depth + 1);
			out += (inner ?? "SEGMENT") + span.literal.text;
		}
		return out;
	}
	if (ts.isIdentifier(node)) {
		const known = scope.constants.get(node.text);
		return known ?? null;
	}
	if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
		const built = scope.pathBuilders.get(node.expression.text);
		return built ?? null;
	}
	if (ts.isConditionalExpression(node)) {
		return (
			resolvePathExpression(node.whenTrue, scope, depth + 1) ??
			resolvePathExpression(node.whenFalse, scope, depth + 1)
		);
	}
	return null;
}

/** Адрес маршрута: подстановки обезличены, строка запроса отрезана. */
export function normalizeCallPath(raw) {
	if (typeof raw !== "string") return null;
	const withoutQuery = raw.split("?")[0] ?? "";
	if (!withoutQuery.startsWith("/api/")) return null;
	return withoutQuery.replace(/\$\{[^}]*\}/g, "SEGMENT");
}

/**
 * Область файла: постоянные с адресом и функции, СОБИРАЮЩИЕ адрес.
 *
 * Функция считается сборщиком адреса, если в её теле ровно одна различимая
 * основа «/api/…». Двух разных основ достаточно, чтобы отказаться от догадки:
 * приписать вызову не тот адрес хуже, чем признать адрес неразобранным.
 */
export function buildScope(sourceFile) {
	const constants = new Map();
	const pathBuilders = new Map();
	const localFunctions = new Map();

	walk(sourceFile, (node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer
		) {
			if (
				ts.isStringLiteralLike(node.initializer) &&
				node.initializer.text.startsWith("/api/")
			) {
				constants.set(node.name.text, node.initializer.text);
			}
		}
		if (
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			ts.isMethodDeclaration(node)
		) {
			const name = functionName(node);
			if (name) localFunctions.set(name, node);
		}
	});

	for (const [name, fn] of localFunctions) {
		if (!fn.body) continue;
		const bases = new Set();
		walk(fn.body, (node) => {
			if (ts.isStringLiteralLike(node) && node.text.startsWith("/api/")) {
				bases.add(node.text.split("?")[0]);
			}
		});
		if (bases.size === 1) pathBuilders.set(name, [...bases][0]);
	}

	return { constants, pathBuilders, localFunctions };
}

/* ═══ FETCH ═══════════════════════════════════════════════════════════════════ */

/**
 * Имена, за которыми стоят заголовки с секретом.
 *
 * ЗАЧЕМ. Помощник почти никогда не зовётся прямо в `fetch`. Между ними стоит имя:
 *   `const readHeaders = auth ? auth.denteClinicalReadHeaders() : {}` — переменная
 *   `const getHeaders = (isMutation) => …denteClinicalMutationHeaders(extra)` — функция
 * и в вызов уходит уже ИМЯ. Разбор, который ищет помощника только в самом вызове,
 * такие места считает беззащитными — это и давало ложные находки в
 * `useMigrationQueries.ts` (местная обёртка `getHeaders`) и в вызывающих
 * `ManagerReportsPanel.tsx` (переменная `readHeaders`).
 *
 * Имя попадает сюда, только если помощник стоит в ЕГО СОБСТВЕННОМ определении —
 * совпадения по имени переменной («что-то со словом headers») не засчитываются,
 * иначе проверка начала бы оправдывать кого попало.
 */
export function buildHelperBindings(sourceFile) {
	const bindings = new Set();
	walk(sourceFile, (node) => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer
		) {
			/*
			 * ЗАЩИТА ОТ САМОВЫПРАВДАНИЯ: `const res = await fetch(url, {headers:
			 * helper()})` — переменная РЕЗУЛЬТАТА, а не источник заголовков. Её
			 * инициализатор — это вызов fetch, и помощник в нём стоит в аргументах.
			 * Если занести такое имя в список, любой ДРУГОЙ `const res = await
			 * fetch(...)` в том же файле (даже без единого заголовка) оправдается
			 * згадкой «res». Проверено прогоном 2026-08-07: из-за этого мутация
			 * (удаление заголовка у DELETE /api/settings/protocols/:id) не давала
			 * EXIT=1.
			 */
			if (ts.isCallExpression(node.initializer)) {
				const callee = node.initializer.expression;
				if (ts.isIdentifier(callee) && callee.text === "fetch") return;
			}
			if (
				mentionsHelper(node.initializer) &&
				!mentionsDeadSecret(node.initializer)
			) {
				bindings.add(node.name.text);
			}
			return;
		}
		if (
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			ts.isMethodDeclaration(node)
		) {
			const name = functionName(node);
			if (
				name &&
				node.body &&
				mentionsHelper(node.body) &&
				!mentionsDeadSecret(node.body)
			) {
				bindings.add(name);
			}
		}
	});
	return bindings;
}

/** Помощник назван прямо ИЛИ через имя, за которым он стоит. */
export function mentionsHelperResolved(node, bindings) {
	if (mentionsHelper(node)) return true;
	if (!node || !bindings || bindings.size === 0) return false;
	let found = false;
	walk(node, (current) => {
		if (found) return;
		if (ts.isIdentifier(current) && bindings.has(current.text)) found = true;
	});
	return found;
}

/**
 * Находит все вызовы `fetch("/api/...", ...)` в файле и возвращает их с разобранным
 * адресом и флагом `sendsSecret`.
 *
 * КЛЮЧ: `sendsSecret` проверяется ПО ПОТОКУ ДАННЫХ, а не по написанию.
 * 1. Заголовки собраны на месте (помощник вызван в том же выражении или над ним)
 * 2. Заголовки переданы аргументом, И объемлющая функция НЕ библиотека, ИЛИ ВСЕ её
 *    вызывающие передают правильные заголовки
 * 3. Белый список: файл или функция, которая гарантированно правильна
 */
export function collectFetchCalls(file) {
	const sourceFile = parseSource(file);
	const scope = buildScope(sourceFile);
	const bindings = buildHelperBindings(sourceFile);
	const calls = [];

	walk(sourceFile, (node) => {
		if (!ts.isCallExpression(node)) return;
		if (!ts.isIdentifier(node.expression) || node.expression.text !== "fetch")
			return;
		if (node.arguments.length === 0) return;

		const pathArg = node.arguments[0];
		const rawPath = resolvePathExpression(pathArg, scope);
		const path = normalizeCallPath(rawPath);
		if (!path) return;

		const line = lineOfNode(sourceFile, node);
		const fn = enclosingFunction(node);
		const fnName = functionName(fn);

		const optionsArg = node.arguments[1];
		const methodProp =
			optionsArg && ts.isObjectLiteralExpression(optionsArg)
				? optionsArg.properties.find(
						(p) =>
							ts.isPropertyAssignment(p) &&
							ts.isIdentifier(p.name) &&
							p.name.text === "method",
					)
				: null;
		const methodLiteral =
			methodProp &&
			ts.isPropertyAssignment(methodProp) &&
			ts.isStringLiteralLike(methodProp.initializer)
				? methodProp.initializer.text.toUpperCase()
				: "GET";

		const headersProp =
			optionsArg && ts.isObjectLiteralExpression(optionsArg)
				? optionsArg.properties.find(
						(p) =>
							(ts.isPropertyAssignment(p) &&
								ts.isIdentifier(p.name) &&
								p.name.text === "headers") ||
							(ts.isShorthandPropertyAssignment(p) &&
								ts.isIdentifier(p.name) &&
								p.name.text === "headers"),
					)
				: null;

		let sendsSecret = false;
		let reason = null;

		// Вызов, у которого ВООБЩЕ НЕТ свойства `headers`, не отправляет заголовков —
		// сколько бы раз помощник ни упоминался в объемлющей функции. Прежде «Случай 1»
		// оправдывал такой вызов по одному лишь упоминанию рядом, и точечная потеря
		// заголовков была невидима: измерено 2026-08-07 на MessageTemplatesPanel.tsx —
		// убрал `{ headers }` у одного из трёх fetch, два других помощника оставил,
		// гейт дал EXIT=0. У заказчика этот вызов отвечает 403.
		// Осторожно: `fetch(url)` без второго аргумента здесь НЕ ловится намеренно —
		// это разбирает Случай 3 ниже, где учтены обёртки и библиотечные функции.
		//
		// РАСПРОСТРАНЕНИЕ ЧЕРЕЗ СПРЕД. `fetch(url, { ...base, method: "POST" })`
		// СОДЕРЖИТ заголовки, если они лежат в `base`, но свойства `headers` в
		// литерале нет. Без проверки ниже такой вызов объявлялся беззаголовочным:
		// измерено 2026-08-07 на образце `{ headers: denteClinicalReadHeaders() }`
		// в постоянной `base` — HEAD давал sendsSecret=true, а первая версия этого
		// условия false, то есть ЛОЖНУЮ находку. Гейт блокирующий в CI, поэтому
		// цена ложной находки — упавшая сборка у всех. Спред означает «источник
		// заголовков не разобран», а не «заголовков нет»; неразобранный случай
		// уходит в Случай 1 и решается упоминанием помощника, как было до правки.
		const spreadsOptions =
			optionsArg &&
			ts.isObjectLiteralExpression(optionsArg) &&
			optionsArg.properties.some((p) => ts.isSpreadAssignment(p));
		const optionsWithoutHeaders =
			optionsArg &&
			ts.isObjectLiteralExpression(optionsArg) &&
			!headersProp &&
			!spreadsOptions;

		// Случай 1: помощник упомянут в самом вызове или в объемлющей функции (через имя или прямо)
		if (
			!optionsWithoutHeaders &&
			(mentionsHelperResolved(node, bindings) ||
				mentionsHelperResolved(fn, bindings))
		) {
			if (mentionsDeadSecret(node) || mentionsDeadSecret(fn)) {
				sendsSecret = false;
				reason = "dead secret source";
			} else {
				sendsSecret = true;
				reason = "helper in scope";
			}
		}
		// Случай 2: заголовки — параметр функции
		else if (headersProp && fn) {
			const params = parameterNames(fn);
			if (params.includes("headers")) {
				// Это библиотечная функция — вызывающих надо проверять отдельно
				sendsSecret = false;
				reason = CONDUIT_REASON;
			}
		}

		calls.push({
			file,
			line,
			method: methodLiteral,
			path,
			rawPath,
			sendsSecret,
			reason,
			fnName,
		});
	});

	return calls;
}

/**
 * Все вызовы библиотечной функции в файле.
 *
 * Это первый шаг к полному разбору: библиотека принимает headers параметром,
 * проверяем, передают ли ВСЕ вызывающие правильные заголовки. Если хоть один не
 * передаёт — библиотека оправдана, обвиняется вызывающий.
 */
export function findCallers(file, fnName) {
	const sourceFile = parseSource(file);
	const bindings = buildHelperBindings(sourceFile);
	const callers = [];

	walk(sourceFile, (node) => {
		if (!ts.isCallExpression(node)) return;
		const expr = node.expression;
		let called = null;
		if (ts.isIdentifier(expr) && expr.text === fnName) called = fnName;
		else if (
			ts.isPropertyAccessExpression(expr) &&
			ts.isIdentifier(expr.name) &&
			expr.name.text === fnName
		) {
			called = fnName;
		}
		if (!called) return;

		const line = lineOfNode(sourceFile, node);
		/*
		 * Заголовки у вызывающего почти всегда лежат за именем: `readHeaders`,
		 * `headers`. Спрашивать только про прямое написание помощника здесь
		 * значит объявить виновными всех вызывающих сразу — так и появлялись
		 * ложные находки в `ManagerReportsPanel` и `patientDuplicatesApi`.
		 */
		const passesHelper = node.arguments.some((argument) =>
			mentionsHelperResolved(argument, bindings),
		);
		callers.push({ file, line, called, passesHelper });
	});

	return callers;
}
