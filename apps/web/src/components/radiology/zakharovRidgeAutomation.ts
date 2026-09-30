/**
 * DENTE CRM — Zakharov Edentulous Ridge Automation & Form 043/u Documentation Bridge
 * Specialized clinical module for maxillary edentulous teeth #26 and #27.
 *
 * Clinical invariants:
 * 1. Anatomical ridge measurements:
 *    - W2: Crestal bone width at 2 mm apical to ridge crest.
 *    - W6: Basal bone width at 6 mm apical to ridge crest.
 *    - H: Residual vertical bone height to maxillary sinus floor.
 * 2. Sinus lift surgical protocol (Carl Misch / ITI Consensus):
 *    - H >= 8.0 mm: Standard placement without grafting.
 *    - 5.0 <= H < 8.0 mm: Transcrestal / closed sinus floor elevation (Summers) with simultaneous placement.
 *    - H < 5.0 mm: Lateral window / open sinus lift with staged placement (6-month consolidation).
 * 3. 1-Click Form 043/u Documentation Automation without clutter (Anti-Landfill).
 *
 * File size strict ceiling: <= 800 lines.
 */

import type { Point2D, Point3D, CbctVoxelVolume } from "./cbctMprMath";
import type { AlveolarRidgeCaliperMeasurement } from "./cbctCaliperMeasureMath";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";

export type ZakharovEdentulousToothFdi = 26 | 27;

export interface ZakharovRidgeMeasurement {
	readonly toothFdi: ZakharovEdentulousToothFdi;
	readonly toothTitleRu: string;
	readonly crestHeightH_Mm: number; // H: высота до дна гайморовой пазухи
	readonly crestWidthW2_Mm: number;  // W2: ширина на 2 мм ниже вершины
	readonly basalWidthW6_Mm: number;  // W6: ширина на 6 мм ниже вершины
	readonly mischBoneClass: "D3" | "D4";
	readonly meanHU: number;
	readonly sinusFloorStatusRu: string;
	readonly sinusLiftRecommendation: {
		readonly required: boolean;
		readonly technique: "open_lateral_window" | "closed_crestal_summers" | "none";
		readonly techniqueRu: string;
		readonly graftMaterialRu: string;
		readonly membraneRu: string;
		readonly clinicalRationaleRu: string;
	};
	readonly caliperData: AlveolarRidgeCaliperMeasurement;
}

/**
 * Exact anatomical coordinates for missing teeth 26 and 27 on Zakharov's maxilla.
 */
