import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	actionFailureToast,
	NO_RESPONSE_CAUSE,
	type PanelSubject,
	panelRetryLabel,
	panelStateText,
	requestFailureCause,
	resolvePanelPhase,
	unconfirmedActionToast,
} from "./panelStateText.js";

/**
 * Три состояния панели — три разных текста, и ни в одном нет ни английского
 * исключения, ни кода ответа сервера.
 *
 * ЧТО ПРОВЕРЯЕТСЯ ПО ПАМЯТИ О КОНКРЕТНЫХ ДЕФЕКТАХ
 *
 * 1. hooks/usePatientResource.ts печатал «Сервер ответил ошибкой 500. Данные не
 *    загружены.» — голый код состояния уходил человеку. Здесь ни одна строка
 *    не имеет права содержать цифру кода.
 * 2. Экран аналитики однажды напечатал «Failed to execute 'json' on
 *    'Response': Unexpected end of JSON input» как всё своё содержимое. Здесь
 *    ни одна строка не имеет права содержать латиницу.
 * 3. Отказ выдавался за пустоту: «Рекламации и осложнения отсутствуют» при
 *    упавшем чтении. Поэтому три состояния обязаны давать три РАЗНЫХ текста.
 * 4. Согласование по числу. Модуль сам дописывал «не загружены» к названию
 *    панели, и работало это только потому, что все три названия тогдашних
 *    панелей были множественного числа. Название в единственном («Статус»)
 *    давало «Статус не загружены» — безграмотную строку прямо на экране врача.
 *    Поэтому ниже проверяется панель с названием в единственном числе.
 * 5. Кнопка, которая не может сдержать обещание. Признак повтора был
 *    `retryable: boolean` и при отказе всегда `true`, а сама кнопка рисовалась
 *    по факту наличия обработчика — то есть «Повторить» стояло рядом с
 *    «сервер не знает такого раздела», где повтор того же запроса не поможет
 *    никогда. Проверяется, что подпись есть ровно там, где повтор осмыслен.
 */

const SUBJECT: PanelSubject = {
	notLoadedTitle: "Рекламации и осложнения не загружены",
	accusative: "рекламации и осложнения по пациенту",
	emptyTitle: "Рекламации и осложнения отсутствуют",
	emptyHint:
		"Если пациент жалуется на результат лечения, зафиксируйте это здесь.",
	failureConsequence: "Не считайте, что осложнений нет: журнал не прочитан.",
};

/**
 * Панель, название которой стоит в ЕДИНСТВЕННОМ числе. Взято с живой панели
 * карточки пациента (components/patients/PatientArchiveAndBlacklistWidget.tsx):
 * именно на таком названии прежний контракт выдавал «Статус блокировки записи
 * не загружены».
 */
const SINGULAR_SUBJECT: PanelSubject = {
	notLoadedTitle: "Статус блокировки записи не прочитан",
	accusative: "статус блокировки записи",
	emptyTitle: "Запись пациенту разрешена",
	emptyHint:
		"Если пациент трижды не пришёл без предупреждения, закройте ему самозапись здесь.",
	failureConsequence: "Не считайте, что блокировки нет: статус не прочитан.",
};

/** Коды, которые действительно приходят от Fastify в этом проекте, плюс граничные. */
const STATUSES = [
	0, 400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503, 504, 301, 418,
];

const LATIN = /[A-Za-z]/;
const DIGIT = /[0-9]/;

/* ------------------------------------------------------------------ */
/*  Само правило выбора состояния — то, в чём и была ошибка            */
/* ------------------------------------------------------------------ */

test("упавшее чтение НИКОГДА не показывается как пустой список", () => {
	// Ровно тот случай, который печатал «Рекламации и осложнения отсутствуют»:
	// запрос завершён, список пуст — потому что его не удалось прочитать.
	assert.equal(
		resolvePanelPhase({ isLoading: false, hasFailure: true, isEmpty: true }),
		"failed",
	);
	// И при отказе на непустом списке (перечитывание после мутации) — тоже отказ.
	assert.equal(
		resolvePanelPhase({ isLoading: false, hasFailure: true, isEmpty: false }),
		"failed",
	);
});

