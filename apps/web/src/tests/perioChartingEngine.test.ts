import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	type PerioToothRecord,
} from "@dental/shared";
import {
	getAnatomicalToothGeometry,
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
} from "../components/odontogram/anatomicalToothGeometries";
import {
	derivePeriodontalDiagnosis,
	formatPsrSextantsSummary,
	generatePerio043DiaryText,
} from "../components/odontogram/perio043Protocol";
import {
	ALL_PERIO_TEETH,
	FURCATION_GRADES,
	generateFullMouthProbingSequence,
	getProbingDepthColor,
	isMultiRootedTooth,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_SITES_CONFIG,
	PERIO_UPPER_ARCH_TEETH,
} from "../components/odontogram/perioTypes";

function createTestTooth(
	toothNumber: number,
	defaultPd = 2,
	defaultGm = 0,
): PerioToothRecord {
	return {
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: 0,
		furcation: 0,
		distoBuccal: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midBuccal: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioBuccal: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		distoLingual: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midLingual: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioLingual: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
	};
}

describe("Periodontal Probing, Furcation & Form 043/u Engine", () => {
	it("1. 6-point probing depth recording and depth categorization (1-12mm)", () => {
		// Normal sulcus (1-3mm)
		const normal = getProbingDepthColor(2);
		assert.equal(normal.isDeep, false);
		assert.match(normal.textColor, /emerald/);

		// Moderate pocket (4-5mm)
		const moderate = getProbingDepthColor(5);
		assert.equal(moderate.isDeep, false);
		assert.match(moderate.textColor, /amber/);

		// Severe deep pocket (6-12mm)
		const severe = getProbingDepthColor(8);
		assert.equal(severe.isDeep, true);
		assert.match(severe.textColor, /rose/);

		// Extreme pocket
		const extreme = getProbingDepthColor(12);
		assert.equal(extreme.isDeep, true);
	});

	it("2. Clinical Attachment Level (CAL = PD + GM) calculations for recession and hyperplasia", () => {
		// Normal sulcus with 2mm gingival recession
		assert.equal(calculateClinicalAttachmentLevel(3, 2), 5);

		// 6mm deep pocket with 0mm gingival margin at CEJ
		assert.equal(calculateClinicalAttachmentLevel(6, 0), 6);

		// 5mm pocket with 3mm extensive recession
		assert.equal(calculateClinicalAttachmentLevel(5, 3), 8);

		// 4mm pocket with -2mm gingival enlargement/hyperplasia (pseudo-pocket)
		assert.equal(calculateClinicalAttachmentLevel(4, -2), 2);

		// Bound clamp: CAL cannot be negative
		assert.equal(calculateClinicalAttachmentLevel(1, -3), 0);
	});

	it("3. Bleeding on Probing (BOP) and Full Mouth Bleeding Score (FMBS%)", () => {
		const teeth: PerioToothRecord[] = [
			createTestTooth(11, 2, 0),
			createTestTooth(12, 2, 0),
		];

		// Set BOP on 3 out of 12 sites
		const t0 = teeth[0];
		const t1 = teeth[1];
		if (!t0 || !t1) throw new Error("Teeth missing");
		t0.mesioBuccal.bleedingOnProbing = true;
		t0.distoBuccal.bleedingOnProbing = true;
		t1.midLingual.bleedingOnProbing = true;

		const summary = calculatePerioIndices(teeth);
		assert.equal(summary.totalTeethExamined, 2);
		assert.equal(summary.totalSitesProbed, 12);
		// 3 / 12 = 25.0%
		assert.equal(summary.fmbsPercent, 25.0);
	});

	it("4. Suppuration (Pus exudate) markers and active inflammation counting", () => {
		const teeth: PerioToothRecord[] = [
			createTestTooth(16, 6, 1),
			createTestTooth(46, 7, 2),
		];

		const t0 = teeth[0];
		const t1 = teeth[1];
		if (!t0 || !t1) throw new Error("Teeth missing");
		t0.mesioBuccal.suppuration = true;
		t0.distoBuccal.suppuration = true;
		t1.midBuccal.suppuration = true;

		const summary = calculatePerioIndices(teeth);
		assert.equal(summary.sitesWithSuppurationCount, 3);
		// With 3 suppuration sites, risk category escalates to high
		assert.equal(summary.riskCategory, "high");
	});

	it("5. Multi-rooted tooth detection (isMultiRootedTooth) across arches and dentitions", () => {
		// Upper molars (3 roots)
		assert.equal(isMultiRootedTooth(16), true);
		assert.equal(isMultiRootedTooth(17), true);
		assert.equal(isMultiRootedTooth(26), true);
		assert.equal(isMultiRootedTooth(28), true);

		// Upper 1st premolars (2 roots / bifurcation)
		assert.equal(isMultiRootedTooth(14), true);
		assert.equal(isMultiRootedTooth(24), true);

		// Lower molars (2 roots / bifurcation)
		assert.equal(isMultiRootedTooth(46), true);
		assert.equal(isMultiRootedTooth(47), true);
		assert.equal(isMultiRootedTooth(36), true);
		assert.equal(isMultiRootedTooth(38), true);

		// Single-rooted incisors and canines
		assert.equal(isMultiRootedTooth(11), false);
		assert.equal(isMultiRootedTooth(12), false);
		assert.equal(isMultiRootedTooth(13), false);
		assert.equal(isMultiRootedTooth(21), false);
		assert.equal(isMultiRootedTooth(31), false);
		assert.equal(isMultiRootedTooth(43), false);
		assert.equal(isMultiRootedTooth(35), false); // Lower 2nd premolar

		// Pediatric molars
		assert.equal(isMultiRootedTooth(54), true);
		assert.equal(isMultiRootedTooth(55), true);
		assert.equal(isMultiRootedTooth(84), true);
		assert.equal(isMultiRootedTooth(85), true);
	});

	it("6. Furcation involvement grading (Hamp & Glickman I..IV) and SVG marker generation", () => {
		// Grade I: Incipient (open triangle)
		const g1 = getFurcationMarkerSvg(1, 50, 60, true);
		assert.ok(g1);
		assert.equal(g1.fill, "none");
		assert.equal(g1.stroke, "#f59e0b");
		assert.match(g1.labelRu, /I ст/);

		// Grade II: Partial (semi-filled triangle)
		const g2 = getFurcationMarkerSvg(2, 50, 60, true);
		assert.ok(g2);
		assert.match(g2.fill, /rgba/);
		assert.match(g2.labelRu, /II ст/);

		// Grade III: Through-and-through (solid red triangle)
		const g3 = getFurcationMarkerSvg(3, 50, 60, true);
		assert.ok(g3);
		assert.equal(g3.fill, "#ef4444");
		assert.match(g3.labelRu, /III ст/);

		// Grade IV: Through-and-through with exposed gingival recession
		const g4 = getFurcationMarkerSvg(4, 50, 60, false);
		assert.ok(g4);
		assert.equal(g4.fill, "#dc2626");
		assert.match(g4.labelRu, /IV ст/);

		// Grade 0: None
		const g0 = getFurcationMarkerSvg(0, 50, 60, true);
		assert.equal(g0, null);
	});

	it("7. Tooth mobility grading (Miller Grades 0, I, II, III)", () => {
		const m0 = MOBILITY_GRADES[0];
		const m1 = MOBILITY_GRADES[1];
		const m2 = MOBILITY_GRADES[2];
		const m3 = MOBILITY_GRADES[3];
		if (!m0 || !m1 || !m2 || !m3) throw new Error("Mobility grades missing");
		assert.equal(m0.codeRu, "0");
		assert.equal(m1.codeRu, "I");
		assert.equal(m2.codeRu, "II");
		assert.equal(m3.codeRu, "III");
		assert.match(m3.descriptionRu, /вертикальн/);
	});

	it("8. Full mouth probing sequence generator handles complete dentition and skips missing teeth", () => {
		const teeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num));

		// Mark tooth 14 as missing
		const t14 = teeth.find((t) => t.toothNumber === 14);
		if (t14) t14.isMissing = true;

		const sequence = generateFullMouthProbingSequence(teeth);

		// 31 active teeth * 6 sites = 186 steps
		assert.equal(sequence.length, 31 * 6);

		// Sequence starts with upper quadrant 1 (18 DB -> 18 B -> 18 MB)
		const s0 = sequence[0];
		const s1 = sequence[1];
		const s2 = sequence[2];
		if (!s0 || !s1 || !s2) throw new Error("Sequence missing items");
		assert.equal(s0.toothNumber, 18);
		assert.equal(s0.siteKey, "distoBuccal");
		assert.equal(s1.siteKey, "midBuccal");
		assert.equal(s2.siteKey, "mesioBuccal");

		// Tooth 14 was skipped
		assert.equal(sequence.some((s) => s.toothNumber === 14), false);
	});

	it("9. Periodontal bone level overlay path generation (horizontal & vertical patterns)", () => {
		// Maxillary horizontal bone loss (30%)
		const upperHoriz = getPeriodontalBoneLevelPath(16, 30, "horizontal");
		assert.ok(upperHoriz.boneLine.length > 0);
		assert.ok(upperHoriz.resorptionArea.length > 0);
		assert.match(upperHoriz.boneLine, /^M 14/);

		// Mandibular vertical bone loss (50%)
		const lowerVert = getPeriodontalBoneLevelPath(46, 50, "vertical");
		assert.ok(lowerVert.boneLine.length > 0);
		assert.ok(lowerVert.resorptionArea.length > 0);
		assert.match(lowerVert.boneLine, /^M 14/);

		// Zero bone loss produces empty paths
		const zeroLoss = getPeriodontalBoneLevelPath(11, 0, "none");
		assert.equal(zeroLoss.boneLine, "");
		assert.equal(zeroLoss.resorptionArea, "");
	});

	it("10. Gingival margin recession SVG path generation", () => {
		// 3mm recession on upper molar
		const recUpper = getGingivalRecessionPath(16, 3);
		assert.ok(recUpper.length > 0);
		assert.match(recUpper, /^M 16/);

		// 2mm recession on lower incisor
		const recLower = getGingivalRecessionPath(41, 2);
		assert.ok(recLower.length > 0);
		assert.match(recLower, /^M 16/);

		// 0mm recession
		assert.equal(getGingivalRecessionPath(11, 0), "");
	});

	it("11. PSR/CPITN sextant screening with deep pocket & mobility/furcation asterisks", () => {
		const teeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num, 2, 0));

		// Add 6mm pocket + Grade 2 furcation on tooth 16 (Sextant S1)
		const t16 = teeth.find((t) => t.toothNumber === 16);
		if (t16) {
			t16.mesioBuccal.probingDepthMm = 6;
			t16.furcation = 2;
			t16.mobility = 2;
		}

		const psr = calculatePsrSextants(teeth);
		assert.equal(psr.S1?.code, 4); // Code 4 for PD >= 6mm
		assert.equal(psr.S1?.asterisk, true); // Asterisk for furcation/mobility

		// Sextant S2 (13-23) remains Code 0 (healthy)
		assert.equal(psr.S2?.code, 0);
		assert.equal(psr.S2?.asterisk, false);
	});

	it("12. Clinical tablet touch target floor safety check (>= 44px)", () => {
		// All 32 anatomical tooth geometries must guarantee touchTargetMinPx >= 44
		for (const num of ALL_PERIO_TEETH) {
			const geom = getAnatomicalToothGeometry(num);
			assert.ok(geom.touchTargetMinPx >= 44, `Tooth ${num} touch target floor < 44px`);
		}
	});

	it("13. Full PSR summary string formatting (S1..S6) with asterisk annotations", () => {
		const teeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num, 2, 0));

		// Set S1 (16) to 6mm + furcation (Code 4*)
		const t16 = teeth.find((t) => t.toothNumber === 16);
		if (t16) {
			t16.distoBuccal.probingDepthMm = 6;
			t16.furcation = 2;
		}

		// Set S3 (26) to 4mm pocket (Code 3)
		const t26 = teeth.find((t) => t.toothNumber === 26);
		if (t26) {
			t26.midBuccal.probingDepthMm = 4;
		}

		// Set S6 (46) to Calculus (Code 2)
		const t46 = teeth.find((t) => t.toothNumber === 46);
		if (t46) {
			t46.mesioBuccal.calculus = true;
		}

		const psr = calculatePsrSextants(teeth);
		const summaryStr = formatPsrSextantsSummary(psr);

		assert.match(summaryStr, /S1: 4\*/);
		assert.match(summaryStr, /S2: 0/);
		assert.match(summaryStr, /S3: 3/);
		assert.match(summaryStr, /S4: 0/);
		assert.match(summaryStr, /S5: 0/);
		assert.match(summaryStr, /S6: 2/);
	});

	it("14. Automatic ICD-10 Periodontal Diagnosis Derivation (AAP/EFP 2018)", () => {
		// Case A: Intact Periodontium
		const intactTeeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num, 2, 0));
		const diagIntact = derivePeriodontalDiagnosis(intactTeeth);
		assert.equal(diagIntact.icd10Code, "Z01.2");
		assert.equal(diagIntact.severity, "intact");

		// Case B: Plaque-Induced Gingivitis (BOP > 10%, PD <= 3mm, CAL = 0)
		const gingivitisTeeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num, 2, 0));
		for (let i = 0; i < 25; i++) {
			const t = gingivitisTeeth[i];
			if (t) {
				t.mesioBuccal.bleedingOnProbing = true;
				t.midBuccal.plaque = true;
				t.distoBuccal.plaque = true;
			}
		}
		const diagGingivitis = derivePeriodontalDiagnosis(gingivitisTeeth);
		assert.equal(diagGingivitis.icd10Code, "K05.1");
		assert.equal(diagGingivitis.severity, "gingivitis");

		// Case C: Generalized Moderate Periodontitis Stage II (CAL 3-4mm, PD 4-5mm)
		const modPerioTeeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num, 2, 0));
		for (let i = 0; i < 12; i++) {
			const t = modPerioTeeth[i];
			if (t) {
				t.distoBuccal.probingDepthMm = 4;
				t.distoBuccal.gingivalMarginMm = 0; // CAL = 4mm
			}
		}
		const diagMod = derivePeriodontalDiagnosis(modPerioTeeth);
		assert.equal(diagMod.icd10Code, "K05.32");
		assert.equal(diagMod.severity, "moderate");
		assert.equal(diagMod.isGeneralized, true);

		// Case D: Severe Periodontitis Stage III/IV with Suppuration (Acute Exacerbation)
		const severePerioTeeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num, 2, 0));
		for (let i = 0; i < 15; i++) {
			const t = severePerioTeeth[i];
			if (t) {
				t.distoBuccal.probingDepthMm = 8;
				t.distoBuccal.gingivalMarginMm = 2; // CAL = 10mm
				t.furcation = 2;
				t.mobility = 2;
				t.distoBuccal.suppuration = true;
			}
		}
		const diagSevere = derivePeriodontalDiagnosis(severePerioTeeth);
		assert.equal(diagSevere.icd10Code, "K05.33");
		assert.equal(diagSevere.severity, "severe");
		assert.equal(diagSevere.hasSuppuration, true);
		assert.match(diagSevere.diagnosisNameRu, /обострения/);
	});

	it("15. Form 043/u Structured Protocol Generator produces valid text for medical diary", () => {
		const teeth: PerioToothRecord[] = ALL_PERIO_TEETH.map((num) => createTestTooth(num, 2, 0));

		// Introduce localized moderate periodontitis on 16, 17, 26, 46
		const t16 = teeth.find((t) => t.toothNumber === 16);
		if (t16) {
			t16.mesioBuccal.probingDepthMm = 6;
			t16.mesioBuccal.gingivalMarginMm = 1;
			t16.mesioBuccal.bleedingOnProbing = true;
			t16.mesioBuccal.suppuration = true;
			t16.furcation = 1;
		}

		const protocolText = generatePerio043DiaryText(teeth, undefined, {
			customNotes: "Пациент направлен на закрытый кюретаж 1-го квадранта.",
		});

		assert.ok(protocolText.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (ФОРМА 043/у)"));
		assert.ok(protocolText.includes("1. Скрининг пародонта PSR/CPITN"));
		assert.ok(protocolText.includes("S1: 4*"));
		assert.ok(protocolText.includes("2. Клинические индексы"));
		assert.ok(protocolText.includes("FMBS (BOP):"));
		assert.ok(protocolText.includes("Максимальная глубина карманов (PD): 6 мм"));
		assert.ok(protocolText.includes("3. Клинический диагноз (МКБ-10):"));
		assert.ok(protocolText.includes("K05.32"));
		assert.ok(protocolText.includes("4. Рекомендованный план лечения"));
		assert.ok(protocolText.includes("Scaling & Root Planing"));
		assert.ok(protocolText.includes("Пациент направлен на закрытый кюретаж 1-го квадранта."));
	});
});
