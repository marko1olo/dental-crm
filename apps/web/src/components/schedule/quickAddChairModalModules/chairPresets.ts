import type { ChairArchetypePreset, ChairSpecialtyPreset } from "./types";
export * from "./chairColorPresets";

export const CHAIR_SPECIALTY_PRESETS: readonly ChairSpecialtyPreset[] = [
	{ id: "therapist", label: "Терапия" },
	{ id: "surgeon", label: "Хирургия" },
	{ id: "orthopedist", label: "Ортопедия" },
	{ id: "orthodontist", label: "Ортодонтия" },
	{ id: "pediatric", label: "Детская" },
	{ id: "hygienist", label: "Гигиена" },
	{ id: "general", label: "Общее" },
];

export const CHAIR_NAME_SUGGESTIONS: readonly string[] = [
	"Кресло 1",
	"Кресло 2 (Хирургия)",
	"Кресло 3 (Терапия)",
	"Кабинет 1",
];

export const CHAIR_ARCHETYPE_PRESETS: readonly ChairArchetypePreset[] = [
	{
		id: "therapy",
		label: "Терапевтическое",
		specialty: "therapist",
		colorHex: "#0d9488",
		description: "Терапия и эндодонтия",
	},
	{
		id: "surgery",
		label: "Хирургическое",
		specialty: "surgeon",
		colorHex: "#2563eb",
		description: "Хирургия/имплантология",
	},
	{
		id: "orthodontics",
		label: "Ортодонтическое",
		specialty: "orthodontist",
		colorHex: "#6366f1",
		description: "Ортодонтия и прикус",
	},
	{
		id: "pediatric",
		label: "Детское",
		specialty: "pediatric",
		colorHex: "#f59e0b",
		description: "Детская стоматология",
	},
	{
		id: "hygiene",
		label: "Гигиеническое",
		specialty: "hygienist",
		colorHex: "#10b981",
		description: "Профгигиена и уход",
	},
];
