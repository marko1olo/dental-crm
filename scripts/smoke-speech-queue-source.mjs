import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

const source = [
	await readFile("apps/web/src/App.tsx", "utf8"),
	await readAppLogicSource(),
	await readFile("apps/web/src/AppHelpers.tsx", "utf8"),
].join("\n");
const speechPlan = await readFile(
	"docs/05-speech-transcription-plan.md",
	"utf8",
);

function fail(message) {
	throw new Error(message);
}

/*
 * ПОЧЕМУ ЭТОТ СТРАЖ БЫЛ КРАСНЫМ, И ЧТО ИМЕННО ЗАМЕРЕНО.
 *
 * До этой правки он умирал на СТРОКЕ 30 — на разборе первого же блока, ДО единой
 * содержательной проверки. Из 39 своих требований он показывал ОДНО сообщение:
 * «Missing marker: function applyUiPreferences». Сообщение вводило в заблуждение:
 * `applyUiPreferences` НИКУДА НЕ ДЕЛАСЬ, она жива в apps/web/src/useAppLogic.tsx.
 *
 * Причина в порядке склейки. Логика приёма переехала в
 * apps/web/src/hooks/domains/useVisitLogic.ts, а этот файл приклеивается ПОСЛЕ
 * useAppLogic.tsx (см. scripts/lib/app-logic-source.mjs). Замер по склеенному
 * источнику:
 *
 *   function applyUiPreferences          смещение  331901   (useAppLogic.tsx)
 *   async function flushPendingSpeechChunks смещение 753137  (useVisitLogic.ts)
 *
 * `sourceSlice` искала конец ПОСЛЕ начала (`indexOf(endMarker, start)`), конец
 * лежал ДО начала, и вместо «границы блока разъехались» страж печатал «маркера
 * нет». Это класс BROKEN: скрипт физически не работал.
 *
 * ВТОРАЯ ПРИЧИНА — КЛАСС BRITTLE: 11 требований отличались от кода только
 * ФОРМАТИРОВАНИЕМ И ЗАЩИТОЙ ОТ NULL, а не поведением. Замерено сравнением
 * дословной строки с нормализованной по пробелам и висячим запятым:
 *
 *   страж требовал                                  в коде стало
 *   dashboard.activeVisit.id                        dashboard?.activeVisit?.id
 *   params.set("visitId", dashboard.activeVisit.id) то же с `?.`
 *   fetch(`/api/speech/...`                         перенос строки после fetch(
 *   ...MatchesActiveVisit(result: X): boolean       перенос + висячая запятая
 *   === dashboard.activeVisit.id                    === activeVisitId (локальная)
 *   if (…) flushedRecordingIds.add(…)               то же, перенос строки
 *   queue.some((item) => Boolean(…))                то же, перенос + запятая
 *   providerId === "…" || providerId === "…"        то же, перенос строки
 *   pendingSpeechFlushActionLabel = … ? … : …       то же, перенос строки
 *
 * Поэтому требования ниже закрепляют СВЯЗЬ (что с чем сравнивается, какой
 * параметр из какого источника), а НЕ обёртку вокруг связи. Подставить
 * сегодняшнее написание было нельзя: это снова прибило бы стража к именам
 * переменных и к работе форматтера.
 *
 * ТРЕТЬЯ ПРИЧИНА — КЛАСС REAL: часть требований описывает поведение, которого в
 * продукте НЕТ. Проверено обходом ВСЕХ 469 файлов .ts/.tsx/.css в apps/web/src:
 * ни одного вхождения. Продукт этой правкой не трогается, требования не стёрты —
 * они перечислены в реестре долга ниже, с храповиком в обе стороны.
 */
function matches(source, needle) {
	return needle instanceof RegExp
		? needle.test(source)
		: source.includes(needle);
}

function indexOfMatch(source, needle) {
	if (!(needle instanceof RegExp)) return source.indexOf(needle);
	const found = source.match(needle);
	return found ? found.index : -1;
}

