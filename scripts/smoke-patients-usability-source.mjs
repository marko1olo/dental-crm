import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const patientsSource = readFileSync("apps/web/src/PatientsView.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

function requireIn(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

requireIn(appSource, 'lazy(() => import("./PatientsView")', "App.tsx must lazy-load PatientsView.");
requireIn(appSource, "<PatientsView", "App.tsx must render the lazy patients boundary.");
requireIn(appSource, "Укажите ФИО пациента перед созданием карточки.", "Patient create handler must fail visibly when invoked without a name.");
requireIn(appSource, "Дождитесь завершения создания карточки пациента.", "Patient create handler must explain duplicate create attempts.");
requireIn(appSource, 'responseErrorMessage(response, "Пациент не создан")', "Patient create handler must surface API error details.");
requireIn(appSource, "Пациент не создан:", "Patient create handler must catch network failures visibly.");
requireIn(appSource, "Дождитесь завершения сохранения карточки пациента.", "Patient core save handler must explain duplicate save attempts.");
requireIn(appSource, "Выберите пациента перед сохранением карточки.", "Patient core save handler must fail visibly without selected patient.");
requireIn(appSource, "Дождитесь завершения сохранения реквизитов пациента.", "Patient administrative save handler must explain duplicate save attempts.");
requireIn(appSource, "Выберите пациента перед сохранением реквизитов.", "Patient administrative save handler must fail visibly without selected patient.");
requireIn(patientsSource, "patientCreateReady", "Patient creation must use a named readiness guard.");
requireIn(patientsSource, "patientNameReady", "Patient creation guidance must distinguish missing name from saving state.");
requireIn(patientsSource, "isPatientCreating", "Patient creation must expose a saving state.");
requireIn(patientsSource, "patientCoreReadyToSave", "Patient core save must use a named readiness guard.");
requireIn(patientsSource, "patientAdministrativeProfileReadyToSave", "Patient administrative save must use a named readiness guard.");
requireIn(patientsSource, 'className="primary-button quick-create-action"', "Patient creation must use a visible labeled button.");
requireIn(patientsSource, "disabled={!patientCreateReady}", "Patient creation button must not submit an empty name.");
requireIn(patientsSource, 'aria-describedby={!patientNameReady ? "patient-create-guidance" : undefined}', "Patient creation button must point to missing-name guidance.");
requireIn(patientsSource, "aria-busy={isPatientCreating || undefined}", "Patient creation button must expose busy state.");
requireIn(patientsSource, 'id="patient-create-guidance"', "Patient creation must render missing-name guidance.");
requireIn(patientsSource, "Укажите ФИО пациента. Телефон и дату рождения можно добавить позже.", "Patient creation guidance must explain the minimal required field.");
requireIn(patientsSource, "disabled={!patientCoreReadyToSave}", "Patient core save button must be disabled until there is a valid dirty card.");
requireIn(patientsSource, "disabled={!patientAdministrativeProfileReadyToSave}", "Patient administrative save button must be disabled until there are valid dirty requisites.");
requireIn(patientsSource, 'className="patient-save-guidance"', "Patient save actions must render local blocked-action guidance.");
requireIn(patientsSource, "ФИО пациента обязательно для расписания, документов и связи.", "Patient core save guidance must explain the required name.");
requireIn(patientsSource, 'className="patient-empty-state"', "Patient search must show an explicit empty state.");
requireIn(patientsSource, "Пациент не найден", "Patient empty state must explain that no patient matched.");
requireIn(patientsSource, "нажмите «Создать»", "Patient empty state must point non-technical users to the create action.");
forbidIn(patientsSource, "Record<string, any>", "PatientsView props must stay explicitly typed.");
forbidIn(patientsSource, ": any", "PatientsView must not reintroduce local any annotations.");
requireIn(cssSource, ".patient-empty-state", "Patient empty state must be styled.");
requireIn(cssSource, ".quick-create-action", "Patient quick create action must be sized independently from icon-only buttons.");
requireIn(cssSource, ".patient-save-guidance", "Patient save guidance must be styled.");

console.log(
  JSON.stringify(
    {
      ok: true,
      labeledCreateAction: true,
      createNetworkErrorsVisible: true,
      emptySearchState: true,
      createGuidance: true,
      saveGuidance: true
    },
    null,
    2
  )
);
