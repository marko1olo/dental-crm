/**
 * enamelBeadsDetector.ts — извлечение физических центроидов бус эмали (HU >= 1150..1400)
 * с 2-проходным евклидовым преобразованием расстояний и кластеризацией бугров.
 * Mandate 8b: Модульность.
 */

import type { AxialMIPSlab } from "../cbctAutoArchTypes";
import type { EnamelBead } from "./honestArchTypes";

/**
 * Extracts true physical tooth enamel beads (HU >= 1150..1400) from axial slice/slab.
 * Uses 2-pass Euclidean distance transform to find local thickness maxima and clusters multi-cusp
 * crown peaks within 5.2 mm to resolve true individual tooth mass centers (cx, cy).
 * Formula: c_x = sum(x * HU) / sum(HU), c_y = sum(y * HU) / sum(HU).
 */
export function extractEnamelBeadsDistanceTransform(
	mip: AxialMIPSlab,
	huThreshold = 1150,
): EnamelBead[] {
	const { width, height, data, originMm, spacingMm } = mip;
	const spX = spacingMm.x || 0.25;
	const spY = spacingMm.y || 0.25;

	const mask = new Uint8Array(width * height);
	for (let i = 0; i < width * height; i++) {
		if ((data[i] ?? -1000) >= huThreshold) mask[i] = 1;
	}

	const dist = new Float32Array(width * height);
	for (let i = 0; i < width * height; i++) dist[i] = mask[i] ? 999 : 0;

	// Forward pass
	for (let y = 1; y < height; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			if (dist[idx]! > 0) {
				dist[idx] = Math.min(
					dist[idx]!,
					dist[idx - 1]! + 1,
					dist[(y - 1) * width + x]! + 1,
					dist[(y - 1) * width + x - 1]! + 1.414,
					dist[(y - 1) * width + x + 1]! + 1.414,
				);
			}
		}
	}
	// Backward pass
	for (let y = height - 2; y >= 0; y--) {
		for (let x = width - 2; x >= 1; x--) {
			const idx = y * width + x;
			if (dist[idx]! > 0) {
				dist[idx] = Math.min(
					dist[idx]!,
					dist[idx + 1]! + 1,
					dist[(y + 1) * width + x]! + 1,
					dist[(y + 1) * width + x - 1]! + 1.414,
					dist[(y + 1) * width + x + 1]! + 1.414,
				);
			}
		}
	}

	const minThicknessVox = Math.max(2, Math.round(0.7 / spX));
	const searchR = Math.max(2, Math.round(0.8 / spX));
	const rawPeaks: EnamelBead[] = [];

	const margin = Math.max(2, Math.round(0.2 / spX));
	for (let y = margin; y < height - margin; y++) {
		for (let x = margin; x < width - margin; x++) {
			const idx = y * width + x;
			const dVal = dist[idx]!;
			if (dVal < minThicknessVox) continue;

			let isMax = true;
			const rLimY = Math.min(y, height - 1 - y, searchR);
			const rLimX = Math.min(x, width - 1 - x, searchR);

			for (let dy = -rLimY; dy <= rLimY; dy++) {
				for (let dx = -rLimX; dx <= rLimX; dx++) {
					if (dx === 0 && dy === 0) continue;
					if (dist[(y + dy) * width + (x + dx)]! > dVal) {
						isMax = false;
						break;
					}
				}
				if (!isMax) break;
			}

			if (isMax) {
				const winR = Math.round(3.5 / spX);
				let sumHU = 0;
				let sumHUX = 0;
				let sumHUY = 0;
				let sumX = 0;
				let sumY = 0;
				let sumX2 = 0;
				let sumY2 = 0;
				let sumXY = 0;
				let count = 0;
				let perimCount = 0;
				let maxHU = data[idx] ?? -1000;

				for (let wy = Math.max(0, y - winR); wy <= Math.min(height - 1, y + winR); wy++) {
					const rowOff = wy * width;
					for (let wx = Math.max(0, x - winR); wx <= Math.min(width - 1, x + winR); wx++) {
						const distCenter = Math.hypot(wx - x, wy - y) * spX;
						if (distCenter > 3.8) continue;

						const vHu = data[rowOff + wx] ?? -1000;
						if (vHu >= 1050) {
							const w = Math.max(1, vHu);
							sumHU += w;
							sumHUX += w * (originMm.x + wx * spX);
							sumHUY += w * (originMm.y + wy * spY);
							sumX += wx;
							sumY += wy;
							sumX2 += wx * wx;
							sumY2 += wy * wy;
							sumXY += wx * wy;
							count++;
							if (vHu > maxHU) maxHU = vHu;

							const deltas: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
							for (const [pdx, pdy] of deltas) {
								const nx = wx + pdx;
								const ny = wy + pdy;
								if (nx < 0 || nx >= width || ny < 0 || ny >= height || (data[ny * width + nx] ?? -1000) < 1050) {
									perimCount++;
									break;
								}
							}
						}
					}
				}

				if (count < 8) continue;
				const pixelArea = spX * spY;
				const areaMm2 = count * pixelArea;
				if (areaMm2 < 5.0 || areaMm2 > 200.0) continue;

				const avgX = sumX / count;
				const avgY = sumY / count;
				const u20 = sumX2 / count - avgX * avgX;
				const u02 = sumY2 / count - avgY * avgY;
				const u11 = sumXY / count - avgX * avgY;
				const common = Math.sqrt((u20 - u02) ** 2 + 4 * (u11 ** 2));
				const l1 = (u20 + u02 + common) / 2;
				const l2 = (u20 + u02 - common) / 2;
				const aspectRatio = l1 > 0 ? Math.sqrt(Math.max(0, l2) / l1) : 0;

				const perimMm = perimCount * Math.sqrt(pixelArea);
				const circularity = perimMm > 0 ? (4 * Math.PI * areaMm2) / (perimMm * perimMm) : 0;

				// Cortical bone stripe elimination: long narrow stripes (circ < 0.25, asp < 0.30)
				if (circularity < 0.25 && aspectRatio < 0.30) continue;
				if (circularity < 0.14) continue;

				// Core sampling for pulp cavity or canal filling
				const coreR = Math.max(1, Math.round(1.2 / spX));
				let minCoreHU = 9999;
				let maxCoreHU = -1000;
				for (let cdy = -coreR; cdy <= coreR; cdy++) {
					for (let cdx = -coreR; cdx <= coreR; cdx++) {
						const px = Math.round(avgX + cdx);
						const py = Math.round(avgY + cdy);
						if (px >= 0 && px < width && py >= 0 && py < height) {
							const chu = data[py * width + px] ?? -1000;
							if (chu < minCoreHU) minCoreHU = chu;
							if (chu > maxCoreHU) maxCoreHU = chu;
						}
					}
				}
				const hasPulp = minCoreHU <= 650 || maxCoreHU >= 2200;

				const comX = sumHU > 0 ? sumHUX / sumHU : originMm.x + x * spX;
				const comY = sumHU > 0 ? sumHUY / sumHU : originMm.y + y * spY;

				rawPeaks.push({
					wx: comX,
					wy: comY,
					dMm: dVal * spX,
					hu: maxHU,
					weight: sumHU,
					count: 1,
					areaMm2,
					circularity,
					aspectRatio,
					hasPulp,
				});
			}
		}
	}

	rawPeaks.sort((a, b) => b.weight - a.weight);

	const clustered: EnamelBead[] = [];
	for (const p of rawPeaks) {
		const existing = clustered.find((c) => {
			const distMm = Math.hypot(c.wx - p.wx, c.wy - p.wy);
			if (distMm <= 3.2) return true;
			if (c.wy >= -5.0 && p.wy >= -5.0 && distMm <= 6.2 && Math.abs(c.wy - p.wy) <= 4.0) {
				return true;
			}
			return false;
		});

		if (!existing) {
			clustered.push({ ...p });
		} else {
			const wTotal = existing.weight + p.weight;
			existing.wx = (existing.wx * existing.weight + p.wx * p.weight) / wTotal;
			existing.wy = (existing.wy * existing.weight + p.wy * p.weight) / wTotal;
			existing.hu = Math.max(existing.hu, p.hu);
			existing.dMm = Math.max(existing.dMm, p.dMm);
			existing.areaMm2 = Math.max(existing.areaMm2 ?? 0, p.areaMm2 ?? 0);
			existing.circularity = Math.max(existing.circularity ?? 0, p.circularity ?? 0);
			existing.aspectRatio = Math.max(existing.aspectRatio ?? 0, p.aspectRatio ?? 0);
			existing.hasPulp = existing.hasPulp || p.hasPulp;
			existing.weight = wTotal;
			existing.count += 1;
		}
	}

	return clustered.map((c) => ({
		wx: Number(c.wx.toFixed(2)),
		wy: Number(c.wy.toFixed(2)),
		hu: c.hu,
		dMm: Number(c.dMm.toFixed(2)),
		weight: c.weight,
		count: c.count,
		areaMm2: c.areaMm2 !== undefined ? Number(c.areaMm2.toFixed(1)) : undefined,
		circularity: c.circularity !== undefined ? Number(c.circularity.toFixed(2)) : undefined,
		aspectRatio: c.aspectRatio !== undefined ? Number(c.aspectRatio.toFixed(2)) : undefined,
		hasPulp: c.hasPulp,
	}));
}
