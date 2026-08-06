import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

const appSource = [
	await readFile("apps/web/src/App.tsx", "utf8"),
	await readAppLogicSource(),
	await readFile("apps/web/src/AppHelpers.tsx", "utf8"),
].join("\n");
const workspaceStaticOptionsSource = await readFile(
	"apps/web/src/workspaceStaticOptions.ts",
	"utf8",
);
/*
 * КОМПОНЕНТЫ РАСПИСАНИЯ ЧИТАЮТСЯ ТОЖЕ.
 *
 * ScheduleView разобран на components/schedule/*, и поля ввода даты уехали туда:
 * требование «редактор записи не показывает сырую ISO-дату» проверяется по
 * type="datetime-local", а он теперь в AppointmentCard.tsx и
 * NewAppointmentForm.tsx. В ScheduleView.tsx его больше нет, и страж падал на
 * верном коде.
 *
 * Список перечислен, а не собран обходом каталога: обход подхватил бы новый
 * компонент молча.
 */
const scheduleComponentSources = ["AppointmentCard", "NewAppointmentForm"];

const webSource = [
	appSource,
	workspaceStaticOptionsSource,
	await readFile("apps/web/src/SettingsView.tsx", "utf8"),
	await readFile("apps/web/src/ScheduleView.tsx", "utf8"),
	...(await Promise.all(
		scheduleComponentSources.map((name) =>
			readFile(`apps/web/src/components/schedule/${name}.tsx`, "utf8"),
		),
	)),
].join("\n");
const apiSource = await readFile("apps/api/src/sampleData.ts", "utf8");
const cssSource = await readFile("apps/web/src/styles/main.css", "utf8");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

/*
 * СРАВНЕНИЕ БЕЗ УЧЁТА ОТСТУПОВ И ПЕРЕНОСОВ.
 *
 * Половина утверждений этого стража была написана с отступом в два и четыре
 * ПРОБЕЛА, а логика приложения давно переформатирована ТАБАМИ, и вызовы разложены
 * по строкам. Ни одно требование от этого не изменилось — изменился только пробел,
 * поэтому такие проверки сравниваются на схлопнутых пробелах. Это не смягчение:
 * порядок токенов и все имена сохраняются полностью, пропадает лишь чувствительность
 * к работе форматтера, которая красила стража на верном коде.
 */
function collapseSpace(value) {
	/*
	 * Пробелы убираются ПОЛНОСТЬЮ, а не схлопываются: форматтер не только
	 * переносит строки, но и ставит пробел после «(» и запятую перед «)» при
	 * разложении аргументов по строкам. Схлопывания до одного пробела для этого
	 * мало — «f( a, b, )» так и не совпадёт с «f(a, b)». Порядок токенов и все
	 * имена при этом сохраняются целиком, поэтому проверка не слабеет; применять
	 * это можно только к needle с КОДОМ — в человеческом тексте пробелы значимы.
	 */
	return value.replace(/\s+/g, "").replace(/,(?=[)\]}])/g, "");
}

function assertLoose(source, needle, message) {
	assert(collapseSpace(source).includes(collapseSpace(needle)), message);
}

/*
 * ИЗВЛЕЧЕНИЕ ТЕЛА ФУНКЦИИ БЫЛО СЛОМАНО ОТСТУПОМ, И ЭТО ДЕЛАЛО ПРОВЕРКИ ТУПЫМИ.
 *
 * Прежняя версия искала конец тела по «\n  async function » и «\n  function » —
 * то есть по отступу в ДВА ПРОБЕЛА. Логика приложения написана ТАБАМИ: замерено
 * на живом файле — вхождений с двумя пробелами ноль, с табом сто тридцать одно.
 * Значит конец не находился никогда, end падал в appSource.length, и «тело
 * функции addStaffMember» занимало 571 907 символов из 1 029 834 — больше половины
 * всей склейки, до самого конца AppHelpers.
 *
 * Чем это плохо: утверждение «внутри addStaffMember есть такая строка»
 * превращалось в «где-нибудь ниже по файлам есть такая строка». Проверка,
 * привязанная к функции, перестаёт отличать её от соседей — а именно на порядок
 * внутри функции опираются утверждения ниже (сначала сохранить профиль, потом
 * дёрнуть запрос).
 *
 * Теперь конец ищется по ОТСТУПУ ТОЙ ЖЕ ГЛУБИНЫ, что у самой функции, любыми
 * пробельными символами: следующая функция того же уровня и есть граница тела.
 * Вложенные функции внутри тела не считаются границей — у них отступ глубже.
 */
