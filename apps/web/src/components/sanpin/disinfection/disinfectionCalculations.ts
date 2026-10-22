import type {
	DisinfectionApplicationMethod,
	DisinfectionSolutionCalculationResult,
	ToolImmersionCalculationResult,
} from "./disinfectionTypes";

export function calculateDisinfectantForRoom(params: {
	treatedAreaM2: number;
	applicationMethod?: DisinfectionApplicationMethod;
	concentrationPercent: number;
	exposureMinutes?: number;
	customRateMlPerM2?: number;
}): DisinfectionSolutionCalculationResult {
	const area = Math.max(0, Math.round(Number(params.treatedAreaM2) * 100) / 100);
	const method = params.applicationMethod || "wiping";

	const defaultRate = method === "spraying" ? 200 : 100;
	const rateMlPerM2 = params.customRateMlPerM2 !== undefined && params.customRateMlPerM2 > 0
		? params.customRateMlPerM2
		: defaultRate;

	const totalSolutionMl = area * rateMlPerM2;
	const totalSolutionVolumeLiters = Math.round((totalSolutionMl / 1000) * 100) / 100;

	const concPercent = Math.max(0.01, Number(params.concentrationPercent) || 1.0);
	const requiredConcentrateVolumeMl = Math.round(totalSolutionMl * (concPercent / 100) * 10) / 10;
	const requiredWaterVolumeLiters = Math.max(
		0,
		Math.round(((totalSolutionMl - requiredConcentrateVolumeMl) / 1000) * 100) / 100,
	);

	const exposureMinutes = params.exposureMinutes !== undefined && params.exposureMinutes > 0
		? params.exposureMinutes
		: 60;

	return {
		treatedAreaM2: area,
		rateMlPerM2,
		totalSolutionVolumeLiters,
		requiredConcentrateVolumeMl,
		requiredWaterVolumeLiters,
		concentrationPercent: concPercent,
		exposureMinutes,
		applicationMethod: method,
	};
}

export function calculateDisinfectantForToolImmersion(params: {
	instrumentSetsCount: number;
	concentrationPercent: number;
	exposureMinutes?: number;
	litersPerSet?: number;
}): ToolImmersionCalculationResult {
	const setsCount = Math.max(1, Math.round(Number(params.instrumentSetsCount) || 1));
	const litersPerSet = params.litersPerSet !== undefined && params.litersPerSet > 0
		? params.litersPerSet
		: 2.0;

	const totalSolutionVolumeLiters = Math.round(setsCount * litersPerSet * 100) / 100;
	const totalSolutionMl = totalSolutionVolumeLiters * 1000;

	const concPercent = Math.max(0.01, Number(params.concentrationPercent) || 2.0);
	const requiredConcentrateVolumeMl = Math.round(totalSolutionMl * (concPercent / 100) * 10) / 10;
	const requiredWaterVolumeLiters = Math.max(
		0,
		Math.round(((totalSolutionMl - requiredConcentrateVolumeMl) / 1000) * 100) / 100,
	);

	const exposureMinutes = params.exposureMinutes !== undefined && params.exposureMinutes > 0
		? params.exposureMinutes
		: 60;

	return {
		instrumentSetsCount: setsCount,
		litersPerSet,
		totalSolutionVolumeLiters,
		requiredConcentrateVolumeMl,
		requiredWaterVolumeLiters,
		concentrationPercent: concPercent,
		exposureMinutes,
	};
}