test("незавершённая загрузка не утверждает, что данных нет", () => {
	assert.equal(
		resolvePanelPhase({ isLoading: true, hasFailure: false, isEmpty: true }),
		"loading",
	);
});

test("честная пустота остаётся пустотой", () => {
	assert.equal(
		resolvePanelPhase({ isLoading: false, hasFailure: false, isEmpty: true }),
		"empty",
	);
});

test("обновление при уже показанных данных не гасит их", () => {
	assert.equal(
		resolvePanelPhase({ isLoading: true, hasFailure: false, isEmpty: false }),
		"ready",
	);
	assert.equal(
		resolvePanelPhase({ isLoading: false, hasFailure: false, isEmpty: false }),
		"ready",
	);
});

test("все восемь комбинаций дают ровно одно состояние, и отказ не совпадает с пустотой", () => {
	const seen = new Map<string, string>();
	for (const isLoading of [false, true]) {
		for (const hasFailure of [false, true]) {
			for (const isEmpty of [false, true]) {
				const phase = resolvePanelPhase({ isLoading, hasFailure, isEmpty });
				seen.set(`${isLoading}/${hasFailure}/${isEmpty}`, phase);
				if (hasFailure) assert.equal(phase, "failed");
				else assert.notEqual(phase, "failed");
			}
		}
	}
	assert.equal(seen.size, 8);
});

/* ------------------------------------------------------------------ */
/*  Тексты состояний                                                   */
/* ------------------------------------------------------------------ */

test("загрузка, пустота и отказ дают три разных текста", () => {
	const loading = panelStateText(SUBJECT, { phase: "loading" });
	const empty = panelStateText(SUBJECT, { phase: "empty" });
	const failed = panelStateText(SUBJECT, { phase: "failed", status: 500 });

	const titles = new Set([loading.title, empty.title, failed.title]);
	assert.equal(titles.size, 3, "три состояния обязаны звучать по-разному");

	const hints = new Set([loading.hint, empty.hint, failed.hint]);
	assert.equal(
		hints.size,
		3,
		"подсказка «что делать» тоже своя у каждого состояния",
	);

	assert.equal(loading.phase, "loading");
	assert.equal(empty.phase, "empty");
	assert.equal(failed.phase, "failed");
});

test("кнопки повтора нет ни при загрузке, ни при честной пустоте", () => {
	assert.equal(panelStateText(SUBJECT, { phase: "loading" }).retryLabel, null);
	assert.equal(panelStateText(SUBJECT, { phase: "empty" }).retryLabel, null);
	// Отсутствие ответа — единственный случай, когда повтор помогает чаще всего:
	// сервер клиники запустили, сеть вернулась.
	assert.equal(
		panelStateText(SUBJECT, { phase: "failed", status: null }).retryLabel,
		"Повторить",
	);
});

test("там, где тот же запрос не может ответить иначе, кнопки повтора нет вовсе", () => {
	// 404 — раздела на сервере нет: программа клиники обновлена не полностью.
	// 400 и 422 — запрос серверу не подходит. 413 — запрос для него велик.
	// Повтор ОДНОГО И ТОГО ЖЕ запроса во всех четырёх случаях даст тот же отказ.
	for (const status of [400, 404, 413, 422]) {
		assert.equal(
			panelStateText(SUBJECT, { phase: "failed", status }).retryLabel,
			null,
			`повтор предложен там, где он не сработает никогда: ${status}`,
		);
	}
});

