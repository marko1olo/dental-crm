import { readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

const appSource =
	readFileSync("apps/web/src/App.tsx", "utf8") +
	"\n" +
	readAppLogicSourceSync() +
	"\n" +
	readFileSync("apps/web/src/hooks/domains/usePatientLogic.ts", "utf8");
/*
 * Экран пациента — это PatientsView.tsx плюс вынесенные из него формы. Гейт
 * проверяет свойства ЭКРАНА (подписи, autoComplete, inputMode, pattern,
 * состояния кнопок), а не то, в каком файле они лежат: иначе первый же честный
 * вынос формы гасит проверку доступности целого блока, и никто этого не
 * замечает. Ровно так уже вышло с реквизитами: блок паспорта, ИНН, СНИЛС и
 * представителя вынесен в components/patient/PatientAdministrativeForm.tsx,
 * и без этой склейки шесть требований ниже (pattern у ИНН и СНИЛС,
 * autoComplete у адресов и документов, состояние переключателей дней приема)
 * искались бы в файле, где их больше нет.
 */
const patientsSource = [
	readFileSync("apps/web/src/PatientsView.tsx", "utf8"),
	readFileSync(
		"apps/web/src/components/patient/PatientAdministrativeForm.tsx",
		"utf8",
	),
].join("\n");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

/*
 * Требование принимает и подстроку, и выражение: приём взят из
 * scripts/smoke-web-render-gating-source.mjs:208-216 (sourceHas), новой техники
 * не изобретается. Выражение нужно там, где написание вокруг закрепляемой связи
 * расставляет форматтер.
 */
function requireIn(source, needle, message) {
	const found =
		needle instanceof RegExp ? needle.test(source) : source.includes(needle);
	if (!found) throw new Error(message);
}

function forbidIn(source, needle, message) {
	if (source.includes(needle)) throw new Error(message);
}

/*
 * Дословно требовалось `lazy(() => import("./PatientsView")` одной строкой.
 * Замерено 2026-08-09: коммит ad8f12499 форматтером разбил вызов надвое —
 * App.tsx:98 держит `lazy(() =>`, перенос, `import("./PatientsView")`. Раздел
 * грузится лениво как задумано, до правки EXIT=1. `\s*` засчитывает обе формы,
 * прежнюю однострочную и текущую; `./PatientsViewLegacy` и статический импорт
 * краснеют — проверено корпусом форм.
 */
requireIn(
	appSource,
	/lazy\(\(\)\s*=>\s*import\("\.\/PatientsView"\)/,
	"App.tsx must lazy-load PatientsView.",
);
requireIn(
	appSource,
	"<PatientsView",
	"App.tsx must render the lazy patients boundary.",
);
requireIn(
	appSource,
	"Укажите ФИО пациента перед созданием карточки.",
	"Patient create handler must fail visibly when invoked without a name.",
);
requireIn(
	appSource,
	"Дождитесь завершения создания карточки пациента.",
	"Patient create handler must explain duplicate create attempts.",
);
requireIn(
	appSource,
	'responseErrorMessage(response, "Пациент не создан")',
	"Patient create handler must surface API error details.",
);
requireIn(
	appSource,
	'operatorWorkflowFailureMessage("Пациент не создан", patientError)',
	"Patient create handler must catch network failures visibly.",
);
requireIn(
	appSource,
	"Дождитесь завершения сохранения карточки пациента.",
	"Patient core save handler must explain duplicate save attempts.",
);
requireIn(
	appSource,
	"Выберите пациента перед сохранением карточки.",
	"Patient core save handler must fail visibly without selected patient.",
);
requireIn(
	appSource,
	"Дождитесь завершения сохранения реквизитов пациента.",
	"Patient administrative save handler must explain duplicate save attempts.",
);
requireIn(
	appSource,
	"Выберите пациента перед сохранением реквизитов.",
	"Patient administrative save handler must fail visibly without selected patient.",
);
requireIn(
	patientsSource,
	"patientCreateReady",
	"Patient creation must use a named readiness guard.",
);
requireIn(
	patientsSource,
	"patientNameReady",
	"Patient creation guidance must distinguish missing name from saving state.",
);
requireIn(
	patientsSource,
	"patientCreatePhoneIssue",
	"Patient creation must block unusably short phone drafts before API submit.",
);
requireIn(
	patientsSource,
	"patientCreateGuidance",
	"Patient creation guidance must cover each disabled create reason.",
);
requireIn(
	patientsSource,
	"isPatientCreating",
	"Patient creation must expose a saving state.",
);
requireIn(
	patientsSource,
	"patientCoreReadyToSave",
	"Patient core save must use a named readiness guard.",
);
requireIn(
	patientsSource,
	"patientAdministrativeProfileReadyToSave",
	"Patient administrative save must use a named readiness guard.",
);
requireIn(
	patientsSource,
	"aria-label={`Открыть карточку пациента: ${patient.fullName}`}",
	"Patient row icon button must expose the patient name.",
);
requireIn(
	patientsSource,
	"title={`Открыть карточку пациента: ${patient.fullName}`}",
	"Patient row open button must expose the patient name in its hover hint.",
);
requireIn(
	patientsSource,
	"aria-pressed={patientIsSelected}",
	"Patient row open button must expose selected state.",
);
/*
 * Тот же форматтерный перенос, что и у lazy выше. Замерено 2026-08-09:
 * PatientAdministrativeForm.tsx:293-296 развернул вызов на четыре строки —
 * `const weekdaySelected =` / `…preferredAppointmentWeekdays.includes(` /
 * `day.value,` / `);`. Признак считается по-прежнему один раз и питает
 * `aria-pressed` (:299) и класс (:300), до правки EXIT=1. Источник признака
 * закреплён точно: другая коллекция или другое поле краснеют.
 */
requireIn(
	patientsSource,
	/const weekdaySelected =\s*patientAdministrativeProfileDraft\.preferredAppointmentWeekdays\.includes\(\s*day\.value,?\s*\)/,
	"Patient weekday toggles must compute one selected state.",
);
requireIn(
	patientsSource,
	"aria-pressed={weekdaySelected}",
	"Patient weekday toggles must expose pressed state.",
);
requireIn(
	patientsSource,
	'className="primary-button quick-create-action"',
	"Patient creation must use a visible labeled button.",
);
requireIn(
	patientsSource,
	"disabled={!patientCreateReady}",
	"Patient creation button must not submit an empty name.",
);
/*
 * Тот же форматтерный перенос. Замерено 2026-08-09: PatientsView.tsx:527-529
 * развернул атрибут на три строки. Подсказка на месте — абзац с
 * `id="patient-create-guidance"` стоит там же, строка 541, — то есть ссылка
 * доступности никуда не ведёт вхолостую. До правки EXIT=1.
 */
requireIn(
	patientsSource,
	/aria-describedby=\{\s*patientCreateGuidance \? "patient-create-guidance" : undefined\s*\}/,
	"Patient creation button must point to rendered create guidance.",
);
requireIn(
	patientsSource,
	"aria-busy={isPatientCreating || undefined}",
	"Patient creation button must expose busy state.",
);
requireIn(
	patientsSource,
	'id="patient-create-guidance"',
	"Patient creation must render missing-name guidance.",
);
requireIn(
	patientsSource,
	"Укажите ФИО пациента. Телефон и дату рождения можно добавить позже.",
	"Patient creation guidance must explain the minimal required field.",
);
requireIn(
	patientsSource,
	"Телефон пациента слишком короткий. Исправьте номер или очистите поле.",
	"Patient creation guidance must explain short phone drafts.",
);
requireIn(
	patientsSource,
	'className="patient-next-action"',
	"Patient rows must make the insight next action a first-class scan target.",
);
requireIn(
	patientsSource,
	'type="search"',
	"Patient search must use a browser search input.",
);
requireIn(
	patientsSource,
	'aria-label="Поиск пациента"',
	"Patient search input must keep its accessible name.",
);
requireIn(
	patientsSource,
	'autoComplete="name"',
	"Patient name inputs must expose browser name autocomplete.",
);
requireIn(
	patientsSource,
	'type="tel"',
	"Patient phone inputs must use tel input type.",
);
requireIn(
	patientsSource,
	'inputMode="tel"',
	"Patient phone inputs must open phone-friendly keyboards.",
);
requireIn(
	patientsSource,
	'autoComplete="tel"',
	"Patient phone inputs must expose browser phone autocomplete.",
);
requireIn(
	patientsSource,
	'autoComplete="bday"',
	"Patient birth date inputs must expose browser birth-date autocomplete.",
);
requireIn(
	patientsSource,
	'autoComplete="email"',
	"Patient email input must expose browser email autocomplete.",
);
requireIn(
	patientsSource,
	'pattern="[0-9]*"',
	"Patient INN input must expose a digit-only browser pattern.",
);
requireIn(
	patientsSource,
	'pattern="[0-9 -]*"',
	"Patient SNILS input must expose a numeric pattern that allows the usual separators.",
);
requireIn(
	patientsSource,
	'autoComplete="street-address"',
	"Patient address inputs must expose browser address autocomplete.",
);
requireIn(
	patientsSource,
	'autoComplete="off"',
	"Sensitive patient document fields must opt out of generic browser autofill.",
);
requireIn(
	patientsSource,
	"disabled={!patientCoreReadyToSave}",
	"Patient core save button must be disabled until there is a valid dirty card.",
);
requireIn(
	patientsSource,
	"disabled={!patientAdministrativeProfileReadyToSave}",
	"Patient administrative save button must be disabled until there are valid dirty requisites.",
);
requireIn(
	patientsSource,
	'const patientCoreSaveGuidanceId = "patient-core-save-guidance"',
	"Patient core save guidance must use a stable id.",
);
requireIn(
	patientsSource,
	'const patientAdministrativeSaveGuidanceId = "patient-admin-save-guidance"',
	"Patient administrative save guidance must use a stable id.",
);
requireIn(
	patientsSource,
	"const patientCoreSaveGuidance = !selectedPatient",
	"Patient core save must compute one visible disabled-state reason.",
);
requireIn(
	patientsSource,
	"const patientAdministrativeSaveGuidance = !selectedPatient",
	"Patient administrative save must compute one visible disabled-state reason.",
);
requireIn(
	patientsSource,
	'aria-busy={patientCoreSaveState === "saving" || undefined}',
	"Patient core save button must expose busy state.",
);
/*
 * Тот же форматтерный перенос. Замерено 2026-08-10: PatientsView.tsx:1138-1141
 * развернул атрибут на четыре строки — `aria-busy={` / операнд / `undefined` /
 * `}`. Занятость кнопки «Сохранить реквизиты» на месте и дублируется
 * отключением (`disabled={!patientAdministrativeProfileReadyToSave}`, :1147),
 * до правки EXIT=1. Признак закреплён точно: другое поле состояния или другой
 * литерал вместо "saving" краснеют.
 */
requireIn(
	patientsSource,
	/aria-busy=\{\s*patientAdministrativeProfileSaveState === "saving" \|\|\s*undefined\s*\}/,
	"Patient administrative save button must expose busy state.",
);
/*
 * Оба `aria-describedby` развёрнуты форматтером: PatientsView.tsx:965-967 и
 * :1142-1146. Смысл проверки не изменился — ссылка на подсказку выдаётся ТОЛЬКО
 * когда подсказка отрисована, иначе экранный диктор уводит на несуществующий
 * идентификатор. Тернарник закреплён целиком, поэтому безусловная ссылка
 * (`aria-describedby={patientCoreSaveGuidanceId}`) продолжает краснеть.
 */
requireIn(
	patientsSource,
	/aria-describedby=\{\s*patientCoreSaveGuidance \? patientCoreSaveGuidanceId : undefined\s*\}/,
	"Patient core save button must only point to rendered guidance.",
);
requireIn(
	patientsSource,
	/aria-describedby=\{\s*patientAdministrativeSaveGuidance\s*\?\s*patientAdministrativeSaveGuidanceId\s*:\s*undefined\s*\}/,
	"Patient administrative save button must only point to rendered guidance.",
);
requireIn(
	patientsSource,
	"id={patientCoreSaveGuidanceId}",
	"Patient core save guidance id must match the button description.",
);
requireIn(
	patientsSource,
	"id={patientAdministrativeSaveGuidanceId}",
	"Patient administrative save guidance id must match the button description.",
);
requireIn(
	patientsSource,
	'className="patient-save-guidance"',
	"Patient save actions must render local blocked-action guidance.",
);
requireIn(
	patientsSource,
	"ФИО пациента обязательно для расписания, документов и связи.",
	"Patient core save guidance must explain the required name.",
);
requireIn(
	patientsSource,
	"В карточке пациента нет новых изменений.",
	"Patient core save guidance must explain unchanged disabled state.",
);
requireIn(
	patientsSource,
	"Карточка пациента уже сохраняется.",
	"Patient core save guidance must explain saving disabled state.",
);
requireIn(
	patientsSource,
	"В реквизитах пациента нет новых изменений.",
	"Patient administrative save guidance must explain unchanged disabled state.",
);
requireIn(
	patientsSource,
	"Реквизиты пациента уже сохраняются.",
	"Patient administrative save guidance must explain saving disabled state.",
);
requireIn(
	patientsSource,
	'className="patient-empty-state"',
	"Patient search must show an explicit empty state.",
);
requireIn(
	patientsSource,
	"Пациент не найден",
	"Patient empty state must explain that no patient matched.",
);
requireIn(
	patientsSource,
	"нажмите «Создать»",
	"Patient empty state must point non-technical users to the create action.",
);
forbidIn(
	patientsSource,
	"Record<string, any>",
	"PatientsView props must stay explicitly typed.",
);
forbidIn(
	patientsSource,
	": any",
	"PatientsView must not reintroduce local any annotations.",
);
forbidIn(
	patientsSource,
	'title="Открыть пациента"',
	"Patient row open buttons must not repeat a generic hover hint.",
);
requireIn(
	cssSource,
	".patient-empty-state",
	"Patient empty state must be styled.",
);
requireIn(
	cssSource,
	".quick-create-action",
	"Patient quick create action must be sized independently from icon-only buttons.",
);
requireIn(
	cssSource,
	".patient-save-guidance",
	"Patient save guidance must be styled.",
);
requireIn(
	cssSource,
	".patient-next-action",
	"Patient next action must be styled for mobile scanning.",
);

console.log(
	JSON.stringify(
		{
			ok: true,
			labeledCreateAction: true,
			createNetworkErrorsVisible: true,
			emptySearchState: true,
			createGuidance: true,
			saveGuidance: true,
		},
		null,
		2,
	),
);
