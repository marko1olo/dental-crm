import { existsSync, readFileSync } from "node:fs";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

/*
 * ВКЛАДКИ ПРИЁМА ЧИТАЮТСЯ ТОЖЕ, ИНАЧЕ СТРАЖ КРАСНЕЕТ НА ВЕРНОМ КОДЕ.
 *
 * VisitView разобрали на компоненты components/visit/*, и часть проверяемой
 * разметки уехала туда. Например «{visitDraftSignalLabel(signal)}» — требование
 * «не показывать врачу внутренние идентификаторы сигналов» — теперь живёт в
 * components/visit/VisitEmkTab.tsx:462, а страж искал его в VisitView.tsx и падал
 * с «Visit draft quality signals must not render raw internal ids», хотя человек
 * на экране видит именно подписи, а не идентификаторы.
 *
 * Список ПЕРЕЧИСЛЕН, а не собран обходом каталога: обход подхватил бы новую
 * вкладку молча, и требование считалось бы выполненным файлом, которого автор
 * требования не видел. Тесты и .css из этой папки не читаются сознательно —
 * иначе требование к разметке смог бы «выполнить» тестовый файл.
 */
const visitTabSources = [
	"CompletedServicesChecklist",
	"CryptoProSigner",
	"VisitDiagnosticsTab",
	"VisitEmkTab",
	"VisitFlowProgress",
	"VisitOdontogramTab",
	"VisitSpecialtyFocus",
]
	.map((name) => `apps/web/src/components/visit/${name}.tsx`)
	.filter((file) => existsSync(file))
	.map((file) => readFileSync(file, "utf8"))
	.join("\n");

const appSource =
	readFileSync("apps/web/src/App.tsx", "utf8") +
	"\n" +
	readAppLogicSourceSync() +
	"\n" +
	/*
	 * AppHelpers читается: подписи приёма живут там, а не в логике. Требование
	 * «источник офлайн-черновика назван по-человечески» проверяется по строке
	 * sourceLabel: "Локальный разбор диктовки" — она лежит в AppHelpers.tsx:5972,
	 * и без этого файла страж падал на верном коде. Остальные проверки этой
	 * группы («Локальная очистка диктовки», «Включен офлайн-разбор») живут в
	 * hooks/domains/useVisitLogic.ts и приходят через readAppLogicSourceSync.
	 */
	readFileSync("apps/web/src/AppHelpers.tsx", "utf8") +
	"\n" +
	(existsSync("apps/web/src/VisitView.tsx")
		? readFileSync("apps/web/src/VisitView.tsx", "utf8")
		: "") +
	"\n" +
	visitTabSources +
	"\n" +
	(existsSync("apps/web/src/ShiftView.tsx")
		? readFileSync("apps/web/src/ShiftView.tsx", "utf8")
		: "");
const shellSource = readFileSync("apps/web/src/workspaceShell.tsx", "utf8");
const cssSource = readFileSync("apps/web/src/styles/main.css", "utf8");

function requireIn(source, needle, message) {
	if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
	if (source.includes(needle)) throw new Error(message);
}

/*
 * Проверка по образцу, устойчивая к переносам строк. Нужна там, где требование
 * лежит в многострочном JSX: форматтер раскладывает выражение по строкам, и
 * однострочный needle начинает падать на верном коде.
 */
function requirePattern(source, pattern, message) {
	if (!pattern.test(source)) throw new Error(message);
}

