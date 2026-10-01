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

async function scanZ(name: string, dirPath: string, zStart: number, zEnd: number, step: number) {
	console.log(`\nScanning Z for: ${name}`);
	const vol = await loadSeries(dirPath);
	for (let z = zStart; z <= zEnd; z += step) {
		const slab = extractAxialMIPSlab(vol, z, 1.0, "average");
		const data = slab.data;
		let enamelCount = 0;
		let pulpCandidateCount = 0;
		for (let i = 0; i < data.length; i++) {
			const hu = data[i] ?? -1000;
			if (hu >= 1400) enamelCount++;
			if (hu >= 200 && hu <= 600) pulpCandidateCount++;
		}
		if (enamelCount > 20) {
			console.log(`  Z = ${z.toFixed(2)} mm: enamelCount=${enamelCount}`);
		}
	}
}

async function main() {
	await scanZ("Амирова", "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT", -16.0, 4.0, 1.0);
	await scanZ("Сумарокова", "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34", 10.0, 24.0, 1.0);
}

main().catch(console.error);
