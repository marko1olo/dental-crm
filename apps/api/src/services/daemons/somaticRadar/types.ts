import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & INTERFACES (LAYER 0)
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