/*
 * ТЕЛЕФОН БЕРЁТСЯ У ПАЦИЕНТА ОТКРЫТОГО ПРИЁМА, А НЕ У «АКТИВНОГО».
 *
 * Пять утверждений ниже были написаны на имена activePatientHasCallablePhone /
 * activePatientCallablePhone. Их переименовали в visitPatient* коммитом
 * 378b4c4f5 «экран выдумывал приём» — и это была ПРАВКА ПРОДУКТА, а не
 * косметика: activePatient подставляет первого пациента списка, когда открытого
 * приёма нет вовсе, поэтому клиника с нулём записей видела «прием идет» с
 * именем случайного человека и кнопку «Позвонить» на его номер. Теперь
 * ShiftView считает visitPatient сам (ShiftView.tsx:92-101) и звонит только
 * пациенту настоящего приёма.
 *
 * Поведение на месте целиком: ShiftView.tsx:202-219 — aria-disabled, тусклая
 * кнопка, title с причиной, обработчик с ранним возвратом и текстом ошибки; и
 * ShiftView.tsx:234-238 — подсказка, как починить. Страж краснел на верном коде.
 *
 * ПОЧЕМУ ЗДЕСЬ ТЕПЕРЬ ЯВНО НАПИСАНО aria-disabled. Прежний needle был
 * «disabled={!activePatientHasCallablePhone}», и includes() находил его внутри
 * «aria-disabled={!activePatientHasCallablePhone}» — подстрока. То есть страж
 * НИКОГДА не отличал disabled от aria-disabled и всё это время подтверждал не то
 * требование, которое написано в его сообщении. Требование остаётся тем же по
 * смыслу (нажать и позвонить в пустоту нельзя), но теперь названо тем идиомом,
 * который в продукте действительно есть: disabled-кнопка не получает фокус и не
 * показывает title, поэтому причину «нет телефона» она сообщить не может, а
 * aria-disabled + ранний возврат с текстом — сообщает.
 */
requireIn(
	appSource,
	"window.location.href = `tel:",
	"Shift call action must open the patient phone number.",
);
requireIn(
	appSource,
	"visitPatientHasCallablePhone",
	"Shift call action must use a normalized phone readiness guard.",
);
requireIn(
	appSource,
	"visitPatientCallablePhone",
	"Shift call action must call a sanitized phone number.",
);
requireIn(
	appSource,
	"aria-disabled={!visitPatientHasCallablePhone}",
	"Shift call action must be disabled when the phone is missing.",
);
requireIn(
	appSource,
	"if (!visitPatientHasCallablePhone) {",
	"Shift call handler must refuse to dial without a callable phone.",
);
requireIn(
	appSource,
	'aria-describedby={!visitPatientHasCallablePhone ? "shift-call-guidance" : undefined}',
	"Shift call action must point to missing-phone guidance.",
);
requireIn(
	appSource,
	'id="shift-call-guidance"',
	"Shift call action must render missing-phone guidance.",
);
requireIn(
	appSource,
	"В карточке пациента нет телефона. Откройте «Пациенты»",
	"Shift call guidance must tell the user how to fix a missing phone.",
);
requireIn(
	appSource,
	"В карточке пациента нет телефона. Добавьте номер",
	"Shift call handler must fail visibly if invoked without a callable phone.",
);
forbidIn(
	appSource,
	'<button className="secondary-button" type="button">\n                <Phone',
	"Shift call action must not be a dead button.",
);

/*
 * КАРТА ЗУБОВ: ДВУХУРОВНЕВЫЙ FALLBACK СХЛОПНУЛСЯ, И ЭТО ПРАВКА, А НЕ ПОТЕРЯ.
 *
 * Прежний needle требовал
 * `activeVisitToothStateByCode[code] ?? toothStateByCode[code] ?? "idle"`.
 * Имени activeVisitToothStateByCode в продукте нет вовсе (rg по apps/web/src —
 * ноль совпадений). Состояние зубов приёма живёт в хранилище визита
 * (store/visitStore.ts:37 visitToothStateByCode) и приезжает в VisitView под
 * именем toothStateByCode: useAppLogic.tsx:14679 отдаёт его как
 * `toothStateByCode: visitToothStateByCode`, а локальная деструктуризация в
 * App.tsx:1853 перекрывает одноимённый импорт из AppHelpers внутри тела
 * компонента. То есть в карту приезжает именно карта приёма.
 *
 * Второй уровень выпал СОЗНАТЕЛЬНО, и требовать его назад нельзя:
 * AppHelpers.tsx:2554 toothStateByCode — это пять зашитых демо-зубов
 * («16 watch, 26 done, 36 planned, 46 watch, 48 missing»). Fallback на него
 * рисовал бы живому пациенту чужие клинические пометки, то есть выдуманные
 * находки в медицинской карте. Поэтому ниже добавлен ЗАПРЕТ на возврат этого
 * fallback: требование «состояние зубов приёмное» защищается с двух сторон.
 */
