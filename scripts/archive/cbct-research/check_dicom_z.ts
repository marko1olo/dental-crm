import { readFileSync, readdirSync } from "node:fs";
import { parseDicomSliceHeader } from "../apps/web/src/components/radiology/dicomSliceHeaderParser.js";

function checkDir(name: string, dir: string) {
	const files = readdirSync(dir).filter(f => f.endsWith(".dcm") || !f.includes("."));
	const fFirst = files[0]!;
	const fLast = files[files.length - 1]!;
	const hFirst = parseDicomSliceHeader(readFileSync(`${dir}/${fFirst}`).buffer);
	const hLast = parseDicomSliceHeader(readFileSync(`${dir}/${fLast}`).buffer);
	console.log(`${name}:`);
	console.log(`  Slice 0: pos=`, hFirst.imagePositionPatient, `orient=`, hFirst.imageOrientationPatient);
	console.log(`  Slice N: pos=`, hLast.imagePositionPatient, `orient=`, hLast.imageOrientationPatient);
}

checkDir("Захаров", "apps/web/public/radiology/demo_cbct");
checkDir("Барабаш", "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data");
