import { readFile } from "node:fs/promises";

const appSource = (await readFile("apps/web/src/App.tsx", "utf8")).replace(/\r\n/g, "\n");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireIn(source, marker, message) {
  if (!source.includes(marker)) fail(message);
}

function forbidIn(source, marker, message) {
  if (source.includes(marker)) fail(message);
}

requireIn(
  appSource,
  "const speechVoiceWorkBusy = isServerVoiceRecordingStarting || isServerVoiceRecording || isVisitDictating || isVisitDictationStarting || speechTranscriptionBusy;",
  "Visit dictation must treat server microphone startup as active voice work."
);
requireIn(
  appSource,
  "disabled={isSpeechMicrophoneTesting || isServerVoiceRecordingStarting || (!isServerVoiceRecording && speechTranscriptionBusy)}",
  "Visit dictation server voice button must be disabled while microphone startup is in progress."
);
requireIn(
  appSource,
  "const showDictationMicrophoneTestAction =\n    speechMicrophoneTestAvailable && !speechVoiceWorkBusy",
  "Visit dictation microphone test must stay hidden while recording or recognition is active."
);
requireIn(
  appSource,
  "speechMicrophoneTestAvailable && !speechVoiceWorkBusy && (!hasVisitTranscriptText || speechRetrySuggested || dictationNoticeState === \"warn\");",
  "Visit dictation microphone test must hide after text exists unless the voice state is problematic."
);
requireIn(
  appSource,
  "const showDictationProcessingActions = hasVisitTranscriptText && !speechVoiceWorkBusy;",
  "Visit dictation text processing actions must appear only after text exists and voice work is finished."
);
requireIn(
  appSource,
  "const showDictationMoreActions = showDictationProcessingActions || Boolean(clearedTranscriptSnapshot);",
  "Visit dictation more-actions menu must not be used as the primary queued-audio control."
);
requireIn(
  appSource,
  "const showPendingSpeechQueueCard = pendingSpeechChunkCount > 0 && !speechTranscriptionBusy;",
  "Visit dictation must surface queued audio in a visible card instead of hiding it in diagnostics."
);
requireIn(
  appSource,
  "CRM сама отправляет очередь на распознавание. Можно нажать кнопку, чтобы проверить прямо сейчас.",
  "Visit dictation queued-audio card must explain automatic recognition retry in doctor-readable copy."
);
requireIn(
  appSource,
  'className="dictation-queue-card"',
  "Visit dictation queued-audio card must render in the main dictation area."
);
requireIn(
  appSource,
  "const showVisitDraftMissingPanel = !visitDraftReadyToBuild && hasVisitTranscriptText;",
  "Visit dictation must not show the EMK-missing panel in the empty idle state."
);
requireIn(
  appSource,
  "const showDictationQuickPhrases = !hasVisitTranscriptText && !speechVoiceWorkBusy;",
  "Visit dictation quick phrases must stay only in the empty idle state."
);
requireIn(
  appSource,
  "const showDictationVoiceStatus = !hasVisitTranscriptText || speechVoiceWorkBusy || dictationNoticeState === \"warn\" || pendingSpeechChunkCount > 0;",
  "Visit dictation voice readiness status must hide after text exists unless voice work or a problem is active."
);
requireIn(
  appSource,
  "const showDictationSystemStatus =\n    dictationSystemStatusOpen ||\n    speechVoiceWorkBusy ||",
  "Visit dictation system status must be hidden in the normal idle state and shown for voice work or opened diagnostics."
);
requireIn(
  appSource,
  "{showDictationProcessingActions ? (",
  "Visit dictation processing buttons must be gated by showDictationProcessingActions."
);
forbidIn(
  appSource,
  "{showDictationVoiceWaitAction ? (",
  "Visit dictation must not show a redundant disabled waiting button while the main voice status already explains recognition."
);
forbidIn(
  appSource,
  "Ждет голос",
  "Visit dictation must not show the confusing redundant 'wait for voice' action."
);
requireIn(
  appSource,
  "{showVisitDraftMissingPanel ? (",
  "Visit dictation EMK-missing panel must be gated by showVisitDraftMissingPanel."
);
requireIn(
  appSource,
  "{showDictationQuickPhrases ? (",
  "Visit dictation quick phrase row must be gated by showDictationQuickPhrases."
);
requireIn(
  appSource,
  "{showDictationVoiceStatus ? (",
  "Visit dictation voice status strip must be gated by showDictationVoiceStatus."
);
requireIn(
  appSource,
  "{showDictationSystemStatus ? (",
  "Visit dictation system status details must be gated by showDictationSystemStatus."
);
requireIn(
  appSource,
  "Голос еще записывается или распознается. Когда текст появится в поле, CRM даст собрать ЭМК.",
  "Visit dictation must explain the waiting state instead of asking the doctor to start recording again."
);
requireIn(
  appSource,
  "const serverVoiceRecordButtonLabel = isServerVoiceRecording",
  "Visit dictation server voice button must use a dedicated readable label."
);
requireIn(
  appSource,
  "? \"Добавить голос\"\n          : \"Записать голос\"",
  "Visit dictation server voice button must say Add voice after text exists."
);
requireIn(
  appSource,
  "const browserVoiceRecordButtonLabel = isVisitDictationStarting",
  "Visit dictation browser fallback button must use a dedicated readable label."
);
requireIn(
  appSource,
  "const serverVoiceRecordButtonClassName =\n    isServerVoiceRecording || hasVisitTranscriptText ? \"secondary-button\" : \"primary-button\";",
  "Visit dictation server Add voice action must become secondary after text exists."
);
requireIn(
  appSource,
  "const browserVoiceRecordButtonClassName =\n    isVisitDictating || hasVisitTranscriptText ? \"secondary-button\" : \"primary-button\";",
  "Visit dictation browser Add voice fallback must become secondary after text exists."
);
requireIn(
  appSource,
  "{serverVoiceRecordButtonLabel}",
  "Visit dictation server record button must render the computed label."
);
requireIn(
  appSource,
  "{browserVoiceRecordButtonLabel}",
  "Visit dictation browser record button must render the computed label."
);
requireIn(
  appSource,
  "className={serverVoiceRecordButtonClassName}",
  "Visit dictation server record button must render the computed visual priority."
);
requireIn(
  appSource,
  "className={browserVoiceRecordButtonClassName}",
  "Visit dictation browser record button must render the computed visual priority."
);

const actionsStart = appSource.indexOf('<div className="dictation-actions">');
const actionsEnd = appSource.indexOf('</div>\n            </div>\n\n            <section className="visit-note-panel"', actionsStart);
if (actionsStart === -1 || actionsEnd === -1) fail("Visit dictation actions block was not found.");
const actionsBlock = appSource.slice(actionsStart, actionsEnd);

const processingGateIndex = actionsBlock.indexOf("{showDictationProcessingActions ? (");
const buildButtonIndex = actionsBlock.indexOf("Собрать ЭМК");
const polishButtonIndex = actionsBlock.indexOf("Упорядочить текст");
if (processingGateIndex === -1 || buildButtonIndex === -1 || polishButtonIndex === -1) {
  fail("Visit dictation processing controls are missing from the actions block.");
}
if (buildButtonIndex < processingGateIndex || polishButtonIndex < processingGateIndex) {
  fail("Visit dictation processing controls must be below the processing-actions gate.");
}

console.log(JSON.stringify({ ok: true, guard: "visit-dictation-simplified-actions" }));
