import type { AlveolarRidgeMeasurementResult, CrossSectionSliceData } from "./types";

export function measureAlveolarRidgeCrossSection(
	crossSection: CrossSectionSliceData,
	crestDepthMm = 2.0,
): AlveolarRidgeMeasurementResult | null {
	if (!crossSection || !crossSection.pixelData || crossSection.pixelData.length === 0) {
		return null;
	}

	if (
		typeof crossSection.corticalCrestHeightMm === "number" &&
		typeof crossSection.alveolarRidgeWidthMm === "number" &&
		crossSection.corticalCrestHeightMm > 0 &&
		crossSection.alveolarRidgeWidthMm > 0
	) {
		const h = Number(crossSection.corticalCrestHeightMm.toFixed(1));
		const w = Number(crossSection.alveolarRidgeWidthMm.toFixed(1));
		const isAdequate = h >= 10.0 && w >= 6.0;
		return {
			heightMm: h,
			crestWidthMm: w,
			midWidthMm: Number((w * 1.15).toFixed(1)),
			baseWidthMm: Number((w * 1.35).toFixed(1)),
			isAdequateForImplant: isAdequate,
			clinicalAdviceRu: isAdequate
				? `Объем кости в зоне FDI #${crossSection.nearestToothFdi} достаточен для стандартного имплантата.`
				: `Внимание: Дефицит альвеолярного гребня в зоне FDI #${crossSection.nearestToothFdi}. Показана аугментация.`,
		};
	}

	const widthPx = crossSection.widthPx;
	const heightPx = crossSection.heightPx;
	const spacing = crossSection.pixelSpacingMm || 0.25;
	const pixelData = crossSection.pixelData;

	let minBoneY = -1;
	let maxBoneY = -1;
	const rowWidths: number[] = new Array(heightPx).fill(0);

	for (let y = 0; y < heightPx; y++) {
		let minX = -1;
		let maxX = -1;
		const rowOffset = y * widthPx * 4;
		for (let x = 0; x < widthPx; x++) {
			const val = pixelData[rowOffset + x * 4]!;
			if (val >= 40) {
				if (minX === -1) minX = x;
				maxX = x;
			}
		}
		if (minX !== -1 && maxX >= minX) {
			if (minBoneY === -1) minBoneY = y;
			maxBoneY = y;
			rowWidths[y] = (maxX - minX + 1) * spacing;
		}
	}

	if (minBoneY === -1 || maxBoneY <= minBoneY) {
		return null;
	}

	const measuredHeight = Number(((maxBoneY - minBoneY) * spacing).toFixed(1));
	if (measuredHeight < 2.0) {
		return null;
	}

	const crestOffsetPx = Math.min(maxBoneY - minBoneY, Math.round(crestDepthMm / spacing));
	const crestY = minBoneY + crestOffsetPx;
	const midY = minBoneY + Math.round((maxBoneY - minBoneY) * 0.5);
	const baseY = Math.max(minBoneY, maxBoneY - Math.round(1.0 / spacing));

	const measuredCrestWidth = Number((rowWidths[crestY] || rowWidths[minBoneY] || 0).toFixed(1));
	const measuredMidWidth = Number((rowWidths[midY] || measuredCrestWidth).toFixed(1));
	const measuredBaseWidth = Number((rowWidths[baseY] || measuredMidWidth).toFixed(1));

	if (measuredCrestWidth <= 0) {
		return null;
	}

	const isAdequate = measuredHeight >= 10.0 && measuredCrestWidth >= 6.0;

	return {
		heightMm: measuredHeight,
		crestWidthMm: measuredCrestWidth,
		midWidthMm: measuredMidWidth,
		baseWidthMm: measuredBaseWidth,
		isAdequateForImplant: isAdequate,
		clinicalAdviceRu: isAdequate
			? `Объем кости в зоне FDI #${crossSection.nearestToothFdi} достаточен для стандартного имплантата.`
			: `Внимание: Дефицит альвеолярного гребня в зоне FDI #${crossSection.nearestToothFdi}. Показана аугментация.`,
	};
}
