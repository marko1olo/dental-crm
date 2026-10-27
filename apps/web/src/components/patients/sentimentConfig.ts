export type PatientSentimentType = "loyal_vip" | "cancellation_risk" | "strict_ids_required" | "standard";

export interface PatientSentimentInfo {
	type: PatientSentimentType;
	label: string;
	shortLabel: string;
	badgeEmoji: string;
	colorTheme: "emerald" | "amber" | "rose" | "slate";
	description: string;
	clinicalDirective: string;
	calculatedLtvRub: number;
	complianceScorePercent: number;
	riskFactors: string[];
}

export function getSentimentDescriptor(
	type: PatientSentimentType,
	ltv: number,
	complianceScore?: number | null | undefined,
): PatientSentimentInfo {
	if (type === "loyal_vip") {
		return {
			type: "loyal_vip",
			label: "Лояльный профиль / VIP",
			shortLabel: "VIP • Лояльный",
			badgeEmoji: "",
			colorTheme: "emerald",
			description: "Постоянный пациент с высокой лояльностью.",
			clinicalDirective: "Приоритетная запись в удобное время, персональный менеджер куратора.",
			calculatedLtvRub: ltv,
			complianceScorePercent: complianceScore ?? 95,
			riskFactors: [],
		};
	}
	if (type === "cancellation_risk") {
		return {
			type: "cancellation_risk",
			label: "Риск неявки (расписание)",
			shortLabel: "Риск неявки",
			badgeEmoji: "",
			colorTheme: "amber",
			description: "Повышенная вероятность пропуска приёма по объективной статистике.",
			clinicalDirective: "Контрольный звонок администратора за 24 ч + SMS-напоминание утром в день приёма.",
			calculatedLtvRub: ltv,
			complianceScorePercent: complianceScore ?? 65,
			riskFactors: ["Повышенная вероятность срыва записи по данным расписания"],
		};
	}
	if (type === "strict_ids_required") {
		return {
			type: "strict_ids_required",
			label: "Соматический стоп-фактор (ИДС)",
			shortLabel: "Аллергоанамнез",
			badgeEmoji: "",
			colorTheme: "rose",
			description: "Особое внимание: отягощенный аллергоанамнез.",
			clinicalDirective: "Оформление расширенного согласия на лечение, протоколирование мер безопасности.",
			calculatedLtvRub: ltv,
			complianceScorePercent: complianceScore ?? 80,
			riskFactors: ["Отягощенный аллергоанамнез: подбор гипоаллергенной анестезии, обязательное согласие на лечение (ИДС)"],
		};
	}
	return {
		type: "standard",
		label: "Стандартный профиль",
		shortLabel: "Норма",
		badgeEmoji: "",
		colorTheme: "slate",
		description: "Соматически сохранный профиль, норма.",
		clinicalDirective: "Стандартный клинический протокол приёма и оформления медицинской карты.",
		calculatedLtvRub: ltv,
		complianceScorePercent: complianceScore ?? 100,
		riskFactors: [],
	};
}
