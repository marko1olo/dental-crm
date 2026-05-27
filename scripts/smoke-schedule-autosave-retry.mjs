import fs from "node:fs";

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");

const requiredSnippets = [
  'staffScheduleSaveStates[staffId] !== "saving"',
  'appointmentScheduleSaveStates[appointmentId] !== "saving"',
  "staffRetryingErrors ? 5000 : 1200",
  "appointmentRetryingErrors ? 5000 : 1200",
  "retryScheduleAutosaves",
  'window.addEventListener("online", retryScheduleAutosaves)',
  'window.removeEventListener("online", retryScheduleAutosaves)',
  "saveAppointmentSchedule(appointmentId, { closeEditorOnSave: false })"
];

const forbiddenSnippets = [
  'staffScheduleSaveStates[staffId] !== "saving" && staffScheduleSaveStates[staffId] !== "error"',
  'appointmentScheduleSaveStates[appointmentId] !== "saving" && appointmentScheduleSaveStates[appointmentId] !== "error"'
];

const missing = requiredSnippets.filter((snippet) => !appSource.includes(snippet));
const forbidden = forbiddenSnippets.filter((snippet) => appSource.includes(snippet));

if (missing.length || forbidden.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missing,
        forbidden,
        reason: "Schedule autosave must retry dirty error states and reconnect without waiting for another user edit."
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: "Schedule autosave retries dirty error states and reconnects after browser online event."
    },
    null,
    2
  )
);