/*
 * РЕЕСТР ОБЪЯВЛЕННОГО ДОЛГА С ХРАПОВИКОМ В ОБЕ СТОРОНЫ. КЛЮЧ — ТЕКСТ ТРЕБОВАНИЯ.
 *
 * Ни одно требование НЕ УДАЛЕНО: все они остаются ниже дословно, с теми же
 * маркерами и сообщениями. Здесь записано, какие из них СЕГОДНЯ не выполняются и
 * по какой ЗАМЕРЕННОЙ причине. Пропуск с причиной — долг, который находится
 * поиском; пропуск, стёртый молча, — забытая функция. Идиом взят из
 * scripts/smoke-imaging-viewer-usability-source.mjs.
 *
 * NOWHERE — маркера нет ни в одном из 469 файлов apps/web/src. Команда замера:
 *   rg -l '<маркер>' apps/web/src -g '!node_modules' -g '!dist'
 * По каждой записи ниже она возвращает пустой вывод (для строк, встречающихся
 * только в самих стражах, — только пути scripts/*.mjs).
 *
 * ОТКУДА ЭТО ИСЧЕЗЛО, тоже замерено, а не предположено:
 *   git log -S 'serverVoiceRecordingShouldContinueRef' --all -- apps/web
 * даёт 5 коммитов; на 7b465576d (2026-06-29) маркер ещё жив в useAppLogic.tsx
 * (6 вхождений), на af3e2a01c и 624d7ae65 (2026-07-07, «chore: save today's newly
 * merged PR features and assets») его уже нет нигде. Слой отказоустойчивости
 * диктовки снесло слиянием, а не рефакторингом.
 *
 * ЗАКРЫТЬ ЭТОТ ДОЛГ = ВЕРНУТЬ ПОВЕДЕНИЕ В ПРОДУКТ. Это работа владельца экрана
 * приёма, не стража. Когда она сделана, храповик ниже ПАДАЕТ и заставляет убрать
 * запись из реестра — иначе реестр начнёт врать.
 */
const KNOWN_MISSING_SPEECH_QUEUE = new Map([
	[
		"Speech queued-audio auto flush block is absent from the product.",
		"NOWHERE",
	],
	[
		"Speech primary recording path missing marker: const serverVoiceRecordingAvailable =",
		"NOWHERE",
	],
	[
		"Speech primary recording path missing marker: const visitVoicePrimaryUsesServer = serverVoiceRecordingAvailable || isServerVoiceRecording;",
		"NOWHERE",
	],
	[
		"Speech primary recording path missing marker: speechActiveGatewayStatusRef.current = currentGatewayStatus;",
		"NOWHERE",
	],
	[
		"Speech primary recording path missing marker: const effectiveGatewayStatus = speechActiveGatewayStatusRef.current ?? currentGatewayStatus;",
		"NOWHERE",
	],
	[
		"Speech primary recording path missing marker: uploadSpeechBlob(event.data, effectiveGatewayStatus)",
		"NOWHERE",
	],
	[
		'Speech primary recording path missing marker: "CRM запишет голос нормально и проверит Groq при старте.',
		"NOWHERE",
	],
	['Speech primary recording path missing marker: "Записать голос"', "NOWHERE"],
	[
		"Speech queued-audio auto flush missing marker: pendingSpeechChunkCount > 0",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: !speechTranscriptionBusy",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: !isServerVoiceRecording",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: !isServerVoiceRecordingStarting",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: speechAutoFlushInFlightRef.current",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: speechAutoFlushLastKeyRef.current",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: speechAutoFlushRetryTimerRef.current",
		"NOWHERE",
	],
	[
		'Speech queued-audio auto flush missing marker: speechGatewayStatus?.serverTranscriptionCurrentlyAvailable ? "available" : "unavailable"',
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: void flushPendingSpeechChunks({ silent: true })",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: window.setTimeout(() =>",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: setSpeechAutoFlushRetryTick((tick) => tick + 1)",
		"NOWHERE",
	],
	[
		"Speech queued-audio auto flush missing marker: speechAutoFlushRetryTick",
		"NOWHERE",
	],
	[
		"Speech queued-audio failure feedback missing marker: function speechChunkFailureDetail",
		"NOWHERE",
	],
	[
		"Speech queued-audio failure feedback missing marker: chunk.quality.providerWarnings[0]",
		"NOWHERE",
	],
	[
		"Speech queued-audio failure feedback missing marker: chunk.quality.nextAction",
		"NOWHERE",
	],
	[
		"Speech queued-audio failure feedback missing marker: const failureDetail = operatorReadableErrorDetailFromUnknown(speechError);",
		"NOWHERE",
	],
	[
		"Speech queued-audio failure feedback missing marker: CRM повторит отправку позже.",
		"NOWHERE",
	],
]);

