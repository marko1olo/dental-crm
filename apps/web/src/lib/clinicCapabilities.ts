/**
 * Что показывать клинике в зависимости от её режима.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ
 * Режим клиники уже используется в интерфейсе, но россыпью: в коде встречаются
 * прямые сравнения `profile.mode !== "solo_doctor"` в четырёх разных местах
 * (карточка приёма, форма записи, логика расписания). Каждое новое правило
 * добавляет ещё одно такое сравнение, и через полгода никто не ответит, что
 * именно видит отдельный врач.
 *
 * Здесь одна таблица: режим → набор возможностей. Правило добавляется в неё, а
 * не в разметку.
 *
 * ПРИНЦИП, ПО КОТОРОМУ РЕШАЛОСЬ, ЧТО ПРЯТАТЬ
 * Скрывается то, что при этом режиме бессмысленно ПО УСТРОЙСТВУ, а не то, что
 * может оказаться пустым. Занятость одного кресла — всегда одно и то же число,
 * смотреть там нечего. Выработка одного врача — это одна строка: мало, но
 * осмысленно, поэтому она остаётся.
 *
 * Пустое не прячем: «за период приёмов не было» — это ответ, а исчезнувший
 * раздел выглядит как поломка.
 */

import type { StaffRole } from "@dental/shared";

export type ClinicMode = "solo_doctor" | "one_chair" | "small_clinic" | "network_clinic";

export type ClinicCapability =
	/** Утренний обзвон и подтверждения приёма. */
	| "callList"
	/** Отправка сообщений: шаблоны, очередь, состояние шлюзов. */
	| "messaging"
	/** Рассылки по базе пациентов. */
	| "massCampaigns"
	/** Отчёты руководителю: выручка, потери, дебиторка. */
	| "managerReports"
	/** Разрез отчётов по врачам. */
	| "doctorBreakdown"
	/** Занятость кресел. */
	| "chairUtilisation"
	/** Раздел «Маркетинг/SEO»: продвижение, отзывы, площадки. */
	| "marketingSection";

/**
 * Отдельный врач: «минимум экранов, максимум скорости приёма» — так режим
 * описан в самом интерфейсе. Поэтому у него нет рассылок по базе (это работа
 * маркетинга, которого у него нет), нет разреза по врачам (врач один) и нет
 * занятости кресел (кресло одно). Обзвон и сообщения остаются: напоминания
 * нужны и ему, причём звонит он сам.
 */
const SOLO_DOCTOR: readonly ClinicCapability[] = ["callList", "messaging", "managerReports"];

/**
 * Один кабинет: «один поток пациентов, одна смена». Рассылки уже осмысленны —
 * приглашать пациентов на осмотр приходится, а вместе с ними осмыслен и раздел
 * продвижения. Занятость единственного кресла по-прежнему не показывает ничего.
 */
const ONE_CHAIR: readonly ClinicCapability[] = [
	"callList",
	"messaging",
	"massCampaigns",
	"managerReports",
	"doctorBreakdown",
	"marketingSection"
];

/** Малая клиника и сеть: «несколько врачей, кресел» — доступно всё. */
const FULL: readonly ClinicCapability[] = [
	"callList",
	"messaging",
	"massCampaigns",
	"managerReports",
	"doctorBreakdown",
	"chairUtilisation",
	"marketingSection"
];

const CAPABILITIES_BY_MODE: Readonly<Record<ClinicMode, readonly ClinicCapability[]>> = {
	solo_doctor: SOLO_DOCTOR,
	one_chair: ONE_CHAIR,
	small_clinic: FULL,
	network_clinic: FULL
};

/** Перечень режимов одним списком — по нему проверяется чужое значение. */
export const clinicModes: readonly ClinicMode[] = ["solo_doctor", "one_chair", "small_clinic", "network_clinic"];

/**
 * Известен ли режим.
 *
 * Проверять принадлежность через `value in CAPABILITIES_BY_MODE` нельзя, и это
 * не теория: оператор `in` идёт по цепочке прототипов, поэтому строка
 * "toString" проходила за режим клиники, а таблица возвращала на неё функцию
 * Object.prototype.toString вместо списка возможностей — и следующий же
 * `.includes` падал. Сравнение со списком такой дыры не имеет.
 */
function isClinicMode(value: unknown): value is ClinicMode {
	return typeof value === "string" && (clinicModes as readonly string[]).includes(value);
}

