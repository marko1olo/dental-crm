import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

const appSource = (
	(await readFile("apps/web/src/App.tsx", "utf8")) +
	"\n" +
	(await readAppLogicSource())
).replace(/\r\n/g, "\n");

/*
 * ЭТОТ СТРАЖ КРАСНЫЙ ЗАКОННО: ЗАЩИЩАЕМОГО ПОВЕДЕНИЯ В ПРОДУКТЕ НЕТ.
 *
 * Класс REAL. Продукт этой правкой НЕ ТРОГАЕТСЯ, ни одно требование НЕ УДАЛЕНО —
 * правится только подсчёт и доклад.
 *
 * ЧТО БЫЛО НЕ ТАК СО СТРАЖЕМ. `fail()` делал `process.exit(1)` на первом же
 * непрошедшем требовании, поэтому из 21 требования наружу выходило ОДНО сообщение,
 * а все структурные проверки ниже не исполнялись ни разу.
 *
 * ЗАМЕР ОТСУТСТВИЯ. Все 21 маркер проверены обходом ВСЕХ 469 файлов .ts/.tsx/.css в
 * apps/web/src — ни одного вхождения:
 *
 *   rg -l 'speechRecordingHadRecognizedTextRef'            apps/web/src -> пусто
 *   rg -l 'speechRecordingVoiceLevelAvailableAtStopRef'    apps/web/src -> пусто
 *   rg -l 'finalSpeechNoTextMessage'                       apps/web/src -> пусто
 *   rg -l 'queuedCurrentRecordingCount'                    apps/web/src -> пусто
 *
 * Это не класс STALE: текст не переехал, его нет нигде. Слой снесён 2026-07-07
 * (af3e2a01c / 624d7ae65, «chore: save today's newly merged PR features and assets»),
 * см. `git log -S 'serverVoiceRecordingShouldContinueRef' --all -- apps/web`.
 *
 * ПОЧЕМУ ЭТО ВАЖНО КЛИНИЧЕСКИ. Требования описывают итоговый статус диктовки: врач
 * должен видеть «текст готов, нажмите Собрать» либо «звук сохранён локально,
 * отправим позже», а не общее «распознавание завершено, но текст не появился» после
 * успешной записи. Сейчас в продукте нет ни флага «в этой записи уже был
 * распознанный текст», ни подсчёта фрагментов очереди по текущей записи, ни
 * отдельного читаемого сообщения о причине пустого результата.
 *
 * ТРИ УТВЕРЖДЕНИЯ БЫЛИ ВЫРОЖДЕННЫМИ И НЕ МОГЛИ СРАБОТАТЬ НИ НА ЧЁМ — теперь это
 * видно в выводе, а не спрятано за «зелёным». Подробности у каждого по месту.
 */

const absent = [];
const liveLockFailures = [];
const unevaluable = [];
const liveLocksHeld = [];

/* РЕЕСТР ОБЪЯВЛЕННОГО ОТСУТСТВИЯ. КЛЮЧ — ТЕКСТ ТРЕБОВАНИЯ, ДОСЛОВНО. */
const KNOWN_ABSENT_FINAL_READY_STATUS = new Set([
	"Visit speech recording must remember whether the current recording already produced recognized text.",
	"Visit speech recording must remember whether microphone level diagnostics were available at stop.",
	"Visit speech recording must remember whether voice was actually audible before final status.",
	"Recognized speech chunks must mark the current recording as having usable text before appending it.",
	"Assembled speech transcript must also mark the current recording as having usable text.",
	"Starting a new server voice recording must clear the per-recording recognized-text flag.",
	"Starting a new server voice recording must clear audible-voice flags only at the real new-recording boundary.",
	"Starting a new server voice recording must clear the per-recording microphone diagnostics.",
	"Stopping a server voice recording must preserve microphone diagnostics before the monitor is cleared.",
	"Final speech status must treat already-appended chunks as successful recognition.",
	"Final speech status must give the doctor the next action after successful recognition.",
	"Final speech upload waiting must poll for late MediaRecorder dataavailable uploads.",
	"Final speech upload waiting must give the last MediaRecorder chunk a short grace period.",
	"Final speech upload waiting must drain uploads that appeared after the initial snapshot.",
	"Final speech status must inspect the local audio queue after flush attempts.",
	"Final speech status must identify queued chunks for the current recording.",
	"Final speech status must tell the doctor that queued audio is preserved instead of implying failed recognition.",
	"Final speech status must use a dedicated readable no-text diagnostic message.",
	"Final speech status must identify a quiet microphone when the level monitor saw no audible voice.",
	"Final speech status must give the doctor a concrete next action after no transcript appears.",
	"Final speech status must use the readable no-text diagnostic instead of a generic retry message.",
]);

