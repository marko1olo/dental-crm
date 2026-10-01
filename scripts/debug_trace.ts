import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { parseDicomSliceHeader } from "../apps/web/src/components/radiology/dicomSliceHeaderParser";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath";
import { sampleMipHUContinuous } from "../apps/web/src/components/radiology/cbctAutoArchTypes";

async function loadVolumeZak(): Promise<CbctVoxelVolume> {
	const p = "apps/web/public/radiology/demo_cbct";
	let files = readdirSync(p).filter((f) => f.endsWith(".dcm")).sort();
	const firstBuf = readFileSync(path.join(p, files[0]!));
	const firstHdr = parseDicomSliceHeader(firstBuf.buffer.slice(firstBuf.byteOffset, firstBuf.byteOffset + firstBuf.byteLength));
	const lastBuf = readFileSync(path.join(p, files[files.length - 1]!));
	const lastHdr = parseDicomSliceHeader(lastBuf.buffer.slice(lastBuf.byteOffset, lastBuf.byteOffset + lastBuf.byteLength));
	const z0 = firstHdr.imagePositionPatient?.[2] ?? 0;
	const zLast = lastHdr.imagePositionPatient?.[2] ?? 0;
	if (z0 > zLast) files.reverse();
	const w = firstHdr.cols;
	const h = firstHdr.rows;
	const d = files.length;
	const sliceVoxelCount = w * h;
	const data = new Int16Array(w * h * d);

	for (let z = 0; z < d; z++) {
		const buf = readFileSync(path.join(p, files[z]!));
		const hdr = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
		const off = hdr.pixelDataByteOffset;
		const rawSlice = new Uint16Array(buf.buffer.slice(buf.byteOffset + off, buf.byteOffset + off + sliceVoxelCount * 2));
		const baseIdx = z * sliceVoxelCount;
		for (let i = 0; i < sliceVoxelCount; i++) data[baseIdx + i] = (rawSlice[i]! & 0xfff) - 1000;
	}

	return {
		id: "vol-zak",
		dimensions: { width: w, height: h, depth: d },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -((w * 0.25) / 2), y: -((h * 0.25) / 2), z: Math.min(z0, zLast) },
		physicalSizeMm: { x: w * 0.25, y: h * 0.25, z: d * 0.25 },
		data,
		defaultWindowWidth: 3500,
		defaultWindowLevel: 800,
		isDisposed: false,
	};
}

async function run() {
	const vol = await loadVolumeZak();
	const z = findOcclusalZPlane(vol, "mandible");
	const mip = extractAxialMIPSlab(vol, z, 6.0);

	console.log(`Zakharov Mandible Z = ${z.toFixed(2)} mm`);
	// Sample mandibular teeth positions
	const rightBranch = [
		{ fdi: "41", x: -2.0, y: -45.0 },
		{ fdi: "42", x: -6.0, y: -44.0 },
		{ fdi: "43", x: -11.0, y: -41.0 },
		{ fdi: "44", x: -16.0, y: -36.0 },
		{ fdi: "45", x: -20.0, y: -30.0 },
		{ fdi: "46", x: -24.0, y: -22.0 },
		{ fdi: "47", x: -26.0, y: -15.0 },
		{ fdi: "48", x: -29.0, y: -5.0 },
	];

	for (const pt of rightBranch) {
		let maxHU = -1000;
		let count1500 = 0;
		let count1700 = 0;
		for (let dx = -3.5; dx <= 3.5; dx += 0.5) {
			for (let dy = -3.5; dy <= 3.5; dy += 0.5) {
				const hu = sampleMipHUContinuous(mip, pt.x + dx, pt.y + dy);
				if (hu > maxHU) maxHU = hu;
				if (hu >= 1500) count1500++;
				if (hu >= 1700) count1700++;
			}
		}
		console.log(`  Tooth #${pt.fdi}: maxHU = ${maxHU.toFixed(0)}, count >= 1500: ${count1500}, count >= 1700: ${count1700}`);
	}
}

run().catch(console.error);
