import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * ГРАНИЦА ПЕРЕМЕННОЙ `DENTAL_STATE_PERSISTENCE`. Объявление и сторож.
 *
 * ═══ ГРАНИЦА, ОДНОЙ ФРАЗОЙ ═══
 *
 * `DENTAL_STATE_PERSISTENCE=off` относится ТОЛЬКО к файловому снимку состояния
 * (`apps/api/src/persistentState.ts` — `.data/dental-crm-state.json` и его
 * резервные копии). Для слоя доступа к PostgreSQL (`apps/api/src/db/**`) этот
 * флаг НЕ ОБЪЯВЛЕН: девять модулей его читают, восемнадцать ходят в базу всегда,
 * и это НЕ дефект восемнадцати.
 *
 * ═══ ПОЧЕМУ ГРАНИЦУ ПРИШЛОСЬ ОБЪЯВЛЯТЬ ЗАДНИМ ЧИСЛОМ ═══
 *
 * Переменная перегружена двумя смыслами, из которых объявлен один.
 *
 *   1. ОБЪЯВЛЕННЫЙ. `persistentState.ts:80-82`, `persistenceEnabled()` =
 *      флаг !== "off". Задокументирован в `README.md:36-39`, раздел
 *      «Prototype persistence», где подлежащее всего абзаца — файл состояния, а
 *      последняя строка прямо говорит, что к тенантной базе PostgreSQL этот
 *      механизм отношения не имеет. Этот смысл исполняется на 100 %.
 *
 *   2. НЕОБЪЯВЛЕННЫЙ. «Не ходить в PostgreSQL, отвечать из `sampleData.ts`».
 *      Его приписали той же переменной девять модулей `db/**`, скопировав
 *      предикат `useInMemory()` девять раз, без владельца. Этого смысла нет ни в
 *      README, ни в `.env.example`, ни в конституции `.agents/AGENTS.md`
 *      (проверено: ноль упоминаний в каждом). Требовать согласованности было
 *      негде — поэтому её и не было годами.
 *
 * Полный разбор с числами, тремя путями и ценой каждого:
 * `.agents/lead/recon-persistence-flag-half-respected.md`.
 *
 * ═══ ЧТО ОХРАНЯЕТСЯ, И ПОЧЕМУ НЕ ТО, ЧТО КАЖЕТСЯ ═══
 *
 * Наивный сторож «в каждом модуле `db/**` должен быть `useInMemory()`» краснел бы
 * на восемнадцати модулях, устроенных ПРАВИЛЬНО, и его выключили бы в первый
 * день. Охраняется другое событие, и оно измерено на живом дереве:
 *
 *   МОДУЛЬ, ИГНОРИРУЮЩИЙ ФЛАГ, ПОПАДАЕТ В МАРШРУТ, КОТОРЫЙ УЖЕ ОТДАЁТ ДАННЫЕ
 *   ИЗ МОДУЛЯ, УВАЖАЮЩЕГО ФЛАГ.
 *
 * Там `=off` рождает раздвоенный ответ: охранник читает ПАМЯТЬ и пропускает, а
 * данные приходят из БАЗЫ, где их нет. Замер (`app.inject`, живой исходник, один
 * токен кабинета организации `4a3420d1-…`, флаг `off`):
 *
 *   GET /api/patients                         -> 200, три строки из памяти
 *   GET /api/documents/<фикстура>/html        -> 404 «Документ не найден»
 *   GET /api/patients/<фикстура>/reclamations -> 200 и ПУСТОЙ СПИСОК
 *
 * Третья строка хуже второй. `routes/patients.ts:583` сначала зовёт
 * `getPatientByIdFromDb` (флаг уважает, находит карту в памяти), затем
 * `getPatientReclamationsFromDb` (флаг игнорирует, читает базу, где этого
 * пациента нет) и отдаёт 200 с пустым списком. Собственный комментарий этого
 * маршрута на строках 592-593 объясняет, зачем там охранник: «Пустой список на
 * несуществующей карте врач прочитает как „осложнений не было“». Ровно это и
 * происходит — карта настоящая, а ответ «осложнений нет» ложь. 404 честен;
 * 200 с пустым списком в медкарте — тихий ложный отрицательный результат, и
 * охранник, поставленный против него, его пропускает, потому что два смысла
 * одной переменной столкнулись внутри ОДНОГО запроса.
 *
 * ═══ ПОЧЕМУ РАЗБОР ДЕРЕВА, А НЕ ПОИСК ПОДСТРОКИ ═══
 *
 * Имя `DENTAL_STATE_PERSISTENCE` встречается в этом дереве в трёх ролях, и только
 * одна из них — чтение флага:
 *
 *   * чтение:  `process.env.DENTAL_STATE_PERSISTENCE === "off"`;
 *   * ТЕКСТ ОТКАЗА ДЛЯ ОПЕРАТОРА: `settingsQuery.ts:306`,
 *     `pricelistQuery.ts:234`, `protocolTemplateQuery.ts:76`,
 *     `staffAuthorityQuery.ts:78` — строковые литералы вида «хранение отключено
 *     (DENTAL_STATE_PERSISTENCE=off), ставки живут только в базе»;
 *   * ОБЪЯСНЕНИЕ В КОММЕНТАРИИ: `dashboardQuery.ts:16`,
 *     `pricelistQuery.ts:228`, `protocolTemplateQuery.ts:70`,
 *     `staffAuthorityQuery.ts:70`.
 *
 * Поиск подстроки объявил бы «уважающими» модули по тексту сообщения об отказе и
 * по объяснению того, как режим работает, — то есть наказал бы за документацию и
 * посчитал бы уважение там, где его нет. Разбор дерева видит только обращение
 * `process.env.X`; строки и комментарии для него не существуют по построению, и
 * это проверено самопроверкой ниже на фикстурах, а не заявлено.
 *
 * ═══ ЧЕГО ЭТОТ СТОРОЖ НЕ УМЕЕТ, ЧЕСТНО ═══
 *
 *   * Смешение видится на уровне МОДУЛЯ, а не обработчика. Маршрутный файл, где
 *     уважающий и игнорирующий модули используются в РАЗНЫХ, не пересекающихся
 *     обработчиках, тоже попадёт в смешанные. Ложной тревоги на верном коде это
 *     не даёт только потому, что всё сегодняшнее множество объявлено долгом
 *     целиком; при переводе сценариев на живую базу список сокращают вручную и с
 *     причиной.
 *   * Модуль `db/**`, вызванный НЕ из `routes/**` (например, из планировщика или
 *     из брокера WebSocket), в переписи смешения не участвует.
 *   * Косвенный импорт не отслеживается: если маршрут зовёт помощника, а тот
 *     импортирует игнорирующий модуль, смешение не будет найдено. Сегодня все
 *     двенадцать смешений прямые.
 *   * Вид гейта определяется по наличию `throw` в ветке `then`. Отказ, отданный
 *     через `reply.code(503)` внутри слоя доступа, будет назван «памятью».
 */

const apiSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbDir = path.join(apiSrc, "db");
const routesDir = path.join(apiSrc, "routes");

/* ------------------------------------------------------------------ *
 * Обход и разбор
 * ------------------------------------------------------------------ */

/**
 * Все `.ts` каталога РЕКУРСИВНО, кроме `*.test.ts`.
 *
 * Маска по имени (`*Query.ts`) здесь была бы дефектом, а не упрощением: в
 * `db/**` флаг читают `domainStateHydration.ts`, а хранилища не касаются
 * `schema.ts`, `patientsSchema.ts`, `communicationsSchema.ts`,
 * `visitsProjection.ts`, `moneyTypeParsers.ts` и сам `client.ts`. Тот же обход по
 * маске уже ломал перепись в `noFabricatedDataFallback.test.ts`.
 */
function sourceFiles(root: string): string[] {
	const found: string[] = [];
	const walk = (dir: string, prefix: string): void => {
		const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
		for (const entry of entries) {
			const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				walk(path.join(dir, entry.name), relative);
				continue;
			}
			if (!entry.name.endsWith(".ts")) continue;
			if (entry.name.endsWith(".test.ts")) continue;
			found.push(relative);
		}
	};
	walk(root, "");
	return found;
}

function parse(file: string, source: string): ts.SourceFile {
	return ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ true,
		ts.ScriptKind.TS,
	);
}

/** Обращение `<что-то>.env.DENTAL_STATE_PERSISTENCE`. Строка и комментарий сюда не попадают. */
function isFlagAccess(node: ts.Node): boolean {
	return (
		ts.isPropertyAccessExpression(node) &&
		node.name.text === "DENTAL_STATE_PERSISTENCE" &&
		ts.isPropertyAccessExpression(node.expression) &&
		node.expression.name.text === "env"
	);
}

function subtreeHas(root: ts.Node, matches: (node: ts.Node) => boolean): boolean {
	let found = false;
	const visit = (current: ts.Node): void => {
		if (found) return;
		if (matches(current)) {
			found = true;
			return;
		}
		ts.forEachChild(current, visit);
	};
	visit(root);
	return found;
}

function isFunctionLike(node: ts.Node): boolean {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node)
	);
}

/** Узел в теле блока, БЕЗ захода во вложенные функции: `throw` из колбэка гейтом не управляет. */
function ownHas(root: ts.Node, matches: (node: ts.Node) => boolean): boolean {
	let found = false;
	const visit = (current: ts.Node): void => {
		if (found) return;
		if (matches(current)) {
			found = true;
			return;
		}
		if (isFunctionLike(current)) return;
		ts.forEachChild(current, visit);
	};
	ts.forEachChild(root, visit);
	return found;
}

/** Что делает модуль при `=off`: отказывает или отвечает из памяти. */
type GateKind = "отказ" | "память";

type ModuleScan = {
	/** Читает ли флаг ИЗ КОДА. */
	readsFlag: boolean;
	/** Импортирует ли пул `db/client.js`, то есть ходит ли в PostgreSQL. */
	touchesDatabase: boolean;
	/** Виды всех найденных гейтов, без повторов, отсортированы. */
	kinds: GateKind[];
	/** Сколько гейтов найдено. Мера охвата: нужна датчику вырождения. */
	gates: number;
	/** Спецификаторы всех импортов — статических И динамических. */
	specifiers: string[];
	/** Спецификаторы, пришедшие ТОЛЬКО через `await import(...)`. */
	dynamicSpecifiers: string[];
};

