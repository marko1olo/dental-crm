/**
 * VisiographMathLesions.ts
 * Periapical bone destruction area delineation and clinical classification.
 */

import {
	type Point2D,
	calculatePolygonArea,
	calculatePolygonPerimeter,
} from "./VisiographMathGeometry";
import { DEFAULT_PIXEL_SCALE_MM } from "./VisiographMathCalibration";

export type PeriapicalLesionClassification =
	| "granuloma"
	| "cyst"
	| "extensive_cyst"
	| "rarefying_osteitis";

export interface PeriapicalLesion {
	id: string;
	points: Point2D[];
	areaPx: number;
	areaMm2: number;
	perimeterPx: number;
	perimeterMm: number;
	equivalentDiameterMm: number;
	classification: PeriapicalLesionClassification;
	classificationLabel: string;
	clinicalDescription: string;
	treatmentRecommendation: string;
	fdiToothCode?: string | undefined;
	color?: string | undefined;
}

export function classifyPeriapicalLesionData(
	areaMm2: number,
	equivalentDiameterMm: number,
): {
	classification: PeriapicalLesionClassification;
	label: string;
	description: string;
	treatment: string;
} {
	if (equivalentDiameterMm < 5.0) {
		return {
			classification: "granuloma",
			label: "Периапикальная гранулема (Ø < 5.0 мм)",
			description: `Ограниченный очаг деструкции костной ткани округлой формы у верхушки корня (площадь: ${areaMm2.toFixed(1)} мм², экв. диаметр: ${equivalentDiameterMm.toFixed(1)} мм).`,
			treatment:
				"Консервативное эндодонтическое лечение: хемомеханическая обработка, временная обтурация гидроксидом кальция Ca(OH)2 на 14–21 день, постоянная обтурация гуттаперчей с силером.",
		};
	}
	if (equivalentDiameterMm < 10.0) {
		return {
			classification: "cyst",
			label: "Радикулярная кистогранулема / Киста корня (Ø 5.0–10.0 мм)",
			description: `Четко очерченный очаг разрежения костной ткани с ободком склероза у апекса корня (площадь: ${areaMm2.toFixed(1)} мм², экв. диаметр: ${equivalentDiameterMm.toFixed(1)} мм).`,
			treatment:
				"Первичная консервативная эндодонтическая терапия с динамическим рентген-контролем через 3–6 месяцев. При отсутствии регенерации — цистэктомия с резекцией верхушки корня (РВК) и ретроградным пломбированием МТА/Биодентин.",
		};
	}
	return {
		classification: "extensive_cyst",
		label: "Обширная радикулярная киста челюсти (Ø ≥ 10.0 мм)",
		description: `Крупное одонтогенное кистозное образование с выраженной резорбцией кортикальной пластинки (площадь: ${areaMm2.toFixed(1)} мм², экв. диаметр: ${equivalentDiameterMm.toFixed(1)} мм).`,
		treatment:
			"Хирургическое вмешательство: цистотомия или цистэктомия с остеопластическим замещением дефекта костным матриксом (ксенографт/аллографт) и барьерной мембраной под контролем гистологического исследования.",
	};
}

export const classifyPeriapicalLesion = classifyPeriapicalLesionData;

export function calculatePeriapicalLesion(
	points: Point2D[],
	scaleMmPerPixel = DEFAULT_PIXEL_SCALE_MM,
	fdiToothCode?: string,
	id?: string,
): PeriapicalLesion {
	const areaPx = calculatePolygonArea(points);
	const perimeterPx = calculatePolygonPerimeter(points);
	const areaMm2 = areaPx * (scaleMmPerPixel * scaleMmPerPixel);
	const perimeterMm = perimeterPx * scaleMmPerPixel;
	const equivalentDiameterMm = areaMm2 > 0 ? 2.0 * Math.sqrt(areaMm2 / Math.PI) : 0;
	const clinical = classifyPeriapicalLesionData(areaMm2, equivalentDiameterMm);

	return {
		id: id ?? `lesion-${Date.now()}-${Math.abs(Math.round(areaPx)).toString(36)}`,
		points: points.map((p) => ({ x: p.x, y: p.y })),
		areaPx,
		areaMm2,
		perimeterPx,
		perimeterMm,
		equivalentDiameterMm,
		classification: clinical.classification,
		classificationLabel: clinical.label,
		clinicalDescription: clinical.description,
		treatmentRecommendation: clinical.treatment,
		fdiToothCode,
		color: "#ff1744",
	};
}


