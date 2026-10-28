export type FnsKinshipCode = "1" | "2" | "3" | "4" | "5";

export interface FnsKinshipPreset {
	code: FnsKinshipCode;
	label: string;
	relationTitle: string;
	requiresKinshipDoc: boolean;
	hint: string;
}

export const FNS_KINSHIP_PRESETS: Record<FnsKinshipCode, FnsKinshipPreset> = {
	"1": {
		code: "1",
		label: "1 — Сам пациент (налогоплательщик и пациент — одно лицо)",
		relationTitle: "Сам налогоплательщик",
		requiresKinshipDoc: false,
		hint: "Блок сведений о пациенте в XML сжимается до флага ПризнПац=\"1\"",
	},
	"2": {
		code: "2",
		label: "2 — Супруг / Супруга",
		relationTitle: "Супруг(а)",
		requiresKinshipDoc: true,
		hint: "Требуется свидетельство о заключении брака",
	},
	"3": {
		code: "3",
		label: "3 — Родитель (мать / отец)",
		relationTitle: "Родитель",
		requiresKinshipDoc: true,
		hint: "Требуется свидетельство о рождении налогоплательщика",
	},
	"4": {
		code: "4",
		label: "4 — Ребенок (до 18 лет или до 24 лет очной формы обучения)",
		relationTitle: "Сын / Дочь",
		requiresKinshipDoc: true,
		hint: "Требуется свидетельство о рождении ребенка / справка об очном обучении",
	},
	"5": {
		code: "5",
		label: "5 — Подопечный / Опекаемый",
		relationTitle: "Подопечный",
		requiresKinshipDoc: true,
		hint: "Требуется акт органа опеки и попечительства",
	},
};