function functionBody(name) {
	let start = appSource.indexOf(`async function ${name}`);
	if (start < 0) start = appSource.indexOf(`function ${name}`);
	assert(start >= 0, `${name} function missing`);

	const lineStart = appSource.lastIndexOf("\n", start) + 1;
	const indent = appSource.slice(lineStart, start).match(/^[\t ]*/)?.[0] ?? "";
	const boundary = new RegExp(`\\n${indent}(?:async )?function `);
	const rest = appSource.slice(start + 1);
	const offset = rest.search(boundary);
	const end = offset >= 0 ? start + 1 + offset : appSource.length;
	return appSource.slice(start, end);
}

const changeClinicModeBody = functionBody("changeClinicMode");
const addStaffMemberBody = functionBody("addStaffMember");
const addChairBody = functionBody("addChair");
const onboardingFirstAppointmentBody = functionBody(
	"buildOnboardingFirstAppointmentIssues",
);
const onboardingDocumentReadinessBody = functionBody(
	"buildOnboardingDocumentReadinessIssues",
);
const onboardingFinishGuardBody = functionBody(
	"assertOnboardingReadyForFinish",
);
const saveOnboardingSchedulesIfDirtyBody = functionBody(
	"saveOnboardingSchedulesIfDirty",
);
const dismissOnboardingBody = functionBody("dismissOnboarding");
const continueOnboardingInDraftModeBody = functionBody(
	"continueOnboardingInDraftMode",
);
const moveOnboardingToBody = functionBody("moveOnboardingTo");
const teamOnboardingStart = appSource.indexOf('onboardingStep === "team"');
const teamOnboardingEnd = appSource.indexOf(
	'onboardingStep === "telegram"',
	teamOnboardingStart,
);
const teamOnboardingSource =
	teamOnboardingStart >= 0 && teamOnboardingEnd > teamOnboardingStart
		? appSource.slice(teamOnboardingStart, teamOnboardingEnd)
		: "";
const sourcesOnboardingStart = appSource.indexOf(
	'onboardingStep === "sources"',
);
const sourcesOnboardingEnd = appSource.indexOf(
	'onboardingStep === "telegram"',
	sourcesOnboardingStart,
);
const sourcesOnboardingSource =
	sourcesOnboardingStart >= 0 && sourcesOnboardingEnd > sourcesOnboardingStart
		? appSource.slice(sourcesOnboardingStart, sourcesOnboardingEnd)
		: "";
const onboardingReadinessStart = appSource.indexOf(
	"function buildOnboardingReadinessIssues",
);
const telegramRecommendationsStart = appSource.indexOf(
	"function buildOnboardingTelegramRecommendations",
);
const onboardingReadinessSource =
	onboardingReadinessStart >= 0 &&
	telegramRecommendationsStart > onboardingReadinessStart
		? appSource.slice(onboardingReadinessStart, telegramRecommendationsStart)
		: "";

assert(
	changeClinicModeBody.indexOf(
		"if (!(await saveClinicProfileIfDirty())) return;",
	) < changeClinicModeBody.indexOf('fetch("/api/settings/clinic/mode"'),
	"changeClinicMode must save dirty clinic profile before changing mode",
);
assert(
	addStaffMemberBody.includes("setNewStaffSpecialty(selectedSpecialty);"),
	"staff onboarding must keep selected specialty as the next staff default",
);
/*
 * ОДНОСТРОЧНЫЙ ВОЗВРАТ СТАЛ БЛОКОМ, ПОТОМУ ЧТО ПОЯВИЛАСЬ ЗАЩИТА ОТ ДВОЙНОГО КЛИКА.
 *
 * Требовалось «if (!(await saveClinicProfileIfDirty())) return;» — ровно в одну
 * строку. Сохранение грязного профиля перед созданием сотрудника на месте
 * (useAppLogic.tsx:7545-7549), но возврат теперь блочный: он ещё снимает
 * staffCreateInFlightRef и флаг «сохраняю», иначе после отказа кнопка осталась бы
 * навсегда занятой. Тот же вид у кресла (useAppLogic.tsx:7598-7602).
 *
 * Порядок — а он и есть предмет требования — проверяется отдельно: сохранение
 * профиля обязано стоять ДО запроса на создание. Раньше порядок в этих двух
 * утверждениях не проверялся вообще, только наличие строки.
 */
