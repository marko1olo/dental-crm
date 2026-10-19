/**
 * anesthesiaNeedleCatalog.ts — Dental Needles Catalog
 * Standards: ISO 7885 / Минздрав РФ. Mandate 8b (<= 120 lines).
 */
import type {
	NeedleGaugeId,
	NeedleSpecification,
} from "./anesthesiaTechniqueTypes";

export const DENTAL_NEEDLE_CATALOG: Record<NeedleGaugeId, NeedleSpecification> =
	{
		gauge_27_long_35mm: {
			id: "gauge_27_long_35mm",
			gauge: "27G",
			externalDiameterMm: 0.4,
			internalDiameterMm: 0.2,
			lengthMm: 35,
			colorCode: "#eab308",
			capColorRu: "Желтый",
			nameRu: "27G × 35 мм (Длинная, желтая)",
			primaryIndicationsRu:
				"Мандибулярная (Вайсбрем, Гоу-Гейтс, Акинози), торусальная проводниковая блокада.",
			aspirationLumenSafety: "high",
			deflectionResistancePercent: 92,
		},
		gauge_30_medium_25mm: {
			id: "gauge_30_medium_25mm",
			gauge: "30G",
			externalDiameterMm: 0.3,
			internalDiameterMm: 0.15,
			lengthMm: 25,
			colorCode: "#3b82f6",
			capColorRu: "Синий",
			nameRu: "30G × 25 мм (Средняя, синяя)",
			primaryIndicationsRu:
				"Инфильтрационная анестезия на верхней челюсти, ментальная блокада.",
			aspirationLumenSafety: "medium",
			deflectionResistancePercent: 65,
		},
		gauge_30_short_21mm: {
			id: "gauge_30_short_21mm",
			gauge: "30G",
			externalDiameterMm: 0.3,
			internalDiameterMm: 0.15,
			lengthMm: 21,
			colorCode: "#06b6d4",
			capColorRu: "Голубой",
			nameRu: "30G × 21 мм (Короткая)",
			primaryIndicationsRu:
				"Стандартная инфильтрационная анестезия, папиллярная блокада.",
			aspirationLumenSafety: "medium",
			deflectionResistancePercent: 78,
		},
		gauge_30_ultrashort_12mm: {
			id: "gauge_30_ultrashort_12mm",
			gauge: "30G",
			externalDiameterMm: 0.3,
			internalDiameterMm: 0.15,
			lengthMm: 12,
			colorCode: "#22c55e",
			capColorRu: "Зеленый",
			nameRu: "30G × 12 мм (Ультракороткая, зеленая)",
			primaryIndicationsRu:
				"Небная, резцовая, интралигаментарная анестезия (PDL).",
			aspirationLumenSafety: "medium",
			deflectionResistancePercent: 95,
		},
		gauge_30_extrashort_8mm: {
			id: "gauge_30_extrashort_8mm",
			gauge: "30G",
			externalDiameterMm: 0.3,
			internalDiameterMm: 0.15,
			lengthMm: 8,
			colorCode: "#a855f7",
			capColorRu: "Фиолетовый",
			nameRu: "30G × 8 мм (Экстракороткая STA, фиолетовая)",
			primaryIndicationsRu:
				"Компьютерная STA интралигаментарная и интрасептальная анестезия.",
			aspirationLumenSafety: "restricted_lumen",
			deflectionResistancePercent: 98,
		},
	};
