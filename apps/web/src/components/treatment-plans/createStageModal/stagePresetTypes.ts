export type StagePresetId =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "periodontics"
	| "custom";

export interface StagePresetDefinition {
	id: StagePresetId;
	label: string;
	desc: string;
}

export const STAGE_PRESETS: readonly StagePresetDefinition[] = [
	{ id: "therapy", label: "Терапия и санация", desc: "Кариес, эндодонтия, гигиена" },
	{ id: "surgery", label: "Хирургия и имплантация", desc: "Удаление, пластика, импланты" },
	{ id: "orthopedics", label: "Ортопедическая реабилитация", desc: "Коронки, мосты, виниры" },
	{ id: "orthodontics", label: "Ортодонтическое лечение", desc: "Брекеты, элайнеры, прикус" },
	{ id: "periodontics", label: "Пародонтология", desc: "SRP, Вектор, кюретаж" },
	{ id: "custom", label: "Индивидуальный этап", desc: "Специализированный протокол" },
];