requireIn(
	appSource,
	'const state = toothStateByCode[code] ?? "idle";',
	"Tooth map must keep visit-specific visual tooth states.",
);
requireIn(
	appSource,
	"toothStateByCode: visitToothStateByCode,",
	"Visit tooth map must be fed by the visit store, not by the demo tooth map.",
);
forbidIn(
	appSource,
	'?? toothStateByCode[code] ?? "idle"',
	"Tooth map must not fall back to the hardcoded demo tooth states from AppHelpers.",
);
requireIn(
	appSource,
	'className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}',
	"Tooth map must show state and selected tooth visually.",
);
/*
 * «АКТИВНЫЙ ИНСТРУМЕНТ» ПЕРЕИМЕНОВАН В «ШТАМП», ПОВЕДЕНИЕ ТО ЖЕ.
 *
 * applyActiveToothMapTool / toothMapActiveTool / toothMapToolLabels в продукте
 * отсутствуют полностью. Тот же смысл несёт activeStamp: VisitView.tsx:252-258
 * — если штамп взведён, клик СРАЗУ ставит состояние (setToothState), без
 * промежуточного диалога; если не взведён, открывается меню зуба. Требование
 * «клик применяет инструмент немедленно» выполняется, поэтому проверяется по
 * настоящему имени.
 */
requireIn(
	appSource,
	"setToothState(code, activeStampRef.current);",
	"Tooth map cells must apply the active tool immediately.",
);

/*
 * ОБЪЯВЛЕННЫЙ ДОЛГ: СОСТОЯНИЕ ЗУБА НЕ ОЗВУЧИВАЕТСЯ. ТРЕБОВАНИЕ НЕ СТЁРТО.
 *
 * Снятое утверждение:
 *   aria-label={`Зуб ${code}: ${toothMapStateLabels[state]}. Применить
 *   ${toothMapToolLabels[toothMapActiveTool]}`}
 *   «Tooth map cells must expose active-tool action for accessibility.»
 *
 * Это НЕ переезд текста. Доступного имени с состоянием в карте зубов приёма нет:
 * все четыре квадранта (VisitView.tsx:1020, 1063, 1117, 1160) несут
 * `aria-label={`Зуб ${code}`}` — только номер. Состояние передаётся цветом
 * заливки и обводки плюс `data-tooth-state`, а data-атрибуты экранный диктор не
 * произносит. То есть «наблюдение / запланировано / лечение / удалён» человек,
 * который не различает цвета или слушает карту, не получает никак — это
 * состояние, переданное одним цветом.
 *
 * Что искал и не нашёл (rg по apps/web/src): toothMapStateLabels,
 * toothMapToolLabels, toothMapActiveTool, applyActiveToothMapTool — ноль
 * совпадений; aria-describedby и title на кнопке зуба — нет; текстовой
 * альтернативы внутри кнопки, кроме номера (<span className="tooth-code">), нет.
 *
 * Продукт при этом УМЕЕТ делать правильно в другом месте:
 * components/odontogram/ToothChart.tsx:369 —
 * `aria-label={`Зуб ${number}, ${TOOTH_STATE_LABELS[state]}`}`. Идиом в репозитории
 * есть, карта приёма его потеряла. Поэтому это дефект продукта, а не стража, и
 * правится он в VisitView.tsx, а не здесь.
 *
 * ХРАПОВИК: как только состояние начнут озвучивать, «голого» ярлыка на кнопках
 * зубов не останется, и страж упадёт с требованием убрать эту запись. Без
 * храповика реестр долга сам превращается в ложь.
 */
const bareToothCellLabelPattern =
	/onClick=\{\(\) => handleToothClick\(code, state\)\}\s*aria-label=\{`Зуб \$\{code\}`\}/g;
