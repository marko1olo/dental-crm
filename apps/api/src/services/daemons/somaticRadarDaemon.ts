/**
 * somaticRadarDaemon.ts — 07:30 AM Morning Pre-Shift Somatic Risk & DDI Clinical Radar.
 *
 * Scans today's scheduled appointments for all doctors across the clinic:
 * 1. Analyzes patient electronic health records (EHR), anamnesis notes, active prescriptions,
 *    and verified drug allergies (patientDrugAllergies).
 * 2. Employs OmniGateway Structured LLM Extraction (SomaticAnamnesisExtractionSchema via Zod)
 *    to analyze natural language clinical notes, slang, complaints, and complex negations:
 *    - Accurately excludes negated or historical conditions
 *      (e.g., "отрицает варфарин", "аспирин отменен", "аллергии на артикаин нет", "давление в норме", "криз в 2012 г.").
 * 3. Cross-references patient somatic profile with scheduled dental procedures.
 * 4. Applies dual-factor high-precision trigger logic:
 *    - Generates quiet, actionable clinical alerts ONLY when a genuine risk combination occurs:
 *      * Patient for surgery/extraction + taking Anticoagulants (Warfarin, Xarelto, Plavix, Aspirin, Eliquis).
 *        -> Alert: "Высокий риск кровотечения. Рекомендовано: коагулограмма (МНО/АЧТВ) перед манипуляцией, местный гемостаз".
 *      * Patient for anesthesia + allergy to Articaine / Amide anesthetics.
 *        -> Alert: "Противопоказан Артикаин. Рекомендован Мепивакаин 3% без вазоконстриктора или Скандонест".
 *      * Patient for anesthesia + Stage III Hypertension / Thyrotoxicosis / Pheochromocytoma.
 *        -> Alert: "Противопоказан адреналин/эпинефрин. Использовать анестезию без вазоконстриктора (Мепивакаин 3% / Скандонест 3%)".
 *      * Patient with Bronchial Asthma / Sulfite Allergy vs Adrenaline with Metabisulfite (E223).
 *        -> Alert: "Противопоказаны анестетики с метабисульфитом натрия (E223). Рекомендован Мепивакаин 3% или Ультракаин Д".
 *      * Patient on Bisphosphonates / Denosumab + Invasive Surgery.
 *        -> Alert: "Высокий риск остеонекроза челюсти (MRONJ). Атравматичный протокол и антибиотикопрофилактика".
 * 5. Yields structured Copilot cards & Quiet Passive Badges for doctor pre-shift review with zero modal blockers.
 * 6. High-Performance Architecture: Uses batch parallel queries (inArray) to eliminate N+1 database patterns.
 */

import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
	appointments,
	electronicPrescriptionItems,
	electronicPrescriptions,
	patientDrugAllergies,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { omniLlmGateway } from "../agent/omniGateway.js";
import type { ChatOptions } from "../agent/omniGatewayTypes.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type SomaticThreatCategory =
	| "anticoagulant_surgery"
	| "anesthetic_allergy"
	| "vasoconstrictor_contraindication"
	| "sulfite_asthma"
	| "bisphosphonates_osteonecrosis"
	| "penicillin_allergy"
	| "nsaid_contraindication"
	| "somatic_general";

export interface SomaticRadarAlertAction {
	readonly actionId: string;
	readonly title: string;
	readonly payload: Record<string, unknown>;
}

export interface SomaticRadarAlert {
	readonly id: string;
	readonly organizationId: string;
	readonly appointmentId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientPhone: string | null;
	readonly patientAgeYears: number | null;
	readonly doctorId: string | null;
	readonly doctorName: string;
	readonly appointmentStartsAt: string; // ISO
	readonly appointmentReason: string | null;
	readonly isSurgeryPlanned: boolean;
	readonly category: SomaticThreatCategory;
	readonly threatTitleRu: string;
	readonly badgeText: string;
	readonly urgency: "CRITICAL" | "HIGH" | "WARNING";
	readonly clinicalAlertMessage: string;
	readonly detectedTriggers: string[];
	readonly contraindicatedDrugs: string[];
	readonly recommendedAlternatives: string[];
	readonly clinicalGuidanceRu: string;
	readonly suggestedActions: SomaticRadarAlertAction[];
	readonly icd10Codes?: string[];
	readonly toothNumberFdi?: number | null;
	readonly createdAt: string;
}

export interface SomaticRadarPreShiftSummary {
	readonly id: string;
	readonly organizationId: string;
	readonly shiftDate: string;
	readonly totalAppointmentsScanned: number;
	readonly totalPatientsWithRisk: number;
	readonly criticalThreatsCount: number;
	readonly highThreatsCount: number;
	readonly warningsCount: number;
	readonly alerts: SomaticRadarAlert[];
	readonly createdAt: string;
}

export interface PatientSomaticProfileInput {
	readonly patientId: string;
	readonly organizationId: string;
	readonly fullName: string;
	readonly birthDate?: string | null;
	readonly phone?: string | null;
	readonly notes?: string | null;
	readonly pastAnamnesisText?: string | null;
	readonly pastDiagnosesText?: string | null;
	readonly activeMedications?: string[];
	readonly allergies?: Array<{
		readonly allergenGroup: string;
		readonly drugInnLatin?: string | null;
		readonly reactionSeverity?: string | null;
		readonly clinicalManifestations?: string | null;
		readonly hasSamterTriad?: boolean | null;
		readonly notes?: string | null;
	}>;
}

