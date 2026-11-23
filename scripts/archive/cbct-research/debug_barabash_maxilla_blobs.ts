import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

async function run() {
	const barabashDir = "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data";
	const files = readdirSync(barabashDir).filter((f) => {
		const full = path.join(barabashDir, f);
		return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
	});
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
	for (const f of files) {
		const full = path.join(barabashDir, f);
		const buf = readFileSync(full);
		items.push({ buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: f });
	}
	const volume = await buildVolumeFromDicomBuffers(items);
	const slab = extractAxialMIPSlab(volume, -0.8, 1.0, "average");

	const { width, height, data, originMm, spacingMm } = slab;
	const spX = spacingMm.x || 0.25;
	const spY = spacingMm.y || 0.25;
	const pixelArea = spX * spY;
	const visited = new Uint8Array(width * height);
	const huThreshold = 1050;

	for (let y = 3; y < height - 3; y++) {
		for (let x = 3; x < width - 3; x++) {
			const idx = y * width + x;
			if (visited[idx] || (data[idx] ?? -1000) < huThreshold) continue;

			const queue = [idx];
			visited[idx] = 1;
			let count = 0;
			let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
			let perimeterPixels = 0;

			while (queue.length > 0) {
				const cur = queue.pop()!;
				const cy = Math.floor(cur / width);
				const cx = cur % width;
				sumX += cx;
				sumY += cy;
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
			const avgX = sumX / count;
			const avgY = sumY / count;
			const u20 = sumX2 / count - avgX * avgX;
			const u02 = sumY2 / count - avgY * avgY;
			const u11 = sumXY / count - avgX * avgY;
			const common = Math.sqrt((u20 - u02) ** 2 + 4 * (u11 ** 2));
			const lambda1 = (u20 + u02 + common) / 2;
			const lambda2 = (u20 + u02 - common) / 2;
			const aspectRatio = lambda1 > 0 ? Math.sqrt(Math.max(0, lambda2) / lambda1) : 0;
			const perimeterMm = perimeterPixels * Math.sqrt(pixelArea);
			const circularity = perimeterMm > 0 ? (4 * Math.PI * areaMm2) / (perimeterMm * perimeterMm) : 0;

			const wx = originMm.x + avgX * spX;
			const wy = originMm.y + avgY * spY;

			if (areaMm2 >= 5.0) {
				console.log(`Blob at (${wx.toFixed(1)}, ${wy.toFixed(1)}): area=${areaMm2.toFixed(1)} count=${count} circ=${circularity.toFixed(2)} asp=${aspectRatio.toFixed(2)}`);
			}
		}
	}
}

run().catch(console.error);
