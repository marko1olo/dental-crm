import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

const appSource = [
	await readFile("apps/web/src/App.tsx", "utf8"),
	await readAppLogicSource(),
].join("\n");

/*
 * ЭТОТ СТРАЖ КРАСНЫЙ ЗАКОННО: ЗАЩИЩАЕМОГО ПОВЕДЕНИЯ В ПРОДУКТЕ НЕТ.
 *
 * Класс REAL по таксономии волны. Продукт этой правкой НЕ ТРОГАЕТСЯ и ни одно
 * требование НЕ УДАЛЕНО — правится только то, как страж считает и докладывает.
 *
 * ЧТО БЫЛО НЕ ТАК СО СТРАЖЕМ. `fail()` вызывал `process.exit(1)` на первом же
 * непрошедшем требовании. Из 31 требования наружу выходило ОДНО сообщение —
 * «Visit voice recorder must track whether a stop was requested by the doctor.» —
 * и по нему нельзя было понять ни масштаб, ни причину. Хуже: ВСЕ запреты (forbidIn)
 * и все структурные проверки стоят в файле НИЖЕ первого требования, поэтому они
 * НИКОГДА НЕ ИСПОЛНЯЛИСЬ. Страж, который умирает на первой строке, не защищает
 * ничего, включая то, что в продукте ещё живо.
 *
 * ЗАМЕР ОТСУТСТВИЯ, А НЕ ПРЕДПОЛОЖЕНИЕ. Все 31 маркера проверены обходом ВСЕХ 469
 * файлов .ts/.tsx/.css в apps/web/src (не только набора этой проверки — иначе
 * «переехал» не отличить от «снесли»). Ни одного вхождения ни у одного маркера:
 *
 *   rg -l 'serverVoiceRecordingShouldContinueRef' apps/web/src   -> пусто
 *   rg -l 'configureServerVoiceRecorder'          apps/web/src   -> пусто
 *   rg -l 'isServerVoiceRecordingStarting'        apps/web/src   -> пусто
 *   rg -l 'speechActiveGatewayStatusRef'          apps/web/src   -> пусто
 *
 * Значит это НЕ класс STALE (текст переехал при разборе монолита) — это снос.
 *
 * КОГДА СНЕСЛИ, ТОЖЕ ЗАМЕРЕНО:
 *   git log -S 'serverVoiceRecordingShouldContinueRef' --all -- apps/web
 * 5 коммитов. На 7b465576d (2026-06-29) маркер жив в useAppLogic.tsx, 6 вхождений.
 * На af3e2a01c и 624d7ae65 (2026-07-07, «chore: save today's newly merged PR
 * features and assets») его нет нигде. Слой отказоустойчивости диктовки снесло
 * СЛИЯНИЕМ, а не рефакторингом: нет ни переименования, ни замены другой реализацией.
 *
 * ЧТО СЕЙЧАС В ПРОДУКТЕ ВМЕСТО ЭТОГО. useAppLogic.tsx:10840-10933,
 * `startServerVoiceRecording` — простой рекордер: `recorder.ondataavailable` и
 * `recorder.onstop` назначаются на месте, `uploadSpeechBlob(event.data)` с ОДНИМ
 * аргументом, никакой общей конфигурации, никакого перезапуска после неожиданного
 * останова, никакого состояния запуска. То есть: если браузер прервал MediaRecorder
 * посреди диктовки, запись просто заканчивается — ровно тот дефект, ради которого
 * этот страж написан.
 *
 * ЗАКРЫТЬ ЭТОТ ДОЛГ = ВЕРНУТЬ ПОВЕДЕНИЕ В ПРОДУКТ. Это работа владельца экрана
 * приёма. Страж красным и останется, пока она не сделана, — но красным ВНЯТНЫМ:
 * ниже он печатает весь список, отдельно от него живые локи, и различает коды
 * выхода.
 *
 * КОДЫ ВЫХОДА РАЗЛИЧАЮТСЯ, И ЭТО ГЛАВНАЯ ЦЕННОСТЬ ПРАВКИ:
 *   0 — долг закрыт или пуст, все живые локи держат;
 *   1 — только объявленное отсутствие (сегодняшнее состояние), живые локи держат;
 *   2 — СЛОМАН ЖИВОЙ ЛОК: пришла новая регрессия. Её нельзя потерять среди 31
 *       строки про отсутствие, поэтому она печатается первой и меняет код выхода.
 */

