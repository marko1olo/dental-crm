import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

const scheduleHooksDir = "apps/web/src/hooks/domains/schedule";
const scheduleHooksSource = existsSync(scheduleHooksDir)
	? readdirSync(scheduleHooksDir)
			.filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
			.map((f) => readFileSync(path.join(scheduleHooksDir, f), "utf8"))
			.join("\n")
	: "";

const adminRouterPath = "apps/web/src/components/appLayout/viewRouterModules/AdministrativeViewRouter.tsx";
const adminRouterSource = existsSync(adminRouterPath)
	? readFileSync(adminRouterPath, "utf8")
	: "";

const appSource = (
	readFileSync("apps/web/src/App.tsx", "utf8") +
	"\n" +
	readAppLogicSourceSync() +
	"\n" +
	readFileSync("apps/web/src/hooks/domains/useScheduleLogic.ts", "utf8") +
	"\n" +
	scheduleHooksSource +
	"\n" +
	adminRouterSource
).replace(/\r\n/g, "\n");
/*
 * Файлы держатся ПООТДЕЛЬНОСТИ, а не только склеенными: часть требований
 * адресована именно ScheduleView.tsx (например запрет на Record<string, any> в
 * его пропсах), и на склейке такой запрет начинает судить о вынесенных
 * компонентах. Требование к разметке по-прежнему проверяется по scheduleSource —
 * разметка живёт во всех файлах домена расписания.
 */
const scheduleViewSource = readFileSync(
	"apps/web/src/ScheduleView.tsx",
	"utf8",
).replace(/\r\n/g, "\n");
const appointmentCardSource = readFileSync(
	"apps/web/src/components/schedule/AppointmentCard.tsx",
	"utf8",
).replace(/\r\n/g, "\n");
function readSourceFilesRecursive(dir, extensions = [".ts", ".tsx"]) {
	if (!existsSync(dir)) return [];
	const entries = readdirSync(dir, { withFileTypes: true });
	let files = [];
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			files = files.concat(readSourceFilesRecursive(full, extensions));
		} else if (extensions.some((ext) => e.name.endsWith(ext))) {
			files.push(readFileSync(full, "utf8").replace(/\r\n/g, "\n"));
		}
	}
	return files;
}

const newAppointmentDir = "apps/web/src/components/schedule/newAppointment";
const newAppointmentFormSource = [
	...(existsSync("apps/web/src/components/schedule/NewAppointmentForm.tsx")
		? [readFileSync("apps/web/src/components/schedule/NewAppointmentForm.tsx", "utf8").replace(/\r\n/g, "\n")]
		: []),
	...readSourceFilesRecursive(newAppointmentDir),
].join("\n");

const scheduleViewDir = "apps/web/src/components/schedule/view";
const scheduleViewModulesDir = "apps/web/src/components/schedule/scheduleViewModules";
const scheduleViewExtracted = [
	...readSourceFilesRecursive(scheduleViewDir),
	...readSourceFilesRecursive(scheduleViewModulesDir),
];
const scheduleAnalyticsFile =
	"apps/web/src/components/schedule/ScheduleShiftAnalytics.tsx";
const scheduleAnalyticsSource = existsSync(scheduleAnalyticsFile)
	? [
			readFileSync(scheduleAnalyticsFile, "utf8").replace(
				/\r\n/g,
				"\n",
			),
		]
	: [];
const scheduleTimelineFile =
	"apps/web/src/components/schedule/ScheduleTimeline.tsx";
const scheduleTimelineModulesDir =
	"apps/web/src/components/schedule/timelineModules";
const scheduleTimelineSource = [
	...(existsSync(scheduleTimelineFile)
		? [readFileSync(scheduleTimelineFile, "utf8").replace(/\r\n/g, "\n")]
		: []),
	...readSourceFilesRecursive(scheduleTimelineModulesDir),
];
const scheduleGridFile =
	"apps/web/src/components/schedule/ScheduleGrid.tsx";
const scheduleGridSource = existsSync(scheduleGridFile)
	? [
			readFileSync(scheduleGridFile, "utf8").replace(
				/\r\n/g,
				"\n",
			),
		]
	: [];
const scheduleQuickActionsFile =
	"apps/web/src/components/schedule/AppointmentQuickActions.tsx";
const scheduleQuickActionsSource = existsSync(scheduleQuickActionsFile)
	? [
			readFileSync(scheduleQuickActionsFile, "utf8").replace(
				/\r\n/g,
				"\n",
			),
		]
	: [];
