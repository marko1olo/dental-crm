import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

async function loadSeries(dirPath: string) {
	const files = readdirSync(dirPath).filter((f) => {
		const full = path.join(dirPath, f);
		return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
	});
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
	for (const f of files) {
		const full = path.join(dirPath, f);
		const buf = readFileSync(full);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		items.push({ buffer: arrayBuf, fileName: f });
	}
	return buildVolumeFromDicomBuffers(items);
}

interface ConnectedComponent {
	pixelCount: number;
	areaMm2: number;
	comX: number;
	comY: number;
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	circularity: number;
	aspectRatio: number;
	hasPulpOrFilling: boolean;
	minCoreHU: number;
	maxHU: number;
}

function findToothLikeComponents(slab: any, thresholdHU = 1100): ConnectedComponent[] {
	const { width, height, data, originMm, spacingMm } = slab;
	const spX = spacingMm.x;
	const spY = spacingMm.y;
	const pixelArea = spX * spY;

	const visited = new Uint8Array(width * height);
	const components: ConnectedComponent[] = [];

	for (let y = 5; y < height - 5; y++) {
		for (let x = 5; x < width - 5; x++) {
			const idx = y * width + x;
			if (visited[idx] || (data[idx] ?? -1000) < thresholdHU) continue;

			// Flood fill
			const queue = [idx];
			visited[idx] = 1;
			let count = 0;
			let sumX = 0;
			let sumY = 0;
			let sumX2 = 0;
			let sumY2 = 0;
			let sumXY = 0;
			let minVx = x, maxVx = x, minVy = y, maxVy = y;
			let maxHU = -1000;
			let perimeterPixels = 0;

			while (queue.length > 0) {
				const cur = queue.pop()!;
				const cy = Math.floor(cur / width);
				const cx = cur % width;
				const hu = data[cur] ?? -1000;
				if (hu > maxHU) maxHU = hu;

				count++;
				sumX += cx;
				sumY += cy;
				sumX2 += cx * cx;
				sumY2 += cy * cy;
				sumXY += cx * cy;

				if (cx < minVx) minVx = cx;
				if (cx > maxVx) maxVx = cx;
				if (cy < minVy) minVy = cy;
				if (cy > maxVy) maxVy = cy;

				// Check 4-neighborhood for boundary
				let isBoundary = false;
				for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
						const nidx = ny * width + nx;
						const nhu = data[nidx] ?? -1000;
						if (nhu >= thresholdHU) {
							if (!visited[nidx]) {
								visited[nidx] = 1;
								queue.push(nidx);
							}
						} else {
							isBoundary = true;
						}
					} else {
						isBoundary = true;
					}
				}
				if (isBoundary) perimeterPixels++;
			}

			const areaMm2 = count * pixelArea;
			// Tooth crown cross section is ~10 mm^2 to 120 mm^2 (diameter 3.5 mm to 12 mm)
			if (areaMm2 < 8.0 || areaMm2 > 180.0) continue;

			const avgX = sumX / count;
			const avgY = sumY / count;
			const comX = originMm.x + avgX * spX;
			const comY = originMm.y + avgY * spY;

			// Second central moments for principal axes & aspect ratio
			const u20 = sumX2 / count - avgX * avgX;
			const u02 = sumY2 / count - avgY * avgY;
			const u11 = sumXY / count - avgX * avgY;

			const common = Math.sqrt((u20 - u02) ** 2 + 4 * (u11 ** 2));
			const lambda1 = (u20 + u02 + common) / 2;
			const lambda2 = (u20 + u02 - common) / 2;
			const aspectRatio = lambda1 > 0 ? Math.sqrt(Math.max(0, lambda2) / lambda1) : 0;

			const perimeterMm = perimeterPixels * Math.sqrt(pixelArea);
			const circularity = perimeterMm > 0 ? (4 * Math.PI * areaMm2) / (perimeterMm * perimeterMm) : 0;

			// Sample core HU in a 1.2 mm radius around COM
			const coreR = Math.max(1, Math.round(1.2 / spX));
			let minCoreHU = 9999;
			let maxCoreHU = -1000;
			let coreCount = 0;
			for (let dy = -coreR; dy <= coreR; dy++) {
				for (let dx = -coreR; dx <= coreR; dx++) {
					const px = Math.round(avgX + dx);
					const py = Math.round(avgY + dy);
					if (px >= 0 && px < width && py >= 0 && py < height) {
						const chu = data[py * width + px] ?? -1000;
						if (chu < minCoreHU) minCoreHU = chu;
						if (chu > maxCoreHU) maxCoreHU = chu;
						coreCount++;
					}
				}
			}

			// Core is pulp (< 600 HU) or gutta-percha/filling (> 2000 HU)
			const hasPulpOrFilling = minCoreHU <= 650 || maxCoreHU >= 2200;

			components.push({
				pixelCount: count,
				areaMm2,
				comX,
				comY,
				minX: originMm.x + minVx * spX,
				maxX: originMm.x + maxVx * spX,
				minY: originMm.y + minVy * spY,
				maxY: originMm.y + maxVy * spY,
				circularity,
				aspectRatio,
				hasPulpOrFilling,
				minCoreHU,
				maxHU,
			});
		}
	}

	return components;
}

async function main() {
	const pSum = "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34";
	const volSum = await loadSeries(pSum);
	for (const z of [16.0, 17.0, 18.0, 19.0, 20.0, 21.0]) {
		const slabSum = extractAxialMIPSlab(volSum, z, 1.0, "average");
		const compsSum = findToothLikeComponents(slabSum, 1000);
		console.log(`\nSumarokova Z = ${z.toFixed(1)} mm: found ${compsSum.length} components:`);
		for (const c of compsSum) {
			console.log(`  pos=(${c.comX.toFixed(1)}, ${c.comY.toFixed(1)}) area=${c.areaMm2.toFixed(1)}mm² aspRatio=${c.aspectRatio.toFixed(2)} circ=${c.circularity.toFixed(2)} pulp=${c.hasPulpOrFilling}`);
		}
	}

	const pAm = "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT";
	const volAm = await loadSeries(pAm);
	console.log("\n=== Testing Amirova at Z = -9.0 mm ===");
	for (const z of [-6.0, -5.0, -4.0, -3.0, -2.0, -1.0, 0.0, 1.0, 2.0]) {
		const slabAm = extractAxialMIPSlab(volAm, z, 1.0, "average");
		const compsAm = findToothLikeComponents(slabAm, 1000);
		console.log(`\nZ = ${z.toFixed(1)} mm: found ${compsAm.length} components:`);
		for (const c of compsAm) {
			console.log(`  pos=(${c.comX.toFixed(1)}, ${c.comY.toFixed(1)}) area=${c.areaMm2.toFixed(1)}mm² aspRatio=${c.aspectRatio.toFixed(2)} circ=${c.circularity.toFixed(2)} pulp=${c.hasPulpOrFilling}`);
		}
	}
}

main().catch(console.error);
