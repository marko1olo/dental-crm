export type DiscrepancyReasonCode =
	| "standard_consumption"
	| "additional_carpule"
	| "anatomical_complexity"
	| "broken_instrument"
	| "sterile_packaging_breach"
	| "spillage_loss"
	| "sample_testing"
	| "expired_quarantine"
	| "defect_broken";

export interface DiscrepancyReasonDefinition {
	readonly code: DiscrepancyReasonCode;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly isDefect: boolean;
}

export const DISCREPANCY_REASONS: readonly DiscrepancyReasonDefinition[] = [
	{
		code: "standard_consumption",
		labelRu: "Стандартный клинический расход",
		descriptionRu: "Списание точно по норме технологической карты услуги",
		isDefect: false,
	},
	{
		code: "additional_carpule",
		labelRu: "Дополнительная анестезия (чувствительность)",
		descriptionRu: "Повторная карпула анестетика из-за высокого болевого порога пациента",
		isDefect: false,
	},
	{
		code: "anatomical_complexity",
		labelRu: "Сложная анатомия / глубокий дефект",
		descriptionRu: "Увеличенный расход композита/силера при некариозных или атипичных полостях",
		isDefect: false,
	},
	{
		code: "broken_instrument",
		labelRu: "Поломка бора / эндодонтического файла",
		descriptionRu: "Абразивный износ или поломка вращающегося инструмента в процессе лечения",
		isDefect: true,
	},
	{
		code: "sterile_packaging_breach",
		labelRu: "Нарушение стерильности упаковки",
		descriptionRu: "Случайное касание нестерильной зоны до внесения в полость рта",
		isDefect: true,
	},
	{
		code: "spillage_loss",
		labelRu: "Случайная потеря / разлив материала",
		descriptionRu: "Технический разлив или перерасход жидкости при замешивании",
		isDefect: true,
	},
	{
		code: "sample_testing",
		labelRu: "Входной контроль / калибровка дозатора",
		descriptionRu: "Технологическое списание капли материала для проверки отверждения",
		isDefect: false,
	},
	{
		code: "expired_quarantine",
		labelRu: "Истекший срок годности (утилизация)",
		descriptionRu: "Партия с истекшим сроком годности направлена на утилизацию",
		isDefect: true,
	},
	{
		code: "defect_broken",
		labelRu: "Заводской брак / повреждение при вскрытии",
		descriptionRu: "Брак или механическое повреждение упаковки/изделия",
		isDefect: true,
	},
];

export function getDiscrepancyReason(code: DiscrepancyReasonCode): DiscrepancyReasonDefinition {
	const found = DISCREPANCY_REASONS.find((r) => r.code === code);
	return found || DISCREPANCY_REASONS[0]!;
}
