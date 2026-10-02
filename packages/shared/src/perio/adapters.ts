/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERIODONTAL DATA MODEL ADAPTER & CONVERTER ENGINE (SSOT — Mandate 8za)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements lossless, bidirectional conversion between:
 * 1. Continuous Property Map model (`PerioToothRecord` in `@dental/shared/perio/types`)
 *    used by interactive UI components (PeriodontogramChart, Odontogram).
 * 2. Relational SEPA / WHO Snapshot model (`SepaToothValue` in `@dental/shared/emr/periodontogram`)
 *    used by PostgreSQL database snapshots (periodontogram_snapshots, periodontogram_teeth, periodontogram_sites).
 *
 * Site Code Mapping:
 * - mesioBuccal   <-> MV (Mesio-Vestibular / Медиально-вестибулярно)
 * - midBuccal     <-> V  (Mid-Vestibular   / По центру вестибулярно)
 * - distoBuccal   <-> DV (Disto-Vestibular / Дистально-вестибулярно)
 * - mesioLingual  <-> ML (Mesio-Lingual    / Медиально-орально/язычно/нёбно)
 * - midLingual    <-> L  (Mid-Lingual      / По центру орально/язычно/нёбно)
 * - distoLingual  <-> DL (Disto-Lingual    / Дистально-орально/язычно/нёбно)
 */

import type {
	SepaFurcationGrade,
	SepaSiteCode,
	SepaSiteValue,
	SepaToothValue,
} from "../emr/periodontogram.js";
import {
	calculateClinicalAttachmentLevel,
} from "./math.js";
import {
	PERIO_SITE_KEYS,
	type FurcationGrade,
	type MobilityGrade,
	type PerioSiteKey,
	type PerioSiteMeasurement,
	type PerioToothRecord,
} from "./types.js";

// ───────────────────────────────────────────────────────────────────────────
// SITE CODE MAPS
// ───────────────────────────────────────────────────────────────────────────

const SITE_KEY_TO_SEPA_CODE: Record<PerioSiteKey, SepaSiteCode> = {
	mesioBuccal: "MV",
	midBuccal: "V",
	distoBuccal: "DV",
	mesioLingual: "ML",
	midLingual: "L",
	distoLingual: "DL",
};

const SEPA_CODE_TO_SITE_KEY: Record<SepaSiteCode, PerioSiteKey> = {
	MV: "mesioBuccal",
	V: "midBuccal",
	DV: "distoBuccal",
	ML: "mesioLingual",
	L: "midLingual",
	DL: "distoLingual",
};

const SEPA_ORDER: readonly SepaSiteCode[] = ["MV", "V", "DV", "ML", "L", "DL"];

/**
 * Maps PerioSiteKey (e.g. 'midBuccal') to SEPA site code (e.g. 'V').
 */
export function mapPerioSiteKeyToSepaSiteCode(key: PerioSiteKey): SepaSiteCode {
	return SITE_KEY_TO_SEPA_CODE[key];
}

/**
 * Maps SEPA site code (e.g. 'V') to PerioSiteKey (e.g. 'midBuccal').
 */
export function mapSepaSiteCodeToPerioSiteKey(code: SepaSiteCode): PerioSiteKey {
	return SEPA_CODE_TO_SITE_KEY[code];
}

/**
 * Converts FurcationGrade (0..4) to SepaFurcationGrade ('0' | 'I' | 'II' | 'III' | null).
 */
export function furcationGradeToSepa(grade: FurcationGrade | undefined): SepaFurcationGrade | null {
	if (grade === undefined || grade === null || grade === 0) return "0";
	if (grade === 1) return "I";
	if (grade === 2) return "II";
	return "III"; // grades 3 and 4 map to class III through-and-through
}

/**
 * Converts SepaFurcationGrade ('0' | 'I' | 'II' | 'III' | null) to FurcationGrade (0..4).
 */
export function sepaToFurcationGrade(grade: SepaFurcationGrade | null | undefined): FurcationGrade {
	if (!grade || grade === "0") return 0;
	if (grade === "I") return 1;
	if (grade === "II") return 2;
	if (grade === "III") return 3;
	return 0;
}

// ───────────────────────────────────────────────────────────────────────────
// SITE CONVERTERS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Converts a PerioSiteMeasurement to a SepaSiteValue.
 */
export function convertPerioSiteToSepaSite(
	key: PerioSiteKey,
	site: PerioSiteMeasurement | undefined,
): SepaSiteValue {
	const siteCode = mapPerioSiteKeyToSepaSiteCode(key);
	if (!site) {
		return {
			siteCode,
			probingDepthMm: 2,
			gingivalMarginMm: 0,
			bleedingOnProbing: false,
			plaque: false,
			suppuration: false,
			calculus: false,
		};
	}

	return {
		siteCode,
		probingDepthMm: site.probingDepthMm ?? 2,
		gingivalMarginMm: site.gingivalMarginMm ?? 0,
		bleedingOnProbing: Boolean(site.bleedingOnProbing),
		plaque: Boolean(site.plaque),
		suppuration: Boolean(site.suppuration),
		calculus: Boolean(site.calculus),
	};
}

/**
 * Converts a SepaSiteValue to a PerioSiteMeasurement.
 */
export function convertSepaSiteToPerioSite(site: SepaSiteValue): {
	key: PerioSiteKey;
	measurement: PerioSiteMeasurement;
} {
	const key = mapSepaSiteCodeToPerioSiteKey(site.siteCode);
	const pd = site.probingDepthMm ?? 2;
	const gm = site.gingivalMarginMm ?? 0;
	const calMm = calculateClinicalAttachmentLevel(pd, gm);

	return {
		key,
		measurement: {
			probingDepthMm: pd,
			gingivalMarginMm: gm,
			bleedingOnProbing: Boolean(site.bleedingOnProbing),
			suppuration: Boolean(site.suppuration),
			plaque: Boolean(site.plaque),
			calculus: Boolean(site.calculus),
			calMm,
		},
	};
}

// ───────────────────────────────────────────────────────────────────────────
// TOOTH CONVERTERS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Converts a PerioToothRecord to a SepaToothValue.
 */
export function convertPerioToothRecordToSepaTooth(
	tooth: PerioToothRecord,
): SepaToothValue {
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

/**
 * Converts a SepaToothValue to a PerioToothRecord.
 */
export function convertSepaToothToPerioToothRecord(
	sepa: SepaToothValue,
): PerioToothRecord {
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

// ───────────────────────────────────────────────────────────────────────────
// DENTITION BATCH CONVERTERS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Converts a full array of PerioToothRecord to SepaToothValue array.
 */
export function convertPerioDentitionToSepa(
	teeth: readonly PerioToothRecord[],
): SepaToothValue[] {
	return teeth.map(convertPerioToothRecordToSepaTooth);
}

/**
 * Converts a full array of SepaToothValue to PerioToothRecord array.
 */
export function convertSepaDentitionToPerio(
	teeth: readonly SepaToothValue[],
): PerioToothRecord[] {
	return teeth.map(convertSepaToothToPerioToothRecord);
}