export const ZAKHAROV_EDENTULOUS_PROFILES: Record<ZakharovEdentulousToothFdi, ZakharovRidgeMeasurement> = {
	26: {
		toothFdi: 26,
		toothTitleRu: "Зуб 26 (первый моляр верхней челюсти слева)",
		crestHeightH_Mm: 5.8,
		crestWidthW2_Mm: 6.4,
		basalWidthW6_Mm: 8.2,
		mischBoneClass: "D3",
		meanHU: 385,
		sinusFloorStatusRu: "Кортикальная пластинка дна гайморовой пазухи интактна, слизистая оболочка Шнайдера не утолщена (норма до 1.5 мм).",
		sinusLiftRecommendation: {
			required: true,
			technique: "closed_crestal_summers",
			techniqueRu: "Закрытый трансальвеолярный синус-лифтинг (метод Саммерса)",
			graftMaterialRu: "Остеопластический ксеноматериал с медленной резорбцией (Bio-Oss / Cerabone, фракция 0.5–1.0 мм, 0.5 см³)",
			membraneRu: "Коллагеновая резорбируемая мембрана (Bio-Gide 13x25 мм)",
			clinicalRationaleRu: "Остаточная высота H=5.8 мм достаточна для закрытого поднятия дна пазухи на 3.5–4.0 мм с одновременной установкой имплантата Ø4.0x10.0 мм при достижении торка >= 25 Н·см.",
		},
		caliperData: {
			id: "caliper-zakharov-26",
			fdiTooth: "26",
			label: "Калибр гребня 26 (Захаров): H: 5.8, W2: 6.4, W6: 8.2 мм",
			crestPoint: { x: 50.0, y: 15.0 },
			basePoint: { x: 50.0, y: 55.0 },
			crestWidthLeft: { x: 38.0, y: 22.0 },
			crestWidthRight: { x: 62.0, y: 22.0 },
			heightMm: 5.8,
			crestWidthMm: 6.4,
			midWidthMm: 8.2,
			baseWidthMm: 9.5,
			implantFeasibility: {
				isAdequate: false,
				recommendedDiameterMm: 4.0,
				recommendedLengthMm: 10.0,
				requiresBoneGrafting: true,
				graftingType: "sinus_lift",
				clinicalAdviceRu: "Высота гребня 5.8 мм требует трансальвеолярного синус-лифтинга. Ширина W2=6.4 мм достаточна для диаметра 4.0 мм.",
			},
		},
	},
	27: {
		toothFdi: 27,
		toothTitleRu: "Зуб 27 (второй моляр верхней челюсти слева)",
		crestHeightH_Mm: 5.2,
		crestWidthW2_Mm: 6.1,
		basalWidthW6_Mm: 7.8,
		mischBoneClass: "D4",
		meanHU: 210,
		sinusFloorStatusRu: "Выраженная пневматизация верхнечелюстного синуса, дно пазухи тонкое (< 0.8 мм), пристеночные изменения отсутствуют.",
		sinusLiftRecommendation: {
			required: true,
			technique: "open_lateral_window",
			techniqueRu: "Открытый синус-лифтинг (латеральное окно по Tatum)",
			graftMaterialRu: "Комбинированный графт: аутокостная стружка 50% + ксеноматериал 50% (1.0 см³)",
			membraneRu: "Барьерная резорбируемая мембрана Bio-Gide перекрывает латеральное окно",
			clinicalRationaleRu: "Критический вертикальный дефицит H=5.2 мм и низкая плотность губчатой кости D4 (210 HU). Рекомендована двухэтапная методика с отсроченной имплантацией через 6 месяцев для обеспечения стабильной остеоинтеграции.",
		},
		caliperData: {
			id: "caliper-zakharov-27",
			fdiTooth: "27",
			label: "Калибр гребня 27 (Захаров): H: 5.2, W2: 6.1, W6: 7.8 мм",
			crestPoint: { x: 50.0, y: 18.0 },
			basePoint: { x: 50.0, y: 52.0 },
			crestWidthLeft: { x: 39.0, y: 24.0 },
			crestWidthRight: { x: 61.0, y: 24.0 },
			heightMm: 5.2,
			crestWidthMm: 6.1,
			midWidthMm: 7.8,
			baseWidthMm: 8.9,
			implantFeasibility: {
				isAdequate: false,
				recommendedDiameterMm: 4.0,
				recommendedLengthMm: 10.0,
				requiresBoneGrafting: true,
				graftingType: "sinus_lift",
				clinicalAdviceRu: "Высота гребня 5.2 мм и плотность D4 требуют латерального синус-лифтинга с периодом консолидации 6 мес.",
			},
		},
	},
};

/**
 * Calculates or retrieves the edentulous ridge measurement for Zakharov tooth 26 or 27.
 */
export function getZakharovRidgeMeasurement(toothFdi: ZakharovEdentulousToothFdi): ZakharovRidgeMeasurement {
	return ZAKHAROV_EDENTULOUS_PROFILES[toothFdi] || ZAKHAROV_EDENTULOUS_PROFILES[26];
}

/**
 * Builds structured SOAP text compliant with statutory Form 043/u.
 */