assert(
	addStaffMemberBody.includes("if (!(await saveClinicProfileIfDirty())) {"),
	"new staff creation must save dirty clinic profile before inheriting working hours",
);
assert(
	addStaffMemberBody.indexOf("saveClinicProfileIfDirty()") <
		addStaffMemberBody.indexOf('fetch("/api/settings/staff"'),
	"new staff creation must save the clinic profile before the create request",
);
assert(
	addChairBody.includes("specialization: selectedSpecialty"),
	"new chair must inherit selected doctor specialty",
);
assert(
	addChairBody.includes("if (!(await saveClinicProfileIfDirty())) {"),
	"new chair creation must save dirty clinic profile before inheriting working hours",
);
assert(
	addChairBody.indexOf("saveClinicProfileIfDirty()") <
		addChairBody.indexOf('fetch("/api/settings/chairs"'),
	"new chair creation must save the clinic profile before the create request",
);
assertLoose(
	appSource,
	"useEffect(() => {\n    setNewStaffSpecialty(selectedSpecialty);\n  }, [selectedSpecialty]);",
	"onboarding staff specialty default must follow persisted selected specialty",
);
assert(
	collapseSpace(appSource).includes(
		collapseSpace("saveOnboardingDismissed(\n      true,"),
	) && appSource.includes("setOnboardingDismissed(true)"),
	"onboarding dismissal must persist until reopened",
);
assert(
	appSource.includes("function onboardingLocalKey"),
	"onboarding fallback storage must be clinic-scoped",
);
assert(
	appSource.includes("loadOnboardingDismissalState(organizationId"),
	"onboarding fallback loader must accept clinic organization scope",
);
assert(
	appSource.includes("onboardingDismissalHydratedOrganizationIdRef"),
	"onboarding scoped fallback must hydrate after clinic profile load",
);
assert(
	dismissOnboardingBody.includes(
		"dashboard?.clinicSettings?.profile?.organizationId ?? null",
	),
	"full onboarding dismissal must write clinic-scoped fallback state",
);
assert(
	continueOnboardingInDraftModeBody.includes(
		"dashboard?.clinicSettings?.profile?.organizationId ?? null",
	),
	"draft-mode onboarding dismissal must write clinic-scoped fallback state",
);
assert(
	appSource.includes('aria-label="Роль нового сотрудника"'),
	"new staff role picker aria-label must be readable Russian",
);
assert(
	appSource.includes('aria-label="Специальность нового сотрудника"'),
	"new staff specialty picker aria-label must be readable Russian",
);
assert(
	!teamOnboardingSource.includes('aria-label="Ð'),
	"team onboarding aria-labels must not contain mojibake",
);
assert(
	!teamOnboardingSource.includes('aria-label="Ã'),
	"team onboarding aria-labels must not contain double-encoded mojibake",
);
assert(
	appSource.includes('"telegram" | "done"'),
	"onboarding must include Telegram before final readiness",
);
assert(
	appSource.includes(
		'{ id: "telegram", title: "ТГ-бот", detail: "бот, QR и отзывы" }',
	),
	"onboarding Telegram step metadata missing",
);
assert(
	appSource.includes('onboardingStep === "telegram"'),
	"onboarding Telegram panel missing",
);
assert(
	appSource.includes("telegramPatientPortalBaseUrlDraft"),
	"onboarding Telegram must collect patient portal URL",
);
assert(
	appSource.includes("telegramReviewUrlDraft"),
	"onboarding Telegram must collect review URL",
);
assert(
	appSource.includes("telegramMapsUrlDraft"),
	"onboarding Telegram must collect maps URL",
);
assert(
	appSource.includes('from "./workspaceStaticOptions"'),
	"onboarding Telegram must use shared static Telegram option tables",
);
assert(
	appSource.includes(
		'const onboardingTelegramVisualCardKeys: DenteTelegramVisualCardKey[] = [\n  "mainMenu",\n  "appointment",\n  "documents",\n  "tax",\n  "billing",\n  "care",\n  "review",\n  "staff"\n];',
	),
	"onboarding Telegram must expose every visual card URL, including tax, billing and staff",
);
assert(
	workspaceStaticOptionsSource.includes("Картинка налоговых документов"),
	"onboarding Telegram must expose tax document visual card",
);
assert(
	workspaceStaticOptionsSource.includes("Картинка оплаты"),
	"onboarding Telegram must expose billing/payment visual card",
);
assert(
	workspaceStaticOptionsSource.includes("Картинка для сотрудников"),
	"onboarding Telegram must expose staff visual card",
);
assert(
	!appSource.includes("telegramPostVisitCheckupDelayFields.slice(0, 4)"),
	"onboarding Telegram must not hide extended post-visit checkup topics",
);
assert(
	workspaceStaticOptionsSource.includes("После эндодонтии"),
	"onboarding Telegram must expose endodontic checkup delay",
);
assert(
	workspaceStaticOptionsSource.includes("После ортодонтии"),
	"onboarding Telegram must expose orthodontic checkup delay",
);
assert(
	workspaceStaticOptionsSource.includes("После пародонтологии"),
	"onboarding Telegram must expose periodontology checkup delay",
);
assert(
	appSource.includes('"payment_reminders"'),
	"onboarding Telegram must expose payment reminder toggle",
);
assert(
	appSource.includes('"recalls"'),
	"onboarding Telegram must expose recall toggle",
);
assert(
	appSource.includes('"callback_requests"'),
	"onboarding Telegram must expose callback request toggle",
);
assert(
	appSource.includes('"staff_daily_digest"'),
	"onboarding Telegram must expose staff digest toggle",
);
assert(
	appSource.includes("saveTelegramSettings()"),
	"onboarding Telegram must reuse the persistent Telegram settings save",
);
assertLoose(
	appSource,
	'onboardingStep === "telegram" && telegramSettingsDirty',
	"leaving Telegram onboarding must save dirty settings",
);
assert(
	appSource.includes('!onboardingDismissed && onboardingStep === "telegram"'),
	"Telegram control plane must load inside onboarding",
);
assert(
	appSource.includes("если защищенные настройки включены на сервере клиники"),
	"settings admin unlock must be described in operator language, not env names.",
);
assert(
	!appSource.includes(
		"DENTE_SETTINGS_ADMIN_SECRET или DENTE_TELEGRAM_ADMIN_SECRET",
	),
	"onboarding unlock must not expose server env names to operators.",
);
assert(
	appSource.includes("Секрет администратора клиники"),
	"admin secret label must be generic for clinic settings and Telegram",
);
assert(
	!appSource.includes("Введите секрет админ-панели Telegram"),
	"empty admin secret error must not be Telegram-only",
);
assert(
	!appSource.includes("Доступ к управлению Telegram"),
	"settings unlock panel must not be labeled as Telegram-only",
);
assert(
	appSource.includes("buildOnboardingReadinessIssues"),
	"onboarding must still expose combined setup readiness",
);
assert(
	appSource.includes("buildOnboardingFirstAppointmentIssues"),
	"onboarding must compute first-appointment readiness separately",
);
assert(
	appSource.includes("buildOnboardingDocumentReadinessIssues"),
	"onboarding must compute document/legal readiness separately",
);
assert(
	appSource.includes("buildOnboardingTelegramRecommendations"),
	"onboarding must keep Telegram setup as a guided recommendation",
);
assert(
	!onboardingReadinessSource.includes("режим Telegram"),
	"Telegram setup must not block first-run completion",
);
assert(
	!onboardingFirstAppointmentBody.includes("юридическое наименование"),
	"legal entity fields must not block the first working screen",
);
assert(
	!onboardingFirstAppointmentBody.includes("номер медицинской лицензии"),
	"license fields must not block the first working screen",
);
assert(
	onboardingDocumentReadinessBody.includes("юридическое наименование"),
	"document readiness must still require legal entity data",
);
assert(
	onboardingDocumentReadinessBody.includes("номер медицинской лицензии"),
	"document readiness must still require clinic license data",
);
assert(
	onboardingFinishGuardBody.includes("buildOnboardingFirstAppointmentIssues"),
	"finish guard must use first-appointment readiness",
);
assert(
	appSource.includes("Telegram можно включить позже"),
	"onboarding must explain that Telegram can be enabled later",
);
assert(
	appSource.includes("Первый рабочий экран можно открыть сейчас"),
	"onboarding must explain that legal documents can be completed later",
);
assert(
	appSource.includes("Документы требуют реквизитов"),
	"post-onboarding legal document blocker banner must remain visible",
);
assert(
	appSource.includes("assertOnboardingReadyForFinish"),
	"onboarding finish must be guarded by readiness checks",
);
assert(
	appSource.includes("disabled={!onboardingReadyToFinish}"),
	"onboarding finish/hide controls must be disabled until required data is filled",
);
assert(
	appSource.includes(
		'const onboardingFinishGuidanceId = "onboarding-finish-guidance"',
	),
	"onboarding finish blockers must use one stable guidance id",
);
assert(
	appSource.includes("id={onboardingFinishGuidanceId}"),
	"onboarding finish blocker guidance must be addressable",
);
assert(
	appSource.includes(
		"aria-describedby={!onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}",
	) &&
		appSource.includes(
			'aria-describedby={nextOnboardingStep.id === "done" && !onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}',
		) &&
		appSource.includes(
			'aria-describedby={step.id === "done" && !onboardingReadyToFinish ? onboardingFinishGuidanceId : undefined}',
		),
	"disabled onboarding finish controls must point to the blocker guidance",
);
assert(
	appSource.includes("onboardingDraftMode"),
	"onboarding must persist explicit draft mode when setup is postponed",
);
assert(
	appSource.includes("draftMode: typeof parsed.draftMode"),
	"onboarding fallback storage must preserve explicit draft mode",
);
assert(
	appSource.includes("JSON.stringify({ version: 1, ...state })"),
	"onboarding fallback storage must persist one complete dismissal state",
);
assert(
	appSource.includes("continueOnboardingInDraftMode"),
	"onboarding must offer an explicit draft-mode continuation",
);
assert(
	continueOnboardingInDraftModeBody.includes(
		"persistUiPreferences(savedPreferences)",
	) &&
		collapseSpace(continueOnboardingInDraftModeBody).includes(
			collapseSpace(
				"saveOnboardingDismissed(\n      true,\n      dismissalSavedAt,\n      true,",
			),
		),
	"draft-mode onboarding must persist UI preferences before writing the fallback dismissal key",
);
assert(
	appSource.includes("Продолжить в черновике"),
	"onboarding draft-mode action must be visible in Russian",
);
assert(
	appSource.includes("Первичная настройка не завершена"),
	"draft-mode banner must keep unfinished setup visible",
);
assert(
	appSource.includes("showFullOnboardingGuide"),
	"first-run guide must have an explicit full/compact render switch",
);
assertLoose(
	appSource,
	'currentView === "settings" && settingsTab === "clinic" && onboardingGuideExpanded',
	"full first-run wizard must only auto-expand on settings/clinic",
);
assert(
	appSource.includes('setOnboardingGuideExpanded(settingsTab === "clinic")'),
	"settings tabs other than clinic must not be covered by the full onboarding wizard",
);
assert(
	appSource.includes("setOnboardingGuideExpanded(false);"),
	"leaving settings must collapse the full onboarding wizard",
);
assert(
	appSource.includes("!onboardingDismissed && !showFullOnboardingGuide"),
	"working screens must show compact onboarding instead of the full wizard",
);
assert(
	appSource.includes('className="onboarding-compact-strip"'),
	"working screens must expose compact first-run actions",
);
assert(
	appSource.includes("openOnboardingGuide"),
	"compact onboarding must provide a direct path back to the full wizard",
);
assert(
	appSource.includes("setOnboardingGuideExpanded(true);"),
	"opening settings or the wizard must expand the full onboarding guide",
);
assert(
	appSource.includes("Можно начать прием без мастера"),
	"compact onboarding must tell doctors they can start work without the wizard",
);
assert(
	cssSource.includes(".onboarding-compact-strip"),
	"compact onboarding must have dedicated layout styles",
);
assert(
	cssSource.includes(".top-actions .secondary-button"),
	"mobile top actions must keep text buttons readable",
);
/*
 * ТОТ ЖЕ ОТКАТ, ТОЛЬКО С ЗАЩИТНЫМ «?.». Резервный выбор пациента на месте —
 * hooks/domains/usePatientLogic.ts:134-139: сначала пациент открытого приёма,
 * затем первый активный, затем первый в списке. Прежний needle требовал
 * «dashboard.patients.find(...)» без опциональной цепочки и падал на добавленном
 * «?.», хотя проверка стала строго осторожнее.
 */
