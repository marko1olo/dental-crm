/**
 * realDicomSliceOrganizer.ts — Фильтрация скаутов, сортировка Caudal->Cranial и дедупликация срезов (Мандат 8b).
 */

import {
	computeSliceNormalDistance,
	isLocalizerOrScoutSlice,
	type DicomSliceEntry,
} from "../dicomSliceHeaderParser";

export function organizeAndFilterDicomSlices(sliceEntries: DicomSliceEntry[]): {
	readonly validSlices: DicomSliceEntry[];
	readonly computedSpacingZ: number;
} {
	if (sliceEntries.length <= 1) {
		const ref = sliceEntries[0]?.header;
		return { validSlices: sliceEntries, computedSpacingZ: ref?.sliceThickness ?? 0.5 };
	}

	// 1. Исключение 2D Scout/Localizer
	const tomographic = sliceEntries.filter((e) => !isLocalizerOrScoutSlice(e.header));
	const current = tomographic.length > 0 ? tomographic : sliceEntries;

	// 2. Исключение вспомогательных матриц с иным разрешением
	const dimCounts = new Map<string, number>();
	for (const e of current) {
		const key = `${e.header.rows}x${e.header.cols}`;
		dimCounts.set(key, (dimCounts.get(key) ?? 0) + 1);
	}
	let dominantDim = "";
	let maxCount = 0;
	dimCounts.forEach((count, k) => {
		if (count > maxCount) {
			maxCount = count;
			dominantDim = k;
		}
	});
	const [domRows, domCols] = dominantDim.split("x").map(Number);
	const matching = current.filter((e) => e.header.rows === domRows && e.header.cols === domCols);

	// 3. Сортировка по нормальному расстоянию к плоскости среза (Caudal -> Cranial)
	matching.sort((a, b) => {
		const distA = computeSliceNormalDistance(a.header.imagePositionPatient, a.header.imageOrientationPatient, a.header.sliceLocationZ);
		const distB = computeSliceNormalDistance(b.header.imagePositionPatient, b.header.imageOrientationPatient, b.header.sliceLocationZ);
		if (Math.abs(distA - distB) > 0.0001) return distA - distB;
		if (a.header.instanceNumber !== b.header.instanceNumber) return a.header.instanceNumber - b.header.instanceNumber;
		return a.fileName.localeCompare(b.fileName, undefined, { numeric: true });
	});

	// 4. Дедупликация срезов с идентичной Z-координатой (< 0.01 мм) при наличии Z-вариации
	let minZ = Infinity; let maxZ = -Infinity;
	for (const e of matching) {
		const d = computeSliceNormalDistance(e.header.imagePositionPatient, e.header.imageOrientationPatient, e.header.sliceLocationZ);
		if (d < minZ) minZ = d;
		if (d > maxZ) maxZ = d;
	}
	const hasZVariation = (maxZ - minZ) >= 0.01;

	const unique: DicomSliceEntry[] = [];
	if (hasZVariation) {
		for (const entry of matching) {
			if (unique.length === 0) {
				unique.push(entry);
			} else {
				const prev = unique[unique.length - 1]!;
				const distPrev = computeSliceNormalDistance(prev.header.imagePositionPatient, prev.header.imageOrientationPatient, prev.header.sliceLocationZ);
				const distCur = computeSliceNormalDistance(entry.header.imagePositionPatient, entry.header.imageOrientationPatient, entry.header.sliceLocationZ);
				if (Math.abs(distCur - distPrev) >= 0.01) {
					unique.push(entry);
				}
			}
		}
	} else {
		unique.push(...matching);
	}

	// 5. Робастный медианный шаг по Z
	const refHeader = unique[0]!.header;
	let computedSpacingZ = refHeader.sliceThickness;
	if (unique.length > 1) {
		const steps: number[] = [];
		for (let i = 0; i < unique.length - 1; i++) {
			const d1 = computeSliceNormalDistance(unique[i]!.header.imagePositionPatient, unique[i]!.header.imageOrientationPatient, unique[i]!.header.sliceLocationZ);
			const d2 = computeSliceNormalDistance(unique[i + 1]!.header.imagePositionPatient, unique[i + 1]!.header.imageOrientationPatient, unique[i + 1]!.header.sliceLocationZ);
			const diff = Math.abs(d2 - d1);
			if (diff > 0.001) steps.push(diff);
		}
		if (steps.length > 0) {
			steps.sort((a, b) => a - b);
			computedSpacingZ = steps[Math.floor(steps.length / 2)]!;
		}
	}

	return { validSlices: unique, computedSpacingZ };
}