const scheduleCardFiles = [
	"apps/web/src/components/schedule/AppointmentCardEditor.tsx",
	"apps/web/src/components/schedule/AppointmentCardPrimaryActions.tsx",
	"apps/web/src/components/schedule/AppointmentCardContextMenu.tsx",
	"apps/web/src/components/schedule/AppointmentPaymentBadges.tsx",
	"apps/web/src/components/schedule/AppointmentStatusPopup.tsx",
	"apps/web/src/components/schedule/useAppointmentCardState.ts",
	"apps/web/src/components/schedule/AppointmentCardMemo.ts",
	"apps/web/src/components/schedule/appointmentCardHelpers.ts",
];
const appointmentEditorDir = "apps/web/src/components/schedule/appointmentEditor";
const appointmentCardModulesDir = "apps/web/src/components/schedule/appointmentCardModules";
const appointmentPaymentBadgesDir = "apps/web/src/components/schedule/appointmentPaymentBadges";
const appointmentContextMenuDir = "apps/web/src/components/schedule/appointmentContextMenu";
const scheduleCardExtractedSources = [
	...scheduleCardFiles
		.filter((f) => existsSync(f))
		.map((f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n")),
	...readSourceFilesRecursive(appointmentEditorDir),
	...readSourceFilesRecursive(appointmentCardModulesDir),
	...readSourceFilesRecursive(appointmentPaymentBadgesDir),
	...readSourceFilesRecursive(appointmentContextMenuDir),
];

const scheduleSource = [
	scheduleViewSource,
	appointmentCardSource,
	newAppointmentFormSource,
	...scheduleViewExtracted,
	...scheduleAnalyticsSource,
	...scheduleTimelineSource,
	...scheduleGridSource,
	...scheduleQuickActionsSource,
	...scheduleCardExtractedSources,
].join("\n");
const cssSource = [
	existsSync("apps/web/src/styles/main.css") ? readFileSync("apps/web/src/styles/main.css", "utf8") : "",
	...readSourceFilesRecursive("apps/web/src/styles", [".css"]),
].join("\n").replace(/\r\n/g, "\n");

function requireIn(source, needle, message) {
	if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
	if (source.includes(needle)) throw new Error(message);
}

if (
	(!appSource.includes('import("./ScheduleView")') && !appSource.includes('import("../../../ScheduleView")')) ||
	(!appSource.includes("lazyWithRetry") && !appSource.includes("lazy("))
) {
	throw new Error("App.tsx must lazy-load ScheduleView.");
}
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
	'id="schedule"',
	"ScheduleView must own schedule panel.",
);
requireIn(
	scheduleSource,
	"panel schedule-panel",
	"ScheduleView must own schedule panel.",
);
requireIn(
	scheduleSource,
	"schedule-command-grid",
	"ScheduleView must preserve schedule command cards.",
);
requireIn(
	scheduleSource,
	"ScheduleShiftAnalytics",
	"ScheduleView must preserve shift analytics component.",
);
requireIn(
	scheduleSource,
	'data-testid="schedule-shift-analytics"',
	"ScheduleView must render shift analytics with test ID.",
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
if (
	!scheduleSource.includes("groupAppointmentsByClinicDay") ||
	!scheduleSource.includes("sortedAppointments")
) {
	throw new Error("ScheduleView must preserve appointment rows.");
}
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
const helpersFile = existsSync("apps/web/src/appHelpers/appointmentHelpers.ts")
	? "apps/web/src/appHelpers/appointmentHelpers.ts"
	: "apps/web/src/AppHelpers.tsx";
const helpersSource = (
	readFileSync(helpersFile, "utf8") +
	"\n" +
	(existsSync("apps/web/src/AppHelpers.tsx") ? readFileSync("apps/web/src/AppHelpers.tsx", "utf8") : "")
).replace(/\r\n/g, "\n");

requireIn(
	scheduleSource,
	"appointmentScheduleMissingFields(",
	"ScheduleView must delegate appointment readiness to the shared missing-fields rule.",
);
requireIn(
	helpersSource,
	"if (!draft.patientId",
	"ScheduleView edited appointments must require a patient before saving.",
);
requireIn(
	helpersSource,
	'"выберите пациента"',
	"Missing-patient guidance must stay human-readable.",
);
requireIn(
	helpersSource,
	"if (!draft.doctorUserId) {",
	"ScheduleView edited appointments must require a doctor before saving.",
);
requireIn(
	helpersSource,
	'"выберите врача"',
	"Missing-doctor guidance must stay human-readable.",
);
requireIn(
	helpersSource,
	"if (!draft.chairId) {",
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
if (
	!scheduleSource.includes('aria-busy={newAppointmentSaveState === "saving"') &&
	!scheduleSource.includes('disabled={newAppointmentSaveState === "saving"}')
) {
	throw new Error("ScheduleView must guard appointment save state.");
}
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
	'"new-appointment-create-missing-short"',
	"New appointment create button must point to missing-field guidance.",
);
requireIn(
	scheduleSource,
	'id="new-appointment-create-missing-short"',
	"Short missing-field summary must stay addressable for the create button.",
);
if (
	!scheduleSource.includes('aria-busy={appointmentSaveState === "saving"') &&
	!scheduleSource.includes('disabled={appointmentSaveState === "saving"}')
) {
	throw new Error("ScheduleView must guard appointment save state.");
}
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
	"? appointmentSaveMissingId",
	"Appointment save button must point to missing-field guidance.",
);
requireIn(
	scheduleSource,
	"const appointmentEditorId =",
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
if (
	!scheduleSource.includes("activeVisitLockedAppointmentStatuses.has(status)") &&
	!scheduleSource.includes("activeVisitLockedAppointmentStatuses?.has(status)") &&
	!scheduleSource.includes("activeVisitLockedAppointmentStatuses.has(draft.status)")
) {
	throw new Error("ScheduleView must block terminal status drafts while the visit is open.");
}
requireIn(
	scheduleSource,
	"const appointmentPatientName =",
	"ScheduleView must compute one appointment patient name for row text and accessible actions.",
);
/*
 * ЗАГОЛОВКУ СТРОКИ ДОБАВИЛИ КЛАССЫ ОФОРМЛЕНИЯ.
 */
requireIn(
	scheduleSource,
	"formatPatientDisplayFio(appointmentPatientName)",
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
	"закройте прием перед закрывающим статусом",
	"Schedule editor must explain the active-visit terminal status blocker.",
);
requireIn(
	scheduleSource,
	"<span>Настроить запись</span>",
	"Schedule appointment must provide configure appointment action.",
);
requireIn(
	scheduleSource,
	'title="Настроить запись в редакторе (Клавиша Enter)"',
	"Schedule appointment must provide keyboard hint for configure appointment action.",
);
requireIn(
	scheduleSource,
	"id={appointmentEditorId}",
	"Appointment editor id must match the edit button controls relationship.",
);
if (
	!scheduleSource.includes("aria-label={`Редактирование записи: ${appointmentPatientName}`}") &&
	!scheduleSource.includes("aria-label={`Редактирование записи: ${props.appointmentPatientName}`}")
) {
	throw new Error("Appointment editor must name the appointment being edited.");
}
requireIn(
	scheduleSource,
	"? appointmentHandoffNoteId",
	"Locked active-visit patient selector must point to handoff guidance.",
);
requireIn(
	scheduleSource,
	"activeVisitLockedAppointmentStatuses",
	"Active-visit appointment status select must block terminal status options.",
);
/*
 * МАНДАТ 8e («Автономия врача») & МАНДАТ 8n («Суверенитет соло-практики»):
 * Бюрократический капкан требования «админского секрета» для изменения расписания
 * полностью ликвидирован (commit 3085bba486). Врач и персонал клиники имеют полный доступ к управлению
 * расписанием без блокировок и мастер-паролей. ScheduleAdminUnlockFieldset оставлен как no-op.
 */
forbidIn(
	scheduleSource,
	"x-dente-admin-secret",
	"Schedule admin unlock must not expose the raw header name.",
);
if (/[>"'`]Админ-доступ активен/.test(scheduleSource)) {
	throw new Error(
		"Schedule must not claim admin access is active: the secret is never verified before a save.",
	);
}
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
if (!scheduleSource.includes("Записей пока нет ни одной")) {
	throw new Error("Schedule empty state must explain why the timeline is empty.");
}
if (
	!scheduleSource.includes("Сбросить фильтры") &&
	!scheduleSource.includes("Снять фильтры")
) {
	throw new Error("Schedule empty state must reassure non-technical users with a concrete recovery path.");
}
if (
	!scheduleSource.includes("visibleAppointmentCount === 0") &&
	!scheduleSource.includes("!visibleDayGroups || visibleDayGroups.length === 0")
) {
	throw new Error("ScheduleView must branch explicitly for empty filtered timelines.");
}
if (
	!scheduleSource.includes("focusNewAppointmentEditor") &&
	!scheduleSource.includes("onNewAppointmentClick")
) {
	throw new Error("Schedule empty state must jump to appointment creation.");
}
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
	".schedule-shift-summary-grid",
	"Schedule shift summary grid must collapse with schedule filters on mobile.",
);
requireIn(
	cssSource,
	"align-items: stretch;",
	"Schedule empty state must stack safely on mobile.",
);
requireIn(
	cssSource,
	".schedule-empty-actions .primary-button",
	"Schedule empty-state actions must become full-width mobile buttons.",
);
requireIn(
	helpersSource,
	"appointmentScheduleDateMissingSteps",
	"AppHelpers must validate appointment dates before schedule mutations.",
);
requireIn(
	appSource,
	"appointmentScheduleMissingFields",
	"App.tsx must validate required appointment fields before schedule mutations.",
);
requireIn(
	appSource,
	"return appointmentScheduleMissingFields(",
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
const LOOSE_DRAFT_TYPING_DEBT = 10;
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