const absent = [];
const liveLockFailures = [];
const unevaluable = [];
const liveLocksHeld = [];

/*
 * РЕЕСТР ОБЪЯВЛЕННОГО ОТСУТСТВИЯ. КЛЮЧ — ТЕКСТ ТРЕБОВАНИЯ, ДОСЛОВНО.
 * Причина NOWHERE у всех: маркера нет ни в одном файле apps/web/src.
 */
const KNOWN_ABSENT_RECORDER_RESILIENCE = new Set([
	"Visit voice recorder must track whether a stop was requested by the doctor.",
	"Visit voice recorder must distinguish manual stop from browser recorder interruption.",
	"Visit voice recorder must debounce unexpected MediaRecorder restarts.",
	"Visit voice recorder must expose a startup state while waiting for microphone permission.",
	"Visit voice recorder must use an immediate ref guard against double-click startup.",
	"Visit voice recorder start and restart paths must share one recorder configuration.",
	"Visit voice recorder must have an explicit unexpected-stop restart path.",
	"Unexpected MediaRecorder stop must restart only while the same dictation should continue.",
	"Unexpected recorder interruption must be explained in human wording.",
	"Successful recorder restart must be visible to the doctor.",
	"Manual stop must cancel pending unexpected-stop restart timer.",
	"Visit voice recording must start gateway checks in the background instead of blocking microphone startup.",
	"Visit voice recording must use the current cached gateway status for immediate microphone startup.",
	"Visit voice recorder must ignore repeated start clicks while microphone startup is already in progress.",
	"Repeated voice-record start clicks must be explained in human wording.",
	"Visit voice recorder must mark startup before async microphone access begins.",
	"Visit voice recorder must clear startup state after successful microphone startup.",
	"Visit voice recorder must stop partially opened microphone streams and clear startup state on failure.",
	"Visit voice recording must apply a freshly loaded gateway status after recording has started.",
	"Visit voice recording must only show background gateway status before the first speech chunk is handled.",
	"Visit voice recording must tell the doctor when provider recognition is ready after background startup checks.",
	"Visit voice recording must explain background gateway unavailability without stopping the recording.",
	"Visit voice recorder chunks must use the freshest gateway status available at upload time.",
	"Visit voice recorder chunks must pass the effective gateway status into speech upload.",
	"Quiet local voice-meter readings must warn the doctor without dropping the active audio chunk.",
	"Quiet final chunks must still be sent for recognition instead of being discarded locally.",
	"Quiet stopped recordings must go through normal final recognition before suggesting a retry.",
	"Initial voice recorder start path must retain the stream so failures can release the microphone.",
	"Initial voice recorder start path must use the shared recorder configuration.",
	"Manual stop must prevent automatic recorder restart.",
	"Manual stop must be marked before stopping MediaRecorder.",
]);

const exercised = new Set();

function requireIn(source, marker, message) {
	exercised.add(message);
	if (source.includes(marker)) {
		liveLocksHeld.push(message);
		return;
	}
	if (KNOWN_ABSENT_RECORDER_RESILIENCE.has(message)) {
		absent.push(message);
		return;
	}
	liveLockFailures.push(message);
}

/*
 * ЗАПРЕТ — ЭТО ЖИВОЙ ЛОК, А НЕ ФОРМАЛЬНОСТЬ, НО ТОЛЬКО НАД СУЩЕСТВУЮЩИМ БЛОКОМ.
 *
 * Запрет над блоком, которого нет, ИСТИНЕН ПУСТО: он «проходит» на любом коде и
 * не может покраснеть никогда. Ровно такое вырожденное утверждение уже нашлось в
 * соседнем страже очереди речи (запрет искал отступ из восьми пробелов в файле,
 * отбитом табами). Поэтому здесь неоценимый запрет попадает в отдельный список
 * `unevaluable`, а НЕ в «держит».
 */
