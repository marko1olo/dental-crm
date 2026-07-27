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
	| "chairUtilisation";

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
 * приглашать пациентов на осмотр приходится. Занятость единственного кресла
 * по-прежнему не показывает ничего.
 */
const ONE_CHAIR: readonly ClinicCapability[] = [
	"callList",
	"messaging",
	"massCampaigns",
	"managerReports",
	"doctorBreakdown"
];

/** Малая клиника и сеть: «несколько врачей, кресел» — доступно всё. */
const FULL: readonly ClinicCapability[] = [
	"callList",
	"messaging",
	"massCampaigns",
	"managerReports",
	"doctorBreakdown",
	"chairUtilisation"
];

const CAPABILITIES_BY_MODE: Readonly<Record<ClinicMode, readonly ClinicCapability[]>> = {
	solo_doctor: SOLO_DOCTOR,
	one_chair: ONE_CHAIR,
	small_clinic: FULL,
	network_clinic: FULL
};

/**
 * Режим неизвестен — показываем всё.
 *
 * Это осознанное умолчание: спрятать раздел у клиники, чей режим ещё не
 * определён (не прошли настройку, старая запись в базе), значит отнять
 * работающую возможность без объяснения. Лишний раздел заметят и настроят;
 * пропавший будут искать.
 */
export function clinicCapabilities(mode: ClinicMode | null | undefined): readonly ClinicCapability[] {
	if (!mode) return FULL;
	return CAPABILITIES_BY_MODE[mode] ?? FULL;
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
		chairUtilisation: "занятость кресел"
	};
	return (Object.keys(labels) as ClinicCapability[]).filter((capability) => !available.has(capability)).map((capability) => labels[capability]);
}
