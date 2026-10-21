import {
	RADIATION_SAFETY_LIMITS_MSV,
	RADIATION_ZONE_DEFINITIONS,
} from "./radiationDosePresets.js";
import type { DoseComplianceResult, RadiationSafetyZone } from "./types.js";

export function evaluateDoseCompliance(
	accumulatedAnnualMsv: number,
	plannedStudyMsv = 0,
): DoseComplianceResult {
	const totalAnnualMsv = Number(
		(accumulatedAnnualMsv + plannedStudyMsv).toFixed(4),
	);
	const limitMsv = RADIATION_SAFETY_LIMITS_MSV.ANNUAL_PREVENTIVE_LIMIT_MSV;
	const remainingAnnualMsv = Number(
		Math.max(0, limitMsv - totalAnnualMsv).toFixed(4),
	);
	const percentOfLimit = Math.min(
		Number(((totalAnnualMsv / limitMsv) * 100).toFixed(1)),
		9999,
	);
	const isExceeded = totalAnnualMsv >= limitMsv;

	let zone: RadiationSafetyZone = "green";
	let status: DoseComplianceResult["status"] = "safe";

	if (isExceeded) {
		zone = "red";
		status = "limit_exceeded";
	} else if (
		totalAnnualMsv >= RADIATION_SAFETY_LIMITS_MSV.WARNING_THRESHOLD_MSV
	) {
		zone = "yellow";
		status = "warning";
	}

	let warningMessage = RADIATION_ZONE_DEFINITIONS[zone].descriptionRu;
	let protocolActionRequired = "Стандартное проведение исследования.";

	if (isExceeded) {
		warningMessage =
			"Внимание: Достигнут годовой предел 1.0 мЗв. Исследование проводится по обоснованным клиническим показаниям.";
		protocolActionRequired =
			"Клиническое решение врача: фиксация обоснования необходимости снимка в медицинской карте приёма.";
	} else if (zone === "yellow") {
		protocolActionRequired =
			"Рекомендуется отдать приоритет прицельной радиовизиографии с коллимацией.";
	}

	return {
		status,
		zone,
		totalAnnualMsv,
		limitMsv,
		remainingAnnualMsv,
		percentOfLimit,
		isExceeded,
		warningMessage,
		protocolActionRequired,
		requiresDoctorClinicalJustification: isExceeded,
		requiresMedicalCouncilJustification: false,
		recommendedIntervalDays: 0,
		isCaptureBlocked: false,
	};
}

export function formatRadiationDoseDisplay(effectiveMicrosv: number): {
	microsvText: string;
	msvText: string;
	safetyZone: RadiationSafetyZone;
} {
	const roundedMksv = Math.round(effectiveMicrosv * 10) / 10;
	const msv = Number((roundedMksv / 1000).toFixed(4));
	let safetyZone: RadiationSafetyZone = "green";
	if (msv >= 1.0) safetyZone = "red";
	else if (msv >= 0.5) safetyZone = "yellow";

	return {
		microsvText: `${roundedMksv} мкЗв`,
		msvText: `${msv} мЗв`,
		safetyZone,
	};
}
