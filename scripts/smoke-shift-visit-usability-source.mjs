import { readFileSync } from "node:fs";

import { existsSync } from "node:fs";
const appSource = readFileSync("apps/web/src/App.tsx", "utf8") + "\n" + (existsSync("apps/web/src/VisitView.tsx") ? readFileSync("apps/web/src/VisitView.tsx", "utf8") : "");
const shellSource = readFileSync("apps/web/src/workspaceShell.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

function requireIn(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

requireIn(appSource, "window.location.href = `tel:", "Shift call action must open the patient phone number.");
requireIn(appSource, "activePatientHasCallablePhone", "Shift call action must use a normalized phone readiness guard.");
requireIn(appSource, "activePatientCallablePhone", "Shift call action must call a sanitized phone number.");
requireIn(appSource, "disabled={!activePatientHasCallablePhone}", "Shift call action must be disabled when the phone is missing.");
requireIn(appSource, 'aria-describedby={!activePatientHasCallablePhone ? "shift-call-guidance" : undefined}', "Shift call action must point to missing-phone guidance.");
requireIn(appSource, 'id="shift-call-guidance"', "Shift call action must render missing-phone guidance.");
requireIn(appSource, "В карточке пациента нет телефона. Откройте «Пациенты»", "Shift call guidance must tell the user how to fix a missing phone.");
requireIn(appSource, "В карточке пациента нет телефона. Добавьте номер", "Shift call handler must fail visibly if invoked without a callable phone.");
forbidIn(appSource, '<button className="secondary-button" type="button">\n                <Phone', "Shift call action must not be a dead button.");

requireIn(appSource, "const state = activeVisitToothStateByCode[code] ?? toothStateByCode[code] ?? \"idle\";", "Tooth map must keep visit-specific visual tooth states.");
requireIn(appSource, "className={`tooth tooth-${state} ${selectedToothCode === code ? \"selected\" : \"\"}`}", "Tooth map must show state and selected tooth visually.");
requireIn(appSource, "onClick={() => applyActiveToothMapTool(code)}", "Tooth map cells must apply the active tool immediately.");
requireIn(appSource, "aria-label={`Зуб ${code}: ${toothMapStateLabels[state]}. Применить ${toothMapToolLabels[toothMapActiveTool]}`}", "Tooth map cells must expose active-tool action for accessibility.");

requireIn(shellSource, "top-dictation-button", "Topbar must expose the dictation shortcut.");
requireIn(shellSource, "onClick={onGoToDictation}", "Topbar dictation button must be wired.");

requireIn(appSource, "hasVisitTranscriptText", "Visit workflow must use a named transcript readiness guard.");
requireIn(appSource, 'aria-describedby={!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined}', "Visit dictation clear action must point to empty-dictation guidance.");
requireIn(appSource, 'id="dictation-clear-guidance"', "Visit dictation must render empty-dictation guidance.");
requireIn(appSource, "Диктовка уже пустая. Нечего очищать.", "Visit dictation clear action must fail visibly when invoked without text.");
requireIn(appSource, "Нет очищенной диктовки для восстановления.", "Visit dictation undo action must fail visibly when there is no undo buffer.");
requireIn(appSource, "if (isVisitDictating || isVisitDictationStarting)", "Visit browser dictation must handle duplicate starts.");
requireIn(appSource, "stopVisitDictation();", "Visit browser dictation duplicate action must stop the active dictation.");
requireIn(appSource, "Данные приема еще не загружены. Повторите запись после загрузки рабочего экрана.", "Visit server dictation must fail visibly while dashboard data is missing.");
requireIn(appSource, "Запись уже идет. Нажмите «Стоп запись»", "Visit server dictation must guard duplicate recording starts.");
requireIn(appSource, "Активной записи диктовки нет.", "Visit server dictation stop action must fail visibly when no recording is active.");
requireIn(appSource, "visitDraftBuildMissingSteps", "Visit workflow must explain why draft generation is blocked.");
requireIn(appSource, "visit-draft-missing", "Visit workflow must render draft missing-field guidance.");
requireIn(appSource, "disabled={isDraftLoading || !visitDraftReadyToBuild}", "Visit draft generation must be blocked until dictation is ready.");
requireIn(appSource, 'aria-describedby={!visitDraftReadyToBuild ? "visit-draft-missing" : undefined}', "Visit draft generation button must point to missing-step guidance.");
requireIn(appSource, 'id="visit-draft-missing"', "Visit draft missing-step guidance must be addressable.");
requireIn(appSource, "const showDictationProcessingActions = hasVisitTranscriptText && !speechVoiceWorkBusy;", "Visit transcript polish actions must only render when dictation text is ready.");
requireIn(appSource, "disabled={isTranscriptPolishing}", "Visit transcript polish must guard duplicate polish runs.");
requireIn(appSource, 'aria-describedby={!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined}', "Visit transcript actions must point to empty-dictation guidance.");
requireIn(appSource, "disabled={!hasVisitTranscriptText || speechVoiceWorkBusy}", "Visit offline parser must share the readiness guard and avoid voice-work races.");
requireIn(appSource, "Добавьте текст диктовки перед локальным разбором.", "Visit offline parser must fail visibly when invoked without dictation.");
requireIn(appSource, "Перед очисткой диктовки:", "Visit transcript polish must fail visibly when invoked without dictation.");
requireIn(appSource, "Перед сборкой черновика:", "Visit draft generation handler must fail visibly when invoked while blocked.");
requireIn(appSource, "visitDraftUserEditedRef", "Late server draft restore must not overwrite doctor edits.");
requireIn(appSource, "if (visitDraftUserEditedRef.current)", "Visit restore must check user edits before applying server draft.");
requireIn(appSource, "visitDraftSignalLabels", "Visit draft quality signals must have doctor-readable labels.");
requireIn(appSource, "visitDraftMissingFieldLabels", "Visit draft missing fields must have doctor-readable labels.");
requireIn(appSource, "{visitDraftSignalLabel(signal)}", "Visit draft quality signals must not render raw internal ids.");
requireIn(appSource, "{visitDraftMissingFieldLabel(field)}", "Visit draft missing fields must not render raw internal ids.");
requireIn(appSource, 'sourceLabel: "Локальный разбор диктовки"', "Visit offline draft source must use doctor-readable wording.");
requireIn(appSource, 'sourceLabel: "Локальная очистка диктовки"', "Visit local polish fallback source must use doctor-readable wording.");
requireIn(appSource, "локальная проверка правил", "Visit local polish mode label must use doctor-readable wording.");
requireIn(appSource, "Текст очищен локальным разбором без сервера.", "Visit local polish fallback status must not expose parser jargon.");
requireIn(appSource, "Использован локальный разбор.", "Visit local polish fallback error must not expose parser jargon.");
requireIn(appSource, "Включен офлайн-разбор.", "Visit offline draft fallback error must not expose parser jargon.");
requireIn(appSource, "aiJobKindLabels", "Settings recognition source labels must be derived from human-readable job labels.");
forbidIn(appSource, "<span key={signal}>{signal}</span>", "Visit draft quality signals must not expose raw internal ids.");
forbidIn(appSource, "<small key={field}>проверить: {field}</small>", "Visit draft missing fields must not expose raw internal ids.");
forbidIn(appSource, 'sourceLabel: "Офлайн-парсер"', "Visit offline draft source must not expose parser jargon.");
forbidIn(appSource, "локальный парсер правил", "Visit local polish mode label must not expose parser jargon.");
forbidIn(appSource, "Текст очищен локальным парсером без сервера.", "Visit local polish fallback status must not expose parser jargon.");
forbidIn(appSource, "Использован локальный парсер.", "Visit local polish fallback error must not expose parser jargon.");
forbidIn(appSource, "Включен офлайн-парсер.", "Visit offline draft fallback error must not expose parser jargon.");
forbidIn(appSource, 'sourceLabel: "Локальный speech-polish"', "Visit local polish fallback must not expose implementation jargon.");
forbidIn(appSource, "sourceLabel: `settings_${recognitionKind}`", "Settings recognition source must not expose raw enum ids.");
forbidIn(appSource, "recall {formatShortDate(activePatientInsight.recallDueAt)}", "Patient cockpit must not expose English recall wording.");
requireIn(appSource, "visitNoteAcceptMissingSteps", "Visit note save action must explain why accepting is blocked.");
requireIn(appSource, "visitNoteReadyToAccept", "Visit note save action must use a named readiness guard.");
requireIn(appSource, "visit-note-missing", "Visit note save guidance must render missing steps.");
requireIn(appSource, "disabled={!visitNoteReadyToAccept || isDraftAccepting}", "Visit note save button must be blocked until EMK is ready.");
requireIn(appSource, 'aria-describedby={!visitNoteReadyToAccept ? "visit-note-missing" : undefined}', "Visit note save button must point to missing-step guidance.");
requireIn(appSource, 'id="visit-note-missing"', "Visit note missing-step guidance must be addressable.");
requireIn(appSource, "Данные приема еще не загружены. Повторите сохранение после загрузки рабочего экрана.", "Visit note save handler must fail visibly while dashboard data is missing.");
requireIn(appSource, "Перед сохранением приема:", "Visit note save handler must fail visibly if invoked while blocked.");
requireIn(appSource, "visitWorkflowSteps", "Visit workflow must expose a simple doctor-facing progress model.");
requireIn(appSource, "visitPrimaryAction", "Visit workflow must compute a single next action for non-technical doctors.");
requireIn(appSource, "повторный визит {formatShortDate(activePatientInsight.recallDueAt)}", "Patient cockpit recall date must use Russian wording.");
requireIn(appSource, 'data-testid="visit-next-step-panel"', "Visit workflow must render the single next-step panel.");
requireIn(appSource, 'data-testid="visit-primary-action"', "Visit workflow must render a wired primary next action.");
requireIn(appSource, 'data-testid="visit-progress-strip"', "Visit workflow must render the visit progress strip.");
requireIn(appSource, "Записать голос", "Visit voice action must use human wording instead of STT jargon.");
requireIn(appSource, 'label: "Работа без сети"', "Visit safety device checks must use clinician-readable offline wording.");
requireIn(appSource, "аудио сохранится для отправки позже", "Visit safety device checks must describe queued audio without IndexedDB jargon.");
requireIn(appSource, "эта вкладка готова к работе без сети", "Visit safety device checks must describe offline readiness without service worker jargon.");
forbidIn(appSource, "Сервер STT", "Visit workflow must not expose STT jargon in the main doctor screen.");
forbidIn(appSource, "Отправить STT", "Visit workflow must not expose STT jargon in queued audio actions.");
forbidIn(appSource, "Очистить STT", "Visit workflow must not expose STT jargon in transcript cleanup.");
forbidIn(appSource, 'label: "PWA-оболочка"', "Visit safety device checks must not expose PWA jargon.");
forbidIn(appSource, "очередь IndexedDB", "Visit safety device checks must not expose IndexedDB jargon.");
forbidIn(appSource, "service worker", "Visit safety device checks must not expose service worker jargon.");
requireIn(cssSource, ".visit-note-missing", "Visit note save guidance must be styled.");
requireIn(cssSource, ".hero-call-guidance", "Shift missing-phone guidance must be styled.");
requireIn(cssSource, ".dictation-action-guidance", "Visit empty-dictation guidance must be styled.");
requireIn(cssSource, ".visit-next-step", "Visit next-step panel must be styled.");
requireIn(cssSource, ".visit-progress-strip", "Visit progress strip must be styled.");

console.log(
  JSON.stringify(
    {
      ok: true,
      callActionWired: true,
      callActionExplainsMissingPhone: true,
      toothMapNotFakeButtons: true,
      dictationShortcutWired: true,
      draftBuildExplainsMissingSteps: true,
      dictationNoOpsExplainState: true,
      lateRestoreGuarded: true,
      visitNoteAcceptExplainsMissingSteps: true,
      visitNextStepPanel: true
    },
    null,
    2
  )
);
