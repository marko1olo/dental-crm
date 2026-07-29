import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

/*
 * НАБОР ФАЙЛОВ РАСШИРЕН, И ЭТО НЕ СДЕЛАНО ВСЛЕПУЮ.
 *
 * Экран диктовки приёма УЕХАЛ из App.tsx: разметка живёт в apps/web/src/VisitView.tsx
 * и в apps/web/src/components/visit/*. Замер:
 *
 *   rg -F -n 'className="dictation-actions"' apps/web/src
 *     -> apps/web/src/VisitView.tsx:713   (единственное вхождение)
 *   rg -F -n 'visit-note-panel' apps/web/src --glob '*.tsx'
 *     -> apps/web/src/components/visit/VisitEmkTab.tsx:229
 *
 * Старый набор (App.tsx + логика) этих файлов НЕ ЧИТАЛ, поэтому обе границы блока
 * действий не находились и страж докладывал «Visit dictation actions block was not
 * found» — то есть указывал не туда, где сегодня экран.
 *
 * ПОЧЕМУ РАСШИРЕНИЕ БЕЗОПАСНО И НИЧЕГО НЕ МАСКИРУЕТ. Прежде чем расширять, все 28
 * маркеров этого стража прогнаны по ВСЕМ 469 файлам .ts/.tsx/.css в apps/web/src:
 * ни одного вхождения ни у одного. Значит расширение НЕ делает ни одно требование
 * зелёным сегодня — оно только исправляет, ГДЕ страж будет искать, когда поведение
 * вернут. Расширять набор, не проверив этого, нельзя: тогда «требование к экрану
 * приёма» начнёт выполняться файлом настроек.
 */
const VISIT_COMPONENTS_DIR = "apps/web/src/components/visit";
async function visitComponentSources() {
	let names = [];
	try {
		names = (await readdir(VISIT_COMPONENTS_DIR))
			.filter((name) => name.endsWith(".tsx") && !name.includes(".test."))
			.sort();
	} catch {
		// Папки может не быть — тогда набор без неё.
	}
	return Promise.all(
		names.map((name) =>
			readFile(path.join(VISIT_COMPONENTS_DIR, name), "utf8"),
		),
	);
}

const appSource = [
	await readFile("apps/web/src/App.tsx", "utf8"),
	await readAppLogicSource(),
	await readFile("apps/web/src/VisitView.tsx", "utf8"),
	...(await visitComponentSources()),
]
	.join("\n")
	.replace(/\r\n/g, "\n");