const exercised = new Set();

function requireIn(source, marker, message) {
	exercised.add(message);
	if (source.includes(marker)) {
		liveLocksHeld.push(message);
		return;
	}
	if (KNOWN_ABSENT_FINAL_READY_STATUS.has(message)) {
		absent.push(message);
		return;
	}
	liveLockFailures.push(message);
}

requireIn(
	appSource,
	"const speechRecordingHadRecognizedTextRef = useRef(false);",
	"Visit speech recording must remember whether the current recording already produced recognized text.",
);
requireIn(
	appSource,
	"const speechRecordingVoiceLevelAvailableAtStopRef = useRef(false);",
	"Visit speech recording must remember whether microphone level diagnostics were available at stop.",
);
requireIn(
	appSource,
	"const speechRecordingVoiceDetectedAtStopRef = useRef(false);",
	"Visit speech recording must remember whether voice was actually audible before final status.",
);
requireIn(
	appSource,
	"speechRecordingHadRecognizedTextRef.current = true;\n      setSpeechRetrySuggested(false);\n      appendVisitDictationText(text);",
	"Recognized speech chunks must mark the current recording as having usable text before appending it.",
);
requireIn(
	appSource,
	"speechRecordingHadRecognizedTextRef.current = true;\n        visitDraftUserEditedRef.current = true;",
	"Assembled speech transcript must also mark the current recording as having usable text.",
);
requireIn(
	appSource,
	"speechRecordingHadRecognizedTextRef.current = false;",
	"Starting a new server voice recording must clear the per-recording recognized-text flag.",
);
requireIn(
	appSource,
	"speechRecordingHadRecognizedTextRef.current = false;\n      speechVoiceDetectedDuringRecordingRef.current = false;\n      speechSegmentVoiceDetectedRef.current = false;\n      speechQuietWarningShownRef.current = false;",
	"Starting a new server voice recording must clear audible-voice flags only at the real new-recording boundary.",
);
requireIn(
	appSource,
	"speechRecordingVoiceLevelAvailableAtStopRef.current = false;\n      speechRecordingVoiceDetectedAtStopRef.current = false;",
	"Starting a new server voice recording must clear the per-recording microphone diagnostics.",
);
requireIn(
	appSource,
	"speechRecordingVoiceLevelAvailableAtStopRef.current = voiceLevelAvailable;\n      speechRecordingVoiceDetectedAtStopRef.current = voiceDetected;",
	"Stopping a server voice recording must preserve microphone diagnostics before the monitor is cleared.",
);
requireIn(
	appSource,
	"if (assembly.transcript.trim() || speechRecordingHadRecognizedTextRef.current) {",
	"Final speech status must treat already-appended chunks as successful recognition.",
);
requireIn(
	appSource,
	"Текст готов. Проверьте поле диктовки и нажмите «Собрать ЭМК».",
	"Final speech status must give the doctor the next action after successful recognition.",
);
requireIn(
	appSource,
	"for (let attempt = 0; attempt < 8; attempt += 1) {",
	"Final speech upload waiting must poll for late MediaRecorder dataavailable uploads.",
);
requireIn(
	appSource,
	"await new Promise<void>((resolve) => window.setTimeout(resolve, 150));",
	"Final speech upload waiting must give the last MediaRecorder chunk a short grace period.",
);
requireIn(
	appSource,
	"const remainingUploads = Array.from(speechUploadPromisesRef.current);",
	"Final speech upload waiting must drain uploads that appeared after the initial snapshot.",
);
requireIn(
	appSource,
	"const queuedChunksAfterFlush = await loadPendingSpeechChunks(activeOrganizationId);",
	"Final speech status must inspect the local audio queue after flush attempts.",
);
requireIn(
	appSource,
	"const queuedCurrentRecordingCount = queuedChunksAfterFlush.filter((chunk) => chunk.recordingId === recordingId).length;",
	"Final speech status must identify queued chunks for the current recording.",
);
requireIn(
	appSource,
	"Звук сохранен локально: ${queuedCurrentRecordingCount} фрагм. Когда распознавание будет готово, CRM отправит его и добавит текст.",
	"Final speech status must tell the doctor that queued audio is preserved instead of implying failed recognition.",
);
requireIn(
	appSource,
	"function finalSpeechNoTextMessage()",
	"Final speech status must use a dedicated readable no-text diagnostic message.",
);
requireIn(
	appSource,
	"Запись сделана, но микрофон почти не слышал голос.",
	"Final speech status must identify a quiet microphone when the level monitor saw no audible voice.",
);
requireIn(
	appSource,
	"Нажмите «Проверить микрофон», затем запишите еще раз ближе к микрофону.",
	"Final speech status must give the doctor a concrete next action after no transcript appears.",
);
requireIn(
	appSource,
	"setSpeechStatusNote(finalSpeechNoTextMessage());",
	"Final speech status must use the readable no-text diagnostic instead of a generic retry message.",
);

