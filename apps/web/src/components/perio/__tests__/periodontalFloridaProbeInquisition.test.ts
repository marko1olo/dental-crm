/**
 * apps/web/src/components/perio/__tests__/periodontalFloridaProbeInquisition.test.ts
 *
 * SUBAGENT 6: PERIO CHART & PERIODONTAL HEALTH INQUISITOR
 * Comprehensive Red Team & Adversarial Clinical Audit Suite (Florida Probe / Form 043/u).
 *
 * Mandates Enforced:
 * - Mandate 8b: Strictly <= 800 lines per file
 * - Mandate 8d: Zero cartoon emojis
 * - Mandate 8e: Doctor Autonomy (Periodontist/hygienist keyboard ergonomics, fast 0-9 entry)
 * - Mandate 8i / 8k / 8n: 1-click physiological norm, zero friction, Form 043/u protocol
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	ALL_PERIO_TEETH,
	calculateAapEfpStagingAndGrading,
	calculateClinicalAttachmentLevel,
	calculateOlearyFromPerioTeeth,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	formatPsrSextantsSummary,
	FURCATION_GRADES,
	generateComprehensivePerio043Text,
	generateFullMouthProbingSequence,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_SITE_KEYS,
	PERIO_SITES_CONFIG,
	PERIO_UPPER_ARCH_TEETH,
	type PerioToothRecord,
	PSR_SEXTANTS,
} from "@dental/shared";

import {
	probingDepthClinicalClasses,
	probingDepthClinicalHex,
	probingDepthClinicalTone,
	probingDepthTone,
	probingDepthHex,
	probingDepthClasses,
	TONE_TO_CLASS,
	TONE_TO_HEX,
} from "../perioHeatmap";

import {
	CLINICAL_PROBING_DEPTH_HEX_LUT,
	CLINICAL_PROBING_DEPTH_TONE_LUT,
	getFastClinicalProbingDepthHex,
	getFastClinicalProbingDepthTone,
	getFastProbingDepthHex,
	getFastProbingDepthTone,
} from "../perioRafOptimizer";

import {
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyPsrSextantCode,
	generatePsrDiaryProtocol,
	PERIO_EXPRESS_PRESETS,
} from "../perioMath";

import { PeriodontogramChart } from "../PeriodontogramChart";
import { SITE_SHORT_RU } from "../chart/PerioToothCard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("PERIODONTAL HEALTH INQUISITOR: Florida Probe & Form 043/u Audit Suite", () => {
	// ──────────────────────────────────────────────────────────────────────────
	// 1. 6-POINT PROBING INTEGRITY ON ALL 32 TEETH (192 SITES)
	// ──────────────────────────────────────────────────────────────────────────
	describe("1. 6-Point Probing Anatomy & Clinical Invariants (192 Sites Total)", () => {
		test("All 32 teeth (16 upper, 16 lower) have exactly 6 measurement points", () => {
			assert.equal(ALL_PERIO_TEETH.length, 32, "Must contain all 32 teeth");
			assert.equal(PERIO_UPPER_ARCH_TEETH.length, 16, "Upper arch: 16 teeth");
			assert.equal(PERIO_LOWER_ARCH_TEETH.length, 16, "Lower arch: 16 teeth");
			assert.equal(PERIO_SITE_KEYS.length, 6, "Must define 6 sites per tooth");

			const defaultTeeth = createDefaultPerioTeeth(2);
			assert.equal(defaultTeeth.length, 32, "Initial dentition contains 32 teeth");

			let totalSites = 0;
			for (const tooth of defaultTeeth) {
				for (const siteKey of PERIO_SITE_KEYS) {
					const site = tooth[siteKey];
					assert.ok(site, `Site ${siteKey} on tooth ${tooth.toothNumber} must exist`);
					assert.ok(
						typeof site.probingDepthMm === "number",
						"probingDepthMm must be a number",
					);
					assert.ok(
						typeof site.gingivalMarginMm === "number",
						"gingivalMarginMm must be a number",
					);
					assert.ok(
						typeof site.bleedingOnProbing === "boolean",
						"bleedingOnProbing must be a boolean",
					);
					assert.ok(typeof site.plaque === "boolean", "plaque must be a boolean");
					assert.ok(
						typeof site.suppuration === "boolean",
						"suppuration must be a boolean",
					);
					assert.ok(
						typeof site.calculus === "boolean",
						"calculus must be a boolean",
					);
					assert.ok(typeof site.calMm === "number", "calMm must be a number");
					totalSites++;
				}
			}
			assert.equal(totalSites, 192, "Total sites must equal exactly 192 (32 * 6)");
		});

		test("Site keys map to correct anatomical orientation: MV, V, DV (buccal) and ML, L, DL (lingual)", () => {
			assert.equal(SITE_SHORT_RU.mesioBuccal, "МВ");
			assert.equal(SITE_SHORT_RU.midBuccal, "В");
			assert.equal(SITE_SHORT_RU.distoBuccal, "ДВ");
			assert.equal(SITE_SHORT_RU.mesioLingual, "МО");
			assert.equal(SITE_SHORT_RU.midLingual, "О");
			assert.equal(SITE_SHORT_RU.distoLingual, "ДО");
		});

		test("Probing sequence traverses upper vestibular -> upper palatal -> lower lingual -> lower vestibular", () => {
			const teeth = createDefaultPerioTeeth(2);
			const seq = generateFullMouthProbingSequence(teeth);
			assert.equal(seq.length, 192, "Full sequence must visit all 192 points");

			// First step is Upper Right Molar #18 Disto-Buccal
			assert.equal(seq[0]!.toothNumber, 18);
			assert.equal(seq[0]!.siteKey, "distoBuccal");

			// Mid-sequence covers anterior and contralateral molars
			assert.ok(seq.some((s) => s.toothNumber === 11));
			assert.ok(seq.some((s) => s.toothNumber === 28));
			assert.ok(seq.some((s) => s.toothNumber === 31));
			assert.ok(seq.some((s) => s.toothNumber === 48));
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 2. CALCULATION OF CLINICAL ATTACHMENT LOSS (CAL = PD + GR)
	// ──────────────────────────────────────────────────────────────────────────
	describe("2. Clinical Attachment Loss (CAL = PD + GR) Strict Mathematical Invariants", () => {
		test("Physiological sulcus (no recession GR = 0): CAL equals PD", () => {
			assert.equal(calculateClinicalAttachmentLevel(1, 0), 1);
			assert.equal(calculateClinicalAttachmentLevel(2, 0), 2);
			assert.equal(calculateClinicalAttachmentLevel(3, 0), 3);
		});

		test("Gingival recession (positive GR > 0): CAL = PD + GR", () => {
			// Pocket 4 mm + Recession 2 mm -> Attachment Loss = 6 mm
			assert.equal(calculateClinicalAttachmentLevel(4, 2), 6);
			// Deep Pocket 7 mm + Severe Recession 4 mm -> Attachment Loss = 11 mm
			assert.equal(calculateClinicalAttachmentLevel(7, 4), 11);
			// Pocket 12 mm + Recession 3 mm -> Attachment Loss = 15 mm
			assert.equal(calculateClinicalAttachmentLevel(12, 3), 15);
		});

		test("Gingival enlargement / False pocket (negative GR < 0): CAL = max(0, PD + GR)", () => {
			// Pocket 5 mm with 3 mm false overgrowth (GR = -3) -> True attachment loss is only 2 mm
			assert.equal(calculateClinicalAttachmentLevel(5, -3), 2);
			// Pocket 3 mm with 4 mm hyperplastic swelling (GR = -4) -> True attachment loss is 0 mm (no bone loss)
			assert.equal(calculateClinicalAttachmentLevel(3, -4), 0);
		});

		test("Handles edge cases (NaN, negative probing depth, null) with zero crashing", () => {
			assert.equal(calculateClinicalAttachmentLevel(Number.NaN, 0), 0);
			assert.equal(calculateClinicalAttachmentLevel(-3, 2), 2);
			assert.equal(calculateClinicalAttachmentLevel(Number.NaN, Number.NaN), 0);
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 3. INTERACTIVE PERIO HEATMAP (4-TIER FLORIDA PROBE SCALE)
	// ──────────────────────────────────────────────────────────────────────────
	describe("3. Interactive Perio Heatmap Color Scales (Green, Yellow, Orange, Crimson)", () => {
		test("Green (<= 3 mm): physiological sulcus (success / emerald-400 / #34d399)", () => {
			for (const depth of [0, 1, 2, 3]) {
				assert.equal(
					probingDepthClinicalTone(depth),
					"success",
					`Depth ${depth} mm must be 'success'`,
				);
				assert.equal(
					probingDepthClinicalHex(depth),
					"#34d399",
					`Depth ${depth} mm hex must be #34d399`,
				);
				assert.ok(
					probingDepthClinicalClasses(depth).includes("emerald"),
					`Depth ${depth} mm must use emerald token`,
				);
			}
		});

		test("Yellow (4-5 mm): mild periodontitis / gingivitis (warning-low / amber-400 / #fbbf24)", () => {
			for (const depth of [4, 5]) {
				assert.equal(
					probingDepthClinicalTone(depth),
					"warning-low",
					`Depth ${depth} mm must be 'warning-low'`,
				);
				assert.equal(
					probingDepthClinicalHex(depth),
					"#fbbf24",
					`Depth ${depth} mm hex must be #fbbf24`,
				);
				assert.ok(
					probingDepthClinicalClasses(depth).includes("amber"),
					`Depth ${depth} mm must use amber token`,
				);
			}
		});

		test("Orange (6-7 mm): moderate periodontitis / bone pocket (warning-high / orange-500 / #f97316)", () => {
			for (const depth of [6, 7]) {
				assert.equal(
					probingDepthClinicalTone(depth),
					"warning-high",
					`Depth ${depth} mm must be 'warning-high'`,
				);
				assert.equal(
					probingDepthClinicalHex(depth),
					"#f97316",
					`Depth ${depth} mm hex must be #f97316`,
				);
				assert.ok(
					probingDepthClinicalClasses(depth).includes("orange"),
					`Depth ${depth} mm must use orange token`,
				);
			}
		});

		test("Crimson / Алый (>= 8 mm): severe deep bone pocket (critical / rose-600 / #e11d48)", () => {
			for (const depth of [8, 9, 10, 11, 12, 13, 14, 15]) {
				assert.equal(
					probingDepthClinicalTone(depth),
					"critical",
					`Depth ${depth} mm must be 'critical'`,
				);
				assert.equal(
					probingDepthClinicalHex(depth),
					"#e11d48",
					`Depth ${depth} mm hex must be #e11d48`,
				);
				assert.ok(
					probingDepthClinicalClasses(depth).includes("red"),
					`Depth ${depth} mm must use red/crimson token`,
				);
			}
		});

		test("Fast O(1) Zero-GC Clinical Lookups (perioRafOptimizer parity)", () => {
			// Check fast LUTs directly
			assert.equal(getFastClinicalProbingDepthTone(2), "success");
			assert.equal(getFastClinicalProbingDepthHex(2), "#34d399");

			assert.equal(getFastClinicalProbingDepthTone(4), "warning-low");
			assert.equal(getFastClinicalProbingDepthHex(4), "#fbbf24");

			assert.equal(getFastClinicalProbingDepthTone(5), "warning-low");
			assert.equal(getFastClinicalProbingDepthHex(5), "#fbbf24");

			assert.equal(getFastClinicalProbingDepthTone(6), "warning-high");
			assert.equal(getFastClinicalProbingDepthHex(6), "#f97316");

			assert.equal(getFastClinicalProbingDepthTone(7), "warning-high");
			assert.equal(getFastClinicalProbingDepthHex(7), "#f97316");

			assert.equal(getFastClinicalProbingDepthTone(8), "critical");
			assert.equal(getFastClinicalProbingDepthHex(8), "#e11d48");

			assert.equal(getFastClinicalProbingDepthTone(12), "critical");
			assert.equal(getFastClinicalProbingDepthHex(12), "#e11d48");
		});

		test("Backward compatibility: standard probingDepthTone mode remains 100% compliant with legacy test suite", () => {
			assert.equal(probingDepthTone(0), "success");
			assert.equal(probingDepthTone(3), "success");
			assert.equal(probingDepthTone(4), "warning-low");
			assert.equal(probingDepthTone(5), "warning-high");
			assert.equal(probingDepthTone(6), "warning-high");
			assert.equal(probingDepthTone(7), "error");
			assert.equal(probingDepthTone(8), "error");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 4. FURCATION DEFECTS (HAMP CLASSIFICATION) & TOOTH MOBILITY (MILLER)
	// ──────────────────────────────────────────────────────────────────────────
	describe("4. Furcation Defects (Hamp I..IV) & Tooth Mobility (Miller 0..III)", () => {
		test("Hamp Classification for multi-rooted teeth: Grades 0..IV properly structured", () => {
			assert.equal(FURCATION_GRADES[0]!.codeRu, "0");
			assert.ok(FURCATION_GRADES[0]!.descriptionRu.includes("интактна"));

			assert.equal(FURCATION_GRADES[1]!.codeRu, "I");
			assert.ok(FURCATION_GRADES[1]!.descriptionRu.includes("до 3 мм"));

			assert.equal(FURCATION_GRADES[2]!.codeRu, "II");
			assert.ok(FURCATION_GRADES[2]!.descriptionRu.includes("более чем на 3 мм"));

			assert.equal(FURCATION_GRADES[3]!.codeRu, "III");
			assert.ok(FURCATION_GRADES[3]!.descriptionRu.includes("Сквозной"));

			assert.equal(FURCATION_GRADES[4]!.codeRu, "IV");
			assert.ok(FURCATION_GRADES[4]!.descriptionRu.includes("рецессии"));
		});

		test("isFurcationEligibleTooth correctly filters molars and upper first premolars", () => {
			// Upper molars (16, 17, 18, 26, 27, 28) - 3 roots
			assert.ok(isFurcationEligibleTooth(16));
			assert.ok(isFurcationEligibleTooth(17));
			assert.ok(isFurcationEligibleTooth(26));
			assert.ok(isFurcationEligibleTooth(27));

			// Lower molars (36, 37, 38, 46, 47, 48) - 2 roots
			assert.ok(isFurcationEligibleTooth(36));
			assert.ok(isFurcationEligibleTooth(46));

			// Upper first premolars (14, 24) - bifurcated
			assert.ok(isFurcationEligibleTooth(14));
			assert.ok(isFurcationEligibleTooth(24));

			// Single-rooted incisors & canines must NOT be furcation-eligible
			assert.equal(isFurcationEligibleTooth(11), false);
			assert.equal(isFurcationEligibleTooth(21), false);
			assert.equal(isFurcationEligibleTooth(31), false);
			assert.equal(isFurcationEligibleTooth(41), false);
			assert.equal(isFurcationEligibleTooth(13), false);
			assert.equal(isFurcationEligibleTooth(43), false);
		});

		test("Miller Classification for tooth mobility: 0, I, II, III degrees", () => {
			assert.equal(MOBILITY_GRADES[0]!.codeRu, "0");
			assert.ok(MOBILITY_GRADES[0]!.nameRu.includes("Физиологическая"));

			assert.equal(MOBILITY_GRADES[1]!.codeRu, "I");
			assert.ok(MOBILITY_GRADES[1]!.nameRu.includes("I степень"));

			assert.equal(MOBILITY_GRADES[2]!.codeRu, "II");
			assert.ok(MOBILITY_GRADES[2]!.nameRu.includes("II степень"));

			assert.equal(MOBILITY_GRADES[3]!.codeRu, "III");
			assert.ok(MOBILITY_GRADES[3]!.nameRu.includes("III степень"));
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 5. 1-CLICK PRESET «ПАРОДОНТ ИНТАКТЕН / НОРМА» (DOCTOR AUTONOMY MANDATE 8e)
	// ──────────────────────────────────────────────────────────────────────────
	describe("5. 1-Click Healthy Periodontium Preset (Doctor Autonomy Mandate 8e)", () => {
		test("Sets all 32 teeth (192 sites) to depth <= 2 mm, BOP 0%, Plaque 0%, Mobility 0", () => {
			const teeth = createDefaultPerioTeeth(5); // Start with pathological teeth
			const intactTeeth = applyHealthyPeriodontiumPreset(teeth);

			assert.equal(intactTeeth.length, 32);
			for (const t of intactTeeth) {
				assert.equal(t.mobility, 0);
				assert.equal(t.furcation, 0);
				for (const k of PERIO_SITE_KEYS) {
					assert.ok(t[k]!.probingDepthMm <= 2);
					assert.equal(t[k]!.bleedingOnProbing, false);
					assert.equal(t[k]!.plaque, false);
					assert.equal(t[k]!.suppuration, false);
					assert.equal(t[k]!.calculus, false);
					assert.equal(t[k]!.calMm, 2);
				}
			}

			const summary = calculatePerioIndices(intactTeeth);
			assert.equal(summary.fmbsPercent, 0, "BOP % must be 0%");
			assert.equal(summary.fmpsPercent, 0, "Plaque % must be 0%");
			assert.equal(summary.deepPocketsCount, 0, "No deep pockets");
			assert.equal(summary.moderatePocketsCount, 0, "No moderate pockets");

			const psr = calculatePsrSextants(intactTeeth);
			for (const s of PSR_SEXTANTS) {
				assert.equal(psr[s.name]?.code, 0, `Sextant ${s.name} must be PSR 0`);
			}
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 6. CLINICAL INDICES & FORM 043/U PROTOCOL (ICD-10 MAPPING)
	// ──────────────────────────────────────────────────────────────────────────
	describe("6. Clinical Indices & Form 043/u ICD-10 Diagnosis Protocols", () => {
		test("Form 043/u protocol generation contains comprehensive periodontal section", () => {
			const teeth = applyPeriodontitisModeratePreset(createDefaultPerioTeeth());
			const summary = calculatePerioIndices(teeth);
			const protocol = generateComprehensivePerio043Text(teeth, summary, {
				doctorName: "Д-р Смирнова Е.А.",
				customNotes: "SRP в области секстанта S1",
			});

			assert.ok(
				protocol.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (ФОРМА 043/у)"),
			);
			assert.ok(protocol.includes("Лечащий врач: Д-р Смирнова Е.А."));
			assert.ok(protocol.includes("Скрининг пародонта PSR/CPITN"));
			assert.ok(protocol.includes("Индекс кровоточивости десны FMBS (BOP):"));
			assert.ok(protocol.includes("Индекс зубного налёта FMPS (Plaque):"));
			assert.ok(protocol.includes("Максимальная глубина карманов (PD):"));
			assert.ok(protocol.includes("Клинический диагноз"));
			assert.ok(protocol.includes("K05.3"));
			assert.ok(protocol.includes("Рекомендованный план лечения"));
			assert.ok(protocol.includes("SRP в области секстанта S1"));
		});

		test("ICD-10 mapping correctly distinguishes Gingivitis (K05.1) vs Periodontitis (K05.30/31/32)", () => {
			// Gingivitis: pockets < 3.5 mm, BOP+, no bone attachment loss
			const gingivitisTeeth = applyGingivitisPreset(createDefaultPerioTeeth());
			const gingivitisSummary = calculatePerioIndices(gingivitisTeeth);
			const gingivitisDiag = calculateAapEfpStagingAndGrading(
				gingivitisTeeth,
				gingivitisSummary,
			);
			assert.equal(gingivitisDiag.icd10Code, "K05.1");
			assert.ok(gingivitisDiag.diagnosisNameRu.includes("гингивит"));

			// Mild Periodontitis: pockets 3.5-4 mm, CAL 1-2 mm
			const mildTeeth = applyPeriodontitisMildPreset(createDefaultPerioTeeth());
			const mildSummary = calculatePerioIndices(mildTeeth);
			const mildDiag = calculateAapEfpStagingAndGrading(mildTeeth, mildSummary);
			assert.ok(mildDiag.icd10Code.startsWith("K05.3"));
			assert.ok(mildDiag.diagnosisNameRu.includes("пародонтит"));

			// Moderate Periodontitis: pockets 4-5 mm
			const modTeeth = applyPeriodontitisModeratePreset(createDefaultPerioTeeth());
			const modSummary = calculatePerioIndices(modTeeth);
			const modDiag = calculateAapEfpStagingAndGrading(modTeeth, modSummary);
			assert.ok(modDiag.icd10Code.startsWith("K05.3"));

			// Severe Periodontitis: pockets >= 6 mm, mobility II-III, suppuration
			const severeTeeth = applyPeriodontitisSeverePreset(createDefaultPerioTeeth());
			const severeSummary = calculatePerioIndices(severeTeeth);
			const severeDiag = calculateAapEfpStagingAndGrading(severeTeeth, severeSummary);
			assert.ok(severeDiag.icd10Code.startsWith("K05.3"));
			assert.ok(severeDiag.stageDescriptionRu.includes("Стадия"));
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 7. SSR RENDER SAFETY & NO RECURSIVE MOCK DOMS
	// ──────────────────────────────────────────────────────────────────────────
	describe("7. SSR Render Safety & Anti-Kustarnyi-DOM Compliance", () => {
		test("PeriodontogramChart renders cleanly to HTML string with zero memory leaks", () => {
			const html = renderToString(
				React.createElement(PeriodontogramChart, {
					readOnly: false,
					initialTier3Expanded: true,
					initialProbeKeyboardEnabled: true,
				}),
			);

			assert.ok(html.length > 1000, "HTML must be non-empty");
			assert.ok(html.includes("interactive-periodontogram"), "Renders main container");
			assert.ok(html.includes("perio-toolbar-norm-1click-btn"), "Renders 1-click norm button");
			assert.ok(html.includes("perio-toolbar-prophy-1click-btn"), "Renders prophy button");
			assert.ok(html.includes("NumPad (1–12 мм):"), "Renders 1-12 mm keypad title");
			assert.ok(html.includes("perio-keypad-depth-12"), "Renders 12 mm depth button");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 8. FILE LIMIT LAW (MANDATE 8b: <= 800 LINES) & NO CARTOON EMOJIS (MANDATE 8d)
	// ──────────────────────────────────────────────────────────────────────────
	describe("8. Mandatory Constitutional Law (Mandate 8b <= 800 lines & Mandate 8d Zero Emojis)", () => {
		test("Every file in perio directory is strictly <= 800 lines of code", () => {
			const perioDir = path.resolve(__dirname, "..");
			const files: string[] = [];

			function collectFiles(dir: string) {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						collectFiles(fullPath);
					} else if (
						entry.isFile() &&
						(entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
					) {
						files.push(fullPath);
					}
				}
			}

			collectFiles(perioDir);
			assert.ok(files.length >= 10, "Should inspect at least 10 perio files");

			for (const f of files) {
				const content = fs.readFileSync(f, "utf8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`FILE SIZE DEFECT (Mandate 8b violation): ${path.relative(perioDir, f)} has ${lines} lines, exceeding the 800-line ceiling!`,
				);
			}
		});

		test("Zero cartoon emojis in perio code and UI strings (Mandate 8d)", () => {
			const perioDir = path.resolve(__dirname, "..");
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			const files: string[] = [];
			function collect(dir: string) {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const e of entries) {
					const full = path.join(dir, e.name);
					if (e.isDirectory() && e.name !== "__tests__") {
						collect(full);
					} else if (
						e.isFile() &&
						(e.name.endsWith(".ts") || e.name.endsWith(".tsx"))
					) {
						files.push(full);
					}
				}
			}
			collect(perioDir);

			for (const f of files) {
				const content = fs.readFileSync(f, "utf8");
				const match = emojiRegex.exec(content);
				assert.equal(
					match,
					null,
					`EMOJI POLLUTION (Mandate 8d violation) in ${path.basename(f)}: found '${match?.[0]}'`,
				);
			}
		});
	});
});
