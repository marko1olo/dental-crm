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
export const RELATIONSHIP_TYPES = [
    "parent",
    "child",
    "spouse",
    "sibling",
    "guardian",
    "ward",
    "grandparent",
    "grandchild",
    "other",
];
export const INVERSE_RELATIONSHIP_MAP = {
    parent: "child",
    child: "parent",
    guardian: "ward",
    ward: "guardian",
    spouse: "spouse",
    sibling: "sibling",
    grandparent: "grandchild",
    grandchild: "grandparent",
    other: "other",
};
export const RELATIONSHIP_LABELS_RU = {
    parent: { direct: "Родитель (Отец/Мать)", inverse: "Ребёнок (Сын/Дочь)" },
    child: { direct: "Ребёнок (Сын/Дочь)", inverse: "Родитель (Отец/Мать)" },
    guardian: { direct: "Опекун / Законный представитель", inverse: "Подопечный" },
    ward: { direct: "Подопечный", inverse: "Опекун / Законный представитель" },
    spouse: { direct: "Супруг / Супруга", inverse: "Супруг / Супруга" },
    sibling: { direct: "Брат / Сестра", inverse: "Брат / Сестра" },
    grandparent: { direct: "Дедушка / Бабушка", inverse: "Внук / Внучка" },
    grandchild: { direct: "Внук / Внучка", inverse: "Дедушка / Бабушка" },
    other: { direct: "Другой родственник / Представитель", inverse: "Связанный пациент" },
};
// Russian Medical Law (FZ-323 Art. 20, 54): Minors under 15 require legal guardian consent
export const PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD = 15;
// Civil majority age
export const MAJORITY_AGE_THRESHOLD = 18;
// ───────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ───────────────────────────────────────────────────────────────────────────
export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);
export const patientRelationshipSchema = z.object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    relatedPatientId: z.string().uuid(),
    relationshipType: relationshipTypeSchema,
    isLegalGuardian: z.boolean().default(false),
    canShareBalance: z.boolean().default(false),
    canSignConsent: z.boolean().default(false),
    notes: z.string().max(2000).nullable().default(null),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
});
export const createPatientRelationshipSchema = z.object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    relatedPatientId: z.string().uuid(),
    relationshipType: relationshipTypeSchema,
    isLegalGuardian: z.boolean().optional().default(false),
    canShareBalance: z.boolean().optional().default(false),
    canSignConsent: z.boolean().optional().default(false),
    notes: z.string().max(2000).optional().nullable(),
});
export const updatePatientRelationshipSchema = z.object({
    relationshipType: relationshipTypeSchema.optional(),
    isLegalGuardian: z.boolean().optional(),
    canShareBalance: z.boolean().optional(),
    canSignConsent: z.boolean().optional(),
    notes: z.string().max(2000).optional().nullable(),
});
export const familyMemberSchema = z.object({
    patientId: z.string().uuid(),
    fullName: z.string().min(1),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ageYears: z.number().int().min(0).max(130).optional(),
    relationshipToHead: relationshipTypeSchema,
    balanceKopecks: z.number().int().default(0),
    isHeadOfFamily: z.boolean().default(false),
    isMinor: z.boolean().default(false),
    canUseSharedDeposit: z.boolean().default(true),
});
export const familyGroupSchema = z.object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    familyName: z.string().min(1).max(200),
    headPatientId: z.string().uuid(),
    members: z.array(familyMemberSchema).min(1),
    sharedDepositBalanceKopecks: z.number().int().default(0),
    notes: z.string().max(2000).nullable().optional().default(null),
    createdAt: z.string().datetime().optional(),
});
export const pediatricGuardianValidationSchema = z.object({
    isMinor: z.boolean(),
    requiresGuardianForConsent: z.boolean(),
    hasValidGuardian: z.boolean(),
    guardianPatientId: z.string().uuid().nullable(),
    guardianFullName: z.string().nullable(),
    guardianRelationshipType: relationshipTypeSchema.nullable(),
    validationMessageRu: string_or_null(),
});
function string_or_null() {
    return z.string().nullable();
}
// ───────────────────────────────────────────────────────────────────────────
// Kinship & Guardian Helper Functions
// ───────────────────────────────────────────────────────────────────────────
/**
 * Returns the inverse relationship type from the perspective of the related patient.
 * e.g., if A is B's "parent", then B is A's "child".
 */
export function getInverseRelationshipType(type) {
    return INVERSE_RELATIONSHIP_MAP[type] ?? "other";
}
/**
 * Returns the Russian localized label for the given relationship type.
 */
export function getRelationshipLabelRu(type, perspective = "direct") {
    const labels = RELATIONSHIP_LABELS_RU[type];
    if (!labels)
        return type;
    return perspective === "direct" ? labels.direct : labels.inverse;
}
/**
 * Checks if a patient requires a legal representative under Russian healthcare law (FZ-323).
 * Minors under 15 cannot sign informed medical consent themselves.
 */
export function isPediatricGuardianRequired(patientAgeYears) {
    return patientAgeYears < PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD;
}
/**
 * Evaluates whether a guardian relationship is legally authorized to sign medical consent.
 */
export function validateGuardianForMinor(patientAgeYears, relationships) {
    const isMinor = patientAgeYears < MAJORITY_AGE_THRESHOLD;
    const requiresGuardianForConsent = patientAgeYears < PEDIATRIC_LEGAL_CONSENT_AGE_THRESHOLD;
    if (!requiresGuardianForConsent) {
        return {
            isMinor,
            requiresGuardianForConsent: false,
            hasValidGuardian: true,
            guardianPatientId: null,
            guardianFullName: null,
            guardianRelationshipType: null,
            validationMessageRu: "Пациент вправе подписывать ИДС и медицинские согласия самостоятельно (≥ 15 лет).",
        };
    }
    const validGuardian = relationships.find((r) => r.isLegalGuardian ||
        r.canSignConsent ||
        r.relationshipType === "parent" ||
        r.relationshipType === "guardian");
    if (validGuardian) {
        return {
            isMinor: true,
            requiresGuardianForConsent: true,
            hasValidGuardian: true,
            guardianPatientId: validGuardian.relatedPatientId,
            guardianFullName: validGuardian.relatedPatientName ?? null,
            guardianRelationshipType: validGuardian.relationshipType,
            validationMessageRu: `Законный представитель подтвержден: ${getRelationshipLabelRu(validGuardian.relationshipType)}.`,
        };
    }
    return {
        isMinor: true,
        requiresGuardianForConsent: true,
        hasValidGuardian: false,
        guardianPatientId: null,
        guardianFullName: null,
        guardianRelationshipType: null,
        validationMessageRu: "ВНИМАНИЕ: Пациент младше 15 лет. Требуется прикрепить родителя или опекуна для подписания ИДС (ФЗ-323).",
    };
}
/**
 * Calculates combined aggregate balance across all family members and the shared deposit pool.
 */
export function calculateCombinedFamilyBalance(familyGroup) {
    const individualTotal = familyGroup.members.reduce((acc, m) => acc + (m.balanceKopecks || 0), 0);
    const sharedDeposit = familyGroup.sharedDepositBalanceKopecks || 0;
    return {
        individualTotalKopecks: individualTotal,
        sharedDepositKopecks: sharedDeposit,
        grandTotalKopecks: individualTotal + sharedDeposit,
    };
}