export function scanModule(file: string, source: string): ModuleScan {
	const parsed = parse(file, source);

	/*
	 * Локальный предикат флага. Признаётся ТОЛЬКО функция, чьё тело — один
	 * `return <выражение с обращением к флагу>` (или краткое тело стрелки).
	 *
	 * Требование «ровно один return» здесь по делу, а не для красоты: без него
	 * предикатом объявлялась любая функция, в теле которой где-то встретилось
	 * обращение к флагу, — и `grantStaffAuthorityInDb` из `staffAuthorityQuery.ts`
	 * (145 строк, флаг в первой) попадала в список предикатов. Замерено. Дальше
	 * любой `if (grantStaffAuthorityInDb(...))` был бы прочитан как гейт флага.
	 */
	const predicates = new Set<string>();
	const isPredicateBody = (body: ts.Node | undefined): boolean => {
		if (body === undefined) return false;
		if (!ts.isBlock(body)) return subtreeHas(body, isFlagAccess);
		const only = body.statements.length === 1 ? body.statements[0] : undefined;
		return only !== undefined && ts.isReturnStatement(only) && subtreeHas(only, isFlagAccess);
	};
	const collectPredicates = (node: ts.Node): void => {
		if (ts.isFunctionDeclaration(node) && node.name && isPredicateBody(node.body)) {
			predicates.add(node.name.text);
		}
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			(ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
			isPredicateBody(node.initializer.body)
		) {
			predicates.add(node.name.text);
		}
		ts.forEachChild(node, collectPredicates);
	};
	ts.forEachChild(parsed, collectPredicates);

	const isGateCondition = (condition: ts.Node): boolean =>
		subtreeHas(
			condition,
			(node) =>
				isFlagAccess(node) ||
				(ts.isCallExpression(node) &&
					ts.isIdentifier(node.expression) &&
					predicates.has(node.expression.text)),
		);

	const kinds = new Set<GateKind>();
	let gates = 0;
	const specifiers: string[] = [];
	const dynamicSpecifiers: string[] = [];

	const visit = (node: ts.Node): void => {
		if (ts.isIfStatement(node) && isGateCondition(node.expression)) {
			gates += 1;
			const branch = node.thenStatement;
			const refuses =
				ts.isThrowStatement(branch) || (ts.isBlock(branch) && ownHas(branch, ts.isThrowStatement));
			kinds.add(refuses ? "отказ" : "память");
		}
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			specifiers.push(node.moduleSpecifier.text);
		}
		/*
		 * ДИНАМИЧЕСКИЙ import ОБЯЗАТЕЛЕН, И ЭТО НЕ ПОЛНОТА РАДИ ПОЛНОТЫ.
		 * В `routes/patients.ts` ВСЕ ТРИ игнорирующих модуля приходят ТОЛЬКО через
		 * `await import(...)`: `patientReclamationsQuery` (строки 597, 648, 687, 721),
		 * `patientTaskTicketsQuery` (770, 832, 872, 906),
		 * `patientArchiveReasonsAndBlacklistsQuery` (940). Сканер, читающий только
		 * статические импорты, выкинул бы `patients.ts` из переписи смешения целиком —
		 * а это ровно тот файл, на котором замерен худший ответ (`200 []` на осложнения
		 * настоящего пациента). Зелёный такого сканера означал бы «я не смотрел».
		 */
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const argument = node.arguments[0];
			if (argument && ts.isStringLiteral(argument)) {
				specifiers.push(argument.text);
				dynamicSpecifiers.push(argument.text);
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);

	return {
		readsFlag: subtreeHas(parsed, isFlagAccess),
		touchesDatabase: specifiers.some((specifier) => specifier.endsWith("client.js")),
		kinds: [...kinds].sort(),
		gates,
		specifiers,
		dynamicSpecifiers,
	};
}

/* ------------------------------------------------------------------ *
 * Перепись живого дерева
 * ------------------------------------------------------------------ */

type Census = {
	/** Модули `db/**`, читающие флаг: имя -> виды гейтов. */
	respecting: Map<string, GateKind[]>;
	/** Модули `db/**`, идущие в PostgreSQL и флаг НЕ читающие. Это норма, не долг. */
	ignoring: string[];
	/** Модули `db/**`, не касающиеся хранилища вовсе: уважать флаг не могут. */
	outsideStorage: string[];
	/** Всего модулей `db/**` без `*.test.ts`. */
	dbModules: number;
	/** Всего модулей `routes/**` без `*.test.ts`. */
	routeModules: number;
	/** Маршруты, смешивающие оба класса: имя -> что именно смешано. */
	mixedRoutes: Map<string, { respected: string[]; ignored: string[]; ignoredDynamicOnly: string[] }>;
	/** Сумма гейтов по всем уважающим модулям. Мера охвата для датчика вырождения. */
	totalGates: number;
};

/** Имя модуля `db/**` из спецификатора импорта. Требуется `/db/` в пути, поэтому одноимённый файл другого каталога не спутается. */
function dbModuleFromSpecifier(specifier: string): string | null {
	if (!specifier.includes("/db/")) return null;
	return `${path.posix.basename(specifier).replace(/\.js$/, "")}.ts`;
}

function buildCensus(): Census {
	const dbFiles = sourceFiles(dbDir);
	const respecting = new Map<string, GateKind[]>();
	const ignoring: string[] = [];
	const outsideStorage: string[] = [];
	let totalGates = 0;

	for (const file of dbFiles) {
		const scan = scanModule(file, readFileSync(path.join(dbDir, ...file.split("/")), "utf8"));
		if (scan.readsFlag) {
			respecting.set(file, scan.kinds);
			totalGates += scan.gates;
			continue;
		}
		if (scan.touchesDatabase) ignoring.push(file);
		else outsideStorage.push(file);
	}

	const ignoringSet = new Set(ignoring);
	const routeFiles = sourceFiles(routesDir);
	const mixedRoutes = new Map<
		string,
		{ respected: string[]; ignored: string[]; ignoredDynamicOnly: string[] }
	>();

	for (const file of routeFiles) {
		const scan = scanModule(file, readFileSync(path.join(routesDir, ...file.split("/")), "utf8"));
		const staticOnly = new Set(
			scan.specifiers
				.filter((specifier) => !scan.dynamicSpecifiers.includes(specifier))
				.map(dbModuleFromSpecifier)
				.filter((name): name is string => name !== null),
		);
		const all = scan.specifiers
			.map(dbModuleFromSpecifier)
			.filter((name): name is string => name !== null);
		const respected = [...new Set(all.filter((name) => respecting.has(name)))].sort();
		const ignored = [...new Set(all.filter((name) => ignoringSet.has(name)))].sort();
		if (respected.length === 0 || ignored.length === 0) continue;
		mixedRoutes.set(file, {
			respected,
			ignored,
			ignoredDynamicOnly: ignored.filter((name) => !staticOnly.has(name)),
		});
	}

	return {
		respecting,
		ignoring: ignoring.sort(),
		outsideStorage: outsideStorage.sort(),
		dbModules: dbFiles.length,
		routeModules: routeFiles.length,
		mixedRoutes,
		totalGates,
	};
}

