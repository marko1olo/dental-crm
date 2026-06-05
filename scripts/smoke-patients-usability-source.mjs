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
requireIn(appSource, 'operatorWorkflowFailureMessage("Пациент не создан", patientError)', "Patient create handler must catch network failures visibly.");
requireIn(appSource, "Дождитесь завершения сохранения карточки пациента.", "Patient core save handler must explain duplicate save attempts.");
requireIn(appSource, "Выберите пациента перед сохранением карточки.", "Patient core save handler must fail visibly without selected patient.");
requireIn(appSource, "Дождитесь завершения сохранения реквизитов пациента.", "Patient administrative save handler must explain duplicate save attempts.");
requireIn(appSource, "Выберите пациента перед сохранением реквизитов.", "Patient administrative save handler must fail visibly without selected patient.");
requireIn(patientsSource, "patientCreateReady", "Patient creation must use a named readiness guard.");
requireIn(patientsSource, "patientNameReady", "Patient creation guidance must distinguish missing name from saving state.");
requireIn(patientsSource, "patientCreatePhoneIssue", "Patient creation must block unusably short phone drafts before API submit.");
requireIn(patientsSource, "patientCreateGuidance", "Patient creation guidance must cover each disabled create reason.");
requireIn(patientsSource, "isPatientCreating", "Patient creation must expose a saving state.");
requireIn(patientsSource, "patientCoreReadyToSave", "Patient core save must use a named readiness guard.");
requireIn(patientsSource, "patientAdministrativeProfileReadyToSave", "Patient administrative save must use a named readiness guard.");
requireIn(patientsSource, "aria-label={`Открыть карточку пациента: ${patient.fullName}`}", "Patient row icon button must expose the patient name.");
requireIn(patientsSource, "title={`Открыть карточку пациента: ${patient.fullName}`}", "Patient row open button must expose the patient name in its hover hint.");
requireIn(patientsSource, "aria-pressed={patientIsSelected}", "Patient row open button must expose selected state.");
requireIn(patientsSource, "const weekdaySelected = patientAdministrativeProfileDraft.preferredAppointmentWeekdays.includes(day.value);", "Patient weekday toggles must compute one selected state.");
requireIn(patientsSource, "aria-pressed={weekdaySelected}", "Patient weekday toggles must expose pressed state.");
requireIn(patientsSource, 'className="primary-button quick-create-action"', "Patient creation must use a visible labeled button.");
requireIn(patientsSource, "disabled={!patientCreateReady}", "Patient creation button must not submit an empty name.");
requireIn(patientsSource, 'aria-describedby={patientCreateGuidance ? "patient-create-guidance" : undefined}', "Patient creation button must point to rendered create guidance.");
requireIn(patientsSource, "aria-busy={isPatientCreating || undefined}", "Patient creation button must expose busy state.");
requireIn(patientsSource, 'id="patient-create-guidance"', "Patient creation must render missing-name guidance.");
requireIn(patientsSource, "Укажите ФИО пациента. Телефон и дату рождения можно добавить позже.", "Patient creation guidance must explain the minimal required field.");
requireIn(patientsSource, "Телефон пациента слишком короткий. Исправьте номер или очистите поле.", "Patient creation guidance must explain short phone drafts.");
requireIn(patientsSource, 'className="patient-next-action"', "Patient rows must make the insight next action a first-class scan target.");
requireIn(patientsSource, 'type="search"', "Patient search must use a browser search input.");
requireIn(patientsSource, 'aria-label="Поиск пациента"', "Patient search input must keep its accessible name.");
requireIn(patientsSource, 'autoComplete="name"', "Patient name inputs must expose browser name autocomplete.");
requireIn(patientsSource, 'type="tel"', "Patient phone inputs must use tel input type.");
requireIn(patientsSource, 'inputMode="tel"', "Patient phone inputs must open phone-friendly keyboards.");
requireIn(patientsSource, 'autoComplete="tel"', "Patient phone inputs must expose browser phone autocomplete.");
requireIn(patientsSource, 'autoComplete="bday"', "Patient birth date inputs must expose browser birth-date autocomplete.");
requireIn(patientsSource, 'autoComplete="email"', "Patient email input must expose browser email autocomplete.");
requireIn(patientsSource, 'pattern="[0-9]*"', "Patient INN input must expose a digit-only browser pattern.");
requireIn(patientsSource, 'pattern="[0-9 -]*"', "Patient SNILS input must expose a numeric pattern that allows the usual separators.");
requireIn(patientsSource, 'autoComplete="street-address"', "Patient address inputs must expose browser address autocomplete.");
requireIn(patientsSource, 'autoComplete="off"', "Sensitive patient document fields must opt out of generic browser autofill.");
requireIn(patientsSource, "disabled={!patientCoreReadyToSave}", "Patient core save button must be disabled until there is a valid dirty card.");
requireIn(patientsSource, "disabled={!patientAdministrativeProfileReadyToSave}", "Patient administrative save button must be disabled until there are valid dirty requisites.");
requireIn(patientsSource, 'const patientCoreSaveGuidanceId = "patient-core-save-guidance"', "Patient core save guidance must use a stable id.");
requireIn(patientsSource, 'const patientAdministrativeSaveGuidanceId = "patient-admin-save-guidance"', "Patient administrative save guidance must use a stable id.");
requireIn(patientsSource, "const patientCoreSaveGuidance = !selectedPatient", "Patient core save must compute one visible disabled-state reason.");
requireIn(patientsSource, "const patientAdministrativeSaveGuidance = !selectedPatient", "Patient administrative save must compute one visible disabled-state reason.");
requireIn(patientsSource, 'aria-busy={patientCoreSaveState === "saving" || undefined}', "Patient core save button must expose busy state.");
requireIn(patientsSource, 'aria-busy={patientAdministrativeProfileSaveState === "saving" || undefined}', "Patient administrative save button must expose busy state.");
requireIn(patientsSource, "aria-describedby={patientCoreSaveGuidance ? patientCoreSaveGuidanceId : undefined}", "Patient core save button must only point to rendered guidance.");
requireIn(patientsSource, "aria-describedby={patientAdministrativeSaveGuidance ? patientAdministrativeSaveGuidanceId : undefined}", "Patient administrative save button must only point to rendered guidance.");
requireIn(patientsSource, "id={patientCoreSaveGuidanceId}", "Patient core save guidance id must match the button description.");
requireIn(patientsSource, "id={patientAdministrativeSaveGuidanceId}", "Patient administrative save guidance id must match the button description.");
requireIn(patientsSource, 'className="patient-save-guidance"', "Patient save actions must render local blocked-action guidance.");
requireIn(patientsSource, "ФИО пациента обязательно для расписания, документов и связи.", "Patient core save guidance must explain the required name.");
requireIn(patientsSource, "В карточке пациента нет новых изменений.", "Patient core save guidance must explain unchanged disabled state.");
requireIn(patientsSource, "Карточка пациента уже сохраняется.", "Patient core save guidance must explain saving disabled state.");
requireIn(patientsSource, "В реквизитах пациента нет новых изменений.", "Patient administrative save guidance must explain unchanged disabled state.");
requireIn(patientsSource, "Реквизиты пациента уже сохраняются.", "Patient administrative save guidance must explain saving disabled state.");
requireIn(patientsSource, 'className="patient-empty-state"', "Patient search must show an explicit empty state.");
requireIn(patientsSource, "Пациент не найден", "Patient empty state must explain that no patient matched.");
requireIn(patientsSource, "нажмите «Создать»", "Patient empty state must point non-technical users to the create action.");
forbidIn(patientsSource, "Record<string, any>", "PatientsView props must stay explicitly typed.");
forbidIn(patientsSource, ": any", "PatientsView must not reintroduce local any annotations.");
forbidIn(patientsSource, 'title="Открыть пациента"', "Patient row open buttons must not repeat a generic hover hint.");
requireIn(cssSource, ".patient-empty-state", "Patient empty state must be styled.");
requireIn(cssSource, ".quick-create-action", "Patient quick create action must be sized independently from icon-only buttons.");
requireIn(cssSource, ".patient-save-guidance", "Patient save guidance must be styled.");
requireIn(cssSource, ".patient-next-action", "Patient next action must be styled for mobile scanning.");

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