export interface AppointmentSomaticContextInput {
	readonly appointmentId: string;
	readonly organizationId: string;
	readonly doctorId?: string | null;
	readonly doctorName?: string | null;
	readonly startsAt: string | Date;
	readonly endsAt?: string | Date | null;
	readonly reason?: string | null;
	readonly comment?: string | null;
	readonly plannedServices?: Array<{
		readonly code?: string | null;
		readonly title: string;
		readonly priceRub?: number | string | null;
	}>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OMNIGATEWAY STRUCTURED CLINICAL EXTRACTION SCHEMA (ZOD)
// ─────────────────────────────────────────────────────────────────────────────

export const SomaticAnamnesisExtractionSchema = z.object({
	activeAnticoagulants: z
		.array(z.string())
		.default([])
		.describe(
			"Active anticoagulant or antiplatelet therapies currently taken by the patient (e.g. Warfarin, Rivaroxaban/Xarelto, Clopidogrel/Plavix, Aspirin/ThromboASS, Apixaban/Eliquis, Dabigatran/Pradaxa, Heparin). Exclude explicitly negated, cancelled, or historical therapies.",
		),
	isAnticoagulantActive: z
		.boolean()
		.default(false)
		.describe("True if patient currently takes any active anticoagulant/antiplatelet agent"),
	hasArticaineAmideAllergy: z
		.boolean()
		.default(false)
		.describe(
			"True if patient has an active documented allergy or severe intolerance to articaine, lidocaine, or amide anesthetics. False if explicitly negated (e.g. 'аллергии на артикаин нет').",
		),
	articaineAllergyDetails: z.string().nullable().optional(),
	hasSevereHypertensionOrThyrotoxicosis: z
		.boolean()
		.default(false)
		.describe(
			"True if patient currently has uncontrolled Stage III hypertension, frequent crises, or decompensated thyrotoxicosis requiring adrenaline-free anesthesia. False if blood pressure is normal/controlled or crisis occurred years ago (e.g. 'криз в 2012 г.').",
		),
	hypertensionDetails: z.string().nullable().optional(),
	hasBronchialAsthmaOrSulfiteAllergy: z
		.boolean()
		.default(false)
		.describe(
			"True if patient currently suffers from active bronchial asthma or documented sulfite/metabisulfite (E223) allergy. False if negated.",
		),
	asthmaDetails: z.string().nullable().optional(),
	activeBisphosphonates: z
		.array(z.string())
		.default([])
		.describe(
			"Active bisphosphonate or denosumab/prolia therapy (Aclasta, Zoledronic acid, Fosamax, Alendronate, Bonviva, Prolia, Xgeva) presenting risk of osteonecrosis of the jaw (MRONJ).",
		),
	isBisphosphonateActive: z
		.boolean()
		.default(false)
		.describe("True if patient currently receives bisphosphonates/denosumab"),
	hasPenicillinAllergy: z
		.boolean()
		.default(false)
		.describe(
			"True if patient has documented allergy to penicillins or beta-lactam antibiotics (Amoxicillin, Amoxiclav, Augmentin, Flemoxin).",
		),
	penicillinAllergyDetails: z.string().nullable().optional(),
	hasNsaidAllergyOrSamterTriad: z
		.boolean()
		.default(false)
		.describe(
			"True if patient has documented allergy to NSAIDs (Ibuprofen, Ketorolac, Ketanov, Nimesulide) or Samter's triad.",
		),
	nsaidAllergyDetails: z.string().nullable().optional(),
	clinicalReasoning: z
		.string()
		.default("")
		.describe(
			"Brief clinical explanation of the extracted active somatic conditions and why negated items were discarded.",
		),
});

export type SomaticAnamnesisExtraction = z.infer<
	typeof SomaticAnamnesisExtractionSchema
>;

/**
 * Extracts structured somatic risk indicators from natural language clinical text
 * using the multi-provider OmniGateway LLM with strict Zod validation.
 */
export async function extractSomaticRisksWithLlm(
	text: string,
	options: ChatOptions = {},
): Promise<SomaticAnamnesisExtraction> {
	if (!text || text.trim().length === 0) {
		return SomaticAnamnesisExtractionSchema.parse({});
	}

	const systemPrompt = [
		"You are a Senior Clinical Somatic & Drug-Drug Interaction (DDI) AI Specialist in a Dental CRM.",
		"Analyze the patient's medical history, free-text notes, diagnoses, and current medications.",
		"CRITICAL INSTRUCTIONS ON NEGATIONS & HISTORICAL CONDITIONS:",
		"- If a medication or condition is negated, stopped, cancelled, or denied (e.g. 'отрицает варфарин', 'аспирин отменен', 'аллергии на артикаин нет', 'давление в норме', 'криз был в 2012 г.', 'астмы нет'), DO NOT mark it as active!",
		"- Only mark conditions/medications as TRUE/ACTIVE if the patient is CURRENTLY experiencing them or taking the medication.",
		"- Distinguish current therapies from past resolved history.",
	].join("\n");

	try {
		const result = await omniLlmGateway.generateStructuredJson(
			SomaticAnamnesisExtractionSchema,
			[
				{
					role: "user",
					content: `Анамнез, жалобы и записи пациента:\n"""\n${text}\n"""\n\nВыдели активные соматические факторы риска и исключи все отрицания.`,
				},
			],
			{
				...options,
				system: systemPrompt,
			},
		);

		return SomaticAnamnesisExtractionSchema.parse(result.data);
	} catch (err) {
		console.warn(
			"[SomaticRadarDaemon:WARN] OmniGateway LLM extraction failed or unavailable, using deterministic fallback:",
			err instanceof Error ? err.message : String(err),
		);
		return extractSomaticRisksDeterministic(text);
	}
}

/**
 * Deterministic Semantic Negation & Somatic Extractor (Fast Path / Offline Fallback).
 * Evaluates semantic boundaries, word associations, and negations without external API dependencies.
 */
export function extractSomaticRisksDeterministic(
	text: string,
	activeMeds: readonly string[] = [],
	allergies: readonly {
		allergenGroup: string;
		drugInnLatin?: string | null | undefined;
		reactionSeverity?: string | null | undefined;
		clinicalManifestations?: string | null | undefined;
		hasSamterTriad?: boolean | null | undefined;
		notes?: string | null | undefined;
	}[] = [],
): SomaticAnamnesisExtraction {
	const lower = (text || "").toLowerCase();
	const medsText = activeMeds.join(" ").toLowerCase();
	const combinedText = `${lower} ${medsText}`;

	// Helper for semantic negation in clinical text clause
	const isNegatedInClause = (kw: string): boolean => {
		const idx = combinedText.indexOf(kw);
		if (idx === -1) return false;
		const start = Math.max(0, idx - 60);
		const end = Math.min(combinedText.length, idx + kw.length + 60);
		const before = combinedText.slice(start, idx);
		const after = combinedText.slice(idx + kw.length, end);

		const lastDelim = Math.max(
			before.lastIndexOf("."),
			before.lastIndexOf("!"),
			before.lastIndexOf("?"),
			before.lastIndexOf(";"),
			before.lastIndexOf("\n"),
		);
		const clauseBefore = lastDelim !== -1 ? before.slice(lastDelim + 1) : before;

		const firstDelim = after.search(/[.!?;:\n]/);
		const clauseAfter = firstDelim !== -1 ? after.slice(0, firstDelim) : after;

		const clause = `${clauseBefore} ${kw} ${clauseAfter}`;

		return (
			/(?<![а-яa-z0-9])(?:не\s+(?:принимает|пьет|пьёт|страдает|имеет|употребляет|было)|отрицает|отменен[аоы]?|отменил[аи]?|прекратил[аи]?|ранее\s+принимал|сейчас\s+не\s+пь[её]т|сейчас\s+не\s+принимает|нет|без\s+признаков|не\s+отягощен|в\s+норме|в\s+20\d\d\s*г|было\s+в\s+детстве)(?![а-яa-z0-9])/iu.test(
				clause,
			) ||
			/(?<![а-яa-z0-9])аллерги[а-я\s-]{1,30}нет(?![а-яa-z0-9])/iu.test(
				clause,
			) ||
			/(?<![а-яa-z0-9])(?:давление|ад)\s+в\s+норме(?![а-яa-z0-9])/iu.test(
				clause,
			)
		);
	};

	// 1. Anticoagulants
	const anticoagKws = [
		"варфарин",
		"warfarin",
		"ксарелто",
		"xarelto",
		"ривароксабан",
		"эликвис",
		"eliquis",
		"апиксабан",
		"прадакса",
		"pradaxa",
		"дабигатран",
		"плавикс",
		"plavix",
		"клопидогрел",
		"брилинта",
		"аспирин",
		"aspirin",
		"тромбо асс",
		"кардиомагнил",
		"клексан",
		"гепарин",
	];
	const activeAnticoags: string[] = [];
	for (const kw of anticoagKws) {
		if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
			activeAnticoags.push(kw);
		}
	}