/* ------------------------------------------------------------------ *
 * Объявленная граница
 * ------------------------------------------------------------------ */

/**
 * Модули `db/**`, которым второй, необъявленный смысл флага ПРИПИСАН, с точным
 * указанием, что каждый делает при `=off`.
 *
 * Сверка РОВНЫМ РАВЕНСТВОМ, включая виды. Причины обеих сторон:
 *
 *   * появление флага в десятом модуле — архитектурное событие: множество, на
 *     котором «приложение работает без базы» хоть отчасти верно, расширяется, и
 *     вместе с ним расширяется вторая ветка кода, живущая без охраны миграций и
 *     без фильтров по организации, проверенных SQL;
 *   * исчезновение — обратное событие, и оставленная запись охраняла бы пустое
 *     место;
 *   * СМЕНА ВИДА — отдельный класс, и он опаснее обоих. Переход «отказ» →
 *     «память» означает, что модуль, который раньше честно отказывал, начал
 *     ОТДАВАТЬ данные из `sampleData.ts`. Для `staffAuthorityQuery` это
 *     полномочия и надбавки персонала, для `protocolTemplateQuery` — врачебные
 *     шаблоны протоколов. Ключ «имя модуля» такого перехода не видит вовсе:
 *     запись остаётся, число записей остаётся, а поведение стало
 *     противоположным. Тот же приём отдельно сверяемого вида взят из
 *     `noFabricatedDataFallback.test.ts`, где он был добавлен после того, как
 *     ухудшение вида прошло семь проверок из семи.
 */
const DECLARED_RESPECTING: { module: string; kinds: GateKind[]; behaviour: string }[] = [
	{
		module: "appointmentsQuery.ts",
		kinds: ["память"],
		behaviour: "Отдаёт приёмы из sampleData.ts. Расписание оживает выдачей токена, второго барьера нет.",
	},
	{
		module: "clinicalQuery.ts",
		kinds: ["память"],
		behaviour:
			"Отдаёт клинические правила из sampleData.ts, пять гейтов. Два из них ТЕРЯЮТ ФИЛЬТР ПО " +
			"ОРГАНИЗАЦИИ: getClinicalRules принимает organizationId и возвращает inMemoryClinicalRules " +
			"целиком (строка 58), getClinicalRuleById ищет по одному id без организации (строка 66) — а " +
			"ветки базы рядом фильтруют по organizationId обе. Ветка удаления (строка 242) фильтрует. Это " +
			"живой образец цены второй ветки: фильтр аренды существует дважды и уже разошёлся.",
	},
	{
		module: "dashboardQuery.ts",
		kinds: ["память"],
		behaviour:
			"Собирает сводку через buildDashboard() из sampleData.ts, минуя базу. Единственный гейт стоит " +
			"перед вызовом гидратации.",
	},
	{
		module: "domainStateHydration.ts",
		kinds: ["память"],
		behaviour:
			"Не делает НИЧЕГО: перенос строк организации из PostgreSQL в доменные коллекции не запускается, " +
			"источником истины остаются сами коллекции sampleData.ts.",
	},
	{
		module: "patientsQuery.ts",
		kinds: ["память"],
		behaviour:
			"Отдаёт картотеку из sampleData.ts. Замерено: GET /api/patients при =off отвечает 200 и тремя " +
			"строками из памяти.",
	},
	{
		module: "pricelistQuery.ts",
		kinds: ["отказ", "память"],
		behaviour:
			"Запись прайса отвергает ServiceCatalogStorageDisabledError (три гейта). Единственная ветка " +
			"памяти — getDefaultOrganizationId, и она отдаёт ЗАШИТЫЙ идентификатор организации " +
			"00000000-…-000000000001, а не данные: этот же возврат объявлен долгом в " +
			"noFabricatedDataFallback.test.ts как нарушение анти-хардкода.",
	},
	{
		module: "protocolTemplateQuery.ts",
		kinds: ["отказ"],
		behaviour:
			"ТОЛЬКО отказ, три гейта, ProtocolTemplateStorageDisabledError. Из памяти шаблоны протоколов не " +
			"читаются НИКОГДА — при =off модуль не работает, а отказывает.",
	},
	{
		module: "settingsQuery.ts",
		kinds: ["отказ", "память"],
		behaviour:
			"Шестнадцать гейтов: профиль клиники, сотрудники, кресла и предпочтения интерфейса идут в " +
			"память, а ставки врача отвергаются (COMMISSION_STORAGE_UNAVAILABLE) — суммы живут только в базе.",
	},
	{
		module: "staffAuthorityQuery.ts",
		kinds: ["отказ"],
		behaviour:
			"ТОЛЬКО отказ, один гейт, StaffAuthorityStorageDisabledError, прямым чтением process.env без " +
			"предиката. При =off полномочия персонала не выдаются из памяти вовсе.",
	},
];