test("после отказа по доступу подпись кнопки говорит про вход, а не «Повторить»", () => {
	// Повтор здесь осмыслен, но лишь ПОСЛЕ входа. Голое «Повторить» рядом с
	// «войдите в смену заново» выглядит альтернативой входу, и оператор жмёт
	// кнопку вместо того, чтобы войти.
	for (const status of [401, 403]) {
		const label = panelStateText(SUBJECT, {
			phase: "failed",
			status,
		}).retryLabel;
		assert.ok(label, `нет подписи кнопки для ${status}`);
		assert.match(
			label,
			/вош|вход/i,
			`подпись кнопки не упоминает вход: ${label} (${status})`,
		);
	}
});

test("если кнопки нет, следующий шаг остаётся в самом тексте отказа", () => {
	// Требование §3: экран без единого действия — тупик. Там, где кнопку
	// показывать нельзя, текст обязан называть шаг, которому кнопка не нужна:
	// «сообщите администратору», «уменьшите объём», «попросите администратора».
	const stepWithoutButton = /(сообщите|уменьшите|попросите)/;
	for (const status of [...STATUSES, null]) {
		const failed = panelStateText(SUBJECT, { phase: "failed", status });
		if (failed.retryLabel !== null) continue;
		assert.match(
			failed.title,
			stepWithoutButton,
			`кнопки нет и шага без кнопки в тексте тоже нет: ${failed.title}`,
		);
	}
});

test("подпись кнопки повтора — по-русски, без кода ответа и с большой буквы", () => {
	for (const status of [...STATUSES, null]) {
		const label = panelRetryLabel(status);
		if (label === null) continue;
		assert.ok(!LATIN.test(label), `латиница в подписи кнопки: ${label}`);
		assert.ok(!DIGIT.test(label), `цифра в подписи кнопки: ${label}`);
		assert.equal(
			label[0],
			label[0]?.toUpperCase(),
			`подпись кнопки со строчной буквы: ${label}`,
		);
	}
});

test("panelStateText не дописывает к названию НИ ОДНОГО своего слова", () => {
	// Ровно та ошибка, из-за которой контракт и переименован: раньше модуль
	// склеивал `${subject.title} не загружены`, и согласование зависело от него.
	for (const subject of [SUBJECT, SINGULAR_SUBJECT]) {
		for (const status of [...STATUSES, null]) {
			const failed = panelStateText(subject, { phase: "failed", status });
			assert.equal(
				failed.title,
				`${subject.notLoadedTitle}: ${requestFailureCause(status)}.`,
				`заголовок отказа собран не из notLoadedTitle: ${failed.title}`,
			);
		}
	}
});

test("панель с названием в единственном числе не получает «не загружены»", () => {
	// «Статус блокировки записи не загружены» — именно это и уходило врачу.
	for (const status of [...STATUSES, null]) {
		const failed = panelStateText(SINGULAR_SUBJECT, {
			phase: "failed",
			status,
		});
		assert.ok(
			!failed.title.includes("не загружены"),
			`согласование по числу сломано: ${failed.title}`,
		);
		assert.ok(
			failed.title.startsWith("Статус блокировки записи не прочитан"),
			`отказ начинается не с согласованной строки панели: ${failed.title}`,
		);
	}
});

test("пустота никогда не звучит как отказ и наоборот", () => {
	const empty = panelStateText(SUBJECT, { phase: "empty" });
	const failed = panelStateText(SUBJECT, { phase: "failed", status: 500 });
	assert.equal(empty.title, SUBJECT.emptyTitle);
	assert.ok(
		!failed.title.includes(SUBJECT.emptyTitle),
		"текст отказа не должен утверждать, что данных нет",
	);
	assert.equal(failed.hint, SUBJECT.failureConsequence);
});