function forbidIn(source, marker, message, { scopeName = null } = {}) {
	if (scopeName !== null && source === null) {
		unevaluable.push(`${message} [область «${scopeName}» отсутствует]`);
		return;
	}
	if (source.includes(marker)) {
		liveLockFailures.push(message);
		return;
	}
	liveLocksHeld.push(message);
}

requireIn(
	appSource,
	"serverVoiceRecordingShouldContinueRef",
	"Visit voice recorder must track whether a stop was requested by the doctor.",
);
requireIn(
	appSource,
	"serverVoiceRecordingStopRequestedRef",
	"Visit voice recorder must distinguish manual stop from browser recorder interruption.",
);
requireIn(
	appSource,
	"serverVoiceRecordingRestartTimerRef",
	"Visit voice recorder must debounce unexpected MediaRecorder restarts.",
);
requireIn(
	appSource,
	"const [isServerVoiceRecordingStarting, setIsServerVoiceRecordingStarting] = useState(false);",
	"Visit voice recorder must expose a startup state while waiting for microphone permission.",
);
requireIn(
	appSource,
	"const serverVoiceRecordingStartingRef = useRef(false);",
	"Visit voice recorder must use an immediate ref guard against double-click startup.",
);
requireIn(
	appSource,
	"function configureServerVoiceRecorder(",
	"Visit voice recorder start and restart paths must share one recorder configuration.",
);
requireIn(
	appSource,
	"function restartServerVoiceRecorderAfterUnexpectedStop(",
	"Visit voice recorder must have an explicit unexpected-stop restart path.",
);
requireIn(
	appSource,
	"serverVoiceRecordingShouldContinueRef.current && !serverVoiceRecordingStopRequestedRef.current && Boolean(recordingId)",
	"Unexpected MediaRecorder stop must restart only while the same dictation should continue.",
);
requireIn(
	appSource,
	"Браузер прервал запись на секунду. CRM снова включает микрофон и продолжает эту же диктовку.",
	"Unexpected recorder interruption must be explained in human wording.",
);
requireIn(
	appSource,
	"Запись продолжена. Говорите дальше, текст добавится в тот же черновик.",
	"Successful recorder restart must be visible to the doctor.",
);
requireIn(
	appSource,
	"clearServerVoiceRecordingRestartTimer();",
	"Manual stop must cancel pending unexpected-stop restart timer.",
);
requireIn(
	appSource,
	"const gatewayStatusPromise = loadSpeechGatewayStatus({ silent: true });",
	"Visit voice recording must start gateway checks in the background instead of blocking microphone startup.",
);
requireIn(
	appSource,
	"const currentGatewayStatus = speechGatewayStatus;",
	"Visit voice recording must use the current cached gateway status for immediate microphone startup.",
);
requireIn(
	appSource,
	"if (serverVoiceRecordingStartingRef.current || isServerVoiceRecordingStarting) {",
	"Visit voice recorder must ignore repeated start clicks while microphone startup is already in progress.",
);
requireIn(
	appSource,
	'setSpeechStatusNote("Запись уже включается. Разрешите микрофон и подождите несколько секунд.");',
	"Repeated voice-record start clicks must be explained in human wording.",
);
requireIn(
	appSource,
	"serverVoiceRecordingStartingRef.current = true;\n      setIsServerVoiceRecordingStarting(true);",
	"Visit voice recorder must mark startup before async microphone access begins.",
);
requireIn(
	appSource,
	"serverVoiceRecordingStartingRef.current = false;\n      setIsServerVoiceRecordingStarting(false);",
	"Visit voice recorder must clear startup state after successful microphone startup.",
);
requireIn(
	appSource,
	"stream?.getTracks().forEach((track) => track.stop());\n      serverVoiceRecordingStartingRef.current = false;",
	"Visit voice recorder must stop partially opened microphone streams and clear startup state on failure.",
);
requireIn(
	appSource,
	"void gatewayStatusPromise.then((freshGatewayStatus) => {",
	"Visit voice recording must apply a freshly loaded gateway status after recording has started.",
);
requireIn(
	appSource,
	"if (speechChunkIndexRef.current === 0) {",
	"Visit voice recording must only show background gateway status before the first speech chunk is handled.",
);
requireIn(
	appSource,
	"Текст появится по мере распознавания.",
	"Visit voice recording must tell the doctor when provider recognition is ready after background startup checks.",
);
requireIn(
	appSource,
	"Запись идет. Распознавание пока не готово, звук сохранится и отправится позже.",
	"Visit voice recording must explain background gateway unavailability without stopping the recording.",
);
requireIn(
	appSource,
	"const effectiveGatewayStatus = speechActiveGatewayStatusRef.current ?? currentGatewayStatus;",
	"Visit voice recorder chunks must use the freshest gateway status available at upload time.",
);
requireIn(
	appSource,
	"trackSpeechUpload(uploadSpeechBlob(event.data, effectiveGatewayStatus));",
	"Visit voice recorder chunks must pass the effective gateway status into speech upload.",
);
requireIn(
	appSource,
	"Голос почти не слышен, но CRM все равно отправляет фрагмент на распознавание.",
	"Quiet local voice-meter readings must warn the doctor without dropping the active audio chunk.",
);
requireIn(
	appSource,
	"Голос почти не слышен, но CRM все равно проверяет последний фрагмент.",
	"Quiet final chunks must still be sent for recognition instead of being discarded locally.",
);
requireIn(
	appSource,
	"Запись остановлена. Проверяю даже тихую запись.",
	"Quiet stopped recordings must go through normal final recognition before suggesting a retry.",
);

