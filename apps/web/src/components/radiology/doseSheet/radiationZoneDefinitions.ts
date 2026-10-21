import type { RadiationSafetyZone, RadiationZoneDefinition } from "./types.js";

export const RADIATION_SAFETY_LIMITS_MSV = {
	ANNUAL_PREVENTIVE_LIMIT_MSV: 1.0,
	WARNING_THRESHOLD_MSV: 0.5,
	CRITICAL_EXCEEDED_THRESHOLD_MSV: 1.0,
	MAX_SINGLE_SCREENING_DOSE_MSV: 0.1,
	RECOMMENDED_CBCT_INTERVAL_DAYS: 90,
} as const;

export const RADIATION_ZONE_DEFINITIONS: Record<
	RadiationSafetyZone,
	RadiationZoneDefinition
> = {
	green: {
		zone: "green",
		minMsv: 0,
		maxMsv: 0.5,
		labelRu: "Зеленая зона (< 0.5 мЗв/год)",
		statusBadgeRu: "Безопасный уровень (Оптимум)",
		descriptionRu:
			"Суммарная лучевая нагрузка находится в пределах оптимальных фоновых нормативных значений.",
		recommendationRu:
			"Ограничений на проведение плановых исследований нет. Соблюдать стандартный принцип ALARA.",
		badgeClass:
			"bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
		borderClass: "border-emerald-500/30",
		textClass: "text-emerald-600 dark:text-emerald-400",
		bgClass: "bg-emerald-500/10",
	},
	yellow: {
		zone: "yellow",
		minMsv: 0.5,
		maxMsv: 1.0,
		labelRu: "Желтая зона (0.5 – 1.0 мЗв/год)",
		statusBadgeRu: "Умеренная нагрузка (Внимание)",
		descriptionRu:
			"Накопленная лучевая нагрузка достигла 50–99% годового профилактического предела.",
		recommendationRu:
			"Рекомендуется оптимизация рентген-назначений: отдавать приоритет прицельной радиовизиографии с коллимацией.",
		badgeClass:
			"bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
		borderClass: "border-amber-500/30",
		textClass: "text-amber-600 dark:text-amber-400",
		bgClass: "bg-amber-500/10",
	},
	red: {
		zone: "red",
		minMsv: 1.0,
		maxMsv: Number.POSITIVE_INFINITY,
		labelRu: "Красная зона (≥ 1.0 мЗв/год)",
		statusBadgeRu: "Превышение лимита (Обоснование врача)",
		descriptionRu:
			"Достигнут или превышен рекомендуемый годовой диагностический лимит (1.0 мЗв, НРБ-99/2009).",
		recommendationRu:
			"Все последующие исследования проводятся по обоснованным клиническим показаниям с записью в карте.",
		badgeClass:
			"bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
		borderClass: "border-rose-500/30",
		textClass: "text-rose-600 dark:text-rose-400",
		bgClass: "bg-rose-500/10",
	},
};
