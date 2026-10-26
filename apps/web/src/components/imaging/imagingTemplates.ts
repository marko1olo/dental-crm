/**
 * imagingTemplates.ts — Шаблоны описания снимков, быстрые чипы и валидация файлов
 * Mandate 8b: строго <= 120 строк.
 */

export const IMAGING_QUICK_CHIPS = [
	"Норма (периапикальные ткани б/о, периодонтальная щель равномерная)",
	"Кариес дентина",
	"Хронический гранулирующий периодонтит",
	"Атрофия костной ткани горизонтальная",
	"Хронический пульпит",
	"Неполная обтурация корневого канала",
	"Имплантат стабилен, остеоинтеграция б/о",
	"Ретенция / Дистопия",
];

export const IMAGING_DESCRIPTION_TEMPLATES: Record<string, string[]> = {
	periapical: [
		"Коронковая часть:",
		"Полость зуба:",
		"Корневые каналы:",
		"Периапикальные ткани:",
		"Заключение:",
	],
	bitewing: [
		"Контактные поверхности:",
		"Уровень костной ткани:",
		"Наддесневые и поддесневые отложения:",
		"Заключение:",
	],
	opg: [
		"Зубная формула:",
		"Уровень костной ткани:",
		"Гайморовы пазухи:",
		"Височно-челюстные суставы:",
		"Ретинированные и непрорезавшиеся зубы:",
		"Заключение:",
	],
	ceph: [
		"Профиль лица:",
		"Скелетный класс:",
		"Углы SNA / SNB / ANB:",
		"Положение резцов:",
		"Заключение:",
	],
	cbct: [
		"Область исследования:",
		"Плотность костной ткани:",
		"Высота и ширина кости:",
		"Анатомические структуры (канал, пазуха, дно носа):",
		"Патологические изменения:",
		"Заключение:",
	],
	photo: [
		"Область съёмки:",
		"Состояние мягких тканей:",
		"Гигиена:",
		"Заключение:",
	],
	other: ["Область:", "Описание:", "Заключение:"],
};

export function imagingDescriptionTemplate(
	kind: string | null | undefined,
	toothCode: string | null | undefined,
	region: string | null | undefined,
): string {
	const lines =
		IMAGING_DESCRIPTION_TEMPLATES[kind ?? "other"] ??
		IMAGING_DESCRIPTION_TEMPLATES.other ?? [];
	const header = toothCode
		? `Зуб: ${toothCode}`
		: region
			? `Область: ${region}`
			: null;
	const body = header
		? [header, ...(lines ?? []).filter((line) => !line.startsWith("Область:"))]
		: (lines ?? []);
	return body.join("\n");
}

export function imagingStudyHasFile(study: unknown): boolean {
	if (!study || typeof study !== "object") return false;
	const s = study as Record<string, unknown>;
	return (
		(typeof s.storagePath === "string" && s.storagePath.trim().length > 0) ||
		(typeof s.previewUrl === "string" && s.previewUrl.trim().length > 0) ||
		(typeof s.imageUrl === "string" && s.imageUrl.trim().length > 0) ||
		(typeof s.id === "string" && s.id.trim().length > 0)
	);
}