assert(
	appSource.includes(
		'dashboard?.patients?.find((patient) => patient.status === "active")',
	),
	"first-run UI must fall back to an active patient instead of endless loading when activeVisit points to missing patient",
);
assert(
	apiSource.includes("const activeVisitPatientExists = patients.some") &&
		apiSource.includes("activeVisit.patientId = patient.id") &&
		apiSource.includes("activeAppointment.patientId = patient.id"),
	"first created patient must become the active visit/appointment patient when previous active patient is missing",
);
/*
 * «|| !activePatient» УБРАЛИ ОСОЗНАННО, И ТРЕБОВАТЬ ЕГО НАЗАД НЕЛЬЗЯ.
 *
 * Прежний needle требовал «if (!dashboard || !activePatient)». Сейчас загрузочный
 * барьер разделён: App.tsx:2479-2481 держит только `if (!dashboard)` с той же
 * подписью «Загрузка рабочей смены», а на отсутствие пациента приложение больше
 * не встаёт целиком — «!activePatient» в App.tsx не встречается вовсе.
 *
 * Это та же поломка, от которой защищает утверждение выше («вместо бесконечной
 * загрузки подставить активного пациента»): клиника без единого пациента при
 * прежнем условии не выходила из «Загрузка…» никогда. Родственный случай
 * подробно описан в самом продукте (App.tsx:2037-2056) — там `if (!dashboard)`
 * вешал экран навсегда, когда сводка не приходит вообще, и его тоже разобрали.
 *
 * Проверяется поэтому то, что требование и означает: барьер существует, назван
 * по-человечески и опирается на отсутствие данных клиники, а не на отсутствие
 * пациента.
 */