test("ни одна причина отказа не содержит кода состояния и латиницы", () => {
	for (const status of STATUSES) {
		const cause = requestFailureCause(status);
		assert.ok(cause.length > 0, `пустая причина для ${status}`);
		assert.ok(
			!DIGIT.test(cause),
			`код состояния утёк в текст для ${status}: ${cause}`,
		);
		assert.ok(!LATIN.test(cause), `латиница в тексте для ${status}: ${cause}`);
		assert.ok(
			!cause.includes(String(status)),
			`номер ${status} виден человеку: ${cause}`,
		);
	}
});

test("ни один заголовок отказа не содержит кода состояния и латиницы", () => {
	for (const status of [...STATUSES, null]) {
		const failed = panelStateText(SUBJECT, { phase: "failed", status });
		assert.ok(
			!DIGIT.test(failed.title),
			`цифра в заголовке отказа: ${failed.title}`,
		);
		assert.ok(
			!LATIN.test(failed.title),
			`латиница в заголовке отказа: ${failed.title}`,
		);
	}
});

test("тексты загрузки и пустоты тоже без латиницы и цифр", () => {
	const loading = panelStateText(SUBJECT, { phase: "loading" });
	const empty = panelStateText(SUBJECT, { phase: "empty" });
	for (const line of [loading.title, loading.hint, empty.title, empty.hint]) {
		assert.ok(!LATIN.test(line), `латиница: ${line}`);
		assert.ok(!DIGIT.test(line), `цифра: ${line}`);
	}
});

test("отсутствие ответа — отдельная причина, а не «сервер ответил»", () => {
	assert.equal(requestFailureCause(null), NO_RESPONSE_CAUSE);
	assert.equal(requestFailureCause(0), NO_RESPONSE_CAUSE);
	assert.notEqual(requestFailureCause(500), NO_RESPONSE_CAUSE);
});

test("нет доступа, конфликт и сбой сервера объясняются по-разному", () => {
	const denied = requestFailureCause(403);
	const conflict = requestFailureCause(409);
	const serverDown = requestFailureCause(503);
	assert.equal(new Set([denied, conflict, serverDown]).size, 3);
	assert.equal(
		requestFailureCause(401),
		denied,
		"401 и 403 — одна и та же беда для оператора",
	);
});

test("каждая причина говорит, что делать дальше", () => {
	// Действие названо глаголом в повелительном наклонении: «повторите»,
	// «обновите», «войдите», «подождите», «сообщите», «уменьшите», «проверьте».
	const imperative =
		/(повторите|обновите|войдите|подождите|сообщите|уменьшите|проверьте|попросите)/;
	for (const status of [...STATUSES, null]) {
		const cause = requestFailureCause(status);
		assert.match(cause, imperative, `нет действия для человека: ${cause}`);
	}
});

test("уведомление о неудавшемся действии называет действие и не показывает код", () => {
	const toast = actionFailureToast("Задача не создана", 500);
	assert.ok(toast.startsWith("Задача не создана: "), toast);
	assert.ok(!DIGIT.test(toast), toast);
	assert.ok(!LATIN.test(toast), toast);
});

test("неподтверждённое действие звучит иначе, чем отказ", () => {
	const failed = actionFailureToast("Блокировка записи не снята", 500);
	const unconfirmed = unconfirmedActionToast("Блокировка записи не снята");
	assert.notEqual(failed, unconfirmed);
	assert.ok(!DIGIT.test(unconfirmed), unconfirmed);
	assert.ok(!LATIN.test(unconfirmed), unconfirmed);
	// «Повторить» после неподтверждённой записи опаснее, чем «проверить».
	assert.match(unconfirmed, /проверьте/);
});

/* ------------------------------------------------------------------ */
/*  Все панели проекта разом                                           */
/*                                                                     */
/*  Проверки выше держат сам модуль. Эта — держит его пользователей:    */
/*  контракт переименовали, и десять панелей чинили по одной. Панель,   */
/*  забытая при таком переносе, роняет только сборку — а панель,        */
/*  перенесённая механически (в notLoadedTitle положили прежнее         */
/*  НАЗВАНИЕ вместо согласованной строки), собирается молча и печатает  */
/*  врачу «Снимки пациента: сервер не ответил.» — предложение без       */
/*  сказуемого. Компилятор такого не видит; видит только это.          */
/* ------------------------------------------------------------------ */