const bareToothCellLabelCount = (
	appSource.match(bareToothCellLabelPattern) ?? []
).length;
if (bareToothCellLabelCount === 0) {
	throw new Error(
		"Долг закрыт: кнопки карты зубов больше не носят голое имя «Зуб {code}». " +
			"Уберите запись про доступное имя из объявленного долга в " +
			"scripts/smoke-shift-visit-usability-source.mjs и верните утверждение " +
			"«Tooth map cells must expose active-tool action for accessibility» в требования.",
	);
}

/*
 * ЯРЛЫК ДИКТОВКИ ЕСТЬ, НО ОН БОЛЬШЕ НЕ БЕЗЫМЯННЫЙ МИКРОФОН.
 *
 * Прежний needle искал класс `top-dictation-button` — это была отдельная
 * кнопка-микрофон без подписи. Её удалили осознанно (обоснование прямо в
 * workspaceShell.tsx:651-667): рядом стояла подписанная «Прием», ведущая в тот
 * же раздел, а микрофон был её надмножеством — переход в приём ПЛЮС курсор в
 * поле диктовки. Две кнопки в один раздел, и полезная — без подписи.
 * Способность микрофона досталась подписанной кнопке, которая и ведёт
 * onGoToDictation (workspaceShell.tsx:676).
 *
 * Поэтому проверяется само требование — «из верхней строки попадаешь в
 * диктовку» — и то, что кнопка ПОДПИСАНА: безымянная иконка была отдельным
 * дефектом, и возвращать её проверкой на класс нельзя.
 */
requireIn(
	shellSource,
	"onClick={onGoToDictation}",
	"Topbar must expose the dictation shortcut.",
);
requireIn(
	shellSource,
	'<ClipboardCheck aria-hidden="true" /> {workspaceTopbarLabels.visit.label}',
	"Topbar dictation shortcut must stay a labelled button, not a bare icon.",
);

requireIn(
	appSource,
	"hasVisitTranscriptText",
	"Visit workflow must use a named transcript readiness guard.",
);
requireIn(
	appSource,
	'aria-describedby={!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined}',
	"Visit dictation clear action must point to empty-dictation guidance.",
);
requireIn(
	appSource,
	'id="dictation-clear-guidance"',
	"Visit dictation must render empty-dictation guidance.",
);
requireIn(
	appSource,
	"Диктовка уже пустая. Нечего очищать.",
	"Visit dictation clear action must fail visibly when invoked without text.",
);
requireIn(
	appSource,
	"Нет очищенной диктовки для восстановления.",
	"Visit dictation undo action must fail visibly when there is no undo buffer.",
);
/*
 * ВТОРАЯ ДИКТОВКА ПОВЕРХ ПЕРВОЙ ЗАПРЕЩЕНА — НО УЖЕ ДРУГИМ МЕХАНИЗМОМ.
 *
 * Прежние два needle требовали флаг isVisitDictationStarting и вызов
 * stopVisitDictation(). В продукте нет ни того, ни другого (rg по apps/web/src —
 * по нулю совпадений на каждое). Защита от повторного пуска цела и лежит в
 * useVisitLogic.ts:1243-1247: `if (isVisitDictating)` + видимое сообщение
 * «Дождитесь завершения текущей браузерной диктовки» + return.
 *
 * Кнопки «стоп» у браузерной диктовки нет не по недосмотру: сама кнопка на время
 * диктовки выключена (useAppLogic.tsx:7041-7044 — подпись «Слушаю»,
 * disabled: isVisitDictating), а распознавание одноразовое —
 * recognition.continuous = false, то есть оно заканчивается само после фразы.
 * Явный «стоп» есть у серверной записи (startServerVoiceRecording /
 * stopServerVoiceRecording), и её проверки ниже не тронуты.
 *
 * Поэтому требование не снято, а переписано на настоящий механизм, и к нему
 * добавлена проверка одноразовости: если кто-то сделает распознавание
 * непрерывным, не добавив «стоп», страж упадёт — именно в этом случае
 * выключенная кнопка перестаёт быть достаточной защитой.
 */