/**
 * Маршруты, в которых оба смысла флага сталкиваются внутри одного файла. Это
 * ОБЪЯВЛЕННЫЙ ДОЛГ, а не список исключений: каждая строка — место, где при `=off`
 * ответ собирается из двух источников сразу.
 *
 * Сверка РОВНЫМ РАВЕНСТВОМ: тринадцатый маршрут краснеет (это и есть охраняемое
 * событие), исчезнувший — тоже, иначе список хранил бы молчаливый слот под
 * следующее такое же смешение. Порог «не больше двенадцати» здесь был бы хуже
 * отсутствия проверки: в этом же дереве храповик адресов так и получил два
 * свободных слота, потому что строки из него убирали, а число не опускали.
 */
const DECLARED_MIXED_ROUTES: { route: string; reason: string }[] = [
	{
		route: "ai.ts",
		reason:
			"patientsQuery отдаёт карту из памяти, а aiQuery, imagingQuery и patientNoShowRiskQuery читают " +
			"базу: задание распознавания заводится на пациента, которого в базе нет.",
	},
	{
		route: "clinical.ts",
		reason:
			"clinicalQuery отдаёт правила из памяти, а семь модулей рядом (задачи, справочники CRM, адреса " +
			"DaData, поля лендинга, потерянные пациенты, история приёмов, единственная сессия) читают базу.",
	},
	{
		route: "documents.ts",
		reason:
			"appointmentsQuery отдаёт приёмы из памяти, documentQuery и visitsQuery читают базу: список " +
			"документов приёма собирается из двух источников.",
	},
	{
		route: "documents/auditFacts.ts",
		reason:
			"patientsQuery находит карту в памяти, а факты для аудита (billingQuery, documentQuery, " +
			"visitsQuery) приходят из базы, где этого пациента нет: аудит документа получает пустые факты.",
	},
	{
		route: "documents/create.ts",
		reason:
			"clinicalQuery и patientsQuery отдают из памяти, а billingQuery, documentQuery и visitsQuery " +
			"пишут и читают базу: документ создаётся на пациента, которого в базе нет.",
	},
	{
		route: "documents/html.ts",
		reason:
			"Замерено: GET /api/documents/<фикстура>/html при =off отвечает 404 «Документ не найден», хотя " +
			"документ в памяти есть. Охранник getDocumentById читает базу, patientsQuery рядом — память.",
	},
	{
		route: "documents/issue.ts",
		reason:
			"patientsQuery находит карту в памяти, выдача документа идёт через documentQuery в базу: " +
			"подписание не находит документ, который экран показывает.",
	},
	{
		route: "documents/pdf.ts",
		reason:
			"Экспорт PDF: getDocumentById читает базу и отвечает 404 (строки 72-74 и 118-120), а пациент " +
			"приходит из памяти динамическим import patientsQuery (строка 159). То есть либо документа нет " +
			"вовсе, либо PDF собрался бы с пациентом из sampleData и платежами из базы — печатный документ " +
			"из двух источников.",
	},
	{
		route: "documents/taxXml.ts",
		reason:
			"patientsQuery и settingsQuery из памяти, а billingQuery, documentQuery и visitsQuery из базы. " +
			"Здесь это уезжает в отчётность ФНС: реквизиты клиники из памяти, платежи из базы.",
	},
	{
		route: "documents/void.ts",
		reason:
			"Аннулирование: getDocumentById (строка 69) и документ-исправление (строка 101) читаются из " +
			"базы, оттуда же voidGeneratedDocumentInDb, а карта пациента для акта — из памяти через " +
			"patientsQuery. Отменять оказывается нечего: 404 на документ, который экран показывает.",
	},
	{
		route: "imaging.ts",
		reason:
			"patientsQuery отдаёт карту из памяти, imagingQuery и visitsQuery читают базу: снимки " +
			"настоящего пациента не находятся.",
	},
	{
		route: "patients.ts",
		reason:
			"ХУДШИЙ ИЗ ЗАМЕРЕННЫХ. GET /api/patients/<фикстура>/reclamations при =off отвечает 200 и ПУСТЫМ " +
			"списком: охранник getPatientByIdFromDb читает память и пропускает, рекламации читаются из базы. " +
			"Комментарий этого же маршрута (строки 592-593) прямо говорит, что пустой список врач прочитает " +
			"как «осложнений не было». Все три игнорирующих модуля приходят ТОЛЬКО динамическим import().",
	},
];

/* ------------------------------------------------------------------ *
 * Самопроверка сканера. Без неё зелёный результат ничего не значит.
 * ------------------------------------------------------------------ */

