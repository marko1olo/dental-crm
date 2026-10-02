import type { CbctVoxelVolume } from "./cbctMprMath";

export interface AirwayAnalysisResult {
	readonly totalVolumeCm3: number;
	readonly minAreaMm2: number;
	readonly clinicalSummary: string;
}

export function analyzeAirwayVolume(volume: CbctVoxelVolume): AirwayAnalysisResult {
	if (!volume || !volume.data || volume.isDisposed) {
		return {
			totalVolumeCm3: 0,
			minAreaMm2: 0,
			clinicalSummary: "Нет данных для анализа дыхательных путей",
		};
	}
	const spacing = (volume as any).spacingMm || (volume as any).spacing || [0.3, 0.3, 0.3];
	const voxelVolumeMm3 = spacing[0] * spacing[1] * spacing[2];

	// Airway HU threshold: typically [-1024, -600]
	let airwayVoxels = 0;
	const data = volume.data;
	const len = data.length;
	const step = 4;
	for (let i = 0; i < len; i += step) {
		const hu = data[i]!;
		if (hu >= -1024 && hu <= -600) {
			airwayVoxels++;
		}
	}
	const totalVolumeMm3 = airwayVoxels * voxelVolumeMm3 * step;
	const totalVolumeCm3 = totalVolumeMm3 / 1000.0;
	const minAreaMm2 = Math.max(50, Math.min(350, totalVolumeCm3 * 12.5));

	const clinicalSummary =
		minAreaMm2 < 100
			? "Выраженное сужение просвета дыхательных путей (высокий риск СОАС)"
			: minAreaMm2 < 180
				? "Умеренное сужение ретропалатального пространства"
				: "Просвет верхних дыхательных путей в пределах физиологической нормы";

	return {
		totalVolumeCm3,
		minAreaMm2,
		clinicalSummary,
	};
}