/*
 * ЖИВЫЕ ЛОКИ. ДО ЭТОЙ ПРАВКИ ОНИ НЕ ИСПОЛНЯЛИСЬ НИ РАЗУ.
 *
 * Стояли в файле ниже первого требования, а `fail()` делал `process.exit(1)`.
 * Требование выше не выполняется с 2026-07-07 — значит эти два запрета мертвы
 * ровно столько же. Они запирают настоящий дефект: локальный шумомер выбрасывал
 * аудио ДО распознавания, и врач получал «фрагмент не отправлен» вместо текста.
 * Сейчас в продукте этих строк нет, то есть запрет держит — и теперь это
 * проверяется, а не подразумевается.
 */
forbidIn(
	appSource,
	"Фрагмент не отправлен на распознавание: микрофон не слышал голос",
	"Local microphone-level checks must not discard speech audio before provider recognition.",
);
forbidIn(
	appSource,
	"Запись остановлена, но микрофон почти не слышал голос.",
	"Quiet stopped recordings must not be marked as failed before final recognition finishes.",
);

/*
 * СТРУКТУРНЫЕ ПРОВЕРКИ НАД БЛОКАМИ. БЛОКА НЕТ — ПРОВЕРКА НЕОЦЕНИМА, А НЕ ЗЕЛЁНАЯ.
 *
 * Старая версия резала `appSource.slice(start, -1)` при отсутствующей границе.
 * `-1` — это «до последнего символа», то есть блоком становился ПОЧТИ ВЕСЬ файл на
 * миллион символов, и проверка порядка внутри него теряла смысл. Плюс сравнения
 * вида `indexOf(a) > indexOf(b)` при a=-1 давали `-1 > N` = false и проходили
 * всегда — вырожденное утверждение. Теперь границы проверяются явно.
 */
function blockBetween(startMarker, endMarker) {
	const start = appSource.indexOf(startMarker);
	if (start === -1) return null;
	const end = appSource.indexOf(endMarker, start);
	if (end === -1) return null;
	return appSource.slice(start, end);
}

