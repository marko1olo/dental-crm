/**
 * anteriorApexDetector.ts — робастная аналитическая детекция резцового апекса и сагиттальной средней линии.
 * Mandate 8b: Модульность.
 */

import type { Point2D } from "../cbctCaliperNerveMath";
import type { AxialMIPSlab } from "../cbctAutoArchTypes";
import { sampleMipHUContinuous } from "../cbctAutoArchTypes";

/**
 * Robust analytical detection of the anterior incisor apex and patient sagittal midline.
 * Finds central incisor enamel clusters (HU >= 1400) and calculates the true 2D center-of-mass (COM)
 * of the incisor enamel/dentin ring to position the apex on the incisal line, eliminating vestibular drift.
 */
export function findAnteriorArchApexRobust(
	mip: AxialMIPSlab,
	_jawType: "mandible" | "maxilla" = "mandible",
): { apex: Point2D; midlineX: number } {
	const { width, height, originMm, spacingMm, data } = mip;
	const spX = spacingMm.x || 0.25;
	const spY = spacingMm.y || 0.25;

	const fovMarginX = Math.min(14.0, (width * spX) * 0.10);
	const fovMarginY = Math.min(14.0, (height * spY) * 0.10);
	const minY = originMm.y + fovMarginY;
	const maxY = originMm.y + height * spY - fovMarginY;
	const minX = originMm.x + fovMarginX;
	const maxX = originMm.x + width * spX - fovMarginX;

	let sumWeight = 0;
	let sumWeightX = 0;
	const anteriorMaxY = minY + (maxY - minY) * 0.45;
	for (let y = 0; y < height; y += 4) {
		const worldY = originMm.y + y * spY;
		if (worldY < minY || worldY > anteriorMaxY) continue;
		const rowOffset = y * width;
		for (let x = 0; x < width; x += 4) {
			const hu = data[rowOffset + x] ?? -1000;
			if (hu >= 600) {
				const w = Math.min(hu - 500, 2000);
				sumWeight += w;
				sumWeightX += w * (originMm.x + x * spX);
			}
		}
	}
	const midlineX = sumWeight > 50 ? sumWeightX / sumWeight : 0.0;

	let bestY = Infinity;
	let foundEnamel = false;

	for (let y = 0; y < height; y++) {
		const worldY = originMm.y + y * spY;
		if (worldY < minY || worldY > maxY) continue;

		let rowEnamel = 0;
		const rowOffset = y * width;

		for (let x = 0; x < width; x++) {
			const worldX = originMm.x + x * spX;
			if (worldX < minX || worldX > maxX) continue;
			if (Math.abs(worldX - midlineX) > 12.0) continue;
			const hu = data[rowOffset + x] ?? -1000;
			if (hu >= 1400) rowEnamel++;
		}

		if (rowEnamel >= 3) {
			let nextRowEnamel = 0;
			if (y + 1 < height) {
				const nextOffset = (y + 1) * width;
				for (let x = 0; x < width; x++) {
					const worldX = originMm.x + x * spX;
					if (Math.abs(worldX - midlineX) <= 12.0 && (data[nextOffset + x] ?? -1000) >= 1300) {
						nextRowEnamel++;
					}
				}
			}

			if (nextRowEnamel >= 2 && worldY < bestY) {
				bestY = worldY;
				foundEnamel = true;
				break;
			}
		}
	}

	if (foundEnamel && bestY < Infinity) {
		let incisorSumW = 0;
		let incisorSumWX = 0;
		let incisorSumWY = 0;

		for (let sy = bestY; sy <= bestY + 8.0; sy += spY) {
			for (let sx = midlineX - 10.0; sx <= midlineX + 10.0; sx += spX) {
				const hu = sampleMipHUContinuous(mip, sx, sy);
				if (hu >= 1200) {
					const w = hu;
					incisorSumW += w;
					incisorSumWX += w * sx;
					incisorSumWY += w * sy;
				}
			}
		}

		if (incisorSumW > 50) {
			const comX = incisorSumWX / incisorSumW;
			const comY = incisorSumWY / incisorSumW;
			return {
				apex: { x: Number(comX.toFixed(2)), y: Number(comY.toFixed(2)) },
				midlineX: Number(comX.toFixed(2)),
			};
		}

		return {
			apex: { x: Number(midlineX.toFixed(2)), y: Number(bestY.toFixed(2)) },
			midlineX,
		};
	}

	// Fallback to cortical bone crest for edentulous anterior jaws
	for (let y = 0; y < height; y++) {
		const worldY = originMm.y + y * spY;
		if (worldY < minY || worldY > maxY) continue;

		let rowBone = 0;
		const rowOffset = y * width;

		for (let x = 0; x < width; x++) {
			const worldX = originMm.x + x * spX;
			if (worldX < minX || worldX > maxX) continue;
			if (Math.abs(worldX - midlineX) > 12.0) continue;
			const hu = data[rowOffset + x] ?? -1000;
			if (hu >= 380) rowBone++;
		}

		if (rowBone >= 3 && worldY < bestY) {
			bestY = worldY;
			break;
		}
	}

	if (bestY < Infinity) {
		let crestW = 0;
		let crestWX = 0;
		for (let sy = bestY; sy <= bestY + 8.0; sy += spY) {
			for (let sx = midlineX - 12.0; sx <= midlineX + 12.0; sx += spX) {
				const hu = sampleMipHUContinuous(mip, sx, sy);
				if (hu >= 380) {
					const w = hu;
					crestW += w;
					crestWX += w * sx;
				}
			}
		}
		const crestComX = crestW > 50 ? crestWX / crestW : midlineX;
		return {
			apex: { x: Number(crestComX.toFixed(2)), y: Number(bestY.toFixed(2)) },
			midlineX: Number(crestComX.toFixed(2)),
		};
	}

	const apexY = bestY < Infinity ? bestY : originMm.y + height * spY * 0.25;
	return {
		apex: { x: Number(midlineX.toFixed(2)), y: Number(apexY.toFixed(2)) },
		midlineX,
	};
}