test("сканер читает флаг из кода и НЕ видит его в строке отказа и в комментарии", () => {
	const code = scanModule(
		"fixture.ts",
		[
			'import { db } from "./client.js";',
			"function useInMemory() {",
			'	return process.env.DENTAL_STATE_PERSISTENCE === "off";',
			"}",
			"export async function getThingFromDb(orgId: string) {",
			"	if (useInMemory()) return memoryThings;",
			"	return db.select().from(things);",
			"}",
		].join("\n"),
	);
	assert.equal(code.readsFlag, true, "Обращение process.env к флагу не найдено — сканер слеп.");
	assert.deepEqual(code.kinds, ["память"], "Гейт без throw обязан быть «памятью».");
	assert.equal(code.gates, 1, "Гейт через локальный предикат не сосчитан.");

	/*
	 * Обратная сторона, и она в этом дереве живая: имя флага стоит в ТЕКСТЕ
	 * отказа в settingsQuery.ts:306, pricelistQuery.ts:234,
	 * protocolTemplateQuery.ts:76 и staffAuthorityQuery.ts:78, и в объяснениях в
	 * комментариях ещё в четырёх местах. Поиск подстроки объявил бы уважающим
	 * модуль по сообщению об ошибке.
	 */
	const documented = scanModule(
		"fixture.ts",
		[
			'import { db } from "./client.js";',
			"/**",
			" * Хранение отключено (DENTAL_STATE_PERSISTENCE=off): ставки живут только в базе.",
			" * Раньше здесь была проверка process.env.DENTAL_STATE_PERSISTENCE — её убрали.",
			" */",
			"const REFUSAL =",
			'	"Ставка не сохранена: хранение отключено (DENTAL_STATE_PERSISTENCE=off), включите базу.";',
			"export async function getThingFromDb(orgId: string) {",
			"	return db.select().from(things);",
			"}",
		].join("\n"),
	);
	assert.equal(
		documented.readsFlag,
		false,
		"Сканер посчитал чтением флага упоминание в комментарии и в строке отказа. Такой сторож объявляет " +
			"уважающим модуль по тексту сообщения об ошибке и наказывает за объяснение — в этом дереве " +
			"четыре модуля держат имя флага именно в тексте отказа для оператора.",
	);
	assert.equal(documented.touchesDatabase, true, "Импорт пула client.js не найден.");
});