const configureStartIndex = appSource.indexOf(
	"function configureServerVoiceRecorder(",
);
const restartIndex = appSource.indexOf(
	"function restartServerVoiceRecorderAfterUnexpectedStop(",
);
const startIndex = appSource.indexOf(
	"async function startServerVoiceRecording()",
);
const stopIndex = appSource.indexOf("function stopServerVoiceRecording()");
if (
	configureStartIndex === -1 ||
	restartIndex === -1 ||
	startIndex === -1 ||
	stopIndex === -1
) {
	absent.push(
		"Visit voice recorder source shape changed; update this smoke test. " +
			`[configureServerVoiceRecorder=${configureStartIndex}, ` +
			`restartServerVoiceRecorderAfterUnexpectedStop=${restartIndex}, ` +
			`startServerVoiceRecording=${startIndex}, stopServerVoiceRecording=${stopIndex}]`,
	);
}

const recorderStopBlock =
	configureStartIndex === -1 || restartIndex === -1
		? null
		: appSource.slice(
				appSource.indexOf("recorder.onstop = () =>", configureStartIndex),
				restartIndex,
			);
if (recorderStopBlock === null) {
	unevaluable.push(
		"Unexpected recorder stop must check restart before finalizing speech recording. " +
			"[блок recorder.onstop между configureServerVoiceRecorder и restartServerVoiceRecorderAfterUnexpectedStop отсутствует]",
	);
} else if (
	recorderStopBlock.indexOf("if (shouldRestart)") >
	recorderStopBlock.indexOf("void finalizeSpeechRecording")
) {
	liveLockFailures.push(
		"Unexpected recorder stop must check restart before finalizing speech recording.",
	);
}
forbidIn(
	recorderStopBlock,
	"progressNote: !(voiceLevelAvailable && !voiceDetected)",
	"Quiet stopped recordings must not suppress the final ready/retry status.",
	{ scopeName: "recorder.onstop" },
);

const startBlock =
	startIndex === -1 || stopIndex === -1
		? null
		: appSource.slice(startIndex, stopIndex);
if (startBlock === null) {
	unevaluable.push(
		"Initial voice recorder start path checks [блок startServerVoiceRecording отсутствует]",
	);
} else {
	requireIn(
		startBlock,
		"let stream: MediaStream | null = null;",
		"Initial voice recorder start path must retain the stream so failures can release the microphone.",
	);
	requireIn(
		startBlock,
		"configureServerVoiceRecorder(stream, recorder, currentGatewayStatus);",
		"Initial voice recorder start path must use the shared recorder configuration.",
	);
	/*
	 * ЭТОТ ЗАПРЕТ НЕЗАВИСИМ ОТ СНЕСЁННОГО СЛОЯ И СЕЙЧАС ДЕРЖИТ.
	 *
	 * «Не ждать статус шлюза, прежде чем открыть микрофон» — про задержку старта
	 * записи, а не про общую конфигурацию рекордера. В продукте этого ожидания нет.
	 * Если оно появится, это НОВАЯ регрессия (врач жмёт «запись», а микрофон
	 * открывается только после сетевого запроса), и она обязана дать код 2, а не
	 * растворяться в списке отсутствия.
	 */
	forbidIn(
		startBlock,
		"await loadSpeechGatewayStatus({ silent: true })",
		"Initial voice recorder start path must not wait for gateway status before opening the microphone.",
	);
	/*
	 * ЭТИ ДВА ЗАПРЕТА СЕЙЧАС НАРУШЕНЫ, НО ЭТО ЧАСТЬ ТОГО ЖЕ СНЕСЁННОГО СЛОЯ.
	 *
	 * Их смысл — «путь старта не дублирует обработчики, а зовёт
	 * configureServerVoiceRecorder». Общей конфигурации нет (требование в объявленном
	 * отсутствии), поэтому обработчики назначаются НА МЕСТЕ: useAppLogic.tsx:10876
	 * `recorder.ondataavailable =`, 10893 `recorder.onstop =`. Считать это НОВОЙ
	 * регрессией нельзя — один и тот же дефект учитывался бы дважды и маскировал бы
	 * настоящие новые поломки. Поэтому они идут в объявленное отсутствие, а не в код 2.
	 */
	for (const [marker, message] of [
		[
			"recorder.ondataavailable =",
			"Initial voice recorder start path must use configureServerVoiceRecorder instead of duplicating handlers.",
		],
		[
			"recorder.onstop =",
			"Initial voice recorder start path must use configureServerVoiceRecorder instead of duplicating stop behavior.",
		],
	]) {
		exercised.add(message);
		if (!startBlock.includes(marker)) {
			liveLocksHeld.push(message);
		} else if (
			appSource.includes("function configureServerVoiceRecorder(") === false
		) {
			absent.push(
				`${message} [нарушен вместе со снесённой configureServerVoiceRecorder]`,
			);
		} else {
			liveLockFailures.push(message);
		}
	}
}

