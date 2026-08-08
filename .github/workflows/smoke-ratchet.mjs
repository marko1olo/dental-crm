#!/usr/bin/env node
/**
 * ХРАПОВИК ПО СМОУКАМ. Роняет сборку на НОВОМ падении и на УСТАРЕВШЕЙ записи.
 *
 * ЗАЧЕМ. До этого файла шаг `smoke:all` в CI не мог заблокировать ничего:
 * `continue-on-error: true`, внутри `set +e`, вывод через `| tee`, последней
 * строкой `exit 0` — четыре независимых глушителя на одном шаге, и задание так
 * и называлось «наблюдение, не блокирует». 126 смоуков выполнялись, печатали
 * `FAILED ...` в сводку и не влияли на исход. Это хуже неподключённого гейта:
 * неподключённый честно отсутствует, а этот создаёт видимость покрытия.
 *
 * ПОЧЕМУ ХРАПОВИК, А НЕ ПРОСТО СНЯТЬ ГЛУШИТЕЛИ. Часть смоуков падает по
 * причинам, не связанным с кодом: по замеру в шапке ci.yml, 10 скриптов зашивают
 * путь к msedge.exe и на Linux не найдут его никогда, 15 ждут сервер на
 * 127.0.0.1. Снять глушители разом — значит получить вечно красную сборку,
 * которую немедленно начнут игнорировать, и проверка снова станет декоративной,
 * только другим способом. Храповик фиксирует текущий долг поимённо и запрещает
 * его РОСТ, оставляя сокращение свободным.
 *
 * ПОЧЕМУ ПО СОСТАВУ, А НЕ ПО ЧИСЛУ. Счётчик не дрогнет, если починить один
 * смоук и одновременно сломать другой: было 30 и стало 30. Сверяется именно
 * состав множества. Тот же принцип уже применён в api-test-ratchet.mjs этого
 * репозитория и в LLVM lit (`--xfail-not-from-file`), где список ожидаемых
 * падений точно так же обязан совпадать поимённо.
 *
 * ПОЧЕМУ УСТАРЕВШАЯ ЗАПИСЬ — ТОЖЕ ОТКАЗ. Запись, которая больше не падает,
 * означает починенный смоук, не выведенный из списка долга. Оставить её — значит
 * разрешить обратное сползание: завтра тот же смоук сломают, и храповик
 * промолчит, потому что падение «ожидаемо». Список долга обязан быть точным в
 * обе стороны.
 */

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const get = (flag) => {
	const i = args.indexOf(flag);
	return i >= 0 ? args[i + 1] : null;
};
const logPath = get("--log");
const ceilingPath = get("--ceiling");
const accept = args.includes("--accept");

if (!logPath || !ceilingPath) {
	console.error(
		"Использование: smoke-ratchet.mjs --log <файл> --ceiling <файл> [--accept]",
	);
	process.exit(2);
}

let log;
try {
	log = readFileSync(logPath, "utf8");
} catch (error) {
	console.error(
		`Лог прогона не прочитан: ${logPath}\n` +
			`${error.message}\n` +
			"Отсутствие лога — это ОТКАЗ, а не пропуск: без лога храповик не может " +
			"отличить «всё прошло» от «прогон не стартовал».",
	);
	process.exit(1);
}

/*
 * Строка итога обязательна. Её отсутствие означает, что прогон не дошёл до
 * конца — упал runner, сработал таймаут, кончилось место. Считать такой прогон
 * успешным нельзя: ноль найденных падений и несостоявшийся прогон выглядят
 * ОДИНАКОВО, если не требовать признака завершения.
 */
const summary = log.match(/^SUMMARY total=(\d+) failed=(\d+)/m);
if (!summary) {
	console.error(
		"В логе нет строки SUMMARY — прогон не дошёл до конца.\n" +
			"Это отказ: незавершённый прогон неотличим от чистого, если не " +
			"проверять признак завершения.",
	);
	process.exit(1);
}

const total = Number(summary[1]);
const failedCount = Number(summary[2]);

/* Имя смоука берётся из строк `FAILED <имя> code=<...> signal=<...>`. */
const actualFailed = new Set(
	[...log.matchAll(/^FAILED (\S+) code=/gm)].map((m) => m[1]),
);

if (actualFailed.size !== failedCount) {
	console.error(
		`Расхождение внутри лога: SUMMARY заявляет failed=${failedCount}, ` +
			`строк FAILED найдено ${actualFailed.size}.\n` +
			"Разбор лога ненадёжен — храповик отказывается выносить вердикт по " +
			"данным, которым сам не доверяет.",
	);
	process.exit(1);
}

let ceiling;
try {
	ceiling = JSON.parse(readFileSync(ceilingPath, "utf8"));
} catch (error) {
	console.error(`Файл потолка не прочитан: ${ceilingPath}\n${error.message}`);
	process.exit(1);
}

const known = new Set(ceiling.failing ?? []);

if (accept) {
	const next = {
		...ceiling,
		_замер: `Принято --accept: всего ${total}, падает ${actualFailed.size}.`,
		calibrated: true,
		failing: [...actualFailed].sort(),
	};
	writeFileSync(ceilingPath, `${JSON.stringify(next, null, "\t")}\n`);
	console.log(
		`Потолок перезаписан: ${actualFailed.size} записей из ${total} смоуков.`,
	);
	process.exit(0);
}

if (ceiling.calibrated !== true) {
	console.log(
		"Храповик НЕ ОТКАЛИБРОВАН (calibrated=false): печатаю числа и не роняю " +
			"сборку.\n" +
			`Всего смоуков ${total}, падает ${actualFailed.size}.\n\n` +
			"Готовый список для вставки в поле failing:\n" +
			`${JSON.stringify([...actualFailed].sort(), null, "\t")}\n\n` +
			"Вставьте его, переключите calibrated в true — и храповик станет " +
			"блокирующим.",
	);
	process.exit(0);
}

const isNew = [...actualFailed].filter((name) => !known.has(name)).sort();
const isStale = [...known].filter((name) => !actualFailed.has(name)).sort();

if (isNew.length === 0 && isStale.length === 0) {
	console.log(
		`Храповик держит: всего смоуков ${total}, падает ${actualFailed.size}, ` +
			"состав совпадает с потолком поимённо.",
	);
	process.exit(0);
}

if (isNew.length > 0) {
	console.error(`НОВЫЕ ПАДЕНИЯ — ${isNew.length}. Это рост долга:\n`);
	for (const name of isNew) console.error(`  ${name}`);
	console.error(
		"\nПочинить смоук или, если падение вызвано обстановкой runner, а не " +
			"кодом, — внести запись в потолок ОТДЕЛЬНЫМ коммитом с обоснованием. " +
			"Правка потолка ради зелёного без разбора причины выключает проверку.\n",
	);
}

if (isStale.length > 0) {
	console.error(`УСТАРЕВШИЕ ЗАПИСИ — ${isStale.length}. Эти смоуки больше НЕ падают:\n`);
	for (const name of isStale) console.error(`  ${name}`);
	console.error(
		"\nВыведите их из потолка: `node .github/workflows/smoke-ratchet.mjs " +
			"--log <лог> --ceiling <файл> --accept`.\n" +
			"Пока запись висит, повторная поломка этого смоука пройдёт молча — " +
			"падение будет числиться ожидаемым.\n",
	);
}

console.error(
	`Итог: всего ${total}, падает ${actualFailed.size}, в потолке ${known.size}.`,
);
process.exit(1);
