export type BracketSlot = "0.018" | "0.022";

export interface BracketSystemOption {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
}

export const BRACKET_SYSTEMS: readonly BracketSystemOption[] = [
	{ id: "damon_q2", label: "Damon Q2", desc: "Металл · Пассивное самолигирование" },
	{ id: "damon_clear", label: "Damon Clear", desc: "Сапфир / керамика · Эстетические" },
	{ id: "empower", label: "Empower", desc: "Интерактивное самолигирование" },
	{ id: "mini_diamond", label: "Mini Diamond", desc: "Лигатурные классические (металл)" },
	{ id: "clarity_advanced", label: "Clarity Advanced", desc: "Керамика · Эстетические лигатурные" },
	{ id: "lingual_win", label: "Лингвальные Win / Incognito", desc: "Лингвальные индивидуальные брекеты" },
	{ id: "pitts21", label: "Pitts 21", desc: "Квадратный паз .021" },
	{ id: "aligners", label: "Элайнеры", desc: "Прозрачные каппы с аттачментами" },
	{ id: "marco_rosa", label: "Аппарат Марко Роса", desc: "Несъемный нёбный расширитель" },
	{ id: "haas_rpe", label: "Аппарат Хааса (RPE)", desc: "Несъемный аппарат быстрого нёбного расширения" },
	{ id: "pendulum", label: "Аппарат Pendulum", desc: "Несъемный дистализатор моляров ВЧ" },
	{ id: "twin_block", label: "Твин-блок (Twin Block)", desc: "Съемный функциональный аппарат (II класс)" },
	{ id: "removable_plate", label: "Пластинка с винтом", desc: "Съемный пластиночный аппарат с расширяющим винтом" },
];

export interface AlignerAttachmentPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly teeth: readonly number[];
	readonly description: string;
}

export const ALIGNER_ATTACHMENT_PRESETS: readonly AlignerAttachmentPreset[] = [
	{
		id: "standard",
		label: "Стандартные аттачменты: клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45)",
		shortLabel: "Стандартные (клыки и премоляры)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description: "Фиксация композитных аттачментов по переносному шаблону. Протравливание 37%, бондинг, полимеризация 20 сек.",
	},
	{
		id: "intact",
		label: "Аттачменты интактны, сколов нет",
		shortLabel: "Аттачменты интактны, сколов нет",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description: "Контрольный осмотр элайнеров. Композитные аттачменты интактны, ретенция оптимальная.",
	},
	{
		id: "refixation",
		label: "Повторная фиксация аттачмента (замена)",
		shortLabel: "Повторная фиксация аттачмента (замена)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description: "Обнаружен скол аттачмента. Очистка эмали, повторная фиксация по шаблону.",
	},
	{
		id: "debonding",
		label: "Снятие аттачментов и полировка (финиш)",
		shortLabel: "Снятие аттачментов и полировка (финиш)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description: "Атравматичное сошлифовывание твердосплавными финирами, полировка, фторирование.",
	},
];

export interface OrthoBracketProtocolSectionProps {
	readonly bracketSlot: BracketSlot;
	readonly setBracketSlot: (slot: BracketSlot) => void;
	readonly bracketSystem: string;
	readonly onSelectBracketSystem: (systemId: string) => void;
	readonly plateActivationTurns: number;
	readonly setPlateActivationTurns: (turns: number) => void;
	readonly onAddExpansionScrewAction: () => void;
	readonly activeAttachmentPreset: string | null;
	readonly onSelectAttachmentPreset: (presetId: string) => void;
	readonly isSplitArchAligners: boolean;
	readonly setIsSplitArchAligners: React.Dispatch<React.SetStateAction<boolean>>;
	readonly alignerStep: number;
	readonly setAlignerStep: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerTotal: number;
	readonly setAlignerTotal: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerStepUpper: number;
	readonly setAlignerStepUpper: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerTotalUpper: number;
	readonly setAlignerTotalUpper: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerStepLower: number;
	readonly setAlignerStepLower: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerTotalLower: number;
	readonly setAlignerTotalLower: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerIntervalDays: number;
	readonly setAlignerIntervalDays: React.Dispatch<React.SetStateAction<number>>;
	readonly nextAlignerDateStr: string;
	readonly alignerProgressPercent: number;
	readonly onSendAlignerReminder: () => void;
	readonly onIssueAlignerSet: (count: number, days: number) => void;
	readonly onApplyAttachmentsProtocol: () => void;
	readonly alignerSetIssuedCount?: number | undefined;
}