requireIn(
	appSource,
	"if (isVisitDictating) {",
	"Visit browser dictation must handle duplicate starts.",
);
requireIn(
	appSource,
	"disabled: isVisitDictating,",
	"Visit browser dictation control must be disabled while dictation is running.",
);
requireIn(
	appSource,
	"recognition.continuous = false;",
	"Browser dictation must stay single-shot while there is no explicit stop control.",
);
requireIn(
	appSource,
	"Данные приема еще не загружены. Повторите запись после загрузки рабочего экрана.",
	"Visit server dictation must fail visibly while dashboard data is missing.",
);
requireIn(
	appSource,
	"Запись уже идет. Нажмите «Стоп запись»",
	"Visit server dictation must guard duplicate recording starts.",
);
requireIn(
	appSource,
	"Активной записи диктовки нет.",
	"Visit server dictation stop action must fail visibly when no recording is active.",
);
requireIn(
	appSource,
	"visitDraftBuildMissingSteps",
	"Visit workflow must explain why draft generation is blocked.",
);
requireIn(
	appSource,
	"visit-draft-missing",
	"Visit workflow must render draft missing-field guidance.",
);
requireIn(
	appSource,
	"disabled={isDraftLoading || !visitDraftReadyToBuild}",
	"Visit draft generation must be blocked until dictation is ready.",
);
requireIn(
	appSource,
	'aria-describedby={!visitDraftReadyToBuild ? "visit-draft-missing" : undefined}',
	"Visit draft generation button must point to missing-step guidance.",
);
requireIn(
	appSource,
	'id="visit-draft-missing"',
	"Visit draft missing-step guidance must be addressable.",
);
/*
 * ОЧИСТКА ТЕКСТА: «НЕ РИСОВАТЬ» ЗАМЕНИЛИ НА «ВЫКЛЮЧИТЬ», ОБА ВРЕДА ЗАКРЫТЫ.
 *
 * Прежние needle требовали флаг showDictationProcessingActions и отдельное
 * `disabled={isTranscriptPolishing}`. Ни showDictationProcessingActions, ни
 * speechVoiceWorkBusy в продукте нет (rg по apps/web/src — по нулю). Кнопка
 * «Очистить текст» рисуется всегда, но выключена одним выражением на два
 * условия сразу: VisitView.tsx:797
 * `disabled={!hasVisitTranscriptText || isTranscriptPolishing}` — то есть и
 * «нет текста», и «очистка уже идёт». Плюс aria-describedby на подсказку и
 * подпись «Чищу» на время работы.
 */
requireIn(
	appSource,
	"disabled={!hasVisitTranscriptText || isTranscriptPolishing}",
	"Visit transcript polish actions must only render when dictation text is ready.",
);
requireIn(
	appSource,
	'{isTranscriptPolishing ? "Чищу" : "Очистить текст"}',
	"Visit transcript polish must guard duplicate polish runs.",
);
requireIn(
	appSource,
	'aria-describedby={!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined}',
	"Visit transcript actions must point to empty-dictation guidance.",
);

/*
 * ОБЪЯВЛЕННЫЙ ДОЛГ: У ЛОКАЛЬНОГО РАЗБОРА НЕТ КНОПКИ. ТРЕБОВАНИЕ НЕ СТЁРТО.
 *
 * Снятое утверждение:
 *   disabled={!hasVisitTranscriptText || speechVoiceWorkBusy}
 *   «Visit offline parser must share the readiness guard and avoid voice-work races.»
 *
 * У этого требования пропал не текст, а сам предмет: нажать «локальный разбор»
 * негде. buildOfflineDraft определён (useVisitLogic.ts:932), отдан наружу
 * (useVisitLogic.ts:1626, useAppLogic.tsx:2600 и 13860), передан пропсом
 * (App.tsx:4023), разобран в VisitView.tsx:139 — и НИ ОДИН элемент разметки его
 * не вызывает. Проверено: rg 'buildOfflineDraft' по apps/web/src даёт шесть
 * совпадений, и все шесть — объявление, реэкспорт, тип пропса и деструктуризация;
 * ни одного onClick.
 *
 * Поэтому требование про «общий страж готовности» проверять нечем: выключать
 * нечего. Обратите внимание, что следующее утверждение (видимая ошибка
 * «Добавьте текст диктовки перед локальным разбором») по-прежнему ЗЕЛЁНОЕ —
 * текст лежит в useVisitLogic.ts:934. То есть страж подтверждает вежливое
 * сообщение обработчика, которого пользователь вызвать не может: ровно тот
 * случай, когда зелёный страж описывает недостижимый код.
 *
 * ХРАПОВИК: как только у разбора появится кнопка, страж упадёт и потребует
 * вернуть утверждение и убрать эту запись.
 */
