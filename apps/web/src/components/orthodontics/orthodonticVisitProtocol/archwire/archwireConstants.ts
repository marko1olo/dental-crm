import type {
	ArchwireMaterial,
	ArchwireSection,
	TorquePresetOption,
	AngulationPresetOption,
} from "../types";

export const ARCHWIRE_MATERIALS: Array<{
	id: ArchwireMaterial;
	label: string;
	desc: string;
	badge: string;
}> = [
	{ id: "NiTi", label: "NiTi SuperElastic", desc: "Никель-титан · Первичное нивелирование", badge: "NiTi" },
	{ id: "CuNiTi", label: "CuNiTi 27°C / 35°C", desc: "Медь-никель-титан · Термоактивная", badge: "CuNiTi" },
	{ id: "SS", label: "SS (Stainless Steel)", desc: "Медицинская сталь · Закрытие промежутков", badge: "SS" },
	{ id: "TMA", label: "TMA (Beta-Titanium)", desc: "Бета-титан · Юстировка и финишные торки", badge: "TMA" },
];

export const ROUND_SECTIONS: ArchwireSection[] = [".012", ".014", ".016", ".018", ".020"];
export const RECT_SECTIONS: ArchwireSection[] = [
	".014x.025",
	".016x.022",
	".016x.025",
	".017x.025",
	".018x.025",
	".019x.025",
	".021x.025",
];

export const TORQUE_PRESETS: TorquePresetOption[] = [
	{ id: "mbt", label: "Стандарт MBT (+17° / -6°)", shortLabel: "MBT (+17°/-6°)", u1Torque: "+17°", l1Torque: "-6°", desc: "Универсальный стандарт прописи MBT" },
	{ id: "damon_std", label: "Стандарт Damon (+12° / -1°)", shortLabel: "Damon Std (+12°/-1°)", u1Torque: "+12°", l1Torque: "-1°", desc: "Стандартный торк резцов Damon Q2 / Clear" },
	{ id: "damon_high", label: "Высокий High (+17° / +7°)", shortLabel: "High (+17°/+7°)", u1Torque: "+17°", l1Torque: "+7°", desc: "Компенсация ретрузии и потери торка" },
	{ id: "damon_low", label: "Низкий Low (+2° / -6°)", shortLabel: "Low (+2°/-6°)", u1Torque: "+2°", l1Torque: "-6°", desc: "Предотвращение протрузии при скученности" },
	{ id: "roth", label: "Классический Roth (+12° / -1°)", shortLabel: "Roth (+12°/-1°)", u1Torque: "+12°", l1Torque: "-1°", desc: "Классическая пропись Рота" },
];

export const ANGULATION_PRESETS: AngulationPresetOption[] = [
	{ id: "norm", label: "Норма (резцы 5°, клыки 9°)", shortLabel: "Норма" },
	{ id: "canine_upright", label: "Вертикализация клыков (7°)", shortLabel: "Вертикализация" },
];
