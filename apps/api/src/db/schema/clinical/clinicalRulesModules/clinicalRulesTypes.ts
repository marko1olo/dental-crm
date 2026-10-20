/**
 * clinicalRulesTypes.ts — Layer 0: Clinical rules contracts, triggers, stop-factors and table inference types.
 *
 * Fully compliant with Mandate 8e (Doctor Autonomy), 8z (No Pharmacological Terror),
 * and oncological screening & anesthesia safety standards.
 */

import type { StaffRole } from "@dental/shared";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
	clinicalRules,
	clinicalTasks,
	implantCatalogItems,
	implantIsqMeasurements,
	labItems,
	labOrderEvents,
	labOrders,
	mkb10AutoDirectories,
	patientImplantInstallations,
} from "./clinicalProtocolsTables.js";
import type {
	anesthesiaLogs,
	dmsGuaranteeLetters,
	insuranceContracts,
} from "./clinicalStopFactorsTables.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ONCOLOGICAL SCREENING & CLINICAL TRIGGERS
// ─────────────────────────────────────────────────────────────────────────────

export type OncoRiskLevel = "low" | "moderate" | "high" | "urgent_biopsy";

export interface OncoScreeningTrigger {
	readonly triggerId: string;
	readonly localization: string; // e.g. "слизистая щеки", "дно полости рта", "боковая поверхность языка"
	readonly lesionType: "erythroplakia" | "leukoplakia" | "ulceration" | "induration" | "exophytic_mass";
	readonly durationWeeks: number;
	readonly painlessInduration: boolean;
	readonly lymphadenopathyPresent: boolean;
	readonly riskLevel: OncoRiskLevel;
	readonly recommendationText: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ANESTHESIA SAFETY & CONTRAINDICATION STOP-FACTORS
// ─────────────────────────────────────────────────────────────────────────────

export type AnesthesiaTechnique =
	| "infiltration"
	| "mandibular_conduction"
	| "torusal"
	| "tuberal"
	| "intraligamentary"
	| "intraseptal"
	| "palatal";

export type VasoconstrictorRatio = "1:100000" | "1:200000" | "without_vasoconstrictor";

export interface AnesthesiaStopFactor {
	readonly factorCode: string;
	readonly description: string;
	readonly isAbsoluteContraindication: boolean;
	readonly maxSafeEpinephrineMg: number;
	readonly recommendedAnesthetic: "articaine" | "mepivacaine" | "lidocaine";
	readonly guidanceNote: string;
}

export interface VitalsMonitoringThresholds {
	readonly systolicBpMax: number;
	readonly diastolicBpMax: number;
	readonly heartRateBpmMax: number;
	readonly oxygenSaturationMinPct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CLINICAL PROTOCOLS & ACTION CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicalProtocolDefinition {
	readonly protocolCode: string;
	readonly diagnosisCodeMkb10: string; // e.g. "K02.1", "K04.0", "K05.3"
	readonly specialty: "therapy" | "orthopedics" | "surgery" | "orthodontics" | "periodontics" | "pediatric" | "universal";
	readonly requiredServiceCodes: string[];
	readonly recommendedMaterialSlugs: string[];
	readonly stopFactorRules: string[];
}

export type ClinicalRuleConditionType =
	| "missing_required_service"
	| "order_precedence_violation"
	| "contraindicated_medication"
	| "dms_exclusion_triggered"
	| "onco_screening_positive";

// ─────────────────────────────────────────────────────────────────────────────
// 4. DRIZZLE INFERENCE TYPES (SSOT RE-EXPORTS)
// ─────────────────────────────────────────────────────────────────────────────

export type ClinicalTask = InferSelectModel<typeof clinicalTasks>;
export type NewClinicalTask = InferInsertModel<typeof clinicalTasks>;

export type ClinicalRule = InferSelectModel<typeof clinicalRules>;
export type NewClinicalRule = InferInsertModel<typeof clinicalRules>;

export type LabOrder = InferSelectModel<typeof labOrders>;
export type NewLabOrder = InferInsertModel<typeof labOrders>;

export type LabItem = InferSelectModel<typeof labItems>;
export type NewLabItem = InferInsertModel<typeof labItems>;

export type LabOrderEvent = InferSelectModel<typeof labOrderEvents>;
export type NewLabOrderEvent = InferInsertModel<typeof labOrderEvents>;

export type ImplantCatalogItem = InferSelectModel<typeof implantCatalogItems>;
export type NewImplantCatalogItem = InferInsertModel<typeof implantCatalogItems>;

export type PatientImplantInstallation = InferSelectModel<typeof patientImplantInstallations>;
export type NewPatientImplantInstallation = InferInsertModel<typeof patientImplantInstallations>;

export type ImplantIsqMeasurement = InferSelectModel<typeof implantIsqMeasurements>;
export type NewImplantIsqMeasurement = InferInsertModel<typeof implantIsqMeasurements>;

export type InsuranceContract = InferSelectModel<typeof insuranceContracts>;
export type NewInsuranceContract = InferInsertModel<typeof insuranceContracts>;

export type DmsGuaranteeLetter = InferSelectModel<typeof dmsGuaranteeLetters>;
export type NewDmsGuaranteeLetter = InferInsertModel<typeof dmsGuaranteeLetters>;

export type AnesthesiaLog = InferSelectModel<typeof anesthesiaLogs>;
export type NewAnesthesiaLog = InferInsertModel<typeof anesthesiaLogs>;

export type Mkb10AutoDirectory = InferSelectModel<typeof mkb10AutoDirectories>;
export type NewMkb10AutoDirectory = InferInsertModel<typeof mkb10AutoDirectories>;