/*
 * ЭТОТ СТРАЖ КРАСНЫЙ ЗАКОННО: ЗАЩИЩАЕМОГО ПОВЕДЕНИЯ В ПРОДУКТЕ НЕТ.
 *
 * Класс REAL по требованиям + STALE по указателю на файлы (второе исправлено выше).
 * Продукт НЕ ТРОГАЕТСЯ, ни одно требование НЕ УДАЛЕНО.
 *
 * ЧТО БЫЛО НЕ ТАК СО СТРАЖЕМ. `fail()` делал `process.exit(1)` на первом же
 * непрошедшем требовании: из 30 наружу выходило ОДНО сообщение, а ОБА запрета
 * (единственное, что здесь ещё живо) стоят ниже и не исполнялись ни разу.
 *
 * ЧТО СЕЙЧАС В ПРОДУКТЕ ВМЕСТО ТРЕБУЕМОГО. Экран диктовки ПЕРЕПИСАН, и переписан
 * мимо этих требований:
 *
 *   VisitView.tsx:713-825 — блок действий диктовки. Кнопки НЕ спрятаны за
 *     вычисленными условиями (`showDictationProcessingActions` и остальных
 *     восьми `showDictation*` нет нигде), они всегда отрисованы и лишь `disabled`.
 *   VisitView.tsx:756-762 — вместо «Собрать ЭМК» кнопка «Собрать нейро-черновик».
 *   VisitView.tsx:793-806 — вместо «Упорядочить текст» кнопка «Очистить текст».
 *   VisitView.tsx:714-730 — вместо пары «серверная запись / браузерный откат» с
 *     вычисленными подписями стоит один <SmartMicrophoneButton context="visit">;
 *     ни serverVoiceRecordButtonLabel, ни browserVoiceRecordButtonLabel не
 *     существует.
 *   VisitView.tsx:780-792 — И ЭТО РЕГРЕССИЯ, А НЕ ПРОСТО ПРОПУСК: управление
 *     локальной очередью аудио СНОВА лежит внутри <details
 *     className="advanced-dictation-actions"> с подписью «Дополнительно» — ровно
 *     то, что запрещает требование «more-actions menu must not be used as the
 *     primary queued-audio control». Карточки очереди (`dictation-queue-card`)
 *     нет ни в одном .tsx, при этом её стили в apps/web/src/styles/main.css
 *     остались — мёртвый CSS.
 *
 * Врач с фрагментами в локальной очереди не видит их в основной области: чтобы
 * узнать, что звук не отправлен, надо раскрыть «Дополнительно».
 *
 * ЭТО НЕ КЛАСС STALE ПО ТРЕБОВАНИЯМ. Все 28 маркеров отсутствуют во всех 469
 * файлах apps/web/src:
 *   rg -l 'showDictationProcessingActions' apps/web/src -> пусто
 *   rg -l 'serverVoiceRecordButtonLabel'   apps/web/src -> пусто
 *   rg -l 'dictation-queue-card' apps/web/src -> только styles/main.css
 *   rg -F -l 'Собрать ЭМК' apps/web -> пусто
 *
 * ЗАКРЫТЬ ЭТОТ ДОЛГ = ВЕРНУТЬ ПОВЕДЕНИЕ НА ЭКРАН. Работа владельца экрана приёма.
 */

const absent = [];
const liveLockFailures = [];
const unevaluable = [];
const liveLocksHeld = [];

/* РЕЕСТР ОБЪЯВЛЕННОГО ОТСУТСТВИЯ. КЛЮЧ — ТЕКСТ ТРЕБОВАНИЯ, ДОСЛОВНО. */
const KNOWN_ABSENT_DICTATION_ACTIONS = new Set([
	"Visit dictation must treat server microphone startup as active voice work.",
	"Visit dictation server voice button must be disabled while microphone startup is in progress.",
	"Visit dictation microphone test must stay hidden while recording or recognition is active.",
	"Visit dictation microphone test must hide after text exists unless the voice state is problematic.",
	"Visit dictation text processing actions must appear only after text exists and voice work is finished.",
	"Visit dictation more-actions menu must not be used as the primary queued-audio control.",
	"Visit dictation must surface queued audio in a visible card instead of hiding it in diagnostics.",
	"Visit dictation queued-audio card must explain automatic recognition retry in doctor-readable copy.",
	"Visit dictation queued-audio card must render in the main dictation area.",
	"Visit dictation must not show the EMK-missing panel in the empty idle state.",
	"Visit dictation quick phrases must stay only in the empty idle state.",
	"Visit dictation voice readiness status must hide after text exists unless voice work or a problem is active.",
	"Visit dictation system status must be hidden in the normal idle state and shown for voice work or opened diagnostics.",
	"Visit dictation processing buttons must be gated by showDictationProcessingActions.",
	"Visit dictation EMK-missing panel must be gated by showVisitDraftMissingPanel.",
	"Visit dictation quick phrase row must be gated by showDictationQuickPhrases.",
	"Visit dictation voice status strip must be gated by showDictationVoiceStatus.",
	"Visit dictation system status details must be gated by showDictationSystemStatus.",
	"Visit dictation must explain the waiting state instead of asking the doctor to start recording again.",
	"Visit dictation server voice button must use a dedicated readable label.",
	"Visit dictation server voice button must say Add voice after text exists.",
	"Visit dictation browser fallback button must use a dedicated readable label.",
	"Visit dictation server Add voice action must become secondary after text exists.",
	"Visit dictation browser Add voice fallback must become secondary after text exists.",
	"Visit dictation server record button must render the computed label.",
	"Visit dictation browser record button must render the computed label.",
	"Visit dictation server record button must render the computed visual priority.",
	"Visit dictation browser record button must render the computed visual priority.",
]);

