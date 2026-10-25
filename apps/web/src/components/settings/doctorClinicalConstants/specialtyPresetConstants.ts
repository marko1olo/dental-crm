import type { DoctorSpecialtyKey } from "../../../store/doctorPreferencesStore";

export interface SpecialtyPresetItem {
	readonly key: DoctorSpecialtyKey;
	readonly label: string;
	readonly shortLabel?: string;
	readonly title?: string;
}

export const SPECIALTY_PRESET_ITEMS: readonly SpecialtyPresetItem[] = [
	{ key: "therapist", label: "Терапевт", shortLabel: "Терапевт", title: "Терапевтическая стоматология" },
	{ key: "surgeon", label: "Хирург-имплантолог", shortLabel: "Хирург", title: "Хирургическая стоматология и имплантология" },
	{ key: "orthopedist", label: "Ортопед", shortLabel: "Ортопед", title: "Ортопедическая стоматология и протезирование" },
	{ key: "orthodontist", label: "Ортодонт", shortLabel: "Ортодонт", title: "Ортодонтия и исправление прикуса" },
	{ key: "periodontist", label: "Пародонтолог", shortLabel: "Пародонтолог", title: "Пародонтология и здоровье десен" },
	{ key: "pediatric", label: "Детский врач", shortLabel: "Детский", title: "Детская стоматология" },
	{ key: "universal", label: "Универсальный", shortLabel: "Универсал", title: "Универсальный профиль стоматолога (смешанный приём: терапия, хирургия, ортопедия)" },
];
