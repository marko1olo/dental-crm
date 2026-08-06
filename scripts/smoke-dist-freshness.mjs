/*
 * СБОРКА НЕ СТАРШЕ ИСХОДНИКА — ОДИН СТРАЖ НА ВЕСЬ РЕПОЗИТОРИЙ.
 *
 * ЗАЧЕМ ОН ЕСТЬ. Замерено ведущим в цикле 25: `dist` читают 62 скрипта в
 * scripts/, и свежесть сборки проверяли ЧЕТЫРЕ из них. То есть 58 стражей судили
 * артефакт, не убедившись, что артефакт собран из сегодняшнего исходника.
 *
 * За одни сутки класс всплыл ТРИЖДЕ и каждый раз разными людьми:
 *   1. smoke:pricelist-analyzer проверял apps/api/dist/pricelist/analyzer.js на
 *      тринадцать часов старше src, а его условие existsSync отвечало лишь на
 *      вопрос «файл есть» (починено, 691059455);
 *   2. коммит 613afc018 — «сторож контракта судил по собранному dist: краснел на
 *      целом коде и МОЛЧАЛ НА СЛОМАННОМ»;
 *   3. packages/shared/dist без нового экспорта staffAuthorityFlagsSchema уронил
 *      ШЕСТЬ файлов набора api разом — падали целые файлы на загрузке модуля,
 *      суммы просели 1479→1430 тестов, и причина была одна.
 *
 * ЛОЖНЫЙ ЗЕЛЁНЫЙ ЗДЕСЬ ОПАСНЕЕ ЛОЖНОГО КРАСНОГО, и именно он делает этот класс
 * достойным отдельного стража. Красный виден и его чинят. Зелёный на вчерашней
 * сборке читается как «поведение подтверждено» — а подтверждено поведение кода,
 * которого в исходнике уже нет.
 *
 * ПОЧЕМУ ОДИН СТРАЖ, А НЕ ПРАВКА В 58 ФАЙЛАХ. Проверка свежести — свойство
 * ДЕРЕВА, а не отдельного стража, и одному владельцу она принадлежит честнее.
 * Прогон в общем наборе (smoke:all перечисляет все smoke:* обходом package.json)
 * защищает остальные стражи транзитивно: если сборка устарела, красным становится
 * этот страж, с внятным текстом, а не случайный из 58 с загадочной ошибкой.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/*
 * Рабочие области, где dist ОТСЛЕЖИВАЕТСЯ и читается стражами.
 *
 * apps/web намеренно НЕ включён: его dist собирает vite и только для продакшена,
 * в рабочем дереве его обычно нет вовсе. Страж, требующий сборку, которой по
 * замыслу нет, — это ложный красный, а их этот файл и заведён убирать.
 */
const WATCHED = [
	{
		name: "@dental/shared",
		sourceDir: "packages/shared/src",
		tsconfig: "packages/shared/tsconfig.json",
		distDir: "packages/shared/dist",
		rebuild: "npm run build -w @dental/shared",
	},
	{
		name: "@dental/api",
		sourceDir: "apps/api/src",
		tsconfig: "apps/api/tsconfig.json",
		distDir: "apps/api/dist",
		rebuild: "npm run build -w @dental/api",
	},
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

/*
 * Тесты из сравнения ИСКЛЮЧЕНЫ, и это не поблажка.
 *
 * `tsc` для этих областей собирает рабочий код; наборы тестов (*.test.ts) в dist
 * не попадают либо попадают отдельно, и правка теста не делает сборку устаревшей.
 * Без исключения страж краснел бы после КАЖДОЙ правки теста — то есть постоянно,
 * а постоянно красный страж перестают читать.
 */
function isComparableSource(fileName) {
	if (/\.(test|spec|bench)\.[cm]?tsx?$/.test(fileName)) return false;
	return SOURCE_EXTENSIONS.has(path.extname(fileName));
}

/*
 * СРАВНЕНИЕ ПОФАЙЛОВОЕ, И ЭТО ИСПРАВЛЕНИЕ ПЕРВОЙ РЕДАКЦИИ ЭТОГО ЖЕ СТРАЖА.
 *
 * Первая редакция сравнивала САМЫЙ НОВЫЙ исходник с САМЫМ СТАРЫМ файлом сборки.
 * Прогон на живом дереве её опроверг сразу: страж покраснел, назвав
 * `packages/shared/dist/tests/…test.d.ts` от 23.07 и
 * `apps/api/dist/services/automationRulesEngine.js` от 21.07. Оба файла старые
 * ЗАКОННО — их исходники не менялись, а `tsc` перезаписывает только затронутое.
 * То есть правило давало ложный красный на каждой инкрементальной сборке, а
 * постоянно красный страж перестают читать. Ровно тот дефект, ради которого этот
 * файл и написан.
 *
 * Верное правило: у КАЖДОГО исходника спросить про ЕГО СОБСТВЕННЫЙ выход.
 * Устаревание — это «этот файл изменили и не пересобрали», а не «в сборке есть
 * файлы старше самой свежей правки». Так ловится и случай, который дал повод:
 * `staffAuthorityFlagsSchema` появилась в `packages/shared/src/index.ts`, а
 * `dist/index.js` остался прежним — пара src↔dist расходится, и это видно.
 */
/*
 * СПИСОК ФАЙЛОВ БЕРЁТСЯ У САМОГО КОМПИЛЯТОРА, А НЕ ОБХОДОМ КАТАЛОГА.
 *
 * Обход каталога дал ЛОЖНОЕ УКАЗАНИЕ, и это измерено, а не предположено. Страж
 * сообщил, что `apps/api/src/telegram/legacyMocks.ts` новее своей сборки, и
 * потребовал пересборки — а `npm run build -w @dental/api` эту пару не двигает
 * НИКОГДА: файл стоит в `exclude` файла `apps/api/tsconfig.json` («Демо-данные и
 * легаси-моки: не участвуют в боевых маршрутах»). То есть `tsc` его не компилирует
 * по замыслу, а `dist/telegram/legacyMocks.js` — остаток, слежавшийся ДО того, как
 * исключение добавили. Совет «пересоберите» был бы неисполним, а неисполнимый
 * совет от стража хуже молчания: он выглядит как поломка сборки.
 *
 * `ts.parseJsonConfigFileContent` отдаёт РОВНО тот список, который компилирует
 * `tsc`: с учётом `include`, `exclude`, `extends` и комментариев с висячими
 * запятыми в tsconfig (обычный `JSON.parse` на нём падает — проверено).
 * Тот же вывод, что у пакета MM2 в этом же цикле: где нужен разбор TypeScript,
 * надо звать TypeScript, а не писать свой разборщик текста.
 */
function listBuiltSources(tsconfigPath, accept) {
	const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
	if (configFile.error) {
		throw new Error(
			`не прочитан ${tsconfigPath}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, " ")}`,
		);
	}
	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(tsconfigPath),
	);
	if (parsed.errors.length) {
		const first = parsed.errors[0];
		throw new Error(
			`${tsconfigPath} разобран с ошибкой: ${ts.flattenDiagnosticMessageText(first.messageText, " ")}`,
		);
	}
	const found = [];
	for (const fileName of parsed.fileNames) {
		if (!accept(path.basename(fileName))) continue;
		try {
			found.push({ path: fileName, mtimeMs: statSync(fileName).mtimeMs });
		} catch {
			/* файл исчез между разбором конфига и чтением — не наше дело */
		}
	}
	return found;
}