/*
 * СТРУКТУРНЫЕ ПРОВЕРКИ. ОТСУТСТВУЮЩАЯ ОБЛАСТЬ — «НЕОЦЕНИМО», А НЕ «ЗЕЛЁНО».
 */
const finalizeStart = appSource.indexOf(
	"async function finalizeSpeechRecording(",
);
const flushStart = appSource.indexOf(
	"async function flushPendingSpeechChunks(",
	finalizeStart,
);
if (finalizeStart === -1 || flushStart === -1) {
	unevaluable.push(
		"Speech finalization block was not found. " +
			`[finalizeSpeechRecording=${finalizeStart}, flushPendingSpeechChunks=${flushStart}]`,
	);
} else {
	const finalizeBlock = appSource.slice(finalizeStart, flushStart);
	const genericRetryIndex = finalizeBlock.indexOf(
		"Распознавание завершено, но текст не появился",
	);
	/*
	 * ВЫРОЖДЕННАЯ ПАРА, ЗАМЕРЕНО. Оба утверждения ниже стоят под условием
	 * `genericRetryIndex !== -1`, а самого текста «Распознавание завершено, но текст
	 * не появился» в продукте НЕТ (rg по apps/web/src — пусто). Значит проверка
	 * порядка не исполняется НИ НА ЧЁМ: ни на исправленном коде, ни на сломанном.
	 * Это не «безопасно зелёное» утверждение, а мёртвое, и молчать об этом нельзя —
	 * иначе оно и дальше будет считаться защитой.
	 */
	if (genericRetryIndex === -1) {
		unevaluable.push(
			"Final speech status must check recognized text before showing the retry message. " +
				"[текст «Распознавание завершено, но текст не появился» отсутствует, порядок проверять не на чем]",
		);
		unevaluable.push(
			"Final speech status must check queued audio before showing the retry message. " +
				"[то же: без общего сообщения о повторе порядок не определён]",
		);
	} else {
		if (
			finalizeBlock.indexOf("speechRecordingHadRecognizedTextRef.current") >
			genericRetryIndex
		) {
			liveLockFailures.push(
				"Final speech status must check recognized text before showing the retry message.",
			);
		}
		if (finalizeBlock.indexOf("queuedCurrentRecordingCount > 0") > genericRetryIndex) {
			liveLockFailures.push(
				"Final speech status must check queued audio before showing the retry message.",
			);
		}
	}
}

const waitStart = appSource.indexOf("async function waitForSpeechUploads()");
const waitEnd = appSource.indexOf(
	"async function finalizeSpeechRecording(",
	waitStart,
);
if (waitStart === -1 || waitEnd === -1) {
	unevaluable.push(
		"Speech upload wait block was not found. " +
			`[waitForSpeechUploads=${waitStart}, finalizeSpeechRecording=${waitEnd}]`,
	);
} else {
	const waitBlock = appSource.slice(waitStart, waitEnd);
	const graceIndex = waitBlock.indexOf(
		"await new Promise<void>((resolve) => window.setTimeout(resolve, 150));",
	);
	const emptyGuardIndex = waitBlock.indexOf(
		"if (!speechUploadPromisesRef.current.size) return;",
	);
	/*
	 * ВЫРОЖДЕННОЕ УТВЕРЖДЕНИЕ, ЗАМЕРЕНО. Раньше сравнивалось `indexOf(a) > indexOf(b)`
	 * без проверки на -1. В продукте отсутствуют ОБЕ строки, поэтому сравнение было
	 * `-1 > -1` = false, и утверждение проходило всегда. Теперь отсутствие любой из
	 * границ докладывается как неоценимое.
	 */
	if (graceIndex === -1 || emptyGuardIndex === -1) {
		unevaluable.push(
			"Speech upload wait must check for late uploads after the grace period. " +
				`[пауза 150 мс: ${graceIndex}, ранний выход по пустой очереди: ${emptyGuardIndex}]`,
		);
	} else if (graceIndex > emptyGuardIndex) {
		liveLockFailures.push(
			"Speech upload wait must check for late uploads after the grace period.",
		);
	}
}

