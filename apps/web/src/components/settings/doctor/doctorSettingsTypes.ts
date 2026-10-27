import type { DoctorSpecialtyKey } from "../../../store/doctorPreferencesStore";
import type { DoctorSubTab } from "../doctorSettingsTabs";

export interface DoctorSettingsSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	readonly props: Record<string, any>;
	readonly initialTab?: DoctorSubTab | undefined;
	readonly onSelectTab?: ((tab: string) => void) | undefined;
}

export const SPECIALTY_PRESET_BUTTONS: readonly {
	key: DoctorSpecialtyKey;
	label: string;
	title: string;
}[] = [
	{ key: "therapist", label: "Терапевт", title: "Терапевтическая стоматология" },
	{ key: "surgeon", label: "Хирург", title: "Хирургическая стоматология и имплантология" },
	{ key: "orthopedist", label: "Ортопед", title: "Ортопедическая стоматология и протезирование" },
	{ key: "orthodontist", label: "Ортодонт", title: "Ортодонтия и исправление прикуса" },
	{ key: "periodontist", label: "Пародонтолог", title: "Пародонтология и здоровье десен" },
	{ key: "pediatric", label: "Детский", title: "Детская стоматология" },
];
