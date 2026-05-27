import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

function requireIn(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

requireIn(appSource, "imagingViewerNoteReady", "Imaging viewer note action must use a named readiness guard.");
requireIn(appSource, "imagingViewerNoteText.length > 0", "Imaging viewer note readiness must use trimmed text.");
requireIn(appSource, "disabled={!imagingViewerNoteReady || !imagingViewerSessionReady}", "Imaging viewer note action must wait for note text and loaded session.");
requireIn(appSource, "Введите текст заметки перед добавлением к снимку.", "Imaging viewer note handler must explain empty-note failures.");
requireIn(appSource, "Дождитесь загрузки сессии просмотра снимка перед добавлением заметки.", "Imaging viewer note handler must explain session readiness failures.");
requireIn(appSource, "viewer-note-missing", "Imaging viewer must explain why an empty note cannot be added.");
requireIn(appSource, "imagingCreateSavingKind", "Imaging study creation must have an in-flight guard.");
requireIn(appSource, "Дождитесь завершения текущего добавления снимка.", "Imaging study creation must explain duplicate submits.");
requireIn(appSource, "Выберите пациента и активный прием перед добавлением снимка.", "Imaging study creation must explain missing clinical context.");
requireIn(appSource, "disabled={Boolean(imagingCreateSavingKind)}", "Imaging study creation buttons must be disabled while saving.");
requireIn(appSource, 'responseErrorMessage(response, "Снимок не добавлен")', "Imaging study creation must surface API failure messages.");
requireIn(cssSource, ".viewer-note-missing", "Imaging viewer note guidance must be styled.");

console.log(
  JSON.stringify(
    {
      ok: true,
      noteActionGuarded: true,
      missingNoteGuidance: true,
      createStudyGuarded: true
    },
    null,
    2
  )
);
