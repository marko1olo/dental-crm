/**
 * clinicalSafetyPhr01Phr02End02.test.ts
 *
 * Dedicated Red Team Inquisitor Test Suite for Clinical Safety Defects:
 * - [PHR-01] & [PHR-02]: Patient Drug Allergy Detection & Anesthesia Safety Matrix (Lidocaine, Articaine)
 * - [END-02]: Anti-Falsification in Endodontic Protocols (Chronic Periodontitis vs Acute Pulpitis AH Plus obturation)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	evaluateSomaticAndAllergyRisks,
} from "@dental/shared";
import {
	calculateDeterministicAnesthesia,
} from "@dental/shared/ai";
import {
	calculateAnesthesiaSafety,
} from "../components/anesthesia/anesthesiaEngine";
import {
	generateSoapEndoProtocol,
} from "../components/endo/ChairsideEndoQuickBar";

describe("Clinical Safety & Protocol Inquisition: [PHR-01], [PHR-02], [END-02]", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. [PHR-01] & [PHR-02]: DRUG ALLERGY PROPAGATION & CONTRAINDICATIONS
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. [PHR-01] & [PHR-02] Anesthesia Allergy Matrix (Lidocaine & Articaine)", () => {
		it("detects lidocaine allergy in evaluateSomaticAndAllergyRisks and flags critical contraindication", () => {
			const evaluation = evaluateSomaticAndAllergyRisks({
				knownAllergies: ["Лидокаин", "Аллергический ринит"],
				proposedMedications: ["Лидокаин 2% с адреналином 1:100 000"],
			});

			const lidocaineContraindication = evaluation.allergyWarnings.find(
				(w) => w.severity === "critical" && w.allergenGroup.includes("Лидокаин"),
			);

			assert.ok(
				lidocaineContraindication,
				"Must detect critical contraindication for Lidocaine allergy",
			);
			assert.ok(
				evaluation.safeAlternativeRecommendations.some((r) =>
					r.recommendedAlternatives.some((alt) => alt.includes("Мепивакаин") || alt.includes("Скандонест")),
				),
				"Must suggest safe alternative (e.g. Mepivacaine)",
			);
		});

		it("detects articaine allergy in evaluateSomaticAndAllergyRisks and flags critical contraindication", () => {
			const evaluation = evaluateSomaticAndAllergyRisks({
				knownAllergies: ["Ультракаин (артикаин)"],
				proposedMedications: ["Септанест 1:100 000 (артикаин)"],
			});

			const articaineContraindication = evaluation.allergyWarnings.find(
				(w) => w.severity === "critical" && w.allergenGroup.includes("Артикаин"),
			);

			assert.ok(
				articaineContraindication,
				"Must detect critical contraindication for Articaine allergy",
			);
		});

		it("blocks safe carpules to 0 in calculateDeterministicAnesthesia on Lidocaine allergy", () => {
			const result = calculateDeterministicAnesthesia({
				patient: {
					weightKg: 70,
					ageYears: 35,
					somaticConditions: {
						hasLidocaineAllergy: true,
					},
				},
				formulationKey: "lidocaine_2_plain",
			});

			assert.strictEqual(result.safeCarpulesMax, 0);
			assert.ok(result.isContraindicated);
			assert.ok(
				result.contraindicationReasonRu?.includes("Лидокаин") ||
					result.safetyWarningsRu.some((w) => w.includes("Лидокаин")),
			);
		});

		it("blocks safe carpules to 0 in calculateDeterministicAnesthesia on Articaine allergy", () => {
			const result = calculateDeterministicAnesthesia({
				patient: {
					weightKg: 65,
					ageYears: 28,
					somaticConditions: {
						hasArticaineAllergy: true,
					},
				},
				formulationKey: "articaine_4_epi_100k",
			});

			assert.strictEqual(result.safeCarpulesMax, 0);
			assert.ok(result.isContraindicated);
			assert.ok(
				result.contraindicationReasonRu?.includes("Артикаин") ||
					result.safetyWarningsRu.some((w) => w.includes("Артикаин")),
			);
		});

		it("calculates overdose_danger in web calculateAnesthesiaSafety when allergy is flagged", () => {
			const safetyLido = calculateAnesthesiaSafety({
				drugId: "lidocaine_plain",
				carpulesCount: 1,
				patientWeightKg: 70,
				hasLidocaineAllergy: true,
				hasArticaineAllergy: false,
			});

			assert.strictEqual(safetyLido.safetyZone, "overdose_danger");
			assert.ok(
				safetyLido.contraindicationsTriggered.some((c) => c.includes("ЛИДОКАИН")),
				"Must explain Lidocaine allergy contraindication",
			);

			const safetyArt = calculateAnesthesiaSafety({
				drugId: "articaine_1_100k",
				carpulesCount: 1,
				patientWeightKg: 70,
				hasLidocaineAllergy: false,
				hasArticaineAllergy: true,
			});

			assert.strictEqual(safetyArt.safetyZone, "overdose_danger");
			assert.ok(
				safetyArt.contraindicationsTriggered.some((c) => c.includes("АРТИКАИН")),
				"Must explain Articaine allergy contraindication",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. [END-02]: ENDODONTIC PROTOCOL INTEGRITY (CHRONIC PERIODONTITIS VS PULPITIS)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. [END-02] Endodontic Protocol Integrity (AH Plus Obturation)", () => {
		it("generates Chronic Periodontitis Stage 2 protocol without acute pulpitis falsification", () => {
			const protocol = generateSoapEndoProtocol({
				activeTooth: 46,
				toothAnatomicalName: "Нижний правый первый моляр",
				toothState: "Периодонтит",
			});

			// Must NOT generate acute pulpitis
			assert.ok(
				!protocol.includes("Острый пульпит (K04.0)"),
				"Must NEVER generate acute pulpitis diagnosis for periodontitis tooth",
			);
			assert.ok(
				!protocol.toLowerCase().includes("экстирпация пульпы"),
				"Must NEVER generate pulp extirpation for necrotic periodontitis tooth",
			);

			// Must generate periodontitis obturation
			assert.ok(
				protocol.includes("ПЕРИОДОНТИТ 2-Й ВИЗИТ") || protocol.includes("Хронический апикальный периодонтит"),
				"Must state periodontitis diagnosis in protocol",
			);
			assert.ok(
				protocol.includes("эпоксид") || protocol.includes("силер"),
				"Must specify epoxy sealer in protocol",
			);
			assert.ok(
				protocol.includes("обтурация корневых каналов") || protocol.includes("Обтурация"),
				"Must specify root canal obturation",
			);
		});

		it("generates Acute Pulpitis protocol correctly when diagnosis is pulpitis", () => {
			const protocol = generateSoapEndoProtocol({
				activeTooth: 16,
				toothAnatomicalName: "Верхний правый первый моляр",
				toothState: "Пульпит",
			});

			assert.ok(
				protocol.includes("ПУЛЬПИТ В 1 ВИЗИТ"),
				"Must specify acute pulpitis for pulpitis cases",
			);
			assert.ok(
				protocol.toLowerCase().includes("экстирпация пульпы"),
				"Must specify pulp extirpation for vital pulpitis cases",
			);
		});
	});
});
