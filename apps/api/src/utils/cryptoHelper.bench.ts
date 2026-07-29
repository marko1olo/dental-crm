/**
 * Сколько сервер НЕ ОТВЕЧАЕТ НИКОМУ, пока проверяет один пароль.
 *
 * ЧТО ЗДЕСЬ БЫЛО И ПОЧЕМУ ЭТО НЕ ИЗМЕРЯЛО НИЧЕГО. Замер сравнивал
 * «последовательный» и «параллельный» прогоны хеширования. Параллельного прогона
 * не существует: `hashCredential` синхронна, внутри `pbkdf2Sync`, поэтому все
 * пятьдесят хешей считались ещё ДО первого `await` — при построении обещаний. Два
 * числа отличались только накладными расходами на `Promise`, и вывод «параллельно
 * быстрее» был бессмысленным. Вдобавок первая редакция звала `.then()` прямо на
 * строке и падала с `TypeError` — то есть замер не выполнялся ни разу.
 *
 * ЧТО ИЗМЕРЯЕТСЯ ТЕПЕРЬ. Ровно то, что важно клинике: `pbkdf2Sync` БЛОКИРУЕТ ЦИКЛ
 * СОБЫТИЙ. Пока сервер считает один пароль, он не обрабатывает ни одного другого
 * запроса — ни расписание, ни карту приёма, ни печать документа. Поэтому здесь два
 * числа с понятным смыслом:
 *
 *   1. Сколько миллисекунд занимает одна проверка пароля.
 *   2. Насколько уезжает таймер, который обязан срабатывать каждые 5 мс, пока идёт
 *      серия проверок. Это и есть время, на которое сервер оглох.
 *
 * ЗАЧЕМ ЭТО ЗНАТЬ. Если одна проверка стоит десятки миллисекунд, то утренний вход
 * смены — когда весь персонал прикладывается к PIN одновременно — превращается в
 * очередь, где каждый следующий ждёт всех предыдущих. Решение (перевести
 * хеширование на асинхронный `pbkdf2` или в рабочий поток) принимается по ЭТИМ
 * числам, а не по ощущениям.
 *
 * ЗАПУСК: cd apps/api && npx tsx src/utils/cryptoHelper.bench.ts
 */

import { hashCredential, verifyCredential } from "./cryptoHelper.js";

const SAMPLES = 50;
/** Шаг контрольного таймера. 5 мс — заметно меньше одной проверки пароля. */
const TICK_MS = 5;

function measureOnce(): number {
	const started = performance.now();
	const hash = hashCredential("password");
	verifyCredential("password", hash);
	return performance.now() - started;
}

async function main(): Promise<void> {
	// Прогрев: первый вызов платит за подготовку модуля крипто.
	measureOnce();

	const durations: number[] = [];
	for (let index = 0; index < SAMPLES; index += 1) durations.push(measureOnce());
	durations.sort((left, right) => left - right);
	const median = durations[Math.floor(durations.length / 2)] ?? 0;
	const worst = durations.at(-1) ?? 0;
	const total = durations.reduce((sum, value) => sum + value, 0);

	console.log(`Одна проверка пароля: медиана ${median.toFixed(1)} мс, худшая ${worst.toFixed(1)} мс`);
	console.log(`Серия из ${SAMPLES} проверок: ${total.toFixed(0)} мс подряд`);

	/*
	 * Сколько уехал таймер. Он обязан срабатывать каждые 5 мс; всё, что он
	 * проспал, — это время, в которое сервер не мог ответить никому. Замер идёт на
	 * той же серии, а не отдельно: важна именно блокировка, а не скорость
	 * хеширования сама по себе.
	 */
	let ticks = 0;
	let maxLagMs = 0;
	let previous = performance.now();
	const timer = setInterval(() => {
		const now = performance.now();
		maxLagMs = Math.max(maxLagMs, now - previous - TICK_MS);
		previous = now;
		ticks += 1;
	}, TICK_MS);

	await new Promise((resolve) => setTimeout(resolve, 50));
	const blockedFrom = performance.now();
	for (let index = 0; index < SAMPLES; index += 1) measureOnce();
	const blockedMs = performance.now() - blockedFrom;
	await new Promise((resolve) => setTimeout(resolve, 50));
	clearInterval(timer);

	console.log(
		`Контрольный таймер (шаг ${TICK_MS} мс): срабатываний ${ticks}, наибольшая задержка ${maxLagMs.toFixed(0)} мс`,
	);
	console.log(
		`ВЫВОД: пока считаются ${SAMPLES} паролей (${blockedMs.toFixed(0)} мс), сервер не отвечает никому. ` +
			"Утренний вход смены, когда персонал прикладывается к PIN одновременно, выстраивается в очередь ровно на это время.",
	);
	if (maxLagMs > TICK_MS * 4) {
		console.log(
			`ВНИМАНИЕ: цикл событий стоял ${maxLagMs.toFixed(0)} мс при шаге ${TICK_MS} мс — это блокировка, а не загрузка. ` +
				"Хеширование стоит перевести на асинхронный pbkdf2 или в рабочий поток; решение принимать по этим числам.",
		);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
