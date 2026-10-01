import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

async function loadPatient(cfg: { name: string; type: string; path: string }) {
	if (cfg.type === "multiframe") {
		const buf = readFileSync(cfg.path);
		return buildVolumeFromMultiFrameDicom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
	} else {
		const files = readdirSync(cfg.path).filter((f) => {
			const full = path.join(cfg.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
		for (const f of files) {
			const full = path.join(cfg.path, f);
			const buf = readFileSync(full);
			items.push({ buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: f });
		}
		return buildVolumeFromDicomBuffers(items);
	}
}

export interface MorphologicalToothBead {
	wx: number;
	wy: number;
	hu: number;
	areaMm2: number;
	circularity: number;
	aspectRatio: number;
	hasPulp: boolean;
	weight: number;
}

export function extractMorphologicalToothBeads(slab: any, huThreshold = 1050): MorphologicalToothBead[] {
	const { width, height, data, originMm, spacingMm } = slab;
	const spX = spacingMm.x || 0.25;
	const spY = spacingMm.y || 0.25;
	const pixelArea = spX * spY;

	const visited = new Uint8Array(width * height);
	const rawBeads: MorphologicalToothBead[] = [];

	for (let y = 3; y < height - 3; y++) {
		for (let x = 3; x < width - 3; x++) {
			const idx = y * width + x;
			if (visited[idx] || (data[idx] ?? -1000) < huThreshold) continue;

			// Flood fill
			const queue = [idx];
			visited[idx] = 1;
			let count = 0;
			let sumHU = 0;
			let sumHUX = 0;
			let sumHUY = 0;
			let sumX2 = 0;
			let sumY2 = 0;
			let sumXY = 0;
			let maxHU = -1000;
			let perimeterPixels = 0;

			while (queue.length > 0) {
				const cur = queue.pop()!;
				const cy = Math.floor(cur / width);
				const cx = cur % width;
				const hu = data[cur] ?? -1000;
				if (hu > maxHU) maxHU = hu;

				const w = Math.max(1, hu);
				sumHU += w;
				sumHUX += w * (originMm.x + cx * spX);
				sumHUY += w * (originMm.y + cy * spY);
				sumX2 += cx * cx;
				sumY2 += cy * cy;
				sumXY += cx * cy;
				count++;

				for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
						const nidx = ny * width + nx;
						if ((data[nidx] ?? -1000) >= huThreshold) {
							if (!visited[nidx]) {
								visited[nidx] = 1;
								queue.push(nidx);
							}
						} else {
							perimeterPixels++;
						}
					} else {
						perimeterPixels++;
					}
				}
			}

			const areaMm2 = count * pixelArea;
			// Tooth cross-section area: typically 8 mm^2 (incisors) to 140 mm^2 (large molars)
			if (areaMm2 < 6.0 || areaMm2 > 170.0) continue;

			const avgX = (sumHUX / sumHU - originMm.x) / spX;
			const avgY = (sumHUY / sumHU - originMm.y) / spY;
			const u20 = sumX2 / count - avgX * avgX;
			const u02 = sumY2 / count - avgY * avgY;
			const u11 = sumXY / count - avgX * avgY;

			const common = Math.sqrt((u20 - u02) ** 2 + 4 * (u11 ** 2));
			const lambda1 = (u20 + u02 + common) / 2;
			const lambda2 = (u20 + u02 - common) / 2;
			const aspectRatio = lambda1 > 0 ? Math.sqrt(Math.max(0, lambda2) / lambda1) : 0;

			const perimeterMm = perimeterPixels * Math.sqrt(pixelArea);
			const circularity = perimeterMm > 0 ? (4 * Math.PI * areaMm2) / (perimeterMm * perimeterMm) : 0;

			// Bone stripe rejection: long narrow cortical bone strip (aspectRatio < 0.35, circularity < 0.28)
			if (aspectRatio < 0.35 && circularity < 0.28) continue;
			if (circularity < 0.18) continue;

			// Sample core HU in a 1.2 mm radius around COM to check for pulp cavity or canal filling
			const coreR = Math.max(1, Math.round(1.2 / spX));
			let minCoreHU = 9999;
			let maxCoreHU = -1000;
			for (let dy = -coreR; dy <= coreR; dy++) {
				for (let dx = -coreR; dx <= coreR; dx++) {
					const px = Math.round(avgX + dx);
					const py = Math.round(avgY + dy);
					if (px >= 0 && px < width && py >= 0 && py < height) {
						const chu = data[py * width + px] ?? -1000;
						if (chu < minCoreHU) minCoreHU = chu;
						if (chu > maxCoreHU) maxCoreHU = chu;
					}
				}
			}
			const hasPulp = minCoreHU <= 650 || maxCoreHU >= 2200;

			rawBeads.push({
				wx: Number((sumHUX / sumHU).toFixed(2)),
				wy: Number((sumHUY / sumHU).toFixed(2)),
				hu: maxHU,
				areaMm2: Number(areaMm2.toFixed(1)),
				circularity: Number(circularity.toFixed(2)),
				aspectRatio: Number(aspectRatio.toFixed(2)),
				hasPulp,
				weight: sumHU,
			});
		}
	}

	// Cluster any split sub-blobs within same tooth crown (< 5.2 mm)
	const clustered: MorphologicalToothBead[] = [];
	for (const b of rawBeads) {
		let merged = false;
		for (const c of clustered) {
			if (Math.hypot(b.wx - c.wx, b.wy - c.wy) < 5.2) {
				const wTot = c.weight + b.weight;
				c.wx = Number(((c.wx * c.weight + b.wx * b.weight) / wTot).toFixed(2));
				c.wy = Number(((c.wy * c.weight + b.wy * b.weight) / wTot).toFixed(2));
				c.hu = Math.max(c.hu, b.hu);
				c.areaMm2 = Number((c.areaMm2 + b.areaMm2).toFixed(1));
				c.circularity = Math.max(c.circularity, b.circularity);
				c.aspectRatio = Math.max(c.aspectRatio, b.aspectRatio);
				c.hasPulp = c.hasPulp || b.hasPulp;
				c.weight = wTot;
				merged = true;
				break;
			}
		}
		if (!merged) clustered.push({ ...b });
	}

	return clustered;
}

async function run() {
	const patients = [
		{
			name: "Буляков Н.З.",
			type: "multiframe",
			path: "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
			mandZ: 8.90,
			maxZ: -1.10,
		},
		{
			name: "Захаров И.Д.",
			type: "series",
			path: "apps/web/public/radiology/demo_cbct",
			mandZ: 3.25,
			maxZ: -3.25,
		},
		{
			name: "Барабаш С.В.",
			type: "series",
			path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data",
			mandZ: -8.00, // True mandibular crown plane!
			maxZ: -0.80, // True maxillary crown plane!
		},
		{
			name: "Сумарокова И.О.",
			type: "series",
			path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34",
			maxZ: 18.00, // True maxillary sectional crown plane!
		},
		{
			name: "Амирова Н.Н.",
			type: "series",
			path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT",
			maxZ: -6.00, // True maxillary sectional crown plane!
		},
	];

	for (const p of patients) {
		console.log(`\n=================== PATIENT: ${p.name} ===================`);
		const vol = await loadPatient(p);
		if ((p as any).mandZ !== undefined) {
			const slabMand = extractAxialMIPSlab(vol, (p as any).mandZ, 1.0, "average");
			const beadsMand = extractMorphologicalToothBeads(slabMand);
			console.log(`  [MANDIBLE] Z=${(p as any).mandZ}: found ${beadsMand.length} morphological tooth beads:`);
			for (const b of beadsMand) {
				console.log(`    pos=(${b.wx}, ${b.wy}) area=${b.areaMm2}mm² circ=${b.circularity} asp=${b.aspectRatio} pulp=${b.hasPulp}`);
			}
		}
		if (p.maxZ !== undefined) {
			const slabMax = extractAxialMIPSlab(vol, p.maxZ, 1.0, "average");
			const beadsMax = extractMorphologicalToothBeads(slabMax);
			console.log(`  [MAXILLA]  Z=${p.maxZ}: found ${beadsMax.length} morphological tooth beads:`);
			for (const b of beadsMax) {
				console.log(`    pos=(${b.wx}, ${b.wy}) area=${b.areaMm2}mm² circ=${b.circularity} asp=${b.aspectRatio} pulp=${b.hasPulp}`);
			}
		}
	}
}

run().catch(console.error);