const exercised = new Set();

function requireIn(source, marker, message) {
	exercised.add(message);
	if (source.includes(marker)) {
		liveLocksHeld.push(message);
		return;
	}
	if (KNOWN_ABSENT_DICTATION_ACTIONS.has(message)) {
		absent.push(message);
		return;
	}
	liveLockFailures.push(message);
}

function forbidIn(source, marker, message) {
	exercised.add(message);
	if (source.includes(marker)) {
		liveLockFailures.push(message);
		return;
	}
	liveLocksHeld.push(message);
}

requireIn(
	appSource,
	"const speechVoiceWorkBusy = isServerVoiceRecordingStarting || isServerVoiceRecording || isVisitDictating || isVisitDictationStarting || speechTranscriptionBusy;",
	"Visit dictation must treat server microphone startup as active voice work.",
);
requireIn(
	appSource,
	"disabled={isSpeechMicrophoneTesting || isServerVoiceRecordingStarting || (!isServerVoiceRecording && speechTranscriptionBusy)}",
	"Visit dictation server voice button must be disabled while microphone startup is in progress.",
);
requireIn(
	appSource,
	"const showDictationMicrophoneTestAction =\n    speechMicrophoneTestAvailable && !speechVoiceWorkBusy",
	"Visit dictation microphone test must stay hidden while recording or recognition is active.",
);
requireIn(
	appSource,
	'speechMicrophoneTestAvailable && !speechVoiceWorkBusy && (!hasVisitTranscriptText || speechRetrySuggested || dictationNoticeState === "warn");',
	"Visit dictation microphone test must hide after text exists unless the voice state is problematic.",
);
requireIn(
	appSource,
	"const showDictationProcessingActions = hasVisitTranscriptText && !speechVoiceWorkBusy;",
	"Visit dictation text processing actions must appear only after text exists and voice work is finished.",
);
requireIn(
	appSource,
	"const showDictationMoreActions = showDictationProcessingActions || Boolean(clearedTranscriptSnapshot);",
	"Visit dictation more-actions menu must not be used as the primary queued-audio control.",
);
requireIn(
	appSource,
	"const showPendingSpeechQueueCard = pendingSpeechChunkCount > 0 && !speechTranscriptionBusy;",
	"Visit dictation must surface queued audio in a visible card instead of hiding it in diagnostics.",
);
requireIn(
	appSource,
	"CRM сама отправляет очередь на распознавание. Можно нажать кнопку, чтобы проверить прямо сейчас.",
	"Visit dictation queued-audio card must explain automatic recognition retry in doctor-readable copy.",
);
requireIn(
	appSource,
	'className="dictation-queue-card"',
	"Visit dictation queued-audio card must render in the main dictation area.",
);
requireIn(
	appSource,
	"const showVisitDraftMissingPanel = !visitDraftReadyToBuild && hasVisitTranscriptText;",
	"Visit dictation must not show the EMK-missing panel in the empty idle state.",
);
requireIn(
	appSource,
	"const showDictationQuickPhrases = !hasVisitTranscriptText && !speechVoiceWorkBusy;",
	"Visit dictation quick phrases must stay only in the empty idle state.",
);
requireIn(
	appSource,
	'const showDictationVoiceStatus = !hasVisitTranscriptText || speechVoiceWorkBusy || dictationNoticeState === "warn" || pendingSpeechChunkCount > 0;',
	"Visit dictation voice readiness status must hide after text exists unless voice work or a problem is active.",
);
requireIn(
	appSource,
	"const showDictationSystemStatus =\n    dictationSystemStatusOpen ||\n    speechVoiceWorkBusy ||",
	"Visit dictation system status must be hidden in the normal idle state and shown for voice work or opened diagnostics.",
);
requireIn(
	appSource,
	"{showDictationProcessingActions ? (",
	"Visit dictation processing buttons must be gated by showDictationProcessingActions.",
);
requireIn(
	appSource,
	"{showVisitDraftMissingPanel ? (",
	"Visit dictation EMK-missing panel must be gated by showVisitDraftMissingPanel.",
);
requireIn(
	appSource,
	"{showDictationQuickPhrases ? (",
	"Visit dictation quick phrase row must be gated by showDictationQuickPhrases.",
);
requireIn(
	appSource,
	"{showDictationVoiceStatus ? (",
	"Visit dictation voice status strip must be gated by showDictationVoiceStatus.",
);
requireIn(
	appSource,
	"{showDictationSystemStatus ? (",
	"Visit dictation system status details must be gated by showDictationSystemStatus.",
);
requireIn(
	appSource,
	"Голос еще записывается или распознается. Когда текст появится в поле, CRM даст собрать ЭМК.",
	"Visit dictation must explain the waiting state instead of asking the doctor to start recording again.",
);
requireIn(
	appSource,
	"const serverVoiceRecordButtonLabel = isServerVoiceRecording",
	"Visit dictation server voice button must use a dedicated readable label.",
);
requireIn(
	appSource,
	'? "Добавить голос"\n          : "Записать голос"',
	"Visit dictation server voice button must say Add voice after text exists.",
);
requireIn(
	appSource,
	"const browserVoiceRecordButtonLabel = isVisitDictationStarting",
	"Visit dictation browser fallback button must use a dedicated readable label.",
);
requireIn(
	appSource,
	'const serverVoiceRecordButtonClassName =\n    isServerVoiceRecording || hasVisitTranscriptText ? "secondary-button" : "primary-button";',
	"Visit dictation server Add voice action must become secondary after text exists.",
);
requireIn(
	appSource,
	'const browserVoiceRecordButtonClassName =\n    isVisitDictating || hasVisitTranscriptText ? "secondary-button" : "primary-button";',
	"Visit dictation browser Add voice fallback must become secondary after text exists.",
);
requireIn(
	appSource,
	"{serverVoiceRecordButtonLabel}",
	"Visit dictation server record button must render the computed label.",
);
requireIn(
	appSource,
	"{browserVoiceRecordButtonLabel}",
	"Visit dictation browser record button must render the computed label.",
);
requireIn(
	appSource,
	"className={serverVoiceRecordButtonClassName}",
	"Visit dictation server record button must render the computed visual priority.",
);
requireIn(
	appSource,
	"className={browserVoiceRecordButtonClassName}",
	"Visit dictation browser record button must render the computed visual priority.",
);

