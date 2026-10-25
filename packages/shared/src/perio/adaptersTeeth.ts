/**
 * packages/shared/src/perio/adaptersTeeth.ts
 *
 * Tooth and dentition-level converters between Perio and SEPA models.
 * Mandate 8b: File <= 120 lines.
 */

import type { SepaSiteValue, SepaToothValue } from "../emr/periodontogram.js";
import {
	convertPerioSiteToSepaSite,
	convertSepaSiteToPerioSite,
	furcationGradeToSepa,
	mapSepaSiteCodeToPerioSiteKey,
	sepaToFurcationGrade,
	SEPA_ORDER,
} from "./adaptersSites.js";
import type { MobilityGrade, PerioSiteMeasurement, PerioToothRecord } from "./types.js";

export function convertPerioToothRecordToSepaTooth(tooth: PerioToothRecord): SepaToothValue {
	const furc = furcationGradeToSepa(tooth.furcation);
	const sites: SepaSiteValue[] = SEPA_ORDER.map((code) => {
		const key = mapSepaSiteCodeToPerioSiteKey(code);
		return convertPerioSiteToSepaSite(key, tooth[key]);
	});

	return {
		toothNumber: tooth.toothNumber,
		isPresent: !tooth.isMissing,
		isImplant: Boolean(tooth.isImplant),
		mobility: tooth.mobility ?? 0,
		prognosis: null,
		furcationBuccal: furc,
		furcationLingual: furc,
		keratinizedGingivaMm: null,
		sites,
	};
}

export function convertSepaToothToPerioToothRecord(sepa: SepaToothValue): PerioToothRecord {
	const defaultMeasurement: PerioSiteMeasurement = {
		probingDepthMm: 2,
		gingivalMarginMm: 0,
		bleedingOnProbing: false,
		suppuration: false,
		plaque: false,
		calculus: false,
		calMm: 2,
	};

	const toothRecord: PerioToothRecord = {
		toothNumber: sepa.toothNumber,
		isMissing: !sepa.isPresent,
		isImplant: Boolean(sepa.isImplant),
		mobility: (Math.max(0, Math.min(3, sepa.mobility ?? 0))) as MobilityGrade,
		furcation: sepaToFurcationGrade(sepa.furcationBuccal ?? sepa.furcationLingual),
		distoBuccal: { ...defaultMeasurement },
		midBuccal: { ...defaultMeasurement },
		mesioBuccal: { ...defaultMeasurement },
		distoLingual: { ...defaultMeasurement },
		midLingual: { ...defaultMeasurement },
		mesioLingual: { ...defaultMeasurement },
	};

	if (Array.isArray(sepa.sites)) {
		for (const site of sepa.sites) {
			const { key, measurement } = convertSepaSiteToPerioSite(site);
			toothRecord[key] = measurement;
		}
	}

	return toothRecord;
}

export function convertPerioDentitionToSepa(teeth: readonly PerioToothRecord[]): SepaToothValue[] {
	return teeth.map(convertPerioToothRecordToSepaTooth);
}

export function convertSepaDentitionToPerio(teeth: readonly SepaToothValue[]): PerioToothRecord[] {
	return teeth.map(convertSepaToothToPerioToothRecord);
}