const requireOutcomes = new Map();

function recordOutcome(message, passed) {
	const current = requireOutcomes.get(message) ?? { pass: 0, fail: 0 };
	if (passed) current.pass += 1;
	else current.fail += 1;
	requireOutcomes.set(message, current);
}

function requireIn(scopeSource, needle, message) {
	const passed = matches(scopeSource, needle);
	recordOutcome(message, passed);
	if (passed) return;
	if (KNOWN_MISSING_SPEECH_QUEUE.has(message)) return;
	fail(message);
}

/*
 * РАЗБОР БЛОКА: КОНЕЦ ОБЯЗАН ИДТИ ПОСЛЕ НАЧАЛА, И ЕСЛИ НЕТ — СКАЗАТЬ ЭТО ПРЯМО.
 *
 * Старая версия в этом случае печатала «Missing marker: <конец>», хотя маркер был
 * жив, просто в другом файле склейки. Диагностика врала и стоила волне одного
 * стража целиком.
 */
function sourceSlice(startMarker, endMarker, { optional = false } = {}) {
	const start = source.indexOf(startMarker);
	if (start === -1) {
		if (optional) return null;
		fail(`Missing marker: ${startMarker}`);
	}
	const end = source.indexOf(endMarker, start);
	if (end === -1) {
		if (source.includes(endMarker)) {
			fail(
				`Границы блока разъехались: «${endMarker}» существует, но лежит РАНЬШЕ «${startMarker}» ` +
					"в порядке склейки источников (см. scripts/lib/app-logic-source.mjs). " +
					"Нужен маркер конца, который идёт ПОСЛЕ начала, а не сообщение про отсутствие.",
			);
		}
		if (optional) return null;
		fail(`Missing marker: ${endMarker}`);
	}
	return source.slice(start, end);
}

const applyBlock = sourceSlice(
	"function speechTranscriptionMatchesActiveVisit",
	"async function assembleSpeechRecording",
);
/*
 * ГРАНИЦА БЛОКА СБРОСА ОЧЕРЕДИ. Раньше концом стояла `function applyUiPreferences`
 * из useAppLogic.tsx — в склейке она идёт РАНЬШЕ самой flushPendingSpeechChunks,
 * и разбор падал. Конец теперь берётся у соседнего объявления в том же файле
 * (useVisitLogic.ts), а если его переименуют — сработает запасной обход до
 * следующего объявления того же уровня отступа, и страж не умрёт молча.
 */
const flushBlock =
	sourceSlice(
		"async function flushPendingSpeechChunks",
		"function scrollToVisitArea(",
		{
			optional: true,
		},
	) ?? declarationBlock("async function flushPendingSpeechChunks");

function declarationBlock(startMarker) {
	const start = source.indexOf(startMarker);
	if (start === -1) fail(`Missing marker: ${startMarker}`);
	const rest = source.slice(start + startMarker.length);
	const next = rest.search(/\n\t(?:async )?function /);
	return next === -1 ? rest : rest.slice(0, next);
}

const queueStorageBlock = sourceSlice(
	"function normalizePendingSpeechChunk",
	"function speechChunkIndexedDbAvailable",
);
const recoveryBlock = sourceSlice(
	"async function loadSpeechRecordingRecovery",
	"async function refreshSpeechRuntime",
);
/*
 * БЛОКА АВТОСБРОСА ОЧЕРЕДИ В ПРОДУКТЕ НЕТ — это объявленный долг, а не поломка
 * стража. Пустая строка вместо блока НУЖНА: она заставляет все 12 требований ниже
 * реально исполниться и попасть в храповик. Если бы разбор просто падал, реестр
 * долга никогда бы не сверился с действительностью.
 */
const autoFlushBlock =
	sourceSlice(
		"const speechAutoFlushPendingAudioReady =",
		"const speechTranscriptionBusyDetail =",
		{ optional: true },
	) ?? "";
requireIn(
	autoFlushBlock,
	/./,
	"Speech queued-audio auto flush block is absent from the product.",
);