assert(
	appSource.includes("if (!dashboard) {") &&
		appSource.includes("Загрузка рабочей смены"),
	"first-run boot guard must remain explicit and readable",
);
assert(
	!appSource.includes("if (!dashboard || !activePatient)"),
	"boot guard must not block the whole app on a missing patient: that is the endless-loading trap",
);
assertLoose(
	dismissOnboardingBody,
	"await saveServerUiPreferences(savedPreferences, settingsAdminSecretSession)",
	"onboarding dismissal must synchronously persist server UI preferences",
);
assert(
	dismissOnboardingBody.includes("persistUiPreferences(savedPreferences)") &&
		dismissOnboardingBody.includes(
			"pendingUiPreferencesSyncRef.current = null",
		),
	"full onboarding dismissal must stay open and avoid local dismissal when server preference save fails",
);
assertLoose(
	continueOnboardingInDraftModeBody,
	"queueUiPreferencesServerSync(savedPreferences, { delayMs: 5000 })",
	"draft-mode onboarding must queue server preference retry instead of losing the selected configuration",
);
assert(
	appSource.includes("врач для первого приема"),
	"onboarding readiness must require an active doctor",
);
assert(
	appSource.includes("врач с правом подписи ЭМК"),
	"onboarding readiness must require a medical-record signer",
);
assert(
	appSource.includes("кресло / кабинет"),
	"onboarding readiness must require an active chair",
);
/*
 * ОБРАЩЕНИЯ К СВОДКЕ СТАЛИ ЗАЩИЩЁННЫМИ: «dashboard.activeVisit.appointmentId» →
 * «dashboard?.activeVisit?.appointmentId», «appointmentReadiness.find» →
 * «appointmentReadiness?.find» (useScheduleLogic.ts:402-412). Правило блокировки
 * то же: незакрытые проверки «team» и «schedule» активного приёма попадают в
 * список препятствий первичной настройки.
 *
 * ВНИМАНИЕ НА БУДУЩЕЕ: эта функция существует в продукте ДВАЖДЫ — в
 * useAppLogic.tsx:2966 и hooks/domains/useScheduleLogic.ts:368, и на сегодня обе
 * копии побайтово одинаковы (по 1867 символов, сверено программно). Извлекатель
 * берёт ПЕРВУЮ по порядку склейки, то есть копию из useAppLogic. Если копии
 * разойдутся, страж будет судить только одну и молчать про другую; сама
 * двойственность вынесена в очередь как дефект продукта.
 */