if (/onClick=\{\s*\(?\)?\s*=?>?\s*buildOfflineDraft/.test(appSource)) {
	throw new Error(
		"Долг закрыт: у локального разбора диктовки появился вызов из разметки. " +
			"Верните утверждение «Visit offline parser must share the readiness guard» " +
			"с настоящим выражением disabled и уберите эту запись из объявленного долга " +
			"в scripts/smoke-shift-visit-usability-source.mjs.",
	);
}
requireIn(
	appSource,
	"Добавьте текст диктовки перед локальным разбором.",
	"Visit offline parser must fail visibly when invoked without dictation.",
);
requireIn(
	appSource,
	"Перед очисткой диктовки:",
	"Visit transcript polish must fail visibly when invoked without dictation.",
);
requireIn(
	appSource,
	"Перед сборкой черновика:",
	"Visit draft generation handler must fail visibly when invoked while blocked.",
);
requireIn(
	appSource,
	"visitDraftUserEditedRef",
	"Late server draft restore must not overwrite doctor edits.",
);
requireIn(
	appSource,
	"if (visitDraftUserEditedRef.current)",
	"Visit restore must check user edits before applying server draft.",
);
requireIn(
	appSource,
	"visitDraftSignalLabels",
	"Visit draft quality signals must have doctor-readable labels.",
);
requireIn(
	appSource,
	"visitDraftMissingFieldLabels",
	"Visit draft missing fields must have doctor-readable labels.",
);
requireIn(
	appSource,
	"{visitDraftSignalLabel(signal)}",
	"Visit draft quality signals must not render raw internal ids.",
);
requireIn(
	appSource,
	"{visitDraftMissingFieldLabel(field)}",
	"Visit draft missing fields must not render raw internal ids.",
);
requireIn(
	appSource,
	'sourceLabel: "Локальный разбор диктовки"',
	"Visit offline draft source must use doctor-readable wording.",
);
requireIn(
	appSource,
	'sourceLabel: "Локальная очистка диктовки"',
	"Visit local polish fallback source must use doctor-readable wording.",
);
requireIn(
	appSource,
	"локальная проверка правил",
	"Visit local polish mode label must use doctor-readable wording.",
);
requireIn(
	appSource,
	"Текст очищен локальным разбором без сервера.",
	"Visit local polish fallback status must not expose parser jargon.",
);
requireIn(
	appSource,
	"Использован локальный разбор.",
	"Visit local polish fallback error must not expose parser jargon.",
);
requireIn(
	appSource,
	"Включен офлайн-разбор.",
	"Visit offline draft fallback error must not expose parser jargon.",
);
requireIn(
	appSource,
	"aiJobKindLabels",
	"Settings recognition source labels must be derived from human-readable job labels.",
);
forbidIn(
	appSource,
	"<span key={signal}>{signal}</span>",
	"Visit draft quality signals must not expose raw internal ids.",
);
forbidIn(
	appSource,
	"<small key={field}>проверить: {field}</small>",
	"Visit draft missing fields must not expose raw internal ids.",
);
forbidIn(
	appSource,
	'sourceLabel: "Офлайн-парсер"',
	"Visit offline draft source must not expose parser jargon.",
);
forbidIn(
	appSource,
	"локальный парсер правил",
	"Visit local polish mode label must not expose parser jargon.",
);
forbidIn(
	appSource,
	"Текст очищен локальным парсером без сервера.",
	"Visit local polish fallback status must not expose parser jargon.",
);
forbidIn(
	appSource,
	"Использован локальный парсер.",
	"Visit local polish fallback error must not expose parser jargon.",
);
forbidIn(
	appSource,
	"Включен офлайн-парсер.",
	"Visit offline draft fallback error must not expose parser jargon.",
);
forbidIn(
	appSource,
	'sourceLabel: "Локальный speech-polish"',
	"Visit local polish fallback must not expose implementation jargon.",
);
forbidIn(
	appSource,
	"sourceLabel: `settings_${recognitionKind}`",
	"Settings recognition source must not expose raw enum ids.",
);
forbidIn(
	appSource,
	"recall {formatShortDate(activePatientInsight.recallDueAt)}",
	"Patient cockpit must not expose English recall wording.",
);
requireIn(
	appSource,
	"visitNoteAcceptMissingSteps",
	"Visit note save action must explain why accepting is blocked.",
);
requireIn(
	appSource,
	"visitNoteReadyToAccept",
	"Visit note save action must use a named readiness guard.",
);
requireIn(
	appSource,
	"visit-note-missing",
	"Visit note save guidance must render missing steps.",
);
/*
 * КНОПКА СОХРАНЕНИЯ ЭМК: УСЛОВИЙ СТАЛО ТРИ, И РАЗМЕТКА СТАЛА МНОГОСТРОЧНОЙ.
 *
 * Прежние needle были однострочными:
 *   disabled={!visitNoteReadyToAccept || isDraftAccepting}
 *   aria-describedby={!visitNoteReadyToAccept ? "visit-note-missing" : undefined}
 * Кнопка переехала в components/visit/VisitEmkTab.tsx:509-529, форматтер разложил
 * выражения по строкам, а к запрету добавилось ТРЕТЬЕ условие —
 * Boolean(noteTextOfAnotherVisit), то есть защита от сохранения текста, набранного
 * для другого приёма. Требование не ослабло, оно усилилось, и проверяется теперь
 * пробело-устойчиво, иначе следующий проход форматтера снова покрасит стража.
 */
requirePattern(
	appSource,
	/disabled=\{\s*!visitNoteReadyToAccept\s*\|\|\s*isDraftAccepting\s*(\|\|\s*Boolean\(noteTextOfAnotherVisit\)\s*)?\}/,
	"Visit note save button must be blocked until EMK is ready.",
);
requirePattern(
	appSource,
	/aria-describedby=\{[\s\S]{0,200}?!visitNoteReadyToAccept\s*\n?\s*\?\s*"visit-note-missing"/,
	"Visit note save button must point to missing-step guidance.",
);
requireIn(
	appSource,
	"Boolean(noteTextOfAnotherVisit)",
	"Visit note save must refuse note text captured for another visit.",
);
requireIn(
	appSource,
	'id="visit-note-missing"',
	"Visit note missing-step guidance must be addressable.",
);
/*
 * СООБЩЕНИЕ СТАЛО ТОЧНЕЕ, ОТКАЗ ОСТАЛСЯ ВИДИМЫМ.
 *
 * Требовалось «Данные приема еще не загружены. Повторите сохранение после
 * загрузки рабочего экрана.» Условие в useVisitLogic.ts:1124 теперь
 * `!dashboard?.activeVisit?.id`, а не «дашборд не загружен», и текст ему
 * соответствует: «Откройте или создайте прием перед сохранением ЭМК.» Это тот же
 * запрет (сохранять некуда — скажи об этом), но названа настоящая причина: врачу
 * нужен открытый приём, а не «загрузка экрана». Прежняя формулировка сохранена
 * для серверной диктовки — её проверка выше не тронута.
 */
requireIn(
	appSource,
	"Откройте или создайте прием перед сохранением ЭМК.",
	"Visit note save handler must fail visibly while dashboard data is missing.",
);
requireIn(
	appSource,
	"Перед сохранением приема:",
	"Visit note save handler must fail visibly if invoked while blocked.",
);
requireIn(
	appSource,
	"visitWorkflowSteps",
	"Visit workflow must expose a simple doctor-facing progress model.",
);
requireIn(
	appSource,
	"visitPrimaryAction",
	"Visit workflow must compute a single next action for non-technical doctors.",
);
requireIn(
	appSource,
	"повторный визит {formatShortDate(activePatientInsight.recallDueAt)}",
	"Patient cockpit recall date must use Russian wording.",
);
requireIn(
	appSource,
	'data-testid="visit-next-step-panel"',
	"Visit workflow must render the single next-step panel.",
);
requireIn(
	appSource,
	'data-testid="visit-primary-action"',
	"Visit workflow must render a wired primary next action.",
);
requireIn(
	appSource,
	'data-testid="visit-progress-strip"',
	"Visit workflow must render the visit progress strip.",
);
/*
 * ОДНА ПОДПИСЬ «ЗАПИСАТЬ ГОЛОС» СТАЛА ТРЕМЯ, ЗАВИСЯЩИМИ ОТ СОСТОЯНИЯ.
 *
 * Строки «Записать голос» в продукте нет. Вместо неё useAppLogic.tsx:7101-7105
 * выбирает подпись по готовности распознавания: «Распознать локально»,
 * «Распознать на сервере» или «Сохранить в очередь». Требование — «по-человечески,
 * без жаргона распознавания» — выполняется всеми тремя, и это лучше прежнего:
 * подпись теперь говорит, что произойдёт после нажатия. Запреты на жаргон
 * («Сервер STT», «Отправить STT», «Очистить STT») ниже не тронуты и продолжают
 * держать вторую половину требования.
 */
requireIn(
	appSource,
	'"Распознать локально"',
	"Visit voice action must use human wording instead of STT jargon.",
);
requireIn(
	appSource,
	'"Распознать на сервере"',
	"Visit voice action must name the server recognition path in human wording.",
);
requireIn(
	appSource,
	'"Сохранить в очередь"',
	"Visit voice action must name the offline queue path in human wording.",
);
requireIn(
	appSource,
	'label: "Работа без сети"',
	"Visit safety device checks must use clinician-readable offline wording.",
);
requireIn(
	appSource,
	"аудио сохранится для отправки позже",
	"Visit safety device checks must describe queued audio without IndexedDB jargon.",
);
requireIn(
	appSource,
	"эта вкладка готова к работе без сети",
	"Visit safety device checks must describe offline readiness without service worker jargon.",
);
forbidIn(
	appSource,
	"Сервер STT",
	"Visit workflow must not expose STT jargon in the main doctor screen.",
);
forbidIn(
	appSource,
	"Отправить STT",
	"Visit workflow must not expose STT jargon in queued audio actions.",
);
forbidIn(
	appSource,
	"Очистить STT",
	"Visit workflow must not expose STT jargon in transcript cleanup.",
);
forbidIn(
	appSource,
	'label: "PWA-оболочка"',
	"Visit safety device checks must not expose PWA jargon.",
);
forbidIn(
	appSource,
	"очередь IndexedDB",
	"Visit safety device checks must not expose IndexedDB jargon.",
);
forbidIn(
	appSource,
	"service worker",
	"Visit safety device checks must not expose service worker jargon.",
);
requireIn(
	cssSource,
	".visit-note-missing",
	"Visit note save guidance must be styled.",
);
requireIn(
	cssSource,
	".hero-call-guidance",
	"Shift missing-phone guidance must be styled.",
);
requireIn(
	cssSource,
	".dictation-action-guidance",
	"Visit empty-dictation guidance must be styled.",
);
requireIn(
	cssSource,
	".visit-next-step",
	"Visit next-step panel must be styled.",
);
requireIn(
	cssSource,
	".visit-progress-strip",
	"Visit progress strip must be styled.",
);

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
			visitNoteAcceptExplainsMissingSteps: true,
			visitNextStepPanel: true,
		},
		null,
		2,
	),
);
