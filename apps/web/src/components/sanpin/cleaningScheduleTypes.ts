import type { GeneralCleaningLog } from "@dental/shared";

export interface GeneralCleaningScheduleProps {
	readonly logs: readonly GeneralCleaningLog[];
	readonly onScheduleUpdated?: () => void;
}

export interface ClinicRoomCatalogItem {
	readonly id: string;
	readonly name: string;
	readonly areaM2: number;
	readonly defaultDayOfWeek: string;
}

export const CLINIC_ROOMS_CATALOG: readonly ClinicRoomCatalogItem[] = [
	{ id: "room-1", name: "Кабинет № 1 (Терапия)", areaM2: 24.5, defaultDayOfWeek: "Понедельник" },
	{ id: "room-2", name: "Кабинет № 2 (Ортопедия)", areaM2: 22.0, defaultDayOfWeek: "Вторник" },
	{ id: "room-surg", name: "Операционная / Хирургический кабинет", areaM2: 32.5, defaultDayOfWeek: "Среда" },
	{ id: "room-cso", name: "Стерилизационная (ЦСО)", areaM2: 18.0, defaultDayOfWeek: "Четверг" },
];

export const MONTH_NAMES_RU = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
] as const;