assert(
	onboardingFirstAppointmentBody.includes(
		"dashboard?.activeVisit?.appointmentId",
	) &&
		onboardingFirstAppointmentBody.includes(
			"dashboard.appointmentReadiness?.find",
		) &&
		onboardingFirstAppointmentBody.includes('check.key === "team"') &&
		onboardingFirstAppointmentBody.includes('check.key === "schedule"') &&
		onboardingFirstAppointmentBody.includes("!check.ready"),
	"onboarding first appointment readiness must block on active appointment team/schedule blockers",
);
assert(
	saveOnboardingSchedulesIfDirtyBody.includes("staffScheduleDirtyIds") &&
		saveOnboardingSchedulesIfDirtyBody.includes("chairScheduleDirtyIds") &&
		saveOnboardingSchedulesIfDirtyBody.includes("saveStaffSchedule(staffId)") &&
		saveOnboardingSchedulesIfDirtyBody.includes("saveChairSchedule(chairId)"),
	"onboarding must flush dirty staff and chair schedules before step transitions",
);
assert(
	dismissOnboardingBody.indexOf("saveClinicProfileIfDirty()") <
		dismissOnboardingBody.indexOf("saveOnboardingSchedulesIfDirty()") &&
		dismissOnboardingBody.includes(
			"if (!(await saveOnboardingSchedulesIfDirty())) return;",
		),
	"full onboarding dismissal must save dirty schedules before dismissal",
);
assert(
	continueOnboardingInDraftModeBody.indexOf("saveClinicProfileIfDirty()") <
		continueOnboardingInDraftModeBody.indexOf(
			"saveOnboardingSchedulesIfDirty()",
		) &&
		continueOnboardingInDraftModeBody.includes(
			"if (!(await saveOnboardingSchedulesIfDirty())) return;",
		),
	"draft-mode onboarding exit must save dirty schedules before dismissal",
);
assert(
	moveOnboardingToBody.indexOf("saveClinicProfileIfDirty()") <
		moveOnboardingToBody.indexOf("saveOnboardingSchedulesIfDirty()") &&
		moveOnboardingToBody.includes(
			"if (!(await saveOnboardingSchedulesIfDirty())) return;",
		),
	"onboarding step navigation must save dirty schedules before switching step",
);
assert(
	webSource.includes("appointmentScheduleDirtyIds"),
	"appointment schedule editor must track dirty state",
);
assert(
	webSource.includes('type="datetime-local"'),
	"appointment schedule editor must avoid raw ISO date inputs",
);
assert(
	webSource.includes("chairScheduleDrafts"),
	"chair schedule editor must keep editable chair working hours",
);
assert(
	webSource.includes("saveChairSchedule"),
	"chair schedule editor must save chair working hours",
);
assert(
	webSource.includes("/api/settings/chairs/${chairId}/working-hours"),
	"chair schedule editor must use chair working-hours API",
);
assert(
	webSource.includes("Рабочие дни кресла"),
	"chair schedule editor must expose readable Russian day controls",
);
assert(
	addChairBody.includes("workingHours: staffWorkingHoursFromSimpleDraft"),
	"new chairs must inherit clinic working hours",
);
assert(
	appSource.includes(
		'const onboardingStaffCreateGuidanceId = "onboarding-staff-create-guidance"',
	),
	"onboarding staff creation guidance must use a stable id",
);
assert(
	appSource.includes(
		'const onboardingChairCreateGuidanceId = "onboarding-chair-create-guidance"',
	),
	"onboarding chair creation guidance must use a stable id",
);
assert(
	appSource.includes("id={onboardingStaffCreateGuidanceId}"),
	"onboarding staff quick-create guidance must be addressable",
);
assert(
	appSource.includes("id={onboardingChairCreateGuidanceId}"),
	"onboarding chair quick-create guidance must be addressable",
);
assert(
	appSource.includes(
		"aria-describedby={!newStaffReadyToCreate ? onboardingStaffCreateGuidanceId : undefined}",
	) &&
		appSource.includes(
			"aria-describedby={!newChairReadyToCreate ? onboardingChairCreateGuidanceId : undefined}",
		),
	"onboarding quick-create buttons must point to their missing-field guidance",
);

