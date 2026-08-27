/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT RELATIONSHIPS, FAMILY TREE & PEDIATRIC GUARDIANSHIP ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements patient-to-patient relationship networks, family deposit pooling,
 * legal representative validation for pediatric patients, and bidirectional
 * kinship resolution.
 */
import { z } from "zod";
export declare const RELATIONSHIP_TYPES: readonly ["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"];
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export declare const INVERSE_RELATIONSHIP_MAP: Record<RelationshipType, RelationshipType>;
export declare const RELATIONSHIP_LABELS_RU: Record<RelationshipType, {
    direct: string;
    inverse: string;
}>;
export declare const PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD = 15;
export declare const MAJORITY_AGE_THRESHOLD = 18;
export declare const relationshipTypeSchema: z.ZodEnum<["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"]>;
export declare const patientRelationshipSchema: z.ZodObject<{
    id: z.ZodString;
    clinicId: z.ZodString;
    patientId: z.ZodString;
    relatedPatientId: z.ZodString;
    relationshipType: z.ZodEnum<["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"]>;
    isLegalGuardian: z.ZodDefault<z.ZodBoolean>;
    canShareBalance: z.ZodDefault<z.ZodBoolean>;
    canSignConsent: z.ZodDefault<z.ZodBoolean>;
    notes: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    patientId: string;
    notes: string | null;
    clinicId: string;
    relatedPatientId: string;
    relationshipType: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
    isLegalGuardian: boolean;
    canShareBalance: boolean;
    canSignConsent: boolean;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
}, {
    id: string;
    patientId: string;
    clinicId: string;
    relatedPatientId: string;
    relationshipType: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
    notes?: string | null | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    isLegalGuardian?: boolean | undefined;
    canShareBalance?: boolean | undefined;
    canSignConsent?: boolean | undefined;
}>;
export type PatientRelationship = z.infer<typeof patientRelationshipSchema>;
export declare const createPatientRelationshipSchema: z.ZodObject<{
    clinicId: z.ZodString;
    patientId: z.ZodString;
    relatedPatientId: z.ZodString;
    relationshipType: z.ZodEnum<["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"]>;
    isLegalGuardian: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    canShareBalance: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    canSignConsent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    clinicId: string;
    relatedPatientId: string;
    relationshipType: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
    isLegalGuardian: boolean;
    canShareBalance: boolean;
    canSignConsent: boolean;
    notes?: string | null | undefined;
}, {
    patientId: string;
    clinicId: string;
    relatedPatientId: string;
    relationshipType: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
    notes?: string | null | undefined;
    isLegalGuardian?: boolean | undefined;
    canShareBalance?: boolean | undefined;
    canSignConsent?: boolean | undefined;
}>;
export type CreatePatientRelationshipInput = z.infer<typeof createPatientRelationshipSchema>;
export declare const updatePatientRelationshipSchema: z.ZodObject<{
    relationshipType: z.ZodOptional<z.ZodEnum<["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"]>>;
    isLegalGuardian: z.ZodOptional<z.ZodBoolean>;
    canShareBalance: z.ZodOptional<z.ZodBoolean>;
    canSignConsent: z.ZodOptional<z.ZodBoolean>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    relationshipType?: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild" | undefined;
    isLegalGuardian?: boolean | undefined;
    canShareBalance?: boolean | undefined;
    canSignConsent?: boolean | undefined;
}, {
    notes?: string | null | undefined;
    relationshipType?: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild" | undefined;
    isLegalGuardian?: boolean | undefined;
    canShareBalance?: boolean | undefined;
    canSignConsent?: boolean | undefined;
}>;
export type UpdatePatientRelationshipInput = z.infer<typeof updatePatientRelationshipSchema>;
export declare const familyMemberSchema: z.ZodObject<{
    patientId: z.ZodString;
    fullName: z.ZodString;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    ageYears: z.ZodOptional<z.ZodNumber>;
    relationshipToHead: z.ZodEnum<["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"]>;
    balanceKopecks: z.ZodDefault<z.ZodNumber>;
    isHeadOfFamily: z.ZodDefault<z.ZodBoolean>;
    isMinor: z.ZodDefault<z.ZodBoolean>;
    canUseSharedDeposit: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    fullName: string;
    relationshipToHead: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
    balanceKopecks: number;
    isHeadOfFamily: boolean;
    isMinor: boolean;
    canUseSharedDeposit: boolean;
    dateOfBirth?: string | undefined;
    ageYears?: number | undefined;
}, {
    patientId: string;
    fullName: string;
    relationshipToHead: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
    dateOfBirth?: string | undefined;
    ageYears?: number | undefined;
    balanceKopecks?: number | undefined;
    isHeadOfFamily?: boolean | undefined;
    isMinor?: boolean | undefined;
    canUseSharedDeposit?: boolean | undefined;
}>;
export type FamilyMember = z.infer<typeof familyMemberSchema>;
export declare const familyGroupSchema: z.ZodObject<{
    id: z.ZodString;
    clinicId: z.ZodString;
    familyName: z.ZodString;
    headPatientId: z.ZodString;
    members: z.ZodArray<z.ZodObject<{
        patientId: z.ZodString;
        fullName: z.ZodString;
        dateOfBirth: z.ZodOptional<z.ZodString>;
        ageYears: z.ZodOptional<z.ZodNumber>;
        relationshipToHead: z.ZodEnum<["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"]>;
        balanceKopecks: z.ZodDefault<z.ZodNumber>;
        isHeadOfFamily: z.ZodDefault<z.ZodBoolean>;
        isMinor: z.ZodDefault<z.ZodBoolean>;
        canUseSharedDeposit: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        patientId: string;
        fullName: string;
        relationshipToHead: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
        balanceKopecks: number;
        isHeadOfFamily: boolean;
        isMinor: boolean;
        canUseSharedDeposit: boolean;
        dateOfBirth?: string | undefined;
        ageYears?: number | undefined;
    }, {
        patientId: string;
        fullName: string;
        relationshipToHead: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
        dateOfBirth?: string | undefined;
        ageYears?: number | undefined;
        balanceKopecks?: number | undefined;
        isHeadOfFamily?: boolean | undefined;
        isMinor?: boolean | undefined;
        canUseSharedDeposit?: boolean | undefined;
    }>, "many">;
    sharedDepositBalanceKopecks: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    notes: string | null;
    clinicId: string;
    familyName: string;
    headPatientId: string;
    members: {
        patientId: string;
        fullName: string;
        relationshipToHead: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
        balanceKopecks: number;
        isHeadOfFamily: boolean;
        isMinor: boolean;
        canUseSharedDeposit: boolean;
        dateOfBirth?: string | undefined;
        ageYears?: number | undefined;
    }[];
    sharedDepositBalanceKopecks: number;
    createdAt?: string | undefined;
}, {
    id: string;
    clinicId: string;
    familyName: string;
    headPatientId: string;
    members: {
        patientId: string;
        fullName: string;
        relationshipToHead: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild";
        dateOfBirth?: string | undefined;
        ageYears?: number | undefined;
        balanceKopecks?: number | undefined;
        isHeadOfFamily?: boolean | undefined;
        isMinor?: boolean | undefined;
        canUseSharedDeposit?: boolean | undefined;
    }[];
    notes?: string | null | undefined;
    createdAt?: string | undefined;
    sharedDepositBalanceKopecks?: number | undefined;
}>;
export type FamilyGroup = z.infer<typeof familyGroupSchema>;
export declare const pediatricGuardianValidationSchema: z.ZodObject<{
    isMinor: z.ZodBoolean;
    requiresGuardianForConsent: z.ZodBoolean;
    hasValidGuardian: z.ZodBoolean;
    guardianPatientId: z.ZodNullable<z.ZodString>;
    guardianFullName: z.ZodNullable<z.ZodString>;
    guardianRelationshipType: z.ZodNullable<z.ZodEnum<["parent", "child", "spouse", "sibling", "guardian", "ward", "grandparent", "grandchild", "other"]>>;
    validationMessageRu: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    isMinor: boolean;
    requiresGuardianForConsent: boolean;
    hasValidGuardian: boolean;
    guardianPatientId: string | null;
    guardianFullName: string | null;
    guardianRelationshipType: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild" | null;
    validationMessageRu: string | null;
}, {
    isMinor: boolean;
    requiresGuardianForConsent: boolean;
    hasValidGuardian: boolean;
    guardianPatientId: string | null;
    guardianFullName: string | null;
    guardianRelationshipType: "other" | "spouse" | "parent" | "child" | "sibling" | "guardian" | "ward" | "grandparent" | "grandchild" | null;
    validationMessageRu: string | null;
}>;
export type PediatricGuardianValidation = z.infer<typeof pediatricGuardianValidationSchema>;
/**
 * Returns the inverse relationship type from the perspective of the related patient.
 * e.g., if A is B's "parent", then B is A's "child".
 */
