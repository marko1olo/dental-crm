/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR PROTOCOL GENERATOR CANONICAL PRESETS AND TOOTH SURFACES
 * Dental Association of Russia (StAR) / Order of Minzdrav № 834n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ToothSurface } from "./emrProtocolEngine";

export interface Core1ClickPreset {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly specialty: "therapy" | "endodontics" | "surgery" | "orthopedics" | "periodontics";
	readonly iconType: "activity" | "zap" | "shield" | "scissors" | "award" | "sparkles";
	readonly description: string;
	readonly accentColor: string;
}

/** 6 обязательных стандартных клинических пресетов СтАР */
export const CORE_1CLICK_PRESETS: readonly Core1ClickPreset[] = [
	{
		id: "K02.1",
		code: "K02.1",
		title: "Глубокий / средний кариес",
		specialty: "therapy",
		iconType: "activity",
		description: "Препарирование по Блэку, коффердам, адгезив, нанокомпозит, полировка",
		accentColor: "sky",
	},
	{
		id: "K04.0",
		code: "K04.0",
		title: "Острый / обострившийся пульпит",
		specialty: "endodontics",
		iconType: "zap",
		description: "Апекслокация, Ni-Ti WaveOne/ProTaper, NaOCl+EDTA, горячая гуттаперча AH Plus",
		accentColor: "purple",
	},
	{
		id: "K04.5",
		code: "K04.5",
		title: "Хронический периодонтит",
		specialty: "endodontics",
		iconType: "shield",
		description: "Распломбировка, ревизия, временная обтурация гидроксидом кальция (Ca(OH)2)",
		accentColor: "indigo",
	},
	{
		id: "K08.1",
		code: "K08.1",
		title: "Хирургическое удаление зуба",
		specialty: "surgery",
		iconType: "scissors",
		description: "Синдесмотомия, элеваторы/щипцы, ревизия лунки, Альвостим, шов Викрил 4-0",
		accentColor: "rose",
	},
	{
		id: "K08.1_ORTHO",
		code: "K08.1_ORTHO",
		title: "Препарирование под коронку",
		specialty: "orthopedics",
		iconType: "award",
		description: "Круговой уступ Chamfer, 2-нитевая ретракция, 3D скан / А-силикон, Protemp 4",
		accentColor: "amber",
	},
	{
		id: "K05.3",
		code: "K05.3",
		title: "Профессиональная гигиена",
		specialty: "periodontics",
		iconType: "sparkles",
		description: "УЗ скейлинг EMS Piezon, Air-Flow глицин, кюретаж Gracey, Метрогил Дента",
		accentColor: "emerald",
	},
];

export const ALL_TOOTH_SURFACES: readonly { readonly id: ToothSurface; readonly label: string; readonly short: string }[] = [
	{ id: "occlusal", label: "Жевательная / Окклюзионная", short: "O" },
	{ id: "vestibular", label: "Вестибулярная / Щёчная", short: "V" },
	{ id: "oral", label: "Оральная / Язычная / Нёбная", short: "L" },
	{ id: "mesial", label: "Медиальная / Апроксимальная", short: "M" },
	{ id: "distal", label: "Дистальная / Апроксимальная", short: "D" },
];