/**
 * Выход, соответствующий исходнику: `src/a/b.ts` → `dist/a/b.js`.
 *
 * Проверяется и `.js`, и `.d.ts`: при `declaration: true` устареть может любой из
 * них, а импорт значения ломается именно по `.js`.
 */
function builtCounterparts(sourcePath, sourceDir, distDir) {
	const relative = path.relative(sourceDir, sourcePath);
	const withoutExtension = relative.replace(/\.[cm]?tsx?$/, "");
	return [
		path.join(distDir, `${withoutExtension}.js`),
		path.join(distDir, `${withoutExtension}.d.ts`),
	];
}

const stale = [];
const report = [];

for (const area of WATCHED) {
	const sourceDir = path.resolve(area.sourceDir);
	const distDir = path.resolve(area.distDir);

	if (!existsSync(sourceDir)) {
		report.push({
			area: area.name,
			state: "нет исходников — область пропущена",
		});
		continue;
	}
	/*
	 * Отсутствие сборки НЕ ошибка этого стража. Стражи, которым dist нужен, сами
	 * говорят «Build the API first»; дублировать это требование здесь значило бы
	 * заставлять собирать api ради проверки, ничего про api не утверждающей.
	 */
	if (!existsSync(distDir)) {
		report.push({
			area: area.name,
			state: "сборки нет — не собрано, это не устаревание",
		});
		continue;
	}

	const sources = listBuiltSources(
		path.resolve(area.tsconfig),
		isComparableSource,
	);
	if (!sources.length) {
		report.push({ area: area.name, state: "нечего сравнивать" });
		continue;
	}

	/*
	 * Отсутствие выхода НЕ считается устареванием. Исходник может быть только что
	 * добавлен и ещё не собран, а может не попадать в сборку по замыслу (например
	 * файл, исключённый из tsconfig). Различить это здесь нечем, а страж, который
	 * краснеет на новом файле, мешает работе вместо того, чтобы её защищать.
	 * Устаревание — это РАСХОЖДЕНИЕ существующей пары, и только оно.
	 */
	const lagging = [];
	for (const source of sources) {
		for (const builtPath of builtCounterparts(
			source.path,
			sourceDir,
			distDir,
		)) {
			if (!existsSync(builtPath)) continue;
			let builtMtimeMs;
			try {
				builtMtimeMs = statSync(builtPath).mtimeMs;
			} catch {
				continue;
			}
			if (source.mtimeMs > builtMtimeMs) {
				lagging.push({
					source: path.relative(process.cwd(), source.path),
					built: path.relative(process.cwd(), builtPath),
					lagSeconds: Math.round((source.mtimeMs - builtMtimeMs) / 1000),
				});
			}
		}
	}

	if (lagging.length) {
		lagging.sort((left, right) => right.lagSeconds - left.lagSeconds);
		const worst = lagging.slice(0, 5);
		stale.push(
			`${area.name}: пар «исходник новее своей сборки» — ${lagging.length}. ` +
				`Худшие: ${worst.map((entry) => `${entry.source} → ${entry.built} (отстала на ${entry.lagSeconds} с)`).join("; ")}. ` +
				`Пересоберите: ${area.rebuild}`,
		);
	}
	report.push({
		area: area.name,
		state: lagging.length ? "УСТАРЕЛА" : "свежая",
		comparedSources: sources.length,
		laggingPairs: lagging.length,
	});
}

if (stale.length) {
	console.error(
		"Сборка старше исходника — стражи, читающие dist, судили бы вчерашний код:",
	);
	for (const line of stale) console.error(`- ${line}`);
	process.exit(1);
}

console.log(JSON.stringify({ ok: true, areas: report }, null, 2));