assert(
	teamOnboardingSource.includes("onboarding-schedule-grid"),
	"team onboarding must expose compact schedule setup",
);
assert(
	teamOnboardingSource.includes("onboarding-compact-schedule-editor"),
	"team onboarding schedule must use the compact editor",
);
assert(
	teamOnboardingSource.includes("updateStaffScheduleDraft(member.id"),
	"team onboarding must edit staff working hours",
);
assert(
	teamOnboardingSource.includes("toggleStaffWorkingDay(member.id"),
	"team onboarding must toggle staff working days",
);
assert(
	teamOnboardingSource.includes("saveStaffSchedule(member.id)"),
	"team onboarding must allow manual staff schedule save",
);
assert(
	teamOnboardingSource.includes("updateChairScheduleDraft(chair.id"),
	"team onboarding must edit chair working hours",
);
assert(
	teamOnboardingSource.includes("toggleChairWorkingDay(chair.id"),
	"team onboarding must toggle chair working days",
);
assert(
	teamOnboardingSource.includes("saveChairSchedule(chair.id)"),
	"team onboarding must allow manual chair schedule save",
);
assert(
	teamOnboardingSource.includes("Ждет автосохранения"),
	"team onboarding schedule must show autosave pending state",
);
assert(
	teamOnboardingSource.includes("Рабочие дни сотрудника"),
	"team onboarding staff day controls must be readable Russian",
);
assert(
	teamOnboardingSource.includes("Рабочие дни кресла"),
	"team onboarding chair day controls must be readable Russian",
);