export declare function getInverseRelationshipType(type: RelationshipType): RelationshipType;
/**
 * Returns the Russian localized label for the given relationship type.
 */
export declare function getRelationshipLabelRu(type: RelationshipType, perspective?: "direct" | "inverse"): string;
/**
 * Checks if a patient requires a legal representative under Russian healthcare law (FZ-323).
 * Minors under 15 cannot sign informed medical consent themselves.
 */
export declare function isPediatricGuardianRequired(patientAgeYears: number): boolean;
/**
 * Evaluates whether a guardian relationship is legally authorized to sign medical consent.
 */
export declare function validateGuardianForMinor(patientAgeYears: number, relationships: readonly {
    relatedPatientId: string;
    relatedPatientName?: string;
    relationshipType: RelationshipType;
    isLegalGuardian?: boolean;
    canSignConsent?: boolean;
}[]): PediatricGuardianValidation;
/**
 * Calculates combined aggregate balance across all family members and the shared deposit pool.
 */
export declare function calculateCombinedFamilyBalance(familyGroup: {
    members: readonly {
        balanceKopecks?: number;
    }[];
    sharedDepositBalanceKopecks?: number;
}): {
    individualTotalKopecks: number;
    sharedDepositKopecks: number;
    grandTotalKopecks: number;
};