/**
 * Режим неизвестен — показываем всё.
 *
 * Это осознанное умолчание: спрятать раздел у клиники, чей режим ещё не
 * определён (не прошли настройку, старая запись в базе), значит отнять
 * работающую возможность без объяснения. Лишний раздел заметят и настроят;
 * пропавший будут искать.
 */
export function clinicCapabilities(mode: ClinicMode | null | undefined): readonly ClinicCapability[] {
	if (!isClinicMode(mode)) return FULL;
	return CAPABILITIES_BY_MODE[mode];
}

export function hasCapability(mode: ClinicMode | null | undefined, capability: ClinicCapability): boolean {
	return clinicCapabilities(mode).includes(capability);
}

/**
 * Подпись для настроек: чем режим отличается по составу разделов. Нужна, чтобы
 * пропажа раздела не выглядела поломкой, а объяснялась выбранным режимом.
 */
export function describeHiddenCapabilities(mode: ClinicMode | null | undefined): string[] {
	const available = new Set(clinicCapabilities(mode));
	const labels: Record<ClinicCapability, string> = {
		callList: "обзвон и подтверждения",
		messaging: "отправка сообщений",
		massCampaigns: "рассылки по базе пациентов",
		managerReports: "отчёты руководителю",
		doctorBreakdown: "разрез отчётов по врачам",
		chairUtilisation: "занятость кресел",
		marketingSection: "раздел продвижения и отзывов"
	};
	return (Object.keys(labels) as ClinicCapability[]).filter((capability) => !available.has(capability)).map((capability) => labels[capability]);
}

/**
 * Режим клиники берётся из ответа сервера: `clinicSettings.profile.mode`. Это
 * единственный источник, по которому уже решают карточка приёма, форма записи,
 * рассылки и отчёты руководителю.
 *
 * ЗАЧЕМ ЭТА ФУНКЦИЯ. Нужно одно место, которое отвечает «режим пока не известен»
 * значением null, а не подставляет вместо неизвестного какой-нибудь режим. В
 * store/settingsStore.ts ровно такая подстановка и стояла: поле по умолчанию
 * равнялось "network_clinic", то есть самому крупному режиму. Проверять строку
 * на месте использования — значит завести второй ответ на тот же вопрос.
 */
export function resolveClinicMode(value: unknown): ClinicMode | null {
	return isClinicMode(value) ? value : null;
}

/**
 * Роли, которые при этом режиме реально есть в клинике.
 *
 * ЗАЧЕМ. Переключатель роли в шапке предлагал все пять ролей всегда. У
 * отдельного врача нет ни ассистента, ни администратора на ресепшене, ни
 * управляющего — он один. Три из пяти кнопок предлагают переключиться на
 * сотрудника, которого не существует.
 *
 * ПОЧЕМУ У ОДНОГО ВРАЧА ОСТАЮТСЯ ДВЕ РОЛИ, А НЕ ОДНА. Роль задаёт не только
 * подпись, но и состав разделов (getFilteredAppViews): у роли «Врач» нет ни
 * «Оплат», ни «Настроек». Если оставить одну врачебную роль, отдельный врач
 * потеряет доступ к кассе и к настройкам — в том числе к тому месту, где режим
 * клиники меняется обратно. Поэтому остаются «Врач» (лечу) и «Владелец» (вижу
 * всё), а роли отсутствующих сотрудников убираются.
 *
 * В одном кабинете ассистент и администратор появляются, а управляющий над
 * одним кабинетом — это по-прежнему никто.
 */
const ROLES_BY_MODE: Readonly<Record<ClinicMode, readonly StaffRole[]>> = {
	solo_doctor: ["doctor", "owner"],
	one_chair: ["doctor", "assistant", "administrator", "owner"],
	small_clinic: ["doctor", "assistant", "administrator", "manager", "owner"],
	network_clinic: ["doctor", "assistant", "administrator", "manager", "owner"]
};

/**
 * Отбирает из предложенного порядка ролей те, что при этом режиме существуют.
 * Порядок исходного списка сохраняется: он задан в AppHelpers (roleFocusOrder) и
 * отражает частоту использования, а не алфавит.
 *
 * Режим не известен — возвращается исходный список целиком, по тому же правилу,
 * что и у возможностей: пропавшую кнопку будут искать, лишнюю просто заметят.
 */
export function visibleStaffRoles(order: readonly StaffRole[], mode: ClinicMode | null | undefined): StaffRole[] {
	if (!isClinicMode(mode)) return [...order];
	const allowed = ROLES_BY_MODE[mode];
	return order.filter((role) => allowed.includes(role));
}
