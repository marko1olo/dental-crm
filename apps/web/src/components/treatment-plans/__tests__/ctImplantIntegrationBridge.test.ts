/**
 * ctImplantIntegrationBridge.test.ts — Comprehensive inquisition tests for CBCT 3D Implant Treatment Plan Bridge.
 * Standards: Planmeca Romexis 3D Implant, Vatech Ez3D-i, Anatomage, Misch CE (2008).
 *
 * Mandates:
 * - Mandate 8b: strictly <= 800 lines.
 * - Mandate 8d: zero cartoon emojis.
 * - Mandate 8e: Doctor Autonomy (pure non-blocking workflows, calm clinical metrics).
 * - ACID / 54-FZ: integer kopeck math, 0% installments, 13% NDFL tax deduction (Code 01/02).
 * - Encoding: strict UTF-8 without BOM.
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { parseKopecks, sumKopecks } from "@dental/shared";
import {
	BRAND_DEFAULTS,
	buildBoneAugmentationItems,
	buildDestructionAndProstheticsItems,
	buildImplantSurgicalPackageItems,
	extractCbctFindingsFromOdontogramAndStorage,
	generateCbctAutoPlanScenarios,
	type CbctAutoPlanFindingsInput,
	type CbctImplantFinding,
} from "../ctImplantIntegrationBridge";
import type { ImplantBrandKey } from "../../radiology/implantSafetyEngine";

describe("ctImplantIntegrationBridge — 5-Brand Virtual Implant Planning & 3-Tier Treatment Plan Bridge", () => {
	const ALL_FIVE_BRANDS: readonly ImplantBrandKey[] = [
		"straumann",
		"nobel_biocare",
		"dentium",
		"osstem",
		"mis",
	];

	describe("1. All 5 Global Implant Brands Support & Order 804n Compliance", () => {
		test("BRAND_DEFAULTS contains verified pricing and clinical labels for all 5 brands", () => {
			for (const brand of ALL_FIVE_BRANDS) {
				const info = BRAND_DEFAULTS[brand];
				assert.ok(info, `Brand ${brand} must exist in BRAND_DEFAULTS`);
				assert.ok(info.label.length > 5, `Brand ${brand} must have valid Russian label`);
				assert.ok(info.economy > 0, `Brand ${brand} economy price must be > 0`);
				assert.ok(info.standard >= info.economy, `Brand ${brand} standard price >= economy`);
				assert.ok(info.premium >= info.standard, `Brand ${brand} premium price >= standard`);
			}
		});

		test("buildImplantSurgicalPackageItems generates complete 4-item surgical package for each of the 5 brands", () => {
			for (const brand of ALL_FIVE_BRANDS) {
				const finding: CbctImplantFinding = {
					toothFdi: 36,
					brand,
					diameterMm: 4.1,
					lengthMm: 11.5,
					ridgeHeightMm: 13.0,
					ridgeWidthMm: 7.5,
					mischClass: "D2",
					meanHU: 800,
					nerveClearanceMm: 3.5,
					recommendedTorqueNcm: "35-45 Н·см",
				};

				const items = buildImplantSurgicalPackageItems(finding, "standard");
				assert.equal(items.length, 4, `Brand ${brand} must generate exactly 4 surgical items`);

				const codes = items.map((i) => i.code804n);
				assert.ok(codes.includes("A16.07.054.001"), "A16.07.054.001 Implantation");
				assert.ok(codes.includes("A16.07.054.002"), "A16.07.054.002 Abutment / Healing");
				assert.ok(codes.includes("A11.07.012"), "A11.07.012 Anesthesia");
				assert.ok(codes.includes("A16.07.097"), "A16.07.097 Suture");

				const implantItem = items.find((i) => i.code804n === "A16.07.054.001")!;
				assert.equal(implantItem.toothNumber, 36);
				assert.ok(implantItem.name.includes("Ø4.1"));
				assert.ok(implantItem.name.includes("11.5 мм"));
				assert.ok(implantItem.priceRub > 0);
			}
		});

		test("price subordination holds across tiers for all 5 brands (Economy < Standard < Premium)", () => {
			for (const brand of ALL_FIVE_BRANDS) {
				const finding: CbctImplantFinding = { toothFdi: 46, brand };
				const econ = buildImplantSurgicalPackageItems(finding, "economy");
				const std = buildImplantSurgicalPackageItems(finding, "standard");
				const opt = buildImplantSurgicalPackageItems(finding, "optimum");

				const econPrice = econ.reduce((sum, it) => sum + it.priceRub, 0);
				const stdPrice = std.reduce((sum, it) => sum + it.priceRub, 0);
				const optPrice = opt.reduce((sum, it) => sum + it.priceRub, 0);

				assert.ok(econPrice < stdPrice, `Brand ${brand}: economy (${econPrice}) must be < standard (${stdPrice})`);
				assert.ok(stdPrice < optPrice, `Brand ${brand}: standard (${stdPrice}) must be < optimum (${optPrice})`);
			}
		});
	});

	describe("2. 3-Tier Clinical Architecture (Economy, Optimum, Premium)", () => {
		test("scenarios map to correct clinical tiers (Premium: Straumann, Optimum: Dentium, Economy: Osstem)", () => {
			const input: CbctAutoPlanFindingsInput = {
				patientId: "pat-5brand-01",
				patientName: "Василий Петров",
				implants: [{ toothFdi: 46, diameterMm: 4.5, lengthMm: 10.0 }],
			};

			const [econ, opt, prem] = generateCbctAutoPlanScenarios(input);

			assert.equal(econ.tierId, "economy");
			assert.equal(opt.tierId, "standard");
			assert.equal(prem.tierId, "optimum");

			const econSurg = econ.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
			const optSurg = opt.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
			const premSurg = prem.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;

			assert.ok(econSurg.name.toLowerCase().includes("osstem"), "Economy default is Osstem");
			assert.ok(optSurg.name.toLowerCase().includes("dentium"), "Optimum default is Dentium");
			assert.ok(premSurg.name.toLowerCase().includes("straumann"), "Premium default is Straumann");

			// Orthopedic crowns differentiation across tiers
			const econOrtho = econ.stages[3]!.items.find((i) => i.code804n.startsWith("A16.07.004"))!;
			const optOrtho = opt.stages[3]!.items.find((i) => i.code804n.startsWith("A16.07.004"))!;
			const premOrtho = prem.stages[3]!.items.find((i) => i.code804n.startsWith("A16.07.004"))!;

			assert.ok(econOrtho.name.toLowerCase().includes("металлокерамическ"), "Economy has metal-ceramic crown");
			assert.ok(optOrtho.name.toLowerCase().includes("zro2") || optOrtho.name.toLowerCase().includes("циркони"), "Optimum has zirconia crown");
			assert.ok(premOrtho.name.toLowerCase().includes("e.max") || premOrtho.name.toLowerCase().includes("цельнокерамическ"), "Premium has E.max crown");
		});

		test("supports doctor autonomy tierBrands override (e.g. Nobel in Premium, MIS in Economy)", () => {
			const input: CbctAutoPlanFindingsInput = {
				patientId: "pat-custom-brand-02",
				patientName: "Ольга Семенова",
				implants: [{ toothFdi: 25, diameterMm: 4.0, lengthMm: 11.5 }],
				tierBrands: {
					optimum: "nobel_biocare",
					standard: "osstem",
					economy: "mis",
				},
			};

			const [econ, opt, prem] = generateCbctAutoPlanScenarios(input);

			const econSurg = econ.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
			const optSurg = opt.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;
			const premSurg = prem.stages[2]!.items.find((i) => i.code804n === "A16.07.054.001")!;

			assert.ok(econSurg.name.toLowerCase().includes("mis"), "Custom Economy brand is MIS");
			assert.ok(optSurg.name.toLowerCase().includes("osstem"), "Custom Standard brand is Osstem");
			assert.ok(premSurg.name.toLowerCase().includes("nobel"), "Custom Premium brand is Nobel Biocare");
		});
	});

	describe("3. Misch Bone Quality (D1-D4) & HU Density Integrity", () => {
		test("embeds Misch density class and Hounsfield Units into surgical clinicalRationale", () => {
			const testCases = [
				{ class: "D1", hu: 1350, torque: ">= 45 Н·см" },
				{ class: "D2", hu: 920, torque: "35-45 Н·см" },
				{ class: "D3", hu: 550, torque: "30-35 Н·см" },
				{ class: "D4", hu: 220, torque: "20-30 Н·см" },
			];

			for (const tc of testCases) {
				const finding: CbctImplantFinding = {
					toothFdi: 47,
					brand: "osstem",
					mischClass: tc.class,
					meanHU: tc.hu,
					recommendedTorqueNcm: tc.torque,
					ridgeHeightMm: 11.0,
					ridgeWidthMm: 6.5,
				};

				const items = buildImplantSurgicalPackageItems(finding, "standard");
				const implantItem = items.find((i) => i.code804n === "A16.07.054.001")!;

				assert.ok(implantItem.clinicalRationale?.includes(tc.class), `Must contain Misch ${tc.class}`);
				assert.ok(implantItem.clinicalRationale?.includes(`${tc.hu} HU`), `Must contain ${tc.hu} HU`);
				assert.ok(implantItem.clinicalRationale?.includes(tc.torque), `Must contain torque ${tc.torque}`);
			}
		});
	});

	describe("4. Mandibular Canal Clearance & Zero-Panic Telemetry (Mandate 8e)", () => {
		test("records calm objective distance when nerve canal clearance is safe (>= 2.0 mm)", () => {
			const finding: CbctImplantFinding = {
				toothFdi: 46,
				brand: "dentium",
				nerveClearanceMm: 3.8,
			};

			const items = buildImplantSurgicalPackageItems(finding, "standard");
			const rationale = items[0]!.clinicalRationale || "";

			assert.ok(rationale.includes("3.8 мм"));
			assert.ok(!rationale.includes("ОПАСНОСТЬ"));
			assert.ok(!rationale.includes("ТРЕВОГА"));
		});

		test("provides objective critical buffer notice without alarmist shouting when clearance < 2.0 mm", () => {
			const finding: CbctImplantFinding = {
				toothFdi: 36,
				brand: "straumann",
				nerveClearanceMm: 1.2,
			};

			const items = buildImplantSurgicalPackageItems(finding, "optimum");
			const rationale = items[0]!.clinicalRationale || "";

			assert.ok(rationale.includes("1.2 мм"));
			assert.ok(rationale.includes("зазор до нижнечелюстного нерва"));
		});

		test("handles unmeasured canal gracefully with calm fallback", () => {
			const finding: CbctImplantFinding = {
				toothFdi: 11,
				brand: "straumann",
				nerveClearanceMm: null,
			};

			const items = buildImplantSurgicalPackageItems(finding, "optimum");
			const rationale = items[0]!.clinicalRationale || "";

			assert.ok(rationale.includes("Безопасная зона") || rationale.includes("не измерялась"));
		});
	});

	describe("5. ACID Kopeck-Exact Financial Integrity & 54-FZ Compliance", () => {
		test("total tier kopecks strictly equals the exact sum of all 4 stage kopecks", () => {
			const input: CbctAutoPlanFindingsInput = {
				patientId: "pat-acid-test",
				patientName: "Дмитрий Ковалев",
				implants: [
					{ toothFdi: 46, brand: "dentium", diameterMm: 4.5, lengthMm: 10.0 },
					{ toothFdi: 16, brand: "dentium", diameterMm: 4.5, lengthMm: 10.0, needsSinusLift: true },
				],
				toothDestructions: [
					{ toothFdi: 47, destructionLevel: "pulpitis", rootCanalCount: 3 },
					{ toothFdi: 38, destructionLevel: "subgingival_fracture_hopeless", isHopelessForExtraction: true },
				],
			};

			const tiers = generateCbctAutoPlanScenarios(input);

			for (const tier of tiers) {
				const stageSumKopecks = sumKopecks(tier.stages.map((s) => s.totalKopecks));
				assert.equal(
					tier.totalKopecks,
					stageSumKopecks,
					`Tier ${tier.tierId}: totalKopecks (${tier.totalKopecks}) must equal stage sum (${stageSumKopecks})`,
				);

				// Verify 30/40/30 schedule balance
				assert.ok(tier.stagedSchedule.isBalanced, `Tier ${tier.tierId} 30/40/30 schedule must be balanced`);
				const scheduleTotal =
					tier.stagedSchedule.stage1AdvanceTherapyRub +
					tier.stagedSchedule.stage2SurgeryImplantRub +
					tier.stagedSchedule.stage3OrthopedicsRub;
				assert.equal(scheduleTotal, tier.totalRub);

				// Verify 12-month installment division
				const inst12 = tier.installments[12]!;
				assert.ok(inst12.monthlyPaymentRub > 0);
				assert.ok(Math.abs(inst12.monthlyPaymentRub * 12 - tier.totalRub) <= 12);

				// Verify NDFL 13% tax deduction
				assert.ok(tier.ndflRefundRub > 0);
				assert.equal(tier.ndflDetails.isHighCostCode02, true, "Implantology triggers Code 02 expensive treatment");
			}
		});

		test("honors custom clinic price override (customPriceRub)", () => {
			const customPrice = 33333;
			const finding: CbctImplantFinding = {
				toothFdi: 46,
				brand: "osstem",
				customPriceRub: customPrice,
			};

			const items = buildImplantSurgicalPackageItems(finding, "standard");
			const implantItem = items.find((i) => i.code804n === "A16.07.054.001")!;

			assert.equal(implantItem.priceRub, customPrice);
			assert.equal(implantItem.unitPriceRub, customPrice);
		});
	});

	describe("6. Mandatory Non-Falsification & Emoji Ban (Mandates 8d, 8e)", () => {
		test("contains zero cartoon emojis in generated treatment plan item names, rationale, or stages", () => {
			const input: CbctAutoPlanFindingsInput = {
				patientId: "pat-emoji-check",
				patientName: "Елена Воронова",
				implants: [{ toothFdi: 46, brand: "straumann", diameterMm: 4.1, lengthMm: 10.0 }],
				toothDestructions: [{ toothFdi: 47, destructionLevel: "caries" }],
			};

			const tiers = generateCbctAutoPlanScenarios(input);
			// Regex matching cartoon emojis (Mandate 8d)
			const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;

			for (const tier of tiers) {
				assert.doesNotMatch(tier.title, emojiRegex, `Tier title must have no emojis: ${tier.title}`);
				for (const stage of tier.stages) {
					assert.doesNotMatch(stage.title, emojiRegex, `Stage title must have no emojis: ${stage.title}`);
					for (const item of stage.items) {
						assert.doesNotMatch(item.name, emojiRegex, `Item name must have no emojis: ${item.name}`);
						if (item.clinicalRationale) {
							assert.doesNotMatch(item.clinicalRationale, emojiRegex, `Rationale must have no emojis`);
						}
					}
				}
			}
		});
	});
});