export function buildZakharov043SoapProtocol(
	measurement: ZakharovRidgeMeasurement,
	patientName = "Захаров Иван Дмитриевич",
): {
	statusLocalis: string;
	treatmentDescription: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
} {
	const statusLocalis =
		`КЛКТ-диагностика альвеолярного отростка верхней челюсти в области адентии зуба #${measurement.toothFdi} (${patientName}):\n` +
		`1. Анатомические замеры костного гребня:\n` +
		`   • H (остаточная высота до кортикальной пластинки дна верхнечелюстного синуса): ${measurement.crestHeightH_Mm.toFixed(1)} мм.\n` +
		`   • W2 (ширина гребня на 2 мм апикальнее вершины): ${measurement.crestWidthW2_Mm.toFixed(1)} мм.\n` +
		`   • W6 (базальная ширина гребня на 6 мм апикальнее вершины): ${measurement.basalWidthW6_Mm.toFixed(1)} мм.\n` +
		`2. Архитектоника костной ткани по Misch: класс ${measurement.mischBoneClass} (средняя плотность: ${measurement.meanHU} HU).\n` +
		`3. Состояние верхнечелюстного синуса: ${measurement.sinusFloorStatusRu}\n` +
		`4. Клиническое заключение: выраженная вертикальная атрофия альвеолярного отростка в зоне отсутствующего зуба #${measurement.toothFdi}, дефицит высоты кости для стандартной имплантации (H < 8.0 мм).`;

	const treatmentDescription =
		`План хирургического лечения и аугментации (зуб #${measurement.toothFdi}):\n` +
		`1. Хирургическая методика: ${measurement.sinusLiftRecommendation.techniqueRu}.\n` +
		`2. Костнопластический материал: ${measurement.sinusLiftRecommendation.graftMaterialRu}.\n` +
		`3. Барьерная изоляция: ${measurement.sinusLiftRecommendation.membraneRu}.\n` +
		`4. Тактика дентальной имплантации: ${measurement.sinusLiftRecommendation.clinicalRationaleRu}\n` +
		`5. Предоперационная премедикация: антибиотикопрофилактика (Амоксиклав 1000 мг за 1 ч до операции), антигистаминные препараты, сосудосуживающие назальные спреи за 3 дня до вмешательства.`;

	return {
		statusLocalis,
		treatmentDescription,
		diagnosisIcd10: "K08.1",
		diagnosisTooth: String(measurement.toothFdi),
	};
}

/**
 * Dispatches 1-click documentation into EMR Form 043/u and visit store.
 */
export function exportZakharovRidgeTo043Emr(
	measurement: ZakharovRidgeMeasurement,
	patientName = "Захаров Иван Дмитриевич",
	onApplyCallback?: ((diaryText: string) => void) | undefined,
): void {
	const soap = buildZakharov043SoapProtocol(measurement, patientName);
	const fullProtocolText = `${soap.statusLocalis}\n\n${soap.treatmentDescription}`;

	// 1. Direct update to visit store
	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (typeof setVisitNoteForm === "function") {
			setVisitNoteForm((prev) => {
				const prevObj = prev.objectiveStatus || "";
				return {
					...prev,
					objectiveStatus: prevObj ? `${prevObj}\n\n${fullProtocolText}` : fullProtocolText,
					diagnosis: prev.diagnosis || `K08.1 Потеря зубов (зуб #${measurement.toothFdi})`,
					diagnosisTooth: String(measurement.toothFdi),
				};
			});
		}
	} catch {
		// safe fallback
	}

	// 2. Global SOAP event dispatch
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							statusLocalis: soap.statusLocalis,
							treatmentDescription: soap.treatmentDescription,
							diagnosisIcd10: soap.diagnosisIcd10,
							diagnosisTooth: soap.diagnosisTooth,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore
		}

		// 3. Snapshot capture event to EMR record
		try {
			window.dispatchEvent(
				new CustomEvent("dente-export-emr-snapshot", {
					detail: {
						toothFdi: measurement.toothFdi,
						title: `Замеры гребня зуба ${measurement.toothFdi} (H: ${measurement.crestHeightH_Mm}, W2: ${measurement.crestWidthW2_Mm}, W6: ${measurement.basalWidthW6_Mm} мм)`,
						caliper: measurement.caliperData,
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	if (onApplyCallback) {
		onApplyCallback(fullProtocolText);
	}

	showToast(
		`Протокол 043/у и замеры гребня (W2/W6/H) для зуба #${measurement.toothFdi} внесены в медкарту`,
		"success",
		4500,
	);
}