const monitorStart = appSource.indexOf("function startSpeechMonitor(");
const configureStart = appSource.indexOf(
	"function configureServerVoiceRecorder(",
	monitorStart,
);
if (monitorStart === -1 || configureStart === -1) {
	unevaluable.push(
		"Speech monitor restarts must not clear the whole-recording audible-voice flag. " +
			`[startSpeechMonitor=${monitorStart}, configureServerVoiceRecorder=${configureStart}; ` +
			"вторая граница снесена вместе со слоем отказоустойчивости, запрет оценить нечем]",
	);
} else {
	const monitorBlock = appSource.slice(monitorStart, configureStart);
	if (
		monitorBlock.includes("speechVoiceDetectedDuringRecordingRef.current = false;")
	) {
		liveLockFailures.push(
			"Speech monitor restarts must not clear the whole-recording audible-voice flag.",
		);
	} else {
		liveLocksHeld.push(
			"Speech monitor restarts must not clear the whole-recording audible-voice flag.",
		);
	}
}

/* ХРАПОВИК В ОБЕ СТОРОНЫ. */
const heldSet = new Set(liveLocksHeld);
const closedDebt = [...KNOWN_ABSENT_FINAL_READY_STATUS].filter((message) =>
	heldSet.has(message),
);
const untestedDebt = [...KNOWN_ABSENT_FINAL_READY_STATUS].filter(
	(message) => !exercised.has(message),
);

const report = [];
if (liveLockFailures.length > 0) {
	report.push(
		`СЛОМАН ЖИВОЙ ЛОК (${liveLockFailures.length}) — ЭТО НОВАЯ РЕГРЕССИЯ, А НЕ СТАРОЕ ОТСУТСТВИЕ:`,
	);
	for (const message of liveLockFailures) report.push(`  ! ${message}`);
	report.push("");
}
if (closedDebt.length > 0) {
	report.push(
		`ДОЛГ ЗАКРЫТ по ${closedDebt.length} требованиям: они снова выполняются. ` +
			"Уберите их из KNOWN_ABSENT_FINAL_READY_STATUS в " +
			"scripts/smoke-speech-final-ready-status-source.mjs, иначе реестр начнёт врать:",
	);
	for (const message of closedDebt) report.push(`  + ${message}`);
	report.push("");
}
if (untestedDebt.length > 0) {
	report.push(
		`РЕЕСТР РАЗОШЁЛСЯ С ПРОВЕРКАМИ (${untestedDebt.length}): записи есть, утверждений для них нет:`,
	);
	for (const message of untestedDebt) report.push(`  ? ${message}`);
	report.push("");
}
if (unevaluable.length > 0) {
	report.push(
		`НЕОЦЕНИМО (${unevaluable.length}) — область проверки отсутствует, утверждение ` +
			"истинно ПУСТО и НЕ считается держащим:",
	);
	for (const message of unevaluable) report.push(`  ~ ${message}`);
	report.push("");
}
if (absent.length > 0) {
	report.push(
		`ОБЪЯВЛЕННОЕ ОТСУТСТВИЕ (${absent.length}) — поведения нет ни в одном из 469 файлов ` +
			"apps/web/src. Слой снесён 2026-07-07 (af3e2a01c / 624d7ae65). Продукт этой " +
			"проверкой не правится; закрыть долг = вернуть поведение:",
	);
	for (const message of absent) report.push(`  - ${message}`);
	report.push("");
}
report.push(
	`ИТОГ: живых локов держит ${liveLocksHeld.length}, сломано ${liveLockFailures.length}, ` +
		`неоценимо ${unevaluable.length}, объявленного отсутствия ${absent.length}.`,
);

if (
	liveLockFailures.length > 0 ||
	closedDebt.length > 0 ||
	untestedDebt.length > 0
) {
	console.error(report.join("\n"));
	process.exit(2);
}
if (absent.length > 0 || unevaluable.length > 0) {
	console.error(report.join("\n"));
	process.exit(1);
}

console.log(
	JSON.stringify({
		ok: true,
		guard: "speech-final-ready-status",
		liveLocksHeld: liveLocksHeld.length,
	}),
);
