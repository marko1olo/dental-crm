/**
 * caliperDistanceMath.ts — Расчет физических расстояний и анатомической пригодности кости (Мандат 8b).
 */

import type { AlveolarRidgeCaliperMeasurement, Point2D, Point3D } from "./caliperTypes";

export function calculatePhysicalDistanceMm(
	p1: Point2D, p2: Point2D, imageWidthPx = 1000, imageHeightPx = 1000, pixelSpacingMm = 0.1,
): number {
	const dxPx = ((p2.x - p1.x) / 100) * imageWidthPx;
	const dyPx = ((p2.y - p1.y) / 100) * imageHeightPx;
	return Number((Math.hypot(dxPx, dyPx) * pixelSpacingMm).toFixed(2));
}

export function calculatePhysicalDistance3DMm(p1: Point3D, p2: Point3D): number {
	return Number(Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).toFixed(2));
}

export function evaluateAlveolarRidgeFeasibility(
	heightMm: number, crestWidthMm: number, midWidthMm?: number,
): AlveolarRidgeCaliperMeasurement["implantFeasibility"] {
	const safeHeight = Math.max(0, heightMm);
	const safeWidth = Math.max(0, crestWidthMm);

	if (safeHeight >= 10.0 && safeWidth >= 7.0) {
		const diam = safeWidth >= 8.0 ? 4.5 : 4.0;
		const len = safeHeight >= 12.0 ? 11.5 : 10.0;
		return {
			isAdequate: true, recommendedDiameterMm: diam, recommendedLengthMm: len,
			requiresBoneGrafting: false, graftingType: "none",
			clinicalAdviceRu: `Объем кости достаточен для классической имплантации (Ø${diam}x${len} мм). Первичная стабильность оптимальная.`,
		};
	}
	if (safeHeight >= 10.0 && safeWidth >= 5.0 && safeWidth < 7.0) {
		const requiresGraft = safeWidth < 5.8;
		return {
			isAdequate: true, recommendedDiameterMm: 3.5,
			recommendedLengthMm: safeHeight >= 11.5 ? 10.0 : 8.5,
			requiresBoneGrafting: requiresGraft, graftingType: requiresGraft ? "gbr_horizontal" : "none",
			clinicalAdviceRu: requiresGraft
				? "Узкий альвеолярный гребень: показана одновременная НКР (GBR) с костнозамещающим материалом и мембраной."
				: "Допустима установка узкого имплантата Ø3.5 мм без костной пластики.",
		};
	}
	if (safeHeight < 8.0 && safeWidth >= 6.5) {
		return {
			isAdequate: false, recommendedDiameterMm: 4.0, recommendedLengthMm: 8.0,
			requiresBoneGrafting: true, graftingType: "sinus_lift",
			clinicalAdviceRu: `Дефицит вертикальной высоты (${safeHeight.toFixed(1)} мм < 8.0 мм): требуется открытый/закрытый синус-лифтинг или вертикальная аугментация.`,
		};
	}
	if (safeWidth < 5.0 && safeHeight >= 8.0) {
		return {
			isAdequate: false, recommendedDiameterMm: 3.5, recommendedLengthMm: 10.0,
			requiresBoneGrafting: true, graftingType: "ridge_split",
			clinicalAdviceRu: `Выраженная горизонтальная резорбция (${safeWidth.toFixed(1)} мм): показано расщепление альвеолярного гребня (Ridge Split) или сэндвич-пластика.`,
		};
	}
	return {
		isAdequate: false, recommendedDiameterMm: 3.5, recommendedLengthMm: 8.0,
		requiresBoneGrafting: true, graftingType: "gbr_horizontal",
		clinicalAdviceRu: `Комбинированный дефицит кости (H=${safeHeight.toFixed(1)} мм, W=${safeWidth.toFixed(1)} мм): требуется предварительная 3D-реконструкция костной ткани.`,
	};
}

export function calculateCaliperRidgeDimensions(params: {
	id?: string; crestPoint: Point2D; basePoint: Point2D;
	crestWidthLeft?: Point2D; crestWidthRight?: Point2D;
	imageWidthPx?: number; imageHeightPx?: number; pixelSpacingMm?: number;
	fdiTooth?: string | null; label?: string;
}): AlveolarRidgeCaliperMeasurement {
	const imageWidthPx = params.imageWidthPx ?? 1000;
	const imageHeightPx = params.imageHeightPx ?? 1000;
	const pixelSpacingMm = params.pixelSpacingMm ?? 0.1;

	const heightMm = calculatePhysicalDistanceMm(params.crestPoint, params.basePoint, imageWidthPx, imageHeightPx, pixelSpacingMm);
	let crestWidthMm = 7.0;
	if (params.crestWidthLeft && params.crestWidthRight) {
		crestWidthMm = calculatePhysicalDistanceMm(params.crestWidthLeft, params.crestWidthRight, imageWidthPx, imageHeightPx, pixelSpacingMm);
	}
	const midWidthMm = Number((crestWidthMm * 1.18).toFixed(2));
	const baseWidthMm = Number((crestWidthMm * 1.35).toFixed(2));

	return {
		id: params.id || `caliper-${Date.now()}-${Math.abs(Math.round(heightMm * 10 + crestWidthMm * 10)).toString(36)}`,
		fdiTooth: params.fdiTooth ?? null,
		label: params.label || (params.fdiTooth ? `Штангенциркуль (Зуб ${params.fdiTooth})` : "Замер альвеолярного гребня"),
		crestPoint: params.crestPoint, basePoint: params.basePoint,
		crestWidthLeft: params.crestWidthLeft, crestWidthRight: params.crestWidthRight,
		heightMm, crestWidthMm, midWidthMm, baseWidthMm,
		implantFeasibility: evaluateAlveolarRidgeFeasibility(heightMm, crestWidthMm, midWidthMm),
	};
}
