/**
 * @file packages/shared/src/ai/clinicalKnowledge.test.ts
 * @description Comprehensive zero-mock unit test suite for clinical cognitive matrix,
 * chairside anesthesia engine, endodontic geometry, ICD-10 protocols, and emergency resuscitation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	// Anesthesia Engine
	calculateDeterministicAnesthesia,
	ANESTHESIA_FORMULATIONS,
	anesthesiaCalculationInputSchema,
	anesthesiaCalculationResultSchema,

	// Endodontic Geometry & Protocols
	calculateEndoGeometry,
	CLINICAL_PROTOCOLS,
	findProtocolsByIcd10,
	findProtocolsByNomenclatura,
	searchClinicalProtocols,
	dentalProtocolDefinitionSchema,

	// Vocabulary & Triage
	isDentalKeyword,
	hasDentalTerm,
	extractDentalKeywords,
	isNonClinicalWord,

	// Emergency Protocols
	EMERGENCY_PROTOCOLS,
	findEmergencyProtocolsByTrigger,
	formatEmergencyCheatSheet,
	emergencyProtocolDefinitionSchema,

	// Cognitive Core & Prompts
	MASTER_COGNITIVE_ARCHITECTURE_TEXT,
	buildClinicalSystemPrompt,
	buildDisputeRefereePrompt,
	buildVisionAnalysisPrompt,
	clinicalSparringResultSchema
} from "./index.js";

// ==============================================================================
// 1. DETERMINISTIC CHAIRSIDE ANESTHESIA SAFETY ENGINE
// ==============================================================================

describe("Deterministic Chairside Anesthesia Safety Engine", () => {
	it("calculates accurate dosages for healthy adult (70 kg) with Articaine 4% 1:200 000", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_200k",
			patient: {
				weightKg: 70,
				ageYears: 35
			}
		});

		assert.equal(res.isContraindicated, false);
		assert.equal(res.patientCategory, "adult");
		assert.equal(res.patientWeightKg, 70);
		assert.equal(res.mgPerKgNorm, 7.0);
		assert.equal(res.doseByWeightMg, 490.0);
		assert.equal(res.absoluteCeilingMg, 500.0);
		assert.equal(res.effectiveMaxDoseMg, 490.0);
		assert.equal(res.hitCeiling, false);
		assert.equal(res.mgPerCarpule, 68.0);
		assert.equal(res.safeCarpulesMax, 7); // floor(490 / 68) = 7
		assert.equal(res.maxSafeVolumeMl, 11.9); // 7 * 1.7 ml = 11.9 ml
		assert.equal(res.safetyWarningsRu.length, 0);

		// Schema validation
		const validated = anesthesiaCalculationResultSchema.safeParse(res);
		assert.equal(validated.success, true);
	});

	it("strictly caps dose at absolute adult ceiling (500 mg) for heavy adult (95 kg)", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_200k",
			patient: {
				weightKg: 95,
				ageYears: 42
			}
		});

		assert.equal(res.isContraindicated, false);
		assert.equal(res.doseByWeightMg, 665.0); // 95 * 7 = 665 mg
		assert.equal(res.absoluteCeilingMg, 500.0);
		assert.equal(res.effectiveMaxDoseMg, 500.0);
		assert.equal(res.hitCeiling, true);
		assert.equal(res.safeCarpulesMax, 7); // floor(500 / 68) = 7
	});

	it("triggers pediatric safeguard: blocks Articaine for child <15 kg (<4 years)", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_200k",
			patient: {
				weightKg: 13,
				ageYears: 3,
				isPediatric: true
			}
		});

		assert.equal(res.isContraindicated, true);
		assert.equal(res.safeCarpulesMax, 0);
		assert.ok(res.contraindicationReasonRu?.includes("Артикаин противопоказан детям"));
		assert.ok(res.safetyWarningsRu.some((w) => w.includes("КЛИНИЧЕСКОЕ ПРОТИВОПОКАЗАНИЕ")));
	});

	it("calculates safe pediatric dosage with downward rounding for child (25 kg, 7 years)", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_200k",
			patient: {
				weightKg: 25,
				ageYears: 7,
				isPediatric: true
			}
		});

		assert.equal(res.isContraindicated, false);
		assert.equal(res.patientCategory, "pediatric");
		assert.equal(res.mgPerKgNorm, 5.0); // Pediatric norm 5 mg/kg
		assert.equal(res.effectiveMaxDoseMg, 125.0); // 25 * 5 = 125 mg
		// Exact = 125 / 68 = 1.84 carpules. Safe MUST be floor -> 1 carpule
		assert.equal(res.safeCarpulesMax, 1);
		assert.equal(res.exactCarpules, 1.84);
	});

	it("restricts epinephrine to 0.04 mg ceiling in patients with cardiovascular risk", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_100k", // 0.01 mg epi / ml -> 0.017 mg per 1.7ml carpule
			patient: {
				weightKg: 70,
				somaticConditions: {
					hasHypertension: true
				}
			}
		});

		assert.equal(res.isContraindicated, false);
		// With 0.04 mg max epi and 0.017 mg/carpule: floor(0.04 / 0.017) = 2 carpules
		assert.equal(res.safeCarpulesMax, 2);
		assert.ok(res.safetyWarningsRu.some((w) => w.includes("КАРДИОВАСКУЛЯРНОЕ ОГРАНИЧЕНИЕ")));
	});

	it("blocks intervention upon malignant hypertensive crisis (systolic BP >= 180)", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_200k",
			patient: {
				weightKg: 75,
				somaticConditions: {
					bloodPressureSystolic: 185,
					bloodPressureDiastolic: 115
				}
			}
		});

		assert.equal(res.isContraindicated, true);
		assert.equal(res.safeCarpulesMax, 0);
		assert.ok(res.contraindicationReasonRu?.includes("Гипертонический криз"));
	});

	it("warns about sulfite risk when patient has bronchial asthma or sulfite allergy", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_200k",
			patient: {
				weightKg: 65,
				somaticConditions: {
					hasBronchialAsthma: true
				}
			}
		});

		assert.ok(res.safetyWarningsRu.some((w) => w.includes("СУЛЬФИТНЫЙ РИСК")));
	});

	it("warns about dangerous drug interaction with non-selective beta-blockers", () => {
		const res = calculateDeterministicAnesthesia({
			formulationKey: "articaine_4_epi_100k",
			patient: {
				weightKg: 70,
				somaticConditions: {
					takesBetaBlockers: true
				}
			}
		});

		assert.ok(res.safetyWarningsRu.some((w) => w.includes("ОПАСНОЕ ЛЕКАРСТВЕННОЕ ВЗАИМОДЕЙСТВИЕ")));
	});
});

// ==============================================================================
// 2. ENDODONTIC GEOMETRY & CANAL TAPER CALCULATOR
// ==============================================================================

describe("Endodontic Geometry & Danger Zone Calculator", () => {
	it("calculates ISO #25 .04 taper instrument diameters accurately", () => {
		const geom = calculateEndoGeometry(25, 0.04);

		assert.equal(geom.tipIso, 25);
		assert.equal(geom.taper, 0.04);
		assert.equal(geom.d0Mm, 0.25);
		assert.equal(geom.d3Mm, 0.37); // 0.25 + 0.04 * 3 = 0.37
		assert.equal(geom.d8Mm, 0.57); // 0.25 + 0.04 * 8 = 0.57
		assert.equal(geom.d16Mm, 0.89); // 0.25 + 0.04 * 16 = 0.89
		assert.equal(geom.dangerZoneWarning, undefined);
		assert.equal(geom.formulaText, "D_x = 0.25 + (0.04 × x)");
	});

	it("triggers Danger Zone warning for aggressive .06 taper in thin roots", () => {
		const geom = calculateEndoGeometry(25, 0.06);

		assert.equal(geom.d8Mm, 0.73); // 0.25 + 0.06 * 8 = 0.73
		assert.equal(geom.d16Mm, 1.21); // 0.25 + 0.06 * 16 = 1.21
		assert.ok(geom.dangerZoneWarning !== undefined);
		assert.ok(geom.dangerZoneWarning?.includes("Danger Zone"));
		assert.ok(geom.dangerZoneWarning?.includes("Strip perforation"));
	});

	it("handles integer taper percentage input format (.04 vs 4%)", () => {
		const geom = calculateEndoGeometry(30, 4);

		assert.equal(geom.taper, 0.04);
		assert.equal(geom.d0Mm, 0.30);
		assert.equal(geom.d3Mm, 0.42);
	});
});

// ==============================================================================
// 3. CLINICAL VOCABULARY & SEMANTIC TRIAGE
// ==============================================================================

describe("Clinical Vocabulary & Semantic Triage", () => {
	it("correctly identifies dental keywords across declensions and roots", () => {
		assert.equal(isDentalKeyword("пульпит"), true);
		assert.equal(isDentalKeyword("пульпита"), true);
		assert.equal(isDentalKeyword("коффердам"), true);
		assert.equal(isDentalKeyword("коффердамом"), true);
		assert.equal(isDentalKeyword("апекслокатор"), true);
		assert.equal(isDentalKeyword("гипохлорит"), true);
		assert.equal(isDentalKeyword("дебондинг"), true);
		assert.equal(isDentalKeyword("остеоинтеграция"), true);
		assert.equal(isDentalKeyword("гуттаперча"), true);
	});

	it("rejects non-clinical words disguised by similar prefixes", () => {
		assert.equal(isNonClinicalWord("преподаватель"), true);
		assert.equal(isDentalKeyword("преподаватель"), false);
		assert.equal(isDentalKeyword("преподносить"), false);
		assert.equal(isDentalKeyword("скандал"), false);
		assert.equal(isDentalKeyword("погода"), false);
	});

	it("detects clinical dental context in Russian prose sentences", () => {
		const clinicalText = "Пациент жалуется на острую ночную пульсирующую боль в зубе 36, положительная перкуссия.";
		assert.equal(hasDentalTerm(clinicalText), true);

		const generalText = "Завтра в полдень состоится совещание по вопросам административного регламента клиники.";
		assert.equal(hasDentalTerm(generalText), false);
	});

	it("extracts unique clinical keywords from doctor records", () => {
		const note = "Проведена ирригация корневых каналов гипохлоритом натрия 3% под коффердамом. Обтурация гуттаперчей и биокерамикой.";
		const terms = extractDentalKeywords(note);

		assert.ok(terms.length >= 3);
		assert.ok(terms.some((t) => t.startsWith("гипохлорит")));
		assert.ok(terms.some((t) => t.startsWith("коффердам")));
		assert.ok(terms.some((t) => t.startsWith("гуттаперч")));
	});
});

// ==============================================================================
// 4. DENTAL CLINICAL PROTOCOLS CATALOG (ORDER 804n & ICD-10)
// ==============================================================================

describe("Dental Clinical Protocols Catalog (Order 804n & ICD-10)", () => {
	it("contains at least 5 fully validated clinical protocols across disciplines", () => {
		assert.ok(CLINICAL_PROTOCOLS.length >= 5);

		for (const proto of CLINICAL_PROTOCOLS) {
			const validation = dentalProtocolDefinitionSchema.safeParse(proto);
			assert.equal(validation.success, true, `Validation failed for protocol ${proto.id}: ${validation.error?.message}`);
			assert.ok(proto.steps.length >= 3);
			assert.ok(proto.materialsAndMedications.length >= 3);
			assert.ok(proto.criticalSafetyRulesRu.length >= 1);
		}
	});

	it("finds therapy protocol by ICD-10 code K02.1 (Deep dentin caries / IDS)", () => {
		const found = findProtocolsByIcd10("K02.1");
		assert.ok(found.length >= 1);
		const idsProto = found[0]!;
		assert.equal(idsProto.specialty, "therapy");
		assert.ok(idsProto.titleRu.includes("IDS"));
	});

	it("finds endodontic instrumentation protocol by Russian Order 804n nomenclature", () => {
		const found = findProtocolsByNomenclatura("A16.07.030");
		assert.ok(found.length >= 1);
		const endoProto = found[0]!;
		assert.equal(endoProto.specialty, "endodontics");
		assert.ok(endoProto.materialsAndMedications.some((m) => m.includes("гипохлорит")));
	});

	it("searches protocols by natural Russian clinical keywords", () => {
		const veneerProtos = searchClinicalProtocols("винир");
		assert.ok(veneerProtos.length >= 1);
		assert.equal(veneerProtos[0]!.specialty, "orthopedics");

		const implantProtos = searchClinicalProtocols("имплантация");
		assert.ok(implantProtos.length >= 1);
		assert.equal(implantProtos[0]!.specialty, "surgery");
	});
});

// ==============================================================================
// 5. CHAIRSIDE EMERGENCY PROTOCOLS & QUICK-ACTION ALGORITHMS
// ==============================================================================

describe("Chairside Emergency Protocols & Quick-Action Algorithms", () => {
	it("contains 6 vital chairside resuscitation protocols", () => {
		const keys = Object.keys(EMERGENCY_PROTOCOLS);
		assert.ok(keys.length >= 6);

		for (const key of keys) {
			const proto = EMERGENCY_PROTOCOLS[key as keyof typeof EMERGENCY_PROTOCOLS];
			const validation = emergencyProtocolDefinitionSchema.safeParse(proto);
			assert.equal(validation.success, true, `Emergency protocol validation failed for ${key}: ${validation.error?.message}`);
			assert.ok(proto.immediateActionsFirstMinuteRu.length >= 3);
			assert.ok(proto.actionSteps.length >= 2);
			assert.ok(proto.chairsideMedicationsKit.length >= 2);
		}
	});

	it("finds anaphylaxis protocol by trigger symptoms", () => {
		const found = findEmergencyProtocolsByTrigger("ларингоспазм");
		assert.ok(found.length >= 1);
		assert.equal(found[0]!.id, "emergency_anaphylaxis");
		assert.equal(found[0]!.severityLevel, "critical_fatal_risk");
		assert.ok(found[0]!.actionSteps.some((s) => s.exactMedicationDoseRu?.includes("Эпинефрин")));
	});

	it("finds sodium hypochlorite accident protocol by trigger", () => {
		const found = findEmergencyProtocolsByTrigger("гипохлорит");
		assert.ok(found.length >= 1);
		assert.equal(found[0]!.id, "emergency_hypochlorite_accident");
		assert.ok(found[0]!.immediateActionsFirstMinuteRu.some((a) => a.includes("физиологическим") || a.includes("физраствор")));
	});

	it("finds LAST systemic toxicity protocol and references lipid rescue", () => {
		const found = findEmergencyProtocolsByTrigger("липидн");
		assert.ok(found.length >= 1);
		assert.equal(found[0]!.id, "emergency_last_toxicity");
		assert.ok(found[0]!.actionSteps.some((s) => s.exactMedicationDoseRu?.includes("20% эмульсия")));
	});

	it("formats complete chairside emergency cheat-sheet with immediate actions", () => {
		const cheatSheet = formatEmergencyCheatSheet("emergency_hypochlorite_accident");

		assert.ok(cheatSheet.includes("НЕОТЛОЖНЫЙ ПРОТОКОЛ"));
		assert.ok(cheatSheet.includes("ДЕЙСТВИЯ ПЕРВОЙ МИНУТЫ"));
		assert.ok(cheatSheet.includes("ПОШАГОВЫЙ АЛГОРИТМ"));
		assert.ok(cheatSheet.includes("Состав укладки"));
		assert.ok(cheatSheet.includes("Тактика после купирования"));
	});
});

// ==============================================================================
// 6. MASTER COGNITIVE MATRIX & PROMPT BUILDERS
// ==============================================================================

describe("Master Cognitive Matrix & Prompt Builders", () => {
	it("master cognitive architecture text includes all 15 meta-cognitive laws", () => {
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("1. АУДИТ СКРЫТЫХ ПРЕДПОСЫЛОК"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("2. МЫШЛЕНИЕ ОТ ПЕРВОПРИНЦИПОВ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("3. ЭПИСТЕМИЧЕСКАЯ ЧЕСТНОСТЬ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("4. РАДАР СЛЕПЫХ ЗОН"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("5. ПОСЛЕДСТВИЯ ВТОРОГО И ТРЕТЬЕГО ПОРЯДКА"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("6. КОРНЕВАЯ ПРИЧИНА"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("7. ИММУНИТЕТ К НАВОДЯЩИМ ВОПРОСАМ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("8. ПРОТОКОЛ ИНФОРМАЦИОННОЙ НЕОПРЕДЕЛЕННОСТИ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("9. ШОКОВАЯ РАЦИОНАЛИЗАЦИЯ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("10. СКВОЗНОЙ РЕТРОСПЕКТИВНЫЙ АУДИТ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("11. ПРОАКТИВНАЯ РЕКАЛИБРОВКА"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("12. ПРОТОКОЛ ЭВРИСТИЧЕСКОЙ ОППОЗИЦИИ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("13. РАЗРЕШЕНИЕ КЛИНИЧЕСКОЙ ДВУСМЫСЛЕННОСТИ"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("14. БЕСКОМПРОМИССНОЕ АНТИ-СИКОФАНТСТВО"));
		assert.ok(MASTER_COGNITIVE_ARCHITECTURE_TEXT.includes("15. ДИНАМИЧЕСКОЕ МАСШТАБИРОВАНИЕ"));
	});

	it("builds custom chairside clinical system prompt with options", () => {
		const prompt = buildClinicalSystemPrompt({
			chairsideMode: true,
			includeDisputeReferee: true,
			includeVisionCore: true
		});

		assert.ok(prompt.includes("КЛИНИЧЕСКИЙ РЕЖИМ У КРЕСЛА"));
		assert.ok(prompt.includes("ПРОТОКОЛ АРБИТРАЖА СПОРА"));
		assert.ok(prompt.includes("РАДАР СЛЕПЫХ ЗОН И ПРЕЗУМПЦИЯ АРТЕФАКТА"));
	});

	it("builds dispute referee prompt with opposing topics", () => {
		const prompt = buildDisputeRefereePrompt("Стекловолоконный штифт", "Литая культевая вкладка");
		assert.ok(prompt.includes("Стекловолоконный штифт"));
		assert.ok(prompt.includes("Литая культевая вкладка"));
		assert.ok(prompt.includes("Decision Boundary"));
	});

	it("builds multimodal vision analysis prompt for CBCT", () => {
		const prompt = buildVisionAnalysisPrompt("cbct");
		assert.ok(prompt.includes("Конусно-лучевая компьютерная томография"));
		assert.ok(prompt.includes("правилу 3 шагов"));
	});

	it("validates clinical sparring result schema cleanly", () => {
		const mockSparringResult = {
			paradigmAudit: {
				originalPremiseValid: false,
				premiseCritique: "Попытка сохранить девитальный зуб с феррулом 0.5 мм штифтовой конструкцией нерациональна.",
				rootCause: "Отсутствие феррул-эффекта ведет к катастрофическому клиновидному перелому корня.",
				secondOrderRisks: ["Продольный перелом корня через 6-12 месяцев", "Потеря костной ткани альвеолы"]
			},
			firstPrinciplesBasis: "Биомеханика рычага: при окклюзионной нагрузке модуль упругости штифта концентрирует сдвиговые напряжения в апикальной трети корня.",
			evidenceLevel: "level_1_rct_meta_analysis" as const,
			definitiveConclusion: "Показано удаление с немедленной либо отсроченной дентальной имплантацией."
		};

		const parsed = clinicalSparringResultSchema.safeParse(mockSparringResult);
		assert.equal(parsed.success, true);
	});

	it("re-exports all clinical AI engines through packages/shared root index.ts", async () => {
		const shared = await import("../index.js");
		assert.equal(typeof shared.calculateDeterministicAnesthesia, "function");
		assert.equal(typeof shared.calculateEndoGeometry, "function");
		assert.ok(Array.isArray(shared.DENTAL_PROTOCOLS));
		assert.ok(typeof shared.EMERGENCY_PROTOCOLS === "object");
		assert.ok(shared.MASTER_COGNITIVE_ARCHITECTURE_TEXT.length > 500);
	});
});
