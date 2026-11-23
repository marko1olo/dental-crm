import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/realDicomVolumeLoader";
import { parseDicomSliceHeader } from "../apps/web/src/components/radiology/dicomSliceHeaderParser";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import { detectHonestDentalArch } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath";

async function loadPatientVolume(cfg: { path: string; isMulti: boolean }): Promise<CbctVoxelVolume> {
	if (cfg.isMulti) {
		const buf = readFileSync(cfg.path);
		return await buildVolumeFromMultiFrameDicom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
	}
	let files = readdirSync(cfg.path).filter((f) => f.endsWith(".dcm")).sort();
	const firstBuf = readFileSync(path.join(cfg.path, files[0]!));
	const firstHdr = parseDicomSliceHeader(firstBuf.buffer.slice(firstBuf.byteOffset, firstBuf.byteOffset + firstBuf.byteLength));
	const lastBuf = readFileSync(path.join(cfg.path, files[files.length - 1]!));
	const lastHdr = parseDicomSliceHeader(lastBuf.buffer.slice(lastBuf.byteOffset, lastBuf.byteOffset + lastBuf.byteLength));

	const z0 = firstHdr.imagePositionPatient?.[2] ?? 0;
	const zLast = lastHdr.imagePositionPatient?.[2] ?? 0;
	if (z0 > zLast) {
		files.reverse();
	}

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
		const buf = readFileSync(path.join(cfg.path, files[z]!));
		const hdr = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
		const off = hdr.pixelDataByteOffset;
		const sliceBuf = buf.buffer.slice(buf.byteOffset + off, buf.byteOffset + off + sliceVoxelCount * 2);
		const rawSlice = new Uint16Array(sliceBuf);
		const baseIdx = z * sliceVoxelCount;
		for (let i = 0; i < sliceVoxelCount; i++) {
			data[baseIdx + i] = (rawSlice[i]! & 0xfff) - 1000;
		}
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

async function main() {
	console.log("AUDITING CBCT HONEST ARCH ENGINE ACROSS 3 KEY PATIENTS");

	const targets = [
		{
			id: "bulyakov",
			name: "Буляков Н.З.",
			path: "C:/Users/Admin/Downloads/Облако Mail/Буляков Н.З. 29.08.2026г. ОЧ.dcm",
			isMulti: true,
		},
		{
			id: "zakharov",
			name: "Захаров И.Д.",
			path: "apps/web/public/radiology/demo_cbct",
			isMulti: false,
		},
		{
			id: "barabash",
			name: "Барабаш С.В.",
			path: "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data",
			isMulti: false,
		},
	];

	for (const t of targets) {
		console.log(`\n=================== PATIENT: ${t.name} ===================`);
		const vol = await loadPatientVolume(t);

		for (const jaw of ["mandible", "maxilla"] as const) {
			const z = findOcclusalZPlane(vol, jaw);
			const mip = extractAxialMIPSlab(vol, z, 8.0);
			const res = detectHonestDentalArch(mip, jaw);

			console.log(`--- ${jaw.toUpperCase()} (Z = ${z.toFixed(2)} mm) ---`);
			console.log(`  Apex: X = ${res.apexMm.x} mm, Y = ${res.apexMm.y} mm`);
			console.log(`  Enamel Lock: ${res.metrics.enamelLockRatio}%`);
			console.log(`  Fissure Error: ${res.metrics.fissureMidpointErrorMm} mm`);
			console.log(`  Posterior Max Y: ${res.metrics.posteriorBoundaryYMm} mm`);
			console.log(`  Arc Length: ${res.metrics.totalArcLengthMm} mm`);
			console.log(`  Present Teeth (${res.presentTeethFdi.length}): ${res.presentTeethFdi.join(", ")}`);
			console.log(`  Missing / Defect Teeth (${res.missingTeethFdi.length}): ${res.missingTeethFdi.join(", ")}`);

			// Print molar details
			for (const a of res.anchors) {
				if (["18", "17", "16", "26", "27", "28", "48", "47", "37", "38"].includes(a.toothFdi)) {
					console.log(`    #${a.toothFdi} [${a.status}]: pos=(${a.positionMm.x}, ${a.positionMm.y}), peakHU=${a.peakHU}, label="${a.labelRu}"`);
				}
			}
		}
	}
}

main().catch(console.error);