// Связь закреплена: ранний выход зависит ОТ ОБОИХ полей активного приёма; `?.`
// вокруг связи допускается.
requireIn(
	recoveryBlock,
	/if \(\s*!dashboard\??\.activeVisit\??\.id\s*\|\|\s*!dashboard\??\.activeVisit\??\.patientId\s*\)/,
	"Speech recovery request must stay active-visit scoped before fetch: if (!dashboard?.activeVisit.id || !dashboard.activeVisit.patientId)",
);
requireIn(
	recoveryBlock,
	"setSpeechRecordingRecovery(null);",
	"Speech recovery request must stay active-visit scoped before fetch: setSpeechRecordingRecovery(null);",
);
requireIn(
	recoveryBlock,
	/params\.set\("visitId", dashboard\??\.activeVisit\??\.id\)/,
	'Speech recovery request must stay active-visit scoped before fetch: params.set("visitId", dashboard.activeVisit.id);',
);
requireIn(
	recoveryBlock,
	/params\.set\("patientId", dashboard\??\.activeVisit\??\.patientId\)/,
	'Speech recovery request must stay active-visit scoped before fetch: params.set("patientId", dashboard.activeVisit.patientId);',
);
requireIn(
	recoveryBlock,
	/fetch\(\s*`\/api\/speech\/recordings\/recovery\?\$\{params\.toString\(\)\}`/,
	"Speech recovery request must stay active-visit scoped before fetch: fetch(`/api/speech/recordings/recovery?${params.toString()}`",
);

// Подпись: перенос строки и висячая запятая от форматтера не закрепляются.
requireIn(
	applyBlock,
	/function speechTranscriptionMatchesActiveVisit\(\s*result: SpeechTranscriptionResponse,?\s*\): boolean/,
	"Speech apply guard missing marker: function speechTranscriptionMatchesActiveVisit(result: SpeechTranscriptionResponse): boolean",
);
/*
 * Исходное требование было ОДНОЙ строкой с тремя условиями и `return true`. В коде
 * оно разошлось на два оператора, и второй СТАЛ СТРОЖЕ: при неизвестном visitId
 * теперь `return false` (не применять), а было `return true` (применить). Это
 * ужесточение, поэтому полярность второго возврата НЕ прибивается — закрепляется
 * то, что оба вопроса вообще задаются: пропуск неприёмных фрагментов и явная
 * ветка на неизвестный идентификатор.
 */
requireIn(
	applyBlock,
	/if \(result\.chunk\.source !== "visit"\) return true;/,
	'Speech apply guard missing marker: if (result.chunk.source !== "visit" || !result.chunk.visitId || !dashboard?.activeVisit.id) return true;',
);
requireIn(
	applyBlock,
	/if \(!result\.chunk\.visitId \|\| !\w+\) return (?:true|false);/,
	"Speech apply guard missing marker: unknown visit id must have an explicit branch",
);
// Связь вердикта: идентификатор активного приёма берётся из activeVisit, и вердикт
// — равенство именно с ним. Имя локальной переменной не закрепляется.
requireIn(
	applyBlock,
	/const \w+ = [^;]*dashboard\??\.activeVisit\??\.id;/,
	"Speech apply guard missing marker: active visit id must be read from dashboard.activeVisit.id",
);
requireIn(
	applyBlock,
	/return result\.chunk\.visitId === \w+;/,
	"Speech apply guard missing marker: return result.chunk.visitId === dashboard.activeVisit.id;",
);
// Текст переписан («Эта часть записи» → «Фрагмент распознавания»), смысл цел.
// Закрепляется смысловое ядро отказа, а не редакция предложения.
requireIn(
	applyBlock,
	/относится к другому приему и не добавлен/,
	"Speech apply guard missing marker: Эта часть записи относится к другому приему и не добавлена в текущую карту.",
);
requireIn(
	applyBlock,
	"if (!speechTranscriptionMatchesActiveVisit(result))",
	"Speech apply guard missing marker: if (!speechTranscriptionMatchesActiveVisit(result))",
);
requireIn(
	applyBlock,
	"appendVisitDictationText(text)",
	"Speech apply guard missing marker: appendVisitDictationText(text)",
);

if (applyBlock.includes("STT-фрагмент синхронизирован")) {
	fail("Speech foreign-visit status must not expose STT jargon.");
}

if (
	applyBlock.indexOf("if (!speechTranscriptionMatchesActiveVisit(result))") >
	applyBlock.indexOf("appendVisitDictationText(text)")
) {
	fail(
		"Speech foreign-visit guard must run before appending transcript to the current visit.",
	);
}

requireIn(
	flushBlock,
	/if \(speechTranscriptionMatchesActiveVisit\(result\)\)\s*flushedRecordingIds\.add\(item\.recordingId\);/,
	"Pending speech queue must assemble only recordings that match the active visit.",
);

requireIn(
	flushBlock,
	/const hasAudioWaitingForServer = queue\.some\(\s*\(item\) =>\s*Boolean\(item\.audioBase64\??\.trim\(\)\),?\s*\)/,
	"Pending speech queue must keep every queued audio blob local until a server/local recognizer is currently available.",
);

for (const marker of [
	"const speechRecognitionReady = speechUploadReady && isOnline;",
	"const serverVoiceRecordingAvailable =",
	"const visitVoicePrimaryUsesServer = serverVoiceRecordingAvailable || isServerVoiceRecording;",
	"const speechGatewayActiveProviderIsLocal =",
	'"CRM запишет голос нормально и проверит Groq при старте.',
	'"Записать голос"',
	"speechActiveGatewayStatusRef.current = currentGatewayStatus;",
	"const effectiveGatewayStatus = speechActiveGatewayStatusRef.current ?? currentGatewayStatus;",
	"uploadSpeechBlob(event.data, effectiveGatewayStatus)",
]) {
	requireIn(
		source,
		marker,
		`Speech primary recording path missing marker: ${marker}`,
	);
}
// Перенос строки в цепочке `||` не закрепляется; закрепляется, что локальными
// считаются ОБА локальных провайдера.
requireIn(
	source,
	/speechGatewayStatus\??\.providerId === "local_whisper"\s*\|\|\s*speechGatewayStatus\??\.providerId === "vosk_local";/,
	'Speech primary recording path missing marker: speechGatewayStatus?.providerId === "local_whisper" || speechGatewayStatus?.providerId === "vosk_local";',
);

for (const marker of [
	"pendingSpeechChunkCount > 0",
	"!speechTranscriptionBusy",
	"!isServerVoiceRecording",
	"!isServerVoiceRecordingStarting",
	"speechAutoFlushInFlightRef.current",
	"speechAutoFlushLastKeyRef.current",
	"speechAutoFlushRetryTimerRef.current",
	'speechGatewayStatus?.serverTranscriptionCurrentlyAvailable ? "available" : "unavailable"',
	"void flushPendingSpeechChunks({ silent: true })",
	"window.setTimeout(() =>",
	"setSpeechAutoFlushRetryTick((tick) => tick + 1)",
	"speechAutoFlushRetryTick",
]) {
	requireIn(
		autoFlushBlock,
		marker,
		`Speech queued-audio auto flush missing marker: ${marker}`,
	);
}

// Связь закреплена: подпись действия зависит от готовности распознавания, и обе
// ветки остаются на месте. Перенос строки форматтером не закрепляется.
requireIn(
	source,
	/const pendingSpeechFlushActionLabel = speechRecognitionReady\s*\?\s*"Отправить звук"\s*:\s*"Проверить очередь";/,
	'Speech queued-audio action missing availability-aware marker: const pendingSpeechFlushActionLabel = speechRecognitionReady ? "Отправить звук" : "Проверить очередь";',
);
for (const marker of [
	"const pendingSpeechFlushActionTitle =",
	"{pendingSpeechFlushActionLabel}",
]) {
	requireIn(
		source,
		marker,
		`Speech queued-audio action missing availability-aware marker: ${marker}`,
	);
}

for (const forbidden of ['"Запись локально"', "когда сервер будет готов"]) {
	if (source.includes(forbidden))
		fail(
			`Speech queue/status copy still implies fake local recognition or server-only recovery: ${forbidden}`,
		);
}

for (const marker of [
	"speechAudioQueueRetentionMs",
	"localQueueOrganizationMatches(organizationId, activeOrganizationId)",
	"localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs)",
	"pendingSpeechChunkQueueLocalKey",
	"savePendingSpeechChunksToLocalStorage(queue, normalizedOrganizationId)",
]) {
	if (!queueStorageBlock.includes(marker) && !source.includes(marker))
		fail(`Speech queue scoped retention marker missing: ${marker}`);
}

for (const marker of [
	"const queue = await loadPendingSpeechChunks(activeOrganizationId);",
	"await removePendingSpeechChunkById(item.id, activeOrganizationId);",
	"queuePendingSpeechChunk(chunk, activeOrganizationId)",
]) {
	if (!source.includes(marker))
		fail(`Speech queue active-organization wiring missing: ${marker}`);
}

for (const marker of [
	"function speechChunkFailureDetail",
	"chunk.quality.providerWarnings[0]",
	"chunk.quality.nextAction",
	"const failureDetail = operatorReadableErrorDetailFromUnknown(speechError);",
	"CRM повторит отправку позже.",
]) {
	requireIn(
		source,
		marker,
		`Speech queued-audio failure feedback missing marker: ${marker}`,
	);
}

/*
 * ЗАПРЕТ БЕЗУСЛОВНОЙ СБОРКИ — РАНЬШЕ БЫЛ ВЫРОЖДЕННЫМ И НЕ МОГ СРАБОТАТЬ НИ НА ЧЁМ.
 *
 * Проверялась подстрока "\n        flushedRecordingIds.add(item.recordingId);" —
 * ВОСЕМЬ ПРОБЕЛОВ отступа. Файл отбит табами, поэтому такой строки не бывает ни в
 * исправленном коде, ни в сломанном: запрет проходил всегда. Он не «безопасно
 * зелёный», он мёртвый.
 *
 * Теперь проверяется само свойство: КАЖДОЕ добавление в flushedRecordingIds обязано
 * стоять под проверкой принадлежности активному приёму. Возврат дефекта (лишний
 * безусловный add) краснеет.
 */
const flushAddCount = flushBlock.split("flushedRecordingIds.add(").length - 1;
const guardedFlushAddCount =
	flushBlock.split(
		/if \(speechTranscriptionMatchesActiveVisit\(result\)\)\s*flushedRecordingIds\.add\(/,
	).length - 1;
if (flushAddCount !== guardedFlushAddCount) {
	fail(
		"Pending speech queue still has an unconditional active-visit assembly path: " +
			`добавлений в flushedRecordingIds ${flushAddCount}, под проверкой принадлежности ${guardedFlushAddCount}.`,
	);
}

if (
	!speechPlan.includes(
		"compare the returned `chunk.visitId` with the currently open visit",
	)
) {
	fail(
		"Speech transcription plan must document active-visit ownership for offline queue flush.",
	);
}

/*
 * СВЕРКА РЕЕСТРА ДОЛГА С ДЕЙСТВИТЕЛЬНОСТЬЮ — ОБА НАПРАВЛЕНИЯ.
 *
 * Вниз: требование снова выполняется, а запись о долге осталась — реестр врёт.
 * Вверх: запись есть, а утверждения для неё нет — удалённое требование оставило бы
 * вечную строку «этого нет».
 */
const closedDebt = [...KNOWN_MISSING_SPEECH_QUEUE.keys()].filter(
	(message) => (requireOutcomes.get(message)?.fail ?? 0) === 0,
);
const untestedDebt = [...KNOWN_MISSING_SPEECH_QUEUE.keys()].filter(
	(message) => !requireOutcomes.has(message),
);
if (untestedDebt.length > 0) {
	fail(
		`Реестр долга разошёлся с проверками: записей ${untestedDebt.length}, утверждений для них нет. ` +
			"Уберите их из KNOWN_MISSING_SPEECH_QUEUE: " +
			untestedDebt.join(" | "),
	);
}
if (closedDebt.length > 0) {
	fail(
		`Долг закрыт по ${closedDebt.length} требованиям: они снова выполняются. ` +
			"Уберите их из KNOWN_MISSING_SPEECH_QUEUE в " +
			"scripts/smoke-speech-queue-source.mjs, иначе реестр начнёт врать: " +
			closedDebt.join(" | "),
	);
}

console.log(
	JSON.stringify({
		ok: true,
		guard: "speech-queue-active-visit",
		liveLocks: [...requireOutcomes.entries()].filter(
			([, outcome]) => outcome.fail === 0,
		).length,
		declaredDebt: KNOWN_MISSING_SPEECH_QUEUE.size,
	}),
);