const manualStopBlock =
	stopIndex === -1
		? null
		: blockBetween(
				"function stopServerVoiceRecording()",
				"function startImportDictation()",
			);
if (manualStopBlock === null) {
	unevaluable.push(
		"Manual stop checks [блок stopServerVoiceRecording..startImportDictation отсутствует]",
	);
} else {
	requireIn(
		manualStopBlock,
		"serverVoiceRecordingShouldContinueRef.current = false;",
		"Manual stop must prevent automatic recorder restart.",
	);
	requireIn(
		manualStopBlock,
		"serverVoiceRecordingStopRequestedRef.current = true;",
		"Manual stop must be marked before stopping MediaRecorder.",
	);
}

const uploadStart = appSource.indexOf("async function uploadSpeechBlob(");
const uploadEnd = appSource.indexOf(
	"function stopSpeechMonitor()",
	uploadStart,
);
if (uploadStart === -1 || uploadEnd === -1) {
	unevaluable.push(
		"Speech upload block was not found. [uploadSpeechBlob..stopSpeechMonitor]",
	);
} else {
	const uploadBlock = appSource.slice(uploadStart, uploadEnd);
	const quietBlockStart = uploadBlock.indexOf("if (chunkHadVoice === false) {");
	const queuedUploadIndex = uploadBlock.indexOf("const queuedBeforeUpload");
	if (
		quietBlockStart === -1 ||
		queuedUploadIndex === -1 ||
		quietBlockStart > queuedUploadIndex
	) {
		unevaluable.push(
			"Speech quiet-chunk handling block was not found. " +
				`[chunkHadVoice===false: ${quietBlockStart}, queuedBeforeUpload: ${queuedUploadIndex}]`,
		);
	} else {
		const quietChunkBlock = uploadBlock.slice(
			quietBlockStart,
			queuedUploadIndex,
		);
		forbidIn(
			quietChunkBlock,
			"return;",
			"Quiet local voice-meter readings must not return before the audio is queued and sent.",
		);
	}
}

/*
 * ХРАПОВИК В ОБЕ СТОРОНЫ. Реестр отсутствия обязан совпадать с действительностью:
 * закрытая запись (требование снова выполняется) и запись без утверждения — обе
 * означают, что реестр начал врать.
 */
const heldSet = new Set(liveLocksHeld);
const closedDebt = [...KNOWN_ABSENT_RECORDER_RESILIENCE].filter((message) =>
	heldSet.has(message),
);
const untestedDebt = [...KNOWN_ABSENT_RECORDER_RESILIENCE].filter(
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
			"Уберите их из KNOWN_ABSENT_RECORDER_RESILIENCE в " +
			"scripts/smoke-speech-recorder-resilience-source.mjs, иначе реестр начнёт врать:",
	);
	for (const message of closedDebt) report.push(`  + ${message}`);
	report.push("");
}
if (untestedDebt.length > 0) {
	report.push(
		`РЕЕСТР РАЗОШЁЛСЯ С ПРОВЕРКАМИ (${untestedDebt.length}): записи есть, утверждений для них нет. ` +
			"Уберите их из KNOWN_ABSENT_RECORDER_RESILIENCE:",
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

const brokenLiveLock =
	liveLockFailures.length > 0 ||
	closedDebt.length > 0 ||
	untestedDebt.length > 0;
if (brokenLiveLock) {
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
		guard: "speech-recorder-unexpected-stop-resilience",
		liveLocksHeld: liveLocksHeld.length,
	}),
);
