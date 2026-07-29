/**
 * Прогон ВСЕХ сквозных доказательных сценариев одной командой.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. В репозитории лежат двенадцать сквозных сценариев
 * (`apps/api/src/tests/**\/*Proof.ts`): настоящие маршруты, живая PostgreSQL,
 * сверка независимым SQL, уборка следов за собой. Это самая дорогая и самая
 * ценная проверка в проекте — и НИ ОДИН из них не запускался ничем. Они не
 * попадают в `npm test` (имя не заканчивается на `.test.ts`), их нет ни в одном
 * `smoke:*`, нет в `lint`. Проверено поиском по package.json, скриптам и
 * документации: у каждого файла ноль вызывающих.
 *
 * То есть ровно та болезнь, которую эти сценарии и ловят, случилась с ними
 * самими: работа сделана, закоммичена, и недостижима. Правка маршрута ломает их
 * молча, и никто не узнаёт.
 *
 * ПОЧЕМУ СТРОГО ПО ОДНОМУ, А НЕ ПАРАЛЛЕЛЬНО. Все сценарии работают с ОДНОЙ живой
 * базой. Параллельный запуск они друг другу ломают: в этом же дереве уже был
 * разбор, где четыре файла тестов делили одну клинику и удаляли строки друг
 * друга, а набор упавших плавал от прогона к прогону
 * (apps/api/src/tests/support/fixtureOrganizations.ts). Выигрыш во времени здесь
 * не стоит недоверия к результату.
 *
 * ПОЧЕМУ ОТДЕЛЬНО НАЗЫВАЕТСЯ НЕДОСТУПНАЯ БАЗА. Без этого лежащая база читается
 * как «двенадцать сломанных цепочек», и по такому отчёту начинают чинить
 * работающий код. Причина обязана называться причиной.
 *
 * ЗАПУСК: node scripts/run-chain-proofs.mjs [подстрока-имени]
 *   без аргумента — все сценарии;
 *   с аргументом — только те, чьё имя его содержит (например `money`).
 */

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const apiRoot = path.resolve("apps/api");
const testsRoot = path.join(apiRoot, "src", "tests");

/** Сколько ждать один сценарий. Живая база плюс HTTP: минуты, не секунды. */
const SCENARIO_TIMEOUT_MS = 300_000;

/** Признаки того, что до базы не дошли вовсе, а не что сценарий не сошёлся. */
const DATABASE_UNAVAILABLE =
  /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|password authentication failed|database "[^"]*" does not exist|role "[^"]*" does not exist|сервер закрыл соединение/i;

/**
 * Заявил ли сценарий нарушение САМ. Экспортируется ради самопроверки
 * (`scripts/tests/run-chain-proofs.test.mjs`).
 *
 * ЧИСЛО ЧИТАЕТСЯ ЧИСЛОМ, А НЕ ОТРИЦАТЕЛЬНЫМ ПРОСМОТРОМ ВПЕРЁД — и это не вкус.
 * Здесь стояло `/НАРУШЕНИЙ:\s*(?!0\b)\d+/`, но в файле на месте `\b` лежал
 * НАСТОЯЩИЙ байт 0x08 (backspace). Просмотр `(?!0<BS>)` не срабатывает никогда,
 * поэтому «НАРУШЕНИЙ: 0» — заявление о том, что всё чисто — читалось как
 * заявленное нарушение. Проверено дампом кодпоинтов: `[?, !, 0, 8, )]`.
 *
 * Символ невидим во всех инструментах чтения: и `cat`, и редактор, и вывод
 * поиска показывают ровно `(?!0)`. То есть глазами такую опечатку не найти
 * никогда, а строковую правку она переживёт. Поэтому граница «ноль или больше
 * нуля» больше не выражается экранированием: число вынимается группой и
 * сравнивается как число. Опечатка в экранировании этого сломать не может.
 *
 * Почему это не осталось незамеченным раньше: единственный сценарий, печатавший
 * счётчик при нуле, писал «НАРУШЕНИЙ НЕ НАЙДЕНО» — без двоеточия и цифры. То
 * есть ловушка стояла заряженной и ждала первого, кто напечатает «НАРУШЕНИЙ: 0».
 */
export function declaresViolationsIn(output) {
  const counted = [...output.matchAll(/НАРУШЕНИЙ:\s*(\d+)/g)].map((match) => Number(match[1]));
  if (counted.some((count) => count > 0)) return true;
  return /\[УТЕЧКА\]/.test(output);
}

function collect(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      found.push(...collect(full));
      continue;
    }
    // Сквозные сценарии: *Proof.ts где угодно под tests/ и всё из tests/chains/.
    const isProof = entry.endsWith("Proof.ts");
    const isChain = path.basename(directory) === "chains" && entry.endsWith(".ts") && !entry.endsWith(".d.ts");
    if (isProof || isChain) found.push(full);
  }
  return found;
}