/*
 * ЖИВЫЕ ЛОКИ. ДО ЭТОЙ ПРАВКИ ОНИ НЕ ИСПОЛНЯЛИСЬ НИ РАЗУ — стояли ниже первого
 * непрошедшего требования, а `fail()` выходил из процесса. Запирают настоящий
 * дефект: отдельная всегда-выключенная кнопка «Ждет голос», которая ничего не
 * делает и путает врача, пока статус голоса рядом уже всё объясняет. В продукте
 * этих строк нет — запрет держит, и теперь это проверено, а не подразумевается.
 */
forbidIn(
	appSource,
	"{showDictationVoiceWaitAction ? (",
	"Visit dictation must not show a redundant disabled waiting button while the main voice status already explains recognition.",
);
forbidIn(
	appSource,
	"Ждет голос",
	"Visit dictation must not show the confusing redundant 'wait for voice' action.",
);

/*
 * БЛОК ДЕЙСТВИЙ ДИКТОВКИ. ГРАНИЦЫ ТЕПЕРЬ УСТОЙЧИВЫ К ФОРМАТИРОВАНИЮ.
 *
 * Раньше начало искалось дословной строкой '<div className="dictation-actions">',
 * а в VisitView.tsx у этого div есть атрибут style, поэтому дословная строка не
 * совпадала НИКОГДА. Конец искался цепочкой из закрывающих тегов с ровно
 * двенадцатью пробелами отступа и соседним <section className="visit-note-panel" —
 * этот section уехал в components/visit/VisitEmkTab.tsx и оброс длинным
 * className, так что и он не совпадал никогда. Обе границы были вырожденными.
 *
 * Теперь начало — образец по самому классу, конец — следующая граница верхнего
 * уровня после блока. Если конец не найден, блок берётся до конца файла-источника,
 * и об этом докладывается, а не режется `slice(start, -1)`.
 */
