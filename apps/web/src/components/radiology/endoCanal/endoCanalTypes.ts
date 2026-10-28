/**
 * DENTE CRM — Endodontic Root Canal Curvature Types & Classification
 * Standards: Schneider (1971), ESE, Mandate 8b (<= 120 lines).
 */

import type { Point3D } from "../cbctCaliperMeasureMath";

export type EndoCurvatureGrade = "straight" | "moderate" | "severe";

export interface EndoCanalMeasurement {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly orificeMm: Point3D;
	readonly apexMm: Point3D;
	readonly inflectionMm?: Point3D | undefined;
	readonly lengthMm: number;
	readonly coronalLengthMm: number;
	readonly apicalLengthMm: number;
	readonly schneiderAngleDeg: number;
	readonly curvatureGrade: EndoCurvatureGrade;
	readonly curvatureGradeRu: string;
	readonly clinicalAdviceRu: string;
	readonly fdiTooth?: string | null | undefined;
	readonly canalName?: string | undefined;
	readonly label?: string | undefined;
}

export function classifySchneiderCurvature(angleDeg: number): {
	readonly grade: EndoCurvatureGrade;
	readonly labelRu: string;
	readonly clinicalAdviceRu: string;
} {
	const angle = Math.max(0, Number(angleDeg.toFixed(1)));
	if (angle <= 5.0) {
		return {
			grade: "straight",
			labelRu: "Прямой (0–5°)",
			clinicalAdviceRu: "Прямой канал: минимальный риск поломки инструмента. Стандартный протокол препарирования.",
		};
	}
	if (angle <= 25.0) {
		return {
			grade: "moderate",
			labelRu: "Средний изгиб (10–25°)",
			clinicalAdviceRu: "Умеренный изгиб: рекомендуются гибкие Ni-Ti файлы с контролируемой памятью формы (CM-Wire), обильная ирригация.",
		};
	}
	return {
		grade: "severe",
		labelRu: "Сильно искривленный (>25°)",
		clinicalAdviceRu: "Выраженное искривление: высокий риск блокировки (ledge) и отлома инструмента! Требуется создание ковровой дорожки (Glide path .02) и реципрокная обработка.",
	};
}
