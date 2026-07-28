import assert from "node:assert/strict";
import test from "node:test";
import {
	NO_RESPONSE_CAUSE,
	actionFailureToast,
	panelStateText,
	requestFailureCause,
	resolvePanelPhase,
	unconfirmedActionToast,
	type PanelSubject,
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
 */

const SUBJECT: PanelSubject = {
	title: "Рекламации и осложнения",
	accusative: "рекламации и осложнения по пациенту",
	emptyTitle: "Рекламации и осложнения отсутствуют",
	emptyHint: "Если пациент жалуется на результат лечения, зафиксируйте это здесь.",
	failureConsequence: "Не считайте, что осложнений нет: журнал не прочитан.",
};

/** Коды, которые действительно приходят от Fastify в этом проекте, плюс граничные. */
const STATUSES = [0, 400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503, 504, 301, 418];

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
	assert.equal(hints.size, 3, "подсказка «что делать» тоже своя у каждого состояния");

	assert.equal(loading.phase, "loading");
	assert.equal(empty.phase, "empty");
	assert.equal(failed.phase, "failed");
});

test("повторить предлагается только при отказе", () => {
	assert.equal(panelStateText(SUBJECT, { phase: "loading" }).retryable, false);
	assert.equal(panelStateText(SUBJECT, { phase: "empty" }).retryable, false);
	assert.equal(panelStateText(SUBJECT, { phase: "failed", status: null }).retryable, true);
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
		assert.ok(!DIGIT.test(cause), `код состояния утёк в текст для ${status}: ${cause}`);
		assert.ok(!LATIN.test(cause), `латиница в тексте для ${status}: ${cause}`);
		assert.ok(!cause.includes(String(status)), `номер ${status} виден человеку: ${cause}`);
	}
});

test("ни один заголовок отказа не содержит кода состояния и латиницы", () => {
	for (const status of [...STATUSES, null]) {
		const failed = panelStateText(SUBJECT, { phase: "failed", status });
		assert.ok(!DIGIT.test(failed.title), `цифра в заголовке отказа: ${failed.title}`);
		assert.ok(!LATIN.test(failed.title), `латиница в заголовке отказа: ${failed.title}`);
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
	assert.equal(requestFailureCause(401), denied, "401 и 403 — одна и та же беда для оператора");
});

test("каждая причина говорит, что делать дальше", () => {
	// Действие названо глаголом в повелительном наклонении: «повторите»,
	// «обновите», «войдите», «подождите», «сообщите», «уменьшите», «проверьте».
	const imperative = /(повторите|обновите|войдите|подождите|сообщите|уменьшите|проверьте|попросите)/;
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