const WEB_SRC_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

/**
 * Все .ts/.tsx фронтенда, КРОМЕ самих тестов. Читается с диска: списка панелей
 * нигде не объявлено, и объявлять его здесь нельзя — забытая панель как раз и
 * не попала бы в такой список.
 *
 * Тесты исключены не для смягчения правила: строка-маркер ниже написана в этом
 * файле буквально, поэтому сканер находил бы сам себя и падал на собственном
 * исходнике. Панели-образцы в тестах врачу не показываются.
 */
function webSourceFiles(): string[] {
	return readdirSync(WEB_SRC_DIR, { recursive: true, encoding: "utf8" })
		.filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
		.filter(
			(entry) => !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx"),
		)
		.map((entry) => path.join(WEB_SRC_DIR, entry));
}

/** Тело каждого литерала `…: PanelSubject = { … }` вместе с путём файла. */
function panelSubjectLiterals(): Array<{ file: string; body: string }> {
	const marker = "PanelSubject = {";
	const found: Array<{ file: string; body: string }> = [];
	for (const file of webSourceFiles()) {
		const source = readFileSync(file, "utf8");
		let from = source.indexOf(marker);
		while (from !== -1) {
			const start = from + marker.length;
			// Литералы объявлены на верхнем уровне модуля, поэтому закрывающая
			// скобка стоит в первой колонке. Если её нет — это не тот случай, и
			// молча пропускать его нельзя.
			const end = source.indexOf("\n};", start);
			assert.notEqual(
				end,
				-1,
				`не найден конец литерала PanelSubject в ${file}`,
			);
			found.push({
				file: path.relative(WEB_SRC_DIR, file),
				body: source.slice(start, end),
			});
			from = source.indexOf(marker, end);
		}
	}
	return found;
}

test("у каждой панели проекта есть notLoadedTitle и не осталось прежнего title", () => {
	const literals = panelSubjectLiterals();
	// Панелей на переименовании было ровно десять. Порог на единицу ниже: одна
	// удалённая панель — это законное изменение, а ноль или один найденный литерал
	// означает сломанное сканирование, при котором весь этот тест ничего не держит
	// и молча «проходит».
	assert.ok(
		literals.length >= 9,
		`литералов PanelSubject найдено ${literals.length} — сканирование не работает`,
	);
	for (const { file, body } of literals) {
		assert.match(body, /\bnotLoadedTitle:/, `нет notLoadedTitle: ${file}`);
		assert.ok(
			!/^\s*title:/m.test(body),
			`осталось прежнее поле title — переименование в этом файле не доведено: ${file}`,
		);
	}
});

test("ни одна панель не подставляет в notLoadedTitle просто своё название", () => {
	// Согласованная строка — это предложение с отрицанием: «… не загружены»,
	// «… не прочитан». Голое название («Снимки пациента») собирается, но на
	// экране даёт обрубок, потому что модуль больше ничего не дописывает.
	const refusalClause = /\sне\s+[а-яё]+/i;
	for (const { file, body } of panelSubjectLiterals()) {
		const value = /\bnotLoadedTitle:\s*(["'])([^"']+)\1/.exec(body);
		assert.ok(
			value,
			`notLoadedTitle не разобран как строковый литерал: ${file}`,
		);
		const clause = value[2] as string;
		assert.match(
			clause,
			refusalClause,
			`notLoadedTitle — это название, а не предложение об отказе: «${clause}» (${file})`,
		);
		assert.ok(
			!clause.endsWith(":") && !clause.endsWith("."),
			`notLoadedTitle со знаком препинания на конце — модуль ставит его сам: «${clause}» (${file})`,
		);
	}
});