function runScenario(file) {
  return new Promise((resolve) => {
    const relative = path.relative(apiRoot, file).split(path.sep).join("/");
    const child = spawn("npx", ["tsx", relative], {
      cwd: apiRoot,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ file: relative, outcome: "таймаут", code: null, output });
    }, SCENARIO_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      /*
       * КОДА ВОЗВРАТА НЕДОСТАТОЧНО, И ЭТО ИЗМЕРЕНО.
       *
       * Часть сценариев — разведочные: они печатают найденные нарушения и
       * выходят с нулём, потому что задумывались как разбор, а не как гейт. При
       * первом прогоне этого runner'а `tests/security/crossTenantReconProof.ts`
       * дал «сошлось», напечатав «НАРУШЕНИЙ: 4» — межклиничную утечку в записи
       * на приём, которая после этого и была починена. Отчёт «сошлось 12 из 12»
       * был ложным зелёным, ровно тем, против чего прогон и заведён.
       *
       * ПОЧЕМУ ШАБЛОНЫ ТОЛЬКО ОДНОЗНАЧНЫЕ. Первая редакция считала нарушением и
       * слово «РАСХОЖДЕНИЕ», и получила ложную тревогу на `chainWeldProof.ts`:
       * тот печатает «РАСХОЖДЕНИЕ ФОРМУЛ ДОЛГА» и ТУТ ЖЕ сводит его —
       * «53000 − 3100.5 = 49899.5, долг главного экрана = 49899.5», — то есть
       * объясняет разницу формул, а не сообщает о дефекте. Страж, кричащий на
       * верном коде, будет выключен: в этом дереве так уже случилось трижды.
       *
       * Поэтому нарушением считаются только явные метки, которые сценарий ставит
       * СОЗНАТЕЛЬНО: счётчик «НАРУШЕНИЙ: n» с n больше нуля и маркер «[УТЕЧКА]».
       * Прозаические упоминания расхождений выносятся отдельным списком «стоит
       * посмотреть глазами» и прогон не валят.
       */
      const declaresViolations = declaresViolationsIn(output);
      const mentionsMismatch = /РАСХОЖДЕНИ[ЕЯЙ]|РАЗРЫВ/i.test(output);
      const outcome =
        DATABASE_UNAVAILABLE.test(output) && code !== 0
          ? "база недоступна"
          : code !== 0
            ? "разошлось"
            : declaresViolations
              ? "заявил нарушения (код возврата 0)"
              : "сошлось";
      resolve({ file: relative, outcome, code, output, mentionsMismatch });
    });
  });
}

/** Последняя содержательная строка вывода — то, чем сценарий сам себя итожит. */
function summaryLine(output) {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const verdict = [...lines].reverse().find((line) => /СОШЛИСЬ|РАСХОЖДЕНИ|ШВЫ|разрыв/i.test(line));
  return (verdict ?? lines.at(-1) ?? "(пусто)").slice(0, 160);
}

/*
 * Прогон запускается ТОЛЬКО когда этот файл вызвали напрямую.
 *
 * Без этой проверки самопроверка `scripts/tests/run-chain-proofs.test.mjs`,
 * импортируя отсюда `declaresViolationsIn`, запускала бы все тринадцать сквозных
 * сценариев по живой базе — минуты работы и порча данных вместо проверки одной
 * функции. Сравнение идёт по URL, а не по имени: на Windows `process.argv[1]`
 * приходит как `C:\...`, а `import.meta.url` — как `file:///C:/...`.
 */
const invokedDirectly = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (!invokedDirectly) {
  // Импортирован ради самопроверки: ничего не запускаем, экспорт уже отдан.
} else {

const filter = process.argv[2] ?? "";
const scenarios = collect(testsRoot)
  .filter((file) => file.includes(filter))
  .sort();

if (scenarios.length === 0) {
  console.error(
    filter
      ? `Ни одного сквозного сценария с «${filter}» в имени не найдено под ${testsRoot}.`
      : `Ни одного сквозного сценария не найдено под ${testsRoot}. Ожидались файлы *Proof.ts или tests/chains/*.ts.`,
  );
  process.exit(1);
}

console.log(`Сквозных сценариев: ${scenarios.length}. Идут строго по одному: база одна на всех.\n`);

const results = [];
for (const [index, file] of scenarios.entries()) {
  const relative = path.relative(apiRoot, file).split(path.sep).join("/");
  process.stdout.write(`[${index + 1}/${scenarios.length}] ${relative} … `);
  const result = await runScenario(file);
  results.push(result);
  console.log(`${result.outcome} — ${summaryLine(result.output)}`);
}

const byOutcome = (name) => results.filter((result) => result.outcome === name);
const diverged = [...byOutcome("разошлось"), ...byOutcome("заявил нарушения (код возврата 0)")];
const unavailable = byOutcome("база недоступна");
const timedOut = byOutcome("таймаут");

console.log("\n===== КАРТА ШВОВ =====");
console.log(`сошлось: ${byOutcome("сошлось").length} из ${results.length}`);
if (diverged.length) console.log(`разошлось: ${diverged.map((result) => result.file).join(", ")}`);
if (unavailable.length) console.log(`база недоступна: ${unavailable.map((result) => result.file).join(", ")}`);
if (timedOut.length) console.log(`таймаут: ${timedOut.map((result) => result.file).join(", ")}`);

// Вывод разошедшихся печатается целиком: без него отчёт называет файл, но не
// причину, и разбираться приходится повторным прогоном вручную.
for (const result of diverged) {
  console.log(`\n----- ${result.file} -----`);
  console.log(result.output.trim().split("\n").slice(-40).join("\n"));
}

// Прозаические упоминания расхождений НЕ валят прогон: сценарий мог тут же их и
// свести. Но и молчать о них нельзя — это единственные места, где человек ещё
// нужен, поэтому они называются отдельным списком.
const worthEyeballing = results.filter(
  (result) => result.mentionsMismatch && result.outcome === "сошлось",
);
if (worthEyeballing.length) {
  console.log(
    `
стоит посмотреть глазами (сценарий сошёлся, но говорит о расхождениях): ${worthEyeballing
      .map((result) => result.file)
      .join(", ")}`,
  );
}

if (unavailable.length && !diverged.length && !timedOut.length) {
  console.log(
    "\nЦепочки НЕ проверены: до базы не дошли. Это не поломка сценариев — поднимите PostgreSQL " +
      "(кластер scratch/pgdata на порту 5432) и повторите.",
  );
  process.exitCode = 2;
} else if (diverged.length || timedOut.length) {
  process.exitCode = 1;
}

} // конец ветки «вызван напрямую»