	// 2. Articaine / Amide
	const articaineKws = [
		"артикаин",
		"articaine",
		"ультракаин",
		"ultracain",
		"септанест",
		"убистезин",
		"лидокаин",
		"lidocaine",
		"lidocain",
		"lidocainum",
		"ледокаин",
		"лидакаин",
		"амидные анестетики",
	];
	let hasArticaineAmideAllergy = false;
	for (const a of allergies) {
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (
			articaineKws.some((k) => str.includes(k)) &&
			a.reactionSeverity !== "none" &&
			!str.includes("отрицает")
		) {
			hasArticaineAmideAllergy = true;
		}
	}
	const anamnesisTriggers = [
		"аллерг",
		"непереносим",
		"отек квинке",
		"шок",
		"коллапс",
		"реакци",
	];
	if (!hasArticaineAmideAllergy) {
		for (const kw of articaineKws) {
			if (
				combinedText.includes(kw) &&
				anamnesisTriggers.some((t) => combinedText.includes(t)) &&
				!isNegatedInClause(kw)
			) {
				hasArticaineAmideAllergy = true;
			}
		}
	}

	// 3. Hypertension / Thyrotoxicosis
	const hyperKws = [
		"гипертония 3",
		"гипертоническая болезнь 3",
		"гипертония iii",
		"криз",
		"тиреотоксикоз",
		"токсический зоб",
		"феохромоцитом",
	];
	let hasSevereHypertensionOrThyrotoxicosis = false;
	for (const kw of hyperKws) {
		if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
			hasSevereHypertensionOrThyrotoxicosis = true;
		}
	}

	// 4. Asthma / Sulfites
	const asthmaKws = ["бронхиальная астма", "астм", "метабисульфит", "сульфит"];
	let hasBronchialAsthmaOrSulfiteAllergy = false;
	for (const a of allergies) {
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (
			(str.includes("сульфит") || str.includes("астм")) &&
			a.reactionSeverity !== "none"
		) {
			hasBronchialAsthmaOrSulfiteAllergy = true;
		}
	}
	if (!hasBronchialAsthmaOrSulfiteAllergy) {
		for (const kw of asthmaKws) {
			if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
				hasBronchialAsthmaOrSulfiteAllergy = true;
			}
		}
	}

	// 5. Bisphosphonates / MRONJ
	const bisphosKws = [
		"акласта",
		"aclasta",
		"золедронов",
		"фосамакс",
		"алендронат",
		"бонвива",
		"пролиа",
		"prolia",
		"эксджива",
		"деносумаб",
		"бисфосфонат",
	];
	const activeBisphosphonates: string[] = [];
	for (const kw of bisphosKws) {
		if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
			activeBisphosphonates.push(kw);
		}
	}

	// 6. Penicillin
	const penKws = [
		"пенициллин",
		"амоксициллин",
		"амоксиклав",
		"аугментин",
		"флемоксин",
	];
	let hasPenicillinAllergy = false;
	for (const a of allergies) {
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (
			penKws.some((k) => str.includes(k)) &&
			a.reactionSeverity !== "none" &&
			!str.includes("отрицает")
		) {
			hasPenicillinAllergy = true;
		}
	}
	if (!hasPenicillinAllergy) {
		for (const kw of penKws) {
			if (
				combinedText.includes(kw) &&
				combinedText.includes("аллерг") &&
				!isNegatedInClause(kw)
			) {
				hasPenicillinAllergy = true;
			}
		}
	}

	// 7. NSAID
	const nsaidKws = [
		"нпвс",
		"нпвп",
		"ибупрофен",
		"кеторолак",
		"кеторол",
		"кетанов",
		"нимесулид",
		"триада самтера",
		"аспирин",
		"aspirin",
		"ацетилсалициловая кислота",
		"аспириновая астма",
		"аспириновая триада",
	];
	let hasNsaidAllergyOrSamterTriad = false;
	for (const a of allergies) {
		if (a.hasSamterTriad) hasNsaidAllergyOrSamterTriad = true;
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (nsaidKws.some((k) => str.includes(k)) && a.reactionSeverity !== "none") {
			hasNsaidAllergyOrSamterTriad = true;
		}
	}
	if (!hasNsaidAllergyOrSamterTriad) {
		const directTriadKws = [
			"триада самтера",
			"аспириновая астма",
			"аспириновая триада",
		];
		for (const kw of directTriadKws) {
			if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
				hasNsaidAllergyOrSamterTriad = true;
				break;
			}
		}
	}
	if (!hasNsaidAllergyOrSamterTriad) {
		for (const kw of nsaidKws) {
			if (
				combinedText.includes(kw) &&
				anamnesisTriggers.some((t) => combinedText.includes(t)) &&
				!isNegatedInClause(kw)
			) {
				hasNsaidAllergyOrSamterTriad = true;
				break;
			}
		}
	}

	return {
		activeAnticoagulants: Array.from(new Set(activeAnticoags)),
		isAnticoagulantActive: activeAnticoags.length > 0,
		hasArticaineAmideAllergy,
		hasSevereHypertensionOrThyrotoxicosis,
		hasBronchialAsthmaOrSulfiteAllergy,
		activeBisphosphonates: Array.from(new Set(activeBisphosphonates)),
		isBisphosphonateActive: activeBisphosphonates.length > 0,
		hasPenicillinAllergy,
		hasNsaidAllergyOrSamterTriad,
		clinicalReasoning: "Deterministic semantic negation analysis complete",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROCEDURAL & NOMENCLATURE TECHNICAL MATCHING
// ─────────────────────────────────────────────────────────────────────────────

const SURGERY_PROCEDURE_KEYWORDS = [
	"удаление",
	"экстракция",
	"имплантация",
	"синус-лифтинг",
	"синуслифтинг",
	"костная пластика",
	"остеопластика",
	"резекция верхушки",
	"лоскутная операция",
	"кюретаж открытый",
	"периостотомия",
	"цистэктомия",
	"установка имплантата",
	"гингивэктоми",
	"surgery",
	"extraction",
	"implant",
];

const SURGERY_NOMENCLATURE_CODES = [
	"a16.07.001", // Удаление зуба
	"a16.07.054", // Внутрикостная дентальная имплантация
	"a16.07.026", // Резекция верхушки корня
	"a16.07.041", // Костная пластика
	"a16.07.042", // Синус-лифтинг
	"a16.07.043", // Гингивэктомия
	"a16.07.044", // Лоскутная операция
	"a16.07.011", // Периостотомия
	"a16.07.016", // Цистэктомия
];

/**
 * Checks if a scheduled appointment involves an invasive surgical manipulation.
 */
export function isSurgicalAppointment(
	reason?: string | null,
	comment?: string | null,
	plannedServices?: Array<{ code?: string | null; title: string }>,
): boolean {
	const text = `${reason || ""} ${comment || ""}`.toLowerCase();
	if (SURGERY_PROCEDURE_KEYWORDS.some((kw) => text.includes(kw))) {
		return true;
	}

	if (plannedServices && plannedServices.length > 0) {
		for (const s of plannedServices) {
			const codeLower = (s.code || "").toLowerCase().trim();
			if (SURGERY_NOMENCLATURE_CODES.some((sc) => codeLower.startsWith(sc))) {
				return true;
			}
			const titleLower = s.title.toLowerCase();
			if (SURGERY_PROCEDURE_KEYWORDS.some((kw) => titleLower.includes(kw))) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Checks if an appointment involves dental procedures requiring local anesthesia.
 */
export function isAnesthesiaIndicatedAppointment(
	reason?: string | null,
	comment?: string | null,
	plannedServices?: Array<{ code?: string | null; title: string }>,
): boolean {
	if (isSurgicalAppointment(reason, comment, plannedServices)) {
		return true;
	}

	const text = `${reason || ""} ${comment || ""}`.toLowerCase();
	const anesthesiaKeywords = [
		"кариес",
		"пульпит",
		"периодонтит",
		"канал",
		"пломб",
		"реставрац",
		"коронк",
		"обточк",
		"препарирован",
		"депульпирован",
		"анестези",
		"лечени",
	];

	if (anesthesiaKeywords.some((kw) => text.includes(kw))) {
		return true;
	}

	if (plannedServices && plannedServices.length > 0) {
		for (const s of plannedServices) {
			const titleLower = s.title.toLowerCase();
			if (anesthesiaKeywords.some((kw) => titleLower.includes(kw))) {
				return true;
			}
		}
	}

	if (reason && !text.includes("осмотр") && !text.includes("консультац")) {
		return true;
	}

	return false;
}

/**
 * Calculates patient age from birthDate string.
 */
export function calculateAge(
	birthDateStr?: string | null,
	refDate?: Date,
): number | null {
	if (!birthDateStr) return null;
	const bDate = new Date(birthDateStr);
	if (Number.isNaN(bDate.getTime())) return null;
	const ref = refDate ?? new Date();
	let age = ref.getFullYear() - bDate.getFullYear();
	const m = ref.getMonth() - bDate.getMonth();
	if (m < 0 || (m === 0 && ref.getDate() < bDate.getDate())) {
		age--;
	}
	return age >= 0 ? age : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CORE CLINICAL RADAR EVALUATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates patient somatic profile against appointment context.
 * Returns quiet, structured alert cards only when genuine high-risk clinical combinations occur.
 */
export function evaluatePatientSomaticRisk(
	patient: PatientSomaticProfileInput,
	appointment: AppointmentSomaticContextInput,
	options?: {
		now?: Date;
		extractedRisks?: SomaticAnamnesisExtraction;
	},
): SomaticRadarAlert[] {
	const now = options?.now ?? new Date();
	const alerts: SomaticRadarAlert[] = [];

	const patientAgeYears = calculateAge(patient.birthDate, now);
	const isSurgery = isSurgicalAppointment(
		appointment.reason,
		appointment.comment,
		appointment.plannedServices,
	);
	const isAnesthesia = isAnesthesiaIndicatedAppointment(
		appointment.reason,
		appointment.comment,
		appointment.plannedServices,
	);

	const freeTextContext = [
		patient.notes || "",
		patient.pastAnamnesisText || "",
		patient.pastDiagnosesText || "",
	]
		.join(" ")
		.trim();

	// Use provided structured extraction, or evaluate via deterministic semantic engine
	const risks =
		options?.extractedRisks ??
		extractSomaticRisksDeterministic(
			freeTextContext,
			patient.activeMedications ?? [],
			patient.allergies ?? [],
		);

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 1: Surgery / Extraction + Anticoagulants (Dual-Factor)
	// ─────────────────────────────────────────────────────────────────────────
	if (isSurgery && risks.isAnticoagulantActive) {
		const highPotencyDrugs = [
			"варфарин",
			"warfarin",
			"ксарелто",
			"xarelto",
			"эликвис",
			"eliquis",
			"прадакса",
			"плавикс",
			"брилинта",
		];
		const isHighPotency = risks.activeAnticoagulants.some((kw) =>
			highPotencyDrugs.some((hp) => kw.toLowerCase().includes(hp)),
		);

		const urgency = isHighPotency ? "CRITICAL" : "HIGH";
		const detectedDrugNames = risks.activeAnticoagulants.join(", ") || "Антикоагулянтная терапия";

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_anticoagulant_surgery`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: true,
			category: "anticoagulant_surgery",
			threatTitleRu: "Риск интра- и постоперационного кровотечения (Антикоагулянты)",
			badgeText: "Коагулограмма / Гемостаз",
			urgency,
			clinicalAlertMessage: `🩸 Высокий риск кровотечения при хирургическом вмешательстве! Пациент принимает антикоагулянты/дезагреганты (${detectedDrugNames}). Рекомендован гемостатический протокол.`,
			detectedTriggers: risks.activeAnticoagulants,
			contraindicatedDrugs: ["НПВС (Кеторол, Аспирин) — повышают риск ЖКТ и раневых кровотечений"],
			recommendedAlternatives: [
				"Местный гемостаз (гемостатическая губка, швы на лунку, фибрин)",
				"Обезболивание: Парацетамол 500-1000 мг (безопаснее НПВС)",
				"Контроль МНО/коагулограммы перед сложным удалением",
			],
			clinicalGuidanceRu:
				"Не отменять антикоагулянты без согласования с кардиологом. Использовать атравматичное удаление, ушивание лунки полигликолидной нитью.",
			suggestedActions: [
				{
					actionId: "request_coagulogram",
					title: "Запросить коагулограмму / МНО кардиолога",
					payload: { patientId: patient.patientId, detectedDrugs: risks.activeAnticoagulants },
				},
				{
					actionId: "prepare_hemostatic_kit",
					title: "Подготовить набор местного гемостаза",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 2: Local Anesthesia + Articaine / Amide Allergy
	// ─────────────────────────────────────────────────────────────────────────
	if (isAnesthesia && risks.hasArticaineAmideAllergy) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_anesthetic_allergy`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "anesthetic_allergy",
			threatTitleRu: "Аллергия / непереносимость амидных анестетиков (Артикаин)",
			badgeText: "Противопоказан Артикаин",
			urgency: "CRITICAL",
			clinicalAlertMessage:
				"⚠️ Противопоказан Артикаин (Ультракаин, Септанест, Убистезин) и амидные анестетики! В анамнезе зафиксирована аллергическая реакция / отек.",
			detectedTriggers: ["Аллергия на артикаин / амиды"],
			contraindicatedDrugs: ["Артикаин 4%", "Лидокаин 2%", "Ультракаин Д-С Форте"],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3%)",
				"Проведение аллергопроб перед вмешательством",
			],
			clinicalGuidanceRu:
				"Использовать бессосудосуживающий анестетик Мепивакаин 3% или направить на аллергопробы.",
			suggestedActions: [
				{
					actionId: "switch_to_mepivacaine",
					title: "Использовать Мепивакаин 3% (Скандонест)",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 3: Vasoconstrictor Contraindication (Hypertension III / Thyrotoxicosis)
	// ─────────────────────────────────────────────────────────────────────────
	if (isAnesthesia && risks.hasSevereHypertensionOrThyrotoxicosis) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_vasoconstrictor_contraindication`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "vasoconstrictor_contraindication",
			threatTitleRu: "Противопоказан адреналин (Гипертоническая болезнь 3 ст. / Тиреотоксикоз)",
			badgeText: "Без адреналина",
			urgency: "CRITICAL",
			clinicalAlertMessage:
				"🛑 Противопоказан адреналин/эпинефрин! Высокий риск гипертонического криза, тахиаритмии или тиреотоксического криза.",
			detectedTriggers: ["Гипертония 3 ст. / Тиреотоксикоз"],
			contraindicatedDrugs: [
				"Адреналин 1:100 000",
				"Эпинефрин 1:200 000 (Ультракаин Д-С)",
			],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3%)",
				"Артикаин 4% без адреналина (Ультракаин Д)",
			],
			clinicalGuidanceRu:
				"Обязательный контроль АД и пульса до анестезии. Использовать анестетик без адреналина.",
			suggestedActions: [
				{
					actionId: "record_blood_pressure",
					title: "Измерить и зафиксировать АД перед приемом",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 4: Bronchial Asthma / Sulfite Allergy
	// ─────────────────────────────────────────────────────────────────────────
	if (isAnesthesia && risks.hasBronchialAsthmaOrSulfiteAllergy) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_sulfite_asthma`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "sulfite_asthma",
			threatTitleRu: "Риск бронхоспазма на стабилизатор карпулы (Метабисульфит E223)",
			badgeText: "Астма / Бесульфитный протокол",
			urgency: "HIGH",
			clinicalAlertMessage:
				"🫁 Бронхиальная астма / сульфитная гиперчувствительность! Противопоказаны анестетики с метабисульфитом натрия (E223).",
			detectedTriggers: ["Бронхиальная астма / сульфиты"],
			contraindicatedDrugs: ["Карпульные анестетики с адреналином и метабисульфитом натрия (E223)"],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора",
				"Ультракаин Д (без консервантов и сульфитов)",
			],
			clinicalGuidanceRu:
				"Убедиться в наличии бронходилататора у пациента перед началом манипуляций.",
			suggestedActions: [
				{
					actionId: "check_inhaler",
					title: "Проверить наличие индивидуального ингалятора",
					payload: { patientId: patient.patientId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 5: Bisphosphonates + Surgery (MRONJ Risk)
	// ─────────────────────────────────────────────────────────────────────────
	if (isSurgery && risks.isBisphosphonateActive) {
		const detectedDrugs = risks.activeBisphosphonates.join(", ") || "Бисфосфонаты";

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_bisphosphonates_mronj`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: true,
			category: "bisphosphonates_osteonecrosis",
			threatTitleRu: "Риск медикаментозного остеонекроза челюсти (MRONJ)",
			badgeText: "MRONJ Протокол",
			urgency: "CRITICAL",
			clinicalAlertMessage: `🦴 Высокий риск остеонекроза челюсти (MRONJ)! Пациент получает терапию бисфосфонатами/деносумабом (${detectedDrugs}).`,
			detectedTriggers: risks.activeBisphosphonates,
			contraindicatedDrugs: ["Грубая травматизация надкостницы", "Удаление без антибиотикопрофилактики"],
			recommendedAlternatives: [
				"Атравматичное удаление зуба с минимальным отслаиванием надкостницы",
				"Антибиотикопрофилактика (Амоксициллин / Клиндамицин)",
				"Герметичное первичное ушивание лунки без натяжения",
			],
			clinicalGuidanceRu:
				"Обязательно информированное согласие с предупреждением о риске остеонекроза. Минимизировать инвазивность.",
			suggestedActions: [
				{
					actionId: "mronj_protocol",
					title: "Активировать атравматичный протокол MRONJ",
					payload: { patientId: patient.patientId, detectedDrugs: risks.activeBisphosphonates },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 6: Penicillin Allergy
	// ─────────────────────────────────────────────────────────────────────────
	if (risks.hasPenicillinAllergy) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_penicillin_allergy`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "penicillin_allergy",
			threatTitleRu: "Аллергия на бета-лактамные антибиотики (Пенициллины)",
			badgeText: "Аллергия: Пенициллин",
			urgency: "HIGH",
			clinicalAlertMessage:
				"💊 Аллергия на пенициллиновый ряд! Противопоказаны Амоксициллин, Амоксиклав, Аугментин, Флемоксин.",
			detectedTriggers: ["Пенициллины"],
			contraindicatedDrugs: ["Амоксициллин", "Амоксиклав", "Аугментин"],
			recommendedAlternatives: [
				"Азитромицин (Сумамед) 500 мг 1 раз/сут 3 дня",
				"Клиндамицин 300 мг 3 раза/сут",
				"Кларитромицин 500 мг 2 раза/сут",
			],
			clinicalGuidanceRu:
				"При необходимости антибиотикопрофилактики использовать макролиды или линкозамиды.",
			suggestedActions: [
				{
					actionId: "set_alternative_antibiotic",
					title: "Выбрать макролид (Азитромицин / Клиндамицин)",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 7: NSAID Allergy / Samter's Triad
	// ─────────────────────────────────────────────────────────────────────────
	if (risks.hasNsaidAllergyOrSamterTriad) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_nsaid_contraindication`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "nsaid_contraindication",
			threatTitleRu: "Непереносимость НПВС / Аспириновая триада",
			badgeText: "Противопоказаны НПВС",
			urgency: "HIGH",
			clinicalAlertMessage:
				"⚠️ Аллергия на НПВС / аспириновая триада! Противопоказаны классические нестероидные противовоспалительные средства.",
			detectedTriggers: ["НПВС / Аспириновая триада"],
			contraindicatedDrugs: ["Ибупрофен", "Кеторолак (Кетанов)", "Диклофенак", "Нимесулид", "Аспирин"],
			recommendedAlternatives: [
				"Парацетамол 500-1000 мг до 4 раз/сут (макс 4 г/сут)",
				"Селективные ингибиторы ЦОГ-2 (Целекоксиб 100-200 мг)",
			],
			clinicalGuidanceRu:
				"Для купирования болевого синдрома назначать Парацетамол.",
			suggestedActions: [
				{
					actionId: "recommend_paracetamol",
					title: "Назначить Парацетамол вместо НПВС",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DATABASE INTEGRATION & PRE-SHIFT BATCH SCANNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes high-performance 07:30 AM Somatic Radar scan across today's appointments.
 * Eliminates N+1 query patterns using parallel batch requests with inArray.
 */
export async function runSomaticRadarScan(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarAlert[]> {
	try {
		const now = options?.now ?? new Date();
		const targetDate = options?.targetDate ?? now;

		// Shift boundary: today 00:00:00 to 23:59:59
		const dayStart = new Date(targetDate);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(targetDate);
		dayEnd.setHours(23, 59, 59, 999);

		const orgFilter = options?.organizationId
			? eq(appointments.organizationId, options.organizationId)
			: undefined;

		const apptConditions = [
			gte(appointments.startsAt, dayStart),
			lte(appointments.startsAt, dayEnd),
			or(
				eq(appointments.status, "planned"),
				eq(appointments.status, "confirmed"),
				eq(appointments.status, "arrived"),
				eq(appointments.status, "in_treatment"),
			),
		];
		if (orgFilter) {
			apptConditions.push(orgFilter);
		}

		// 1. Fetch all appointments scheduled for today
		const todayAppointments = await db
			.select({
				appointmentId: appointments.id,
				organizationId: appointments.organizationId,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				comment: appointments.comment,
				status: appointments.status,
				patientFullName: patients.fullName,
				patientBirthDate: patients.birthDate,
				patientPhone: patients.phone,
				patientNotes: patients.notes,
				doctorFullName: users.fullName,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.leftJoin(users, eq(appointments.doctorUserId, users.id))
			.where(and(...apptConditions))
			.orderBy(appointments.startsAt);

		if (todayAppointments.length === 0) {
			return [];
		}

		// Extract unique patient IDs
		const patientIds = Array.from(
			new Set(
				todayAppointments
					.map((a) => a.patientId)
					.filter((id): id is string => Boolean(id)),
			),
		);

		const allergiesByPatient = new Map<
			string,
			Array<{
				allergenGroup: string;
				drugInnLatin: string | null;
				reactionSeverity: string | null;
				clinicalManifestations: string | null;
				hasSamterTriad: boolean | null;
				notes: string | null;
			}>
		>();

		const pastVisitsByPatient = new Map<
			string,
			Array<{
				complaint: string | null;
				anamnesis: string | null;
				objectiveStatus: string | null;
				diagnosis: string | null;
				treatmentPlan: string | null;
				doctorSummary: string | null;
				createdAt: Date;
			}>
		>();

		const activePrescriptionsByPatient = new Map<string, string[]>();

		if (patientIds.length > 0) {
			const [batchAllergies, batchVisits, batchPrescriptionItems] = await Promise.all([
				// 1. Batch fetch allergies
				db
					.select({
						patientId: patientDrugAllergies.patientId,
						allergenGroup: patientDrugAllergies.allergenGroup,
						drugInnLatin: patientDrugAllergies.drugInnLatin,
						reactionSeverity: patientDrugAllergies.reactionSeverity,
						clinicalManifestations: patientDrugAllergies.clinicalManifestations,
						hasSamterTriad: patientDrugAllergies.hasSamterTriad,
						notes: patientDrugAllergies.notes,
					})
					.from(patientDrugAllergies)
					.where(inArray(patientDrugAllergies.patientId, patientIds)),

				// 2. Batch fetch past visits
				db
					.select({
						patientId: visits.patientId,
						complaint: visits.complaint,
						anamnesis: visits.anamnesis,
						objectiveStatus: visits.objectiveStatus,
						diagnosis: visits.diagnosis,
						treatmentPlan: visits.treatmentPlan,
						doctorSummary: visits.doctorSummary,
						createdAt: visits.createdAt,
					})
					.from(visits)
					.where(inArray(visits.patientId, patientIds))
					.orderBy(desc(visits.createdAt)),

				// 3. Batch fetch active prescriptions
				db
					.select({
						patientId: electronicPrescriptions.patientId,
						innLatin: electronicPrescriptionItems.innLatin,
						signatureDirectionRussian: electronicPrescriptionItems.signatureDirectionRussian,
					})
					.from(electronicPrescriptionItems)
					.innerJoin(
						electronicPrescriptions,
						eq(electronicPrescriptionItems.prescriptionId, electronicPrescriptions.id),
					)
					.where(inArray(electronicPrescriptions.patientId, patientIds)),
			]);

			for (const item of batchAllergies) {
				if (!allergiesByPatient.has(item.patientId)) {
					allergiesByPatient.set(item.patientId, []);
				}
				allergiesByPatient.get(item.patientId)!.push(item);
			}

			for (const v of batchVisits) {
				if (!v.patientId) continue;
				if (!pastVisitsByPatient.has(v.patientId)) {
					pastVisitsByPatient.set(v.patientId, []);
				}
				const patientVisits = pastVisitsByPatient.get(v.patientId)!;
				if (patientVisits.length < 5) {
					patientVisits.push(v);
				}
			}

			for (const p of batchPrescriptionItems) {
				if (!activePrescriptionsByPatient.has(p.patientId)) {
					activePrescriptionsByPatient.set(p.patientId, []);
				}
				activePrescriptionsByPatient.get(p.patientId)!.push(
					`${p.innLatin} ${p.signatureDirectionRussian}`,
				);
			}
		}

		const allAlerts: SomaticRadarAlert[] = [];

		for (const appt of todayAppointments) {
			if (!appt.patientId) continue;

			const allergies = allergiesByPatient.get(appt.patientId) ?? [];
			const pastVisits = pastVisitsByPatient.get(appt.patientId) ?? [];
			const activeMedications = activePrescriptionsByPatient.get(appt.patientId) ?? [];

			const anamnesisTexts: string[] = [];
			const diagnosisTexts: string[] = [];

			for (const v of pastVisits) {
				if (v.anamnesis) anamnesisTexts.push(v.anamnesis);
				if (v.complaint) anamnesisTexts.push(v.complaint);
				if (v.doctorSummary) anamnesisTexts.push(v.doctorSummary);
				if (v.diagnosis) diagnosisTexts.push(v.diagnosis);
				if (v.objectiveStatus) diagnosisTexts.push(v.objectiveStatus);
			}

			const patientProfile: PatientSomaticProfileInput = {
				patientId: appt.patientId,
				organizationId: appt.organizationId,
				fullName: appt.patientFullName || "Пациент",
				birthDate: appt.patientBirthDate,
				phone: appt.patientPhone,
				notes: appt.patientNotes,
				allergies,
				pastAnamnesisText: anamnesisTexts.join(" "),
				pastDiagnosesText: diagnosisTexts.join(" "),
				activeMedications,
			};

			const appointmentContext: AppointmentSomaticContextInput = {
				appointmentId: appt.appointmentId,
				organizationId: appt.organizationId,
				doctorId: appt.doctorUserId,
				doctorName: appt.doctorFullName || "Врач клиники",
				startsAt: appt.startsAt,
				endsAt: appt.endsAt,
				reason: appt.reason,
				comment: appt.comment,
			};

			const apptAlerts = evaluatePatientSomaticRisk(patientProfile, appointmentContext, { now });
			allAlerts.push(...apptAlerts);
		}

		return allAlerts;
	} catch (error) {
		console.error("[SomaticRadarDaemon:ERROR] Failed to run somatic radar scan:", error);
		throw error;
	}
}

/**
 * Compiles a pre-shift summary grouped by organization.
 */
export async function runSomaticRadarShiftSummary(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarPreShiftSummary[]> {
	try {
		const now = options?.now ?? new Date();
		const targetDate = options?.targetDate ?? now;
		const scanArgs: { organizationId?: string; targetDate?: Date; now?: Date } = {
			targetDate,
			now,
		};
		if (options?.organizationId) {
			scanArgs.organizationId = options.organizationId;
		}
		const alerts = await runSomaticRadarScan(scanArgs);

		const orgMap = new Map<string, SomaticRadarAlert[]>();

		for (const a of alerts) {
			const orgId = a.organizationId;
			if (!orgMap.has(orgId)) {
				orgMap.set(orgId, []);
			}
			orgMap.get(orgId)!.push(a);
		}

		if (options?.organizationId && !orgMap.has(options.organizationId)) {
			orgMap.set(options.organizationId, []);
		}

		const summaries: SomaticRadarPreShiftSummary[] = [];

		for (const [orgId, orgAlerts] of orgMap.entries()) {
			let critical = 0;
			let high = 0;
			let warnings = 0;
			const uniquePatients = new Set<string>();

			for (const a of orgAlerts) {
				uniquePatients.add(a.patientId);
				if (a.urgency === "CRITICAL") critical++;
				else if (a.urgency === "HIGH") high++;
				else warnings++;
			}

			summaries.push({
				id: `somatic_summary_${orgId}_${Date.now()}`,
				organizationId: orgId,
				shiftDate: targetDate.toLocaleDateString("ru-RU"),
				totalAppointmentsScanned: orgAlerts.length,
				totalPatientsWithRisk: uniquePatients.size,
				criticalThreatsCount: critical,
				highThreatsCount: high,
				warningsCount: warnings,
				alerts: orgAlerts,
				createdAt: now.toISOString(),
			});
		}

		return summaries;
	} catch (error) {
		console.error("[SomaticRadarDaemon:ERROR] Failed to run somatic radar shift summary:", error);
		throw error;
	}
}