const actionsStartMatch = appSource.match(/<div className="dictation-actions"/);
const actionsStart = actionsStartMatch ? actionsStartMatch.index : -1;
let actionsBlock = null;
if (actionsStart === -1) {
	unevaluable.push(
		"Visit dictation actions block was not found. " +
			'[образец <div className="dictation-actions" не найден ни в App.tsx, ни в VisitView.tsx, ни в components/visit]',
	);
} else {
	const rest = appSource.slice(actionsStart);
	const endMatch = rest
		.slice(1)
		.match(/\n {0,14}<(?:section|VisiographAnalyzer|\/div>\s*\n\s*<\/div>)/);
	actionsBlock = endMatch ? rest.slice(0, endMatch.index + 1) : rest;
}

if (actionsBlock !== null) {
	const processingGateIndex = actionsBlock.indexOf(
		"{showDictationProcessingActions ? (",
	);
	const buildButtonIndex = actionsBlock.indexOf("Собрать ЭМК");
	const polishButtonIndex = actionsBlock.indexOf("Упорядочить текст");
	if (
		processingGateIndex === -1 ||
		buildButtonIndex === -1 ||
		polishButtonIndex === -1
	) {
		absent.push(
			"Visit dictation processing controls are missing from the actions block. " +
				`[показ по условию: ${processingGateIndex}, «Собрать ЭМК»: ${buildButtonIndex}, ` +
				`«Упорядочить текст»: ${polishButtonIndex}; блок найден, длина ${actionsBlock.length}]`,
		);
		unevaluable.push(
			"Visit dictation processing controls must be below the processing-actions gate. " +
				"[порядок проверять не на чем: ни условия показа, ни обеих кнопок в блоке нет]",
		);
	} else if (
		buildButtonIndex < processingGateIndex ||
		polishButtonIndex < processingGateIndex
	) {
		liveLockFailures.push(
			"Visit dictation processing controls must be below the processing-actions gate.",
		);
	} else {
		liveLocksHeld.push(
			"Visit dictation processing controls must be below the processing-actions gate.",
		);
	}
}

/* ХРАПОВИК В ОБЕ СТОРОНЫ. */
const heldSet = new Set(liveLocksHeld);
const closedDebt = [...KNOWN_ABSENT_DICTATION_ACTIONS].filter((message) =>
	heldSet.has(message),
);
const untestedDebt = [...KNOWN_ABSENT_DICTATION_ACTIONS].filter(
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
			"Уберите их из KNOWN_ABSENT_DICTATION_ACTIONS в " +
			"scripts/smoke-visit-dictation-simplified-actions-source.mjs, иначе реестр начнёт врать:",
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
		`ОБЪЯВЛЕННОЕ ОТСУТСТВИЕ (${absent.length}) — экран диктовки переписан мимо этих ` +
			"требований, маркеров нет ни в одном из 469 файлов apps/web/src. Управление " +
			"очередью аудио снова спрятано в «Дополнительно» (VisitView.tsx:780-792). " +
			"Продукт этой проверкой не правится; закрыть долг = вернуть поведение:",
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
		guard: "visit-dictation-simplified-actions",
		liveLocksHeld: liveLocksHeld.length,
	}),
);
