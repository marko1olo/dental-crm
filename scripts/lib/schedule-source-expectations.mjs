/**
 * schedule-source-expectations.mjs — закрепляемые связки расписания, устойчивые
 * к форматтеру и к защитным guard-ам.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ РЕГУЛЯРКИ ПО МЕСТУ. Корпус обратной полярности
 * обязан проверять ТЕ ЖЕ выражения, которыми судит гейт. Копия выражения в
 * проверочном скрипте доказывает свойства копии и расходится с оригиналом на
 * первой же правке — этот репозиторий уже наступал на расходящиеся копии
 * (см. шапку scripts/lib/source-tree.mjs). Поэтому выражения живут одним
 * экземпляром здесь: их импортирует и scripts/smoke-schedule-view-source.mjs,
 * и корпус.
 *
 * ДВА КЛАССА РАСХОЖДЕНИЯ, ИЗ-ЗА КОТОРЫХ ПОДСТРОКИ ПЕРЕСТАЛИ РАБОТАТЬ.
 * Замерено 2026-08-10 на 16 разошедшихся утверждениях этого гейта.
 *
 * 1. FORMAT_DRIFT — biome разложил связку по строкам. Следы все на месте,
 *    сломано только написание. Лечится `\s*` / `\s+` между лексемами.
 *
 * 2. GUARD_DRIFT — четвёртый класс, которого не было в разборе. Продукт обвесил
 *    ТУ ЖЕ САМУЮ связку защитой от пустых данных: `appointment.id` стал
 *    `appointment?.id ?? ""`, `set.has(x)` стал `Boolean(set?.has?.(x))`,
 *    `steps.length` стал `(steps ?? []).length`. Это не перенос строки (`\s*`
 *    не помогает: между лексемами появились НОВЫЕ лексемы), не переезд владельца
 *    (сущность лежит в том же файле и в той же строке) и не устаревшее
 *    требование (требование по-прежнему верно, продукт по-прежнему его
 *    выполняет — просто аккуратнее). Лечится тем, что guard объявляется
 *    НЕОБЯЗАТЕЛЬНЫМ: `\??\.`, `(?:Boolean\(\s*)?`, `(?:\s*\?\?\s*\[\]\s*\))?`.
 *    Несущие имена и логическая форма при этом закреплены жёстко — подстановка
 *    другого имени, потеря половины условия или инверсия отрицания краснеют.
 *
 * Каждое выражение обязано принимать И нынешнюю запись, И прежнюю однострочную,
 * и обязано краснеть на осмысленных подделках. Корпус числами — в
 * .agents/fe-schedule-v2/PROGRESS.md.
 */

/** Ссылка на кресло/пациента/статус, допускающая необязательный `?.`. */
const optionalChain = String.raw`\??\.`;