test("сканер отличает отказ от выдачи из памяти", () => {
	const refuses = scanModule(
		"fixture.ts",
		[
			'import { db } from "./client.js";',
			"export async function saveThingInDb(orgId: string) {",
			'	if (process.env.DENTAL_STATE_PERSISTENCE === "off") throw new StorageDisabledError();',
			"	return db.insert(things).values({ orgId });",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		refuses.kinds,
		["отказ"],
		"Гейт с throw назван не отказом. Это форма staffAuthorityQuery.ts:145 — прямое чтение env без " +
			"предиката; не увидев её, сторож потерял бы весь модуль.",
	);

	const both = scanModule(
		"fixture.ts",
		[
			'import { db } from "./client.js";',
			"function useInMemory() {",
			'	return process.env.DENTAL_STATE_PERSISTENCE === "off";',
			"}",
			"export async function readThing() {",
			"	if (useInMemory()) return memoryThing;",
			"	return db.select().from(things);",
			"}",
			"export async function writeThing() {",
			"	if (useInMemory()) throw new StorageDisabledError();",
			"	return db.insert(things).values({});",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		both.kinds,
		["отказ", "память"],
		"Модуль с чтением из памяти И отказом на запись обязан показывать оба вида: так устроены " +
			"pricelistQuery.ts и settingsQuery.ts.",
	);

	/*
	 * Длинная функция, в теле которой встретилось обращение к флагу, предикатом
	 * НЕ является. Замерено: без требования «ровно один return» в список
	 * предикатов попадала grantStaffAuthorityInDb из staffAuthorityQuery.ts, и
	 * любой её вызов внутри if читался бы как гейт флага.
	 */
	const notPredicate = scanModule(
		"fixture.ts",
		[
			'import { db } from "./client.js";',
			"export async function grantInDb(orgId: string) {",
			'	if (process.env.DENTAL_STATE_PERSISTENCE === "off") throw new StorageDisabledError();',
			"	const rows = await db.select().from(things);",
			"	return rows.length;",
			"}",
			"export async function caller(orgId: string) {",
			"	if (await grantInDb(orgId)) return true;",
			"	return false;",
			"}",
		].join("\n"),
	);
	assert.equal(
		notPredicate.gates,
		1,
		"Функция с обращением к флагу где-то в длинном теле принята за предикат флага, и её вызов в if " +
			"сосчитан вторым гейтом. Предикат — это только `return <флаг>`, иначе перепись видов врёт.",
	);
});

test("сканер собирает и статический, и динамический import", () => {
	const scan = scanModule(
		"fixture.ts",
		[
			'import { getPatientByIdFromDb } from "../db/patientsQuery.js";',
			"export async function handler(orgId: string, id: string) {",
			"	const patient = await getPatientByIdFromDb(orgId, id);",
			'	const { getReclamationsFromDb } = await import("../db/patientReclamationsQuery.js");',
			"	return getReclamationsFromDb(orgId, id);",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		scan.specifiers.sort(),
		["../db/patientReclamationsQuery.js", "../db/patientsQuery.js"],
		"Динамический import не собран. В routes/patients.ts ВСЕ три игнорирующих модуля приходят только " +
			"через await import(), и сканер без этой ветки выкинул бы из переписи ровно тот файл, на " +
			"котором замерен худший ответ — 200 с пустым списком осложнений настоящего пациента.",
	);
	assert.deepEqual(
		scan.dynamicSpecifiers,
		["../db/patientReclamationsQuery.js"],
		"Динамический спецификатор не отмечен как динамический — датчик «пришло только через import()» " +
			"перестанет что-либо измерять.",
	);
});

test("перепись смешения не считает смешанным маршрут с одним классом модулей", () => {
	const census = buildCensus();
	const onlyRespecting = [...census.mixedRoutes.values()].every(
		(entry) => entry.respected.length > 0 && entry.ignored.length > 0,
	);
	assert.equal(
		onlyRespecting,
		true,
		"В смешанные попал маршрут, у которого один из двух классов пуст. Тогда сторож краснеет на " +
			"маршрутах, устроенных правильно, и его выключат вместе с настоящим сигналом.",
	);
});

/* ------------------------------------------------------------------ *
 * Датчики вырождения переписи
 * ------------------------------------------------------------------ */

/*
 * Пороги стоят `>=` РОВНО по замеру: красным становится только СОКРАЩЕНИЕ
 * множества, потому что сокращение и есть класс потери — перепись перестала
 * видеть часть дерева, и любой зелёный ниже получен на урезанном множестве. Рост
 * бесплатен и не наказывается. Удалили модуль по делу — опустите число тем же
 * коммитом и назовите причину.
 *
 * Запас НИЖЕ замера здесь был бы оплаченной вперёд квотой молчаливых потерь: в
 * этом же дереве порог `>= 25` при 31 модуле совпадал РОВНО с уже починенным
 * дефектом обхода по маске `*Query.ts`, то есть возврат того дефекта проходил без
 * покраснения (`noFabricatedDataFallback.test.ts`).
 */
test("перепись слоя доступа и маршрутов не выродилась", () => {
	const census = buildCensus();

	assert.ok(
		census.dbModules >= 33,
		`Перепись просмотрела ${census.dbModules} модулей db/**, а на момент установки порога их было 33. ` +
			"Множество сократилось: либо обход сузился по маске имени или перестал заходить в подкаталоги, " +
			"либо модули удалили по делу — тогда опустите число тем же коммитом и назовите причину.",
	);

	assert.ok(
		census.routeModules >= 64,
		`Перепись просмотрела ${census.routeModules} модулей routes/**, а было 64. Смешение ищется только ` +
			"среди просмотренных, поэтому сжатие этого множества делает зелёный результат ниже бессмысленным.",
	);

	assert.ok(
		census.ignoring.length >= 18,
		`Модулей, идущих в PostgreSQL и НЕ читающих флаг, найдено ${census.ignoring.length}, а было 18. ` +
			"Это не долг, а норма — но число здесь датчик: обращение к базе распознаётся по импорту " +
			"db/client.js, и если распознавание отвалится, все восемнадцать переедут в «вне хранилища», " +
			"перепись смешения опустеет и сторож станет зелёным по построению.",
	);

	assert.ok(
		census.outsideStorage.length >= 6,
		`Модулей вне хранилища найдено ${census.outsideStorage.length}, а было 6 (schema.ts, ` +
			"patientsSchema.ts, communicationsSchema.ts, client.ts, moneyTypeParsers.ts, " +
			"visitsProjection.ts). Именно они делают честный знаменатель 27, а не 40: уважать флаг " +
			"хранения объявления таблиц, сам пул, разборщики типов драйвера и чистая проекция не могут.",
	);

	assert.ok(
		census.totalGates >= 39,
		`Гейтов флага во всех уважающих модулях найдено ${census.totalGates}, а было 39 (16 в ` +
			"settingsQuery, по 5 в patientsQuery и clinicalQuery, 4 в pricelistQuery, по 3 в " +
			"appointmentsQuery и protocolTemplateQuery, по 1 в dashboardQuery, staffAuthorityQuery и " +
			"domainStateHydration). Это охват сверки видов: сжался охват — виды посчитаны на части гейтов, " +
			"и переход «отказ» → «память» в непросмотренном гейте пройдёт молча.",
	);

	const outsideQueryMask = [...census.respecting.keys()].filter((name) => !name.endsWith("Query.ts"));
	assert.deepEqual(
		outsideQueryMask,
		["domainStateHydration.ts"],
		"Среди уважающих флаг обязан быть domainStateHydration.ts — модуль вне маски `*Query.ts`. Его " +
			"исчезновение означает, что обход снова берёт файлы по угаданному имени, а не все `.ts`.",
	);
});

/* ------------------------------------------------------------------ *
 * Объявленная граница против дерева
 * ------------------------------------------------------------------ */

test("объявление границы не выродилось в отписку", () => {
	const shallowBehaviour = DECLARED_RESPECTING.filter(
		(entry) => entry.behaviour.trim().length < 80,
	).map((entry) => entry.module);
	assert.deepEqual(
		shallowBehaviour,
		[],
		`Поведение при =off описано отпиской: ${shallowBehaviour.join(", ")}. Описание обязано называть, ` +
			"что именно уходит наружу вместо данных базы, иначе объявление границы ничего не объявляет.",
	);

	const shallowReason = DECLARED_MIXED_ROUTES.filter((entry) => entry.reason.trim().length < 100).map(
		(entry) => entry.route,
	);
	assert.deepEqual(
		shallowReason,
		[],
		`Смешение заявлено отпиской: ${shallowReason.join(", ")}. Причина обязана называть, какой модуль ` +
			"читает память, какой базу, и что из-за этого увидит человек.",
	);

	const duplicated = DECLARED_MIXED_ROUTES.map((entry) => entry.route).filter(
		(route, index, all) => all.indexOf(route) !== index,
	);
	assert.deepEqual(duplicated, [], `В списке смешения повторы: ${duplicated.join(", ")}`);
});

test("множество модулей, уважающих DENTAL_STATE_PERSISTENCE, объявлено и не изменилось", () => {
	const census = buildCensus();
	const declared = new Set(DECLARED_RESPECTING.map((entry) => entry.module));
	const actual = new Set(census.respecting.keys());

	const added = [...actual].filter((name) => !declared.has(name)).sort();
	assert.deepEqual(
		added,
		[],
		`Модуль db/** начал читать DENTAL_STATE_PERSISTENCE, не будучи объявленным: ${added.join(", ")}. ` +
			"Флаг объявлен ТОЛЬКО для файлового снимка состояния (persistentState.ts); в слое доступа к " +
			"PostgreSQL это второй, необъявленный смысл, и каждое его расширение — вторая ветка кода, " +
			"живущая без охраны миграций и без проверенных SQL фильтров по организации. Если расширение " +
			"осознанное, объявите модуль здесь с описанием поведения при =off и обновите " +
			".agents/lead/recon-persistence-flag-half-respected.md тем же коммитом.",
	);

	const removed = [...declared].filter((name) => !actual.has(name)).sort();
	assert.deepEqual(
		removed,
		[],
		`Объявлен уважающим модуль, который флаг больше не читает: ${removed.join(", ")}. Либо его ` +
			"перевели на живую базу — тогда удалите запись, иначе объявление охраняет пустое место, — либо " +
			"сканер перестал видеть чтение флага, и тогда зелёное выше не значит ничего.",
	);

	const declaredKinds = new Map(DECLARED_RESPECTING.map((entry) => [entry.module, entry.kinds]));
	const changedKind = [...census.respecting.entries()]
		.filter(([name, kinds]) => {
			const known = declaredKinds.get(name);
			return known !== undefined && known.join("|") !== kinds.join("|");
		})
		.map(
			([name, kinds]) =>
				`${name}: объявлено [${declaredKinds.get(name)?.join("|")}], в дереве [${kinds.join("|")}]`,
		);
	assert.deepEqual(
		changedKind,
		[],
		`Вид уважения флага изменился, а запись осталась прежней: ${changedKind.join("; ")}. Переход ` +
			"«отказ» → «память» означает, что модуль, честно отказывавший при выключенном хранении, начал " +
			"ОТДАВАТЬ данные из sampleData.ts: для staffAuthorityQuery это полномочия и надбавки " +
			"персонала, для protocolTemplateQuery — врачебные шаблоны протоколов. Ключ «имя модуля» такого " +
			"перехода не видит: запись на месте, число записей то же, поведение противоположное. Обратный " +
			"переход тоже красный — описание в объявлении будет рассказывать про другой код.",
	);
});

test("модуль, игнорирующий флаг, не добавлен в маршрут, где флаг обещан", () => {
	const census = buildCensus();
	const declared = new Set(DECLARED_MIXED_ROUTES.map((entry) => entry.route));
	const actual = new Set(census.mixedRoutes.keys());

	const added = [...census.mixedRoutes.entries()]
		.filter(([route]) => !declared.has(route))
		.map(
			([route, entry]) =>
				`${route} (память: ${entry.respected.join(", ")} | база: ${entry.ignored.join(", ")})`,
		)
		.sort();
	assert.deepEqual(
		added,
		[],
		`В маршруте столкнулись оба смысла DENTAL_STATE_PERSISTENCE: ${added.join("; ")}. При =off ответ ` +
			"собирается из двух источников: охранник читает ПАМЯТЬ и пропускает, данные приходят из БАЗЫ, " +
			"где их нет. Наружу это выходит не отказом, а 404 на существующий документ или, хуже, 200 с " +
			"ПУСТЫМ списком — замерено на GET /api/patients/<фикстура>/reclamations, где пустой ответ " +
			"читается врачом как «осложнений не было». Варианты: брать данные из модуля, уважающего флаг; " +
			"либо снять уважение флага с охранника, чтобы отказ был честным 404; либо объявить смешение " +
			"здесь с причиной и обновить .agents/lead/recon-persistence-flag-half-respected.md.",
	);

	const removed = [...declared].filter((route) => !actual.has(route)).sort();
	assert.deepEqual(
		removed,
		[],
		`Объявлено смешение в маршруте, где перепись его не находит: ${removed.join(", ")}. Либо он ` +
			"вылечен — тогда удалите запись, иначе список хранит молчаливый слот под следующее такое же " +
			"смешение, — либо перепись перестала видеть этот класс, и её зелёный ничего не стоит.",
	);
});

/*
 * ДАТЧИК НА ЖИВОМ ДЕРЕВЕ, А НЕ НА ФИКСТУРЕ. Самопроверка выше доказывает, что
 * сканер УМЕЕТ читать динамический import; это утверждение доказывает, что он
 * читает его ЗДЕСЬ. Разница не формальная: в routes/patients.ts все три
 * игнорирующих модуля приходят только через await import(), и сканер без этой
 * ветки выкинул бы из переписи ровно тот файл, на котором замерен худший ответ.
 */
test("смешение в routes/patients.ts найдено именно через динамический import", () => {
	const census = buildCensus();
	const patients = census.mixedRoutes.get("patients.ts");
	assert.ok(
		patients !== undefined,
		"routes/patients.ts выпал из переписи смешения. Его уважающий модуль импортирован статически, а " +
			"все три игнорирующих — только через await import(): выпадение означает, что сбор динамических " +
			"импортов сломался, и перепись смешения ниже считает не то дерево.",
	);
	assert.deepEqual(
		patients?.ignoredDynamicOnly.sort(),
		[
			"patientArchiveReasonsAndBlacklistsQuery.ts",
			"patientReclamationsQuery.ts",
			"patientTaskTicketsQuery.ts",
		],
		"Три игнорирующих модуля routes/patients.ts обязаны быть найдены ТОЛЬКО как динамические. Если " +
			"список опустел, сканер видит их статически — значит либо импорты переписали, либо датчик " +
			"перестал различать способ импорта и больше ничего не измеряет.",
	);
});
