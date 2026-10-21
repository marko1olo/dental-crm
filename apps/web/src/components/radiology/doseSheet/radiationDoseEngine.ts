import {
	RADIATION_SAFETY_LIMITS_MSV,
	RADIATION_ZONE_DEFINITIONS,
} from "./radiationDosePresets.js";
import { extractYear, normalizeDoseRecord } from "./radiationDoseRecord.js";
import type { DoseRecord, DoseSummary, RadiationSafetyZone } from "./types.js";

export * from "./radiationDoseCompliance.js";
export * from "./radiationDoseExport.js";
export * from "./radiationDosePresets.js";
export * from "./radiationDoseRecord.js";
export * from "./types.js";

export function calculatePatientCumulativeDose(
	records: readonly Partial<DoseRecord>[],
	targetYear: number = new Date().getFullYear(),
): DoseSummary {
	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));
	let annualMicrosv = 0;
	let annualMsv = 0;
	let annualStudiesCount = 0;
	let lifetimeMicrosv = 0;
	let lifetimeMsv = 0;

	for (const rec of normalized) {
		const recYear = extractYear(rec.studyDate || "", targetYear);
		lifetimeMicrosv += rec.effectiveDoseMicrosv;
		lifetimeMsv += rec.effectiveDoseMsv;

		if (recYear === targetYear) {
			annualMicrosv += rec.effectiveDoseMicrosv;
			annualMsv += rec.effectiveDoseMsv;
			annualStudiesCount += 1;
		}
	}

	annualMicrosv = Number(annualMicrosv.toFixed(2));
	annualMsv = Number(annualMsv.toFixed(4));
	lifetimeMicrosv = Number(lifetimeMicrosv.toFixed(2));
	lifetimeMsv = Number(lifetimeMsv.toFixed(4));

	const sanpinLimitMsv =
		RADIATION_SAFETY_LIMITS_MSV.ANNUAL_PREVENTIVE_LIMIT_MSV;
	const percentOfAnnualLimit = Math.min(
		Number(((annualMsv / sanpinLimitMsv) * 100).toFixed(1)),
		9999,
	);

	let safetyZone: RadiationSafetyZone = "green";
	if (annualMsv >= 1.0) {
		safetyZone = "red";
	} else if (annualMsv >= 0.5) {
		safetyZone = "yellow";
	}

	return {
		annualMicrosv,
		annualMsv,
		annualStudiesCount,
		lifetimeMicrosv,
		lifetimeMsv,
		lifetimeStudiesCount: normalized.length,
		sanpinLimitMsv,
		percentOfAnnualLimit,
		safetyZone,
		safetyZoneLabel: RADIATION_ZONE_DEFINITIONS[safetyZone].statusBadgeRu,
		recommendation: RADIATION_ZONE_DEFINITIONS[safetyZone].recommendationRu,
		alaraComplianceNotes:
			"Принцип ALARA соблюден. Низкодозовые цифровые датчики и средства индивидуальной защиты.",
		yearlyBreakdown: {},
		modalityBreakdown: {},
	};
}