export const scheduleSourceExpectations = {
	/* --- FORMAT_DRIFT: связка развёрнута по строкам ------------------------- */

	appointmentEditLock: {
		source: "scheduleSource",
		message: "ScheduleView must block invalid appointment edits.",
		pattern:
			/disabled=\{\s*appointmentSaveState\s*===\s*"saving"\s*\|\|\s*!appointmentReadyToSave\s*\}/,
	},

	rowPatientNameRendered: {
		source: "scheduleSource",
		message:
			"Schedule appointment rows must render the same patient name used by accessible actions.",
		pattern: /\{appointmentPatientName\}\s*<\/h3>/,
	},

	terminalStatusBlockerText: {
		source: "scheduleSource",
		message:
			"Schedule editor must explain the active-visit terminal status blocker.",
		pattern:
			/закройте\s+прием\s+перед\s+закрывающим\s+статусом\s+записи/,
	},

	lockedPatientSelectorPointer: {
		source: "scheduleSource",
		message:
			"Locked active-visit patient selector must point to handoff guidance.",
		pattern:
			/aria-describedby=\{\s*appointmentHasOpenVisit\s*\?\s*appointmentHandoffNoteId\s*:\s*undefined\s*\}/,
	},

	adminUnlockScheduleOnlyBoundary: {
		source: "scheduleSource",
		message: "Schedule admin unlock must state the schedule-only access boundary.",
		pattern:
			/Секрет\s+хранится\s+только\s+до\s+перезагрузки\s+страницы\s+и\s+относится\s+только\s+к\s+расписанию\./,
	},

	adminUnlockedWording: {
		source: "scheduleSource",
		message: "Schedule admin unlocked state must use clinic-readable wording.",
		pattern:
			/Секрет\s+запомнен\s+до\s+перезагрузки\s+страницы\.\s*Он\s+подставляется\s+при\s+сохранении\s+записи\s+—\s+верен\s+он\s+или\s+нет,\s+покажет\s+само\s+сохранение\./,
	},

	adminUnlockedDomainSeparation: {
		source: "scheduleSource",
		message: "Schedule unlocked state must keep other access domains separate.",
		pattern: /относится\s+только\s+к\s+расписанию/,
	},

	/*
	 * CSS: отступ сменился с пробелов на табуляцию, селекторы те же. Проверяется
	 * то же самое свойство — что оба селектора сидят в ОДНОМ правиле и потому
	 * схлопываются вместе.
	 */
	shiftSummaryGridCollapse: {
		source: "cssSource",
		message:
			"Schedule shift summary grid must collapse with schedule filters on mobile.",
		pattern: /\.schedule-shift-summary-grid,\s*\.schedule-filter-strip\b/,
	},

	emptyStateMobileStack: {
		source: "cssSource",
		message: "Schedule empty state must stack safely on mobile.",
		pattern: /\.schedule-empty-state\s*\{\s*align-items:\s*stretch;/,
	},

	/* --- GUARD_DRIFT: та же связка под защитой от пустых данных ------------- */

	appointmentSaveGuidancePointer: {
		source: "scheduleSource",
		message: "Appointment save button must point to missing-field guidance.",
		pattern: new RegExp(
			String.raw`aria-describedby=\{\s*!appointmentReadyToSave\s*&&\s*\(?\s*appointmentMissingSteps(?:\s*\?\?\s*\[\]\s*\))?\s*\.length\s*\?\s*appointmentSaveMissingId\s*:\s*undefined\s*\}`,
		),
	},

	appointmentEditorIdBinding: {
		source: "scheduleSource",
		message:
			"ScheduleView must create a stable editor id for each appointment row.",
		pattern: new RegExp(
			String.raw`const appointmentEditorId\s*=\s*` +
				"`" +
				String.raw`appointment-editor-\$\{appointment${optionalChain}id[^}]*\}` +
				"`" +
				String.raw`;`,
		),
	},

	terminalStatusDraftLock: {
		source: "scheduleSource",
		message:
			"ScheduleView must block terminal status drafts while the visit is open.",
		pattern: new RegExp(
			String.raw`activeVisitLockedAppointmentStatuses${optionalChain}has\??\.?\(\s*status\s*\)`,
		),
	},

	statusSelectTerminalLock: {
		source: "scheduleSource",
		message:
			"Active-visit appointment status select must block terminal status options.",
		pattern: new RegExp(
			String.raw`disabled=\{\s*appointmentHasOpenVisit\s*&&\s*(?:Boolean\(\s*)?activeVisitLockedAppointmentStatuses${optionalChain}has\??\.?\(\s*status\s*\)`,
		),
	},

	singlePatientNameBinding: {
		source: "scheduleSource",
		message:
			"ScheduleView must compute one appointment patient name for row text and accessible actions.",
		/*
		 * Проверка `typeof patientName === "function"` закреплена ЯВНО, а не
		 * проглатывается разделителем. Замерено 2026-08-10 корпусом обратной
		 * полярности: прежнее выражение держало между объявлением и вызовом
		 * `[\s\S]{0,120}?`, и подмена `===` на `!==` проходила насквозь. А это
		 * не косметика — при инверсии ветки меняются местами: когда `patientName`
		 * ЯВЛЯЕТСЯ функцией, берётся пустая строка (в строке приёма пропадает имя
		 * пациента), а когда не является — её пытаются вызвать, и карточка
		 * падает. Разделитель оставлен только там, где форматтер переносит
		 * строки: между `=` и `typeof`, и внутри тернарника.
		 */
		pattern: new RegExp(
			String.raw`const appointmentPatientName\s*=\s*typeof patientName === "function"\s*\?\s*patientName\(\s*dashboard${optionalChain}patients[^,]*,\s*appointment${optionalChain}patientId[^)]*\)`,
		),
	},

	/* --- УСТАРЕВШЕЕ ТРЕБОВАНИЕ: закрепляется нынешний, лучший контракт ------ */

	/*
	 * Требовалась ДОСЛОВНО двухаргументная запись
	 *   `return appointmentScheduleMissingFields(draft, dashboard?.clinicSettings.profile.mode);`
	 * Продукт ушёл от неё ОСОЗНАННО: у общего правила появились ещё два
	 * аргумента — состав смены и ресурсы клиники (AppHelpers.tsx:4436-4444).
	 * Именно они позволяют сказать «в клинике ещё нет пациентов — создайте
	 * карточку в разделе „Пациенты“» вместо невыполнимого «выберите пациента»
	 * при пустом списке (AppHelpers.tsx:4458-4481), и на это есть тест
	 * apps/web/src/tests/appointmentMissingFields.test.ts.
	 *
	 * ПОЧЕМУ НЕЛЬЗЯ ВЕРНУТЬ ПРЕЖНИЙ NEEDLE: он потребовал бы срезать staff,
	 * chairs и patients обратно, то есть приказал бы продукту снова выдавать
	 * клинике без кресел указание «выберите кресло». Это была бы регрессия,
	 * купленная за зелёный цвет гейта. Поэтому закрепляется НЫНЕШНИЙ контракт:
	 * общее правило получает черновик, режим клиники, состав смены и ресурсы.
	 * Уберут любой из четырёх — страж покраснеет.
	 */
	sharedRequiredFieldHelperCall: {
		source: "appSource",
		message:
			"New and edited appointment validation must share the same required-field helper.",
		pattern: new RegExp(
			String.raw`appointmentScheduleMissingFields\(\s*draft,\s*dashboard${optionalChain}clinicSettings${optionalChain}profile${optionalChain}mode,\s*dashboard${optionalChain}clinicSettings${optionalChain}staff,\s*\{\s*chairs:`,
		),
	},
};
