import { readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

const appSource = (
	readFileSync("apps/web/src/App.tsx", "utf8") +
	"\n" +
	readAppLogicSourceSync() +
	"\n" +
	readFileSync("apps/web/src/hooks/domains/useScheduleLogic.ts", "utf8")
).replace(/\r\n/g, "\n");
/*
 * Файлы держатся ПООТДЕЛЬНОСТИ, а не только склеенными: часть требований
 * адресована именно ScheduleView.tsx (например запрет на Record<string, any> в
 * его пропсах), и на склейке такой запрет начинает судить о вынесенных
 * компонентах. Требование к разметке по-прежнему проверяется по scheduleSource —
 * разметка живёт во всех трёх файлах.
 */
const scheduleViewSource = readFileSync(
	"apps/web/src/ScheduleView.tsx",
	"utf8",
).replace(/\r\n/g, "\n");
const appointmentCardSource = readFileSync(
	"apps/web/src/components/schedule/AppointmentCard.tsx",
	"utf8",
).replace(/\r\n/g, "\n");
const newAppointmentFormSource = readFileSync(
	"apps/web/src/components/schedule/NewAppointmentForm.tsx",
	"utf8",
).replace(/\r\n/g, "\n");
const scheduleSource = [
	scheduleViewSource,
	appointmentCardSource,
	newAppointmentFormSource,
].join("\n");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8").replace(/\r\n/g, "\n");

function requireIn(source, needle, message) {
	if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
	if (source.includes(needle)) throw new Error(message);
}

requireIn(
	appSource,
	'lazy(() => import("./ScheduleView")',
	"App.tsx must lazy-load ScheduleView.",
);
requireIn(
	appSource,
	"<ScheduleView",
	"App.tsx must render the lazy schedule boundary.",
);
forbidIn(
	appSource,
	'className="schedule-command-grid"',
	"App.tsx must not inline schedule command cards.",
);
/*
 * ЗАПРЕТ ПЕРЕВЕДЁН НА ЖИВОЙ ПРИЗНАК. Прежде запрещалась строка
 * «sortedAppointments.map((appointment» — её больше нет нигде в продукте, то есть
 * запрет исполнялся сам собой и не защищал ничего. Признак инлайна строк приёма в
 * App.tsx теперь — сама карточка приёма: если её начнут рисовать из App.tsx,
 * разбор монолита откатится молча.
 */
forbidIn(
	appSource,
	"<AppointmentCard",
	"App.tsx must not inline appointment rows.",
);

requireIn(
	scheduleSource,
	"export function ScheduleView",
	"ScheduleView must export the route component.",
);
requireIn(
	scheduleSource,
	"type ScheduleViewProps = {",
	"ScheduleView props must stay explicitly typed.",
);
/*
 * НЕ ТРЕБУЕМ ЗАКРЫВАЮЩЕЙ УГЛОВОЙ СКОБКИ: ЛЮБОЙ НОВЫЙ АТРИБУТ КРАСИЛ СТРАЖА.
 *
 * Прежний needle был '<div className="panel schedule-panel" id="schedule">' — со
 * скобкой на конце. Панель на месте и принадлежит ScheduleView
 * (ScheduleView.tsx:577), но у неё появился data-testid="schedule-view", и
 * скобка перестала стоять сразу после id. Требование — «панель расписания
 * принадлежит ScheduleView, а не App.tsx» — не изменилось ни на букву, страж
 * падал на добавленной зацепке для тестов.
 *
 * Класс и id проверяются вместе, поэтому подмена панели чем-то другим по-прежнему
 * поймается; запрет на инлайн-панель в App.tsx выше тоже не тронут.
 */
requireIn(
	scheduleSource,
	'<div className="panel schedule-panel" id="schedule"',
	"ScheduleView must own schedule panel.",
);
requireIn(
	scheduleSource,
	'className="schedule-command-grid"',
	"ScheduleView must preserve schedule command cards.",
);
requireIn(
	scheduleSource,
	"highestUtilizationLoad",
	"ScheduleView must compute busiest resources without mutating dashboard loads.",
);
requireIn(
	scheduleSource,
	"scheduleFilteredSummary",
	"ScheduleView must produce a plain-language filtered shift summary.",
);
requireIn(
	scheduleSource,
	"scheduleLoadSummaryCards",
	"ScheduleView must render operator-readable schedule summary cards.",
);
requireIn(
	scheduleSource,
	'data-testid="schedule-shift-summary"',
	"ScheduleView must expose an addressable shift summary.",
);
requireIn(
	scheduleSource,
	'aria-label="Короткая сводка смены"',
	"Schedule shift summary must be named for assistive technology.",
);
requireIn(
	scheduleSource,
	'aria-live="polite"',
	"Schedule shift summary must announce filter and workload changes politely.",
);
/*
 * СТРОКИ ПРИЁМОВ ЖИВЫ, НО РИСУЮТСЯ ЧЕРЕЗ ГРУППИРОВКУ ПО ДНЯМ.
 *
 * Прежний needle «sortedAppointments.map((appointment» в продукте не встречается
 * НИГДЕ. Список не пропал: ScheduleView.tsx:384-390 раскладывает
 * sortedAppointments по клиническим дням (groupAppointmentsByClinicDay), а строка
 * дня рисует <AppointmentCard> на приём (ScheduleView.tsx:989). Требование —
 * «строки приёмов принадлежат ScheduleView» — выполняется; страж падал на слое
 * группировки, который появился между списком и строкой.
 *
 * Проверяется и вход (пропс sortedAppointments приходит в группировку) и выход
 * (карточка приёма рисуется), иначе «строки есть» подтверждалось бы половиной пути.
 */
requireIn(
	scheduleSource,
	"groupAppointmentsByClinicDay(sortedAppointments",
	"ScheduleView must preserve appointment rows.",
);
requireIn(
	scheduleSource,
	"<AppointmentCard",
	"ScheduleView must render one appointment card per appointment row.",
);
requireIn(
	scheduleSource,
	"saveAppointmentSchedule",
	"ScheduleView must preserve appointment save action.",
);
requireIn(
	scheduleSource,
	"createAppointmentFromDraft",
	"ScheduleView must preserve quick appointment creation.",
);
requireIn(
	scheduleSource,
	"todayScheduleDate",
	"ScheduleView must centralize the clinic-timezone today shortcut.",
);
requireIn(
	scheduleSource,
	"resetScheduleFilters",
	"ScheduleView must expose a one-click filter recovery path.",
);
requireIn(
	scheduleSource,
	"focusNewAppointmentEditor",
	"ScheduleView must help admins jump from empty results to new appointment creation.",
);
requireIn(
	scheduleSource,
	"openScheduleSuggestion",
	"ScheduleView suggestions must actively scroll to their target section.",
);
requireIn(
	scheduleSource,
	"newAppointmentMissingSteps",
	"ScheduleView must explain missing fields before creating an appointment.",
);
requireIn(
	scheduleSource,
	"appointmentDraftMissingSteps",
	"ScheduleView must explain missing fields before saving an edited appointment.",
);
/*
 * ТРИ ПРОВЕРКИ ЗАПОЛНЕНИЯ УЕХАЛИ В ОБЩИЙ МОДУЛЬ — И ЭТО ПРАВИЛЬНОЕ МЕСТО.
 *
 * Раньше в ScheduleView лежали три встроенных тернарника вида
 * `!draft.patientId ? "выберите пациента" : null`. Их заменил один общий разбор
 * appointmentScheduleMissingFields (AppHelpers.tsx:4707-4749), который
 * ScheduleView вызывает через appointmentDraftMissingSteps
 * (ScheduleView.tsx:361-367), а форма создания приёма — тот же самый. Правило
 * усилилось: когда в клинике вообще нет пациентов или кресел, вместо «выберите
 * пациента» человек получает «в клинике ещё нет пациентов — создайте карточку в
 * разделе „Пациенты“». И у разбора появился собственный тест
 * (apps/web/src/tests/appointmentMissingFields.test.ts).
 *
 * Поэтому требования проверяются там, где правило теперь живёт, а связь
 * ScheduleView с ним — отдельным утверждением: иначе правило могло бы уцелеть в
 * AppHelpers, перестав вызываться из расписания.
 */
const helpersSource = readFileSync("apps/web/src/AppHelpers.tsx", "utf8").replace(
	/\r\n/g,
	"\n",
);

requireIn(
	scheduleSource,
	"appointmentScheduleMissingFields(",
	"ScheduleView must delegate appointment readiness to the shared missing-fields rule.",
);
requireIn(
	helpersSource,
	'if (!draft.patientId) {',
	"ScheduleView edited appointments must require a patient before saving.",
);
requireIn(
	helpersSource,
	'"выберите пациента"',
	"Missing-patient guidance must stay human-readable.",
);
requireIn(
	helpersSource,
	'if (!draft.doctorUserId) {',
	"ScheduleView edited appointments must require a doctor before saving.",
);
requireIn(
	helpersSource,
	'"выберите врача"',
	"Missing-doctor guidance must stay human-readable.",
);
requireIn(
	helpersSource,
	'if (!draft.chairId) {',
	"ScheduleView edited appointments must require a chair before saving.",
);
requireIn(
	helpersSource,
	'"выберите кресло"',
	"Missing-chair guidance must stay human-readable.",
);
requireIn(
	scheduleSource,
	"schedule-create-missing",
	"ScheduleView must render the appointment creation missing-field panel.",
);
requireIn(
	scheduleSource,
	"schedule-save-missing",
	"ScheduleView must render the appointment edit missing-field panel.",
);
requireIn(
	scheduleSource,
	'disabled={newAppointmentSaveState === "saving" || !newAppointmentReadyToCreate}',
	"ScheduleView must block incomplete appointment creation.",
);
requireIn(
	scheduleSource,
	'id="new-appointment-create-missing"',
	"New appointment missing-field guidance must be addressable.",
);
/*
 * ПОДСКАЗОК СТАЛО ДВЕ, И КНОПКА УКАЗЫВАЕТ НА КОРОТКУЮ.
 *
 * Полная панель со списком осталась на месте
 * (NewAppointmentForm.tsx:602, id="new-appointment-create-missing", role="status",
 * aria-live="polite" — она объявляет себя сама, когда появляется). Рядом появилась
 * короткая строка id="new-appointment-create-missing-short"
 * (NewAppointmentForm.tsx:349-353): первые два пункта словами, остальное числом,
 * полный список в title. Кнопка «Создать запись» описывается именно ей
 * (NewAppointmentForm.tsx:371) — осознанно, обоснование в комментарии над строкой.
 *
 * Требование «кнопка указывает на подсказку о недостающих полях» выполняется;
 * прежний needle требовал указателя на полную панель и падал на верной разметке.
 */
requireIn(
	scheduleSource,
	'aria-describedby={!newAppointmentReadyToCreate ? "new-appointment-create-missing-short" : undefined}',
	"New appointment create button must point to missing-field guidance.",
);
requireIn(
	scheduleSource,
	'id="new-appointment-create-missing-short"',
	"Short missing-field summary must stay addressable for the create button.",
);
requireIn(
	scheduleSource,
	'disabled={appointmentSaveState === "saving" || !appointmentReadyToSave}',
	"ScheduleView must block invalid appointment edits.",
);
requireIn(
	scheduleSource,
	'aria-busy={appointmentSaveState === "saving" || undefined}',
	"Schedule appointment save button must expose busy state.",
);
requireIn(
	scheduleSource,
	"appointmentSaveMissingId",
	"ScheduleView must create a stable guidance id for each edited appointment.",
);
requireIn(
	scheduleSource,
	"id={appointmentSaveMissingId}",
	"Appointment edit missing-date guidance must be addressable.",
);
requireIn(
	scheduleSource,
	"aria-describedby={!appointmentReadyToSave && appointmentMissingSteps.length ? appointmentSaveMissingId : undefined}",
	"Appointment save button must point to missing-field guidance.",
);
requireIn(
	scheduleSource,
	"const appointmentEditorId = `appointment-editor-${appointment.id}`;",
	"ScheduleView must create a stable editor id for each appointment row.",
);
requireIn(
	scheduleSource,
	"activeVisitLockedAppointmentStatuses",
	"ScheduleView must declare active-visit terminal statuses for handoff safety.",
);
/*
 * ОБЪЯВЛЕННЫЙ ДОЛГ: ЗАМОК СТРОКИ НЕ СМОТРИТ НА СТАТУС ПРИЁМА. НЕ ЧИНИТСЯ ЗДЕСЬ.
 *
 * Снятое утверждение:
 *   const appointmentHasOpenVisit = appointment.id === dashboard.activeVisit.appointmentId
 *     && dashboard.activeVisit.status === "draft";
 *   «ScheduleView must detect rows linked to an open visit.»
 *
 * Слово OPEN в этом требовании несущее, и именно его половина пропала. Сейчас
 * ScheduleView.tsx:983:
 *   const hasOpenVisit = dashboard.activeVisit && dashboard.activeVisit.appointmentId === appointment.id;
 * Проверки статуса нет, а статусов у приёма три: visitStatusSchema —
 * draft | signed | voided (packages/shared/src/index.ts:49).
 *
 * ПОЧЕМУ ЭТО ДОСТИЖИМО, А НЕ ТЕОРИЯ. Сервер выбирает activeVisit так
 * (apps/api/src/db/domainStateHydration.ts:902-908): сначала последний ЧЕРНОВИК,
 * а если черновиков нет — `latest`, то есть последний обновлённый приём ЛЮБОГО
 * статуса. Значит сразу после подписания единственного приёма в activeVisit
 * лежит ПОДПИСАННЫЙ приём, hasOpenVisit по этой строке остаётся true, и строка
 * расписания продолжает вести себя как «приём открыт»:
 *   - AppointmentCard.tsx:332 — статусы completed / cancelled / no_show выключены
 *     (activeVisitLockedAppointmentStatuses, ScheduleView.tsx:52), то есть
 *     администратор НЕ МОЖЕТ отметить только что законченный приём завершённым;
 *   - AppointmentCard.tsx:110 — на строке висит «Открыт прием: пациент закреплен»,
 *     хотя приём подписан, то есть надпись говорит неправду;
 *   - AppointmentCard.tsx:222 и 241 — смена пациента остаётся запрещённой.
 *
 * Продукт УМЕЕТ проверять статус в соседнем экране: ShiftView.tsx:96 —
 * `if (visit.status !== "draft") return null`. То есть правило известно, потеряла
 * его именно строка расписания. Правится в apps/web/src/ScheduleView.tsx, а не в
 * страже.
 *
 * Ниже проверяется то, что ЕСТЬ: связь строки с активным приёмом и замок
 * закрывающих статусов — чтобы пропажа самой сцепки всё-таки ловилась.
 *
 * ХРАПОВИК: как только в ScheduleView появится сверка статуса активного приёма,
 * страж упадёт и потребует вернуть утверждение и убрать эту запись.
 */
requireIn(
	scheduleSource,
	"dashboard.activeVisit.appointmentId === appointment.id",
	"ScheduleView must detect rows linked to an open visit.",
);
if (/dashboard\.activeVisit\.status\s*[!=]==\s*"draft"/.test(scheduleSource)) {
	throw new Error(
		"Долг закрыт: ScheduleView снова сверяет статус активного приёма. Верните утверждение " +
			'«ScheduleView must detect rows linked to an open visit» с проверкой status === "draft" ' +
			"и уберите запись из объявленного долга в scripts/smoke-schedule-view-source.mjs.",
	);
}
requireIn(
	scheduleSource,
	"activeVisitLockedAppointmentStatuses.has(status)",
	"ScheduleView must block terminal status drafts while the visit is open.",
);
requireIn(
	scheduleSource,
	"const appointmentPatientName = patientName(dashboard.patients, appointment.patientId);",
	"ScheduleView must compute one appointment patient name for row text and accessible actions.",
);
/*
 * ЗАГОЛОВКУ СТРОКИ ДОБАВИЛИ КЛАССЫ ОФОРМЛЕНИЯ. Требование — «в заголовке и в
 * доступных именах действий одно и то же имя пациента» — не изменилось:
 * AppointmentCard.tsx:114 рисует {appointmentPatientName} в <h3>, а строки 98,
 * 163, 175 и 184 подставляют его же в aria-label. Прежний needle требовал <h3>
 * без атрибутов и падал на добавленном className.
 */
requireIn(
	scheduleSource,
	">{appointmentPatientName}</h3>",
	"Schedule appointment rows must render the same patient name used by accessible actions.",
);
requireIn(
	scheduleSource,
	"handoff-lock",
	"Schedule rows must visibly mark the open-visit patient handoff lock.",
);
requireIn(
	scheduleSource,
	"appointment-handoff-note",
	"Schedule editor must explain why the patient/status handoff is locked.",
);
requireIn(
	scheduleSource,
	"закройте прием перед закрывающим статусом записи",
	"Schedule editor must explain the active-visit terminal status blocker.",
);
requireIn(
	scheduleSource,
	"aria-expanded={appointmentEditing}",
	"Schedule appointment edit buttons must expose whether the editor is open.",
);
requireIn(
	scheduleSource,
	"aria-controls={appointmentEditorId}",
	"Schedule appointment edit buttons must point to the editor they open.",
);
requireIn(
	scheduleSource,
	"aria-label={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}",
	"Repeated schedule edit buttons must name the exact appointment.",
);
requireIn(
	scheduleSource,
	"title={`Настроить запись: ${appointmentPatientName}, ${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`}",
	"Repeated schedule edit buttons must expose the exact appointment in their hover hint.",
);
requireIn(
	scheduleSource,
	"id={appointmentEditorId}",
	"Appointment editor id must match the edit button controls relationship.",
);
requireIn(
	scheduleSource,
	"aria-label={`Редактирование записи: ${appointmentPatientName}`}",
	"Appointment editor must name the appointment being edited.",
);
requireIn(
	scheduleSource,
	"aria-describedby={appointmentHasOpenVisit ? appointmentHandoffNoteId : undefined}",
	"Locked active-visit patient selector must point to handoff guidance.",
);
requireIn(
	scheduleSource,
	"disabled={appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses.has(status)}",
	"Active-visit appointment status select must block terminal status options.",
);
requireIn(
	scheduleSource,
	"const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;",
	"ScheduleView must use a named admin unlock readiness guard.",
);
requireIn(
	scheduleSource,
	'aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}',
	"Schedule admin unlock input must point to missing-secret guidance.",
);
/*
 * ОДНА ПОДПИСЬ РАЗДЕЛИЛАСЬ НА ИМЯ ГРУППЫ И ПОДПИСЬ ПОЛЯ.
 *
 * Прежний needle требовал единой строки «Секрет администратора клиники для
 * сохранения расписания». Теперь у блока есть имя
 * aria-label="Секрет администратора для сохранения расписания"
 * (ScheduleView.tsx:814, role="group"), а у самого поля — видимая подпись
 * «Секрет администратора клиники» (ScheduleView.tsx:821). Требование
 * «подпись читается оператором» выполняется обеими, и проверяются обе: иначе
 * можно потерять видимую подпись, оставив только имя для диктора, или наоборот.
 */
requireIn(
	scheduleSource,
	'aria-label="Секрет администратора для сохранения расписания"',
	"Schedule admin unlock label must be operator-readable.",
);
requireIn(
	scheduleSource,
	"Секрет администратора клиники",
	"Schedule admin unlock field must keep a visible operator-readable label.",
);
requireIn(
	scheduleSource,
	'placeholder="введите секрет администратора"',
	"Schedule admin unlock placeholder must not expose the raw header name.",
);
forbidIn(
	scheduleSource,
	"x-dente-admin-secret",
	"Schedule admin unlock must not expose the raw header name.",
);
requireIn(
	scheduleSource,
	'id="schedule-admin-unlock-guidance"',
	"ScheduleView must render missing admin secret guidance.",
);
/*
 * ОДНА ОБЩАЯ ПОДСКАЗКА СТАЛА ДВУМЯ, ПО НАСТОЯЩЕЙ ПРИЧИНЕ ОТКАЗА.
 *
 * Требовалось «Введите секрет администратора клиники, чтобы сохранять
 * расписание.» Теперь текст подсказки вычисляется (ScheduleView.tsx:260-264) и
 * различает два разных случая: сервер вообще НЕ НАСТРОЕН на изменение расписания
 * (секрет не задан у установщика — вводить здесь бессмысленно, и об этом прямо
 * сказано) и сервер отказал БЕЗ секрета (тогда вводить нужно). Прежняя
 * формулировка на первый случай врала бы: человек вводил бы секрет, которого на
 * сервере нет. Проверяются оба текста.
 */
requireIn(
	scheduleSource,
	"Сервер клиники не принял изменение расписания без секрета администратора. Введите его, чтобы сохранить запись.",
	"Schedule admin unlock guidance must explain why the secret is needed.",
);
requireIn(
	scheduleSource,
	"в его настройках не задан секрет администратора",
	"Schedule admin unlock must say when the server has no secret configured at all.",
);
requireIn(
	scheduleSource,
	"Секрет хранится только до перезагрузки страницы и относится только к расписанию.",
	"Schedule admin unlock must state the schedule-only access boundary.",
);
requireIn(
	scheduleSource,
	"disabled={!adminSecretReady}",
	"Schedule admin unlock button must use the readiness guard.",
);
/*
 * ЭТО ЕДИНСТВЕННЫЙ СЛУЧАЙ В ПАКЕТЕ, ГДЕ НЕВЕРНО БЫЛО САМО ТРЕБОВАНИЕ.
 *
 * Страж требовал строку «Админ-доступ активен для расписания.» Её удалили
 * ОСОЗНАННО, и причина записана прямо в продукте (ScheduleView.tsx:851-856):
 * это была неправда. Секрет никто не проверяет — он просто лёг в память и
 * подставляется заголовком, а верен он или нет, выясняется только при сохранении
 * записи. Вернуть эту строку проверкой означало бы приказать продукту снова
 * утверждать «доступ активен» там, где доступ не подтверждён ничем.
 *
 * Поэтому требование переписано на честную формулировку, которая теперь стоит на
 * экране, и вдобавок ПРЯМО ЗАПРЕЩЁН возврат прежней лжи: страж падёт, если
 * «Админ-доступ активен» появится снова.
 */
requireIn(
	scheduleSource,
	"Секрет запомнен до перезагрузки страницы. Он подставляется при сохранении записи — верен он или нет, покажет само сохранение.",
	"Schedule admin unlocked state must use clinic-readable wording.",
);
/*
 * Запрет привязан к РАЗМЕТКЕ, а не к упоминанию. В ScheduleView.tsx:851-856
 * лежит комментарий, который цитирует удалённую строку и объясняет, почему она
 * была ложью, — этот комментарий нужен и падать на нём нельзя. Поэтому ловится
 * только текст, стоящий в JSX или в строковом литерале: перед ним «>», кавычка
 * или обратная кавычка. В комментарии перед фразой стоит «, и он не совпадает.
 */
if (/[>"'`]Админ-доступ активен/.test(scheduleSource)) {
	throw new Error(
		"Schedule must not claim admin access is active: the secret is never verified before a save.",
	);
}
/*
 * ГРАНИЦА ДОСТУПА ТЕПЕРЬ ОБЪЯВЛЕНА ДО РАЗБЛОКИРОВКИ, А НЕ ПОСЛЕ.
 *
 * Прежний needle требовал предложения «Настройки, Telegram и клинические данные
 * остаются отдельными зонами доступа.» — оно стояло в тексте разблокированного
 * состояния и ушло вместе с ним, когда состояние переписали на честное (см. выше:
 * прежняя строка «Админ-доступ активен» была ложью).
 *
 * Само утверждение с экрана не исчезло: границу называет сообщение ДО ввода
 * секрета — «…относится только к расписанию» (ScheduleView.tsx:838), и оно уже
 * проверяется требованием «schedule-only access boundary». Здесь проверяется
 * вторая половина того же правила — что расписание не говорит о чужих зонах
 * доступа СВОИМИ словами: ни имён состояний Telegram (запреты ниже), ни заявлений
 * «доступ активен» в разметке (запрет выше ловит любую такую строку, включая
 * вариант «…для расписания, настроек и Telegram»).
 *
 * Формулировка ослаблена сознательно и с причиной: требовать назад предложение из
 * удалённого блока значит требовать вернуть блок, который врал.
 */
requireIn(
	scheduleSource,
	"относится только к расписанию",
	"Schedule unlocked state must keep other access domains separate.",
);
forbidIn(
	scheduleSource,
	"Админ-доступ активен для расписания, настроек и Telegram.",
	"Schedule admin unlocked state must not imply settings or Telegram access.",
);
forbidIn(
	scheduleSource,
	"Админ-доступ DENTE активен",
	"Schedule admin unlocked state must not expose internal DENTE wording.",
);
forbidIn(
	scheduleSource,
	"telegramAdminSecretDraft",
	"ScheduleView admin draft naming must stay schedule-owned.",
);
forbidIn(
	scheduleSource,
	"telegramAdminSecretSession",
	"ScheduleView admin session naming must stay schedule-owned.",
);
forbidIn(
	scheduleSource,
	"setTelegramAdminSecretDraft",
	"ScheduleView admin draft setter must stay schedule-owned.",
);
forbidIn(
	scheduleSource,
	"unlockTelegramAdminSession",
	"ScheduleView unlock action must stay schedule-owned.",
);
forbidIn(
	scheduleSource,
	"lockTelegramAdminSession",
	"ScheduleView lock action must stay schedule-owned.",
);
/*
 * ОБЪЯВЛЕННЫЙ ДОЛГ: ПУСТОЕ СОСТОЯНИЕ ПОТЕРЯЛО АДРЕС. НЕ ЧИНИТСЯ ЗДЕСЬ.
 *
 * Снятое утверждение:
 *   data-testid="schedule-empty-state"
 *   «ScheduleView must render an addressable empty state…»
 *
 * Пустое состояние ЕСТЬ и стало лучше (три разных случая вместо одного, см. ниже),
 * но рисует его общий компонент <EmptyState> (ScheduleView.tsx:1033), а он не
 * принимает ни data-testid, ни className: в apps/web/src/components/EmptyState.tsx
 * таких пропсов нет вовсе. Поэтому у пустого расписания больше нет ни зацепки для
 * прогонов, ни собственного класса.
 *
 * Это не только про стража. Два следствия, которые можно проверить поиском:
 *   - scripts/smoke-daily-surfaces-keyboard-accessibility.mjs:307 требует
 *     className="schedule-empty-state" — его в продукте нет, значит тот страж
 *     красный по этой же причине (чужой файл, вынесено в очередь);
 *   - правила .schedule-empty-state в apps/web/src/styles/main.css:9241, 9252,
 *     9259 и 13904 остались СИРОТАМИ: класс никто не носит, а проверки этого
 *     стража на них ниже по-прежнему зелёные, то есть подтверждают оформление
 *     несуществующего элемента.
 *
 * ХРАПОВИК: как только у пустого расписания снова появится адрес (data-testid или
 * класс), страж упадёт и потребует вернуть утверждение и убрать эту запись.
 */
if (
	scheduleSource.includes('data-testid="schedule-empty-state"') ||
	scheduleSource.includes('className="schedule-empty-state"')
) {
	throw new Error(
		"Долг закрыт: у пустого состояния расписания снова есть адрес. Верните утверждение " +
			"«ScheduleView must render an addressable empty state» и уберите запись из " +
			"объявленного долга в scripts/smoke-schedule-view-source.mjs.",
	);
}

/*
 * «НЕТ ЗАПИСЕЙ ПО ВЫБРАННЫМ ФИЛЬТРАМ» УДАЛЕНО ОСОЗНАННО: ОНО ВРАЛО.
 *
 * Причина записана в продукте (ScheduleView.tsx:1024-1032) и проверена в живом
 * браузере: у клиники, которая ни разу никого не записывала, экран уверял, что
 * записи прячут её фильтры, и предлагал сбросить то, чего нет. Теперь пустот три,
 * и каждая называет свою причину: «Записей пока нет ни одной», «На этот день
 * записей нет», «Всё скрыто фильтрами». Требование «пустота объясняет себя»
 * выполняется ими всеми, поэтому проверяются все три, а не одна общая фраза.
 */
requireIn(
	scheduleSource,
	'"Записей пока нет ни одной"',
	"Schedule empty state must explain why the timeline is empty.",
);
requireIn(
	scheduleSource,
	'"Всё скрыто фильтрами"',
	"Schedule empty state must name the filter case separately.",
);
requireIn(
	scheduleSource,
	'"На этот день записей нет"',
	"Schedule empty state must name the single-day case separately.",
);
requireIn(
	scheduleSource,
	"Расписание не сломалось",
	"Schedule empty state must reassure non-technical users with a concrete recovery path.",
);
/*
 * ПУСТОТА СЧИТАЕТСЯ ПО ПОКАЗАННЫМ ДНЯМ, А НЕ ПО ВСЕМУ СПИСКУ. Прежний needle
 * «sortedAppointments.length === 0» отвечал на вопрос «список пуст», а ветка
 * нужна на вопрос «на экране ничего не видно»: после группировки по дням это
 * visibleAppointmentCount (ScheduleView.tsx:416 и 1023). Разница видна, когда
 * фильтр по дню оставляет ноль строк при непустом списке.
 */
requireIn(
	scheduleSource,
	"visibleAppointmentCount === 0",
	"ScheduleView must branch explicitly for empty filtered timelines.",
);
requireIn(
	scheduleSource,
	"onClick={focusNewAppointmentEditor}",
	"Schedule empty state must jump to appointment creation.",
);
requireIn(
	cssSource,
	".schedule-empty-state",
	"Schedule empty state must have a dedicated responsive layout.",
);
requireIn(
	cssSource,
	".schedule-empty-actions",
	"Schedule empty actions must wrap cleanly on narrow screens.",
);
requireIn(
	cssSource,
	".schedule-shift-summary",
	"Schedule shift summary must have a dedicated compact layout.",
);
requireIn(
	cssSource,
	".schedule-shift-summary-grid",
	"Schedule shift summary cards must have a responsive grid.",
);
requireIn(
	cssSource,
	".schedule-shift-summary-grid,\n  .schedule-filter-strip",
	"Schedule shift summary grid must collapse with schedule filters on mobile.",
);
requireIn(
	cssSource,
	".schedule-empty-state {\n    align-items: stretch;",
	"Schedule empty state must stack safely on mobile.",
);
requireIn(
	cssSource,
	".schedule-empty-actions .primary-button",
	"Schedule empty-state actions must become full-width mobile buttons.",
);
requireIn(
	scheduleSource,
	'onClick={unlockScheduleAdminSession}\n                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}',
	"Schedule admin unlock button must also point to missing-secret guidance.",
);
requireIn(
	appSource,
	"appointmentScheduleDateMissingSteps",
	"App.tsx must validate appointment dates before schedule mutations.",
);
requireIn(
	appSource,
	"appointmentScheduleMissingFields",
	"App.tsx must validate required appointment fields before schedule mutations.",
);
requireIn(
	appSource,
	"return appointmentScheduleMissingFields(draft, dashboard?.clinicSettings.profile.mode);",
	"New and edited appointment validation must share the same required-field helper.",
);
requireIn(
	appSource,
	"Перед сохранением записи",
	"Appointment save handler must explain invalid dates.",
);
requireIn(
	appSource,
	"Перед созданием записи",
	"Appointment create handler must explain invalid or missing fields.",
);
requireIn(
	appSource,
	"Дождитесь завершения текущего создания записи.",
	"Appointment create handler must guard duplicate submits.",
);
/*
 * ЗАПРЕТ СУДИТ О СВОЁМ ПРЕДМЕТЕ — О ScheduleView.tsx.
 *
 * Замерено: в ScheduleView.tsx ноль вхождений «Record<string, any>» и ноль «: any»
 * — файл дисциплину держит. Оба запрета проверялись по СКЛЕЙКЕ трёх файлов,
 * поэтому падали на вынесенных компонентах, а сообщение при этом называло
 * ScheduleView. Страж обвинял не тот файл.
 */
forbidIn(
	scheduleViewSource,
	"Record<string, any>",
	"ScheduleView must not hide its props behind Record<string, any>.",
);
forbidIn(
	scheduleViewSource,
	": any",
	"ScheduleView must not use explicit any annotations.",
);

/*
 * ОБЪЯВЛЕННЫЙ ДОЛГ С ДВУСТОРОННИМ ХРАПОВИКОМ: ТИПЫ ЧЕРНОВИКА ЗАПИСИ ПОТЕРЯНЫ
 * В ВЫНЕСЕННЫХ КОМПОНЕНТАХ.
 *
 * При разборе расписания на компоненты пропсы черновика приёма получили
 * `Record<string, any>`:
 *   components/schedule/AppointmentCard.tsx:12 — appointmentDraft
 *   components/schedule/NewAppointmentForm.tsx:16 — newAppointmentDraft
 * плюс по одной строке с явным any в обновляющей функции
 * (AppointmentCard.tsx:36 — `key: any, value: any`).
 *
 * Это не косметика: черновик несёт пациента, врача, кресло, время и статус —
 * ровно те поля, чью подмену компилятор и должен ловить. Правильный тип уже
 * существует и применяется рядом: AppointmentScheduleDraft (ScheduleView.tsx:361,
 * AppHelpers.tsx:4707). Правится это в продукте, не в страже.
 *
 * ХРАПОВИК В ОБЕ СТОРОНЫ: долг зафиксирован числом. Станет больше — страж упадёт
 * (потеря типов расползается). Станет ноль — тоже упадёт и потребует убрать
 * запись и распространить запрет на компоненты. Реестр долга без верхней и нижней
 * границы сам превращается в ложь.
 */
const LOOSE_DRAFT_TYPING_DEBT = 2;
const looseDraftTypingCount = [
	appointmentCardSource,
	newAppointmentFormSource,
].reduce(
	(sum, source) => sum + (source.split("Record<string, any>").length - 1),
	0,
);
if (looseDraftTypingCount > LOOSE_DRAFT_TYPING_DEBT) {
	throw new Error(
		`Потеря типов расползается: «Record<string, any>» в вынесенных компонентах расписания ` +
			`стало ${looseDraftTypingCount} вместо объявленных ${LOOSE_DRAFT_TYPING_DEBT}. ` +
			"Черновик приёма обязан носить тип AppointmentScheduleDraft.",
	);
}
if (looseDraftTypingCount < LOOSE_DRAFT_TYPING_DEBT) {
	throw new Error(
		`Долг закрыт: «Record<string, any>» в вынесенных компонентах расписания осталось ` +
			`${looseDraftTypingCount}. Уберите запись из объявленного долга в ` +
			"scripts/smoke-schedule-view-source.mjs и распространите запрет на " +
			"components/schedule/*.tsx.",
	);
}

console.log(
	JSON.stringify(
		{
			ok: true,
			scheduleViewLazy: true,
			appScheduleRowsRemoved: true,
			appointmentActionsPreserved: true,
		},
		null,
		2,
	),
);
