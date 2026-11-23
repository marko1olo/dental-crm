import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/realDicomVolumeLoader";
import { parseDicomSliceHeader } from "../apps/web/src/components/radiology/dicomSliceHeaderParser";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import { findAnteriorArchApexRobust } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath";

async function loadVol(p: string, isMulti: boolean): Promise<CbctVoxelVolume> {
	if (isMulti) {
		const buf = readFileSync(p);
		return await buildVolumeFromMultiFrameDicom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
	}
	let files = readdirSync(p).filter((f) => f.endsWith(".dcm")).sort();
	const firstHdr = parseDicomSliceHeader(readFileSync(path.join(p, files[0]!)).buffer);
	const lastHdr = parseDicomSliceHeader(readFileSync(path.join(p, files[files.length - 1]!)).buffer);
	const z0 = firstHdr.imagePositionPatient?.[2] ?? 0;
	const zLast = lastHdr.imagePositionPatient?.[2] ?? 0;
	if (z0 > zLast) files.reverse();

	const w = firstHdr.cols;
	const h = firstHdr.rows;
	const d = files.length;
	const spX = firstHdr.pixelSpacing?.x || 0.25;
	const spY = firstHdr.pixelSpacing?.y || 0.25;
	const spZ = Math.abs(zLast - z0) / Math.max(1, d - 1) || 0.25;
	const minZ = Math.min(z0, zLast);
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
		id: `vol-${Date.now()}`,
		dimensions: { width: w, height: h, depth: d },
		spacingMm: { x: spX, y: spY, z: spZ },
		originMm: { x: -((w * spX) / 2), y: -((h * spY) / 2), z: minZ },
		physicalSizeMm: { x: w * spX, y: h * spY, z: d * spZ },
		data,
		defaultWindowWidth: 3500,
		defaultWindowLevel: 800,
		isDisposed: false,
	};
}

async function testAllApex() {
	const pts = [
		{ name: "Буляков", path: "C:/Users/Admin/Downloads/Облако Mail/Буляков Н.З. 29.08.2026г. ОЧ.dcm", isMulti: true },
		{ name: "Захаров", path: "apps/web/public/radiology/demo_cbct", isMulti: false },
		{ name: "Барабаш", path: "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data", isMulti: false },
	];

	for (const pt of pts) {
		const vol = await loadVol(pt.path, pt.isMulti);
		for (const jaw of ["mandible", "maxilla"] as const) {
			const z = findOcclusalZPlane(vol, jaw);
			const mip = extractAxialMIPSlab(vol, z, 8.0);
			const apex = findAnteriorArchApexRobust(mip);
			console.log(`${pt.name} ${jaw} (Z = ${z.toFixed(1)}mm): apex = (${apex.x}, ${apex.y})`);
		}
	}
}

testAllApex().catch(console.error);