assert(
	sourcesOnboardingSource.includes("onboarding-source-config"),
	"sources onboarding must expose inline source configuration",
);
assert(
	sourcesOnboardingSource.includes("Быстрая настройка источников данных"),
	"sources onboarding must have readable Russian aria-label",
);
assert(
	sourcesOnboardingSource.includes("setPricelistSourceKind(kind)"),
	"sources onboarding must persist selected pricelist source kind",
);
assert(
	sourcesOnboardingSource.includes("setImportSourceKind(kind)"),
	"sources onboarding must persist selected patient import source kind",
);
assert(
	sourcesOnboardingSource.includes("setSmartImportMode(mode)"),
	"sources onboarding must persist selected smart import mode",
);
assert(
	sourcesOnboardingSource.includes("setDocumentIngestionTarget(target)"),
	"sources onboarding must persist selected document ingestion target",
);
assert(
	sourcesOnboardingSource.includes("setImagingImportSourceKind(kind)"),
	"sources onboarding must persist selected imaging source kind",
);
assert(
	sourcesOnboardingSource.includes(
		"setDicomWebEndpointUrl(event.target.value)",
	),
	"sources onboarding must persist DICOMweb endpoint",
);
assert(
	sourcesOnboardingSource.includes("setOhifBaseUrl(event.target.value)"),
	"sources onboarding must persist OHIF endpoint",
);
assert(
	sourcesOnboardingSource.includes(
		"Автосохранено: прайс, импорт, документы, снимки, архив и внешний просмотр",
	),
	"sources onboarding must explain autosave coverage",
);
assert(
	sourcesOnboardingSource.includes("Архив снимков и внешний просмотр"),
	"sources onboarding must describe DICOMweb/OHIF in operator language",
);
assert(
	!sourcesOnboardingSource.includes("DICOMweb и OHIF"),
	"sources onboarding must not expose protocol names as the section title",
);
assert(
	!sourcesOnboardingSource.includes("Корень DICOMweb"),
	"sources onboarding must not expose DICOMweb root jargon",
);
assert(
	!sourcesOnboardingSource.includes("Корень OHIF"),
	"sources onboarding must not expose OHIF root jargon",
);
assert(
	sourcesOnboardingSource.includes("Прайс клиники"),
	"sources onboarding pricelist card must be readable Russian",
);
assert(
	sourcesOnboardingSource.includes("Перенос пациентов"),
	"sources onboarding patient migration card must be readable Russian",
);
assert(
	sourcesOnboardingSource.includes("Документы и файлы"),
	"sources onboarding document route card must be readable Russian",
);
assert(
	sourcesOnboardingSource.includes("Снимки и КТ"),
	"sources onboarding imaging card must be readable Russian",
);

console.log(
	JSON.stringify({
		ok: true,
		checked: [
			"mode-save-before-switch",
			"staff-specialty-default",
			"chair-specialty-default",
			"onboarding-dismissal",
			"onboarding-team-readable-russian",
			"onboarding-sources-persisted-configuration",
			"telegram-first-run-step",
			"telegram-first-run-non-blocking",
			"compact-first-run-working-screen",
		],
	}),
);
