import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
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

requireIn(appSource, 'className={`tooth tooth-${toothStateByCode[code] ?? "idle"}`}', "Tooth map must keep visual tooth states.");
forbidIn(appSource, '<button className={`tooth tooth-${toothStateByCode[code] ?? "idle"}`}', "Non-clickable tooth map cells must not be buttons.");

requireIn(shellSource, "top-dictation-button", "Topbar must expose the dictation shortcut.");
requireIn(shellSource, "onClick={onGoToDictation}", "Topbar dictation button must be wired.");

requireIn(appSource, "hasVisitTranscriptText", "Visit workflow must use a named transcript readiness guard.");
requireIn(appSource, 'aria-describedby={!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined}', "Visit dictation clear action must point to empty-dictation guidance.");
requireIn(appSource, 'id="dictation-clear-guidance"', "Visit dictation must render empty-dictation guidance.");
requireIn(appSource, "Диктовка уже пустая. Нечего очищать.", "Visit dictation clear action must fail visibly when invoked without text.");
requireIn(appSource, "Нет очищенной диктовки для восстановления.", "Visit dictation undo action must fail visibly when there is no undo buffer.");
requireIn(appSource, "Дождитесь завершения текущей браузерной диктовки.", "Visit browser dictation must guard duplicate starts.");
requireIn(appSource, "Данные приема еще не загружены. Повторите запись после загрузки рабочего экрана.", "Visit server dictation must fail visibly while dashboard data is missing.");
requireIn(appSource, "Запись уже идет. Нажмите «Стоп запись»", "Visit server dictation must guard duplicate recording starts.");
requireIn(appSource, "Активной записи диктовки нет.", "Visit server dictation stop action must fail visibly when no recording is active.");
requireIn(appSource, "visitDraftBuildMissingSteps", "Visit workflow must explain why draft generation is blocked.");
requireIn(appSource, "visit-draft-missing", "Visit workflow must render draft missing-field guidance.");
requireIn(appSource, "disabled={isDraftLoading || !visitDraftReadyToBuild}", "Visit draft generation must be blocked until dictation is ready.");
requireIn(appSource, "disabled={!hasVisitTranscriptText || isTranscriptPolishing}", "Visit transcript polish must share the readiness guard.");
requireIn(appSource, "disabled={!hasVisitTranscriptText}", "Visit offline parser must share the readiness guard.");
requireIn(appSource, "Добавьте текст диктовки перед локальным разбором.", "Visit offline parser must fail visibly when invoked without dictation.");
requireIn(appSource, "Перед очисткой диктовки:", "Visit transcript polish must fail visibly when invoked without dictation.");
requireIn(appSource, "Перед сборкой черновика:", "Visit draft generation handler must fail visibly when invoked while blocked.");
requireIn(appSource, "visitDraftUserEditedRef", "Late server draft restore must not overwrite doctor edits.");
requireIn(appSource, "if (visitDraftUserEditedRef.current)", "Visit restore must check user edits before applying server draft.");
requireIn(appSource, "visitNoteAcceptMissingSteps", "Visit note save action must explain why accepting is blocked.");
requireIn(appSource, "visitNoteReadyToAccept", "Visit note save action must use a named readiness guard.");
requireIn(appSource, "visit-note-missing", "Visit note save guidance must render missing steps.");
requireIn(appSource, "disabled={!visitNoteReadyToAccept || isDraftAccepting}", "Visit note save button must be blocked until EMK is ready.");
requireIn(appSource, "Данные приема еще не загружены. Повторите сохранение после загрузки рабочего экрана.", "Visit note save handler must fail visibly while dashboard data is missing.");
requireIn(appSource, "Перед сохранением приема:", "Visit note save handler must fail visibly if invoked while blocked.");
requireIn(cssSource, ".visit-note-missing", "Visit note save guidance must be styled.");
requireIn(cssSource, ".hero-call-guidance", "Shift missing-phone guidance must be styled.");
requireIn(cssSource, ".dictation-action-guidance", "Visit empty-dictation guidance must be styled.");

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
      visitNoteAcceptExplainsMissingSteps: true
    },
    null,
    2
  )
);
