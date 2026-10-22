import {
	type EndoCanalData,
	type EndoToothClinicalData,
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyObturationPermanentProtocol,
	applyAnatomicalWorkingLengths,
	getDefaultCanalsForTooth,
	generateEndoProtocol043,
} from "../../endo/EndoCanalLogModal";
import type { ToothData } from "../../odontogram/ToothChart";

export function createRevisionCanals(canals: EndoCanalData[], toothNumber: number) {
	const baseCanals = canals.length > 0 ? canals : getDefaultCanalsForTooth(toothNumber);
	const defaultCanals = getDefaultCanalsForTooth(toothNumber);
	const updated: EndoCanalData[] = baseCanals.map((c, idx) => {
		const def = defaultCanals[idx] || defaultCanals[0];
		return {
			...c,
			workingLengthMm: c.workingLengthMm ? Number(c.workingLengthMm) : (def?.workingLengthMm || 21.0),
			masterApicalFile: "30.04 (Ревизия)",
			taper: "0.06 (Стандарт)",
			obturationTechnique: "Временная Ca(OH)2 на 14 дней",
		};
	});

	return {
		canals: updated,
		rotarySystem: "ProTaper Retreatment D1-D3 (Дезобтурация)",
		irrigation: "Хлороформ / Эвкалиптол (Сольвент) + NaOCl 3.0%",
		radiologyControl: "RVG контроль полной дезобтурации канала",
	};
}

export function buildEndoUpdatePayload(
	toothData: ToothData | undefined,
	canals: EndoCanalData[],
	rotarySystem: string,
	irrigation: string,
	radiologyControl: string,
	overrides?: Partial<ToothData>,
): Partial<ToothData> {
	return {
		canalCount: canals.length,
		...overrides,
		clinicalData: {
			...(toothData?.clinicalData as EndoToothClinicalData | undefined),
			canals,
			rotarySystem,
			irrigation,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		},
	};
}

export {
	applyPulpitisProtocol,
	applyPeriodontitisTempProtocol,
	applyObturationPermanentProtocol,
	applyAnatomicalWorkingLengths,
	getDefaultCanalsForTooth,
	generateEndoProtocol043,
};
