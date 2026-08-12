import { readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";
import { readAppShellSourceSync } from "./lib/app-shell-source.mjs";
import { functionBodySource } from "./lib/function-body-source.mjs";
import { scheduleSourceExpectations } from "./lib/schedule-source-expectations.mjs";
import { readWebSurfaceSourceSync } from "./lib/web-surface-source.mjs";

/*
 * ПОМОЩНИКИ ЗАПИСИ УЕХАЛИ В utils/, И БЕЗ НИХ СТРАЖ СВЕРЯЛСЯ БЫ С ПУСТОТОЙ.
 *
 * Коммит ddd625d59 разобрал `AppHelpers.tsx` (5 700 строк -> 83) на каталог
 * `apps/web/src/utils/`. Туда уехало общее правило «чего не хватает записи» —
 * `appointmentScheduleMissingFields` теперь в utils/AppointmentHelpers.ts:410.
 *
 * Страж заметил это САМ и упал с внятным текстом: «Либо функция переименована,
 * либо переехала в файл, которого нет в склейке. Проверка не может сузить
 * область и обязана упасть, а не сверяться с пустотой». Ровно то поведение,
 * ради которого отказ на пустую область и писался: молчаливая пустая склейка
 * сделала бы все требования к телу функции вакуумными.
 *
 * Каталог читается целиком, а не поимённо: перечисление имён и есть то, что
 * ломается при следующем разборе.
 */
const appSource = (
	readAppShellSourceSync() +
	"\n" +
	readAppLogicSourceSync() +
	"\n" +
	readWebSurfaceSourceSync(["apps/web/src/utils"]) +
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
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8").replace(
	/\r\n/g,
	"\n",
);

/*
 * Источники под именами, которыми их называет таблица закреплённых выражений
 * (scripts/lib/schedule-source-expectations.mjs). Опечатка в имени источника —
 * громкая ошибка, а не проверка по undefined.
 */
const sources = { appSource, scheduleSource, cssSource };

/*
 * РАСХОЖДЕНИЯ СОБИРАЮТСЯ, А НЕ ОБРЫВАЮТ ПРОГОН НА ПЕРВОМ ЖЕ.
 *
 * Страж бросал исключение из первой же непрошедшей проверки, и остальные
 * восемьдесят с лишним не выполнялись вовсе. Замерено 2026-08-10: гейт сообщал
 * «ScheduleView must block incomplete appointment creation», после её починки —
 * «ScheduleView must block invalid appointment edits», то есть один и тот же
 * форматтерный перенос прятался за собственным однотипным соседом, и объём
 * расхождения был виден только по одной итерации на находку.
 *
 * Приём взят у scripts/smoke-core-route-validation.mjs:205-219 (record), новой
 * техники не изобретается. Ни одно утверждение не ослаблено: код возврата
 * по-прежнему ненулевой при любой находке, печатаются ВСЕ находки разом.
 */
const failures = [];

function record(condition, message) {
	if (!condition) failures.push(message);
}

/*
 * Требование принимает и подстроку, и выражение: приём взят из
 * scripts/smoke-web-render-gating-source.mjs:208-216 (sourceHas), новой техники
 * не изобретается. Выражение нужно там, где написание вокруг закрепляемой связи
 * расставляет форматтер.
 */
function requireIn(source, needle, message) {
	const found =
		needle instanceof RegExp ? needle.test(source) : source.includes(needle);
	record(found, message);
}

function forbidIn(source, needle, message) {
	record(!source.includes(needle), message);
}

/*
 * Проверка по общей таблице выражений (scripts/lib/schedule-source-expectations.mjs).
 * Сообщения и предмет проверки не меняются — меняется только то, что выражение
 * живёт одним экземпляром и его же проверяет корпус обратной полярности.
 */
function requireExpectation(key, sources) {
	const expectation = scheduleSourceExpectations[key];
	if (!expectation) throw new Error(`Нет закреплённого выражения «${key}».`);
	const source = sources[expectation.source];
	if (typeof source !== "string")
		throw new Error(
			`Для «${key}» не подан источник «${expectation.source}» — проверка не может ` +
				"сверяться с пустотой.",
		);
	record(expectation.pattern.test(source), expectation.message);
}

/*
 * Дословно требовалось `lazy(() => import("./ScheduleView")` одной строкой.
 * Замерено 2026-08-09: коммит ad8f12499 форматтером разбил вызов надвое —
 * App.tsx:95 держит `lazy(() =>`, перенос, `import("./ScheduleView")`. Раздел
 * грузится лениво как задумано, до правки EXIT=1. `\s*` засчитывает обе формы.
 */
requireIn(
	appSource,
	/lazy\(\(\)\s*=>\s*import\("\.\/ScheduleView"\)/,
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
/*
 * Тот же форматтерный перенос, что и у lazy выше. Замерено 2026-08-09:
 * ScheduleView.tsx:842-847 развернул атрибуты по строкам — `<div` /
 * `className="panel schedule-panel"` / `id="schedule"` / `data-testid=…`.
 * Панель на месте и по-прежнему принадлежит ScheduleView, до правки EXIT=1.
 * `[^>]*` не выпускает поиск за пределы одного открывающего тега, поэтому
 * className и id обязаны стоять на ОДНОМ элементе, а не на соседних.
 */
requireIn(
	scheduleSource,
	/<div\s[^>]*className="panel schedule-panel"[^>]*id="schedule"/,
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
/*
 * Тот же форматтерный перенос. Замерено 2026-08-09: ScheduleView.tsx:599-600
 * вынес аргумент на отдельную строку (`groupAppointmentsByClinicDay(` /
 * `sortedAppointments as DayGroupingAppointment[],`). Группировка по-прежнему
 * получает именно отсортированный список, до правки EXIT=1. Источник аргумента
 * закреплён: подставят другую коллекцию — страж покраснеет.
 */
requireIn(
	scheduleSource,
	/groupAppointmentsByClinicDay\(\s*sortedAppointments\b/,
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
/*
 * `AppHelpers.tsx` — СБОРНИК НА 83 СТРОКИ, ТЕЛО В utils/.
 *
 * Коммит ddd625d59 разнёс помощников по `apps/web/src/utils/` (12+ модулей).
 * Читать один сборник значит сверяться почти с пустотой: `functionBodySource`
 * не найдёт объявления и справедливо упадёт. Берём сборник ВМЕСТЕ с каталогом.
 */
const helpersSource = [
	readFileSync("apps/web/src/AppHelpers.tsx", "utf8"),
	readWebSurfaceSourceSync(["apps/web/src/utils"]),
]
	.join("\n")
	.replace(/\r\n/g, "\n");

requireIn(
	scheduleSource,
	"appointmentScheduleMissingFields(",
	"ScheduleView must delegate appointment readiness to the shared missing-fields rule.",
);
requireIn(
	helpersSource,
	"if (!draft.patientId) {",
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
/*
 * Тот же форматтерный перенос, что и у lazy выше. Замерено 2026-08-10:
 * NewAppointmentForm.tsx:536-539 развернул условие кнопки «Создать запись» по
 * строкам — `disabled={` / `newAppointmentSaveState === "saving" ||` /
 * `!newAppointmentReadyToCreate` / `}`. Замок на месте: готовность считается
 * рядом (NewAppointmentForm.tsx:186 — перечень недостающих полей пуст), а сам
 * перечень даёт общее правило appointmentScheduleMissingFields, у которого есть
 * тест apps/web/src/tests/appointmentMissingFields.test.ts. До правки EXIT=1.
 *
 * Закрепляются ОБА условия и их порядок: и занятость сохранения, и готовность
 * записи. Подставят другое имя или уберут половину — страж покраснеет.
 */
requireIn(
	scheduleSource,
	/disabled=\{\s*newAppointmentSaveState\s*===\s*"saving"\s*\|\|\s*!newAppointmentReadyToCreate\s*\}/,
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
/*
 * Тот же форматтерный перенос. Замерено 2026-08-10: NewAppointmentForm.tsx:541-545
 * развернул тернарник по строкам — `aria-describedby={` /
 * `!newAppointmentReadyToCreate` / `? "new-appointment-create-missing-short"` /
 * `: undefined` / `}`. Кнопка по-прежнему указывает на короткую подсказку о
 * недостающих полях, до правки EXIT=1. Закрепляются и условие, и адрес подсказки.
 */
requireIn(
	scheduleSource,
	/aria-describedby=\{\s*!newAppointmentReadyToCreate\s*\?\s*"new-appointment-create-missing-short"\s*:\s*undefined\s*\}/,
	"New appointment create button must point to missing-field guidance.",
);
requireIn(
	scheduleSource,
	'id="new-appointment-create-missing-short"',
	"Short missing-field summary must stay addressable for the create button.",
);
/*
 * Тот же форматтерный перенос, что и у кнопки создания выше. Замерено
 * 2026-08-10: AppointmentCard.tsx:766-768 развернул условие кнопки «Сохранить
 * запись» по строкам. Замок на месте, до правки EXIT=1.
 */
requireExpectation("appointmentEditLock", sources);
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
/*
 * GUARD_DRIFT (четвёртый класс, разбор — в шапке
 * scripts/lib/schedule-source-expectations.mjs). Замерено 2026-08-10:
 * AppointmentCard.tsx:770-775 обвесил ТУ ЖЕ связку защитой от пустого списка —
 * `(appointmentMissingSteps ?? []).length` вместо `appointmentMissingSteps.length`.
 * Указатель кнопки на подсказку не изменился, до правки EXIT=1.
 */
requireExpectation("appointmentSaveGuidancePointer", sources);
/*
 * GUARD_DRIFT. Замерено 2026-08-10: AppointmentCard.tsx:115 —
 * `${appointment?.id ?? ""}` вместо `${appointment.id}`. Адрес редактора
 * по-прежнему выводится из идентификатора приёма, до правки EXIT=1. Префикс
 * `appointment-editor-` и источник значения закреплены: подставят другое поле —
 * страж покраснеет.
 */
requireExpectation("appointmentEditorIdBinding", sources);
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
record(
	!/dashboard\.activeVisit\.status\s*[!=]==\s*"draft"/.test(scheduleSource),
	"Долг закрыт: ScheduleView снова сверяет статус активного приёма. Верните утверждение " +
		'«ScheduleView must detect rows linked to an open visit» с проверкой status === "draft" ' +
		"и уберите запись из объявленного долга в scripts/smoke-schedule-view-source.mjs.",
);
/*
 * GUARD_DRIFT. Замерено 2026-08-10: AppointmentCard.tsx:573 —
 * `activeVisitLockedAppointmentStatuses?.has?.(status)`. Набор закрывающих
 * статусов и проверяемый в нём аргумент закреплены, до правки EXIT=1.
 */
requireExpectation("terminalStatusDraftLock", sources);
/*
 * GUARD_DRIFT. Замерено 2026-08-10: AppointmentCard.tsx:117-120 обвесил
 * вычисление имени проверкой `typeof patientName === "function"` и защитой
 * аргументов (`dashboard?.patients ?? []`, `appointment?.patientId ?? null`).
 * Имя по-прежнему считается ОДИН раз и из тех же двух источников, до правки
 * EXIT=1. Оба источника аргументов закреплены: подставят чужой список пациентов
 * или чужой идентификатор — страж покраснеет.
 */
requireExpectation("singlePatientNameBinding", sources);
/*
 * ЗАГОЛОВКУ СТРОКИ ДОБАВИЛИ КЛАССЫ ОФОРМЛЕНИЯ. Требование — «в заголовке и в
 * доступных именах действий одно и то же имя пациента» — не изменилось:
 * AppointmentCard.tsx:114 рисует {appointmentPatientName} в <h3>, а строки 98,
 * 163, 175 и 184 подставляют его же в aria-label. Прежний needle требовал <h3>
 * без атрибутов и падал на добавленном className.
 */
/*
 * Тот же форматтерный перенос. Замерено 2026-08-10: AppointmentCard.tsx:163-165
 * перенёс {appointmentPatientName} на свою строку внутри <h3>, а прежний needle
 * требовал «>» вплотную. Заголовок строки по-прежнему рисует ту же привязку,
 * что подставляется в aria-label действий, до правки EXIT=1.
 */
requireExpectation("rowPatientNameRendered", sources);
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
/*
 * Форматтерный перенос ВНУТРИ ТЕКСТА. Замерено 2026-08-10:
 * AppointmentCard.tsx:588-589 перевёл строку между «статусом» и «записи».
 * Текст на экране не изменился — JSX склеивает перенос в пробел, — поэтому
 * пробелы между словами приняты гибко. Сами слова и их порядок закреплены.
 */
requireExpectation("terminalStatusBlockerText", sources);
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
/*
 * Форматтерный перенос. Замерено 2026-08-10: AppointmentCard.tsx:389-393
 * развернул тернарник по строкам. Указатель заблокированного выбора пациента на
 * пояснение о передаче не изменился, до правки EXIT=1.
 */
requireExpectation("lockedPatientSelectorPointer", sources);
/*
 * GUARD_DRIFT плюс перенос. Замерено 2026-08-10: AppointmentCard.tsx:570-575 —
 * `Boolean(activeVisitLockedAppointmentStatuses?.has?.(status))`. Обе половины
 * условия (открытый приём И закрывающий статус) и их конъюнкция закреплены,
 * до правки EXIT=1. Обёртка Boolean объявлена необязательной, потому что она
 * приводит тип, а не меняет правило.
 */
requireExpectation("statusSelectTerminalLock", sources);
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
/*
 * Форматтерный перенос ВНУТРИ ТЕКСТА. Замерено 2026-08-10: ScheduleView.tsx:1102-1103
 * перевёл строку между «относится» и «только». На экране текст прежний.
 */
requireExpectation("adminUnlockScheduleOnlyBoundary", sources);
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
/*
 * Форматтерный перенос ВНУТРИ ТЕКСТА. Замерено 2026-08-10: ScheduleView.tsx:1126-1127
 * перевёл строку между «при» и «сохранении». Формулировка не изменилась ни на
 * слово — а она здесь несущая, см. разбор выше про удалённую ложь.
 */
requireExpectation("adminUnlockedWording", sources);
/*
 * Запрет привязан к РАЗМЕТКЕ, а не к упоминанию. В ScheduleView.tsx:851-856
 * лежит комментарий, который цитирует удалённую строку и объясняет, почему она
 * была ложью, — этот комментарий нужен и падать на нём нельзя. Поэтому ловится
 * только текст, стоящий в JSX или в строковом литерале: перед ним «>», кавычка
 * или обратная кавычка. В комментарии перед фразой стоит «, и он не совпадает.
 */
record(
	!/[>"'`]Админ-доступ активен/.test(scheduleSource),
	"Schedule must not claim admin access is active: the secret is never verified before a save.",
);
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
/* Тот же перенос между «относится» и «только» (ScheduleView.tsx:1102-1103). */
requireExpectation("adminUnlockedDomainSeparation", sources);
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
record(
	!scheduleSource.includes('data-testid="schedule-empty-state"') &&
		!scheduleSource.includes('className="schedule-empty-state"'),
	"Долг закрыт: у пустого состояния расписания снова есть адрес. Верните утверждение " +
		"«ScheduleView must render an addressable empty state» и уберите запись из " +
		"объявленного долга в scripts/smoke-schedule-view-source.mjs.",
);

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
/*
 * FORMAT_DRIFT в CSS: отступ сменился с двух пробелов на табуляцию, прежний
 * needle требовал ровно "\n  ". Замерено 2026-08-10: index.css:18007-18008 —
 * оба селектора по-прежнему в ОДНОМ правиле, то есть схлопываются вместе, что и
 * составляет предмет проверки.
 */
requireExpectation("shiftSummaryGridCollapse", sources);
/*
 * FORMAT_DRIFT в CSS: прежний needle требовал ровно четыре пробела перед
 * align-items. Замерено 2026-08-10: main.css:14165-14166 — правило на месте, с
 * табуляцией. Проверяется та же пара «селектор + объявление».
 */
requireExpectation("emptyStateMobileStack", sources);
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
/*
 * OWNER_MOVED: ПРОВЕРКА ДАТ УЕХАЛА ВНУТРЬ ОБЩЕГО ПРАВИЛА.
 *
 * Требовалось имя `appointmentScheduleDateMissingSteps` в склейке логики
 * приложения. Замерено 2026-08-10: в склейке (App.tsx + useAppLogic.tsx +
 * hooks/domains/*) этого имени нет ВОВСЕ — не переформатировано, а отсутствует.
 * `\s*` тут бесполезен, это тот же класс, что разобран в шапке
 * scripts/smoke-web-code-split-source.mjs.
 *
 * Куда уехало: AppHelpers.tsx:4402 объявляет разбор дат, а AppHelpers.tsx:4482
 * вызывает его ПОСЛЕДНЕЙ строкой внутри appointmentScheduleMissingFields. То
 * есть даты проверяются у каждого, кто зовёт общее правило, и отдельно называть
 * их расписанию больше не нужно.
 *
 * Поэтому проверяется свойство — ДОСТИЖИМОСТЬ проверки дат из общего правила, —
 * и обе половины обязательны:
 *   1. разбор дат объявлен и остаётся собственной функцией (иначе правило
 *      «даты проверяются» растворится в теле и потеряет свой тест);
 *   2. общее правило ВЫЗЫВАЕТ его в своём теле. Область сужается счётом скобок
 *      через functionBodySource — «нашлось где-то в файле» за «нашлось в общем
 *      правиле» не засчитывается, а потерянное объявление даёт громкую ошибку
 *      вместо тихой пустой строки (см. шапку scripts/lib/function-body-source.mjs).
 *
 * Вторая половина связи — что расписание зовёт общее правило — уже закреплена
 * отдельным утверждением «ScheduleView must delegate appointment readiness to the
 * shared missing-fields rule» выше. Вместе они дают ту же цепь, что раньше
 * доказывалась одним именем в App.tsx.
 */
requireIn(
	helpersSource,
	"export function appointmentScheduleDateMissingSteps(",
	"App.tsx must validate appointment dates before schedule mutations.",
);
record(
	functionBodySource(
		helpersSource,
		"export function appointmentScheduleMissingFields(",
		"общее правило «чего не хватает записи»",
	).includes("appointmentScheduleDateMissingSteps("),
	"App.tsx must validate appointment dates before schedule mutations.",
);
requireIn(
	appSource,
	"appointmentScheduleMissingFields",
	"App.tsx must validate required appointment fields before schedule mutations.",
);
/*
 * УСТАРЕВШЕЕ ТРЕБОВАНИЕ: продукт ушёл от двухаргументного вызова ОСОЗНАННО, и
 * приведение его «в соответствие» было бы регрессией. Разбор и причина — над
 * sharedRequiredFieldHelperCall в scripts/lib/schedule-source-expectations.mjs.
 * Коротко: у общего правила появились состав смены и ресурсы клиники, и только
 * они позволяют сказать «в клинике ещё нет пациентов» вместо невыполнимого
 * «выберите пациента» при пустом списке. Закрепляется нынешний контракт.
 */
requireExpectation("sharedRequiredFieldHelperCall", sources);
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
record(
	looseDraftTypingCount <= LOOSE_DRAFT_TYPING_DEBT,
	`Потеря типов расползается: «Record<string, any>» в вынесенных компонентах расписания ` +
		`стало ${looseDraftTypingCount} вместо объявленных ${LOOSE_DRAFT_TYPING_DEBT}. ` +
		"Черновик приёма обязан носить тип AppointmentScheduleDraft.",
);
record(
	looseDraftTypingCount >= LOOSE_DRAFT_TYPING_DEBT,
	`Долг закрыт: «Record<string, any>» в вынесенных компонентах расписания осталось ` +
		`${looseDraftTypingCount}. Уберите запись из объявленного долга в ` +
		"scripts/smoke-schedule-view-source.mjs и распространите запрет на " +
		"components/schedule/*.tsx.",
);

if (failures.length > 0) {
	console.error(
		`Расписание разошлось с закреплённым контрактом: ${failures.length} расхождений.\n`,
	);
	for (const failure of failures) console.error(`  - ${failure}`);
	process.exit(1);
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
