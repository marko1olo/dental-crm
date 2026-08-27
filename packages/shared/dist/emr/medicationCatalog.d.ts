/**
 * Dental Medication Formulary, Dosage & Clinical Contraindication Engine.
 * Adapted from dentalpin medication_catalog & medical_reference modules for DENTE Dental CRM.
 *
 * Implements 56 standard dental pharmaceutical items across 8 clinical classes,
 * pregnancy safety grading, and automated drug-drug interaction warning checks.
 */
import { z } from "zod";
export declare const therapeuticClassSchema: z.ZodEnum<["antibiotic", "analgesic_nsaid", "local_anesthetic", "emergency_kit", "corticosteroid", "antifungal_antiviral", "oral_antiseptic", "gi_antihistamine"]>;
export type TherapeuticClass = z.infer<typeof therapeuticClassSchema>;
export declare const pharmaceuticalFormSchema: z.ZodEnum<["tablet", "capsule", "injection", "gel", "spray", "paste", "cream", "suspension", "mouthwash", "varnish"]>;
export type PharmaceuticalForm = z.infer<typeof pharmaceuticalFormSchema>;
export declare const dentalMedicationItemSchema: z.ZodObject<{
    id: z.ZodString;
    nameRu: z.ZodString;
    nameInt: z.ZodString;
    therapeuticClass: z.ZodEnum<["antibiotic", "analgesic_nsaid", "local_anesthetic", "emergency_kit", "corticosteroid", "antifungal_antiviral", "oral_antiseptic", "gi_antihistamine"]>;
    defaultDose: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    doseUnit: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    form: z.ZodEnum<["tablet", "capsule", "injection", "gel", "spray", "paste", "cream", "suspension", "mouthwash", "varnish"]>;
    requiresPrescription: z.ZodDefault<z.ZodBoolean>;
    maxDailyDoseAdult: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    pediatricApproved: z.ZodDefault<z.ZodBoolean>;
    pregnancyCategory: z.ZodDefault<z.ZodEnum<["A", "B", "C", "D", "X"]>>;
    clinicalIndicationRu: z.ZodString;
    standardRegimenRu: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    form: "tablet" | "capsule" | "injection" | "gel" | "spray" | "paste" | "cream" | "suspension" | "mouthwash" | "varnish";
    nameRu: string;
    nameInt: string;
    therapeuticClass: "antibiotic" | "corticosteroid" | "analgesic_nsaid" | "local_anesthetic" | "emergency_kit" | "antifungal_antiviral" | "oral_antiseptic" | "gi_antihistamine";
    requiresPrescription: boolean;
    pediatricApproved: boolean;
    pregnancyCategory: "B" | "C" | "X" | "A" | "D";
    clinicalIndicationRu: string;
    standardRegimenRu: string;
    defaultDose?: string | null | undefined;
    doseUnit?: string | null | undefined;
    maxDailyDoseAdult?: string | null | undefined;
}, {
    id: string;
    form: "tablet" | "capsule" | "injection" | "gel" | "spray" | "paste" | "cream" | "suspension" | "mouthwash" | "varnish";
    nameRu: string;
    nameInt: string;
    therapeuticClass: "antibiotic" | "corticosteroid" | "analgesic_nsaid" | "local_anesthetic" | "emergency_kit" | "antifungal_antiviral" | "oral_antiseptic" | "gi_antihistamine";
    clinicalIndicationRu: string;
    standardRegimenRu: string;
    defaultDose?: string | null | undefined;
    doseUnit?: string | null | undefined;
    requiresPrescription?: boolean | undefined;
    maxDailyDoseAdult?: string | null | undefined;
    pediatricApproved?: boolean | undefined;
    pregnancyCategory?: "B" | "C" | "X" | "A" | "D" | undefined;
}>;
export type DentalMedicationItem = z.infer<typeof dentalMedicationItemSchema>;
/**
 * 56 Canonical Dental Pharmaceutical Formularies.
 */
export declare const DENTAL_MEDICATION_FORMULARY: readonly DentalMedicationItem[];
export interface DentalDrugInteractionRule {
    readonly drugAId: string;
    readonly drugBId: string;
    readonly severity: "critical" | "warning" | "info";
    readonly riskDescriptionRu: string;
    readonly clinicalRecommendationRu: string;
}
export declare const DENTAL_DRUG_INTERACTIONS: readonly DentalDrugInteractionRule[];
/**
 * Checks for drug-drug interactions for a list of prescribed and existing patient drugs.
 */
export declare function checkDentalMedicationInteractions(medicationIds: readonly string[]): DentalDrugInteractionRule[];
