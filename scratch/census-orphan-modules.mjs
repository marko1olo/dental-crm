/*
 * Перепись модулей БЕЗ ИМПОРТЁРОВ — «сырые файлы, а не система».
 *
 * ЗАЧЕМ ФАЙЛОМ, А НЕ `node -e`. Две попытки написать эту перепись строкой в
 * `node -e` дали сначала ложный результат (576 «сирот» из 580 — очевидная чушь,
 * `AppHelpers.tsx` держит 138 вызовов `money`), а потом синтаксическую ошибку:
 * bash съедает обратные слэши внутри одинарных кавычек, и регулярка с экранами
 * до Node не доезжает. Скрипт на диске от этого свободен.
 *
 * ПОЧЕМУ ТЕСТЫ НЕ ИСКЛЮЧЕНЫ ИЗ ПОИСКА ИМПОРТЁРОВ. Однажды я объявил
 * `telegram/legacyMocks.ts` сиротой, потому что искал импортёров с
 * `--glob '!*.test.ts'`. Импортировали его ЧЕТЫРЕ набора тестов. Исключать тесты
 * из поиска импортёров нельзя — живой код начинает выглядеть мёртвым. Модуль,
 * который зовут только тесты, — это отдельный вердикт («живёт ради тестов»), а не
 * сирота.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const CODE = /\.(tsx?|mts|cts|mjs|cjs|js)$/;
const TEST = /\.(test|spec|bench)\./;
/** Точки входа: их не импортируют по определению, они и есть корень. */
const ENTRY = new Set(["index", "main", "App", "server", "vite.config", "drizzle.config"]);

const tracked = execSync("git ls-files apps packages scripts", { encoding: "utf8" })
	.split(/\r?\n/)
	.filter((file) => file && CODE.test(file));

const sources = new Map();
for (const file of tracked) {
	try {
		sources.set(file, readFileSync(file, "utf8"));
	} catch {
		/* файл исчез между обходом и чтением */
	}
}

const targets = tracked.filter(
	(file) =>
		/^(apps\/web\/src|apps\/api\/src|packages\/shared\/src)\//.test(file) &&
		!TEST.test(file) &&
		!file.endsWith(".d.ts"),
);

const orphans = [];
const testOnly = [];
/** Модуль не импортируют, но его экспорты зовут — значит есть вторая реализация. */
const duplicated = [];

/** Текст модуля из уже собранной карты; отдельная функция ради читаемости условия выше. */
function text0(file) {
	return sources.get(file) ?? "";
}

for (const file of targets) {
	const base = file.split("/").pop().replace(CODE, "");
	if (ENTRY.has(base)) continue;
	// Ссылка на модуль в любом виде: import/export from, динамический import, vi.mock.
	const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const reference = new RegExp(`["'][^"']*${escaped}(\\.js|\\.tsx?)?["']`);

	const importers = [];
	for (const [other, text] of sources) {
		if (other === file) continue;
		if (reference.test(text)) importers.push(other);
	}

	if (importers.length === 0) {
		/*
		 * МОДУЛЬ НЕ ИМПОРТИРУЮТ — НО ЕГО ЭКСПОРТЫ МОГУТ ЗВАТЬ ИЗ ДРУГОЙ РЕАЛИЗАЦИИ.
		 *
		 * Это исправление ложного вердикта, купленное ошибкой. Перепись объявила
		 * `telegram/chatLinks.ts` и `telegram/linkCodes.ts` сиротами, потому что
		 * искала импорт МОДУЛЯ по имени файла. А функции `revokeDenteTelegramChatLink`
		 * и `listDenteTelegramChatLinks` имеют по 5-6 совпадений в репозитории: их
		 * зовут — только из `sampleData.ts`, где лежит ВТОРАЯ реализация тех же имён
		 * (третья в `sampleData_opt.ts`). То есть это не сирота, а ДВА ВЛАДЕЛЬЦА
		 * одного правила, и подключён из них худший: синхронный, на массиве в памяти,
		 * при готовом варианте на базе.
		 *
		 * Вопрос «кто импортирует модуль» и вопрос «кто зовёт его функции» — РАЗНЫЕ,
		 * и перепись обязана задавать оба: иначе дубль реализации маскируется под
		 * мёртвый файл, а это противоположные диагнозы с противоположными правками.
		 */
		const exported = [...text0(file).matchAll(/^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_]\w*)/gm)].map(
			(match) => match[1],
		);
		const twins = [];
		for (const name of exported) {
			for (const [other, text] of sources) {
				if (other === file) continue;
				if (new RegExp(`\\b${name}\\b`).test(text)) {
					twins.push({ name, at: other });
					break;
				}
			}
		}
		if (twins.length) duplicated.push({ file, twins });
		else orphans.push(file);
		continue;
	}
	if (importers.every((imp) => TEST.test(imp))) testOnly.push({ file, importers });
}

console.log(`проверено модулей: ${targets.length}`);
console.log(`СИРОТЫ (ни импорта модуля, ни вызова экспортов): ${orphans.length}`);
console.log(`ДУБЛЬ РЕАЛИЗАЦИИ (модуль не импортируют, а экспорты зовут — из другого файла): ${duplicated.length}`);
console.log(`импортируют ТОЛЬКО тесты: ${testOnly.length}`);
console.log("");

if (duplicated.length) {
	console.log("=== ДУБЛЬ РЕАЛИЗАЦИИ — ОПАСНЕЕ СИРОТЫ: подключён может быть худший вариант ===");
	for (const { file, twins } of duplicated) {
		const where = [...new Set(twins.map((twin) => twin.at))].slice(0, 3).join(", ");
		console.log(`  ${file}`);
		console.log(`      экспорты зовут из: ${where}`);
	}
	console.log("");
}

if (orphans.length) {
	console.log("=== СИРОТЫ (ни одной ссылки нигде) ===");
	for (const file of orphans) console.log(`  ${file}`);
	console.log("");
}
if (testOnly.length) {
	console.log("=== ЖИВУТ ТОЛЬКО РАДИ ТЕСТОВ (отдельный вердикт, НЕ сироты) ===");
	for (const { file, importers } of testOnly.slice(0, 20)) {
		console.log(`  ${file}  ←  ${importers.length} тест(ов)`);
	}
	if (testOnly.length > 20) console.log(`  … ещё ${testOnly.length - 20}`);
}
